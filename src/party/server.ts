import type * as Party from 'partykit/server';

// Act phases
type ActPhase = 'waiting' | 'active' | 'responding' | 'revealing' | 'complete';

// Player identity
type PlayerId = 'p1' | 'p2';

// Sync message types
interface JoinMessage {
  type: 'join';
  player: PlayerId;
}

interface ReadyMessage {
  type: 'ready';
  act: string;
}

interface AnswerMessage {
  type: 'answer';
  act: string;
  player: PlayerId;
  data: unknown;
}

interface DrawStrokeMessage {
  type: 'draw_stroke';
  points: { x: number; y: number }[];
  color: string;
}

interface HeartbeatDataMessage {
  type: 'heartbeat_data';
  bpm: number;
  waveform: number[];
}

interface ShakeMessage {
  type: 'shake';
  player: PlayerId;
}

interface TypingMessage {
  type: 'typing';
  act: string;
  player: PlayerId;
}

interface ProximityMessage {
  type: 'proximity';
  distance: number;
}

interface ExportRequestMessage {
  type: 'export_request';
}

interface PhotoMessage {
  type: 'photo';
  player: PlayerId;
  data: string; // base64
}

interface HeatChoiceMessage {
  type: 'heat_choice';
  player: PlayerId;
  round: number;
  choice: 'truth' | 'strip' | 'kiss' | 'intimate';
  answer?: string;
}

interface StarWordMessage {
  type: 'star_word';
  player: PlayerId;
  word: string;
}

interface UnsaidMessage {
  type: 'unsaid';
  player: PlayerId;
  message: string;
}

interface RewriteAnswerMessage {
  type: 'rewrite_answer';
  player: PlayerId;
  memoryIndex: number;
  answer: string;
}

interface LieDetectorGuessMessage {
  type: 'lie_detector_guess';
  player: PlayerId;
  round: number;
  guess: number; // index of chosen memory
  hesitationMs: number;
}

type SyncMessage =
  | JoinMessage
  | ReadyMessage
  | AnswerMessage
  | DrawStrokeMessage
  | HeartbeatDataMessage
  | ShakeMessage
  | TypingMessage
  | ProximityMessage
  | ExportRequestMessage
  | PhotoMessage
  | HeatChoiceMessage
  | StarWordMessage
  | UnsaidMessage
  | RewriteAnswerMessage
  | LieDetectorGuessMessage;

// Room state shape
interface RoomState {
  players: { p1: string | null; p2: string | null }; // connection IDs
  currentAct: string;
  actPhase: ActPhase;
  readyPlayers: Set<PlayerId>;
  answers: Record<string, { p1: unknown; p2: unknown }>;
  drawings: { p1: { x: number; y: number }[][]; p2: { x: number; y: number }[][] };
  starName: { p1Word: string; p2Word: string };
  unsaidMessages: { p1: string; p2: string };
  rewriteAnswers: Record<number, { p1: string; p2: string }>;
  heartbeatData: { p1: { bpm: number; waveform: number[] } | null; p2: { bpm: number; waveform: number[] } | null };
  heatChoices: { player: PlayerId; round: number; choice: string; answer?: string }[];
  lieDetectorGuesses: { player: PlayerId; round: number; guess: number; hesitationMs: number }[];
  photos: { p1: string | null; p2: string | null };
  startedAt: string;
  completedAt: string | null;
}

// Rate limiting
const RATE_LIMIT_WINDOW_MS = 1000;
const RATE_LIMIT_MAX_MESSAGES = 60;
const MAX_MESSAGE_SIZE = 10 * 1024; // 10KB
const MAX_PHOTO_SIZE = 1 * 1024 * 1024; // 1MB
const DISCONNECT_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

// Default act order
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

export default class JustUsServer implements Party.Server {
  state: RoomState;
  rateLimits: Map<string, { count: number; resetAt: number }>;
  disconnectTimers: Map<string, ReturnType<typeof setTimeout>>;

  constructor(readonly room: Party.Room) {
    this.state = this.createInitialState();
    this.rateLimits = new Map();
    this.disconnectTimers = new Map();
  }

