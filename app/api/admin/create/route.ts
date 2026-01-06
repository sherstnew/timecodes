import { NextResponse } from "next/server";
import { getCollection } from "@/lib/mongodb";
import crypto from "crypto";

export const runtime = "nodejs";

export async function POST(req: Request) {
    const adminPass = req.headers.get("x-admin-password");
    if (!process.env.ADMIN_PASSWORD) return NextResponse.json({ error: "Server not configured" }, { status: 500 });
    if (adminPass !== process.env.ADMIN_PASSWORD) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const form = await req.formData();
    const file = form.get("file") as File | null;
    const metadataRaw = form.get("metadata") as string | null;

    if (!file || !metadataRaw) return NextResponse.json({ error: "missing" }, { status: 400 });

    const metadata = JSON.parse(metadataRaw as string);

    const rawName = file.name || "video";
    const extMatch = rawName.match(/\.([a-zA-Z0-9]+)$/);
    const ext = extMatch ? extMatch[1] : "mp4";
    const unique = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}`;
    const safeName = `${unique}.${ext}`;
    const path = `/timecodes/${safeName}`;

    const apiKey = process.env.YANDEX_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "yandex not configured" }, { status: 500 });

    const uploadUrlRes = await fetch(
        `https://cloud-api.yandex.net/v1/disk/resources/upload?path=${encodeURIComponent(path)}&overwrite=false`,
        { headers: { Authorization: `OAuth ${apiKey}` } }
    );
    console.log(uploadUrlRes);
    if (!uploadUrlRes.ok) return NextResponse.json({ error: "yandex upload url failed" }, { status: 502 });

    const uploadJson = await uploadUrlRes.json();
    const href = uploadJson.href;
    if (!href) return NextResponse.json({ error: "no upload href" }, { status: 502 });

    const arrayBuffer = await file.arrayBuffer();
    const putRes = await fetch(href, { method: "PUT", body: arrayBuffer });
    if (!putRes.ok) return NextResponse.json({ error: "upload failed" }, { status: 502 });

    // attempt to publish so it can be accessed
    await fetch(`https://cloud-api.yandex.net/v1/disk/resources/publish?path=${encodeURIComponent(path)}`, {
        method: "PUT",
        headers: { Authorization: `OAuth ${apiKey}` },
    }).catch(() => {});

    const coll = await getCollection("markups");
    const doc = {
        title: metadata.title || file.name,
        videoPath: path,
        timecodes: metadata.timecodes || [],
        createdAt: new Date().toISOString(),
    };
    await coll.insertOne(doc as any);

    return NextResponse.json({ ok: true, path });
}
