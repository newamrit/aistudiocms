import { useState } from 'react';
import { useAlerts, Alert } from '../contexts/AlertContext';
import { useAuth } from '../contexts/AuthContext';
import { 
  Bell, CheckCircle, AlertTriangle, AlertCircle, MapPin, Phone, 
  Clock, Search, Users, Check, ShieldAlert, Sparkles, WifiOff, RefreshCw, Database, Layers
} from 'lucide-react';
import { sounds } from '../utils/sounds';

export default function Alerts() {
  const { 
    alerts, 
    acknowledgeAlert, 
    resolveAlert, 
    loading, 
    retrySync, 
    syncing, 
    isOnline, 
    isApiConnected,
    pendingSyncCount 
  } = useAlerts();
  const { user } = useAuth();
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'PENDING' | 'ACKNOWLEDGED' | 'RESOLVED'>('ALL');
  const [filterSeverity, setFilterSeverity] = useState<'ALL' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [processingAlertId, setProcessingAlertId] = useState<number | null>(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  const filteredAlerts = alerts.filter(alert => {
    if (filterStatus !== 'ALL' && alert.status !== filterStatus) return false;
    if (filterSeverity !== 'ALL' && alert.severity !== filterSeverity) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        alert.title.toLowerCase().includes(query) ||
        alert.description?.toLowerCase().includes(query) ||
        alert.tour_leader_name?.toLowerCase().includes(query) ||
        alert.booking_code?.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return 'bg-red-100 text-red-800 border-red-300 dark:bg-red-950/50 dark:text-red-300 dark:border-red-800/60';
      case 'HIGH': return 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-950/50 dark:text-orange-300 dark:border-orange-800/60';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-950/50 dark:text-yellow-300 dark:border-yellow-800/60';
      case 'LOW': return 'bg-green-100 text-green-800 border-green-300 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/60';
      default: return 'bg-gray-100 text-gray-800 border-gray-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-red-500';
      case 'ACKNOWLEDGED': return 'bg-amber-500';
      case 'RESOLVED': return 'bg-emerald-500';
      default: return 'bg-gray-500';
    }
  };

  const getAlertTypeIcon = (alert: Alert) => {
    if (alert.is_system_offline_alert) {
      return <WifiOff className="text-amber-600 dark:text-amber-400" size={24} />;
    }
    switch (alert.alert_type) {
      case 'EMERGENCY_SOS': return <AlertCircle className="text-red-600" size={24} />;
      case 'HIGHWAY_BLOCK': return <AlertTriangle className="text-orange-600" size={24} />;
      case 'VEHICLE_BREAKDOWN': return <AlertTriangle className="text-yellow-600" size={24} />;
      case 'VENDOR_SWAP': return <AlertTriangle className="text-blue-600" size={24} />;
      case 'MEDICAL': return <AlertCircle className="text-red-600" size={24} />;
      case 'WEATHER': return <AlertTriangle className="text-purple-600" size={24} />;
      default: return <Bell className="text-gray-600" size={24} />;
    }
  };

  const handleAcknowledge = async (alert: Alert) => {
    setProcessingAlertId(alert.id);
    try {
      await acknowledgeAlert(alert.id);
      sounds.success();
      setActionSuccessMsg(`Alert #${alert.id} acknowledged by ${user?.name || 'Admin'}`);
      setTimeout(() => setActionSuccessMsg(null), 4000);
    } catch (err) {
      console.error('Failed to acknowledge alert:', err);
    } finally {
      setProcessingAlertId(null);
    }
  };

  const handleResolve = async (alert: Alert) => {
    setProcessingAlertId(alert.id);
    try {
      await resolveAlert(alert.id);
      sounds.success();
      setActionSuccessMsg(`Alert #${alert.id} marked as RESOLVED`);
      setTimeout(() => setActionSuccessMsg(null), 4000);
    } catch (err) {
      console.error('Failed to resolve alert:', err);
    } finally {
      setProcessingAlertId(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const pendingCount = alerts.filter(a => a.status === 'PENDING').length;
  const acknowledgedCount = alerts.filter(a => a.status === 'ACKNOWLEDGED').length;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Toast Banner */}
      {actionSuccessMsg && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-slate-700 animate-fade-in">
          <CheckCircle size={18} className="text-emerald-400" />
          <span className="text-sm font-semibold">{actionSuccessMsg}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <ShieldAlert className="text-paila-blue dark:text-blue-400" size={28} />
            Field Alerts & Incidents
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm mt-0.5">
            Real-time emergency signals, route bottlenecks, and field broadcasts from tour leaders
          </p>
        </div>

        {/* Quick Summary Badges & Sync Control */}
        <div className="flex items-center gap-2 flex-wrap">
          {(!isOnline || !isApiConnected) && (
            <div className="px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300/80 dark:border-amber-700 flex items-center gap-1.5">
              <WifiOff size={13} />
              <span>Offline Mode ({pendingSyncCount} queued)</span>
            </div>
          )}

          <button
            onClick={() => retrySync()}
            disabled={syncing}
            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="Refresh alerts and synchronize pending items"
          >
            <RefreshCw size={13} className={syncing ? 'animate-spin' : ''} />
            {syncing ? 'Syncing...' : 'Sync Alerts'}
          </button>

          <button
            onClick={() => setFilterStatus(filterStatus === 'PENDING' ? 'ALL' : 'PENDING')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              pendingCount > 0 
                ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800 hover:bg-rose-200' 
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
            {pendingCount} Pending Action
          </button>
          <button
            onClick={() => setFilterStatus(filterStatus === 'ACKNOWLEDGED' ? 'ALL' : 'ACKNOWLEDGED')}
            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 transition-colors cursor-pointer"
          >
            {acknowledgedCount} Acknowledged
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-[#111c30] rounded-2xl shadow-sm border border-slate-200 dark:border-[#22324b] p-4 mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[240px]">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Search alerts by title, tour leader, booking code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-800 dark:text-slate-100 focus:bg-white focus:ring-2 focus:ring-paila-blue/20 focus:border-paila-blue outline-none transition-all"
              />
            </div>
          </div>
          <div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-200 focus:bg-white focus:ring-2 focus:ring-paila-blue/20 focus:border-paila-blue outline-none"
            >
              <option value="ALL">All Statuses ({alerts.length})</option>
              <option value="PENDING">🔴 Pending ({pendingCount})</option>
              <option value="ACKNOWLEDGED">🟡 Acknowledged ({acknowledgedCount})</option>
              <option value="RESOLVED">🟢 Resolved ({alerts.filter(a => a.status === 'RESOLVED').length})</option>
            </select>
          </div>
          <div>
            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value as any)}
              className="px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-200 focus:bg-white focus:ring-2 focus:ring-paila-blue/20 focus:border-paila-blue outline-none"
            >
              <option value="ALL">All Severities</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* Alerts List */}
      {loading ? (
        <div className="text-center py-16 bg-white dark:bg-[#111c30] rounded-2xl border border-slate-200 dark:border-[#22324b]">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-paila-blue dark:border-blue-400"></div>
          <p className="mt-4 text-slate-600 dark:text-slate-400 font-semibold text-sm">Loading field alerts...</p>
        </div>
      ) : filteredAlerts.length === 0 ? (
        <div className="bg-white dark:bg-[#111c30] rounded-2xl shadow-sm border border-slate-200 dark:border-[#22324b] p-16 text-center">
          <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
            <Bell size={28} />
          </div>
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No alerts found</h3>
          <p className="mt-1 text-slate-500 dark:text-slate-400 text-sm">
            {searchQuery || filterStatus !== 'ALL' || filterSeverity !== 'ALL'
              ? 'Try changing your search keywords or filter criteria'
              : 'All active tours are operating normally with no unresolved alerts.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAlerts.map((alert) => {
            const isProcessing = processingAlertId === alert.id;
            const isPending = alert.status === 'PENDING';
            const isAcknowledged = alert.status === 'ACKNOWLEDGED';
            const isResolved = alert.status === 'RESOLVED';
            const isSystemOffline = alert.is_system_offline_alert;

            return (
              <div
                key={alert.id}
                className={`bg-white dark:bg-[#111c30] rounded-2xl shadow-sm border-2 p-5 sm:p-6 transition-all hover:shadow-md ${
                  isSystemOffline && isPending
                    ? 'border-amber-400 bg-amber-50/30 dark:bg-amber-950/20'
                    : isPending
                    ? 'border-red-300 dark:border-red-800 bg-red-50/20 dark:bg-red-950/20'
                    : isAcknowledged
                    ? 'border-amber-200 dark:border-amber-800/80 bg-amber-50/10 dark:bg-amber-950/10'
                    : 'border-slate-200 dark:border-[#22324b]'
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Alert Icon */}
                  <div className="p-3 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm shrink-0">
                    {getAlertTypeIcon(alert)}
                  </div>

                  {/* Alert Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 mb-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className={`px-2.5 py-0.5 text-xs font-bold rounded-lg border ${getSeverityColor(alert.severity)}`}>
                            {alert.severity}
                          </span>
                          <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full text-white ${getStatusColor(alert.status)}`}>
                            {alert.status}
                          </span>
                          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                            {isSystemOffline ? 'SYSTEM SYNC ALERT' : alert.alert_type.replace('_', ' ')}
                          </span>
                          {isSystemOffline && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/50 px-2 py-0.5 rounded-md">
                              <Database size={11} /> Offline Storage Active
                            </span>
                          )}
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-1">{alert.title}</h3>
                      </div>
                      
                      <div className="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1 sm:text-right shrink-0">
                        <Clock size={13} className="text-slate-400" />
                        {formatDate(alert.created_at)}
                      </div>
                    </div>

                    {alert.description && (
                      <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed mb-4 bg-slate-50/80 dark:bg-slate-900/60 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 font-medium">
                        {alert.description}
                      </p>
                    )}

                    {/* Metadata Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 mb-4 text-xs font-medium">
                      <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/70 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                        <Users size={15} className="text-slate-400 shrink-0" />
                        <span className="truncate">
                          <strong className="text-slate-900 dark:text-slate-100">Origin:</strong> {alert.tour_leader_name || 'Assigned Guide'}
                        </span>
                      </div>
                      
                      {alert.tour_leader_phone && (
                        <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/70 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                          <Phone size={15} className="text-slate-400 shrink-0" />
                          <a href={`tel:${alert.tour_leader_phone}`} className="text-paila-blue dark:text-blue-400 font-bold hover:underline truncate">
                            {alert.tour_leader_phone}
                          </a>
                        </div>
                      )}

                      {alert.location && (
                        <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/70 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                          <MapPin size={15} className="text-slate-400 shrink-0" />
                          <span className="truncate">{alert.location}</span>
                        </div>
                      )}

                      {alert.booking_code && (
                        <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/70 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                          <Sparkles size={15} className="text-paila-orange shrink-0" />
                          <span className="truncate font-semibold text-paila-blue dark:text-blue-400">
                            {alert.booking_code} {alert.client_name ? `(${alert.client_name})` : ''}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Action Bar */}
                    <div className="flex items-center justify-between flex-wrap gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                      <div>
                        {isAcknowledged && (
                          <div className="text-xs text-slate-600 dark:text-slate-300 font-semibold flex items-center gap-1.5">
                            <CheckCircle size={15} className="text-amber-600" />
                            Acknowledged by <span className="font-bold text-slate-900 dark:text-slate-100">{alert.acknowledged_by_name || 'Admin'}</span>
                            {alert.acknowledged_at && <span className="text-slate-400">({formatDate(alert.acknowledged_at)})</span>}
                          </div>
                        )}

                        {isResolved && (
                          <div className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1.5">
                            <CheckCircle size={15} className="text-emerald-600 dark:text-emerald-400" />
                            Resolved by <span className="font-bold text-slate-900 dark:text-slate-100">{alert.resolved_by_name || alert.acknowledged_by_name || 'Admin'}</span>
                            {alert.resolved_at && <span className="text-slate-400">({formatDate(alert.resolved_at)})</span>}
                          </div>
                        )}

                        {isPending && (
                          <div className="text-xs text-red-600 dark:text-red-400 font-bold flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
                            {isSystemOffline ? 'Offline warning active in local cache' : 'Awaiting operations acknowledgment'}
                          </div>
                        )}
                      </div>

                      {/* Buttons */}
                      <div className="flex items-center gap-2">
                        {isPending && user?.role !== 'TOUR_OPERATOR' && (
                          <button
                            type="button"
                            onClick={() => handleAcknowledge(alert)}
                            disabled={isProcessing}
                            className="flex items-center gap-2 px-4 py-2 bg-paila-blue hover:bg-blue-800 text-white text-xs font-bold rounded-xl transition-all shadow-sm active:scale-95 disabled:opacity-50 cursor-pointer"
                          >
                            <Check size={16} />
                            {isProcessing ? 'Acknowledging...' : 'Acknowledge Alert'}
                          </button>
                        )}

                        {isAcknowledged && user?.role !== 'TOUR_OPERATOR' && (
                          <button
                            type="button"
                            onClick={() => handleResolve(alert)}
                            disabled={isProcessing}
                            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm active:scale-95 disabled:opacity-50 cursor-pointer"
                          >
                            <CheckCircle size={16} />
                            {isProcessing ? 'Resolving...' : 'Mark as Resolved'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
