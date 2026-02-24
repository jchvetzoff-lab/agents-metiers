"use client";

export default function BackgroundAnimation() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {/* Indigo orb - Top left */}
      <div
        className="absolute -top-20 -left-20 w-[550px] h-[550px] opacity-[0.07] blur-[100px]"
        style={{
          background: 'linear-gradient(135deg, #4F46E5 0%, #06B6D4 100%)',
          animation: 'drift1 12s ease-in-out infinite',
        }}
      />

      {/* Cyan orb - Bottom right */}
      <div
        className="absolute -bottom-20 -right-20 w-[600px] h-[600px] opacity-[0.07] blur-[100px]"
        style={{
          background: 'linear-gradient(225deg, #06B6D4 0%, #4F46E5 100%)',
          animation: 'drift2 16s ease-in-out infinite',
          animationDelay: '2s',
        }}
      />

      {/* Purple orb - Center */}
      <div
        className="absolute top-1/4 left-1/4 w-[500px] h-[500px] opacity-[0.05] blur-[120px]"
        style={{
          background: 'radial-gradient(circle, #7C3AED 0%, #EC4899 50%, transparent 100%)',
          animation: 'drift3 20s ease-in-out infinite',
          animationDelay: '4s',
        }}
      />
    </div>
  );
}
