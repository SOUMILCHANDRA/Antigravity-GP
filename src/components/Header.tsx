import React from 'react';
import { Activity, ArrowDownToLine, CircleHelp, DraftingCompass, Flag, Layers3, Upload, Volume2, VolumeX } from 'lucide-react';
import { AppMode, TrackConfig, StudioStage, EditorViewMode } from '../types/track';

interface HeaderProps {
  mode: AppMode;
  setMode: (mode: AppMode) => void;
  currentTrack: TrackConfig;
  isMuted: boolean;
  onToggleMute: () => void;
  onExportTrack: () => void;
  onImportTrack: (e: React.ChangeEvent<HTMLInputElement>) => void;
  circuitLength: number;
  studioStage?: StudioStage;
  onStageChange?: (stage: StudioStage) => void;
  viewMode?: EditorViewMode;
  onViewModeChange?: (viewMode: EditorViewMode) => void;
  onOpenShortcuts?: () => void;
  saveState?: 'saved' | 'saving' | 'error';
}

const stages: Array<{ id: StudioStage; number: string; title: string; sub: string }> = [
  { id: 'shape', number: '01', title: 'Shape', sub: 'Layout & geometry' },
  { id: 'dress', number: '02', title: 'Dress', sub: 'Venue & details' },
  { id: 'show', number: '03', title: 'Show', sub: 'Analysis & export' }
];

export const Header: React.FC<HeaderProps> = ({
  mode, setMode, currentTrack, isMuted, onToggleMute, onExportTrack, onImportTrack,
  circuitLength, studioStage = 'shape', onStageChange,
  viewMode = '2d', onViewModeChange, onOpenShortcuts, saveState = 'saved'
}) => {
  const isValidTrack = currentTrack.isClosed && currentTrack.nodes.length >= 3;
  const activeStageIndex = stages.findIndex(stage => stage.id === studioStage);

  return (
    <header className="app-header">
      <div className="header-brand">
        <div className="brand-mark"><Flag size={17} strokeWidth={2.2} /></div>
        <div className="brand-copy"><span>ANTIGRAVITY <b>GP</b></span><small>CIRCUIT ENGINEERING STUDIO</small></div>
      </div>

      <div className="header-project">
        <span className="project-eyebrow">CURRENT PROJECT</span>
        <strong title={currentTrack.name}>{currentTrack.name || 'Untitled circuit'}</strong>
        <div className="project-meta"><span>{currentTrack.isClosed ? 'LOOP CLOSED' : 'LAYOUT IN PROGRESS'}</span><span>·</span><span>{circuitLength > 0 ? `${(circuitLength / 1000).toFixed(2)} KM` : 'NO DISTANCE'}</span><span className={`save-state save-state-${saveState}`}><i />{saveState === 'saving' ? 'Saving' : saveState === 'error' ? 'Export backup' : 'Saved'}</span></div>
      </div>

      {mode === 'builder' && <nav className="studio-stage-nav" aria-label="Circuit studio stages">
        {stages.map((stage, index) => <React.Fragment key={stage.id}>
          {index > 0 && <span className={`stage-connector ${index <= activeStageIndex ? 'is-complete' : ''}`} aria-hidden="true" />}
          <button className={`stage-step ${studioStage === stage.id ? 'is-active' : ''} ${index < activeStageIndex ? 'is-complete' : ''}`} onClick={() => onStageChange?.(stage.id)} aria-current={studioStage === stage.id ? 'step' : undefined}>
            <span className="stage-index">{index < activeStageIndex ? '✓' : stage.number}</span>
            <span className="stage-label"><b>{stage.title}</b><small>{stage.sub}</small></span>
          </button>
        </React.Fragment>)}
      </nav>}

      <div className="header-right">
        {mode === 'builder' && <div className="view-switcher" role="group" aria-label="Editor view">
          {(['2d', 'split', '3d'] as EditorViewMode[]).map(view => <button key={view} className={viewMode === view ? 'is-active' : ''} onClick={() => onViewModeChange?.(view)} title={`${view.toUpperCase()} editor view`}>{view === 'split' ? <Layers3 size={14} /> : view.toUpperCase()}</button>)}
        </div>}
        <span className="header-divider" />
        <button className="header-icon-button" onClick={onToggleMute} title={isMuted ? 'Enable sound' : 'Mute sound'} aria-label={isMuted ? 'Enable sound' : 'Mute sound'}>{isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}</button>
        <button className="header-icon-button" onClick={onOpenShortcuts} title="Keyboard shortcuts" aria-label="Keyboard shortcuts"><CircleHelp size={16} /></button>
        {mode === 'builder' ? <div className="header-file-actions">
          <button className="header-secondary-button" onClick={onExportTrack} disabled={!currentTrack.nodes.length}><ArrowDownToLine size={15} /><span>Export</span></button>
          <label className="header-import-button" title="Import an Antigravity circuit JSON"><Upload size={15} /><span>Import</span><input type="file" accept=".json,application/json" onChange={onImportTrack} /></label>
        </div> : <button className="header-secondary-button return-studio-button" onClick={() => setMode('builder')}><DraftingCompass size={15} /><span>Back to studio</span></button>}
        <button className={`header-drive-button ${mode === 'race' ? 'is-driving' : ''}`} onClick={() => setMode(mode === 'race' ? 'builder' : 'race')} disabled={mode === 'builder' && !isValidTrack} title={!isValidTrack ? 'Close the circuit to start driving' : mode === 'race' ? 'Return to the studio' : 'Drive this circuit'}>
          {mode === 'race' ? <><Activity size={15} /><span>Driving</span></> : <><span>Drive circuit</span><span className="drive-arrow">↗</span></>}
        </button>
      </div>

    </header>
  );
};
