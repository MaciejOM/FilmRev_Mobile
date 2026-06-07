import { AppColors, globalStyles } from "../theme";

describe("Plik konfiguracyjny motywu (theme.ts)", () => {
  it("AppColors zawiera poprawne kolory dla trybu ciemnego", () => {
    expect(AppColors.background).toBe("#27282e");
    expect(AppColors.primary).toBe("#a83350");
    expect(AppColors.textWhite).toBe("#ffffff");
  });

  it("globalStyles ma zdefiniowane odpowiednie style układu (layout)", () => {
    const styles = globalStyles as any;

    expect(styles.button.borderRadius).toBe(5);
    expect(styles.input.height).toBe(50);
    expect(styles.buttonDanger.marginTop).toBe(10);
    expect(styles.header.height).toBe(100);
  });

  it("globalStyles poprawnie dziedziczy kolory z AppColors", () => {
    const styles = globalStyles as any;

    expect(styles.container.backgroundColor).toBe(AppColors.background);
    expect(styles.header.backgroundColor).toBe(AppColors.headerBackground);
    expect(styles.input.backgroundColor).toBe(AppColors.inputBackground);
  });
});
