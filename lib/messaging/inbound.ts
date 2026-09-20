export interface InboundMessage {
  provider: any;
  externalId: string;
  text: string;
  messageId: string;
  profileName?: string | null;
}

export async function handleInbound(message: InboundMessage): Promise<void> {}
