import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { analyticsEvents, rateLimits, webVitals } from "@/lib/db/schema";

export const runtime = "nodejs";

const ALLOWED_NAMES = new Set(["page.view", "link.click", "protocol.open", "console.open"]);
const ALLOWED_METRICS = new Set(["LCP", "INP", "CLS", "FCP", "TTFB"]);
const MAX_PROPS_BYTES = 2048;

async function allow(): Promise<boolean> {
  const bucket = Math.floor(Date.now() / 60_000);
  const rows = await db
    .insert(rateLimits)
    .values({ key: `telemetry:${bucket}`, count: 1 })
    .onConflictDoUpdate({
      target: rateLimits.key,
      set: { count: sql`${rateLimits.count} + 1`, updatedAt: new Date() },
    })
    .returning({ count: rateLimits.count });
  return (rows[0]?.count ?? 1) <= 300;
}

export async function POST(request: Request) {
  try {
    if (!(await allow())) return NextResponse.json({ ok: false }, { status: 429 });

    const raw = await request.text();
    if (raw.length > 8192) return NextResponse.json({ ok: false }, { status: 413 });
    const body = JSON.parse(raw) as {
      kind?: string;
      name?: string;
      path?: string;
      props?: Record<string, unknown>;
      value?: number;
      metric?: string;
    };

    if (body.kind === "vitals") {
      if (
        !body.metric ||
        !ALLOWED_METRICS.has(body.metric) ||
        typeof body.value !== "number" ||
        !Number.isFinite(body.value) ||
        body.value < 0 ||
        body.value > 120_000
      ) {
        return NextResponse.json({ ok: false }, { status: 400 });
      }
      await db.insert(webVitals).values({
        metric: body.metric.slice(0, 16),
        value: Math.round(body.value),
        path: body.path?.slice(0, 128) ?? null,
      });
      return NextResponse.json({ ok: true });
    }

    if (!body.name || !ALLOWED_NAMES.has(body.name)) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }
    const props = body.props ?? null;
    if (props && JSON.stringify(props).length > MAX_PROPS_BYTES) {
      return NextResponse.json({ ok: false }, { status: 413 });
    }

    await db.insert(analyticsEvents).values({
      name: body.name.slice(0, 32),
      path: body.path?.slice(0, 128) ?? null,
      props,
    });
    return NextResponse.json({ ok: true });
  } catch {
    // Telemetry must never break a page.
    return NextResponse.json({ ok: false }, { status: 204 });
  }
}
