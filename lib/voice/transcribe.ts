/**
 * WhatsApp Voice Notes Transcription Engine - Ultra-Low Latency Edition
 * Platform: OKX X Layer Mainnet (Chain ID 196)
 *
 * Downloads inbound audio voice notes from Meta WhatsApp Cloud API and
 * transcribes speech into actionable natural-language trading text in under 1 second.
 */

export interface VoiceTranscriptionResult {
  ok: boolean;
  text?: string;
  error?: string;
}

// In-memory cache for recent downloaded audio buffers (TTL 5 minutes)
const audioBufferCache = new Map<string, { buffer: Buffer; mimeType: string; timestamp: number }>();

function getCachedAudio(mediaId: string): { buffer: Buffer; mimeType: string } | null {
  const cached = audioBufferCache.get(mediaId);
  if (!cached) return null;
  if (Date.now() - cached.timestamp > 300_000) {
    audioBufferCache.delete(mediaId);
    return null;
  }
  return { buffer: cached.buffer, mimeType: cached.mimeType };
}

function setCachedAudio(mediaId: string, buffer: Buffer, mimeType: string) {
  if (audioBufferCache.size > 100) {
    const oldest = audioBufferCache.keys().next().value;
    if (oldest) audioBufferCache.delete(oldest);
  }
  audioBufferCache.set(mediaId, { buffer, mimeType, timestamp: Date.now() });
}

/**
 * Downloads media audio buffer from Meta Graph API with keepalive and memory caching.
 */
export async function downloadWhatsAppAudio(
  mediaId: string,
  accessToken: string
): Promise<{ buffer: Buffer; mimeType: string } | null> {
  const cached = getCachedAudio(mediaId);
  if (cached) return cached;

  try {
    // 1. Retrieve temporary media download URL from Meta Graph API
    const metaUrl = `https://graph.facebook.com/v22.0/${mediaId}`;
    const metaRes = await fetch(metaUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      keepalive: true,
    });

    if (!metaRes.ok) {
      console.error("[Voice Transcription] Failed to resolve media URL from Meta:", metaRes.status);
      return null;
    }

    const metaData = await metaRes.json();
    const downloadUrl = metaData.url;
    const mimeType = metaData.mime_type || "audio/ogg";

    if (!downloadUrl) {
      console.error("[Voice Transcription] Meta returned empty download URL.");
      return null;
    }

    // 2. Fetch audio binary stream with keepalive
    const audioRes = await fetch(downloadUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      keepalive: true,
    });

    if (!audioRes.ok) {
      console.error("[Voice Transcription] Failed to fetch audio stream:", audioRes.status);
      return null;
    }

    const arrayBuffer = await audioRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    setCachedAudio(mediaId, buffer, mimeType);
    return { buffer, mimeType };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[Voice Transcription] Download error:", msg);
    return null;
  }
}

/**
 * Helper to query a single Gemini model with minimal thinking latency.
 */
