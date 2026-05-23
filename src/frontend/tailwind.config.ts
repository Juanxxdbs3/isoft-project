import type { Config } from "tailwindcss";

// En Tailwind v4 la mayor parte de la configuración vive en globals.css
// bajo el bloque @theme inline. Este archivo solo activa el modo oscuro
// por clase y queda disponible para registrar plugins si se necesitan.
const config: Config = {
  darkMode: "class",
};

export default config;
