import { ownerToken } from "./google.js";
import { pb, type PbWorkspace } from "./pb.js";
import type { AppState } from "./demo/types.js";

async function drive(token: string, url: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("authorization", `Bearer ${token}`);
  const res = await fetch(url, { ...init, headers });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google Drive ${res.status}: ${text.slice(0, 280)}`);
  }
  return res;
}

export async function ensureFolder(token: string, existing?: string) {
  if (existing) {
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files/${existing}?fields=id,trashed`,
      { headers: { authorization: `Bearer ${token}` } },
    );
    if (res.ok) {
      const data = (await res.json()) as { trashed?: boolean; id?: string };
      if (data.id && !data.trashed) return data.id;
    }
  }
  const created = await drive(token, "https://www.googleapis.com/drive/v3/files?fields=id", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "Todobee", mimeType: "application/vnd.google-apps.folder" }),
  });
  const json = (await created.json()) as { id: string };
  return json.id;
}

export async function writeWorkspaceFile(token: string, folderId: string, fileId: string | undefined, state: AppState) {
  const json = JSON.stringify(state);
  if (!fileId) {
    const boundary = "todobeejson";
    const meta = JSON.stringify({
      name: "workspace.json",
      mimeType: "application/json",
      parents: [folderId],
    });
    const body = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${meta}\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n${json}\r\n--${boundary}--`;
    const res = await drive(token, "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id", {
      method: "POST",
      headers: { "content-type": `multipart/related; boundary=${boundary}` },
      body,
    });
    const created = (await res.json()) as { id: string };
    return created.id;
  }
  await drive(token, `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: json,
  });
  return fileId;
}

export async function uploadFile(token: string, folderId: string, name: string, mime: string, data: Buffer) {
  const boundary = "todobeefile";
  const meta = JSON.stringify({ name, parents: [folderId] });
  const head = Buffer.from(
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${meta}\r\n--${boundary}\r\nContent-Type: ${mime}\r\n\r\n`,
  );
  const tail = Buffer.from(`\r\n--${boundary}--`);
  const res = await drive(token, "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id", {
    method: "POST",
    headers: { "content-type": `multipart/related; boundary=${boundary}` },
    body: Buffer.concat([head, data, tail]),
  });
  const json = (await res.json()) as { id: string };
  return json.id;
}

export async function downloadFile(token: string, fileId: string) {
  return drive(token, `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`);
}

export async function deleteFile(token: string, fileId: string) {
  await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
    method: "DELETE",
    headers: { authorization: `Bearer ${token}` },
  });
}

/** PocketBase holds the cache. The admin's Google Drive holds the durable copy. */
export async function syncDrive(workspace: PbWorkspace, state: AppState) {
  const token = await ownerToken(workspace.owner);
  if (!token) return { driveSynced: false as const, driveFolderId: workspace.driveFolderId, driveFileId: workspace.driveFileId };
  const driveFolderId = await ensureFolder(token, workspace.driveFolderId);
  const driveFileId = await writeWorkspaceFile(token, driveFolderId, workspace.driveFileId, state);
  await pb().collection("workspaces").update(workspace.id, { driveFolderId, driveFileId, driveSynced: true });
  return { driveSynced: true as const, driveFolderId, driveFileId };
}
