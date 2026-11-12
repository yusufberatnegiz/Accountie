/**
 * Kontör: one read of a document costs credits from the user's single balance (every firm draws on it).
 * A receipt or a Z report costs 1, an invoice (domestic or foreign) 2. Credits never expire and are not refunded.
 */
export type CreditPackage = { id: string; credits: number; priceKurus: number; name: string };

// Prices include KDV (20%): the card is charged exactly this.
export const PACKAGES: readonly CreditPackage[] = [
  { id: "k100", credits: 100, priceKurus: 75_000, name: "Başlangıç" },
  { id: "k1000", credits: 1_000, priceKurus: 300_000, name: "Ofis" },
  { id: "k2500", credits: 2_500, priceKurus: 600_000, name: "Büyük ofis" },
  { id: "k5000", credits: 5_000, priceKurus: 1_000_000, name: "Çok firmalı ofis" },
];

export const packageById = (id: unknown): CreditPackage | undefined => PACKAGES.find((p) => p.id === id);

/** Kuruş per credit, rounded to the kuruş. */
export const perCreditKurus = (p: CreditPackage) => Math.round(p.priceKurus / p.credits);

/** How much cheaper one credit is than in the smallest package, in whole percent (0 for the smallest itself). */
export function savingPercent(p: CreditPackage): number {
  const base = PACKAGES[0].priceKurus / PACKAGES[0].credits;
  return Math.max(0, Math.round((1 - p.priceKurus / p.credits / base) * 100));
}

/** The balance may go this far below zero inside one upload (1 credit left and a photo of 5 receipts), never further. */
export const MIN_BALANCE = -4;

/** What a read document costs once its kind is known; a document that could not be read costs nothing. */
export const creditCost = (read: { ok: boolean; kind?: string }): number =>
  !read.ok ? 0 : read.kind === "domestic_invoice" || read.kind === "foreign_invoice" ? 2 : 1;

/**
 * Credits are required only when both hold: payments can be taken (iyzico keys; without them nobody could buy any) and the
 * requirement was switched on (KONTOR_ZORUNLU=1), which Koşullar md. 6 says happens at least 30 days after users are told.
 * Until then purchases may be open while reading stays free. shortcut: one switch for every user; per-account dates need a column.
 */
export const creditsRequired = () => Boolean(process.env.IYZICO_API_KEY && process.env.IYZICO_SECRET_KEY && process.env.KONTOR_ZORUNLU === "1");

/** The KDV inside a KDV-inclusive price (20%), for the summary. */
export const vatInsideKurus = (priceKurus: number) => Math.round((priceKurus * 20) / 120);
