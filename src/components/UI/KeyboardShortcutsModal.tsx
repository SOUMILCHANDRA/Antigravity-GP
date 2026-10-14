import React from 'react';
import { X, Keyboard } from 'lucide-react';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ShortcutItem {
  keys: string[];
  description: string;
}

interface ShortcutSection {
  title: string;
  items: ShortcutItem[];
}

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({
  isOpen,
  onClose
}) => {
  if (!isOpen) return null;

  const sections: ShortcutSection[] = [
    {
      title: 'Studio & Drawing Tools',
      items: [
        { keys: ['P'], description: 'Pen / Draw mode (click to place points)' },
        { keys: ['E'], description: 'Edit / Select mode (drag points, click edge to split)' },
        { keys: ['X'], description: 'Erase mode (click points to delete)' },
        { keys: ['Space', '+ Drag'], description: 'Pan viewport / Hand tool' },
        { keys: ['F'], description: 'Zoom to fit circuit into view' },
        { keys: ['W', 'A', 'S', 'D'], description: 'Pan canvas viewport' },
        { keys: ['Shift', '+ Click'], description: 'Snap straight line angle to 15° increments' },
        { keys: ['Shift', '+ Arrow'], description: 'Nudge selected node 10 meters' },
        { keys: ['Arrow Keys'], description: 'Nudge selected node 1 meter' },
        { keys: ['Del', 'Backspace'], description: 'Delete selected node(s)' },
        { keys: ['Ctrl', '+ A'], description: 'Select all nodes' },
        { keys: ['L'], description: 'Lock / Unlock selected node position' },
        { keys: ['Ctrl', '+ Z'], description: 'Undo last change' },
        { keys: ['Ctrl', '+ Shift', '+ Z'], description: 'Redo change' }
      ]
    },
    {
      title: 'Studio Stages & Views',
      items: [
        { keys: ['1'], description: 'Switch to Stage 1: SHAPE (Geometry, Banking, Runoff)' },
        { keys: ['2'], description: 'Switch to Stage 2: DRESS (Curbs, Pit Lane, Facilities)' },
        { keys: ['3'], description: 'Switch to Stage 3: SHOW (Telemetry, Flythrough, Export)' },
        { keys: ['V'], description: 'Cycle View Modes (2D Canvas / Split View / 3D Orbit)' },
        { keys: ['H'], description: 'Toggle Visual History stack panel' },
        { keys: ['?'], description: 'Open this Keyboard Shortcuts cheatsheet' }
      ]
    },
    {
      title: 'Grand Prix Drive Mode',
      items: [
        { keys: ['W', '↑'], description: 'Throttle / Accelerate' },
        { keys: ['S', '↓', 'Space'], description: 'Brake / Reverse' },
        { keys: ['A', 'D', '←', '→'], description: 'Steer Left / Right' },
        { keys: ['R'], description: 'Single Authoritative Reset vehicle to track' },
        { keys: ['C'], description: 'Cycle 3D camera (Chase / Cockpit / Overhead)' },
        { keys: ['G'], description: 'Open Vehicle Garage & select competitor car' }
      ]
    }
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-[#0F172A] border border-slate-700/80 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-700/60 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30">
              <Keyboard className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-wide">
                Keyboard Shortcuts Cheatsheet
              </h2>
              <p className="text-[11px] text-slate-400 font-mono">
                Press <kbd className="px-1 py-0.5 rounded bg-slate-800 text-cyan-300 font-bold border border-slate-700">?</kbd> at any time to toggle
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Shortcuts Sections */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {sections.map((section) => (
            <div key={section.title} className="flex flex-col gap-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400 font-mono border-b border-slate-800 pb-1">
                {section.title}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {section.items.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 rounded-lg bg-slate-900/60 border border-slate-800/80 text-xs"
                  >
                    <span className="text-slate-300 font-sans pr-2">{item.description}</span>
                    <div className="flex items-center gap-1 shrink-0 font-mono">
                      {item.keys.map((k, kIdx) => (
                        <kbd
                          key={kIdx}
                          className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-600 text-slate-200 text-[10px] font-bold shadow-sm"
                        >
                          {k}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between text-[11px] font-mono text-slate-400">
          <span>Antigravity GP Studio v3</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold transition-all text-xs"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
};
