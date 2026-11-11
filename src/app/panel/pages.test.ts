import { beforeEach, describe, expect, it, vi } from "vitest";
import * as q from "@/db/queries";
import * as session from "@/lib/auth/session";
import PanelPage from "./(liste)/page";
import ReceiptPage from "./fis/[id]/page";
import RulesPage from "./kurallar/page";
import ReconcilePage from "./mutabakat/page";

// The page-level session check is the panel's last line of defence after the move to /panel.
vi.mock("next/navigation", () => ({
  redirect: vi.fn((to: string) => { throw new Error(`NEXT_REDIRECT ${to}`); }),
  notFound: vi.fn(() => { throw new Error("NEXT_NOT_FOUND"); }),
}));
vi.mock("@/lib/auth/session", () => ({ getSessionUser: vi.fn() }));
vi.mock("@/db/queries", () => ({ listReceipts: vi.fn(), getReceipt: vi.fn(), getRules: vi.fn(), nextDraft: vi.fn() }));
vi.mock("@/components/AppShell", () => ({ AppShell: () => null }));
vi.mock("@/components/ReceiptListView", () => ({ ReceiptListView: () => null, TABS: [{ slug: "" }] }));
vi.mock("@/components/ReceiptView", () => ({ ReceiptView: () => null }));
vi.mock("@/components/RulesView", () => ({ RulesView: () => null }));
vi.mock("@/components/ReconcileView", () => ({ ReconcileView: () => null }));
vi.mock("@/lib/firm", () => ({ activeFirm: vi.fn() }));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(session.getSessionUser).mockResolvedValue(null);
});

describe("panel pages without a session", () => {
  it.each([
    ["list", () => PanelPage({ searchParams: Promise.resolve({}) })],
    ["receipt", () => ReceiptPage({ params: Promise.resolve({ id: "00000000-0000-4000-8000-000000000001" }) })],
    ["rules", () => RulesPage()],
    ["muavin", () => ReconcilePage({ searchParams: Promise.resolve({}) })],
  ])("%s redirects to /giris before touching the database", async (_, render) => {
    await expect(render()).rejects.toThrow("NEXT_REDIRECT /giris");
    expect(q.listReceipts).not.toHaveBeenCalled();
    expect(q.getReceipt).not.toHaveBeenCalled();
    expect(q.getRules).not.toHaveBeenCalled();
    expect(q.nextDraft).not.toHaveBeenCalled();
  });
});
