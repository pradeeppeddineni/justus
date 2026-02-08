import React from "react";
import type { QAEntry } from "../core/SessionStore";
import { KeepsakeCard, COLORS, FONTS } from "./KeepsakeCard";

/**
 * QACard — displays 2-3 Q&A entries per card.
 * Renders question text in accent/italic with labeled answers for each partner.
 */

interface QACardProps {
  entries: QAEntry[];
  coupleName: string;
  date: string;
}

/** Chunk an array into groups of a given size */
function chunk<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}

function QAEntryBlock({ entry, isLast }: { entry: QAEntry; isLast: boolean }) {
  return (
    <div style={{ marginBottom: isLast ? 0 : 32 }}>
      {/* Question */}
      <p
        style={{
          fontFamily: FONTS.body,
          fontSize: 34,
          fontStyle: "italic",
          color: COLORS.accent,
          margin: "0 0 20px 0",
          lineHeight: 1.4,
        }}
      >
        {entry.question}
      </p>

      {/* Answers */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Player 1 */}
        <div>
          <div
            style={{
              fontFamily: FONTS.body,
              fontSize: 20,
              textTransform: "uppercase",
              letterSpacing: 4,
              color: COLORS.glow,
              marginBottom: 6,
              opacity: 0.7,
            }}
          >
            You
          </div>
          <p
            style={{
              fontFamily: FONTS.body,
              fontSize: 30,
              color: COLORS.text,
              margin: 0,
              lineHeight: 1.4,
              paddingLeft: 16,
              borderLeft: `3px solid ${COLORS.primary}`,
            }}
          >
            {entry.p1Answer}
          </p>
        </div>

        {/* Player 2 */}
        <div>
          <div
            style={{
              fontFamily: FONTS.body,
              fontSize: 20,
              textTransform: "uppercase",
              letterSpacing: 4,
              color: COLORS.glow,
              marginBottom: 6,
              opacity: 0.7,
            }}
          >
            Them
          </div>
          <p
            style={{
              fontFamily: FONTS.body,
              fontSize: 30,
              color: COLORS.text,
              margin: 0,
              lineHeight: 1.4,
              paddingLeft: 16,
              borderLeft: `3px solid ${COLORS.accent}44`,
            }}
          >
            {entry.p2Answer}
          </p>
        </div>
      </div>

      {/* Divider between entries */}
      {!isLast && (
        <div
          style={{
            marginTop: 32,
            height: 1,
            background: `linear-gradient(90deg, transparent, ${COLORS.primary}, transparent)`,
          }}
        />
      )}
    </div>
  );
}

/**
 * Returns an array of QACard elements — one per group of 3 entries.
 * Use QACardSingle if you want a single card for a specific chunk.
 */
export function QACard({ entries, coupleName, date }: QACardProps) {
  const groups = chunk(entries, 3);

  return (
    <>
      {groups.map((group, gi) => (
        <KeepsakeCard
          key={gi}
          title="Questions & Answers"
          subtitle={groups.length > 1 ? `Part ${gi + 1} of ${groups.length}` : undefined}
          coupleName={coupleName}
          date={date}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              flex: 1,
            }}
          >
            {group.map((entry, i) => (
              <QAEntryBlock
                key={i}
                entry={entry}
                isLast={i === group.length - 1}
              />
            ))}
          </div>
        </KeepsakeCard>
      ))}
    </>
  );
}

/**
 * Renders a single card for a pre-chunked group (useful when the caller
 * handles pagination externally, e.g. during export).
 */
export function QACardSingle({
  entries,
  coupleName,
  date,
  pageLabel,
}: QACardProps & { pageLabel?: string }) {
  return (
    <KeepsakeCard
      title="Questions & Answers"
      subtitle={pageLabel}
      coupleName={coupleName}
      date={date}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          flex: 1,
        }}
      >
        {entries.map((entry, i) => (
          <QAEntryBlock key={i} entry={entry} isLast={i === entries.length - 1} />
        ))}
      </div>
    </KeepsakeCard>
  );
}
