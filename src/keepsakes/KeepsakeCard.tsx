import React from "react";

/**
 * KeepsakeCard — base wrapper for all keepsake card types.
 * Renders a fixed 1080x1920 container designed for off-screen PNG capture.
 */

const COLORS = {
  background: "#0D0000",
  text: "#FFF0F0",
  primary: "#8B0000",
  accent: "#FF2D55",
  glow: "#FF6B8A",
} as const;

const FONTS = {
  display: "'Playfair Display', Georgia, serif",
  body: "'Cormorant Garamond', 'Garamond', serif",
} as const;

// Re-export design tokens for child components
export { COLORS, FONTS };

interface KeepsakeCardProps {
  title?: string;
  subtitle?: string;
  coupleName: string;
  date: string;
  children: React.ReactNode;
}

export function KeepsakeCard({
  title,
  subtitle,
  coupleName,
  date,
  children,
}: KeepsakeCardProps) {
  return (
    <div
      style={{
        width: 1080,
        height: 1920,
        backgroundColor: COLORS.background,
        color: COLORS.text,
        fontFamily: FONTS.body,
        display: "flex",
        flexDirection: "column",
        padding: 60,
        boxSizing: "border-box",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Subtle top-edge glow */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 4,
          background: `linear-gradient(90deg, transparent, ${COLORS.accent}, ${COLORS.glow}, ${COLORS.accent}, transparent)`,
        }}
      />

      {/* Header area */}
      <div
        style={{
          flexShrink: 0,
          textAlign: "center",
          marginBottom: 40,
          paddingTop: 20,
        }}
      >
        {/* Brand mark */}
        <div
          style={{
            fontFamily: FONTS.display,
            fontSize: 36,
            letterSpacing: 6,
            textTransform: "uppercase",
            color: COLORS.accent,
            marginBottom: 12,
            opacity: 0.7,
          }}
        >
          Just Us
        </div>

        {title && (
          <h1
            style={{
              fontFamily: FONTS.display,
              fontSize: 64,
              fontWeight: 700,
              margin: 0,
              lineHeight: 1.15,
              color: COLORS.text,
            }}
          >
            {title}
          </h1>
        )}

        {subtitle && (
          <p
            style={{
              fontFamily: FONTS.body,
              fontSize: 30,
              fontStyle: "italic",
              margin: "12px 0 0 0",
              color: COLORS.glow,
              opacity: 0.85,
            }}
          >
            {subtitle}
          </p>
        )}

        {/* Decorative divider */}
        <div
          style={{
            marginTop: 32,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 16,
          }}
        >
          <div
            style={{
              width: 120,
              height: 1,
              background: `linear-gradient(90deg, transparent, ${COLORS.primary})`,
            }}
          />
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              backgroundColor: COLORS.accent,
              boxShadow: `0 0 12px ${COLORS.glow}`,
            }}
          />
          <div
            style={{
              width: 120,
              height: 1,
              background: `linear-gradient(90deg, ${COLORS.primary}, transparent)`,
            }}
          />
        </div>
      </div>

      {/* Content area */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        {children}
      </div>

      {/* Footer */}
      <div
        style={{
          flexShrink: 0,
          textAlign: "center",
          paddingTop: 32,
          borderTop: `1px solid ${COLORS.primary}44`,
        }}
      >
        <div
          style={{
            fontFamily: FONTS.display,
            fontSize: 32,
            fontWeight: 600,
            color: COLORS.text,
            letterSpacing: 2,
          }}
        >
          {coupleName}
        </div>
        <div
          style={{
            fontFamily: FONTS.body,
            fontSize: 24,
            color: COLORS.glow,
            marginTop: 8,
            opacity: 0.7,
          }}
        >
          {date}
        </div>
      </div>

      {/* Bottom-edge glow */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 4,
          background: `linear-gradient(90deg, transparent, ${COLORS.accent}, ${COLORS.glow}, ${COLORS.accent}, transparent)`,
        }}
      />
    </div>
  );
}
