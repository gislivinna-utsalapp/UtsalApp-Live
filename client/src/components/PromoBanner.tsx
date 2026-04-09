function FermingBanner() {
  return (
    <div
      className="col-span-2 rounded-md overflow-hidden relative"
      style={{
        background: "linear-gradient(135deg, #1a4a2e 0%, #2d7a4f 40%, #1a4a2e 100%)",
        minHeight: "140px",
      }}
      data-testid="promo-banner-fermingar"
    >
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 50%, #ffffff 1px, transparent 1px), radial-gradient(circle at 80% 50%, #ffffff 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <svg
        className="absolute left-0 top-0 h-full"
        viewBox="0 0 110 140"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ width: "110px" }}
      >
        <path d="M30 140 Q28 100 35 60" stroke="#4a9e6b" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M31 105 Q10 95 8 75" stroke="#4a9e6b" strokeWidth="2" strokeLinecap="round" fill="none" />
        <path d="M31 105 Q10 95 8 75 Q22 82 31 105" fill="#3d8a5c" opacity="0.9" />
        <path d="M33 85 Q55 70 55 50" stroke="#4a9e6b" strokeWidth="2" strokeLinecap="round" fill="none" />
        <path d="M33 85 Q55 70 55 50 Q40 65 33 85" fill="#3d8a5c" opacity="0.9" />
        <g transform="translate(35, 55)">
          <ellipse cx="0" cy="-16" rx="5" ry="15" fill="white" opacity="0.95" transform="rotate(-30)" />
          <ellipse cx="0" cy="-16" rx="5" ry="15" fill="white" opacity="0.95" transform="rotate(30)" />
          <ellipse cx="0" cy="-16" rx="5" ry="15" fill="white" opacity="0.95" transform="rotate(90)" />
          <ellipse cx="0" cy="-16" rx="5" ry="15" fill="white" opacity="0.95" transform="rotate(150)" />
          <ellipse cx="0" cy="-16" rx="5" ry="15" fill="white" opacity="0.95" transform="rotate(210)" />
          <ellipse cx="0" cy="-16" rx="5" ry="15" fill="white" opacity="0.95" transform="rotate(270)" />
          <line x1="0" y1="0" x2="4" y2="-10" stroke="#f0c040" strokeWidth="1.2" />
          <line x1="0" y1="0" x2="-4" y2="-10" stroke="#f0c040" strokeWidth="1.2" />
          <line x1="0" y1="0" x2="0" y2="-12" stroke="#f0c040" strokeWidth="1.2" />
          <circle cx="4" cy="-10" r="1.5" fill="#e8a020" />
          <circle cx="-4" cy="-10" r="1.5" fill="#e8a020" />
          <circle cx="0" cy="-12" r="1.5" fill="#e8a020" />
        </g>
        <path d="M18 140 Q15 110 20 80" stroke="#4a9e6b" strokeWidth="2" strokeLinecap="round" />
        <g transform="translate(20, 75)">
          <path d="M0 0 Q-6 -15 0 -25 Q6 -15 0 0" fill="white" opacity="0.85" />
          <path d="M0 0 Q-4 -12 0 -20" stroke="#d0e8d0" strokeWidth="0.8" fill="none" />
        </g>
        <path d="M50 140 Q48 115 52 95" stroke="#4a9e6b" strokeWidth="1.5" strokeLinecap="round" />
        <g transform="translate(52, 90)">
          <path d="M0 0 Q-5 -12 0 -20 Q5 -12 0 0" fill="white" opacity="0.8" />
        </g>
      </svg>

      <svg
        className="absolute right-0 top-0 h-full"
        viewBox="0 0 110 140"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ width: "110px", transform: "scaleX(-1)" }}
      >
        <path d="M30 140 Q28 100 35 60" stroke="#4a9e6b" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M31 105 Q10 95 8 75" stroke="#4a9e6b" strokeWidth="2" strokeLinecap="round" fill="none" />
        <path d="M31 105 Q10 95 8 75 Q22 82 31 105" fill="#3d8a5c" opacity="0.9" />
        <path d="M33 85 Q55 70 55 50" stroke="#4a9e6b" strokeWidth="2" strokeLinecap="round" fill="none" />
        <path d="M33 85 Q55 70 55 50 Q40 65 33 85" fill="#3d8a5c" opacity="0.9" />
        <g transform="translate(35, 55)">
          <ellipse cx="0" cy="-16" rx="5" ry="15" fill="white" opacity="0.95" transform="rotate(-30)" />
          <ellipse cx="0" cy="-16" rx="5" ry="15" fill="white" opacity="0.95" transform="rotate(30)" />
          <ellipse cx="0" cy="-16" rx="5" ry="15" fill="white" opacity="0.95" transform="rotate(90)" />
          <ellipse cx="0" cy="-16" rx="5" ry="15" fill="white" opacity="0.95" transform="rotate(150)" />
          <ellipse cx="0" cy="-16" rx="5" ry="15" fill="white" opacity="0.95" transform="rotate(210)" />
          <ellipse cx="0" cy="-16" rx="5" ry="15" fill="white" opacity="0.95" transform="rotate(270)" />
          <line x1="0" y1="0" x2="4" y2="-10" stroke="#f0c040" strokeWidth="1.2" />
          <line x1="0" y1="0" x2="-4" y2="-10" stroke="#f0c040" strokeWidth="1.2" />
          <line x1="0" y1="0" x2="0" y2="-12" stroke="#f0c040" strokeWidth="1.2" />
          <circle cx="4" cy="-10" r="1.5" fill="#e8a020" />
          <circle cx="-4" cy="-10" r="1.5" fill="#e8a020" />
          <circle cx="0" cy="-12" r="1.5" fill="#e8a020" />
        </g>
        <path d="M18 140 Q15 110 20 80" stroke="#4a9e6b" strokeWidth="2" strokeLinecap="round" />
        <g transform="translate(20, 75)">
          <path d="M0 0 Q-6 -15 0 -25 Q6 -15 0 0" fill="white" opacity="0.85" />
          <path d="M0 0 Q-4 -12 0 -20" stroke="#d0e8d0" strokeWidth="0.8" fill="none" />
        </g>
        <path d="M50 140 Q48 115 52 95" stroke="#4a9e6b" strokeWidth="1.5" strokeLinecap="round" />
        <g transform="translate(52, 90)">
          <path d="M0 0 Q-5 -12 0 -20 Q5 -12 0 0" fill="white" opacity="0.8" />
        </g>
      </svg>

      <div className="relative flex flex-col items-center justify-center text-center px-28 py-6 h-full">
        <span
          className="text-xs font-semibold uppercase tracking-widest mb-2 px-2 py-0.5 rounded"
          style={{ color: "#a8e6bf", border: "1px solid rgba(168,230,191,0.4)" }}
        >
          Auglýsing
        </span>
        <h3
          className="text-lg font-extrabold leading-tight mb-1"
          style={{ color: "#ffffff", textShadow: "0 1px 8px rgba(0,0,0,0.3)" }}
        >
          Auglýstu fermingartilboðin hérna
        </h3>
        <p className="text-sm mb-4" style={{ color: "#c8f0d8" }}>
          Náðu til þinna viðskiptavina um fermingartímann
        </p>
        <a
          href="mailto:utsalapp@utsalapp.is"
          className="inline-block rounded-md font-semibold text-sm px-5 py-2"
          style={{ background: "#d91e5b", color: "#ffffff", boxShadow: "0 2px 8px rgba(217,30,91,0.4)" }}
          data-testid="link-promo-banner-cta"
        >
          Hafðu samband
        </a>
      </div>
    </div>
  );
}

