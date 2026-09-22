import { useState } from 'react';
import { useAlerts, Alert } from '../contexts/AlertContext';
import { useAuth } from '../contexts/AuthContext';
import { Bell, CheckCircle, AlertTriangle, AlertCircle, MapPin, Phone, Clock, Filter, Search, Users } from 'lucide-react';

export default function Alerts() {
  const { alerts, acknowledgeAlert, loading } = useAlerts();
  const { user } = useAuth();
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'PENDING' | 'ACKNOWLEDGED' | 'RESOLVED'>('ALL');
  const [filterSeverity, setFilterSeverity] = useState<'ALL' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

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
      case 'CRITICAL': return 'bg-red-100 text-red-800 border-red-300';
      case 'HIGH': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'LOW': return 'bg-green-100 text-green-800 border-green-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-red-500';
      case 'ACKNOWLEDGED': return 'bg-yellow-500';
      case 'RESOLVED': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getAlertTypeIcon = (type: string) => {
    switch (type) {
      case 'EMERGENCY_SOS': return <AlertCircle className="text-red-600" size={24} />;
      case 'HIGHWAY_BLOCK': return <AlertTriangle className="text-orange-600" size={24} />;
      case 'VEHICLE_BREAKDOWN': return <AlertTriangle className="text-yellow-600" size={24} />;
      case 'VENDOR_SWAP': return <AlertTriangle className="text-blue-600" size={24} />;
      case 'MEDICAL': return <AlertCircle className="text-red-600" size={24} />;
      case 'WEATHER': return <AlertTriangle className="text-purple-600" size={24} />;
      default: return <Bell className="text-gray-600" size={24} />;
    }
  };

  const handleAcknowledge = async (alertId: number) => {
    if (confirm('Are you sure you want to acknowledge this alert?')) {
      await acknowledgeAlert(alertId);
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

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Alerts</h1>
        <p className="text-slate-600">Monitor and manage alerts from tour leaders</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 mb-6">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Search alerts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-paila-blue/20 focus:border-paila-blue outline-none"
              />
            </div>
          </div>
          <div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-paila-blue/20 focus:border-paila-blue outline-none"
            >
              <option value="ALL">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="ACKNOWLEDGED">Acknowledged</option>
              <option value="RESOLVED">Resolved</option>
            </select>
          </div>
          <div>
            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value as any)}
              className="px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-paila-blue/20 focus:border-paila-blue outline-none"
            >
              <option value="ALL">All Severity</option>
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
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-paila-blue"></div>
          <p className="mt-4 text-slate-600">Loading alerts...</p>
        </div>
      ) : filteredAlerts.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-12 text-center">
          <Bell className="mx-auto text-slate-300" size={48} />
          <p className="mt-4 text-slate-600">No alerts found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAlerts.map((alert) => (
            <div
              key={alert.id}
              className={`bg-white rounded-lg shadow-sm border-2 p-6 transition-all hover:shadow-md ${
                alert.status === 'PENDING' ? 'border-red-200' : 'border-slate-200'
              }`}
            >
              <div className="flex items-start gap-4">
                {/* Alert Icon */}
                <div className="flex-shrink-0">
                  {getAlertTypeIcon(alert.alert_type)}
                </div>

                {/* Alert Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">{alert.title}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`px-2 py-0.5 text-xs font-semibold rounded border ${getSeverityColor(alert.severity)}`}>
                          {alert.severity}
                        </span>
                        <span className={`px-2 py-0.5 text-xs font-semibold rounded-full text-white ${getStatusColor(alert.status)}`}>
                          {alert.status}
                        </span>
                        <span className="text-xs text-slate-500">
                          {alert.alert_type.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                    <div className="text-right text-sm text-slate-500">
                      <Clock size={14} className="inline mr-1" />
                      {formatDate(alert.created_at)}
                    </div>
                  </div>

                  {alert.description && (
                    <p className="text-slate-700 mb-3">{alert.description}</p>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Users size={16} className="text-slate-400" />
                      <span className="font-medium">Tour Leader:</span>
                      <span>{alert.tour_leader_name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Phone size={16} className="text-slate-400" />
                      <a href={`tel:${alert.tour_leader_phone}`} className="text-paila-blue hover:underline">
                        {alert.tour_leader_phone}
                      </a>
                    </div>
                    {alert.location && (
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <MapPin size={16} className="text-slate-400" />
                        <span>{alert.location}</span>
                      </div>
                    )}
                    {alert.booking_code && (
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <span className="font-medium">Booking:</span>
                        <span className="text-paila-blue">{alert.booking_code}</span>
                        {alert.client_name && <span className="text-slate-500">- {alert.client_name}</span>}
                      </div>
                    )}
                  </div>

                  {alert.status === 'PENDING' && user?.role !== 'TOUR_OPERATOR' && (
                    <button
                      onClick={() => handleAcknowledge(alert.id)}
                      className="flex items-center gap-2 px-4 py-2 bg-paila-blue text-white rounded-lg hover:bg-paila-blue/90 transition-colors"
                    >
                      <CheckCircle size={18} />
                      Acknowledge Alert
                    </button>
                  )}

                  {alert.status === 'ACKNOWLEDGED' && (
                    <div className="text-sm text-slate-500">
                      <CheckCircle size={14} className="inline mr-1 text-green-600" />
                      Acknowledged by {alert.acknowledged_by} at {alert.acknowledged_at && formatDate(alert.acknowledged_at)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
