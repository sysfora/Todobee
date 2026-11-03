import { deleteFile, ensureFolder, isDriveQuotaError, syncDrive, uploadFile } from "./drive.js";
import { env } from "./env.js";
import { accessTokenFor } from "./google.js";
import { pb, type PbUser, type PbWorkspace } from "./pb.js";
import type { AppState } from "./demo/types.js";

let timer: ReturnType<typeof setTimeout> | null = null;
let stopped = true;
let running: Promise<{ synced: number; operations: number; quotaReached: boolean }> | null = null;

function ids(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.length > 0);
}

function applyUploadedFiles(state: AppState, uploadedUrls: Map<string, string>): AppState {
  if (uploadedUrls.size === 0) return state;
  return {
    ...state,
    tasks: (state.tasks ?? []).map((task) => ({
      ...task,
      files: (task.files ?? []).map((file) => {
        const driveUrl = uploadedUrls.get(file.id) || file.driveUrl;
        if (!driveUrl) return file;
        return { ...file, driveUrl, dataUrl: undefined };
      }),
    })),
  };
}

function hasPendingFileUploads(state: AppState | undefined) {
  if (!state?.tasks) return false;
  return state.tasks.some((task) => (task.files ?? []).some((file) => Boolean(file.dataUrl && !file.driveUrl)));
}

async function flushWorkspace(workspace: PbWorkspace): Promise<{ synced: boolean; operations: number }> {
  if (!workspace.cache) return { synced: false, operations: 0 };
  let operations = 0;
  const revision = workspace.cacheRevision ?? 0;

  const owner = await pb().collection("users").getOne<PbUser>(workspace.owner);
  const token = await accessTokenFor(owner);
  if (!token) return { synced: false, operations: 0 };

  let driveFolderId = workspace.driveFolderId || "";
  let currentCache = workspace.cache;
  const uploadedUrls = new Map<string, string>();

  // 1. Upload any pending task files cached as dataUrl in PocketBase one by one
  if (hasPendingFileUploads(currentCache)) {
    const ensuredFolder = await ensureFolder(token, driveFolderId || undefined);
    operations += 1;
    if (ensuredFolder !== driveFolderId) {
      driveFolderId = ensuredFolder;
      await pb().collection("workspaces").update(workspace.id, { driveFolderId });
    }

    for (const task of currentCache.tasks ?? []) {
      for (const file of task.files ?? []) {
        if (!file.dataUrl || file.driveUrl) continue;
        const match = file.dataUrl.match(/^data:([^;]+);base64,([A-Za-z0-9+/=]+)$/);
        if (!match) continue;
        const data = Buffer.from(match[2], "base64");
        if (data.length > 8_000_000) continue;
        const driveId = await uploadFile(
          token,
          driveFolderId,
          file.name.slice(0, 180),
          file.mimeType || match[1],
          data,
        );
        operations += 1;
        uploadedUrls.set(file.id, `/api/files/${driveId}`);

        // Persist progress to PocketBase cache after each file so quota limits never lose progress
        const latest = await pb().collection("workspaces").getOne<PbWorkspace>(workspace.id);
        currentCache = applyUploadedFiles(latest.cache || currentCache, uploadedUrls);
        await pb().collection("workspaces").update(workspace.id, {
          driveFolderId,
          cache: currentCache,
        });
      }
    }
  }

  // 2. Delete removed files from Google Drive one by one, updating PocketBase cache as we go
  const pending = ids(workspace.pendingDriveDeletes);
  const deleted = new Set<string>();
  for (const fileId of pending) {
    await deleteFile(token, fileId);
    operations += 1;
    deleted.add(fileId);
    const latest = await pb().collection("workspaces").getOne<PbWorkspace>(workspace.id);
    const remainingDeletes = ids(latest.pendingDriveDeletes).filter((id) => !deleted.has(id));
    await pb().collection("workspaces").update(workspace.id, {
      pendingDriveDeletes: remainingDeletes,
    });
  }

  // 3. Sync workspace.json to Google Drive
  const uploaded = await syncDrive(
    { ...workspace, driveFolderId: driveFolderId || workspace.driveFolderId },
    currentCache,
    token,
  );
  operations += 1;
  if (!uploaded.ok || !uploaded.driveFileId) return { synced: false, operations };

  const fresh = await pb().collection("workspaces").getOne<PbWorkspace>(workspace.id);
  const mergedCache = applyUploadedFiles(fresh.cache || currentCache, uploadedUrls);
  const remaining = ids(fresh.pendingDriveDeletes).filter((id) => !deleted.has(id));
  const stillCurrent =
    (fresh.cacheRevision ?? 0) === revision &&
    remaining.length === 0 &&
    !hasPendingFileUploads(mergedCache);

  await pb().collection("workspaces").update(workspace.id, {
    driveFolderId: uploaded.driveFolderId,
    driveFileId: uploaded.driveFileId,
    cache: mergedCache,
    pendingDriveDeletes: stillCurrent ? [] : remaining,
    ...(stillCurrent ? { driveSynced: true } : {}),
  });
  return { synced: stillCurrent, operations };
}

async function flushAll() {
  let synced = 0;
  let operations = 0;
  let quotaReached = false;
  let rows: PbWorkspace[] = [];
  try {
    rows = await pb().collection("workspaces").getFullList<PbWorkspace>({ filter: "driveSynced != true" });
  } catch (error) {
    console.error("Could not list unsynced workspace caches", error);
    return { synced, operations, quotaReached };
  }
  for (const workspace of rows) {
    if (!workspace.cache || workspace.driveSynced) continue;
    try {
      const result = await flushWorkspace(workspace);
      operations += result.operations;
      if (result.synced) synced += 1;
    } catch (error) {
      if (isDriveQuotaError(error)) {
        quotaReached = true;
        console.warn(
          `Google Drive quota reached for workspace ${workspace.id}. Remaining changes stay cached in PocketBase; waiting ${Math.round(env.driveSyncIntervalMs() / 1000)}s before retrying.`,
        );
        break;
      }
      console.error(`Drive sync failed for workspace ${workspace.id}`, error);
    }
  }
  if (synced) {
    console.log(`Google Drive sync stored ${synced} workspace cache${synced === 1 ? "" : "s"} (${operations} ops).`);
  }
  return { synced, operations, quotaReached };
}

/** Copy every unsynced PocketBase workspace cache to its own admin Drive until done or quota is reached. */
export function syncPendingWorkspaces() {
  if (running) return running;
  running = flushAll().finally(() => {
    running = null;
  });
  return running;
}

function scheduleNextRun() {
  if (stopped) return;
  const interval = env.driveSyncIntervalMs();
  timer = setTimeout(async () => {
    timer = null;
    if (stopped) return;
    await syncPendingWorkspaces();
    scheduleNextRun();
  }, interval);
}

export function startDriveSync() {
  if (!stopped) return;
  stopped = false;
  const interval = env.driveSyncIntervalMs();
  console.log(
    `Google Drive sync loop active: running every ${Math.round(interval / 1000)}s until synced or quota reached (cached in PocketBase).`,
  );
  void syncPendingWorkspaces().finally(() => {
    scheduleNextRun();
  });
}

export function stopDriveSync() {
  stopped = true;
  if (!timer) return;
  clearTimeout(timer);
  timer = null;
}
