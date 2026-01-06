import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

export const runtime = "nodejs";

export async function POST(req: Request) {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "missing file" }, { status: 400 });

    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    await fs.mkdir(uploadsDir, { recursive: true });

    const safeName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const outPath = path.join(uploadsDir, safeName);

    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(outPath, buffer);

    const href = `/uploads/${safeName}`;

    return NextResponse.json({ ok: true, href, path: href });
}
