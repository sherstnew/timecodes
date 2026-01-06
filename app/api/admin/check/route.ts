import { NextResponse } from "next/server";

export async function POST(req: Request) {
    const body = await req.json().catch(() => ({}));
    const password = body?.password;
    if (!process.env.ADMIN_PASSWORD) return NextResponse.json({ error: "Server not configured" }, { status: 500 });
    if (password !== process.env.ADMIN_PASSWORD) return NextResponse.json({ ok: false }, { status: 401 });
    return NextResponse.json({ ok: true });
}
