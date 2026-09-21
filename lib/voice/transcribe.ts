/**
 * WhatsApp Voice Notes Transcription Engine
 * Author: IboTV
 * Platform: OKX X Layer Mainnet (Chain ID 196)
 *
 * Downloads inbound audio voice notes from Meta WhatsApp Cloud API and
 * transcribes speech into actionable natural-language trading text.
 */

export interface VoiceTranscriptionResult {
  ok: boolean;
  text?: string;
  error?: string;
}

/**
 * Downloads media audio buffer from Meta Graph API.
 */
export async function downloadWhatsAppAudio(
  mediaId: string,
  accessToken: string
): Promise<{ buffer: Buffer; mimeType: string } | null> {
  try {
    // 1. Retrieve the temporary media download URL from Meta
    const metaUrl = `https://graph.facebook.com/v22.0/${mediaId}`;
    const metaRes = await fetch(metaUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
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

    // 2. Fetch the audio binary stream
    const audioRes = await fetch(downloadUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!audioRes.ok) {
      console.error("[Voice Transcription] Failed to fetch audio stream:", audioRes.status);
      return null;
    }

    const arrayBuffer = await audioRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    return { buffer, mimeType };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[Voice Transcription] Download error:", msg);
    return null;
  }
}

/**
 * Transcribes audio buffer to text using Gemini or OpenAI Whisper if configured.
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

  // Option A: Gemini Multimodal Audio Transcription with Model Fallbacks
  if (geminiKey) {
    const modelsToTry = [
      "gemini-2.0-flash",
      "gemini-1.5-flash",
      "gemini-2.5-flash",
    ];

    const cleanMime = mimeType.split(";")[0].trim() || "audio/ogg";
    const base64Data = buffer.toString("base64");

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

    for (const model of modelsToTry) {
      try {
        const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`;
        const res = await fetch(geminiEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          const data = await res.json();
          const candidate = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
          if (candidate) {
            console.log(`[Voice Transcription] Successfully transcribed using ${model}: "${candidate}"`);
            return { ok: true, text: candidate };
          }
        } else {
          const errText = await res.text();
          console.warn(`[Voice Transcription] ${model} returned HTTP ${res.status}:`, errText);
          try {
            const parsed = JSON.parse(errText);
            lastGeminiError = parsed.error?.message || `HTTP ${res.status}`;
          } catch {
            lastGeminiError = `HTTP ${res.status}: ${errText.slice(0, 120)}`;
          }
        }
      } catch (geminiErr: unknown) {
        const msg = geminiErr instanceof Error ? geminiErr.message : String(geminiErr);
        console.warn(`[Voice Transcription] Gemini (${model}) connection exception:`, msg);
        lastGeminiError = msg;
      }
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
      });

      if (whisperRes.ok) {
        const whisperData = await whisperRes.json();
        if (whisperData.text) {
          return { ok: true, text: whisperData.text.trim() };
        }
      } else {
        const whisperErr = await whisperRes.text();
        console.warn("[Voice Transcription] Whisper error:", whisperRes.status, whisperErr);
      }
    } catch (whisperErr: unknown) {
      console.warn("[Voice Transcription] Whisper transcription attempt notice:", whisperErr);
    }
  }

  // If Gemini API Key was supplied but failed across all models
  if (geminiKey && lastGeminiError) {
    return {
      ok: false,
      error: `Voice note received, but Google Gemini API returned an error:\n${lastGeminiError}\n\nPlease check your key and API quotas at https://aistudio.google.com/apikey`,
    };
  }

  return {
    ok: false,
    error:
      "To activate instant voice command transcription on WhatsApp:\n1. Get a free Gemini API key from https://aistudio.google.com/apikey\n2. Add GEMINI_API_KEY to your Vercel Project Environment Variables\n3. Redeploy your project\n\nIn the meantime, you can send any command as text:\n• \"Buy $250 in NVDAx\"\n• \"stocks\"\n• \"Price of AAPLx\"\n• \"balance\"",
  };
}
