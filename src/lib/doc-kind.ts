/** What a saved receipt row is, from its category: a receipt, a Z report (sales) or a foreign service invoice. */
export type DocKind = "receipt" | "z_report" | "foreign";

export const docKind = (category: string | null | undefined): DocKind => (category === "z_report" ? "z_report" : category === "foreign" ? "foreign" : "receipt");

/** The word shown beside a document that is not a plain receipt. */
export const DOC_KIND_LABEL: Record<DocKind, string | null> = { receipt: null, z_report: "Z raporu", foreign: "Yurt dışı fatura" };
