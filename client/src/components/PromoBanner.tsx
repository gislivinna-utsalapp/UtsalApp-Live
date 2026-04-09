export function PromoBanner() {
  return (
    <div
      className="col-span-2 rounded-md overflow-hidden relative"
      style={{
        background: "linear-gradient(135deg, #1a4a2e 0%, #2d7a4f 40%, #1a4a2e 100%)",
        minHeight: "140px",
      }}
      data-testid="promo-banner-fermingar"
    >
      {/* Subtle texture overlay */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 50%, #ffffff 1px, transparent 1px), radial-gradient(circle at 80% 50%, #ffffff 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      {/* Left lily cluster */}
      <svg
        className="absolute left-0 top-0 h-full"
        viewBox="0 0 110 140"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ width: "110px" }}
      >
        {/* Stem 1 */}
        <path d="M30 140 Q28 100 35 60" stroke="#4a9e6b" strokeWidth="2.5" strokeLinecap="round" />
        {/* Leaf on stem 1 left */}
        <path d="M31 105 Q10 95 8 75" stroke="#4a9e6b" strokeWidth="2" strokeLinecap="round" fill="none" />
        <path d="M31 105 Q10 95 8 75 Q22 82 31 105" fill="#3d8a5c" opacity="0.9" />
        {/* Leaf on stem 1 right */}
        <path d="M33 85 Q55 70 55 50" stroke="#4a9e6b" strokeWidth="2" strokeLinecap="round" fill="none" />
        <path d="M33 85 Q55 70 55 50 Q40 65 33 85" fill="#3d8a5c" opacity="0.9" />

        {/* Lily 1 - fully open */}
        <g transform="translate(35, 55)">
          <ellipse cx="0" cy="-16" rx="5" ry="15" fill="white" opacity="0.95" transform="rotate(-30)" />
          <ellipse cx="0" cy="-16" rx="5" ry="15" fill="white" opacity="0.95" transform="rotate(30)" />
          <ellipse cx="0" cy="-16" rx="5" ry="15" fill="white" opacity="0.95" transform="rotate(90)" />
          <ellipse cx="0" cy="-16" rx="5" ry="15" fill="white" opacity="0.95" transform="rotate(150)" />
          <ellipse cx="0" cy="-16" rx="5" ry="15" fill="white" opacity="0.95" transform="rotate(210)" />
          <ellipse cx="0" cy="-16" rx="5" ry="15" fill="white" opacity="0.95" transform="rotate(270)" />
          {/* Stamens */}
          <line x1="0" y1="0" x2="4" y2="-10" stroke="#f0c040" strokeWidth="1.2" />
          <line x1="0" y1="0" x2="-4" y2="-10" stroke="#f0c040" strokeWidth="1.2" />
          <line x1="0" y1="0" x2="0" y2="-12" stroke="#f0c040" strokeWidth="1.2" />
          <circle cx="4" cy="-10" r="1.5" fill="#e8a020" />
          <circle cx="-4" cy="-10" r="1.5" fill="#e8a020" />
          <circle cx="0" cy="-12" r="1.5" fill="#e8a020" />
        </g>

        {/* Stem 2 */}
        <path d="M18 140 Q15 110 20 80" stroke="#4a9e6b" strokeWidth="2" strokeLinecap="round" />
        {/* Bud on stem 2 */}
        <g transform="translate(20, 75)">
          <path d="M0 0 Q-6 -15 0 -25 Q6 -15 0 0" fill="white" opacity="0.85" />
          <path d="M0 0 Q-4 -12 0 -20" stroke="#d0e8d0" strokeWidth="0.8" fill="none" />
        </g>

        {/* Stem 3 smaller */}
        <path d="M50 140 Q48 115 52 95" stroke="#4a9e6b" strokeWidth="1.5" strokeLinecap="round" />
        {/* Bud on stem 3 */}
        <g transform="translate(52, 90)">
          <path d="M0 0 Q-5 -12 0 -20 Q5 -12 0 0" fill="white" opacity="0.8" />
        </g>
      </svg>

      {/* Right lily cluster (mirrored) */}
      <svg
        className="absolute right-0 top-0 h-full"
        viewBox="0 0 110 140"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ width: "110px", transform: "scaleX(-1)" }}
      >
        {/* Stem 1 */}
        <path d="M30 140 Q28 100 35 60" stroke="#4a9e6b" strokeWidth="2.5" strokeLinecap="round" />
        {/* Leaf on stem 1 left */}
        <path d="M31 105 Q10 95 8 75" stroke="#4a9e6b" strokeWidth="2" strokeLinecap="round" fill="none" />
        <path d="M31 105 Q10 95 8 75 Q22 82 31 105" fill="#3d8a5c" opacity="0.9" />
        {/* Leaf on stem 1 right */}
        <path d="M33 85 Q55 70 55 50" stroke="#4a9e6b" strokeWidth="2" strokeLinecap="round" fill="none" />
        <path d="M33 85 Q55 70 55 50 Q40 65 33 85" fill="#3d8a5c" opacity="0.9" />

        {/* Lily 1 - fully open */}
        <g transform="translate(35, 55)">
          <ellipse cx="0" cy="-16" rx="5" ry="15" fill="white" opacity="0.95" transform="rotate(-30)" />
          <ellipse cx="0" cy="-16" rx="5" ry="15" fill="white" opacity="0.95" transform="rotate(30)" />
          <ellipse cx="0" cy="-16" rx="5" ry="15" fill="white" opacity="0.95" transform="rotate(90)" />
          <ellipse cx="0" cy="-16" rx="5" ry="15" fill="white" opacity="0.95" transform="rotate(150)" />
          <ellipse cx="0" cy="-16" rx="5" ry="15" fill="white" opacity="0.95" transform="rotate(210)" />
          <ellipse cx="0" cy="-16" rx="5" ry="15" fill="white" opacity="0.95" transform="rotate(270)" />
          {/* Stamens */}
          <line x1="0" y1="0" x2="4" y2="-10" stroke="#f0c040" strokeWidth="1.2" />
          <line x1="0" y1="0" x2="-4" y2="-10" stroke="#f0c040" strokeWidth="1.2" />
          <line x1="0" y1="0" x2="0" y2="-12" stroke="#f0c040" strokeWidth="1.2" />
          <circle cx="4" cy="-10" r="1.5" fill="#e8a020" />
          <circle cx="-4" cy="-10" r="1.5" fill="#e8a020" />
          <circle cx="0" cy="-12" r="1.5" fill="#e8a020" />
        </g>

        {/* Stem 2 */}
        <path d="M18 140 Q15 110 20 80" stroke="#4a9e6b" strokeWidth="2" strokeLinecap="round" />
        {/* Bud on stem 2 */}
        <g transform="translate(20, 75)">
          <path d="M0 0 Q-6 -15 0 -25 Q6 -15 0 0" fill="white" opacity="0.85" />
          <path d="M0 0 Q-4 -12 0 -20" stroke="#d0e8d0" strokeWidth="0.8" fill="none" />
        </g>

        {/* Stem 3 smaller */}
        <path d="M50 140 Q48 115 52 95" stroke="#4a9e6b" strokeWidth="1.5" strokeLinecap="round" />
        {/* Bud on stem 3 */}
        <g transform="translate(52, 90)">
          <path d="M0 0 Q-5 -12 0 -20 Q5 -12 0 0" fill="white" opacity="0.8" />
        </g>
      </svg>

      {/* Center content */}
      <div className="relative flex flex-col items-center justify-center text-center px-28 py-6 h-full">
        {/* Ad label */}
        <span
          className="text-xs font-semibold uppercase tracking-widest mb-2 px-2 py-0.5 rounded"
          style={{ color: "#a8e6bf", border: "1px solid rgba(168,230,191,0.4)" }}
        >
          Auglýsing
        </span>

        {/* Main headline */}
        <h3
          className="text-lg font-extrabold leading-tight mb-1"
          style={{
            color: "#ffffff",
            textShadow: "0 1px 8px rgba(0,0,0,0.3)",
          }}
        >
          Auglýstu fermingartilboðin hérna
        </h3>

        {/* Subtext */}
        <p className="text-sm mb-4" style={{ color: "#c8f0d8" }}>
          Náðu til þína viðskiptavina um fermingartímann
        </p>

        {/* CTA */}
        <a
          href="mailto:utsalapp@utsalapp.is"
          className="inline-block rounded-md font-semibold text-sm px-5 py-2"
          style={{
            background: "#d91e5b",
            color: "#ffffff",
            boxShadow: "0 2px 8px rgba(217,30,91,0.4)",
          }}
          data-testid="link-promo-banner-cta"
        >
          Hafðu samband
        </a>
      </div>
    </div>
  );
}
