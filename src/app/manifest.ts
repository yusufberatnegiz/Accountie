import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Accountie",
    short_name: "Accountie",
    description: "Yazar kasa fişinden Luca için yevmiye kaydı hazırlar.",
    start_url: "/",
    display: "standalone",
    background_color: "#f4f6f8",
    theme_color: "#2c4a72",
    lang: "tr",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
