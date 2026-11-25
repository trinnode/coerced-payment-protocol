import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Phylax — coerced-payment incident infrastructure",
    short_name: "Phylax",
    description: "A safer signal when consent is taken away.",
    start_url: "/",
    display: "standalone",
    background_color: "#050807",
    theme_color: "#050807",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/brand/phylax-mark.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}
