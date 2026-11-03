import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Accountie",
    short_name: "Accountie",
    description: "Yazar kasa fişinden Luca için yevmiye kaydı hazırlar.",
    start_url: "/panel",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    // A manifest has one splash colour and cannot follow the theme; any value flashes for one of the two looks.
    // Light ground kept on purpose: the system default for most phones, and the splash lasts only until the first paint.
    background_color: "#f2f4f7",
    theme_color: "#f2f4f7",
    lang: "tr",
    dir: "ltr",
    categories: ["business", "finance", "productivity"],
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [{ name: "Fişler", url: "/panel" }, { name: "Hesap kuralları", url: "/panel/kurallar" }],
  };
}
