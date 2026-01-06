import { NextResponse } from "next/server";

export const runtime = "nodejs";

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
        { headers: { Authorization: `OAuth ${apiKey}` } }
    );
    if (!uploadUrlRes.ok) return NextResponse.json({ error: "yandex upload url failed" }, { status: 502 });

    const uploadJson = await uploadUrlRes.json().catch(() => ({} as any));
    const href = uploadJson.href;
    if (!href) return NextResponse.json({ error: "no upload href" }, { status: 502 });

    const arrayBuffer = await file.arrayBuffer();
    const putRes = await fetch(href, { method: "PUT", body: arrayBuffer });
    if (!putRes.ok) return NextResponse.json({ error: "upload failed" }, { status: 502 });

    // try to publish so it's accessible (best-effort)
    await fetch(`https://cloud-api.yandex.net/v1/disk/resources/publish?path=${encodeURIComponent(pathOnDisk)}`, {
        method: "PUT",
        headers: { Authorization: `OAuth ${apiKey}` },
    }).catch(() => {});

    // Get a temporary download href to return to client
    let downloadHref: string | null = null;
    try {
        const dl = await fetch(`https://cloud-api.yandex.net/v1/disk/resources/download?path=${encodeURIComponent(pathOnDisk)}`, {
            headers: { Authorization: `OAuth ${apiKey}` },
        });
        if (dl.ok) {
            const j = await dl.json().catch(() => ({} as any));
            downloadHref = j.href || null;
        }
    } catch (e) {
        // ignore
    }

    return NextResponse.json({ ok: true, href: downloadHref, path: pathOnDisk });
}
