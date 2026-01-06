import { NextResponse } from "next/server";
import { getCollection } from "@/lib/mongodb";

export const runtime = "nodejs";

export async function PUT(req: Request, context: { params: any }) {
    const adminPass = req.headers.get("x-admin-password");
    if (!process.env.ADMIN_PASSWORD) return NextResponse.json({ error: "Server not configured" }, { status: 500 });
    if (adminPass !== process.env.ADMIN_PASSWORD) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const params = await context.params;
    const id = params.id;
    const body = await req.json().catch(() => ({}));
    const { title, timecodes } = body as any;
    if (!title && !timecodes) return NextResponse.json({ error: "missing" }, { status: 400 });

    const { ObjectId } = await import('mongodb');
    const coll = await getCollection("markups");
    const update: any = {};
    if (typeof title === 'string') update.title = title;
    if (Array.isArray(timecodes)) update.timecodes = timecodes;
    try {
        const r = await coll.updateOne({ _id: new ObjectId(id) }, { $set: update });
        if (r.matchedCount === 0) return NextResponse.json({ error: 'not found' }, { status: 404 });
        return NextResponse.json({ ok: true });
    } catch (e) {
        return NextResponse.json({ error: 'server' }, { status: 500 });
    }
}

export async function DELETE(req: Request, context: { params: any }) {
    const adminPass = req.headers.get("x-admin-password");
    if (!process.env.ADMIN_PASSWORD) return NextResponse.json({ error: "Server not configured" }, { status: 500 });
    if (adminPass !== process.env.ADMIN_PASSWORD) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const params = await context.params;
    const id = params.id;
    const { ObjectId } = await import('mongodb');
    const coll = await getCollection("markups");
    try {
        const r = await coll.deleteOne({ _id: new ObjectId(id) });
        if (r.deletedCount === 0) return NextResponse.json({ error: 'not found' }, { status: 404 });
        return NextResponse.json({ ok: true });
    } catch (e) {
        return NextResponse.json({ error: 'server' }, { status: 500 });
    }
}
