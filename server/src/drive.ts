import { ownerToken } from "./google.js";
import type { PbWorkspace } from "./pb.js";
import type { AppState } from "./demo/types.js";

export const DRIVE_FULL_MESSAGE =
  "Google Drive is full, so this workspace couldn't sync. Free up space in Drive and we'll try again. Projects and tasks already here were kept, including anything you restored.";

export class DriveQuotaError extends Error {
  readonly status: number;
  constructor(status: number, detail: string) {
    super(`Google Drive quota reached (${status}): ${detail}`);
    this.name = "DriveQuotaError";
    this.status = status;
  }
}

export function isDriveQuotaError(error: unknown): error is DriveQuotaError {
  return error instanceof DriveQuotaError;
}

function checkQuotaFailure(status: number, text: string) {
  if (
    status === 507 ||
    status === 429 ||
    ((status === 403 || status === 400) &&
      /quota|storageQuotaExceeded|insufficientStorage|rateLimitExceeded|userRateLimitExceeded|dailyLimitExceeded|sharingRateLimitExceeded|rate limit/i.test(
        text,
      ))
  ) {
    throw new DriveQuotaError(status, text.slice(0, 280));
  }
}

async function drive(token: string, url: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("authorization", `Bearer ${token}`);
  const res = await fetch(url, { ...init, headers });
  if (!res.ok) {
    const text = await res.text();
    checkQuotaFailure(res.status, text);
    throw new Error(`Google Drive ${res.status}: ${text.slice(0, 280)}`);
  }
  return res;
}

const FOLDER = "application/vnd.google-apps.folder";

function driveQuery(value: string) {
  return `'${value.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`;
}

async function findFile(token: string, query: string) {
  const url = new URL("https://www.googleapis.com/drive/v3/files");
  url.searchParams.set("q", query);
  url.searchParams.set("fields", "files(id)");
  url.searchParams.set("pageSize", "1");
  url.searchParams.set("spaces", "drive");
  const res = await drive(token, url.toString());
  const json = (await res.json()) as { files?: { id: string }[] };
  return json.files?.[0]?.id;
}

async function folderAlive(token: string, id: string) {
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${id}?fields=id,trashed,mimeType`, {
    headers: { authorization: `Bearer ${token}` },
  });
  if (res.ok) {
    const data = (await res.json()) as { trashed?: boolean; id?: string; mimeType?: string };
    return Boolean(data.id && !data.trashed && data.mimeType === FOLDER);
  }
  if (res.status === 404) return false;
  const text = await res.text();
  checkQuotaFailure(res.status, text);
  throw new Error(`Google Drive ${res.status}: ${text.slice(0, 280)}`);
}

/** Reuse the Todobee folder at the Drive root. Create it only when that folder is not there. */
export async function ensureFolder(token: string, existing?: string) {
  const found = await findFile(
    token,
    `name=${driveQuery("Todobee")} and mimeType='${FOLDER}' and 'root' in parents and trashed=false`,
  );
  if (found) return found;
  if (existing && (await folderAlive(token, existing))) return existing;
  const created = await drive(token, "https://www.googleapis.com/drive/v3/files?fields=id", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "Todobee", mimeType: FOLDER, parents: ["root"] }),
  });
  const json = (await created.json()) as { id: string };
  return json.id;
}

export function workspaceFileName(workspaceName?: string): string {
  const clean = (workspaceName || "workspace")
    .trim()
    .replace(/[/\\?%*:|"<>]/g, "-")
    .slice(0, 100);
  return `${clean || "workspace"}.json`;
}

/** The Drive file keeps the boards only. People, billing and settings stay in Todobee. */
function toDriveBoard(state: AppState) {
  return {
    projects: state.projects ?? [],
    sections: state.sections ?? [],
    tasks: state.tasks ?? [],
  };
}

export async function writeWorkspaceFile(
  token: string,
  folderId: string,
  fileId: string | undefined,
  state: AppState,
) {
  const fileName = workspaceFileName(state.workspace?.name);
  const json = JSON.stringify(toDriveBoard(state));
  const boundary = "todobeejson";

  if (!fileId) {
    const meta = JSON.stringify({
      name: fileName,
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

  const meta = JSON.stringify({ name: fileName });
  const body = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${meta}\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n${json}\r\n--${boundary}--`;
  await drive(token, `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`, {
    method: "PATCH",
    headers: { "content-type": `multipart/related; boundary=${boundary}` },
    body,
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
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
    method: "DELETE",
    headers: { authorization: `Bearer ${token}` },
  });
  if (!res.ok && res.status !== 404) {
    const text = await res.text();
    checkQuotaFailure(res.status, text);
    throw new Error(`Google Drive ${res.status}: ${text.slice(0, 280)}`);
  }
}

export function missingDriveFile(error: unknown) {
  return error instanceof Error && error.message.startsWith("Google Drive 404");
}

/** Upload one workspace cache to that workspace admin's Drive. Does not mark it synced. */
export async function syncDrive(workspace: PbWorkspace, state: AppState, tokenOverride?: string) {
  const token = tokenOverride || (await ownerToken(workspace.owner));
  if (!token) {
    return { ok: false as const, driveFolderId: workspace.driveFolderId, driveFileId: workspace.driveFileId };
  }
  let driveFolderId = await ensureFolder(token, workspace.driveFolderId || undefined);
  let driveFileId = workspace.driveFolderId === driveFolderId ? workspace.driveFileId : undefined;
  if (!driveFileId) {
    driveFileId = await findFile(
      token,
      `name=${driveQuery(workspaceFileName(state.workspace?.name))} and '${driveFolderId}' in parents and trashed=false`,
    );
  }
  try {
    driveFileId = await writeWorkspaceFile(token, driveFolderId, driveFileId, state);
  } catch (error) {
    if (!missingDriveFile(error)) throw error;
    driveFileId = await writeWorkspaceFile(token, driveFolderId, undefined, state);
  }
  return { ok: true as const, driveFolderId, driveFileId, state };
}
