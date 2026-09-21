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
  // Option A: Gemini Multimodal Audio Transcription
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) {
    try {
      const cleanMime = mimeType.split(";")[0].trim() || "audio/ogg";
      const base64Data = buffer.toString("base64");

      const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`;
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
                text: "Transcribe this audio recording into plain English text. Return only the exact transcription without quotes, explanations, or commentary.",
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
      });

      if (res.ok) {
        const data = await res.json();
        const candidate = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (candidate) {
          return { ok: true, text: candidate };
        }
      }
    } catch (geminiErr: unknown) {
      console.warn("[Voice Transcription] Gemini transcription attempt notice:", geminiErr);
    }
  }

  // Option B: OpenAI Whisper Transcription
  const openAiKey = process.env.OPENAI_API_KEY;
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
      }
    } catch (whisperErr: unknown) {
      console.warn("[Voice Transcription] Whisper transcription attempt notice:", whisperErr);
    }
  }

  return {
    ok: false,
    error:
      "To activate instant voice command transcription on WhatsApp:\n1. Get a free Gemini API key from https://aistudio.google.com/apikey\n2. Add GEMINI_API_KEY to your Vercel Project Environment Variables\n3. Redeploy your project\n\nIn the meantime, you can send any command as text:\n• \"Buy $250 in NVDAx\"\n• \"stocks\"\n• \"Price of AAPLx\"\n• \"balance\"",
  };
}
