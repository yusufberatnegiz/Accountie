import { describe, expect, it } from "vitest";
import { zNoFits } from "./z-sequence";

// The firm whose Z reports were misread (2026-10), by the numbers kept after correction.
const run = [
  { no: "0019", date: "2026-10-05" }, { no: "0027", date: "2026-10-13" }, { no: "0029", date: "2026-10-15" },
  { no: "0037", date: "2026-10-23" }, { no: "0040", date: "2026-10-26" },
];

describe("zNoFits", () => {
  it("the three misreads do not fit", () => {
    expect(zNoFits("0058", "2026-10-06", run)).toBe(false);
    expect(zNoFits("0042", "2026-10-14", run)).toBe(false);
    expect(zNoFits("0077", "2026-10-24", run)).toBe(false);
  });

  it("their right numbers fit, from either side and across closed days", () => {
    expect(zNoFits("0020", "2026-10-06", run)).toBe(true);
    expect(zNoFits("0028", "2026-10-14", run)).toBe(true);
    expect(zNoFits("0038", "2026-10-24", run)).toBe(true);
    expect(zNoFits("0018", "2026-10-03", run)).toBe(true);
  });

  it("a firm with two tills fits either run; two reports on one day are a step apart", () => {
    const two = [{ no: "0264", date: "2026-10-01" }, { no: "0124", date: "2026-10-01" }];
    expect(zNoFits("0126", "2026-10-02", two)).toBe(true);
    expect(zNoFits("0266", "2026-10-02", two)).toBe(true);
    expect(zNoFits("0265", "2026-10-01", two)).toBe(true);
    expect(zNoFits("0190", "2026-10-02", two)).toBe(false);
  });

  it("nothing to compare with fits", () => {
    expect(zNoFits("0042", "2026-10-14", [])).toBe(true);
    expect(zNoFits("Z-12", "2026-10-14", run)).toBe(true);
    expect(zNoFits("0042", "", run)).toBe(true);
    expect(zNoFits("0042", "2026-10-14", [{ no: "", date: "2026-10-13" }])).toBe(true);
  });
});
