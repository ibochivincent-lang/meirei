export interface BeneficiaryOfferRecipient {
  address: string;
  userId: string | null;
  whatsappNumber: string | null;
  label: string;
}

export type BeneficiaryOfferOutcome = "offered" | "already_saved" | "not_recorded" | "not_delivered";

export interface BeneficiaryOfferDeps {
  findSaved: (...args: any[]) => Promise<any>;
  recordOffer: (...args: any[]) => Promise<any>;
  notify: (args: { body: string; [key: string]: any }) => Promise<any>;
  [key: string]: any;
}

export async function offerBeneficiarySave(...args: any[]): Promise<BeneficiaryOfferOutcome> {
  return "offered";
}
