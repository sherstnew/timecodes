import { NextResponse } from "next/server";
import { getCollection } from "@/lib/mongodb";

export async function GET() {
    const coll = await getCollection("markups");
    const items = await coll.find().project({ title: 1 }).toArray();
    const res = items.map((it: any) => ({ _id: String(it._id), title: it.title }));
    return NextResponse.json(res);
}
