export type ActPhase = 'waiting' | 'active' | 'responding' | 'revealing' | 'complete';

export interface ActState {
  currentAct: string;
  actPhase: ActPhase;
  bothConnected: boolean;
}

const DEFAULT_ACT_ORDER = [
  'invitation',
  'the_lock',
  'know_me',
  'lie_detector',
  'through_your_eyes',
  'heartbeat',
  'the_unsaid',
  'rewrite_history',
  'come_closer',
  'heat',
  'our_moment',
  'the_promise',
  'the_glitch',
];

export class StateMachine {
  private _currentAct: string;
  private _actPhase: ActPhase;
  private _bothConnected: boolean;
  private enabledActs: string[];
  private listeners: Set<(state: ActState) => void>;

  constructor(enabledActs?: string[]) {
    this.enabledActs = enabledActs ?? DEFAULT_ACT_ORDER;
    this._currentAct = this.enabledActs[0] ?? 'invitation';
    this._actPhase = 'waiting';
    this._bothConnected = false;
    this.listeners = new Set();
  }

  get state(): ActState {
    return {
      currentAct: this._currentAct,
      actPhase: this._actPhase,
      bothConnected: this._bothConnected,
    };
  }

  get currentAct(): string {
    return this._currentAct;
  }

  get actPhase(): ActPhase {
    return this._actPhase;
  }

  get bothConnected(): boolean {
    return this._bothConnected;
  }

  subscribe(listener: (state: ActState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    const state = this.state;
    this.listeners.forEach(l => l(state));
  }

  setBothConnected(connected: boolean) {
    this._bothConnected = connected;
    this.notify();
  }

  setAct(act: string) {
    this._currentAct = act;
    this._actPhase = 'waiting';
    this.notify();
  }

  setPhase(phase: ActPhase) {
    this._actPhase = phase;
    this.notify();
  }

  getActIndex(): number {
    return this.enabledActs.indexOf(this._currentAct);
  }

  getTotalActs(): number {
    return this.enabledActs.length;
  }

  isFirstAct(): boolean {
    return this.getActIndex() === 0;
  }

  isLastAct(): boolean {
    return this.getActIndex() === this.enabledActs.length - 1;
  }

  // Sync state from server
  syncFromServer(serverState: { currentAct: string; actPhase: ActPhase; players: { p1: boolean; p2: boolean } }) {
    this._currentAct = serverState.currentAct;
    this._actPhase = serverState.actPhase;
    this._bothConnected = serverState.players.p1 && serverState.players.p2;
    this.notify();
  }
}
