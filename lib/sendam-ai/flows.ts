import type { FollowUpSlots } from "./client";

// Static lookup, not a generic engine — meirei defines its own
// backend-initiated flows here. sendam-ai's decoder never authors question
// text (see docs/INTEGRATION.md in that repo); since meirei itself defined
// each flow's `awaiting` shape at /flow/start time, it already knows what
// question corresponds to each still-unresolved slot.
//
// No multi-turn flow is currently registered; this stays as the
// place a future conversational flow's question text would go.

/** Returns the next question to ask, or null if nothing more is needed. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- kept for callers' shape until a flow is registered
export function nextQuestionFor(flow: string, slots: FollowUpSlots): string | null {
  return null;
}
