import React from "react";
import type { RewriteEntry } from "../core/SessionStore";
import { KeepsakeCard, COLORS, FONTS } from "./KeepsakeCard";

/**
 * RewriteCard — displays a memory description, its date, and both partners' reflections.
 */

interface RewriteCardProps {
  entry: RewriteEntry;
  coupleName: string;
  date: string;
}

export function RewriteCard({ entry, coupleName, date }: RewriteCardProps) {
  return (
    <KeepsakeCard
      title="Rewritten"
      subtitle="The same memory, two perspectives"
      coupleName={coupleName}
      date={date}
    >
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 40,
        }}
      >
        {/* Memory description block */}
        <div
          style={{
            textAlign: "center",
            padding: "36px 40px",
            borderRadius: 16,
            background: `linear-gradient(135deg, ${COLORS.primary}18, ${COLORS.primary}08)`,
            border: `1px solid ${COLORS.primary}44`,
          }}
        >
          <p
            style={{
              fontFamily: FONTS.display,
              fontSize: 36,
              fontStyle: "italic",
              color: COLORS.text,
              margin: 0,
              lineHeight: 1.5,
            }}
          >
            {entry.memoryDescription}
          </p>
          <div
            style={{
              fontFamily: FONTS.body,
              fontSize: 24,
              color: COLORS.glow,
              marginTop: 16,
              opacity: 0.6,
            }}
          >
            {entry.memoryDate}
          </div>
        </div>

        {/* Reflections */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 32,
          }}
        >
          {/* Player 1 reflection */}
          <div
            style={{
              padding: "28px 36px",
              borderRadius: 12,
              background: `linear-gradient(135deg, ${COLORS.accent}0A, transparent)`,
              borderLeft: `4px solid ${COLORS.accent}`,
            }}
          >
            <div
              style={{
                fontFamily: FONTS.body,
                fontSize: 20,
                textTransform: "uppercase",
                letterSpacing: 5,
                color: COLORS.accent,
                marginBottom: 14,
                opacity: 0.7,
              }}
            >
              Your Reflection
            </div>
            <p
              style={{
                fontFamily: FONTS.body,
                fontSize: 30,
                color: COLORS.text,
                margin: 0,
                lineHeight: 1.5,
              }}
            >
              {entry.p1Answer}
            </p>
          </div>

          {/* Player 2 reflection */}
          <div
            style={{
              padding: "28px 36px",
              borderRadius: 12,
              background: `linear-gradient(135deg, ${COLORS.glow}0A, transparent)`,
              borderLeft: `4px solid ${COLORS.glow}`,
            }}
          >
            <div
              style={{
                fontFamily: FONTS.body,
                fontSize: 20,
                textTransform: "uppercase",
                letterSpacing: 5,
                color: COLORS.glow,
                marginBottom: 14,
                opacity: 0.7,
              }}
            >
              Their Reflection
            </div>
            <p
              style={{
                fontFamily: FONTS.body,
                fontSize: 30,
                color: COLORS.text,
                margin: 0,
                lineHeight: 1.5,
              }}
            >
              {entry.p2Answer}
            </p>
          </div>
        </div>
      </div>
    </KeepsakeCard>
  );
}
