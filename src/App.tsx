import { useEffect, useCallback } from 'react';
import type { JustUsConfig } from './config/types';
import { useSync } from './hooks/useSync';
import { useAct } from './hooks/useAct';
import { FullscreenWrapper } from './components/Shell/FullscreenWrapper';
import { TransitionLayer } from './components/Shell/TransitionLayer';
import { ConnectionScreen } from './components/Shell/ConnectionScreen';
import { ProgressDots } from './components/Shell/ProgressDots';
import { GhostFragment } from './components/Shell/GhostFragment';
import type { ActPhase } from './core/StateMachine';

// Placeholder act components — replaced as each act is built
function ActPlaceholder({ name }: { name: string }) {
  return (
    <div className="h-full w-full flex items-center justify-center">
      <p className="font-display text-warm text-title animate-breathe">{name}</p>
    </div>
  );
}

interface AppProps {
  config: JustUsConfig;
}

// PartyKit host — uses env var or defaults to localhost for dev
const PARTYKIT_HOST = import.meta.env.VITE_PARTYKIT_HOST ?? 'localhost:1999';

export default function App({ config }: AppProps) {
  const {
    status,
    player,
    partnerConnected,
    send,
    onMessage,
  } = useSync({
    host: PARTYKIT_HOST,
    room: config.meta.url_slug,
  });

  const {
    currentAct,
    actPhase,
    setAct,
    setPhase,
    syncFromServer,
    getActIndex,
    getTotalActs,
  } = useAct({ enabledActs: config.acts.enabled });

  // Sync state from server messages
  useEffect(() => {
    const unsub = onMessage((msg) => {
      if (msg.type === 'state_sync' || msg.type === 'player_assigned') {
        const state = (msg.state ?? msg) as {
          currentAct: string;
          actPhase: ActPhase;
          players: { p1: boolean; p2: boolean };
        };
        if (state.currentAct) {
          syncFromServer(state);
        }
      } else if (msg.type === 'advance') {
        setAct(msg.next_act as string);
      } else if (msg.type === 'phase_change') {
        setPhase(msg.phase as ActPhase);
      }
    });
    return unsub;
  }, [onMessage, syncFromServer, setAct, setPhase]);

  // Mark player ready for current act
  const markReady = useCallback(() => {
    send({ type: 'ready', act: currentAct });
  }, [send, currentAct]);

  // Find ghost fragment for current act
  const ghostFragment = config.acts.ghost?.fragments.find(f => f.act === currentAct);

  // Render the current act component
  const renderAct = () => {
    // Check if before valentines date — show invitation
    const valentinesDate = new Date(config.meta.valentines_date);
    if (currentAct === 'invitation' && new Date() < valentinesDate) {
      return <ActPlaceholder name="The Invitation" />;
    }

    // Map act names to placeholder components for now
    // Each will be replaced with the real component as built
    const actNames: Record<string, string> = {
      invitation: 'The Invitation',
      the_lock: 'The Lock',
      know_me: 'How Well Do You Know Me',
      lie_detector: 'The Lie Detector',
      through_your_eyes: 'Through Your Eyes',
      heartbeat: 'Heartbeat',
      the_unsaid: 'The Unsaid',
      rewrite_history: 'Rewrite History',
      come_closer: 'Come Closer',
      heat: 'Heat',
      our_moment: 'Our Moment',
      the_promise: 'The Promise',
      the_glitch: 'The Glitch',
    };

    return (
      <ActPlaceholder name={actNames[currentAct] ?? currentAct} />
    );
  };

  // Show connection screen if not both connected (skip for invitation which is solo)
  const needsBothPlayers = currentAct !== 'invitation';
  const showConnectionScreen = needsBothPlayers && (status !== 'connected' || !partnerConnected);

  return (
    <FullscreenWrapper>
      {showConnectionScreen && (
        <ConnectionScreen status={status} partnerConnected={partnerConnected} />
      )}

      <TransitionLayer actKey={currentAct}>
        <div className="relative w-full h-full">
          {renderAct()}

          {/* Ghost fragment for current act */}
          {ghostFragment && <GhostFragment fragment={ghostFragment} />}
        </div>
      </TransitionLayer>

      <ProgressDots totalActs={getTotalActs()} currentIndex={getActIndex()} />

      {/* Dev info — remove before production */}
      {import.meta.env.DEV && (
        <div
          className="fixed top-0 left-0 z-50 text-xs p-2 opacity-30"
          style={{ fontFamily: 'monospace', color: 'var(--color-text)' }}
        >
          {player ?? '...'} | {status} | {currentAct} | {actPhase}
          {actPhase === 'waiting' && partnerConnected && (
            <button
              onClick={markReady}
              className="ml-2 underline"
            >
              ready
            </button>
          )}
        </div>
      )}
    </FullscreenWrapper>
  );
}
