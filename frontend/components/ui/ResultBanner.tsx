"use client";

interface ResultBannerProps {
  code: string;
  type: "success" | "error";
  message: string;
}

export default function ResultBanner({ code, type, message }: ResultBannerProps) {
  return (
    <div
      className={`p-3 rounded-lg text-sm ${
        type === "success"
          ? "bg-green-500/10 text-green-300 border border-green-500/20"
          : "bg-red-500/10 text-red-300 border border-red-500/20"
      }`}
    >
      <strong>{code}</strong> : {message}
    </div>
  );
}
