import { useFieldActivity, FieldActivity as ActivityType } from '../contexts/FieldActivityContext';
import { useState } from 'react';
import { 
  Activity, MapPin, DollarSign, RefreshCw, CheckCircle, Clock, 
  AlertTriangle, Bell, Filter, User, Calendar, TrendingUp, Image as ImageIcon, X, Download, ExternalLink
} from 'lucide-react';
import { formatNepalTime, formatRelativeTime } from '../utils/timeFormat';
import { sounds } from '../utils/sounds';

export default function FieldActivity() {
  const { activities, acknowledgeActivity, getUnacknowledgedCount } = useFieldActivity();
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterPriority, setFilterPriority] = useState<string>('ALL');
  const [showAcknowledged, setShowAcknowledged] = useState(true);
  const [selectedReceipt, setSelectedReceipt] = useState<{ title: string; image: string; actor: string; date: string; amount?: number } | null>(null);

  const unacknowledgedCount = getUnacknowledgedCount();

  const filteredActivities = activities.filter(activity => {
    if (!showAcknowledged && activity.acknowledged) return false;
    if (filterType !== 'ALL' && activity.type !== filterType) return false;
    if (filterPriority !== 'ALL' && activity.priority !== filterPriority) return false;
    return true;
  });

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'STATUS_CHANGE': return <RefreshCw size={16} className="text-blue-600" />;
      case 'VENDOR_SWAP': return <RefreshCw size={16} className="text-orange-600" />;
      case 'SPOT_EXPENSE': return <DollarSign size={16} className="text-green-600" />;
      case 'CHECK_IN': return <CheckCircle size={16} className="text-purple-600" />;
      case 'EMERGENCY_ALERT': return <AlertTriangle size={16} className="text-red-600" />;
      default: return <Activity size={16} className="text-slate-600" />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'STATUS_CHANGE': return 'bg-blue-50 border-blue-200';
      case 'VENDOR_SWAP': return 'bg-orange-50 border-orange-200';
      case 'SPOT_EXPENSE': return 'bg-green-50 border-green-200';
      case 'CHECK_IN': return 'bg-purple-50 border-purple-200';
      case 'EMERGENCY_ALERT': return 'bg-red-50 border-red-200';
      default: return 'bg-slate-50 border-slate-200';
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'CRITICAL': return 'bg-red-100 text-red-700 border-red-200';
      case 'HIGH': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'LOW': return 'bg-slate-100 text-slate-700 border-slate-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const stats = {
    total: activities.length,
    unacknowledged: unacknowledgedCount,
    today: activities.filter(a => {
      const today = new Date().toDateString();
      return new Date(a.timestamp).toDateString() === today;
    }).length,
    highPriority: activities.filter(a => a.priority === 'HIGH' || a.priority === 'CRITICAL').length,
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Field Activity Monitor</h1>
          <p className="text-slate-600 mt-1">Real-time monitoring of tour leader activities</p>
        </div>
        {unacknowledgedCount > 0 && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
            <Bell size={18} className="text-red-600" />
            <span className="text-sm font-semibold text-red-700">
              {unacknowledgedCount} Unacknowledged
            </span>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Total Activities</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{stats.total}</p>
            </div>
            <Activity size={24} className="text-slate-400" />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Today's Activities</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">{stats.today}</p>
            </div>
            <Calendar size={24} className="text-blue-400" />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Unacknowledged</p>
              <p className="text-2xl font-bold text-red-600 mt-1">{stats.unacknowledged}</p>
            </div>
            <Clock size={24} className="text-red-400" />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">High Priority</p>
              <p className="text-2xl font-bold text-orange-600 mt-1">{stats.highPriority}</p>
            </div>
            <AlertTriangle size={24} className="text-orange-400" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-slate-400" />
            <span className="text-sm font-medium text-slate-700">Filters:</span>
          </div>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">All Types</option>
            <option value="STATUS_CHANGE">Status Changes</option>
            <option value="VENDOR_SWAP">Vendor Swaps</option>
            <option value="SPOT_EXPENSE">Spot Expenses</option>
            <option value="CHECK_IN">Check-ins</option>
            <option value="EMERGENCY_ALERT">Emergency Alerts</option>
          </select>

          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">All Priorities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showAcknowledged}
              onChange={(e) => setShowAcknowledged(e.target.checked)}
              className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm text-slate-700">Show Acknowledged</span>
          </label>
        </div>
      </div>

      {/* Activity Timeline */}
      <div className="bg-white rounded-lg border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Activity Timeline</h2>
            <span className="text-xs text-slate-500 flex items-center gap-1">
              <Clock size={12} />
              Nepal Time (NPT)
            </span>
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {filteredActivities.length === 0 ? (
            <div className="p-12 text-center">
              <Activity size={48} className="mx-auto text-slate-300 mb-3" />
              <p className="text-slate-500">No activities found</p>
            </div>
          ) : (
            filteredActivities.map((activity) => (
              <div
                key={activity.id}
                className={`p-6 border-l-4 ${getActivityColor(activity.type)} ${
                  !activity.acknowledged ? 'bg-opacity-50' : ''
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    {getActivityIcon(activity.type)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-sm font-semibold text-slate-900">
                            {activity.title}
                          </h3>
                          <span className={`px-2 py-0.5 text-xs font-medium rounded border ${getPriorityBadge(activity.priority)}`}>
                            {activity.priority}
                          </span>
                          {!activity.acknowledged && (
                            <span className="px-2 py-0.5 text-xs font-medium rounded bg-red-100 text-red-700 border border-red-200">
                              NEW
                            </span>
                          )}
                        </div>

                        <p className="text-sm text-slate-600 mb-2">
                          {activity.description}
                        </p>

                        <div className="flex items-center gap-4 text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <User size={12} />
                            {activity.tourLeaderName}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin size={12} />
                            {activity.bookingCode} - {activity.clientName}
                          </span>
                          <span className="flex items-center gap-1" title={formatNepalTime(activity.timestamp)}>
                            <Clock size={12} />
                            {formatRelativeTime(activity.timestamp)}
                          </span>
                        </div>

                        {/* Metadata display */}
                        {activity.metadata && Object.keys(activity.metadata).length > 0 && (
                          <div className="mt-3 p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">Details:</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                              {Object.entries(activity.metadata).map(([key, value]) => {
                                if (key === 'receiptPreview' || key === 'receipt_image_url' || key === 'receiptImage') return null;
                                return (
                                  <div key={key}>
                                    <span className="text-slate-500 capitalize">
                                      {key.replace(/([A-Z])/g, ' $1').trim()}:
                                    </span>{' '}
                                    <span className="font-medium text-slate-900 dark:text-white">
                                      {typeof value === 'number' && key.toLowerCase().includes('amount')
                                        ? `NPR ${value.toLocaleString()}`
                                        : String(value)}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>

                            {/* Receipt Image Thumbnail for Admin Inspection */}
                            {(activity.metadata?.receiptPreview || activity.metadata?.receipt_image_url || activity.metadata?.receiptImage) && (
                              <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center gap-3">
                                <div 
                                  onClick={() => {
                                    sounds.click();
                                    setSelectedReceipt({
                                      title: activity.title,
                                      image: String(activity.metadata?.receiptPreview || activity.metadata?.receipt_image_url || activity.metadata?.receiptImage),
                                      actor: activity.tourLeaderName,
                                      date: formatNepalTime(activity.timestamp),
                                      amount: typeof activity.metadata?.amount === 'number' ? activity.metadata.amount : undefined
                                    });
                                  }}
                                  className="group relative w-14 h-14 rounded-lg overflow-hidden border border-slate-300 dark:border-slate-600 cursor-pointer bg-slate-100 dark:bg-slate-900 shrink-0 shadow-xs hover:border-blue-500 transition-all"
                                  title="Click to view full receipt"
                                >
                                  <img 
                                    src={String(activity.metadata?.receiptPreview || activity.metadata?.receipt_image_url || activity.metadata?.receiptImage)} 
                                    alt="Receipt Thumbnail" 
                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform" 
                                  />
                                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                                    <ImageIcon size={16} />
                                  </div>
                                </div>
                                <div>
                                  <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 block">
                                    Verified Expense Receipt Attached
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      sounds.click();
                                      setSelectedReceipt({
                                        title: activity.title,
                                        image: String(activity.metadata?.receiptPreview || activity.metadata?.receipt_image_url || activity.metadata?.receiptImage),
                                        actor: activity.tourLeaderName,
                                        date: formatNepalTime(activity.timestamp),
                                        amount: typeof activity.metadata?.amount === 'number' ? activity.metadata.amount : undefined
                                      });
                                    }}
                                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-semibold flex items-center gap-1 mt-0.5 cursor-pointer"
                                  >
                                    <ImageIcon size={12} />
                                    <span>Inspect Original Receipt Photo</span>
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {!activity.acknowledged && (
                        <button
                          onClick={() => {
                            sounds.success();
                            acknowledgeActivity(activity.id);
                          }}
                          className="flex-shrink-0 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors"
                        >
                          Acknowledge
                        </button>
                      )}

                      {activity.acknowledged && (
                        <div className="flex-shrink-0 flex items-center gap-1 text-xs text-green-600">
                          <CheckCircle size={14} />
                          <span>Acknowledged</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* High-Resolution Receipt Inspection Modal for Admins */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <ImageIcon size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Field Expense Receipt Inspection
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Logged by {selectedReceipt.actor} • {selectedReceipt.date}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedReceipt(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Receipt Image Display Area */}
            <div className="flex-1 overflow-auto p-4 sm:p-6 bg-slate-950/90 flex items-center justify-center min-h-[300px]">
              <img 
                src={selectedReceipt.image} 
                alt="Original Field Receipt" 
                className="max-h-[60vh] max-w-full object-contain rounded-xl shadow-lg border border-slate-700/50"
              />
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/60">
              <div className="text-xs text-slate-600 dark:text-slate-300">
                {selectedReceipt.amount !== undefined && (
                  <span className="font-bold text-slate-900 dark:text-white mr-2">
                    Amount: NPR {selectedReceipt.amount.toLocaleString()}
                  </span>
                )}
                <span>{selectedReceipt.title}</span>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <a
                  href={selectedReceipt.image}
                  download={`receipt_${Date.now()}.jpg`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 sm:flex-initial px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-white text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5"
                >
                  <Download size={14} />
                  <span>Download Photo</span>
                </a>
                <button
                  type="button"
                  onClick={() => setSelectedReceipt(null)}
                  className="flex-1 sm:flex-initial px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-md active:scale-95"
                >
                  Close Inspection
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
