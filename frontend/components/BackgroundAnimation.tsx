"use client";

export default function BackgroundAnimation() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {/* Zone violette - Haut gauche */}
      <div
        className="absolute -top-20 -left-20 w-[550px] h-[550px] opacity-20 blur-[100px]"
        style={{
          background: 'linear-gradient(135deg, #4A39C0 0%, #FF3254 100%)',
          animation: 'drift1 8s ease-in-out infinite',
        }}
      />

      {/* Zone rose - Bas droite */}
      <div
        className="absolute -bottom-20 -right-20 w-[600px] h-[600px] opacity-20 blur-[100px]"
        style={{
          background: 'linear-gradient(225deg, #FF3254 0%, #4A39C0 100%)',
          animation: 'drift2 10s ease-in-out infinite',
          animationDelay: '2s',
        }}
      />

      {/* Zone centrale */}
      <div
        className="absolute top-1/4 left-1/4 w-[500px] h-[500px] opacity-15 blur-[120px]"
        style={{
          background: 'radial-gradient(circle, #4A39C0 0%, #FF3254 50%, transparent 100%)',
          animation: 'drift3 12s ease-in-out infinite',
          animationDelay: '4s',
        }}
      />
    </div>
  );
}
