import { fetchGibCalendar } from "./sources/gib";

export type DeadlineItem = {
  id: string;
  dueDate: string;
  source: "GİB" | "SGK";
  type: string;
  action: string;
  period: string;
  title: string;
  sourceUrl: string;
};

export async function loadLiveDeadlines(date: string): Promise<{ items: DeadlineItem[]; error: string | null }> {
  try {
    const gibItems = await fetchGibCalendar(date);
    return {
      items: gibItems.map((item) => ({
        id: `gib-${item.externalKey}`,
        dueDate: item.dueOn,
        source: "GİB" as const,
        type: item.taxType,
        action: item.actionType,
        period: item.periodDescription,
        title: item.description || item.title,
        sourceUrl: item.sourceUrl,
      })),
      error: null,
    };
  } catch {
    return { items: [], error: "GİB resmî kaynağına ulaşılamadı; güvenlik gereği kayıt gösterilmedi." };
  }
}
