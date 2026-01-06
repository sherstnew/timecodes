import Link from "next/link";
import { getCollection } from "@/lib/mongodb";

export default async function Home() {
  const coll = await getCollection("markups");
  const items = await coll.find().project({ title: 1 }).toArray();

  console.log(items);

  return (
    <main className="w-full h-full p-5">
      <h1 className="text-2xl font-medium mb-4">Разметки</h1>
      <div className="space-y-3">
        {items.map((it: any) => (
          <Link key={String(it._id)} href={`/player?id=${String(it._id)}`} className="block p-3 border rounded hover:bg-gray-50">
            {it.title || String(it._id)}
          </Link>
        ))}
      </div>
    </main>
  );
}
