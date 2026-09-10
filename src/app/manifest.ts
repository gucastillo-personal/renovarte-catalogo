import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "RenovArte — Catálogo",
    short_name: "RenovArte",
    description:
      "Catálogo de productos de skincare y cosmética seleccionados por RenovArte.",
    start_url: "/",
    display: "standalone",
    lang: "es-AR",
    theme_color: "#f4f1e8",
    background_color: "#faf8f2",
    icons: [
      { src: "/icon.svg", type: "image/svg+xml", sizes: "any" },
      { src: "/apple-icon.png", type: "image/png", sizes: "180x180" },
    ],
  };
}
