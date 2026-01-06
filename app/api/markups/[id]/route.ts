import { NextResponse } from "next/server";
import { getCollection } from "@/lib/mongodb";

export const runtime = "nodejs";

export async function GET(req: Request, context: { params: any }) {
    const params = await context.params;
    const id = params.id;
    const coll = await getCollection("markups");
    const { ObjectId } = await import('mongodb');
    const doc = await coll.findOne({ _id: new ObjectId(id) });
    if (!doc) return NextResponse.json({ error: 'not found' }, { status: 404 });

    const apiKey = process.env.YANDEX_API_KEY;
    let href = null;
    if (apiKey && doc.videoPath) {
        const dl = await fetch(`https://cloud-api.yandex.net/v1/disk/resources/download?path=${encodeURIComponent(doc.videoPath)}`, { headers: { Authorization: `OAuth ${apiKey}` } });
        if (dl.ok) {
            const j = await dl.json().catch(() => ({}));
            href = j.href || null;
        }
    }

    return NextResponse.json({ _id: String(doc._id), title: doc.title, timecodes: doc.timecodes || [], href });
}
