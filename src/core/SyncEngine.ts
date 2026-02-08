import PartySocket from 'partysocket';

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'reconnecting';
export type PlayerId = 'p1' | 'p2';

export interface SyncEngineOptions {
  host: string;
  room: string;
  onMessage: (message: Record<string, unknown>) => void;
  onStatusChange: (status: ConnectionStatus) => void;
  onPlayerAssigned: (player: PlayerId, state: Record<string, unknown>) => void;
}

export class SyncEngine {
  private socket: PartySocket | null = null;
  private options: SyncEngineOptions;
  private _status: ConnectionStatus = 'disconnected';
  private _player: PlayerId | null = null;

  constructor(options: SyncEngineOptions) {
    this.options = options;
  }

  get status(): ConnectionStatus {
    return this._status;
  }

  get player(): PlayerId | null {
    return this._player;
  }

  connect() {
    this.setStatus('connecting');

    this.socket = new PartySocket({
      host: this.options.host,
      room: this.options.room,
    });

    this.socket.addEventListener('open', () => {
      this.setStatus('connected');
    });

    this.socket.addEventListener('message', (event) => {
      try {
        const message = JSON.parse(event.data as string);

        if (message.type === 'player_assigned') {
          this._player = message.player as PlayerId;
          this.options.onPlayerAssigned(message.player, message.state);
          return;
        }

        this.options.onMessage(message);
      } catch {
        // Ignore malformed messages
      }
    });

    this.socket.addEventListener('close', () => {
      this.setStatus('reconnecting');
    });

    this.socket.addEventListener('error', () => {
      this.setStatus('reconnecting');
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.setStatus('disconnected');
  }

  send(message: Record<string, unknown>) {
    if (this.socket && this._status === 'connected') {
      this.socket.send(JSON.stringify(message));
    }
  }

  private setStatus(status: ConnectionStatus) {
    this._status = status;
    this.options.onStatusChange(status);
  }
}
