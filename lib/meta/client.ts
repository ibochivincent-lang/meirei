/**
 * Meta WhatsApp Cloud API Client
 * Author: IboTV
 * Platform: OKX X Layer (Chain ID 196)
 */

interface TextArgs {
  to: string;
  body: string;
}

interface ImageArgs {
  to: string;
  imageUrl: string;
  caption?: string;
}

export interface Choice {
  label?: string;
  value?: string;
  id?: string;
  title?: string;
  description?: string;
}

export interface ChoicesArgs extends TextArgs {
  choices: Choice[];
}

interface LinkArgs extends TextArgs {
  label: string;
  url: string;
}

function getMetaConfig() {
  let token =
    process.env.WHATSAPP_ACCESS_TOKEN ||
    process.env.WHATSAPP_TOKEN ||
    process.env.META_WHATSAPP_TOKEN ||
    process.env.META_ACCESS_TOKEN ||
    null;

  let phoneId =
    process.env.WHATSAPP_PHONE_NUMBER_ID ||
    process.env.META_PHONE_NUMBER_ID ||
    process.env.META_WHATSAPP_PHONE_ID ||
    null;

  // Fallback: If user pasted multi-line block into an environment variable
  if (!token || !phoneId) {
    for (const val of Object.values(process.env)) {
      if (typeof val === "string") {
        if (!token) {
          const matchToken = val.match(/EAA[A-Za-z0-9_-]{80,}/);
          if (matchToken) token = matchToken[0];
        }
        if (!phoneId) {
          const matchPhone = val.match(/\b\d{15,17}\b/);
          if (matchPhone) phoneId = matchPhone[0];
        }
      }
    }
  }

  if (!phoneId && token) {
    phoneId = "1282031451668148";
  }

  return { token, phoneId };
}

function cleanRecipient(to: string): string {
  return to.replace(/^whatsapp:/i, "").replace(/[^\d]/g, "");
}

/**
 * Send text message via Meta WhatsApp Cloud API.
 */
export async function sendWhatsAppMessage(
  target: TextArgs | string,
  maybeBody?: string
): Promise<string> {
  const { token, phoneId } = getMetaConfig();
  const rawTo = typeof target === "object" ? target.to : target;
  const to = cleanRecipient(rawTo);
  const body = typeof target === "object" ? target.body : maybeBody || "";

  if (!token || !phoneId) {
    console.warn("[Meta WhatsApp] Credentials not configured. Message simulated for", to, {
      snippet: body.slice(0, 60),
    });
    return `sim_wa_${Date.now()}`;
  }

  const endpoint = `https://graph.facebook.com/v21.0/${phoneId}/messages`;
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "text",
      text: {
        preview_url: true,
        body,
      },
    }),
  });

  const data = await res.json();
  if (!res.ok || data.error) {
    const errorMsg = data.error?.message || "Meta WhatsApp API request failed";
    console.error("[Meta WhatsApp] Send error:", errorMsg);
    throw new Error(`Meta WhatsApp send failed: ${errorMsg}`);
  }

  return data.messages?.[0]?.id || `wa_${Date.now()}`;
}

export const sendMetaWhatsAppMessage = sendWhatsAppMessage;

/**
 * Mark an incoming WhatsApp message as read to show double blue checkmarks instantly.
 */
export async function markWhatsAppMessageRead(messageId: string): Promise<boolean> {
  const { token, phoneId } = getMetaConfig();
  if (!token || !phoneId || !messageId) return false;

  try {
    const endpoint = `https://graph.facebook.com/v21.0/${phoneId}/messages`;
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        status: "read",
        message_id: messageId,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Send image via Meta WhatsApp Cloud API.
 */
export async function sendWhatsAppImage({ to, imageUrl, caption }: ImageArgs): Promise<string> {
  const { token, phoneId } = getMetaConfig();
  const recipient = cleanRecipient(to);

  if (!token || !phoneId) {
    console.warn("[Meta WhatsApp] Credentials not configured. Image simulated for", recipient);
    return `sim_wa_img_${Date.now()}`;
  }

  const endpoint = `https://graph.facebook.com/v21.0/${phoneId}/messages`;
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: recipient,
      type: "image",
      image: {
        link: imageUrl,
        caption: caption || undefined,
      },
    }),
  });

  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(`Meta WhatsApp sendImage failed: ${data.error?.message || "Unknown error"}`);
  }

  return data.messages?.[0]?.id || `wa_img_${Date.now()}`;
}

