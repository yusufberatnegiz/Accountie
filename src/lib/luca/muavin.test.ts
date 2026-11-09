import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { unzippedSize } from "../zip";
import { MuavinError, readMuavin, reconcile, type ReceiptForCheck } from "./muavin";

const book = async (rows: (string | number | Date | null)[][]) => {
  const b = new ExcelJS.Workbook();
  const s = b.addWorksheet("Muavin");
  for (const r of rows) s.addRow(r);
  return Buffer.from(await b.xlsx.writeBuffer());
};

describe("muavin okuma", () => {
  it("Hesap Kodu sütunlu düzeni okur; sayı ve Türkçe metin tutarları kuruşa çevirir", async () => {
    const rows = await readMuavin(await book([
      ["ÖRNEK FİRMA 191 MUAVİN"],
      [],
      ["Hesap Kodu", "Tarih", "Fiş No", "Evrak No", "Açıklama", "Borç", "Alacak", "Bakiye"],
      ["191.03.10", new Date("2026-09-08T00:00:00Z"), 15, "0412", "örnek balık lokantası", 589.09, 0, 589.09],
      ["191.03.20", "02.09.2026", 16, "912", "örnek kırtasiye", "80,00", "", "669,09"],
      [null, null, null, null, "Toplam", 669.09, 0, null],
    ]));
    expect(rows).toEqual([
      { accountCode: "191.03.10", documentNo: "0412", date: "2026-09-08", debitKurus: 58909, creditKurus: 0 },
      { accountCode: "191.03.20", documentNo: "912", date: "2026-09-02", debitKurus: 8000, creditKurus: 0 },
    ]);
  });

  it("hesaba göre gruplanmış düzende hesap kodunu başlık satırından alır", async () => {
    const rows = await readMuavin(await book([
      ["Evrak Tarihi", "Evrak No", "Açıklama", "Borç", "Alacak"],
      ["770.08 Yeme-İçme ve Ağırlama Giderleri"],
      ["08.09.2026", "0412", "örnek balık lokantası", 5890.91, 0],
      ["331.01 Ortaklara Borçlar"],
      ["08.09.2026", "0412", "örnek balık lokantası", 0, 6480],
    ]));
    expect(rows.map((r) => [r.accountCode, r.documentNo, r.debitKurus, r.creditKurus])).toEqual([["770.08", "0412", 589091, 0], ["331.01", "0412", 0, 648000]]);
  });

  it("sütunları bulamayınca ya da dosya Excel değilse Türkçe söyler", async () => {
    await expect(readMuavin(await book([["Tarih", "Açıklama", "Tutar"], ["01.09.2026", "x", 5]]))).rejects.toThrow(MuavinError);
    await expect(readMuavin(Buffer.from("düz metin"))).rejects.toThrow(/Excel/);
  });

  it("açılınca sınırı aşan ya da dizini bozuk zip'i ayrıştırmadan reddeder", async () => {
    const ok = await book([["Evrak No", "Borç", "Alacak"]]);
    expect(unzippedSize(ok)).toBeGreaterThan(0);
    expect(unzippedSize(ok)).toBeLessThan(1_000_000);
    const huge = Buffer.from(ok);
    const end = huge.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
    huge.writeUInt32LE(0xfffffff0, huge.readUInt32LE(end + 16) + 24); // first entry claims ~4 GB unpacked
    expect(unzippedSize(huge)).toBeGreaterThan(60 * 1024 * 1024);
    await expect(readMuavin(huge)).rejects.toThrow(MuavinError);
    // A header that understates the size: the capped inflate still stops it before exceljs sees the file.
    const { deflateRawSync } = await import("node:zlib");
    const body = deflateRawSync(Buffer.alloc(20 * 1024 * 1024, 0x20)), lie = Buffer.alloc(30);
    lie.writeUInt32LE(0x04034b50, 0); lie.writeUInt16LE(8, 8); lie.writeUInt32LE(body.length, 18); lie.writeUInt32LE(10, 22); lie.writeUInt16LE(1, 26);
    const cd = Buffer.alloc(46); cd.writeUInt32LE(0x02014b50, 0); cd.writeUInt16LE(8, 10); cd.writeUInt32LE(body.length, 20); cd.writeUInt32LE(10, 24); cd.writeUInt16LE(1, 28);
    const eocd = Buffer.alloc(22); eocd.writeUInt32LE(0x06054b50, 0); eocd.writeUInt16LE(1, 8); eocd.writeUInt16LE(1, 10); eocd.writeUInt32LE(47, 12); eocd.writeUInt32LE(31 + body.length, 16);
    await expect(readMuavin(Buffer.concat([lie, Buffer.from("x"), body, cd, Buffer.from("x"), eocd]))).rejects.toThrow(MuavinError);
    expect(unzippedSize(Buffer.from([0x50, 0x4b, 3, 4]))).toBe(Infinity);
  });
});

describe("mutabakat", () => {
  const r = (id: string, documentNo: string, lines: [string, number, number][]): ReceiptForCheck =>
    ({ id, vendorName: `ÖRNEK ${id}`, documentNo, lines: lines.map(([accountCode, debitKurus, creditKurus]) => ({ accountCode, debitKurus, creditKurus })) });
  const lokanta = r("a", "0412", [["770.08", 589091, 0], ["191.03.10", 58909, 0], ["331.01", 0, 648000]]);
  const kirtasiye = r("b", "0912", [["770.02", 40000, 0], ["191.03.20", 8000, 0], ["100.01", 0, 48000]]);
  const kafe = r("c", "0331", [["770.08", 24091, 0], ["191.03.10", 2409, 0], ["331.01", 0, 26500]]);

  it("191 muavininde yalnız 191 satırlarını karşılaştırır: uyuyor, tutar farkı, Luca'da yok ve Accountie'de yok", () => {
    const { results, extra, accounts } = reconcile([lokanta, kirtasiye, kafe], [
      { accountCode: "191.03.10", documentNo: "412", date: null, debitKurus: 58909, creditKurus: 0 },
      { accountCode: "191.03.20", documentNo: "0912", date: null, debitKurus: 8800, creditKurus: 0 },
      { accountCode: "191.03.20", documentNo: "7777", date: null, debitKurus: 1500, creditKurus: 0 },
    ]);
    expect(accounts).toEqual(["191.03.10", "191.03.20"]);
    expect(results.map((x) => [x.receipt.id, x.kind])).toEqual([["a", "uyuyor"], ["b", "fark"], ["c", "yok"]]);
    expect(results[1]).toMatchObject({ lines: [{ accountCode: "191.03.20", expectedKurus: 8000, foundKurus: 8800 }] });
    expect(extra.map((x) => x.documentNo)).toEqual(["7777"]);
  });

  it("hesap kodu olmayan muavinde her satırı evrak no ve tutarla karşılaştırır", () => {
    const rows = [58909, 589091, 648000].map((k, i) => ({ accountCode: null, documentNo: "0412", date: null, debitKurus: i === 2 ? 0 : k, creditKurus: i === 2 ? k : 0 }));
    expect(reconcile([lokanta], rows).results[0].kind).toBe("uyuyor");
  });
});
