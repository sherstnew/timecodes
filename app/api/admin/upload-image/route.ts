import { NextResponse } from "next/server";
import { fetch, Agent } from "undici";

export const runtime = "nodejs";

// Shared undici agent for Yandex.Disk requests (images/videos)
const yandexAgent = new Agent({ headersTimeout: 0, bodyTimeout: 0, connectTimeout: 60_000 });

// Upload images to Yandex.Disk into a separate folder, e.g. /timecodes-images/
export async function POST(req: Request) {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "missing file" }, { status: 400 });

    const apiKey = process.env.YANDEX_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "yandex not configured" }, { status: 500 });

    const rawName = file.name || "image";
    const safeName = `${Date.now()}-${rawName.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const pathOnDisk = `/timecodes-images/${safeName}`;

    // Request upload href
    const uploadUrlRes = await fetch(
        `https://cloud-api.yandex.net/v1/disk/resources/upload?path=${encodeURIComponent(pathOnDisk)}&overwrite=false`,
        { headers: { Authorization: `OAuth ${apiKey}` }, dispatcher: yandexAgent }
    );
    if (!uploadUrlRes.ok) return NextResponse.json({ error: "yandex upload url failed" }, { status: 502 });

    const uploadJson: any = await uploadUrlRes.json().catch(() => ({} as any));
    const href = uploadJson.href;
    if (!href) return NextResponse.json({ error: "no upload href" }, { status: 502 });

    const arrayBuffer = await file.arrayBuffer();
    const putRes = await fetch(href, { method: "PUT", body: arrayBuffer, dispatcher: yandexAgent });
    if (!putRes.ok) return NextResponse.json({ error: "upload failed" }, { status: 502 });

    // try to publish so it's accessible (best-effort)
    await fetch(`https://cloud-api.yandex.net/v1/disk/resources/publish?path=${encodeURIComponent(pathOnDisk)}`, {
        method: "PUT",
        headers: { Authorization: `OAuth ${apiKey}` },
        dispatcher: yandexAgent,
    }).catch(() => {});

    // Return only the path on disk. Clients should store this path in DB.
    // Also try to resolve a download href so editor can preview the image directly from Yandex.Disk
    try {
        const dl = await fetch(`https://cloud-api.yandex.net/v1/disk/resources/download?path=${encodeURIComponent(pathOnDisk)}`, { headers: { Authorization: `OAuth ${apiKey}` }, dispatcher: yandexAgent });
        if (dl.ok) {
            const j: any = await dl.json().catch(() => ({}));
            const dhref = j.href || null;
            return NextResponse.json({ ok: true, path: pathOnDisk, href: dhref });
        }
    } catch (e) {
        // ignore
    }

    return NextResponse.json({ ok: true, path: pathOnDisk });
}