/**
 * Send quick-reply interactive buttons (up to 3 buttons supported by Meta).
 */
export async function sendWhatsAppButtons({ to, body, choices }: ChoicesArgs): Promise<string | null> {
  const { token, phoneId } = getMetaConfig();
  const recipient = cleanRecipient(to);

  if (!token || !phoneId) {
    return await sendWhatsAppMessage(recipient, `${body}\n\nOptions:\n` + choices.map((c) => `• ${c.label || c.title || ""}`).join("\n"));
  }

  const endpoint = `https://graph.facebook.com/v21.0/${phoneId}/messages`;
  const buttons = choices.slice(0, 3).map((c, idx) => ({
    type: "reply",
    reply: {
      id: (c.value || c.id || `btn_${idx}`).slice(0, 256),
      title: (c.label || c.title || "Option").slice(0, 20),
    },
  }));

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: recipient,
      type: "interactive",
      interactive: {
        type: "button",
        body: { text: body },
        action: { buttons },
      },
    }),
  });

  const data = await res.json();
  if (!res.ok || data.error) {
    console.error("[Meta WhatsApp] sendWhatsAppButtons failed:", data.error?.message);
    return null;
  }

  return data.messages?.[0]?.id || null;
}

/**
 * Send interactive list picker for menus with more than 3 options.
 */
export async function sendWhatsAppList({ to, body, choices }: ChoicesArgs): Promise<string | null> {
  const { token, phoneId } = getMetaConfig();
  const recipient = cleanRecipient(to);

  if (!token || !phoneId) {
    return await sendWhatsAppMessage(recipient, `${body}\n\nChoices:\n` + choices.map((c) => `• ${c.label || c.title || ""}`).join("\n"));
  }

  const endpoint = `https://graph.facebook.com/v21.0/${phoneId}/messages`;
  const rows = choices.slice(0, 10).map((c, idx) => ({
    id: (c.value || c.id || `item_${idx}`).slice(0, 200),
    title: (c.label || c.title || "Option").slice(0, 24),
  }));

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: recipient,
      type: "interactive",
      interactive: {
        type: "list",
        body: { text: body },
        action: {
          button: "Select Option",
          sections: [
            {
              title: "Available Choices",
              rows,
            },
          ],
        },
      },
    }),
  });

  const data = await res.json();
  if (!res.ok || data.error) {
    console.error("[Meta WhatsApp] sendWhatsAppList failed:", data.error?.message);
    return null;
  }

  return data.messages?.[0]?.id || null;
}

/**
 * Send clickable URL button link.
 */
export async function sendWhatsAppLink({ to, body, label, url }: LinkArgs): Promise<string | null> {
  const { token, phoneId } = getMetaConfig();
  const recipient = cleanRecipient(to);

  if (!token || !phoneId) {
    return await sendWhatsAppMessage(recipient, `${body}\n\n${label}: ${url}`);
  }

  const endpoint = `https://graph.facebook.com/v21.0/${phoneId}/messages`;
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: recipient,
      type: "interactive",
      interactive: {
        type: "cta_url",
        body: { text: body },
        action: {
          name: "cta_url",
          parameters: {
            display_text: label.slice(0, 20),
            url,
          },
        },
      },
    }),
  });

  const data = await res.json();
  if (!res.ok || data.error) {
    // If cta_url is not supported on the template tier, fall back to plain text with link
    return await sendWhatsAppMessage(recipient, `${body}\n\n${label}: ${url}`);
  }

  return data.messages?.[0]?.id || null;
}

export const sendMetaInteractiveButtonMessage = sendWhatsAppButtons;
export const sendMetaWhatsAppTemplate = async (...args: any[]) => sendWhatsAppMessage(args[0], args[1]);
