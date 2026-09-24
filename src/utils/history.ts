import { TrackConfig } from '../types/track';

export class TrackHistory {
  private past: TrackConfig[] = [];
  private present: TrackConfig;
  private future: TrackConfig[] = [];

  constructor(initialState: TrackConfig) {
    this.present = initialState;
  }

  public getPresent(): TrackConfig {
    return this.present;
  }

  public pushState(newState: TrackConfig): void {
    // Only push if different from current
    if (JSON.stringify(this.present) === JSON.stringify(newState)) return;
    this.past.push(this.present);
    this.present = newState;
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
    return this.present;
  }

  public redo(): TrackConfig | null {
    if (!this.canRedo()) return null;
    const next = this.future.shift()!;
    this.past.push(this.present);
    this.present = next;
    return this.present;
  }
}
