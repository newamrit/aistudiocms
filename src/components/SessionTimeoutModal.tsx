import React from 'react';
import { Clock, ShieldAlert, LogOut, CheckCircle2 } from 'lucide-react';

interface SessionTimeoutModalProps {
  isOpen: boolean;
  secondsRemaining: number;
  onExtend: () => void;
  onLogout: () => void;
}

export const SessionTimeoutModal: React.FC<SessionTimeoutModalProps> = ({
  isOpen,
  secondsRemaining,
  onExtend,
  onLogout,
}) => {
  if (!isOpen) return null;

  const safeSeconds = Number.isFinite(secondsRemaining) ? Math.max(0, Math.round(secondsRemaining)) : 60;
  const progressPercent = Math.min(100, Math.max(0, (safeSeconds / 60) * 100));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border-2 border-amber-500/80 rounded-3xl p-6 shadow-2xl text-slate-900 dark:text-white relative animate-in zoom-in-95 duration-200">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-500 flex items-center justify-center shrink-0 border border-amber-500/30 animate-pulse">
            <Clock size={26} />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-full">
              Inactivity Security Notice
            </span>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
              Session Expiring Soon
            </h3>
          </div>
        </div>

        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          You have been inactive. For data protection and security, your active session will automatically end in:
        </p>

        {/* Countdown display */}
        <div className="my-5 p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 text-center">
          <div className="text-3xl sm:text-4xl font-black text-amber-600 dark:text-amber-400 tracking-tight font-mono">
            00:{safeSeconds < 10 ? `0${safeSeconds}` : safeSeconds}
          </div>
          <p className="text-xs text-amber-700/80 dark:text-amber-400/80 mt-1 font-medium">
            seconds until automatic logout (15 min inactivity limit)
          </p>

          {/* Progress bar */}
          <div className="w-full bg-amber-200 dark:bg-amber-900/50 h-2 rounded-full mt-3 overflow-hidden">
            <div
              className="bg-amber-500 h-full rounded-full transition-all duration-1000 ease-linear"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <button
            onClick={onExtend}
            className="w-full sm:flex-1 py-3 px-4 bg-gradient-to-r from-[#f35500] to-[#d94b00] hover:from-[#e04e00] hover:to-[#c44300] text-white font-bold text-sm rounded-xl shadow-lg shadow-orange-500/20 active:scale-98 transition-all flex items-center justify-center gap-2"
          >
            <CheckCircle2 size={16} />
            <span>Stay Logged In</span>
          </button>

          <button
            onClick={onLogout}
            className="w-full sm:w-auto py-3 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-sm rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <LogOut size={16} />
            <span>Log Out Now</span>
          </button>
        </div>
      </div>
    </div>
  );
};
