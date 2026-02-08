import React from "react";
import { KeepsakeCard, COLORS, FONTS } from "./KeepsakeCard";

/**
 * DrawingCard — displays a merged collaborative drawing with a decorative frame.
 */

interface DrawingCardProps {
  drawingDataUrl: string;
  coupleName: string;
  date: string;
}

export function DrawingCard({
  drawingDataUrl,
  coupleName,
  date,
}: DrawingCardProps) {
  const frameSize = 800;
  const framePadding = 20;
  const cornerSize = 40;

  return (
    <KeepsakeCard
      title="Through Your Eyes"
      subtitle="A shared vision"
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
        }}
      >
        {/* Decorative frame */}
        <div
          style={{
            position: "relative",
            width: frameSize + framePadding * 2,
            height: frameSize + framePadding * 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* Outer glow */}
          <div
            style={{
              position: "absolute",
              inset: -8,
              borderRadius: 8,
              boxShadow: `0 0 40px ${COLORS.glow}33, 0 0 80px ${COLORS.accent}1A`,
            }}
          />

          {/* Border frame */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              border: `2px solid ${COLORS.primary}`,
              borderRadius: 4,
            }}
          />

          {/* Corner accents — top left */}
          <div
            style={{
              position: "absolute",
              top: -2,
              left: -2,
              width: cornerSize,
              height: cornerSize,
              borderTop: `3px solid ${COLORS.accent}`,
              borderLeft: `3px solid ${COLORS.accent}`,
            }}
          />
          {/* Corner accents — top right */}
          <div
            style={{
              position: "absolute",
              top: -2,
              right: -2,
              width: cornerSize,
              height: cornerSize,
              borderTop: `3px solid ${COLORS.accent}`,
              borderRight: `3px solid ${COLORS.accent}`,
            }}
          />
          {/* Corner accents — bottom left */}
          <div
            style={{
              position: "absolute",
              bottom: -2,
              left: -2,
              width: cornerSize,
              height: cornerSize,
              borderBottom: `3px solid ${COLORS.accent}`,
              borderLeft: `3px solid ${COLORS.accent}`,
            }}
          />
          {/* Corner accents — bottom right */}
          <div
            style={{
              position: "absolute",
              bottom: -2,
              right: -2,
              width: cornerSize,
              height: cornerSize,
              borderBottom: `3px solid ${COLORS.accent}`,
              borderRight: `3px solid ${COLORS.accent}`,
            }}
          />

          {/* Image */}
          <img
            src={drawingDataUrl}
            alt="Collaborative drawing"
            style={{
              width: frameSize,
              height: frameSize,
              objectFit: "contain",
              borderRadius: 2,
            }}
          />
        </div>

        {/* Caption */}
        <p
          style={{
            fontFamily: FONTS.display,
            fontSize: 36,
            fontStyle: "italic",
            color: COLORS.glow,
            marginTop: 48,
            textAlign: "center",
            opacity: 0.9,
          }}
        >
          Through Your Eyes
        </p>
        <p
          style={{
            fontFamily: FONTS.body,
            fontSize: 26,
            color: COLORS.text,
            marginTop: 8,
            textAlign: "center",
            opacity: 0.6,
          }}
        >
          Drawn together, seen apart
        </p>
      </div>
    </KeepsakeCard>
  );
}
