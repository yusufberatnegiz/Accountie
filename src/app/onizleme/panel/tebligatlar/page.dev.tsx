// Dev-only fixture preview of the e-Tebligat screen. ?tema=acik|koyu forces a theme.
import { PreviewTheme } from "../PreviewTheme";
import { AppShell } from "@/components/AppShell";
import { GibScanPanel, type GibScanState } from "@/components/GibScanPanel";
import { NoticesView, type NoticeRow } from "@/components/NoticesView";
import { PREVIEW_EMAIL } from "@/lib/preview-fixtures";

const ORNEK = "ÖRNEK GIDA SANAYİ VE TİCARET LİMİTED ŞİRKETİ";
const GIB: GibScanState = {
  enabled: true, stored: 3, until: null, day: { reads: 0, networks: 0 }, reads: [],
  firms: [
    { lucaId: "1", name: "DENEME İNŞAAT A.Ş.", taxNumber: "1111111111" },
    { lucaId: "2", name: ORNEK, taxNumber: "2222222222" },
    { lucaId: "3", name: "YENİ MÜKELLEF TİCARET LTD. ŞTİ.", taxNumber: "3333333333" },
    // A müşavir has hundreds: enough rows to see the picker's columns and scrolling.
    ...Array.from({ length: 57 }, (_, i) => ({ lucaId: String(100 + i), name: `ÖRNEK FİRMA ${i + 1} TİCARET LTD. ŞTİ.`, taxNumber: String(4_000_000_000 + i) })),
  ],
};
const NOTICES: NoticeRow[] = [
  { id: "n1", firmId: "f1", firmName: ORNEK, institution: "Gelir İdaresi Başkanlığı", subUnit: "Kadıköy Vergi Dairesi Müdürlüğü", docType: "Vergi/Ceza İhbarnamesi", docNo: "2026-000123", sentAt: "18/11/2026", servedAt: "23/11/2026", served: "future", readOnGib: false, isNew: true, today: true },
  { id: "n4", firmId: "f1", firmName: ORNEK, institution: "Gelir İdaresi Başkanlığı", subUnit: "Kadıköy Vergi Dairesi Müdürlüğü", docType: "Ödeme Emri", docNo: "OE-778", sentAt: "19/11/2026", servedAt: "24/11/2026", served: "future", readOnGib: false, isNew: true, today: true },
  { id: "n2", firmId: "f2", firmName: "DENEME İNŞAAT A.Ş.", institution: "Gelir İdaresi Başkanlığı", subUnit: "Büyük Mükellefler VD", docType: "Karşıt İnceleme Tutanağı", docNo: "KI-55", sentAt: "17/11/2026", servedAt: "20/11/2026", served: "today", readOnGib: false, isNew: true, today: true },
  { id: "n3", firmId: "f1", firmName: ORNEK, institution: "Sosyal Güvenlik Kurumu", subUnit: null, docType: "Yazı", docNo: null, sentAt: "02/10/2026", servedAt: "07/10/2026", served: "past", readOnGib: true, isNew: false, today: false },
];

export default async function PreviewNotices({ searchParams }: { searchParams: Promise<{ tema?: string }> }) {
  const { tema } = await searchParams;
  return (
    <>
      <PreviewTheme tema={tema} />
      <AppShell current="tebligatlar" base="/onizleme/panel" email={PREVIEW_EMAIL}>
        <NoticesView notices={NOTICES} newCount={3} truncated={false} firmReads={[
          { firmId: "f3", firmName: "YENİ MÜKELLEF TİCARET LTD. ŞTİ.", scannedAt: null, days: null, stale: true },
          { firmId: "f2", firmName: "DENEME İNŞAAT A.Ş.", scannedAt: "12 Kas 2026 09:15", days: 8, stale: true },
          { firmId: "f1", firmName: "ÖRNEK GIDA SANAYİ VE TİCARET LİMİTED ŞİRKETİ", scannedAt: "20 Kas 2026 17:40", days: 0, stale: false },
        ]}>
          <GibScanPanel account={PREVIEW_EMAIL} state={GIB} />
        </NoticesView>
      </AppShell>
    </>
  );
}
