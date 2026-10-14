import React, { useState } from 'react';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  ChevronDown, 
  ChevronUp, 
  Compass, 
  Gauge, 
  Mountain, 
  Ruler, 
  Zap 
} from 'lucide-react';
import { TrackStats, ValidationIssue } from '../../utils/trackAnalysis';

interface TrackStatsPanelProps {
  stats: TrackStats;
  issues: ValidationIssue[];
  onSelectNode: (nodeId: string) => void;
}

export const TrackStatsPanel: React.FC<TrackStatsPanelProps> = ({
  stats,
  issues,
  onSelectNode
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [showIssuesList, setShowIssuesList] = useState<boolean>(false);

  const errorCount = issues.filter(i => i.type === 'error').length;
  const warningCount = issues.filter(i => i.type === 'warning').length;
  const hasIssues = issues.length > 0;

  return (
    <div className="absolute bottom-4 left-4 z-30 font-sans select-none animate-in fade-in slide-in-from-bottom duration-200">
      <div className="bg-[#101522]/95 backdrop-blur-md border border-[#222C3E] rounded-2xl shadow-2xl overflow-hidden text-slate-200 w-96">
        {/* Header Bar */}
        <div 
          onClick={() => setIsExpanded(prev => !prev)}
          className="px-4 py-2.5 bg-[#151C2C] border-b border-[#222C3E] flex items-center justify-between cursor-pointer hover:bg-[#1a2336] transition-colors"
        >
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-bold font-mono tracking-wider text-slate-200">
              CIRCUIT TELEMETRY & VALIDATION
            </span>
          </div>

          <div className="flex items-center gap-2">
            {hasIssues ? (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold flex items-center gap-1 ${
                errorCount > 0 
                  ? 'bg-red-950/80 text-red-400 border border-red-800' 
                  : 'bg-amber-950/80 text-amber-400 border border-amber-800'
              }`}>
                <AlertTriangle className="w-3 h-3" />
                {issues.length} {issues.length === 1 ? 'Notice' : 'Notices'}
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-950/80 text-emerald-400 border border-emerald-800 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                FIA OK
              </span>
            )}

            <button className="text-slate-400 hover:text-slate-200">
              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Quick Compact Stats Bar (always visible) */}
        <div className="px-4 py-2 grid grid-cols-4 gap-2 text-center border-b border-[#1E2638] bg-[#121826]">
          <div>
            <div className="text-[9px] font-mono text-slate-500 uppercase">LENGTH</div>
            <div className="text-xs font-mono font-bold text-cyan-300">
              {(stats.lengthMeters / 1000).toFixed(2)} km
            </div>
          </div>
          <div>
            <div className="text-[9px] font-mono text-slate-500 uppercase">TURNS</div>
            <div className="text-xs font-mono font-bold text-emerald-400">
              {stats.cornerCount}
            </div>
          </div>
          <div>
            <div className="text-[9px] font-mono text-slate-500 uppercase">STRAIGHT</div>
            <div className="text-xs font-mono font-bold text-amber-300">
              {stats.longestStraightMeters}m
            </div>
          </div>
          <div>
            <div className="text-[9px] font-mono text-slate-500 uppercase">ELEVATION</div>
            <div className="text-xs font-mono font-bold text-purple-400">
              Δ {stats.elevationDeltaMeters}m
            </div>
          </div>
        </div>

        {/* Expanded Details Panel */}
        {isExpanded && (
          <div className="p-4 space-y-3 text-xs bg-[#101522] max-h-80 overflow-y-auto">
            <div className="space-y-1.5 font-mono text-slate-300">
              <div className="flex justify-between items-center py-1 border-b border-[#1E2638]">
                <span className="flex items-center gap-1.5 font-sans text-slate-400">
                  <Ruler className="w-3.5 h-3.5 text-cyan-400" /> Longest Full-Throttle Straight
                </span>
                <span className="font-bold text-slate-200">{stats.longestStraightMeters} meters</span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-[#1E2638]">
                <span className="flex items-center gap-1.5 font-sans text-slate-400">
                  <Compass className="w-3.5 h-3.5 text-amber-400" /> Tightest Corner Radius
                </span>
                <span className="font-bold text-slate-200">
                  {stats.tightestRadiusMeters > 0 ? `${stats.tightestRadiusMeters} meters` : 'None'}
                </span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-[#1E2638]">
                <span className="flex items-center gap-1.5 font-sans text-slate-400">
                  <Mountain className="w-3.5 h-3.5 text-purple-400" /> Elevation Range
                </span>
                <span className="font-bold text-slate-200">
                  {stats.minElevationMeters}m to {stats.maxElevationMeters}m (Δ {stats.elevationDeltaMeters}m)
                </span>
              </div>
            </div>

            {/* Safety Validation Section */}
            <div className="pt-2 border-t border-[#1E2638] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">
                  FIA CIRCUIT SAFETY VALIDATION
                </span>
                {hasIssues && (
                  <button 
                    onClick={() => setShowIssuesList(prev => !prev)}
                    className="text-[10px] text-cyan-400 hover:underline font-mono"
                  >
                    {showIssuesList ? 'Hide Details' : 'View Notices'}
                  </button>
                )}
              </div>

              {!hasIssues ? (
                <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="text-[11px] leading-tight">
                    Circuit geometry complies with FIA Grade 1 guidelines. No severe gradients or illegal self-intersections detected.
                  </span>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {issues.map((issue, idx) => (
                    <div 
                      key={idx}
                      onClick={() => issue.nodeId && onSelectNode(issue.nodeId)}
                      className={`p-2 rounded-xl border flex items-start gap-2 cursor-pointer transition-colors ${
                        issue.type === 'error'
                          ? 'bg-red-950/40 border-red-800/70 text-red-300 hover:bg-red-900/50'
                          : 'bg-amber-950/40 border-amber-800/70 text-amber-300 hover:bg-amber-900/50'
                      }`}
                    >
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <div className="text-[11px] leading-snug">{issue.message}</div>
                        {issue.nodeId && (
                          <div className="text-[9px] font-mono opacity-70 mt-0.5 underline">
                            Click to highlight control point
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
