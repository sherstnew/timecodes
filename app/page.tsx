"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type MarkupItem = { _id: string; title?: string };

export default function Home() {
  const [items, setItems] = useState<MarkupItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    fetch("/api/markups")
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load");
        return r.json();
      })
      .then((j) => {
        if (!mounted) return;
        setItems(j || []);
      })
      .catch((e) => {
        if (!mounted) return;
        setError(String(e));
      });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <main className="w-full h-full p-5">
      <h1 className="text-2xl font-medium mb-4">Разметки</h1>
      {error && <div className="text-red-600 mb-3">Ошибка: {error}</div>}
      {items === null ? (
        <div>Загрузка...</div>
      ) : (
        <div className="space-y-3">
          {items.map((it) => (
            <Link key={String(it._id)} href={`/player?id=${String(it._id)}`} className="block p-3 border rounded hover:bg-gray-50">
              {it.title || String(it._id)}
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
