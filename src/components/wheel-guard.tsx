"use client"

import { useEffect } from "react"

export function WheelGuard() {
  useEffect(() => {
    const handler = (e: WheelEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName === "INPUT" && (target as HTMLInputElement).type === "number") {
        e.preventDefault()
      }
    }
    document.addEventListener("wheel", handler, { passive: false })
    return () => document.removeEventListener("wheel", handler)
  }, [])

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      if (process.env.NODE_ENV === "production") {
        navigator.serviceWorker.register("/sw.js")
      } else {
        navigator.serviceWorker.getRegistrations().then((regs) => {
          regs.forEach((r) => r.unregister())
        })
      }
    }
  }, [])

  return null
}
