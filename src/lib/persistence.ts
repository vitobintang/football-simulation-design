export const SAVE_KEY = "pitch-lords-save-v7";
export const RESET_KEY = `${SAVE_KEY}-reset`;

// Serialize writes so an already-running autosave finishes BEFORE deletion.
// The durable reset marker also prevents fallback loads after closing the tab
// while deletion is pending (or while the database is unavailable).
export function createPersistence(storage: Storage, request: typeof fetch) {
  let writes = Promise.resolve();
  let generation = 0;

  function enqueue(work: () => Promise<void>) {
    writes = writes.then(work).catch(() => undefined);
    return writes;
  }

  return {
    hasReset() {
      return storage.getItem(RESET_KEY) !== null;
    },
    reset() {
      generation++;
      try {
        storage.setItem(RESET_KEY, "1");
      } catch { /* storage unavailable: still delete the database save */ }
      try {
        storage.removeItem(SAVE_KEY);
      } catch { /* storage unavailable */ }
      return enqueue(async () => {
        await request("/api/save", { method: "DELETE", keepalive: true });
        // Keep the marker until a NEW career is successfully saved. Even an
        // interrupted deletion must never make the old career load again.
      });
    },
    save(data: unknown) {
      try {
        storage.setItem(SAVE_KEY, JSON.stringify(data));
      } catch { /* storage full: still save to the database */ }
      const current = generation;
      return enqueue(async () => {
        if (current !== generation) return;
        const response = await request("/api/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data }),
        });
        if (response.ok && current === generation) storage.removeItem(RESET_KEY);
      });
    },
  };
}
