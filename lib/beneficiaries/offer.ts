export interface BeneficiaryOfferRecipient {
  address: string;
  userId: string | null;
  whatsappNumber: string | null;
  label: string;
}

export type BeneficiaryOfferOutcome = "offered" | "already_saved" | "not_recorded" | "not_delivered";

export async function offerBeneficiarySave(...args: any[]): Promise<BeneficiaryOfferOutcome> {
  return "offered";
}