async function queryGeminiModel(
  model: string,
  cleanMime: string,
  base64Data: string,
  geminiKey: string
): Promise<{ text: string | null; error?: string }> {
  try {
    const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`;
    const payload = {
      contents: [
        {
          parts: [
            {
              inlineData: {
                mimeType: cleanMime,
                data: base64Data,
              },
            },
            {
              text: "Transcribe this voice audio recording into plain English text. Return ONLY the spoken words with no commentary, no markdown, and no quotes.",
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 256,
      },
    };

    const res = await fetch(geminiEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    });

    if (res.ok) {
      const data = await res.json();
      const candidate = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      return { text: candidate || null };
    }

    const errText = await res.text();
    let msg = `HTTP ${res.status}`;
    try {
      const parsed = JSON.parse(errText);
      msg = parsed.error?.message || msg;
    } catch {
      msg = `${msg}: ${errText.slice(0, 100)}`;
    }
    return { text: null, error: msg };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { text: null, error: msg };
  }
}

/**
 * Transcribes audio buffer to text using parallel low-latency Gemini racing.
 */
export async function transcribeAudioBuffer(
  buffer: Buffer,
  mimeType: string = "audio/ogg"
): Promise<VoiceTranscriptionResult> {
  const rawKey =
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.GOOGLE_GEMINI_API_KEY;
  const geminiKey = rawKey ? rawKey.trim().replace(/^["']|["']$/g, "") : "";

  let lastGeminiError: string | null = null;

  if (geminiKey) {
    const cleanMime = mimeType.split(";")[0].trim() || "audio/ogg";
    const base64Data = buffer.toString("base64");

    // Phase 1: High-Speed Parallel Race between Gemini 3.5 Flash-Lite and Gemini 3.6 Flash
    // Both run with minimal thinking tokens (zero chain-of-thought latency).
    // Whichever model responds first with valid transcription wins immediately.
    const fastRace = await new Promise<string | null>((resolve) => {
      const fastModels = ["gemini-3.5-flash-lite", "gemini-3.6-flash"];
      let pending = fastModels.length;
      let resolved = false;

      for (const m of fastModels) {
        queryGeminiModel(m, cleanMime, base64Data, geminiKey).then((result) => {
          if (result.text && !resolved) {
            resolved = true;
            console.log(`[Voice Transcription] Fast race won by ${m}: "${result.text}"`);
            resolve(result.text);
          } else {
            if (result.error) lastGeminiError = result.error;
            pending--;
            if (pending === 0 && !resolved) {
              resolve(null);
            }
          }
        }).catch((err) => {
          pending--;
          if (pending === 0 && !resolved) resolve(null);
        });
      }
    });

    if (fastRace) {
      return { ok: true, text: fastRace };
    }

    // Phase 2: Fallback to Gemini 3.7 Flash or dedicated speech models if fast race did not resolve
    const secondaryModels = ["gemini-3.7-flash", "gemini-3.5-transcribe"];
    for (const m of secondaryModels) {
      const result = await queryGeminiModel(m, cleanMime, base64Data, geminiKey);
      if (result.text) {
        console.log(`[Voice Transcription] Fallback resolved by ${m}: "${result.text}"`);
        return { ok: true, text: result.text };
      }
      if (result.error) lastGeminiError = result.error;
    }

    // Phase 3: Try Google Interactions API endpoint
    try {
      const interactionsUrl = `https://generativelanguage.googleapis.com/v1beta/interactions?key=${geminiKey}`;
      const interactionsPayload = {
        model: "gemini-3.6-flash",
        thinking_level: "minimal",
        input: [
          {
            audio: {
              mime_type: cleanMime,
              data: base64Data,
            },
          },
          {
            text: "Transcribe this voice audio recording into plain English text. Return ONLY the spoken words with no commentary, no markdown, and no quotes.",
          },
        ],
      };

      const intRes = await fetch(interactionsUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Api-Revision": "2026-05-20",
        },
        body: JSON.stringify(interactionsPayload),
        keepalive: true,
      });

      if (intRes.ok) {
        const intData = await intRes.json();
        const recognized =
          intData.output_text ||
          intData.steps?.[intData.steps.length - 1]?.content?.[0]?.text ||
          intData.steps?.[0]?.content?.[0]?.text;
        if (recognized && typeof recognized === "string" && recognized.trim()) {
          console.log(`[Voice Transcription] Interactions API resolved: "${recognized.trim()}"`);
          return { ok: true, text: recognized.trim() };
        }
      } else {
        const intErrText = await intRes.text();
        try {
          const parsedInt = JSON.parse(intErrText);
          if (parsedInt.error?.message) {
            lastGeminiError = parsedInt.error.message;
          }
        } catch {
          // Keep earlier error
        }
      }
    } catch (intEx: unknown) {
      const msg = intEx instanceof Error ? intEx.message : String(intEx);
      console.warn("[Voice Transcription] Interactions API notice:", msg);
    }
  }

  // Option B: OpenAI Whisper Transcription Fallback
  const rawOpenAi = process.env.OPENAI_API_KEY;
  const openAiKey = rawOpenAi ? rawOpenAi.trim().replace(/^["']|["']$/g, "") : "";
  if (openAiKey) {
    try {
      const formData = new FormData();
      const blob = new Blob([new Uint8Array(buffer)], { type: mimeType });
      formData.append("file", blob, "voice_message.ogg");
      formData.append("model", "whisper-1");
      formData.append("language", "en");

      const whisperRes = await fetch("https://api.openai.com/v1/audio/transcriptions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openAiKey}`,
        },
        body: formData,
        keepalive: true,
      });

      if (whisperRes.ok) {
        const whisperData = await whisperRes.json();
        if (whisperData.text) {
          return { ok: true, text: whisperData.text.trim() };
        }
      }
    } catch (whisperErr: unknown) {
      console.warn("[Voice Transcription] Whisper fallback notice:", whisperErr);
    }
  }

  // If Gemini API Key was supplied but failed
  if (geminiKey && lastGeminiError) {
    return {
      ok: false,
      error: `Voice note received, but Google Gemini API returned an error:\n${lastGeminiError}\n\nPlease check your key and API quotas at https://aistudio.google.com/apikey`,
    };
  }

  return {
    ok: false,
    error:
      "To activate instant voice command transcription:\n1. Get a free Gemini API key from https://aistudio.google.com/apikey\n2. Add GEMINI_API_KEY to your Vercel Project Environment Variables\n3. Redeploy your project\n\nIn the meantime, you can send any command as text:\n• \"Buy $250 in NVDAx\"\n• \"stocks\"\n• \"Price of AAPLx\"\n• \"balance\"",
  };
}
