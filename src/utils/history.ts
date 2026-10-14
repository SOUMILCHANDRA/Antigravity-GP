import { TrackConfig } from '../types/track';

export interface HistoryEntry {
  action: string;
  timestamp: number;
  track: TrackConfig;
}

export class TrackHistory {
  private past: HistoryEntry[] = [];
  private present: HistoryEntry;
  private future: HistoryEntry[] = [];
  private maxHistory: number = 60;

  constructor(initialState: TrackConfig, initialAction: string = 'Initial Track') {
    this.present = {
      action: initialAction,
      timestamp: Date.now(),
      track: JSON.parse(JSON.stringify(initialState))
    };
  }

  public getPresent(): TrackConfig {
    return this.present.track;
  }

  public getPresentEntry(): HistoryEntry {
    return this.present;
  }

  public pushState(newState: TrackConfig, action: string = 'Edit Track'): void {
    if (JSON.stringify(this.present.track) === JSON.stringify(newState)) return;
    this.past.push(this.present);
    if (this.past.length > this.maxHistory) {
      this.past.shift();
    }
    this.present = {
      action,
      timestamp: Date.now(),
      track: JSON.parse(JSON.stringify(newState))
    };
    this.future = [];
  }

  public canUndo(): boolean {
    return this.past.length > 0;
  }

  public canRedo(): boolean {
    return this.future.length > 0;
  }

  public undo(): TrackConfig | null {
    if (!this.canUndo()) return null;
    const previous = this.past.pop()!;
    this.future.unshift(this.present);
    this.present = previous;
    return this.present.track;
  }

  public redo(): TrackConfig | null {
    if (!this.canRedo()) return null;
    const next = this.future.shift()!;
    this.past.push(this.present);
    this.present = next;
    return this.present.track;
  }

  public getEntries(): { past: HistoryEntry[]; present: HistoryEntry; future: HistoryEntry[] } {
    return {
      past: [...this.past],
      present: this.present,
      future: [...this.future]
    };
  }

  public jumpToPast(index: number): TrackConfig | null {
    if (index < 0 || index >= this.past.length) return null;
    const target = this.past[index];
    const undoneEntries = [this.present, ...this.future];
    const intermediatePast = this.past.slice(index + 1);
    this.past = this.past.slice(0, index);
    this.future = [...intermediatePast, ...undoneEntries];
    this.present = target;
    return this.present.track;
  }
}

