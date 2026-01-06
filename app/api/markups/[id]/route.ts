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
            try {
                const j = await dl.json();
                href = j.href || null;
            }
            catch (e) {}
        }
    }

    // If we have images stored on Yandex Disk inside /timecodes-images, replace local src paths in serialized editor content with download hrefs
    const timecodes = Array.isArray(doc.timecodes) ? JSON.parse(JSON.stringify(doc.timecodes)) : [];
    if (apiKey && timecodes.length > 0) {
        for (let i = 0; i < timecodes.length; i++) {
            const tc = timecodes[i];
            if (!tc || !tc.text) continue;
            try {
                const parsed = typeof tc.text === 'string' ? JSON.parse(tc.text) : tc.text;

                async function walk(node: any) {
                    if (!node) return;
                    if (Array.isArray(node)) return node.forEach(await walk);
                    if (typeof node !== 'object') return;
                    // image node detection
                    if (node.type === 'image') {
                        const src = node.src || node.attrs?.src || '';
                        if (typeof src === 'string' && (src.startsWith('/timecodes-images/') || src.startsWith('/uploads/') || src.startsWith('/timecodes/'))) {
                            // fetch download link
                            try {
                                // eslint-disable-next-line no-await-in-loop
                                const dl = await fetch(`https://cloud-api.yandex.net/v1/disk/resources/download?path=${encodeURIComponent(src)}`, { headers: { Authorization: `OAuth ${apiKey}` } });
                                if (dl.ok) {
                                    const j = await dl.json().catch(() => ({}));
                                    const dhref = j.href || null;
                                    if (dhref) node.src = dhref;
                                }
                            } catch (e) {
                                // ignore per-image errors
                            }
                        }
                    }
                    // recurse children
                    if (node.children && Array.isArray(node.children)) node.children.forEach(walk);
                }

                await walk(parsed.root ?? parsed);
                tc.text = JSON.stringify(parsed);
            } catch (e) {
                // ignore parse errors
            }
        }
    }

    return NextResponse.json({ _id: String(doc._id), title: doc.title, timecodes: timecodes || [], href });
}
