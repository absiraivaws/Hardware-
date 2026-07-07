import { NextResponse } from "next/server"
import { exec } from "child_process"
import { promisify } from "util"
import fs from "fs"
import { createClient } from "@supabase/supabase-js"

const execAsync = promisify(exec)

interface PrintItem {
  product_name: string
  quantity: number
  unit_price: number
  total_price: number
}

interface PrintRequest {
  company?: string
  address?: string
  contact?: string
  invoice_no: string
  date?: string
  items: PrintItem[]
  grand_total: number
  amount_paid: number
  balance_due: number
}

interface PrinterConfig {
  enabled: boolean
  printer_type: "tspl" | "escpos" | "zpl"
  device_path: string
  cups_queue: string
  label_width: number
  label_height: number
  gap_height: number
}

const DEFAULT_CONFIG: PrinterConfig = {
  enabled: true,
  printer_type: "tspl",
  device_path: "/dev/usb/lp0",
  cups_queue: "GS-2406T",
  label_width: 40,
  label_height: 70,
  gap_height: 0,
}

async function getPrinterConfig(): Promise<PrinterConfig> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
  const { data } = await supabase
    .from("printer_settings")
    .select("*")
    .limit(1)
    .maybeSingle()
  if (data) {
    return {
      enabled: (data as Record<string, unknown>).enabled as boolean,
      printer_type: (data as Record<string, unknown>).printer_type as "tspl" | "escpos" | "zpl",
      device_path: (data as Record<string, unknown>).device_path as string,
      cups_queue: (data as Record<string, unknown>).cups_queue as string,
      label_width: Number((data as Record<string, unknown>).label_width),
      label_height: Number((data as Record<string, unknown>).label_height),
      gap_height: Number((data as Record<string, unknown>).gap_height),
    }
  }
  return DEFAULT_CONFIG
}

