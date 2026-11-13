// Dev-only preview of the kontör screen with invented numbers; PreviewApi answers the pay button with an error (no real payment).
// ?bakiye=-3, ?odeme=tamam|hata|inceleme|bekliyor, ?bitti=4, ?bos=1 (new account), ?kapali=1 (iyzico not set up).
import { PreviewApi } from "../PreviewApi";
import { PreviewTheme } from "../PreviewTheme";
import { AppShell } from "@/components/AppShell";
import { CreditsView } from "@/components/CreditsView";
import { PREVIEW_EMAIL } from "@/lib/preview-fixtures";
import { packageById } from "@/lib/credits";

const USAGE = [
  { firmId: "1", name: "ÖRNEK BALIK LOKANTASI LTD.ŞTİ", used: 214, documents: 186 },
  { firmId: "2", name: "ÖRNEK KIRTASİYE", used: 97, documents: 91 },
  { firmId: "3", name: "ÖRNEK TEMİZLİK MALZEMELERİ", used: 42, documents: 33 },
  { firmId: null, name: null, used: 6, documents: 6 },
];
const HISTORY = [
  { id: "p2", packageId: "k1000", credits: 1000, amountKurus: 300_000, paidAt: "2026-10-02T09:14:00Z" },
  { id: "p1", packageId: "k100", credits: 100, amountKurus: 75_000, paidAt: "2026-09-18T13:40:00Z" },
];
const BILLING = { name: "ÖRNEK MALİ MÜŞAVİRLİK", taxNumber: "1111111114", taxOffice: "Muratpaşa", phone: "0500 000 00 00", address: "Örnek Mahallesi, Örnek Caddesi No: 1", city: "Antalya" };

export default async function PreviewCredits({ searchParams }: { searchParams: Promise<{ tema?: string; bakiye?: string; odeme?: string; bitti?: string; bos?: string; kapali?: string; paket?: string }> }) {
  const { tema, bakiye, odeme, bitti, bos, kapali, paket } = await searchParams;
  return (
    <>
      <PreviewTheme tema={tema} />
      <PreviewApi approved={[]} />
      <AppShell current="kontor" base="/onizleme/panel" email={PREVIEW_EMAIL}>
        <CreditsView balance={bakiye !== undefined ? Number(bakiye) : 641} open={!kapali} required billing={bos ? null : BILLING} usage={bos ? [] : USAGE} history={bos ? [] : HISTORY}
          outcome={odeme} ranOut={bitti !== undefined ? Number(bitti) : undefined} initialPackage={packageById(paket)?.id} />
      </AppShell>
    </>
  );
}
