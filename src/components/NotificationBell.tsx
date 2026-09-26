import React, { useState, useRef, useEffect } from 'react';
import { useAlerts, Alert } from '../contexts/AlertContext';
import { useAuth } from '../contexts/AuthContext';
import { Bell, AlertTriangle, AlertCircle, CheckCircle, ExternalLink, Check, Clock } from 'lucide-react';
import { sounds } from '../utils/sounds';

interface NotificationBellProps {
  onNavigate: (page: string) => void;
}

export default function NotificationBell({ onNavigate }: NotificationBellProps) {
  const { alerts, unreadCount, acknowledgeAlert, refreshAlerts } = useAlerts();
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAsRead = async (e: React.MouseEvent, alertId: number) => {
    e.stopPropagation();
    try {
      await acknowledgeAlert(alertId);
      sounds.success();
    } catch (err) {
      console.error('Failed to acknowledge alert:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    const pendingAlerts = alerts.filter(a => a.status === 'PENDING');
    for (const a of pendingAlerts) {
      await acknowledgeAlert(a.id);
    }
    sounds.success();
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-red-500 text-white animate-pulse';
      case 'HIGH':
        return 'bg-orange-500 text-white';
      case 'MEDIUM':
        return 'bg-amber-500 text-black';
      default:
        return 'bg-blue-500 text-white';
    }
  };

  const formatTimeAgo = (dateStr: string) => {
    if (!dateStr) return 'Just now';
    try {
      const time = new Date(dateStr).getTime();
      if (!Number.isFinite(time)) return 'Just now';
      const diffMs = Math.max(0, Date.now() - time);
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      const diffDays = Math.floor(diffHours / 24);
      return `${Number.isFinite(diffDays) ? diffDays : 1}d ago`;
    } catch {
      return 'Just now';
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          refreshAlerts();
        }}
        className="relative p-2 text-slate-600 dark:text-slate-300 hover:text-paila-blue dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer scale-90 sm:scale-100 origin-right"
        title="Operations & Safety Alerts"
        aria-label="Alerts Center"
      >
        <Bell size={18} className={unreadCount > 0 ? 'text-amber-500 dark:text-amber-400' : ''} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4.5 min-w-4.5 px-1 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white shadow-sm ring-2 ring-white dark:ring-slate-900 animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-84 sm:w-96 bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Header */}
          <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-slate-800 dark:text-slate-100">Live Field Alerts</span>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900">
                  {unreadCount} pending
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-xs font-semibold text-paila-blue hover:text-paila-blue-dark dark:text-blue-400 dark:hover:text-blue-300 transition-colors cursor-pointer"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Alert List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
            {alerts.length === 0 ? (
              <div className="py-8 text-center text-slate-400">
                <CheckCircle size={32} className="mx-auto text-emerald-500 mb-2 opacity-80" />
                <p className="text-sm font-medium text-slate-600 dark:text-slate-300">All clear!</p>
                <p className="text-xs text-slate-400 mt-0.5">No alerts or active safety incidents</p>
              </div>
            ) : (
              alerts.slice(0, 8).map(alert => {
                const isPending = alert.status === 'PENDING';
                return (
                  <div
                    key={alert.id}
                    onClick={() => {
                      setIsOpen(false);
                      onNavigate('alerts');
                    }}
                    className={`p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer ${
                      isPending ? 'bg-amber-50/40 dark:bg-amber-950/15' : ''
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="mt-0.5 shrink-0">
                        {alert.severity === 'CRITICAL' ? (
                          <AlertCircle size={18} className="text-red-600 dark:text-red-400 animate-pulse" />
                        ) : (
                          <AlertTriangle size={18} className="text-amber-500 dark:text-amber-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className={`text-[9px] font-black px-1.5 py-0.2 rounded uppercase ${getSeverityBadge(alert.severity)}`}>
                            {alert.severity}
                          </span>
                          <span className="text-[11px] text-slate-400 font-mono">
                            {formatTimeAgo(alert.created_at)}
                          </span>
                          {alert.booking_code && (
                            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate">
                              • {alert.booking_code}
                            </span>
                          )}
                        </div>
                        <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 line-clamp-1">
                          {alert.title}
                        </h4>
                        {alert.description && (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">
                            {alert.description}
                          </p>
                        )}
                        <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-100 dark:border-slate-800/60">
                          <span className="text-[10px] text-slate-400">
                            By {alert.tour_leader_name || 'Tour Leader'}
                          </span>
                          {isPending ? (
                            <button
                              onClick={(e) => handleMarkAsRead(e, alert.id)}
                              className="text-[11px] font-semibold text-paila-blue hover:text-paila-blue-dark dark:text-blue-400 flex items-center gap-1 hover:underline cursor-pointer"
                            >
                              <Check size={12} /> Acknowledge
                            </button>
                          ) : (
                            <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                              <CheckCircle size={11} /> {alert.status}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-700/60 text-center">
            <button
              onClick={() => {
                setIsOpen(false);
                onNavigate('alerts');
              }}
              className="text-xs font-bold text-paila-blue hover:text-paila-blue-dark dark:text-blue-400 dark:hover:text-blue-300 flex items-center justify-center gap-1.5 w-full py-1 rounded transition-colors cursor-pointer"
            >
              Open Alerts Management Center <ExternalLink size={12} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
