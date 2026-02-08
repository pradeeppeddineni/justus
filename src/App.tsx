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

// Act components
import { Invitation } from './components/acts/Act0_Invitation/Invitation';
import { TheLock } from './components/acts/Act1_TheLock/TheLock';
import { KnowMe } from './components/acts/Act2_KnowMe/KnowMe';
import { LieDetector } from './components/acts/Act2_5_LieDetector/LieDetector';
import { ThroughYourEyes } from './components/acts/Act3_ThroughYourEyes/ThroughYourEyes';
import { Heartbeat } from './components/acts/Act3_5_Heartbeat/Heartbeat';
import { TheUnsaid } from './components/acts/Act4_TheUnsaid/TheUnsaid';
import { RewriteHistory } from './components/acts/Act4_5_RewriteHistory/RewriteHistory';
import { ComeCloser } from './components/acts/Act5_ComeCloser/ComeCloser';
import { Heat } from './components/acts/Act5_5_Heat/Heat';
import { OurMoment } from './components/acts/Act5_75_OurMoment/OurMoment';
import { ThePromise } from './components/acts/Act6_ThePromise/ThePromise';
import { TheGlitch } from './components/acts/Act7_TheGlitch/TheGlitch';

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

  // Advance to the next act
  const advanceAct = useCallback(() => {
    const acts = config.acts.enabled;
    const idx = acts.indexOf(currentAct);
    if (idx < acts.length - 1) {
      const nextAct = acts[idx + 1];
      send({ type: 'advance', next_act: nextAct });
      setAct(nextAct);
    }
  }, [config.acts.enabled, currentAct, send, setAct]);

  // Find ghost fragment for current act
  const ghostFragment = config.acts.ghost?.fragments.find(f => f.act === currentAct);

  // Render the current act component
  const renderAct = () => {
    if (!player) return null;

    const actProps = { config, player, send, onMessage, onComplete: advanceAct };

    switch (currentAct) {
      case 'invitation':
        return <Invitation config={config} onReady={advanceAct} />;
      case 'the_lock':
        return <TheLock {...actProps} />;
      case 'know_me':
        return <KnowMe {...actProps} />;
      case 'lie_detector':
        return <LieDetector {...actProps} />;
      case 'through_your_eyes':
        return <ThroughYourEyes {...actProps} />;
      case 'heartbeat':
        return <Heartbeat {...actProps} />;
      case 'the_unsaid':
        return <TheUnsaid {...actProps} />;
      case 'rewrite_history':
        return <RewriteHistory {...actProps} />;
      case 'come_closer':
        return <ComeCloser {...actProps} />;
      case 'heat':
        return <Heat {...actProps} />;
      case 'our_moment':
        return <OurMoment {...actProps} />;
      case 'the_promise':
        return <ThePromise {...actProps} />;
      case 'the_glitch':
        return <TheGlitch config={config} player={player} onComplete={advanceAct} />;
      default:
        return null;
    }
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