// ─── TSPL Builder (Gainscha/TSC label printers) ───
function escp(s: string): string {
  return s.replace(/"/g, "'")
}

function buildTspl(data: PrintRequest, cfg: PrinterConfig): string {
  const lines: string[] = []
  const w = cfg.label_width
  const h = cfg.label_height
  const gap = cfg.gap_height
  const dotsW = Math.round(w * 8) // 203 DPI ≈ 8 dots/mm
  const usableW = dotsW - 20

  lines.push(`SIZE ${w} mm, ${h} mm`)
  lines.push(`GAP ${gap} mm, 0 mm`)
  lines.push("DIRECTION 0")
  lines.push("REFERENCE 0,0")
  lines.push("SET TEAR OFF")
  lines.push("CLS")

  let y = 10

  const companyName = data.company || "HARDWARE ERP"
  lines.push(`TEXT 10,${y},"4",0,1,1,"${escp(companyName)}"`)
  y += 40

  if (data.address) {
    lines.push(`TEXT 10,${y},"1",0,1,1,"${escp(data.address)}"`)
    y += 18
  }
  if (data.contact) {
    lines.push(`TEXT 10,${y},"1",0,1,1,"Tel: ${escp(data.contact)}"`)
    y += 18
  }

  y += 5
  lines.push(`BAR 10,${y},${usableW},2`)
  y += 10

  lines.push(`TEXT 10,${y},"2",0,1,1,"${escp(data.invoice_no)}"`)
  y += 22
  lines.push(`TEXT 10,${y},"1",0,1,1,"${escp(data.date || new Date().toLocaleDateString())}"`)
  y += 18
  y += 5
  lines.push(`BAR 10,${y},${usableW},2`)
  y += 10

  const colAmt = dotsW - 70
  const colQty = colAmt - 50

  lines.push(`TEXT 10,${y},"1",0,1,1,"Item"`)
  lines.push(`TEXT ${colQty},${y},"1",0,1,1,"Qty"`)
  lines.push(`TEXT ${colAmt},${y},"1",0,1,1,"Amt"`)
  y += 16

  for (const item of data.items) {
    const maxLen = Math.floor((colQty - 10) / 8 * 1.2)
    const name = item.product_name.length > maxLen
      ? item.product_name.slice(0, maxLen - 2) + ".."
      : item.product_name
    lines.push(`TEXT 10,${y},"1",0,1,1,"${escp(name)}"`)
    lines.push(`TEXT ${colQty},${y},"1",0,1,1,"${item.quantity}"`)
    lines.push(`TEXT ${colAmt},${y},"1",0,1,1,"${item.total_price.toFixed(2)}"`)
    y += 16
  }

  y += 5
  lines.push(`BAR 10,${y},${usableW},2`)
  y += 10

  lines.push(`TEXT 10,${y},"2",0,1,1,"TOTAL"`)
  lines.push(`TEXT ${colAmt},${y},"2",0,1,1,"${data.grand_total.toFixed(2)}"`)
  y += 22

  lines.push(`TEXT 10,${y},"1",0,1,1,"Paid"`)
  lines.push(`TEXT ${colAmt},${y},"1",0,1,1,"${data.amount_paid.toFixed(2)}"`)
  y += 16

  lines.push(`TEXT 10,${y},"1",0,1,1,"Balance"`)
  lines.push(`TEXT ${colAmt},${y},"1",0,1,1,"${data.balance_due.toFixed(2)}"`)
  y += 22

  y += 10
  const barcodeW = Math.min(usableW, 250)
  const barcodeX = Math.round((dotsW - barcodeW) / 2)
  lines.push(`BARCODE ${barcodeX},${y},"128",1,1,0,40,20,"${escp(data.invoice_no)}"`)
  y += 50

  lines.push("PRINT 1")
  return lines.join("\n")
}

// ─── ESC/POS Builder (Epson/Star/thermal receipt printers) ───
function buildEscPos(data: PrintRequest): Uint8Array {
  const cmds: number[] = []

  const push = (...bytes: number[]) => cmds.push(...bytes)
  const text = (s: string) => {
    for (let i = 0; i < s.length; i++) cmds.push(s.charCodeAt(i))
  }

  push(0x1B, 0x40) // Initialize
  push(0x1B, 0x61, 0x01) // Center
  push(0x1D, 0x21, 0x11) // Double size
  text(data.company || "HARDWARE ERP")
  push(0x0A)
  push(0x1D, 0x21, 0x00)
  push(0x0A)

  push(0x1B, 0x61, 0x00) // Left
  text(`Invoice: ${data.invoice_no}`)
  push(0x0A)
  text(`Date: ${data.date || new Date().toLocaleDateString()}`)
  push(0x0A)
  push(0x0A)

  const sep = "--------------------------------"
  text(sep)
  push(0x0A)
  text("Item                Qty  Amount")
  push(0x0A)
  text(sep)
  push(0x0A)

  for (const item of data.items) {
    const name = item.product_name.length > 18
      ? item.product_name.slice(0, 16) + ".."
      : item.product_name
    const padded = name.padEnd(18).slice(0, 18)
    const qty = String(item.quantity).padStart(4)
    const amt = item.total_price.toFixed(2).padStart(8)
    text(`${padded}${qty}${amt}`)
    push(0x0A)
  }

  text(sep)
  push(0x0A)
  text(`TOTAL:${data.grand_total.toFixed(2).padStart(30)}`)
  push(0x0A)
  text(`Paid: ${data.amount_paid.toFixed(2)}`)
  push(0x0A)
  text(`Balance: ${data.balance_due.toFixed(2)}`)
  push(0x0A)
  push(0x0A)
  push(0x1D, 0x56, 0x00) // Cut

  return new Uint8Array(cmds)
}

// ─── ZPL Builder (Zebra label printers) ───
function buildZpl(data: PrintRequest, cfg: PrinterConfig): string {
  const w = Math.round(cfg.label_width * 8) // dots at 203 DPI
  const h = Math.round(cfg.label_height * 8)

  const lines: string[] = []
  lines.push(`^XA`)
  lines.push(`^LL${h}`)
  lines.push(`^PW${w}`)
  lines.push(`^CF0,30`)
  lines.push(`^FO10,10^FB${w - 20},1,0,C,0^FD${data.company || "HARDWARE ERP"}^FS`)
  lines.push(`^CF0,15`)
  lines.push(`^FO10,60^FD${data.invoice_no}^FS`)
  lines.push(`^FO10,80^FD${data.date || new Date().toLocaleDateString()}^FS`)
  lines.push(`^FO10,100^GB${w - 20},2,2^FS`)

  let y = 115
  lines.push(`^CF0,15`)
  lines.push(`^FO10,${y}^FDItem^FS`)
  lines.push(`^FO${w - 150},${y}^FDQty^FS`)
  lines.push(`^FO${w - 80},${y}^FD Amt^FS`)
  y += 18

  for (const item of data.items) {
    const name = item.product_name.length > 20 ? item.product_name.slice(0, 18) + ".." : item.product_name
    lines.push(`^FO10,${y}^FD${name}^FS`)
    lines.push(`^FO${w - 150},${y}^FD${item.quantity}^FS`)
    lines.push(`^FO${w - 80},${y}^FD${item.total_price.toFixed(2)}^FS`)
    y += 16
  }

  y += 5
  lines.push(`^FO10,${y}^GB${w - 20},2,2^FS`)
  y += 10

  lines.push(`^CF0,20`)
  lines.push(`^FO10,${y}^FDTOTAL:^FS`)
  lines.push(`^FO${w - 80},${y}^FD${data.grand_total.toFixed(2)}^FS`)
  y += 24
  lines.push(`^CF0,15`)
  lines.push(`^FO10,${y}^FDPaid: ${data.amount_paid.toFixed(2)}^FS`)
  y += 18
  lines.push(`^FO10,${y}^FDBalance: ${data.balance_due.toFixed(2)}^FS`)
  y += 30

  lines.push(`^FO${Math.round((w - 200) / 2)},${y}^BY3^BCN,80,Y,N,N^FD${data.invoice_no}^FS`)
  lines.push(`^XZ`)

  return lines.join("\n")
}

async function printRaw(data: Uint8Array | string, cfg: PrinterConfig): Promise<void> {
  const buf = typeof data === "string" ? data : Buffer.from(data)

  try {
    await fs.promises.writeFile(cfg.device_path, buf)
  } catch {
    await execAsync(`echo ${JSON.stringify(buf.toString())} | lp -d ${cfg.cups_queue} -o raw`)
  }
}

export async function POST(req: Request) {
  try {
    const data: PrintRequest = await req.json()
    if (!data.invoice_no || !data.items) {
      return NextResponse.json({ error: "Missing required fields: invoice_no, items" }, { status: 400 })
    }

    const cfg = await getPrinterConfig()
    if (!cfg.enabled) {
      return NextResponse.json({ success: false, reason: "printer_disabled" })
    }

    if (cfg.printer_type === "tspl") {
      const tspl = buildTspl(data, cfg)
      await printRaw(tspl, cfg)
    } else if (cfg.printer_type === "escpos") {
      const esc = buildEscPos(data)
      await printRaw(esc, cfg)
    } else if (cfg.printer_type === "zpl") {
      const zpl = buildZpl(data, cfg)
      await printRaw(zpl, cfg)
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("Print error:", err)
    return NextResponse.json({ error: "Print failed" }, { status: 500 })
  }
}
