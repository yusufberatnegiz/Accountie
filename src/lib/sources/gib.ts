import { z } from "zod";
import { fetchOfficialJson } from "./official-fetch";

const GIB_PAGE_URL = "https://www.gib.gov.tr/vergi-takvimi";
const GIB_API_URL = "https://gib.gov.tr/api/gibportal/vergiTakvimi/specification/listAll?page=0&size=500&sortFieldName=stopdate&sortType=ASC";
const gibDate = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/);

const gibResponseSchema = z.object({
  status: z.literal(200),
  resultContainer: z.array(z.object({
    id: z.number().int().positive(),
    title: z.string().min(1),
    description: z.string(),
    startdate: gibDate,
    stopdate: gibDate,
    priority: z.number().int(),
    taxType: z.string().min(1),
    periodDescription: z.string(),
    subject: z.string().min(1),
  })),
});

export type GibCalendarItem = {
  externalKey: string;
  title: string;
  description: string;
  startsOn: string;
  dueOn: string;
  priority: number;
  taxType: string;
  periodDescription: string;
  actionType: string;
  sourceUrl: string;
};

export function parseGibCalendarResponse(input: unknown): GibCalendarItem[] {
  const response = gibResponseSchema.parse(input);
  return response.resultContainer.map((item) => ({
    externalKey: String(item.id),
    title: item.title.trim(),
    description: item.description.trim(),
    startsOn: item.startdate.slice(0, 10),
    dueOn: item.stopdate.slice(0, 10),
    priority: item.priority,
    taxType: item.taxType.trim(),
    periodDescription: item.periodDescription.trim(),
    actionType: item.subject.trim(),
    sourceUrl: GIB_PAGE_URL,
  }));
}

export async function fetchGibCalendar(date: string): Promise<GibCalendarItem[]> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("GİB sorgu tarihi geçersiz.");
  const input = await fetchOfficialJson(GIB_API_URL, {
    method: "POST",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      globalOperator: "AND",
      searchRequestListDTOS: [
        { column: "startdate", value: `${date}T23:59:59`, joinTable: "subject", operation: "LESS_THAN", formatDate: true, formatBoolean: false },
        { column: "stopdate", value: `${date}T00:00:00`, joinTable: "subject", operation: "GREATER_THAN", formatDate: true, formatBoolean: false },
      ],
    }),
  });
  return parseGibCalendarResponse(input);
}
