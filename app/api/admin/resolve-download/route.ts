import { NextResponse } from "next/server";
import { fetch, Agent } from "undici";

export const runtime = "nodejs";
const yandexAgent = new Agent({ headersTimeout: 0, bodyTimeout: 0, connectTimeout: 60_000 });

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({} as any));
  const path = body?.path;
  if (!path) return NextResponse.json({ error: "missing path" }, { status: 400 });

  const apiKey = process.env.YANDEX_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "yandex not configured" }, { status: 500 });

  try {
    const dl = await fetch(
      `https://cloud-api.yandex.net/v1/disk/resources/download?path=${encodeURIComponent(path)}`,
      { headers: { Authorization: `OAuth ${apiKey}` }, dispatcher: yandexAgent }
    );
    if (!dl.ok) return NextResponse.json({ error: "no download link" }, { status: 502 });
    const j: any = await dl.json().catch(() => ({}));
    const href = j.href || null;
    return NextResponse.json({ ok: true, href });
  } catch (e) {
    return NextResponse.json({ error: "failed" }, { status: 502 });
  }
}
