import { useEffect, useCallback, useState, lazy, Suspense } from 'react';
import type { JustUsConfig } from './config/types';
import { useSync } from './hooks/useSync';
import { useAct } from './hooks/useAct';
import { useAmbient } from './hooks/useAmbient';
import { FullscreenWrapper } from './components/Shell/FullscreenWrapper';
import { TransitionLayer } from './components/Shell/TransitionLayer';
import { ConnectionScreen } from './components/Shell/ConnectionScreen';
import { ProgressDots } from './components/Shell/ProgressDots';
import { GhostFragment } from './components/Shell/GhostFragment';
import { ShakeReveal } from './components/Shell/ShakeReveal';
import type { ActPhase } from './core/StateMachine';

// Lazy-loaded act components — each gets its own chunk
const Invitation = lazy(() => import('./components/acts/Act0_Invitation/Invitation').then(m => ({ default: m.Invitation })));
const TheLock = lazy(() => import('./components/acts/Act1_TheLock/TheLock').then(m => ({ default: m.TheLock })));
const KnowMe = lazy(() => import('./components/acts/Act2_KnowMe/KnowMe').then(m => ({ default: m.KnowMe })));
const LieDetector = lazy(() => import('./components/acts/Act2_5_LieDetector/LieDetector').then(m => ({ default: m.LieDetector })));
const ThroughYourEyes = lazy(() => import('./components/acts/Act3_ThroughYourEyes/ThroughYourEyes').then(m => ({ default: m.ThroughYourEyes })));
const Heartbeat = lazy(() => import('./components/acts/Act3_5_Heartbeat/Heartbeat').then(m => ({ default: m.Heartbeat })));
const TheUnsaid = lazy(() => import('./components/acts/Act4_TheUnsaid/TheUnsaid').then(m => ({ default: m.TheUnsaid })));
const RewriteHistory = lazy(() => import('./components/acts/Act4_5_RewriteHistory/RewriteHistory').then(m => ({ default: m.RewriteHistory })));
const ComeCloser = lazy(() => import('./components/acts/Act5_ComeCloser/ComeCloser').then(m => ({ default: m.ComeCloser })));
const Heat = lazy(() => import('./components/acts/Act5_5_Heat/Heat').then(m => ({ default: m.Heat })));
const OurMoment = lazy(() => import('./components/acts/Act5_75_OurMoment/OurMoment').then(m => ({ default: m.OurMoment })));
const ThePromise = lazy(() => import('./components/acts/Act6_ThePromise/ThePromise').then(m => ({ default: m.ThePromise })));
const TheGlitch = lazy(() => import('./components/acts/Act7_TheGlitch/TheGlitch').then(m => ({ default: m.TheGlitch })));
const SaveScreen = lazy(() => import('./components/acts/SaveScreen/SaveScreen').then(m => ({ default: m.SaveScreen })));

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

  const [showSaveScreen, setShowSaveScreen] = useState(false);

  // Ambient music — crossfades between moods per act
  useAmbient(currentAct);

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

  // Advance to the next act, or show save screen if all done
  const advanceAct = useCallback(() => {
    const acts = config.acts.enabled;
    const idx = acts.indexOf(currentAct);
    if (idx < acts.length - 1) {
      const nextAct = acts[idx + 1];
      send({ type: 'advance', next_act: nextAct });
      setAct(nextAct);
    } else {
      // All acts complete — show keepsakes
      setShowSaveScreen(true);
    }
  }, [config.acts.enabled, currentAct, send, setAct]);

  // Find ghost fragment for current act
  const ghostFragment = config.acts.ghost?.fragments.find(f => f.act === currentAct);

  // Render the current act component
  const renderAct = () => {
    // Invitation doesn't need player assignment — render it immediately
    if (currentAct === 'invitation') {
      return <Invitation config={config} onReady={advanceAct} />;
    }

    if (!player) return null;

    const actProps = { config, player, send, onMessage, onComplete: advanceAct };

    switch (currentAct) {
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

      <Suspense fallback={null}>
        {showSaveScreen ? (
          <SaveScreen config={config} />
        ) : (
          <TransitionLayer actKey={currentAct}>
            <div className="relative w-full h-full">
              {renderAct()}

              {/* Ghost fragment for current act */}
              {ghostFragment && <GhostFragment fragment={ghostFragment} />}
            </div>
          </TransitionLayer>
        )}
      </Suspense>

      {!showSaveScreen && (
        <ProgressDots totalActs={getTotalActs()} currentIndex={getActIndex()} />
      )}

      {/* Shake-to-reveal bonus content */}
      {config.acts.shake_moments && (
        <ShakeReveal
          currentAct={currentAct}
          currentPhase={actPhase}
          shakeMoments={config.acts.shake_moments}
        />
      )}

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
