import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { analyticsEvents, webVitals } from "@/lib/db/schema";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      kind?: string;
      name?: string;
      path?: string;
      props?: Record<string, unknown>;
      value?: number;
      metric?: string;
    };

    if (body.kind === "vitals") {
      if (!body.metric || typeof body.value !== "number" || !Number.isFinite(body.value)) {
        return NextResponse.json({ ok: false }, { status: 400 });
      }
      await db.insert(webVitals).values({
        metric: body.metric.slice(0, 64),
        value: Math.round(body.value),
        path: body.path?.slice(0, 256) ?? null,
      });
      return NextResponse.json({ ok: true });
    }

    if (!body.name) return NextResponse.json({ ok: false }, { status: 400 });
    await db.insert(analyticsEvents).values({
      name: body.name.slice(0, 64),
      path: body.path?.slice(0, 256) ?? null,
      props: body.props ?? null,
    });
    return NextResponse.json({ ok: true });
  } catch {
    // Telemetry must never break a page. Fire-and-forget semantics.
    return NextResponse.json({ ok: false }, { status: 204 });
  }
}
