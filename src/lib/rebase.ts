import type { AppState, Task } from "./types";

function same(a: unknown, b: unknown) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function mergeFiles(local: Task, remote: Task): Task["files"] {
  const localFiles = new Map((local.files ?? []).map((file) => [file.id, file]));
  const remoteFiles = new Map((remote.files ?? []).map((file) => [file.id, file]));
  const files = [];
  for (const id of new Set([...remoteFiles.keys(), ...localFiles.keys()])) {
    const left = localFiles.get(id);
    const right = remoteFiles.get(id);
    if (left && right) {
      const driveUrl = right.driveUrl || left.driveUrl;
      files.push(driveUrl ? { ...left, ...right, driveUrl, dataUrl: undefined } : { ...right, ...left });
    } else if (left || right) {
      const file = (left ?? right)!;
      files.push(file.driveUrl ? { ...file, dataUrl: undefined } : file);
    }
  }
  return files;
}

function mergeList<T extends { id: string }>(base: T[], local: T[], remote: T[], blend?: (local: T, remote: T) => T): T[] {
  const baseMap = new Map(base.map((item) => [item.id, item]));
  const localMap = new Map(local.map((item) => [item.id, item]));
  const remoteMap = new Map(remote.map((item) => [item.id, item]));
  const result: T[] = [];
  const seen = new Set<string>();

  const take = (id: string) => {
    if (seen.has(id)) return;
    seen.add(id);
    const before = baseMap.get(id);
    const mine = localMap.get(id);
    const theirs = remoteMap.get(id);
    if (!mine && !theirs) return;
    if (!before && mine && !theirs) return result.push(mine);
    if (!before && theirs && !mine) return result.push(theirs);
    if (!before && mine && theirs) return result.push(blend ? blend(mine, theirs) : mine);
    if (before && !mine && theirs) {
      if (!same(before, theirs)) result.push(theirs);
      return;
    }
    if (before && mine && !theirs) {
      if (!same(before, mine)) result.push(blend ? blend(mine, mine) : mine);
      return;
    }
    if (before && mine && theirs) {
      const localChanged = !same(before, mine);
      const remoteChanged = !same(before, theirs);
      const chosen = localChanged || !remoteChanged ? mine : theirs;
      result.push(blend ? blend(chosen, theirs) : chosen);
    }
  };

  for (const item of remote) take(item.id);
  for (const item of local) take(item.id);
  return result;
}

/** Keep both people's edits. A Drive link wins over a temporary file copy. */
export function rebaseWorkspace(base: AppState, local: AppState, remote: AppState): AppState {
  const notificationPrefs = { ...(remote.notificationPrefs ?? {}) };
  for (const [userId, value] of Object.entries(local.notificationPrefs ?? {})) {
    if (!same(base.notificationPrefs?.[userId], value)) notificationPrefs[userId] = value;
  }
  const name = local.workspace.name !== base.workspace.name ? local.workspace.name : remote.workspace.name;
  return {
    ...remote,
    currentUserId: local.currentUserId || remote.currentUserId,
    workspace: { ...remote.workspace, name },
    notificationPrefs,
    users: mergeList(base.users, local.users, remote.users),
    invites: mergeList(base.invites ?? [], local.invites ?? [], remote.invites ?? []),
    labels: mergeList(base.labels, local.labels, remote.labels),
    projects: mergeList(base.projects, local.projects, remote.projects),
    sections: mergeList(base.sections, local.sections, remote.sections),
    tasks: mergeList(base.tasks, local.tasks, remote.tasks, (chosen, theirs) => ({
      ...chosen,
      files: mergeFiles(chosen, theirs),
    })),
  };
}
