import { useFieldActivity, FieldActivity as ActivityType } from '../contexts/FieldActivityContext';
import { useState } from 'react';
import { 
  Activity, MapPin, DollarSign, RefreshCw, CheckCircle, Clock, 
  AlertTriangle, Bell, Filter, User, Calendar, TrendingUp
} from 'lucide-react';
import { formatNepalTime, formatRelativeTime } from '../utils/timeFormat';
import { sounds } from '../utils/sounds';

export default function FieldActivity() {
  const { activities, acknowledgeActivity, getUnacknowledgedCount } = useFieldActivity();
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterPriority, setFilterPriority] = useState<string>('ALL');
  const [showAcknowledged, setShowAcknowledged] = useState(true);

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
                          <div className="mt-3 p-3 bg-white rounded border border-slate-200">
                            <p className="text-xs font-medium text-slate-700 mb-2">Details:</p>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              {Object.entries(activity.metadata).map(([key, value]) => (
                                <div key={key}>
                                  <span className="text-slate-500 capitalize">
                                    {key.replace(/([A-Z])/g, ' $1').trim()}:
                                  </span>{' '}
                                  <span className="font-medium text-slate-900">
                                    {typeof value === 'number' && key.toLowerCase().includes('amount')
                                      ? `NPR ${value.toLocaleString()}`
                                      : String(value)}
                                  </span>
                                </div>
                              ))}
                            </div>
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
    </div>
  );
}
