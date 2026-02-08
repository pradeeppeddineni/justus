import React from "react";
import type { UnsaidData } from "../core/SessionStore";
import { KeepsakeCard, COLORS, FONTS } from "./KeepsakeCard";

/**
 * UnsaidCard — displays both partners' unsaid messages with soft glow effect.
 */

interface UnsaidCardProps {
  unsaid: UnsaidData;
  coupleName: string;
  date: string;
}

function UnsaidMessage({
  label,
  message,
  glowColor,
}: {
  label: string;
  message: string;
  glowColor: string;
}) {
  return (
    <div style={{ textAlign: "center" }}>
      {/* Label */}
      <div
        style={{
          fontFamily: FONTS.body,
          fontSize: 20,
          textTransform: "uppercase",
          letterSpacing: 6,
          color: COLORS.glow,
          marginBottom: 20,
          opacity: 0.6,
        }}
      >
        {label}
      </div>

      {/* Message with glow */}
      <div
        style={{
          position: "relative",
          padding: "40px 48px",
        }}
      >
        {/* Background glow */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: 24,
            background: `radial-gradient(ellipse at center, ${glowColor}15, transparent 70%)`,
          }}
        />

        {/* Quotation marks */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 20,
            fontFamily: FONTS.display,
            fontSize: 100,
            color: COLORS.primary,
            lineHeight: 1,
            opacity: 0.4,
            userSelect: "none",
          }}
        >
          {"\u201C"}
        </div>

        <p
          style={{
            fontFamily: FONTS.body,
            fontSize: 38,
            fontStyle: "italic",
            color: COLORS.text,
            margin: 0,
            lineHeight: 1.6,
            position: "relative",
            textShadow: `0 0 40px ${glowColor}44`,
          }}
        >
          {message}
        </p>

        <div
          style={{
            position: "absolute",
            bottom: -10,
            right: 20,
            fontFamily: FONTS.display,
            fontSize: 100,
            color: COLORS.primary,
            lineHeight: 1,
            opacity: 0.4,
            userSelect: "none",
          }}
        >
          {"\u201D"}
        </div>
      </div>
    </div>
  );
}

export function UnsaidCard({ unsaid, coupleName, date }: UnsaidCardProps) {
  return (
    <KeepsakeCard
      title="The Unsaid"
      subtitle="Words finally spoken"
      coupleName={coupleName}
      date={date}
    >
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 60,
          padding: "0 20px",
        }}
      >
        <UnsaidMessage
          label="You said"
          message={unsaid.p1Message}
          glowColor={COLORS.accent}
        />

        {/* Divider */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 20,
          }}
        >
          <div
            style={{
              flex: 1,
              height: 1,
              background: `linear-gradient(90deg, transparent, ${COLORS.primary})`,
            }}
          />
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill={COLORS.accent}
            opacity={0.5}
          >
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </svg>
          <div
            style={{
              flex: 1,
              height: 1,
              background: `linear-gradient(90deg, ${COLORS.primary}, transparent)`,
            }}
          />
        </div>

        <UnsaidMessage
          label="They said"
          message={unsaid.p2Message}
          glowColor={COLORS.glow}
        />
      </div>
    </KeepsakeCard>
  );
}
