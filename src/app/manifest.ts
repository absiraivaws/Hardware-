import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "HardPro ERP - Hardware Management System",
    short_name: "HardPro",
    description: "Complete ERP system for Sri Lankan hardware stores",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#059669",
    icons: [
      { src: "/icon-192.svg", sizes: "192x192", type: "image/svg+xml" },
      { src: "/icon-192.svg", sizes: "512x512", type: "image/svg+xml" },
    ],
  }
}
