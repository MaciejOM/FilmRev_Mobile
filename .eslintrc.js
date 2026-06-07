// .eslintrc.js
module.exports = {
  extends: ["expo", "prettier"],
  plugins: ["prettier"],
  rules: {
    "prettier/prettier": "error",
    // Wyłączamy ostrzeżenia o 'any', ponieważ używaliśmy go dla uproszczenia w kilku miejscach
    "@typescript-eslint/no-explicit-any": "off",
    // Wyłączamy wymóg używania absolutnych ścieżek
    "import/no-unresolved": "off",
  },
};
