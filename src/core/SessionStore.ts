/**
 * SessionStore — collects data from all acts for keepsake generation.
 * Singleton that acts write to as they complete.
 */

export interface QAEntry {
  question: string;
  category: string;
  p1Answer: string;
  p2Answer: string;
}

export interface LieDetectorEntry {
  round: number;
  correct: boolean;
  hesitationMs: number;
  roast: string;
}

export interface DrawingData {
  round: number;
  dataUrl: string; // merged canvas as data URL
}

export interface HeartbeatData {
  p1Bpm: number;
  p2Bpm: number;
  p1Waveform: number[];
  p2Waveform: number[];
}

export interface UnsaidData {
  p1Message: string;
  p2Message: string;
}

export interface RewriteEntry {
  memoryDescription: string;
  memoryDate: string;
  p1Answer: string;
  p2Answer: string;
}

export interface HeatEntry {
  round: number;
  intensity: string;
  choice: string;
  answer?: string;
}

export interface PhotoData {
  p1Photo: string | null; // data URL
  p2Photo: string | null;
}

export interface StarData {
  p1Word: string;
  p2Word: string;
  name: string;
}

export interface SessionData {
  qaEntries: QAEntry[];
  lieDetectorEntries: LieDetectorEntry[];
  drawings: DrawingData[];
  heartbeat: HeartbeatData | null;
  unsaid: UnsaidData | null;
  rewriteEntries: RewriteEntry[];
  heatEntries: HeatEntry[];
  photos: PhotoData | null;
  star: StarData | null;
}

class SessionStoreImpl {
  private data: SessionData = {
    qaEntries: [],
    lieDetectorEntries: [],
    drawings: [],
    heartbeat: null,
    unsaid: null,
    rewriteEntries: [],
    heatEntries: [],
    photos: null,
    star: null,
  };

  private listeners: Array<() => void> = [];

  addQAEntry(entry: QAEntry) {
    this.data.qaEntries.push(entry);
    this.notify();
  }

  addLieDetectorEntry(entry: LieDetectorEntry) {
    this.data.lieDetectorEntries.push(entry);
    this.notify();
  }

  addDrawing(drawing: DrawingData) {
    this.data.drawings.push(drawing);
    this.notify();
  }

  setHeartbeat(data: HeartbeatData) {
    this.data.heartbeat = data;
    this.notify();
  }

  setUnsaid(data: UnsaidData) {
    this.data.unsaid = data;
    this.notify();
  }

  addRewriteEntry(entry: RewriteEntry) {
    this.data.rewriteEntries.push(entry);
    this.notify();
  }

  addHeatEntry(entry: HeatEntry) {
    this.data.heatEntries.push(entry);
    this.notify();
  }

  setPhotos(data: PhotoData) {
    this.data.photos = data;
    this.notify();
  }

  setStar(data: StarData) {
    this.data.star = data;
    this.notify();
  }

  getData(): SessionData {
    return this.data;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach(l => l());
  }
}

export const sessionStore = new SessionStoreImpl();