  private createInitialState(): RoomState {
    return {
      players: { p1: null, p2: null },
      currentAct: DEFAULT_ACT_ORDER[0],
      actPhase: 'waiting',
      readyPlayers: new Set(),
      answers: {},
      drawings: { p1: [], p2: [] },
      starName: { p1Word: '', p2Word: '' },
      unsaidMessages: { p1: '', p2: '' },
      rewriteAnswers: {},
      heartbeatData: { p1: null, p2: null },
      heatChoices: [],
      lieDetectorGuesses: [],
      photos: { p1: null, p2: null },
      startedAt: new Date().toISOString(),
      completedAt: null,
    };
  }

  private getPlayerByConnection(connectionId: string): PlayerId | null {
    if (this.state.players.p1 === connectionId) return 'p1';
    if (this.state.players.p2 === connectionId) return 'p2';
    return null;
  }

  private getOtherPlayer(player: PlayerId): PlayerId {
    return player === 'p1' ? 'p2' : 'p1';
  }

  private broadcast(message: object) {
    this.room.broadcast(JSON.stringify(message));
  }

  private sendTo(connectionId: string, message: object) {
    const connection = [...this.room.getConnections()].find(c => c.id === connectionId);
    if (connection) {
      connection.send(JSON.stringify(message));
    }
  }

  private sendToPlayer(player: PlayerId, message: object) {
    const connectionId = this.state.players[player];
    if (connectionId) {
      this.sendTo(connectionId, message);
    }
  }

  private sendToOther(player: PlayerId, message: object) {
    this.sendToPlayer(this.getOtherPlayer(player), message);
  }

