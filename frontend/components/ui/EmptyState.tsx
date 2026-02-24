"use client";

export default function EmptyState({ message }: { message: string }) {
  return <div className="p-8 text-center text-gray-500">{message}</div>;
}
