/**
 * Static illustrated valley — shown while the 3D scene loads, and as the
 * permanent hero on devices without WebGL or with reduced-motion enabled.
 */
export function HeroFallbackArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" className={className} aria-hidden>
      <defs>
        <linearGradient id="hf-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#a9c3d4" />
          <stop offset="0.55" stopColor="#dfe5e2" />
          <stop offset="1" stopColor="#ebe6da" />
        </linearGradient>
        <radialGradient id="hf-sun" cx="0.72" cy="0.22" r="0.25">
          <stop offset="0" stopColor="#fff3d6" stopOpacity="0.95" />
          <stop offset="1" stopColor="#fff3d6" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="hf-mist" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ebe6da" stopOpacity="0" />
          <stop offset="1" stopColor="#ebe6da" stopOpacity="0.9" />
        </linearGradient>
      </defs>
      <rect width="1440" height="900" fill="url(#hf-sky)" />
      <rect width="1440" height="900" fill="url(#hf-sun)" />
      {/* Far snow peaks */}
      <path d="M0 470 140 330 230 400 380 230 500 360 610 270 760 410 900 210 1030 350 1150 260 1300 380 1440 300V900H0Z" fill="#9cabb8" />
      <path d="m380 230 -46 62 26-8 20 18 30-28 34 8Zm520-20-52 70 30-10 22 20 28-30 40 12Zm-290 60-36 46 22-6 18 14 22-20 30 6Zm540-10-34 50 20-6 16 12 24-22 26 8Z" fill="#f6f5f1" />
      <path d="M0 540 120 430 260 500 400 380 560 480 700 400 860 500 1010 390 1180 480 1320 420 1440 470V900H0Z" fill="#7d8fa0" />
      <rect y="420" width="1440" height="260" fill="url(#hf-mist)" />
      {/* Forested valley walls */}
      <path d="M0 620 160 520 300 590 440 500 560 600 650 640 V900H0Z" fill="#3f6b44" />
      <path d="M1440 600 1290 510 1150 580 1000 490 880 600 790 650 V900H1440Z" fill="#335c3b" />
      <path d="M0 700 180 610 340 690 520 640 640 700 720 720 800 700 940 640 1110 700 1280 620 1440 690V900H0Z" fill="#2c5236" />
      {/* Valley floor + winding road */}
      <path d="M0 780 360 730 720 750 1080 725 1440 770V900H0Z" fill="#7f9a58" />
      <path d="M700 900C690 850 760 830 740 795S690 760 712 742 760 728 742 716" fill="none" stroke="#3b3f42" strokeWidth="26" strokeLinecap="round" />
      <path d="M700 900C690 850 760 830 740 795S690 760 712 742 760 728 742 716" fill="none" stroke="#efe6c8" strokeWidth="2" strokeDasharray="10 12" />
      {/* Jeep */}
      <g transform="translate(722 780) scale(0.9)">
        <rect x="-34" y="-30" width="68" height="20" rx="5" fill="#f2f0ea" />
        <rect x="-30" y="-46" width="48" height="18" rx="5" fill="#f2f0ea" />
        <rect x="-26" y="-43" width="40" height="10" rx="2" fill="#22313a" />
        <rect x="-28" y="-56" width="40" height="8" rx="3" fill="#7a5434" />
        <circle cx="-20" cy="-8" r="8" fill="#1b1d1f" />
        <circle cx="20" cy="-8" r="8" fill="#1b1d1f" />
      </g>
      {/* Deodars */}
      {[90, 150, 210, 1230, 1290, 1350, 1180, 60, 300, 1100].map((x, i) => (
        <path key={x} d={`M${x} ${700 + (i % 3) * 18}l-14 34h28Zm0-16l-11 28h22Z`} fill={i % 2 ? "#1f3d29" : "#23452d"} />
      ))}
    </svg>
  );
}
