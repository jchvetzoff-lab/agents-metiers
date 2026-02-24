import { getTranslations, translateTendance } from "@/lib/translations";

describe("getTranslations", () => {
  it("returns French translations by default", () => {
    const t = getTranslations("fr");
    expect(t.loading).toBeDefined();
    expect(t.notFound).toBeDefined();
    expect(t.secKeyInfo).toBeDefined();
  });

  it("returns English translations for 'en'", () => {
    const t = getTranslations("en");
    expect(t.loading).toBeDefined();
    // Should be different from French
    expect(t.loading).not.toBe(getTranslations("fr").loading);
  });

  it("falls back to French for unknown language", () => {
    const t = getTranslations("xx");
    const fr = getTranslations("fr");
    expect(t.loading).toBe(fr.loading);
  });

  it("all translations have consistent keys", () => {
    const fr = getTranslations("fr");
    const en = getTranslations("en");
    const frKeys = Object.keys(fr);
    const enKeys = Object.keys(en);
    // English should have all French keys
    for (const key of frKeys) {
      expect(enKeys).toContain(key);
    }
  });
});

describe("translateTendance", () => {
  const t = getTranslations("fr");

  it("translates known tendances", () => {
    expect(translateTendance("emergence", t)).toBe(t.tendEmergence);
    expect(translateTendance("stable", t)).toBe(t.tendStable);
    expect(translateTendance("croissance", t)).toBe(t.tendCroissance);
  });

  it("handles case insensitivity", () => {
    expect(translateTendance("EMERGENCE", t)).toBe(t.tendEmergence);
    expect(translateTendance("Stable", t)).toBe(t.tendStable);
  });

  it("returns raw value for unknown tendance", () => {
    expect(translateTendance("unknown_tendance", t)).toBe("unknown_tendance");
  });
});
