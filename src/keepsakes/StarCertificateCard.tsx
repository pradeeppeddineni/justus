import React from "react";
import type { StarData } from "../core/SessionStore";
import { KeepsakeCard, COLORS, FONTS } from "./KeepsakeCard";

/**
 * StarCertificateCard — a certificate-style card showing a named star
 * with pseudo-coordinates derived from the star name, contributor names,
 * and a starry background.
 */

interface StarCertificateCardProps {
  star: StarData;
  coupleName: string;
  date: string;
}

/**
 * Generate deterministic star coordinates from the star name.
 * Uses a simple hash to produce RA (0-23h, 0-59m) and Dec (-90 to +90 deg).
 */
function generateCoordinates(name: string): {
  raH: number;
  raM: number;
  decDeg: number;
  decMin: number;
} {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) & 0xffffffff;
  }

  // Ensure positive values for modulo
  const absHash = Math.abs(hash);

  const raH = absHash % 24;
  const raM = (absHash >> 5) % 60;
  const decDeg = ((absHash >> 10) % 181) - 90; // -90 to +90
  const decMin = (absHash >> 16) % 60;

  return { raH, raM, decDeg, decMin };
}

/**
 * Generate deterministic star positions for the background from the star name.
 */
function generateStars(
  name: string,
  count: number
): Array<{ x: number; y: number; size: number; opacity: number }> {
  const stars: Array<{ x: number; y: number; size: number; opacity: number }> = [];
  let seed = 0;
  for (let i = 0; i < name.length; i++) {
    seed = (seed * 31 + name.charCodeAt(i)) & 0xffffffff;
  }

  for (let i = 0; i < count; i++) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    const x = (seed % 1080);
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    const y = (seed % 1920);
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    const size = 1 + (seed % 4);
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    const opacity = 0.2 + ((seed % 60) / 100);

    stars.push({ x, y, size, opacity });
  }

  return stars;
}

export function StarCertificateCard({
  star,
  coupleName,
  date,
}: StarCertificateCardProps) {
  const coords = generateCoordinates(star.name);
  const decSign = coords.decDeg >= 0 ? "+" : "";
  const coordString = `RA ${coords.raH}h ${coords.raM}m, Dec ${decSign}${coords.decDeg}\u00B0 ${coords.decMin}\u2032`;

  const bgStars = generateStars(star.name, 80);

  return (
    <KeepsakeCard
      title=""
      coupleName={coupleName}
      date={date}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          overflow: "hidden",
          pointerEvents: "none",
        }}
      >
        {/* Starry background dots */}
        {bgStars.map((s, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: s.x,
              top: s.y,
              width: s.size,
              height: s.size,
              borderRadius: "50%",
              backgroundColor: COLORS.text,
              opacity: s.opacity,
              boxShadow:
                s.size >= 3
                  ? `0 0 ${s.size * 2}px ${COLORS.glow}66`
                  : undefined,
            }}
          />
        ))}

        {/* Central glow nebula effect */}
        <div
          style={{
            position: "absolute",
            top: "35%",
            left: "50%",
            width: 600,
            height: 600,
            transform: "translate(-50%, -50%)",
            borderRadius: "50%",
            background: `radial-gradient(ellipse at center, ${COLORS.accent}0D, ${COLORS.glow}08 40%, transparent 70%)`,
          }}
        />
      </div>

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          gap: 32,
        }}
      >
        {/* Certificate heading */}
        <div
          style={{
            fontFamily: FONTS.body,
            fontSize: 22,
            textTransform: "uppercase",
            letterSpacing: 8,
            color: COLORS.glow,
            opacity: 0.6,
          }}
        >
          Star Certificate
        </div>

        {/* Star illustration (simple SVG star) */}
        <svg
          width="120"
          height="120"
          viewBox="0 0 120 120"
          style={{
            filter: `drop-shadow(0 0 20px ${COLORS.glow}) drop-shadow(0 0 40px ${COLORS.accent}66)`,
          }}
        >
          <polygon
            points="60,10 72,45 110,45 80,68 90,105 60,82 30,105 40,68 10,45 48,45"
            fill={COLORS.accent}
            opacity={0.9}
          />
          <polygon
            points="60,20 69,44 100,44 75,62 83,92 60,76 37,92 45,62 20,44 51,44"
            fill={COLORS.glow}
            opacity={0.5}
          />
        </svg>

        {/* Star name */}
        <h2
          style={{
            fontFamily: FONTS.display,
            fontSize: 80,
            fontWeight: 700,
            color: COLORS.text,
            margin: 0,
            textAlign: "center",
            lineHeight: 1.15,
            textShadow: `0 0 40px ${COLORS.glow}44, 0 0 80px ${COLORS.accent}22`,
            maxWidth: 800,
            wordBreak: "break-word",
          }}
        >
          {star.name}
        </h2>

        {/* Coordinates */}
        <div
          style={{
            fontFamily: FONTS.body,
            fontSize: 28,
            color: COLORS.glow,
            letterSpacing: 2,
            opacity: 0.8,
          }}
        >
          Coordinates: {coordString}
        </div>

        {/* Decorative divider */}
        <div
          style={{
            width: 300,
            height: 1,
            background: `linear-gradient(90deg, transparent, ${COLORS.accent}, transparent)`,
            margin: "12px 0",
          }}
        />

        {/* Contributor words */}
        <div
          style={{
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontFamily: FONTS.body,
              fontSize: 20,
              textTransform: "uppercase",
              letterSpacing: 5,
              color: COLORS.glow,
              marginBottom: 16,
              opacity: 0.5,
            }}
          >
            Named from the words
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: 40,
            }}
          >
            <span
              style={{
                fontFamily: FONTS.display,
                fontSize: 40,
                fontStyle: "italic",
                color: COLORS.accent,
              }}
            >
              {star.p1Word}
            </span>
            <span
              style={{
                fontFamily: FONTS.body,
                fontSize: 24,
                color: COLORS.primary,
                opacity: 0.6,
              }}
            >
              &amp;
            </span>
            <span
              style={{
                fontFamily: FONTS.display,
                fontSize: 40,
                fontStyle: "italic",
                color: COLORS.glow,
              }}
            >
              {star.p2Word}
            </span>
          </div>
        </div>

        {/* Registration line */}
        <div
          style={{
            marginTop: 24,
            padding: "16px 40px",
            borderRadius: 8,
            border: `1px solid ${COLORS.primary}66`,
            background: `linear-gradient(135deg, ${COLORS.primary}11, transparent)`,
          }}
        >
          <div
            style={{
              fontFamily: FONTS.display,
              fontSize: 26,
              color: COLORS.text,
              letterSpacing: 2,
              textAlign: "center",
              opacity: 0.9,
            }}
          >
            Registered Valentine's Day 2026
          </div>
        </div>
      </div>
    </KeepsakeCard>
  );
}
