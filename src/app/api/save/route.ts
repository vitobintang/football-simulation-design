import { db } from "@/db";
import { saves } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const rows = await db.select().from(saves).where(eq(saves.slot, 1)).limit(1);
    return Response.json({ data: rows[0]?.data ?? null });
  } catch {
    return Response.json({ data: null }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { data: unknown };
    if (!body?.data || typeof body.data !== "object") {
      return Response.json({ ok: false }, { status: 400 });
    }
    const rows = await db.select({ id: saves.id }).from(saves).where(eq(saves.slot, 1)).limit(1);
    if (rows[0]) {
      await db.update(saves).set({ data: body.data, updatedAt: new Date() }).where(eq(saves.slot, 1));
    } else {
      await db.insert(saves).values({ slot: 1, data: body.data });
    }
    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: false }, { status: 500 });
  }
}

// Delete the save itself, rather than waiting for a replacement career.
export async function DELETE() {
  try {
    await db.delete(saves).where(eq(saves.slot, 1));
    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: false }, { status: 500 });
  }
}
