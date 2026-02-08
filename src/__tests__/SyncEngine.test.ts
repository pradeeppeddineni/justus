import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SyncEngine, type ConnectionStatus, type PlayerId } from '../core/SyncEngine';

// Mock PartySocket as a class
vi.mock('partysocket', () => {
  class MockPartySocket {
    private listeners: Record<string, ((...args: unknown[]) => void)[]> = {};

    constructor() {
      // no-op
    }

    addEventListener(event: string, handler: (...args: unknown[]) => void) {
      if (!this.listeners[event]) this.listeners[event] = [];
      this.listeners[event].push(handler);
    }

    send = vi.fn();
    close = vi.fn();
  }

  return { default: MockPartySocket };
});

describe('SyncEngine', () => {
  let statusChanges: ConnectionStatus[];
  let messages: Record<string, unknown>[];
  let playerAssignments: { player: PlayerId; state: Record<string, unknown> }[];

  beforeEach(() => {
    statusChanges = [];
    messages = [];
    playerAssignments = [];
  });

  function createEngine() {
    return new SyncEngine({
      host: 'localhost:1999',
      room: 'test-room',
      onStatusChange: (status) => statusChanges.push(status),
      onMessage: (message) => messages.push(message),
      onPlayerAssigned: (player, state) => playerAssignments.push({ player, state }),
    });
  }

  it('starts in disconnected state', () => {
    const engine = createEngine();
    expect(engine.status).toBe('disconnected');
    expect(engine.player).toBeNull();
  });

  it('sets status to connecting on connect', () => {
    const engine = createEngine();
    engine.connect();
    expect(statusChanges).toContain('connecting');
  });

  it('can disconnect after connect', () => {
    const engine = createEngine();
    engine.connect();
    engine.disconnect();
    expect(engine.status).toBe('disconnected');
    expect(statusChanges).toContain('disconnected');
  });

  it('does not error when sending while disconnected', () => {
    const engine = createEngine();
    expect(() => engine.send({ type: 'test' })).not.toThrow();
  });
});
