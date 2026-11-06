const tails = new Map<string, Promise<void>>();

/** Run workspace saves and Drive flushes one at a time so they cannot overwrite each other. */
export function withWorkspaceLock<T>(id: string, run: () => Promise<T>): Promise<T> {
  const previous = tails.get(id) ?? Promise.resolve();
  let release = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const tail = previous.then(() => gate);
  tails.set(id, tail);
  return previous.then(async () => {
    try {
      return await run();
    } finally {
      release();
      if (tails.get(id) === tail) tails.delete(id);
    }
  });
}