  private checkRateLimit(connectionId: string): boolean {
    const now = Date.now();
    const limit = this.rateLimits.get(connectionId);

    if (!limit || now > limit.resetAt) {
      this.rateLimits.set(connectionId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
      return true;
    }

    limit.count++;
    if (limit.count > RATE_LIMIT_MAX_MESSAGES) {
      return false;
    }
    return true;
  }

  private getNextAct(): string | null {
    const currentIndex = DEFAULT_ACT_ORDER.indexOf(this.state.currentAct);
    if (currentIndex === -1 || currentIndex >= DEFAULT_ACT_ORDER.length - 1) {
      return null;
    }
    return DEFAULT_ACT_ORDER[currentIndex + 1];
  }

  private advanceAct() {
    const nextAct = this.getNextAct();
    if (nextAct) {
      this.state.currentAct = nextAct;
      this.state.actPhase = 'waiting';
      this.state.readyPlayers = new Set();
      this.broadcast({ type: 'advance', next_act: nextAct });
    } else {
      this.state.completedAt = new Date().toISOString();
      this.broadcast({ type: 'experience_complete' });
    }
  }

  private setPhase(phase: ActPhase) {
    this.state.actPhase = phase;
    this.broadcast({ type: 'phase_change', act: this.state.currentAct, phase });
  }

  private bothPlayersConnected(): boolean {
    return this.state.players.p1 !== null && this.state.players.p2 !== null;
  }

  private getStateSnapshot() {
    return {
      type: 'state_sync',
      players: {
        p1: this.state.players.p1 !== null,
        p2: this.state.players.p2 !== null,
      },
      currentAct: this.state.currentAct,
      actPhase: this.state.actPhase,
      answers: this.state.answers,
      starName: this.state.starName,
      unsaidMessages: this.state.unsaidMessages,
      rewriteAnswers: this.state.rewriteAnswers,
      heartbeatData: this.state.heartbeatData,
      heatChoices: this.state.heatChoices,
      startedAt: this.state.startedAt,
      completedAt: this.state.completedAt,
    };
  }

  onConnect(connection: Party.Connection) {
    // Max 2 connections
    if (this.state.players.p1 !== null && this.state.players.p2 !== null) {
      connection.send(JSON.stringify({ type: 'error', message: 'Room is full' }));
      connection.close();
      return;
    }

    // Assign player slot
    let assignedPlayer: PlayerId;
    if (this.state.players.p1 === null) {
      this.state.players.p1 = connection.id;
      assignedPlayer = 'p1';
    } else {
      this.state.players.p2 = connection.id;
      assignedPlayer = 'p2';
    }

    // Clear any disconnect timer for this slot
    const timerKey = assignedPlayer;
    const timer = this.disconnectTimers.get(timerKey);
    if (timer) {
      clearTimeout(timer);
      this.disconnectTimers.delete(timerKey);
    }

    // Send player assignment + full state
    connection.send(JSON.stringify({
      type: 'player_assigned',
      player: assignedPlayer,
      state: this.getStateSnapshot(),
    }));

    // Notify other player
    this.sendToOther(assignedPlayer, {
      type: 'partner_connected',
      player: assignedPlayer,
    });

    // If both connected, notify both
    if (this.bothPlayersConnected()) {
      this.broadcast({ type: 'both_connected' });
    }
  }

  onClose(connection: Party.Connection) {
    const player = this.getPlayerByConnection(connection.id);
    if (!player) return;

    // Notify other player
    this.sendToOther(player, {
      type: 'partner_disconnected',
      player,
    });

    // Set disconnect timer — hold state for 5 minutes
    const timer = setTimeout(() => {
      this.state.players[player] = null;
      this.disconnectTimers.delete(player);
    }, DISCONNECT_TIMEOUT_MS);

    this.disconnectTimers.set(player, timer);

    // Pause if in active phase
    if (this.state.actPhase === 'active' || this.state.actPhase === 'responding') {
      this.setPhase('waiting');
    }
  }

  onMessage(rawMessage: string, sender: Party.Connection) {
    // Rate limit
    if (!this.checkRateLimit(sender.id)) {
      sender.send(JSON.stringify({ type: 'error', message: 'Rate limited' }));
      return;
    }

    // Size check
    const isPhoto = rawMessage.includes('"type":"photo"');
    const maxSize = isPhoto ? MAX_PHOTO_SIZE : MAX_MESSAGE_SIZE;
    if (rawMessage.length > maxSize) {
      sender.send(JSON.stringify({ type: 'error', message: 'Message too large' }));
      return;
    }

    let message: SyncMessage;
    try {
      message = JSON.parse(rawMessage) as SyncMessage;
    } catch {
      sender.send(JSON.stringify({ type: 'error', message: 'Invalid JSON' }));
      return;
    }

    if (!message.type) {
      sender.send(JSON.stringify({ type: 'error', message: 'Missing message type' }));
      return;
    }

    const player = this.getPlayerByConnection(sender.id);
    if (!player) {
      sender.send(JSON.stringify({ type: 'error', message: 'Not a registered player' }));
      return;
    }

    this.handleMessage(message, player, sender);
  }

  private handleMessage(message: SyncMessage, player: PlayerId, sender: Party.Connection) {
    switch (message.type) {
      case 'ready':
        this.handleReady(player, message.act);
        break;

      case 'answer':
        this.handleAnswer(player, message.act, message.data);
        break;

      case 'draw_stroke':
        this.handleDrawStroke(player, message.points, message.color);
        break;

      case 'heartbeat_data':
        this.handleHeartbeat(player, message.bpm, message.waveform);
        break;

      case 'shake':
        this.broadcast({ type: 'shake', player });
        break;

      case 'typing':
        this.sendToOther(player, { type: 'typing', act: message.act, player });
        break;

      case 'proximity':
        this.sendToOther(player, { type: 'proximity', distance: message.distance });
        break;

      case 'photo':
        this.handlePhoto(player, message.data);
        break;

      case 'heat_choice':
        this.handleHeatChoice(player, message.round, message.choice, message.answer);
        break;

      case 'star_word':
        this.handleStarWord(player, message.word);
        break;

      case 'unsaid':
        this.handleUnsaid(player, message.message);
        break;

      case 'rewrite_answer':
        this.handleRewriteAnswer(player, message.memoryIndex, message.answer);
        break;

      case 'lie_detector_guess':
        this.handleLieDetectorGuess(player, message.round, message.guess, message.hesitationMs);
        break;

      case 'export_request':
        this.handleExport(sender);
        break;

      default:
        sender.send(JSON.stringify({ type: 'error', message: 'Unknown message type' }));
    }
  }

  private handleReady(player: PlayerId, act: string) {
    if (act !== this.state.currentAct) return;

    this.state.readyPlayers.add(player);

    if (this.state.readyPlayers.has('p1') && this.state.readyPlayers.has('p2')) {
      this.state.readyPlayers = new Set();
      this.setPhase('active');
    } else {
      this.sendToOther(player, { type: 'partner_ready', act });
    }
  }

  private handleAnswer(player: PlayerId, act: string, data: unknown) {
    if (!this.state.answers[act]) {
      this.state.answers[act] = { p1: null, p2: null };
    }
    this.state.answers[act][player] = data;

    // Check if both answered
    if (this.state.answers[act].p1 !== null && this.state.answers[act].p2 !== null) {
      this.setPhase('revealing');
      this.broadcast({
        type: 'reveal',
        act,
        answers: this.state.answers[act],
      });
    } else {
      this.sendToOther(player, { type: 'partner_answered', act });
    }
  }

  private handleDrawStroke(player: PlayerId, points: { x: number; y: number }[], color: string) {
    this.state.drawings[player].push(points);
    this.sendToOther(player, { type: 'draw_stroke', points, color, player });
  }

  private handleHeartbeat(player: PlayerId, bpm: number, waveform: number[]) {
    this.state.heartbeatData[player] = { bpm, waveform };

    if (this.state.heartbeatData.p1 && this.state.heartbeatData.p2) {
      this.setPhase('revealing');
      this.broadcast({
        type: 'heartbeat_reveal',
        p1: this.state.heartbeatData.p1,
        p2: this.state.heartbeatData.p2,
      });
    } else {
      this.sendToOther(player, { type: 'partner_heartbeat_ready' });
    }
  }

  private handlePhoto(player: PlayerId, data: string) {
    // Don't store — relay directly
    this.sendToOther(player, { type: 'photo', player, data });
    // Track that photo was taken (without storing the data)
    this.state.photos[player] = 'taken';
  }

  private handleHeatChoice(player: PlayerId, round: number, choice: string, answer?: string) {
    this.state.heatChoices.push({ player, round, choice, answer });
    this.sendToOther(player, {
      type: 'heat_choice',
      player,
      round,
      choice,
      answer,
    });
  }

  private handleStarWord(player: PlayerId, word: string) {
    this.state.starName[player === 'p1' ? 'p1Word' : 'p2Word'] = word;

    if (this.state.starName.p1Word && this.state.starName.p2Word) {
      this.setPhase('revealing');
      this.broadcast({
        type: 'star_named',
        name: `${this.state.starName.p1Word} ${this.state.starName.p2Word}`,
        p1Word: this.state.starName.p1Word,
        p2Word: this.state.starName.p2Word,
      });
    } else {
      this.sendToOther(player, { type: 'partner_star_word', player });
    }
  }

  private handleUnsaid(player: PlayerId, message: string) {
    this.state.unsaidMessages[player] = message;

    if (this.state.unsaidMessages.p1 && this.state.unsaidMessages.p2) {
      this.setPhase('revealing');
      // Send each player their partner's message only
      this.sendToPlayer('p1', {
        type: 'unsaid_reveal',
        message: this.state.unsaidMessages.p2,
      });
      this.sendToPlayer('p2', {
        type: 'unsaid_reveal',
        message: this.state.unsaidMessages.p1,
      });
    } else {
      this.sendToOther(player, { type: 'partner_unsaid_ready' });
    }
  }

  private handleRewriteAnswer(player: PlayerId, memoryIndex: number, answer: string) {
    if (!this.state.rewriteAnswers[memoryIndex]) {
      this.state.rewriteAnswers[memoryIndex] = { p1: '', p2: '' };
    }
    this.state.rewriteAnswers[memoryIndex][player] = answer;

    const entry = this.state.rewriteAnswers[memoryIndex];
    if (entry.p1 && entry.p2) {
      this.broadcast({
        type: 'rewrite_reveal',
        memoryIndex,
        answers: entry,
      });
    } else {
      this.sendToOther(player, { type: 'partner_rewrite_ready', memoryIndex });
    }
  }

  private handleLieDetectorGuess(player: PlayerId, round: number, guess: number, hesitationMs: number) {
    this.state.lieDetectorGuesses.push({ player, round, guess, hesitationMs });
    this.broadcast({
      type: 'lie_detector_result',
      player,
      round,
      guess,
      hesitationMs,
    });
  }

  private handleExport(sender: Party.Connection) {
    sender.send(JSON.stringify({
      type: 'export_data',
      session: {
        answers: this.state.answers,
        drawings: this.state.drawings,
        starName: this.state.starName,
        unsaidMessages: this.state.unsaidMessages,
        rewriteAnswers: this.state.rewriteAnswers,
        heartbeatData: this.state.heartbeatData,
        heatChoices: this.state.heatChoices,
        lieDetectorGuesses: this.state.lieDetectorGuesses,
        startedAt: this.state.startedAt,
        completedAt: this.state.completedAt,
      },
    }));
  }
}
