import { useState, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlowText } from '../../shared/GlowText';
import { PulseButton } from '../../shared/PulseButton';
import { ParticleField } from '../../shared/ParticleField';
import { useSession } from '../../../hooks/useSession';
import { downloadAllAsZip, downloadPng, captureCard } from '../../../core/ExportEngine';
import type { CardElement } from '../../../core/ExportEngine';
import type { JustUsConfig } from '../../../config/types';

// Lazy-load keepsake card components
import { QACard } from '../../../keepsakes/QACard';
import { DrawingCard } from '../../../keepsakes/DrawingCard';
import { HeartbeatCard } from '../../../keepsakes/HeartbeatCard';
import { UnsaidCard } from '../../../keepsakes/UnsaidCard';
import { RewriteCard } from '../../../keepsakes/RewriteCard';
import { HeatHighlightsCard } from '../../../keepsakes/HeatHighlightsCard';
import { StarCertificateCard } from '../../../keepsakes/StarCertificateCard';

interface SaveScreenProps {
  config: JustUsConfig;
}

type DownloadState = 'idle' | 'generating' | 'done';

interface CardInfo {
  id: string;
  label: string;
  preview: React.ReactNode;
}

export function SaveScreen({ config }: SaveScreenProps) {
  const { data, hasData } = useSession();
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [downloadState, setDownloadState] = useState<DownloadState>('idle');
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const cardRefsMap = useRef<Map<string, HTMLDivElement>>(new Map());

  const coupleName = config.meta.couple_name;
  const date = config.meta.valentines_date;

  // Build list of available cards based on session data
  const cards = useMemo(() => {
    const available: CardInfo[] = [];

    if (hasData('qaEntries')) {
      available.push({
        id: 'qa',
        label: 'Know Me',
        preview: <QACard entries={data.qaEntries} coupleName={coupleName} date={date} />,
      });
    }

    if (hasData('drawings')) {
      data.drawings.forEach((drawing, i) => {
        available.push({
          id: `drawing-${i}`,
          label: `Drawing ${i + 1}`,
          preview: <DrawingCard drawingDataUrl={drawing.dataUrl} coupleName={coupleName} date={date} />,
        });
      });
    }

    if (hasData('heartbeat') && data.heartbeat) {
      available.push({
        id: 'heartbeat',
        label: 'Heartbeat',
        preview: <HeartbeatCard heartbeat={data.heartbeat} coupleName={coupleName} date={date} />,
      });
    }

    if (hasData('unsaid') && data.unsaid) {
      available.push({
        id: 'unsaid',
        label: 'The Unsaid',
        preview: <UnsaidCard unsaid={data.unsaid} coupleName={coupleName} date={date} />,
      });
    }

    if (hasData('rewriteEntries')) {
      data.rewriteEntries.forEach((entry, i) => {
        available.push({
          id: `rewrite-${i}`,
          label: `Memory ${i + 1}`,
          preview: <RewriteCard entry={entry} coupleName={coupleName} date={date} />,
        });
      });
    }

    if (hasData('heatEntries')) {
      const truths = data.heatEntries.filter(e => e.choice === 'truth' && e.answer);
      if (truths.length > 0) {
        available.push({
          id: 'heat',
          label: 'Heat',
          preview: <HeatHighlightsCard entries={truths} coupleName={coupleName} date={date} />,
        });
      }
    }

    if (hasData('star') && data.star) {
      available.push({
        id: 'star',
        label: 'Your Star',
        preview: <StarCertificateCard star={data.star} coupleName={coupleName} date={date} />,
      });
    }

    return available;
  }, [data, hasData, coupleName, date]);

  const registerCardRef = useCallback((id: string, el: HTMLDivElement | null) => {
    if (el) {
      cardRefsMap.current.set(id, el);
    } else {
      cardRefsMap.current.delete(id);
    }
  }, []);

  const handleDownloadAll = useCallback(async () => {
    setDownloadState('generating');
    const cardElements: CardElement[] = [];

    for (const card of cards) {
      const el = cardRefsMap.current.get(card.id);
      if (el) {
        cardElements.push({ id: card.id, label: card.label, element: el });
      }
    }

    await downloadAllAsZip(
      cardElements,
      `justus-${coupleName.toLowerCase().replace(/\s+/g, '-')}.zip`,
      (current, total) => setProgress({ current, total }),
    );

    setDownloadState('done');
    setTimeout(() => setDownloadState('idle'), 3000);
  }, [cards, coupleName]);

  const handleDownloadSingle = useCallback(async (cardId: string) => {
    const el = cardRefsMap.current.get(cardId);
    if (!el) return;

    try {
      const dataUrl = await captureCard(el);
      downloadPng(dataUrl, `justus-${cardId}.png`);
    } catch {
      // Failed to capture
    }
  }, []);

  return (
    <div className="relative h-full w-full flex flex-col items-center overflow-y-auto overflow-x-hidden">
      <ParticleField count={30} speed={0.06} drift="up" />

      <div className="relative z-10 flex flex-col items-center gap-8 px-6 py-12 max-w-sm w-full">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.5 }}
          className="text-center"
        >
          <GlowText as="h1" className="text-title text-warm">
            Save Our Night
          </GlowText>
          <motion.p
            className="text-small text-warm mt-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            transition={{ delay: 1 }}
          >
            {cards.length} keepsakes from tonight
          </motion.p>
        </motion.div>

        {/* Card grid */}
        {cards.length > 0 && (
          <motion.div
            className="grid grid-cols-2 gap-3 w-full"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 1 }}
          >
            {cards.map((card, i) => (
              <motion.button
                key={card.id}
                className="relative overflow-hidden bg-transparent border cursor-pointer"
                style={{
                  aspectRatio: '9/16',
                  borderColor: selectedCard === card.id ? 'var(--color-accent)' : 'rgba(255,240,240,0.08)',
                  borderWidth: '1px',
                }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.1 }}
                onClick={() => setSelectedCard(selectedCard === card.id ? null : card.id)}
                whileTap={{ scale: 0.97 }}
              >
                {/* Thumbnail preview */}
                <div
                  className="absolute inset-0"
                  style={{
                    transform: 'scale(0.15)',
                    transformOrigin: 'top left',
                    width: '1080px',
                    height: '1920px',
                    pointerEvents: 'none',
                  }}
                >
                  <div ref={(el) => registerCardRef(card.id, el)}>
                    {card.preview}
                  </div>
                </div>

                {/* Label overlay */}
                <div
                  className="absolute bottom-0 left-0 right-0 p-2"
                  style={{
                    background: 'linear-gradient(transparent, rgba(13,0,0,0.9))',
                  }}
                >
                  <span
                    className="font-body text-warm"
                    style={{ fontSize: '11px', opacity: 0.7 }}
                  >
                    {card.label}
                  </span>
                </div>
              </motion.button>
            ))}
          </motion.div>
        )}

        {/* Selected card actions */}
        <AnimatePresence>
          {selectedCard && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="flex gap-4"
            >
              <PulseButton
                onClick={() => handleDownloadSingle(selectedCard)}
                variant="ghost"
              >
                save this
              </PulseButton>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Download all */}
        <motion.div
          className="flex flex-col items-center gap-3 mt-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
        >
          {downloadState === 'idle' && (
            <>
              <PulseButton onClick={handleDownloadAll}>
                download all
              </PulseButton>
              <p className="text-small text-warm" style={{ opacity: 0.3 }}>
                All keepsakes as a zip
              </p>
            </>
          )}

          {downloadState === 'generating' && (
            <div className="text-center">
              <p className="text-prompt text-warm animate-breathe">
                Generating...
              </p>
              {progress.total > 0 && (
                <p className="text-small text-warm mt-2" style={{ opacity: 0.4 }}>
                  {progress.current} / {progress.total}
                </p>
              )}
            </div>
          )}

          {downloadState === 'done' && (
            <motion.p
              className="text-prompt text-warm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.7 }}
            >
              Saved.
            </motion.p>
          )}
        </motion.div>

        {/* No data fallback */}
        {cards.length === 0 && (
          <motion.p
            className="text-prompt text-warm text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            transition={{ delay: 1 }}
          >
            No keepsakes yet — complete some acts first.
          </motion.p>
        )}

        {/* Footer */}
        <motion.p
          className="text-small text-warm text-center mt-8"
          style={{ opacity: 0.2 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.2 }}
          transition={{ delay: 2 }}
        >
          Just us. Always.
        </motion.p>
      </div>
    </div>
  );
}
