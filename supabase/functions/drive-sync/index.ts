import { createClient } from "jsr:@supabase/supabase-js@2"
import * as XLSX from "npm:xlsx@0.18.5"

const CLIENT_ID = Deno.env.get("GOOGLE_DRIVE_CLIENT_ID")!
const CLIENT_SECRET = Deno.env.get("GOOGLE_DRIVE_CLIENT_SECRET")!
const FOLDER_NAME = "HardPro ERP"

interface LedgerRecord {
  created_at: string | null
  description: string | null
  entry_type: string | null
  amount: string | number | null
}

Deno.serve(async () => {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    )

    const { data: settings } = await supabase
      .from("company_settings")
      .select("google_drive_refresh_token")
      .limit(1)
      .maybeSingle()

    if (!settings?.google_drive_refresh_token) {
      return new Response(JSON.stringify({ skipped: true, reason: "Drive not connected" }), {
        headers: { "Content-Type": "application/json" },
      })
    }

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        refresh_token: settings.google_drive_refresh_token,
        grant_type: "refresh_token",
      }),
    })
    const token = await tokenRes.json()
    if (!tokenRes.ok) throw new Error("Token refresh failed")
    const accessToken: string = token.access_token

    const folderId = await ensureFolder(accessToken, FOLDER_NAME)

    // Customer Ledgers
    const { data: customers } = await supabase
      .from("customers")
      .select("id, name, phone")
      .order("name")

    const customerBook = buildWorkbook(
      customers ?? [],
      (c) => c.name ?? "Unknown",
      async (id) => {
        const { data } = await supabase
          .from("ledger_entries")
          .select("created_at, description, entry_type, amount")
          .eq("ledger_type", "customer")
          .eq("reference_id", id)
          .order("created_at", { ascending: true })
        return data ?? []
      },
    )
    const customerBuffer = XLSX.write(customerBook, { type: "buffer", bookType: "xlsx" })
    const customerExistingId = await findFile(accessToken, "Customer_Ledgers.xlsx", folderId)
    await uploadFile(accessToken, "Customer_Ledgers.xlsx", folderId, customerBuffer, customerExistingId)

    // Supplier Ledgers
    const { data: suppliers } = await supabase
      .from("suppliers")
      .select("id, name, contact_person")
      .order("name")

    const supplierBook = buildWorkbook(
      suppliers ?? [],
      (s) => s.name ?? "Unknown",
      async (id) => {
        const { data } = await supabase
          .from("ledger_entries")
          .select("created_at, description, entry_type, amount")
          .eq("ledger_type", "supplier")
          .eq("reference_id", id)
          .order("created_at", { ascending: true })
        return data ?? []
      },
    )
    const supplierBuffer = XLSX.write(supplierBook, { type: "buffer", bookType: "xlsx" })
    const supplierExistingId = await findFile(accessToken, "Supplier_Ledgers.xlsx", folderId)
    await uploadFile(accessToken, "Supplier_Ledgers.xlsx", folderId, supplierBuffer, supplierExistingId)

    return new Response(JSON.stringify({ success: true, files: ["Customer_Ledgers.xlsx", "Supplier_Ledgers.xlsx"] }), {
      headers: { "Content-Type": "application/json" },
    })
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
})

async function buildWorkbook<T extends { id: string; name?: string | null }>(
  entities: T[],
  getName: (entity: T) => string,
  fetchEntries: (id: string) => Promise<LedgerRecord[]>,
): Promise<XLSX.WorkBook> {
  const workbook = XLSX.utils.book_new()

  for (const entity of entities) {
    const entries = await fetchEntries(entity.id)
    const rows: Record<string, unknown>[] = []
    let runningBalance = 0

    for (const e of entries) {
      const amt = Number(e.amount)
      if (e.entry_type === "debit") runningBalance += amt
      else runningBalance -= amt

      rows.push({
        Date: e.created_at ? new Date(e.created_at).toISOString().split("T")[0] : "",
        Description: e.description ?? "",
        Debit: e.entry_type === "debit" ? amt : "",
        Credit: e.entry_type === "credit" ? amt : "",
        "Running Balance": runningBalance,
      })
    }

    const totalDebit = entries
      .filter((e) => e.entry_type === "debit")
      .reduce((s, e) => s + Number(e.amount), 0)
    const totalCredit = entries
      .filter((e) => e.entry_type === "credit")
      .reduce((s, e) => s + Number(e.amount), 0)

    rows.push({ Date: "", Description: "--- Summary ---", Debit: "", Credit: "", "Running Balance": "" })
    rows.push({ Date: "", Description: "Total Debit", Debit: totalDebit, Credit: "", "Running Balance": "" })
    rows.push({ Date: "", Description: "Total Credit", Debit: "", Credit: totalCredit, "Running Balance": "" })
    rows.push({ Date: "", Description: "Net Balance", Debit: "", Credit: "", "Running Balance": totalDebit - totalCredit })

    const sheet = XLSX.utils.json_to_sheet(rows)

    const colKeys = ["Date", "Description", "Debit", "Credit", "Running Balance"]
    const colWidths = colKeys.map((k) => {
      let max = k.length
      for (const r of rows) {
        const val = String(r[k] ?? "")
        if (val.length > max) max = val.length
      }
      return { wch: max + 3 }
    })
    sheet["!cols"] = colWidths

    const sheetName = getName(entity).slice(0, 31)
    XLSX.utils.book_append_sheet(workbook, sheetName, sheet)
  }

  if (entities.length === 0) {
    const sheet = XLSX.utils.json_to_sheet([{ Note: "No data available" }])
    XLSX.utils.book_append_sheet(workbook, "No Data", sheet)
  }

  return workbook
}

async function ensureFolder(accessToken: string, folderName: string): Promise<string> {
  const searchRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=name='${encodeURIComponent(folderName)}' and mimeType='application/vnd.google-apps.folder' and trashed=false&fields=files(id,name)`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  )
  const searchData = await searchRes.json()
  if (searchData.files?.length > 0) return searchData.files[0].id

  const createRes = await fetch("https://www.googleapis.com/drive/v3/files", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name: folderName, mimeType: "application/vnd.google-apps.folder" }),
  })
  const createData = await createRes.json()
  return createData.id
}

async function findFile(accessToken: string, fileName: string, parentId: string): Promise<string | null> {
  const q = `name='${encodeURIComponent(fileName)}' and '${parentId}' in parents and trashed=false`
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  )
  const data = await res.json()
  return data.files?.[0]?.id ?? null
}

async function uploadFile(
  accessToken: string,
  fileName: string,
  parentId: string,
  buffer: Uint8Array,
  existingFileId: string | null,
): Promise<string> {
  const boundary = "boundary123"
  const metadata = JSON.stringify({ name: fileName, parents: [parentId] })
  const encoder = new TextEncoder()

  const parts: Uint8Array[] = [
    encoder.encode(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n`),
    encoder.encode(`--${boundary}\r\nContent-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet\r\n\r\n`),
    buffer,
    encoder.encode(`\r\n--${boundary}--`),
  ]

  const totalLength = parts.reduce((s, p) => s + p.length, 0)
  const body = new Uint8Array(totalLength)
  let offset = 0
  for (const part of parts) {
    body.set(part, offset)
    offset += part.length
  }

  const url = existingFileId
    ? `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=multipart`
    : "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart"

  const method = existingFileId ? "PATCH" : "POST"

  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": `multipart/related; boundary=${boundary}`,
      "Content-Length": String(totalLength),
    },
    body,
  })

  const data = await res.json()
  if (!res.ok) throw new Error(data.error?.message ?? "Upload failed")
  return data.id
}
