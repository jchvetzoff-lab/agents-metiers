'use client';

export default function BackgroundOrbs() {
  return (
    <div
      className="fixed inset-0 pointer-events-none overflow-hidden"
      style={{ zIndex: 1 }}
    >
      {/* Purple orb - top right */}
      <div
        className="absolute animate-pulse"
        style={{
          top: '15%',
          right: '-50px',
          width: '300px',
          height: '300px',
          background: 'radial-gradient(circle, rgba(74,57,192,0.4) 0%, transparent 70%)',
          filter: 'blur(60px)',
          animationDuration: '4s',
        }}
      />

      {/* Violet orb - left side */}
      <div
        className="absolute animate-pulse"
        style={{
          top: '40%',
          left: '-80px',
          width: '280px',
          height: '280px',
          background: 'radial-gradient(circle, rgba(139,92,246,0.35) 0%, transparent 70%)',
          filter: 'blur(50px)',
          animationDuration: '5s',
          animationDelay: '1s',
        }}
      />

      {/* Pink orb - bottom right */}
      <div
        className="absolute animate-pulse"
        style={{
          bottom: '10%',
          right: '5%',
          width: '200px',
          height: '200px',
          background: 'radial-gradient(circle, rgba(255,50,84,0.3) 0%, transparent 70%)',
          filter: 'blur(40px)',
          animationDuration: '3s',
          animationDelay: '0.5s',
        }}
      />

      {/* Small purple orb - top left */}
      <div
        className="absolute animate-pulse"
        style={{
          top: '25%',
          left: '10%',
          width: '150px',
          height: '150px',
          background: 'radial-gradient(circle, rgba(74,57,192,0.25) 0%, transparent 70%)',
          filter: 'blur(35px)',
          animationDuration: '6s',
          animationDelay: '2s',
        }}
      />
    </div>
  );
}
