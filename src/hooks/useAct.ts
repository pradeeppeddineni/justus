import { useState, useEffect, useCallback, useMemo } from 'react';
import { StateMachine, type ActPhase, type ActState } from '../core/StateMachine';

interface UseActOptions {
  enabledActs?: string[];
}

export function useAct({ enabledActs }: UseActOptions = {}) {
  const machine = useMemo(() => new StateMachine(enabledActs), [enabledActs]);
  const [state, setState] = useState<ActState>(() => machine.state);

  useEffect(() => {
    const unsubscribe = machine.subscribe(setState);
    return unsubscribe;
  }, [machine]);

  const setAct = useCallback((act: string) => {
    machine.setAct(act);
  }, [machine]);

  const setPhase = useCallback((phase: ActPhase) => {
    machine.setPhase(phase);
  }, [machine]);

  const setBothConnected = useCallback((connected: boolean) => {
    machine.setBothConnected(connected);
  }, [machine]);

  const syncFromServer = useCallback((serverState: { currentAct: string; actPhase: ActPhase; players: { p1: boolean; p2: boolean } }) => {
    machine.syncFromServer(serverState);
  }, [machine]);

  return {
    currentAct: state.currentAct,
    actPhase: state.actPhase,
    bothConnected: state.bothConnected,
    setAct,
    setPhase,
    setBothConnected,
    syncFromServer,
    getActIndex: useCallback(() => machine.getActIndex(), [machine]),
    getTotalActs: useCallback(() => machine.getTotalActs(), [machine]),
    isFirstAct: useCallback(() => machine.isFirstAct(), [machine]),
    isLastAct: useCallback(() => machine.isLastAct(), [machine]),
  };
}
