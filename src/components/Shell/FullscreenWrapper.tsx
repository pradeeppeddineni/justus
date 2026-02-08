import { useCallback, useState, type ReactNode } from 'react';
import { useFullscreen } from '../../hooks/useFullscreen';

interface FullscreenWrapperProps {
  children: ReactNode;
}

export function FullscreenWrapper({ children }: FullscreenWrapperProps) {
  const { isFullscreen, requestFullscreen } = useFullscreen();
  const [hasInteracted, setHasInteracted] = useState(false);

  const handleFirstTap = useCallback(() => {
    if (!hasInteracted) {
      setHasInteracted(true);
      requestFullscreen();
    }
  }, [hasInteracted, requestFullscreen]);

  return (
    <div
      className="fixed inset-0 w-full h-full bg-surface overflow-hidden"
      style={{
        height: '100dvh',
        paddingTop: 'env(safe-area-inset-top, var(--safe-area-top))',
        paddingBottom: 'env(safe-area-inset-bottom, var(--safe-area-bottom))',
      }}
      onClick={!isFullscreen ? handleFirstTap : undefined}
    >
      {children}
    </div>
  );
}