function SubscriptionBanner() {
  return (
    <div
      className="col-span-2 rounded-md overflow-hidden relative"
      style={{
        background: "linear-gradient(135deg, #2a0845 0%, #6a1b6d 35%, #d91e5b 100%)",
        minHeight: "140px",
      }}
      data-testid="promo-banner-subscription"
    >
      {/* Animated-feeling sparkle dots */}
      <div className="absolute inset-0">
        {[
          { top: "12%", left: "8%", size: 3, opacity: 0.5 },
          { top: "25%", left: "18%", size: 2, opacity: 0.35 },
          { top: "60%", left: "5%", size: 2.5, opacity: 0.4 },
          { top: "80%", left: "15%", size: 2, opacity: 0.3 },
          { top: "15%", right: "10%", size: 3, opacity: 0.5 },
          { top: "40%", right: "6%", size: 2, opacity: 0.35 },
          { top: "70%", right: "18%", size: 2.5, opacity: 0.4 },
          { top: "90%", right: "8%", size: 2, opacity: 0.3 },
          { top: "50%", left: "25%", size: 1.5, opacity: 0.25 },
          { top: "35%", right: "22%", size: 1.5, opacity: 0.25 },
        ].map((dot, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              top: dot.top,
              left: dot.left,
              right: (dot as any).right,
              width: `${dot.size * 2}px`,
              height: `${dot.size * 2}px`,
              background: "#ffffff",
              opacity: dot.opacity,
            }}
          />
        ))}
      </div>

      {/* Decorative ring left */}
      <svg
        className="absolute left-2 top-1/2 -translate-y-1/2 opacity-20"
        width="70"
        height="70"
        viewBox="0 0 70 70"
        fill="none"
      >
        <circle cx="35" cy="35" r="30" stroke="#ffffff" strokeWidth="1.5" strokeDasharray="6 4" />
        <circle cx="35" cy="35" r="18" stroke="#ffffff" strokeWidth="1" strokeDasharray="3 3" />
        <circle cx="35" cy="35" r="6" fill="#ffffff" opacity="0.4" />
      </svg>

      {/* Decorative ring right */}
      <svg
        className="absolute right-2 top-1/2 -translate-y-1/2 opacity-20"
        width="70"
        height="70"
        viewBox="0 0 70 70"
        fill="none"
      >
        <circle cx="35" cy="35" r="30" stroke="#ffffff" strokeWidth="1.5" strokeDasharray="6 4" />
        <circle cx="35" cy="35" r="18" stroke="#ffffff" strokeWidth="1" strokeDasharray="3 3" />
        <circle cx="35" cy="35" r="6" fill="#ffffff" opacity="0.4" />
      </svg>

      {/* Center content */}
      <div className="relative flex flex-col items-center justify-center text-center px-12 py-6 h-full">
        <span
          className="text-xs font-semibold uppercase tracking-widest mb-2 px-2 py-0.5 rounded"
          style={{ color: "#f9c4d8", border: "1px solid rgba(249,196,216,0.4)" }}
        >
          Auglýsing
        </span>

        {/* Badge: 7 dagar */}
        <div
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 mb-2"
          style={{
            background: "rgba(255,255,255,0.15)",
            backdropFilter: "blur(4px)",
            border: "1px solid rgba(255,255,255,0.2)",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <span className="text-xs font-bold" style={{ color: "#fbbf24" }}>
            7 dagar
          </span>
        </div>

        <h3
          className="text-lg font-extrabold leading-tight mb-1"
          style={{ color: "#ffffff", textShadow: "0 2px 12px rgba(0,0,0,0.3)" }}
        >
          Ótakmarkaðar auglýsingar
        </h3>

        {/* Price */}
        <div className="flex items-baseline gap-1 mb-4">
          <span className="text-2xl font-black" style={{ color: "#fbbf24" }}>
            59.900
          </span>
          <span className="text-sm font-semibold" style={{ color: "#f9c4d8" }}>
            kr
          </span>
        </div>

        <a
          href="mailto:utsalapp@utsalapp.is"
          className="inline-block rounded-md font-semibold text-sm px-5 py-2"
          style={{
            background: "linear-gradient(90deg, #fbbf24, #f59e0b)",
            color: "#2a0845",
            boxShadow: "0 2px 12px rgba(251,191,36,0.4)",
          }}
          data-testid="link-promo-subscription-cta"
        >
          Byrjaðu í dag
        </a>
      </div>
    </div>
  );
}

export function PromoBanner({ variant = "fermingar" }: { variant?: "fermingar" | "subscription" }) {
  if (variant === "subscription") return <SubscriptionBanner />;
  return <FermingBanner />;
}
