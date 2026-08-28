import { describe, expect, it } from "vitest";
import { deadlineSource } from "./deadlines";

describe("deadlineSource", () => {
  it("GİB takvimindeki SGK türlerini SGK olarak sınıflandırır", () => {
    expect(deadlineSource("gib", "SGK", "Muhtasar ve Prim Hizmet Beyannamesi")).toBe("SGK");
    expect(deadlineSource("gib", "Gelir Vergisi", "Muhtasar ve Prim Hizmet Beyannamesi ile beyan")).toBe("SGK");
    expect(deadlineSource("gib", "Katma Değer Vergisi", "KDV beyanı")).toBe("GİB");
  });
});
