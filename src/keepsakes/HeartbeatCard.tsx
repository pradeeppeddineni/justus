import type { HeartbeatData } from "../core/SessionStore";
import { KeepsakeCard, COLORS, FONTS } from "./KeepsakeCard";

/**
 * HeartbeatCard — displays BPM readings with overlaid waveform SVG paths.
 */

interface HeartbeatCardProps {
  heartbeat: HeartbeatData;
  coupleName: string;
  date: string;
}

/**
 * Converts a waveform number[] to an SVG polyline points string.
 * Maps array indices to x, values to y within the given viewport.
 */
function waveformToPoints(
  waveform: number[],
  width: number,
  height: number,
  yCenter: number
): string {
  if (waveform.length === 0) return "";

  const maxVal = Math.max(...waveform.map(Math.abs), 1);
  const xStep = width / (waveform.length - 1 || 1);
  const amplitude = height / 2;

  return waveform
    .map((val, i) => {
      const x = i * xStep;
      const y = yCenter - (val / maxVal) * amplitude;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

export function HeartbeatCard({
  heartbeat,
  coupleName,
  date,
}: HeartbeatCardProps) {
  const svgWidth = 920;
  const svgHeight = 400;
  const yCenter = svgHeight / 2;

  const p1Points = waveformToPoints(
    heartbeat.p1Waveform,
    svgWidth,
    svgHeight * 0.8,
    yCenter
  );
  const p2Points = waveformToPoints(
    heartbeat.p2Waveform,
    svgWidth,
    svgHeight * 0.8,
    yCenter
  );

  const bpmDiff = Math.abs(heartbeat.p1Bpm - heartbeat.p2Bpm);
  const syncCaption =
    bpmDiff <= 5
      ? "Your hearts beat as one"
      : bpmDiff <= 15
        ? "Your rhythms are close"
        : "Different tempos, same love";

  return (
    <KeepsakeCard
      title="Heartbeat"
      subtitle="Two hearts, one moment"
      coupleName={coupleName}
      date={date}
    >
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 48,
        }}
      >
        {/* BPM display */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 80,
          }}
        >
          {/* Player 1 BPM */}
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                fontFamily: FONTS.body,
                fontSize: 22,
                textTransform: "uppercase",
                letterSpacing: 4,
                color: COLORS.accent,
                marginBottom: 12,
                opacity: 0.8,
              }}
            >
              You
            </div>
            <div
              style={{
                fontFamily: FONTS.display,
                fontSize: 120,
                fontWeight: 700,
                color: COLORS.accent,
                lineHeight: 1,
                textShadow: `0 0 30px ${COLORS.accent}66`,
              }}
            >
              {heartbeat.p1Bpm}
            </div>
            <div
              style={{
                fontFamily: FONTS.body,
                fontSize: 24,
                color: COLORS.glow,
                marginTop: 4,
                opacity: 0.6,
              }}
            >
              BPM
            </div>
          </div>

          {/* Heart icon divider */}
          <div style={{ position: "relative" }}>
            <svg
              width="60"
              height="60"
              viewBox="0 0 24 24"
              fill={COLORS.primary}
              style={{
                filter: `drop-shadow(0 0 12px ${COLORS.glow})`,
              }}
            >
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
          </div>

          {/* Player 2 BPM */}
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                fontFamily: FONTS.body,
                fontSize: 22,
                textTransform: "uppercase",
                letterSpacing: 4,
                color: COLORS.glow,
                marginBottom: 12,
                opacity: 0.8,
              }}
            >
              Them
            </div>
            <div
              style={{
                fontFamily: FONTS.display,
                fontSize: 120,
                fontWeight: 700,
                color: COLORS.glow,
                lineHeight: 1,
                textShadow: `0 0 30px ${COLORS.glow}66`,
              }}
            >
              {heartbeat.p2Bpm}
            </div>
            <div
              style={{
                fontFamily: FONTS.body,
                fontSize: 24,
                color: COLORS.glow,
                marginTop: 4,
                opacity: 0.6,
              }}
            >
              BPM
            </div>
          </div>
        </div>

        {/* Waveform visualization */}
        <div
          style={{
            width: svgWidth + 40,
            padding: "20px 20px",
            borderRadius: 12,
            background: `linear-gradient(180deg, ${COLORS.primary}11, transparent)`,
            border: `1px solid ${COLORS.primary}33`,
          }}
        >
          <svg
            width={svgWidth}
            height={svgHeight}
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            style={{ display: "block" }}
          >
            {/* Center line */}
            <line
              x1="0"
              y1={yCenter}
              x2={svgWidth}
              y2={yCenter}
              stroke={COLORS.primary}
              strokeWidth="1"
              strokeDasharray="8 6"
              opacity="0.3"
            />

            {/* Player 2 waveform (behind) */}
            {p2Points && (
              <polyline
                points={p2Points}
                fill="none"
                stroke={COLORS.glow}
                strokeWidth="3"
                strokeLinejoin="round"
                strokeLinecap="round"
                opacity="0.6"
              />
            )}

            {/* Player 1 waveform (front) */}
            {p1Points && (
              <polyline
                points={p1Points}
                fill="none"
                stroke={COLORS.accent}
                strokeWidth="3"
                strokeLinejoin="round"
                strokeLinecap="round"
                opacity="0.85"
              />
            )}
          </svg>

          {/* Legend */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: 40,
              marginTop: 12,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div
                style={{
                  width: 24,
                  height: 3,
                  backgroundColor: COLORS.accent,
                  borderRadius: 2,
                }}
              />
              <span
                style={{
                  fontFamily: FONTS.body,
                  fontSize: 20,
                  color: COLORS.accent,
                  opacity: 0.8,
                }}
              >
                You
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div
                style={{
                  width: 24,
                  height: 3,
                  backgroundColor: COLORS.glow,
                  borderRadius: 2,
                }}
              />
              <span
                style={{
                  fontFamily: FONTS.body,
                  fontSize: 20,
                  color: COLORS.glow,
                  opacity: 0.8,
                }}
              >
                Them
              </span>
            </div>
          </div>
        </div>

        {/* Sync caption */}
        <p
          style={{
            fontFamily: FONTS.display,
            fontSize: 36,
            fontStyle: "italic",
            color: COLORS.glow,
            textAlign: "center",
            margin: 0,
            opacity: 0.9,
          }}
        >
          {syncCaption}
        </p>
      </div>
    </KeepsakeCard>
  );
}
