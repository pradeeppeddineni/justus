import { useState, useEffect, useRef, useCallback } from 'react';
import { SyncEngine, type ConnectionStatus, type PlayerId } from '../core/SyncEngine';

interface SyncState {
  status: ConnectionStatus;
  player: PlayerId | null;
  partnerConnected: boolean;
  serverState: Record<string, unknown> | null;
}

interface UseSyncOptions {
  host: string;
  room: string;
  enabled?: boolean;
}

export function useSync({ host, room, enabled = true }: UseSyncOptions) {
  const [state, setState] = useState<SyncState>({
    status: 'disconnected',
    player: null,
    partnerConnected: false,
    serverState: null,
  });

  const engineRef = useRef<SyncEngine | null>(null);
  const messageHandlersRef = useRef<Set<(message: Record<string, unknown>) => void>>(new Set());

  useEffect(() => {
    if (!enabled) return;

    const engine = new SyncEngine({
      host,
      room,
      onStatusChange: (status) => {
        setState(prev => ({ ...prev, status }));
      },
      onPlayerAssigned: (player, serverState) => {
        setState(prev => ({
          ...prev,
          player,
          serverState: serverState as Record<string, unknown>,
        }));
      },
      onMessage: (message) => {
        // Handle built-in messages
        if (message.type === 'partner_connected' || message.type === 'both_connected') {
          setState(prev => ({ ...prev, partnerConnected: true }));
        } else if (message.type === 'partner_disconnected') {
          setState(prev => ({ ...prev, partnerConnected: false }));
        }

        // Forward to all registered handlers
        messageHandlersRef.current.forEach(handler => handler(message));
      },
    });

    engineRef.current = engine;
    engine.connect();

    return () => {
      engine.disconnect();
      engineRef.current = null;
    };
  }, [host, room, enabled]);

  const send = useCallback((message: Record<string, unknown>) => {
    engineRef.current?.send(message);
  }, []);

  const onMessage = useCallback((handler: (message: Record<string, unknown>) => void) => {
    messageHandlersRef.current.add(handler);
    return () => {
      messageHandlersRef.current.delete(handler);
    };
  }, []);

  return {
    ...state,
    send,
    onMessage,
  };
}
