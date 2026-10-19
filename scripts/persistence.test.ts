import assert from "node:assert/strict";
import { test } from "node:test";
import { createPersistence, RESET_KEY, SAVE_KEY } from "../src/lib/persistence";

function memoryStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() { return values.size; },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => { values.delete(key); },
    setItem: (key, value) => { values.set(key, value); },
  };
}

test("reset removes the local career and deletes remotely without a new game", async () => {
  const storage = memoryStorage();
  storage.setItem(SAVE_KEY, "old career");
  const methods: string[] = [];
  const persistence = createPersistence(storage, async (_url, init) => {
    methods.push(init!.method!);
    return Response.json({ ok: true });
  });
  const deletion = persistence.reset();
  assert.equal(storage.getItem(SAVE_KEY), null);
  assert.equal(persistence.hasReset(), true);
  await deletion;
  assert.deepEqual(methods, ["DELETE"]);
  assert.equal(storage.getItem(RESET_KEY), "1");
});

test("an in-flight autosave completes before deletion; queued old saves are skipped", async () => {
  const storage = memoryStorage();
  const methods: string[] = [];
  let finish!: () => void;
  const pending = new Promise<void>((resolve) => { finish = resolve; });
  const persistence = createPersistence(storage, async (_url, init) => {
    methods.push(init!.method!);
    if (init!.method === "POST") await pending;
    return Response.json({ ok: true });
  });
  const first = persistence.save({ career: "old" });
  await Promise.resolve();
  const queued = persistence.save({ career: "old updated" });
  const deletion = persistence.reset();
  finish();
  await Promise.all([first, queued, deletion]);
  assert.deepEqual(methods, ["POST", "DELETE"]);
  assert.equal(storage.getItem(SAVE_KEY), null);
  assert.equal(persistence.hasReset(), true);
});

test("offline deletion remains marked across reload and can be retried", async () => {
  const storage = memoryStorage();
  const offline = createPersistence(storage, async () => { throw new Error("offline"); });
  await offline.reset();
  const methods: string[] = [];
  const reloaded = createPersistence(storage, async (_url, init) => {
    methods.push(init!.method!);
    return Response.json({ ok: true });
  });
  assert.equal(reloaded.hasReset(), true);
  await reloaded.reset();
  await reloaded.save({ career: "new" });
  assert.deepEqual(methods, ["DELETE", "POST"]);
  assert.equal(reloaded.hasReset(), false);
  assert.deepEqual(JSON.parse(storage.getItem(SAVE_KEY)!), { career: "new" });
});

test("failed replacement save does not clear reset protection", async () => {
  const storage = memoryStorage();
  const persistence = createPersistence(storage, async () => new Response(null, { status: 500 }));
  await persistence.reset();
  await persistence.save({ career: "new" });
  assert.equal(persistence.hasReset(), true);
});
