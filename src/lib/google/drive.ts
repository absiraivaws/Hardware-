"use client"

type TokenResponse = {
  access_token: string
  expires_in: number
  token_type: string
}

export async function refreshAccessToken(refreshToken: string): Promise<{ access_token: string }> {
  const res = await fetch("/api/auth/google-drive/refresh", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  })

  if (!res.ok) throw new Error("Failed to refresh Drive token")
  return res.json()
}

export async function ensureFolder(accessToken: string, folderName: string): Promise<string> {
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
    body: JSON.stringify({
      name: folderName,
      mimeType: "application/vnd.google-apps.folder",
    }),
  })
  const createData = await createRes.json()
  return createData.id
}

export async function findFile(
  accessToken: string,
  fileName: string,
  parentId: string,
): Promise<string | null> {
  const q = `name='${encodeURIComponent(fileName)}' and '${parentId}' in parents and trashed=false`
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  )
  const data = await res.json()
  return data.files?.[0]?.id ?? null
}

export async function uploadToDrive(
  accessToken: string,
  fileName: string,
  parentId: string,
  blob: Blob,
  existingFileId: string | null,
): Promise<string> {
  const metadata = existingFileId
    ? { name: fileName }
    : { name: fileName, parents: [parentId] }

  const form = new FormData()
  form.append(
    "metadata",
    new Blob([JSON.stringify(metadata)], { type: "application/json" }),
  )
  form.append("file", blob)

  if (existingFileId) {
    await fetch(
      `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=multipart`,
      {
        method: "PATCH",
        headers: { Authorization: `Bearer ${accessToken}` },
        body: form,
      },
    )
    return existingFileId
  }

  const res = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",
    {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
      body: form,
    },
  )
  const data = await res.json()
  return data.id
}
