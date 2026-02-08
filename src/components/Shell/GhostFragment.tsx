import type { GhostFragment as GhostFragmentConfig } from '../../config/types';

interface GhostFragmentProps {
  fragment: GhostFragmentConfig;
}

export function GhostFragment({ fragment }: GhostFragmentProps) {
  const baseStyle: React.CSSProperties = {
    position: 'absolute',
    pointerEvents: 'none',
    userSelect: 'none',
    zIndex: 1,
  };

  switch (fragment.hide_method) {
    case 'opacity':
      return (
        <span
          style={{
            ...baseStyle,
            bottom: '12px',
            right: '8px',
            opacity: 0.04,
            fontSize: '10px',
            fontFamily: 'var(--font-body)',
            color: 'var(--color-text)',
          }}
          aria-hidden="true"
        >
          {fragment.fragment}
        </span>
      );

    case 'micro_text':
      return (
        <span
          style={{
            ...baseStyle,
            top: '50%',
            left: '4px',
            opacity: 0.06,
            fontSize: '2px',
            fontFamily: 'var(--font-body)',
            color: 'var(--color-text)',
            lineHeight: 1,
          }}
          aria-hidden="true"
        >
          {fragment.fragment}
        </span>
      );

    case 'particle':
      return (
        <span
          style={{
            ...baseStyle,
            top: '30%',
            right: '20%',
            width: '2px',
            height: '2px',
            borderRadius: '50%',
            backgroundColor: 'var(--color-glow)',
            opacity: 0.05,
          }}
          aria-hidden="true"
          data-ghost={fragment.fragment}
        />
      );

    case 'star':
      return (
        <span
          style={{
            ...baseStyle,
            top: '15%',
            left: '40%',
            opacity: 0.03,
            fontSize: '3px',
            fontFamily: 'var(--font-display)',
            color: 'var(--color-glow)',
          }}
          aria-hidden="true"
        >
          {fragment.fragment}
        </span>
      );

    case 'stroke':
      return (
        <svg
          style={{
            ...baseStyle,
            bottom: '20%',
            left: '10%',
            width: '12px',
            height: '12px',
            opacity: 0.04,
          }}
          viewBox="0 0 12 12"
          aria-hidden="true"
        >
          <text
            x="6"
            y="10"
            textAnchor="middle"
            fontSize="10"
            fill="var(--color-accent)"
            fontFamily="var(--font-body)"
          >
            {fragment.fragment}
          </text>
        </svg>
      );

    default:
      return null;
  }
}
