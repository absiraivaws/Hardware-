import { NextResponse } from "next/server"
import { exec } from "child_process"
import { promisify } from "util"
import fs from "fs"

const execAsync = promisify(exec)
const PRINTER_DEVICE = "/dev/usb/lp0"
const CUPS_QUEUE = "GS-2406T"

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

function escp(s: string): string {
  return s.replace(/"/g, "'")
}

function buildTspl(data: PrintRequest): string {
  const lines: string[] = []

  lines.push("SIZE 40 mm, 70 mm")
  lines.push("GAP 0 mm, 0 mm")
  lines.push("DIRECTION 0")
  lines.push("REFERENCE 0,0")
  lines.push("SET TEAR OFF")
  lines.push("CLS")

  let y = 10

  // Company name
  const companyName = data.company || "HARDWARE ERP"
  lines.push(`TEXT 10,${y},"4",0,1,1,"${escp(companyName)}"`)
  y += 40

  // Address
  if (data.address) {
    lines.push(`TEXT 10,${y},"1",0,1,1,"${escp(data.address)}"`)
    y += 18
  }

  // Contact
  if (data.contact) {
    lines.push(`TEXT 10,${y},"1",0,1,1,"Tel: ${escp(data.contact)}"`)
    y += 18
  }

  y += 5
  lines.push(`BAR 10,${y},295,2`)
  y += 10

  // Invoice no
  lines.push(`TEXT 10,${y},"2",0,1,1,"${escp(data.invoice_no)}"`)
  y += 22

  // Date
  lines.push(`TEXT 10,${y},"1",0,1,1,"${escp(data.date || new Date().toLocaleDateString())}"`)
  y += 18
  y += 5
  lines.push(`BAR 10,${y},295,2`)
  y += 10

  // Items header
  lines.push(`TEXT 10,${y},"1",0,1,1,"Item"`)
  lines.push(`TEXT 195,${y},"1",0,1,1,"Qty"`)
  lines.push(`TEXT 235,${y},"1",0,1,1,"Amt"`)
  y += 16

  // Items
  for (const item of data.items) {
    const name = item.product_name.length > 18
      ? item.product_name.slice(0, 16) + ".."
      : item.product_name
    lines.push(`TEXT 10,${y},"1",0,1,1,"${escp(name)}"`)
    lines.push(`TEXT 195,${y},"1",0,1,1,"${item.quantity}"`)
    lines.push(`TEXT 235,${y},"1",0,1,1,"${item.total_price.toFixed(2)}"`)
    y += 16
  }

  y += 5
  lines.push(`BAR 10,${y},295,2`)
  y += 10

  // Grand total
  lines.push(`TEXT 10,${y},"2",0,1,1,"TOTAL"`)
  lines.push(`TEXT 235,${y},"2",0,1,1,"${data.grand_total.toFixed(2)}"`)
  y += 22

  // Amount paid
  lines.push(`TEXT 10,${y},"1",0,1,1,"Paid"`)
  lines.push(`TEXT 235,${y},"1",0,1,1,"${data.amount_paid.toFixed(2)}"`)
  y += 16

  // Balance due
  lines.push(`TEXT 10,${y},"1",0,1,1,"Balance"`)
  lines.push(`TEXT 235,${y},"1",0,1,1,"${data.balance_due.toFixed(2)}"`)
  y += 22

  y += 10
  // Barcode
  lines.push(`BARCODE 30,${y},"128",1,1,0,40,20,"${escp(data.invoice_no)}"`)
  y += 50

  lines.push(`PRINT 1`)

  return lines.join("\n")
}

async function printViaDevice(tspl: string): Promise<void> {
  await fs.promises.writeFile(PRINTER_DEVICE, tspl)
}

async function printViaCups(tspl: string): Promise<void> {
  await execAsync(`echo ${JSON.stringify(tspl)} | lp -d ${CUPS_QUEUE} -o raw`)
}

export async function POST(req: Request) {
  try {
    const data: PrintRequest = await req.json()

    if (!data.invoice_no || !data.items) {
      return NextResponse.json({ error: "Missing required fields: invoice_no, items" }, { status: 400 })
    }

    const tspl = buildTspl(data)

    // Try direct device write first, fall back to CUPS
    try {
      await printViaDevice(tspl)
    } catch {
      await printViaCups(tspl)
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("Print error:", err)
    return NextResponse.json({ error: "Print failed" }, { status: 500 })
  }
}
