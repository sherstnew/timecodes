"use client";

import React from "react";

export function Toolbar({ onImage }: { onImage?: (file: File) => void }) {
  return (
    <div className="flex gap-2 items-center border-b px-3 py-2 bg-muted">
      <button
        type="button"
        onClick={() => document.execCommand("bold")}
        className="px-2 py-1 rounded hover:bg-gray-200"
      >
        B
      </button>
      <button
        type="button"
        onClick={() => document.execCommand("italic")}
        className="px-2 py-1 rounded hover:bg-gray-200"
      >
        I
      </button>
      <button
        type="button"
        onClick={() => document.execCommand("insertUnorderedList")}
        className="px-2 py-1 rounded hover:bg-gray-200"
      >
        • list
      </button>
      <label className="ml-2 text-sm">
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f && onImage) onImage(f);
            e.currentTarget.value = "";
          }}
        />
        <span className="px-2 py-1 rounded hover:bg-gray-200 cursor-pointer">Image</span>
      </label>
    </div>
  );
}
