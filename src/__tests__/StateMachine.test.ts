import { describe, it, expect, vi } from 'vitest';
import { StateMachine } from '../core/StateMachine';

describe('StateMachine', () => {
  it('initializes with first act and waiting phase', () => {
    const sm = new StateMachine();
    expect(sm.currentAct).toBe('invitation');
    expect(sm.actPhase).toBe('waiting');
    expect(sm.bothConnected).toBe(false);
  });

  it('initializes with custom act list', () => {
    const sm = new StateMachine(['the_lock', 'know_me']);
    expect(sm.currentAct).toBe('the_lock');
    expect(sm.getTotalActs()).toBe(2);
  });

  it('tracks act index', () => {
    const sm = new StateMachine(['a', 'b', 'c']);
    expect(sm.getActIndex()).toBe(0);
    expect(sm.isFirstAct()).toBe(true);
    expect(sm.isLastAct()).toBe(false);

    sm.setAct('c');
    expect(sm.getActIndex()).toBe(2);
    expect(sm.isFirstAct()).toBe(false);
    expect(sm.isLastAct()).toBe(true);
  });

  it('resets phase to waiting on act change', () => {
    const sm = new StateMachine();
    sm.setPhase('active');
    expect(sm.actPhase).toBe('active');

    sm.setAct('know_me');
    expect(sm.actPhase).toBe('waiting');
  });

  it('notifies subscribers on state changes', () => {
    const sm = new StateMachine();
    const listener = vi.fn();

    sm.subscribe(listener);
    sm.setPhase('active');

    expect(listener).toHaveBeenCalledWith({
      currentAct: 'invitation',
      actPhase: 'active',
      bothConnected: false,
    });
  });

  it('unsubscribes correctly', () => {
    const sm = new StateMachine();
    const listener = vi.fn();

    const unsub = sm.subscribe(listener);
    unsub();
    sm.setPhase('active');

    expect(listener).not.toHaveBeenCalled();
  });

  it('syncs from server state', () => {
    const sm = new StateMachine();
    sm.syncFromServer({
      currentAct: 'the_unsaid',
      actPhase: 'responding',
      players: { p1: true, p2: true },
    });

    expect(sm.currentAct).toBe('the_unsaid');
    expect(sm.actPhase).toBe('responding');
    expect(sm.bothConnected).toBe(true);
  });

  it('tracks both connected', () => {
    const sm = new StateMachine();
    expect(sm.bothConnected).toBe(false);

    sm.setBothConnected(true);
    expect(sm.bothConnected).toBe(true);
  });
});
