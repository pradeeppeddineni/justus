import type { HeatEntry } from "../core/SessionStore";
import { KeepsakeCard, COLORS, FONTS } from "./KeepsakeCard";

/**
 * HeatHighlightsCard — shows the most interesting "heat" truths with answers.
 * Filters to truth entries (those with answers) and shows max 4 per card.
 */

interface HeatHighlightsCardProps {
  entries: HeatEntry[];
  coupleName: string;
  date: string;
}

/** Map intensity levels to visual styles */
function intensityStyle(intensity: string): {
  borderColor: string;
  bgOpacity: string;
  label: string;
} {
  switch (intensity.toLowerCase()) {
    case "mild":
      return {
        borderColor: COLORS.glow,
        bgOpacity: "08",
        label: "Mild",
      };
    case "medium":
      return {
        borderColor: COLORS.accent,
        bgOpacity: "0C",
        label: "Medium",
      };
    case "hot":
    case "spicy":
      return {
        borderColor: COLORS.accent,
        bgOpacity: "14",
        label: "Spicy",
      };
    default:
      return {
        borderColor: COLORS.primary,
        bgOpacity: "0A",
        label: intensity,
      };
  }
}

/** Chunk an array into groups of a given size */
function chunk<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}

function HeatEntryBlock({
  entry,
  isLast,
}: {
  entry: HeatEntry;
  isLast: boolean;
}) {
  const style = intensityStyle(entry.intensity);

  return (
    <div style={{ marginBottom: isLast ? 0 : 28 }}>
      <div
        style={{
          padding: "24px 32px",
          borderRadius: 12,
          background: `linear-gradient(135deg, ${style.borderColor}${style.bgOpacity}, transparent)`,
          borderLeft: `4px solid ${style.borderColor}`,
        }}
      >
        {/* Intensity badge */}
        <div
          style={{
            display: "inline-block",
            fontFamily: FONTS.body,
            fontSize: 16,
            textTransform: "uppercase",
            letterSpacing: 4,
            color: style.borderColor,
            padding: "4px 14px",
            borderRadius: 20,
            border: `1px solid ${style.borderColor}44`,
            marginBottom: 12,
            opacity: 0.8,
          }}
        >
          {style.label}
        </div>

        {/* Choice / prompt */}
        <p
          style={{
            fontFamily: FONTS.body,
            fontSize: 30,
            fontStyle: "italic",
            color: COLORS.accent,
            margin: "0 0 14px 0",
            lineHeight: 1.4,
          }}
        >
          {entry.choice}
        </p>

        {/* Answer (only truths have answers) */}
        {entry.answer && (
          <p
            style={{
              fontFamily: FONTS.body,
              fontSize: 28,
              color: COLORS.text,
              margin: 0,
              lineHeight: 1.45,
              paddingLeft: 16,
              borderLeft: `2px solid ${COLORS.primary}66`,
            }}
          >
            {entry.answer}
          </p>
        )}
      </div>

      {/* Divider */}
      {!isLast && (
        <div
          style={{
            marginTop: 28,
            height: 1,
            background: `linear-gradient(90deg, transparent, ${COLORS.primary}44, transparent)`,
          }}
        />
      )}
    </div>
  );
}

export function HeatHighlightsCard({
  entries,
  coupleName,
  date,
}: HeatHighlightsCardProps) {
  // Filter to truth entries (those with answers) for highlights
  const truthEntries = entries.filter((e) => e.answer != null && e.answer !== "");
  const groups = chunk(truthEntries, 4);

  // If no truth entries, render nothing
  if (groups.length === 0) return null;

  return (
    <>
      {groups.map((group, gi) => (
        <KeepsakeCard
          key={gi}
          title="Heat Highlights"
          subtitle={
            groups.length > 1
              ? `Part ${gi + 1} of ${groups.length}`
              : "The truths that surfaced"
          }
          coupleName={coupleName}
          date={date}
        >
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
            }}
          >
            {group.map((entry, i) => (
              <HeatEntryBlock
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
 * Renders a single card for a pre-chunked group.
 */
export function HeatHighlightsSingle({
  entries,
  coupleName,
  date,
  pageLabel,
}: HeatHighlightsCardProps & { pageLabel?: string }) {
  return (
    <KeepsakeCard
      title="Heat Highlights"
      subtitle={pageLabel ?? "The truths that surfaced"}
      coupleName={coupleName}
      date={date}
    >
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
        {entries.map((entry, i) => (
          <HeatEntryBlock key={i} entry={entry} isLast={i === entries.length - 1} />
        ))}
      </div>
    </KeepsakeCard>
  );
}
