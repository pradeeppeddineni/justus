interface ProgressDotsProps {
  totalActs: number;
  currentIndex: number;
}

export function ProgressDots({ totalActs, currentIndex }: ProgressDotsProps) {
  return (
    <div
      className="fixed bottom-0 left-0 right-0 flex justify-center gap-1.5 z-10"
      style={{
        paddingBottom: 'calc(env(safe-area-inset-bottom, var(--safe-area-bottom)) + 8px)',
      }}
    >
      {Array.from({ length: totalActs }, (_, i) => (
        <div
          key={i}
          className="rounded-full transition-opacity"
          style={{
            width: '4px',
            height: '4px',
            backgroundColor: 'var(--color-text)',
            opacity: i === currentIndex ? 0.4 : 0.1,
            transition: 'opacity 800ms ease',
          }}
        />
      ))}
    </div>
  );
}
