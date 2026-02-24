"use client";

export default function LoadingState({ text = "Chargement..." }: { text?: string }) {
  return <div className="p-8 text-center text-gray-500">{text}</div>;
}
