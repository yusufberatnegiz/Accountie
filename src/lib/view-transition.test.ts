import { describe, expect, it } from "vitest";
import { transformOnly } from "./view-transition";

describe("transformOnly", () => {
  const from = { offset: 0, transform: "matrix(1, 0, 0, 1, 20, 40)", width: "100px", height: "50px" };

  it("drops the group's resize and keeps its move", () => {
    expect(transformOnly([from])).toEqual([{ offset: 0, transform: "matrix(1, 0, 0, 1, 20, 40)" }]);
  });

  it("turns the resize into a scale toward the new size", () => {
    expect(transformOnly([from], { width: 200, height: 25 })).toEqual([{ offset: 0, transform: "matrix(1, 0, 0, 1, 20, 40) scale(0.5, 2)" }]);
    expect(transformOnly([{ ...from, transform: "none" }], { width: 100, height: 50 })[0].transform).toBe("scale(1, 1)");
  });

  it("leaves frames without a size alone", () => {
    expect(transformOnly([{ offset: 1, transform: "none" }], { width: 10, height: 10 })).toEqual([{ offset: 1, transform: "none" }]);
  });
});
