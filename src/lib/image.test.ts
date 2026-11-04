import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { cropReceipt } from "./image";

describe("cropReceipt", () => {
  it("cuts the box with a small margin and clamps it to the photo", async () => {
    const photo = await sharp({ create: { width: 2000, height: 1000, channels: 3, background: "#fff" } }).jpeg().toBuffer();
    const left = await sharp(await cropReceipt(photo, { left: 0, top: 0, right: 250, bottom: 1000 })).metadata();
    expect([left.width, left.height]).toEqual([530, 1000]); // 0..265 of 2000 wide, the whole height
    const mid = await sharp(await cropReceipt(photo, { left: 500, top: 100, right: 600, bottom: 900 })).metadata();
    expect([mid.width, mid.height]).toEqual([260, 830]);
  });
});
