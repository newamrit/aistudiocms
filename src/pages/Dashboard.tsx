import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useBookings } from '../contexts/BookingContext';
import { useOperations } from '../contexts/OperationsContext';
import { useAlerts, Alert } from '../contexts/AlertContext';
import { useFieldActivity, FieldActivity } from '../contexts/FieldActivityContext';
import RecentActivitiesFeed from '../components/RecentActivitiesFeed';
import BookingStatusMonthlyChart from '../components/BookingStatusMonthlyChart';
import {
  CalendarDays, TrendingUp, Wallet, Users, Mountain,
  AlertCircle, AlertTriangle, CheckCircle2, Clock, ArrowUpRight, ArrowDownRight,
  ShieldCheck, Activity as ActivityIcon, Phone, MapPin, ArrowRight, Check, Sparkles,
  Compass, CloudSun, DollarSign, RefreshCw, Radio
} from 'lucide-react';
import { sounds } from '../utils/sounds';

interface DashboardProps {
  onNavigate?: (page: string, id?: number) => void;
}

export default function Dashboard({ onNavigate }: DashboardProps) {
  const { user } = useAuth();
  const { bookings } = useBookings();
  const { allocations } = useOperations();
  const { alerts, acknowledgeAlert, resolveAlert } = useAlerts();
  const { activities: fieldActivities, acknowledgeActivity } = useFieldActivity();
  const [processingAlertId, setProcessingAlertId] = useState<number | null>(null);
  const [activeFeedTab, setActiveFeedTab] = useState<'FIELD' | 'AUDIT'>('FIELD');

  if (!user) return null;

  // Filter pending / active emergency alerts
  const activeEmergencyAlerts = alerts.filter(a => a.status === 'PENDING' || a.status === 'ACKNOWLEDGED');

  const handleQuickAcknowledge = async (alert: Alert) => {
    try {
      setProcessingAlertId(alert.id);
      await acknowledgeAlert(alert.id);
      sounds.success();
    } catch (e) {
      console.error(e);
    } finally {
      setProcessingAlertId(null);
    }
  };

  const handleQuickResolve = async (alert: Alert) => {
    try {
      setProcessingAlertId(alert.id);
      await resolveAlert(alert.id);
      sounds.success();
    } catch (e) {
      console.error(e);
    } finally {
      setProcessingAlertId(null);
    }
  };

  const totalBookings = bookings.length;
  const activeBookings = bookings.filter(b => ['CONFIRMED', 'IN_PROGRESS'].includes(b.status)).length;
  const totalRevenue = bookings.reduce((sum, b) => sum + b.totalAgreedAmount, 0);
  const totalAdvance = bookings.reduce((sum, b) => sum + b.advanceReceived, 0);
  const pendingVendorPayments = allocations.reduce((sum, o) => sum + (o.agreedCost - o.amountPaid), 0);
  const upcomingTours = bookings.filter(b => b.status === 'CONFIRMED').length;
  const completedThisMonth = bookings.filter(b => b.status === 'COMPLETED').length;
  const proposedCount = bookings.filter(b => b.status === 'PROPOSED').length;

  const stats = [
    { label: 'Total Bookings', value: totalBookings, icon: <CalendarDays size={22} />, color: 'bg-blue-50 text-paila-blue', change: '+12%' },
    { label: 'Active Tours', value: activeBookings, icon: <Mountain size={22} />, color: 'bg-orange-50 text-paila-orange', change: '+3' },
    { label: 'Total Revenue', value: `NPR ${(totalRevenue / 100000).toFixed(1)}L`, icon: <TrendingUp size={22} />, color: 'bg-green-50 text-green-700', change: '+18%' },
    { label: 'Advance Received', value: `NPR ${(totalAdvance / 100000).toFixed(1)}L`, icon: <Wallet size={22} />, color: 'bg-purple-50 text-purple-700', change: '+8%' },
    { label: 'Vendor Payables', value: `NPR ${(pendingVendorPayments / 1000).toFixed(0)}K`, icon: <AlertCircle size={22} />, color: 'bg-red-50 text-red-600', change: '-5%' },
    { label: 'Upcoming Tours', value: upcomingTours, icon: <Clock size={22} />, color: 'bg-amber-50 text-amber-700', change: '' },
  ];

  const recentBookings = [...bookings].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5);

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      PROPOSED: 'bg-amber-50 text-amber-700 border border-amber-200/60',
      CONFIRMED: 'bg-emerald-50 text-emerald-700 border border-emerald-200/60',
      IN_PROGRESS: 'bg-blue-50 text-blue-700 border border-blue-200/60',
      COMPLETED: 'bg-slate-50 text-slate-700 border border-slate-200/60',
      CANCELLED: 'bg-rose-50 text-rose-700 border border-rose-200/60',
    };
    return colors[status] || 'bg-slate-50 text-slate-700 border border-slate-200/60';
  };

  const isSuperAdmin = user.role === 'SUPER_ADMIN';

  return (
    <div className="p-4 md:p-6 space-y-6 md:space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold flex items-center gap-1.5 ${
              isSuperAdmin ? 'bg-paila-blue/10 text-paila-blue' : 'bg-slate-100 text-slate-700'
            }`}>
              <ShieldCheck size={12} />
              {isSuperAdmin ? 'Super Admin System Console' : `${user.role.replace('_', ' ')} Dashboard`}
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900">
            Welcome back, {user.name.split(' ')[0]}
          </h1>
          <p className="text-slate-500 text-sm md:text-base mt-0.5">
            {isSuperAdmin
              ? 'Operational overview with privileged audit stream and system tracking.'
              : "Here's what's happening with your tours and bookings today."}
          </p>
        </div>
      </div>

      {/* Active Field Emergency Alerts Banner (High Priority Visibility for Admin) */}
      {activeEmergencyAlerts.length > 0 && (
        <div className="bg-gradient-to-r from-red-600 via-red-500 to-rose-600 rounded-3xl p-5 md:p-6 text-white shadow-xl shadow-red-500/20 animate-in fade-in slide-in-from-top-3 duration-300">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 mb-4 border-b border-white/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shrink-0 shadow-inner">
                <AlertTriangle size={22} className="animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base md:text-lg font-black tracking-tight">
                    🚨 Active Field Emergency Alerts ({activeEmergencyAlerts.length})
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full bg-white text-red-600 text-[10px] font-black uppercase tracking-wider animate-bounce">
                    Action Required
                  </span>
                </div>
                <p className="text-xs text-red-100 mt-0.5">
                  Live SOS broadcasts and operational safety alerts dispatched from tour leaders in the field.
                </p>
              </div>
            </div>

            {onNavigate && (
              <button
                type="button"
                onClick={() => onNavigate('alerts')}
                className="self-start md:self-auto px-4 py-2 bg-white hover:bg-red-50 text-red-600 font-extrabold text-xs rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer active:scale-95 shrink-0"
              >
                Open Full Alert Center <ArrowRight size={14} />
              </button>
            )}
          </div>

          {/* Active Alerts Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {activeEmergencyAlerts.map(alert => (
              <div 
                key={alert.id}
                className="bg-black/20 hover:bg-black/25 backdrop-blur-md border border-white/15 rounded-2xl p-4 transition-all"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                      alert.severity === 'CRITICAL' ? 'bg-red-950 text-red-200 border border-red-400' : 'bg-amber-400 text-slate-950 font-bold'
                    }`}>
                      {alert.severity}
                    </span>
                    <span className="text-xs font-mono text-red-100 font-bold">
                      {alert.booking_code || 'FIELD ALERT'}
                    </span>
                  </div>

                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    alert.status === 'PENDING' ? 'bg-amber-400 text-slate-950 animate-pulse' : 'bg-white/20 text-white'
                  }`}>
                    {alert.status}
                  </span>
                </div>

                <h4 className="text-sm font-bold text-white mb-1">
                  {alert.title}
                </h4>
                <p className="text-xs text-red-100/90 mb-3 line-clamp-2">
                  {alert.description || 'No description provided.'}
                </p>

                {/* Metadata details */}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-red-100/80 mb-3 pt-2 border-t border-white/10">
                  <span className="font-semibold text-white">
                    Leader: {alert.tour_leader_name || 'Tour Operator'}
                  </span>
                  {alert.tour_leader_phone && (
                    <a 
                      href={`tel:${alert.tour_leader_phone}`}
                      className="inline-flex items-center gap-1 px-2 py-0.5 bg-white/15 hover:bg-white/30 rounded text-white font-mono text-[10px] transition-colors"
                    >
                      <Phone size={10} /> {alert.tour_leader_phone}
                    </a>
                  )}
                  {alert.location && (
                    <span className="inline-flex items-center gap-1 text-red-100">
                      <MapPin size={10} /> {alert.location}
                    </span>
                  )}
                  <span className="text-red-200/60">
                    {new Date(alert.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 pt-1">
                  {alert.status === 'PENDING' && (
                    <button
                      type="button"
                      disabled={processingAlertId === alert.id}
                      onClick={() => handleQuickAcknowledge(alert)}
                      className="flex-1 py-2 px-3 bg-white hover:bg-red-50 text-red-600 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                    >
                      <Check size={13} />
                      Acknowledge Alert
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={processingAlertId === alert.id}
                    onClick={() => handleQuickResolve(alert)}
                    className="flex-1 py-2 px-3 bg-white/20 hover:bg-white/30 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                  >
                    <CheckCircle2 size={13} />
                    Mark Resolved
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 md:gap-4">
        {stats.map((stat, i) => (
          <div key={i} className="card-hover p-3 md:p-4">
            <div className="flex items-center justify-between mb-2 md:mb-3">
              <div className={`w-9 h-9 md:w-10 md:h-10 rounded-xl flex items-center justify-center ${stat.color}`}>
                {stat.icon}
              </div>
              {stat.change && (
                <span className={`text-xs font-semibold flex items-center gap-0.5 ${stat.change.startsWith('+') ? 'text-green-600' : 'text-red-500'}`}>
                  {stat.change.startsWith('+') ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                  {stat.change}
                </span>
              )}
            </div>
            <p className="text-lg md:text-2xl font-bold text-slate-900 tabular-nums">{stat.value}</p>
            <p className="text-xs md:text-sm text-slate-500 mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Monthly Booking Status Trends Data Visualization */}
      <BookingStatusMonthlyChart
        bookings={bookings}
        defaultExpanded={true}
        className="shadow-xs"
      />

      {/* Main Content Grid */}
      {isSuperAdmin ? (
        /* Super Admin Layout: Activities Stream (7 cols) + Bookings & Metrics (5 cols) */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 space-y-6">
            {/* Tab Switcher for Feed Type */}
            <div className="flex items-center gap-2 p-1.5 bg-slate-200/70 dark:bg-slate-800/70 rounded-2xl w-fit">
              <button
                type="button"
                onClick={() => setActiveFeedTab('FIELD')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  activeFeedTab === 'FIELD'
                    ? 'bg-white dark:bg-slate-900 text-paila-blue dark:text-blue-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <Radio size={14} className={activeFeedTab === 'FIELD' ? 'text-emerald-500 animate-pulse' : ''} />
                Live Field Activity & Daily Checkpoints
                <span className="px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-mono">
                  {fieldActivities.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveFeedTab('AUDIT')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  activeFeedTab === 'AUDIT'
                    ? 'bg-white dark:bg-slate-900 text-paila-blue dark:text-blue-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <ShieldCheck size={14} />
                System Audit Stream
              </button>
            </div>

            {activeFeedTab === 'AUDIT' ? (
              <RecentActivitiesFeed />
            ) : (
              /* Live Field Activity Feed Component */
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
                <div className="p-4 md:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                      Tour Leader Field Activities & Daily Updates
                    </h2>
                  </div>
                  {onNavigate && (
                    <button
                      type="button"
                      onClick={() => onNavigate('field-activity')}
                      className="text-xs text-paila-blue hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      View All in Monitor <ArrowRight size={13} />
                    </button>
                  )}
                </div>

                {fieldActivities.length === 0 ? (
                  <div className="p-8 text-center">
                    <Compass className="mx-auto text-slate-300 mb-2" size={32} />
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No field activity reported yet</p>
                    <p className="text-xs text-slate-500 mt-1">Daily updates, checkpoints, and field receipts logged by tour leaders will appear here live.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[520px] overflow-y-auto">
                    {fieldActivities.slice(0, 10).map((act) => (
                      <div key={act.id} className="p-4 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                              act.type === 'CHECK_IN' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300' :
                              act.type === 'SPOT_EXPENSE' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' :
                              act.type === 'VENDOR_SWAP' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300' :
                              act.type === 'EMERGENCY_ALERT' ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' :
                              'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                            }`}>
                              {act.type === 'CHECK_IN' && <Compass size={18} />}
                              {act.type === 'SPOT_EXPENSE' && <DollarSign size={18} />}
                              {act.type === 'VENDOR_SWAP' && <RefreshCw size={18} />}
                              {act.type === 'EMERGENCY_ALERT' && <AlertTriangle size={18} />}
                              {act.type === 'STATUS_CHANGE' && <Mountain size={18} />}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider ${
                                  act.type === 'CHECK_IN' ? 'bg-purple-50 text-purple-700 border border-purple-200' :
                                  act.type === 'SPOT_EXPENSE' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                                  act.type === 'VENDOR_SWAP' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                                  'bg-blue-50 text-blue-700 border border-blue-200'
                                }`}>
                                  {act.type.replace('_', ' ')}
                                </span>
                                <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                                  {act.bookingCode}
                                </span>
                                <span className="text-xs text-slate-400">•</span>
                                <span className="text-xs text-slate-500 truncate">
                                  {act.clientName}
                                </span>
                              </div>

                              <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
                                {act.title}
                              </h4>
                              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                                {act.description}
                              </p>

                              {/* Details tags */}
                              <div className="flex flex-wrap items-center gap-2 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-[11px] text-slate-500">
                                <span>Leader: <strong className="text-slate-700 dark:text-slate-200">{act.tourLeaderName}</strong></span>
                                {act.metadata?.location && (
                                  <span className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
                                    <MapPin size={11} className="text-paila-orange" /> {act.metadata.location}
                                  </span>
                                )}
                                {act.metadata?.weather && (
                                  <span className="flex items-center gap-1 bg-amber-50 text-amber-800 px-1.5 py-0.5 rounded border border-amber-200 text-[10px]">
                                    <CloudSun size={11} /> {act.metadata.weather}
                                  </span>
                                )}
                                {act.metadata?.amount && (
                                  <span className="font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 text-[10px]">
                                    NPR {Number(act.metadata.amount).toLocaleString()}
                                  </span>
                                )}
                                <span className="ml-auto text-[10px] text-slate-400">
                                  {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                            </div>
                          </div>

                          {!act.acknowledged && (
                            <button
                              type="button"
                              onClick={() => {
                                acknowledgeActivity(act.id);
                                sounds.success();
                              }}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-lg shrink-0 transition-colors flex items-center gap-1 cursor-pointer"
                              title="Acknowledge activity"
                            >
                              <Check size={12} /> Acknowledge
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="lg:col-span-5 space-y-6">
            {/* Recent Bookings */}
            <div className="card overflow-hidden">
              <div className="px-4 md:px-5 py-3 md:py-4 border-b border-slate-100 flex items-center justify-between">
                <h2 className="font-semibold text-sm md:text-base text-slate-900">Recent Bookings</h2>
                <span className="badge-info">{totalBookings} total</span>
              </div>
              <div className="divide-y divide-slate-50">
                {recentBookings.map(booking => (
                  <div key={booking.id} className="px-4 md:px-5 py-3 md:py-3.5 hover:bg-slate-50/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-slate-400">{booking.bookingCode}</span>
                          <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${getStatusColor(booking.status)}`}>
                            {booking.status.replace('_', ' ')}
                          </span>
                        </div>
                        <p className="font-medium text-sm md:text-base text-slate-900 mt-1 truncate">{booking.clientName}</p>
                        <p className="text-xs md:text-sm text-slate-500 mt-0.5">
                          {booking.packageName || 'Custom Itinerary'} • {booking.paxCount} pax
                        </p>
                      </div>
                      <div className="text-right ml-3 md:ml-4">
                        <p className="text-xs md:text-sm font-semibold text-slate-900">
                          NPR {booking.totalAgreedAmount.toLocaleString()}
                        </p>
                        <p className="text-[10px] text-slate-400">{booking.startDate}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Booking Pipeline */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 md:p-5">
              <h3 className="font-semibold text-sm md:text-base text-slate-900 mb-3 md:mb-4">Booking Pipeline</h3>
              <div className="space-y-3">
                {[
                  { label: 'Proposed', count: proposedCount, color: 'bg-amber-500', total: totalBookings },
                  { label: 'Confirmed', count: bookings.filter(b => b.status === 'CONFIRMED').length, color: 'bg-blue-500', total: totalBookings },
                  { label: 'In Progress', count: bookings.filter(b => b.status === 'IN_PROGRESS').length, color: 'bg-green-500', total: totalBookings },
                  { label: 'Completed', count: completedThisMonth, color: 'bg-slate-400', total: totalBookings },
                ].map((item, i) => (
                  <div key={i}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-600">{item.label}</span>
                      <span className="font-medium text-slate-900">{item.count}</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${item.color} rounded-full transition-all duration-500`}
                        style={{ width: totalBookings ? `${(item.count / totalBookings) * 100}%` : '0%' }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Client Breakdown */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 md:p-5">
              <h3 className="font-semibold text-sm md:text-base text-slate-900 mb-3 md:mb-4">Client Breakdown</h3>
              <div className="space-y-1 md:space-y-2">
                {[
                  { type: 'Institutional', count: bookings.filter(b => b.clientType === 'INSTITUTIONAL').length, icon: '🏫' },
                  { type: 'Corporate', count: bookings.filter(b => b.clientType === 'CORPORATE').length, icon: '🏢' },
                  { type: 'Foreign Trek', count: bookings.filter(b => b.clientType === 'FOREIGN_TREK').length, icon: '🏔️' },
                  { type: 'Individual', count: bookings.filter(b => b.clientType === 'INDIVIDUAL').length, icon: '👤' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between py-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-lg md:text-xl">{item.icon}</span>
                      <span className="text-xs md:text-sm text-slate-600">{item.type}</span>
                    </div>
                    <span className="text-sm md:text-base font-semibold text-slate-900">{item.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Regular Staff (Operations/Sales/Finance) Layout */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          {/* Recent Bookings (2 cols) */}
          <div className="lg:col-span-2 card overflow-hidden">
            <div className="px-4 md:px-5 py-3 md:py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-semibold text-sm md:text-base text-slate-900">Recent Bookings</h2>
              <span className="badge-info">{totalBookings} total</span>
            </div>
            <div className="divide-y divide-slate-50">
              {recentBookings.map(booking => (
                <div key={booking.id} className="px-4 md:px-5 py-3 md:py-3.5 hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-slate-400">{booking.bookingCode}</span>
                        <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${getStatusColor(booking.status)}`}>
                          {booking.status.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="font-medium text-sm md:text-base text-slate-900 mt-1 truncate">{booking.clientName}</p>
                      <p className="text-xs md:text-sm text-slate-500 mt-0.5">
                        {booking.packageName || 'Custom Itinerary'} • {booking.paxCount} pax
                      </p>
                    </div>
                    <div className="text-right ml-3 md:ml-4">
                      <p className="text-xs md:text-sm font-semibold text-slate-900">
                        NPR {booking.totalAgreedAmount.toLocaleString()}
                      </p>
                      <p className="text-[10px] text-slate-400">{booking.startDate}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Stats Panel (1 col) */}
          <div className="space-y-4 md:space-y-6">
            {/* Booking Pipeline */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 md:p-5">
              <h3 className="font-semibold text-sm md:text-base text-slate-900 mb-3 md:mb-4">Booking Pipeline</h3>
              <div className="space-y-3">
                {[
                  { label: 'Proposed', count: proposedCount, color: 'bg-amber-500', total: totalBookings },
                  { label: 'Confirmed', count: bookings.filter(b => b.status === 'CONFIRMED').length, color: 'bg-blue-500', total: totalBookings },
                  { label: 'In Progress', count: bookings.filter(b => b.status === 'IN_PROGRESS').length, color: 'bg-green-500', total: totalBookings },
                  { label: 'Completed', count: completedThisMonth, color: 'bg-slate-400', total: totalBookings },
                ].map((item, i) => (
                  <div key={i}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-600">{item.label}</span>
                      <span className="font-medium text-slate-900">{item.count}</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${item.color} rounded-full transition-all duration-500`}
                        style={{ width: totalBookings ? `${(item.count / totalBookings) * 100}%` : '0%' }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Pending Actions */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 md:p-5">
              <h3 className="font-semibold text-sm md:text-base text-slate-900 mb-3 md:mb-4">Pending Actions</h3>
              <div className="space-y-2 md:space-y-3">
                <div className="flex items-start gap-2 md:gap-3 p-2 md:p-2.5 bg-amber-50 rounded-lg">
                  <AlertCircle size={16} className="text-amber-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs md:text-sm font-medium text-amber-800">3 Vendor Payments Pending</p>
                    <p className="text-[10px] md:text-xs text-amber-600 mt-0.5">NPR 190,000 total outstanding</p>
                  </div>
                </div>
                <div className="flex items-start gap-2 md:gap-3 p-2 md:p-2.5 bg-blue-50 rounded-lg">
                  <Clock size={16} className="text-blue-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs md:text-sm font-medium text-blue-800">2 Proposals Awaiting Response</p>
                    <p className="text-[10px] md:text-xs text-blue-600 mt-0.5">Nabil Bank & Patan Campus</p>
                  </div>
                </div>
                <div className="flex items-start gap-2 md:gap-3 p-2 md:p-2.5 bg-green-50 rounded-lg">
                  <CheckCircle2 size={16} className="text-green-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs md:text-sm font-medium text-green-800">1 Tour Starting Tomorrow</p>
                    <p className="text-[10px] md:text-xs text-green-600 mt-0.5">St. Xavier's College - Pokhara</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Client Breakdown */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 md:p-5">
              <h3 className="font-semibold text-sm md:text-base text-slate-900 mb-3 md:mb-4">Client Breakdown</h3>
              <div className="space-y-1 md:space-y-2">
                {[
                  { type: 'Institutional', count: bookings.filter(b => b.clientType === 'INSTITUTIONAL').length, icon: '🏫' },
                  { type: 'Corporate', count: bookings.filter(b => b.clientType === 'CORPORATE').length, icon: '🏢' },
                  { type: 'Foreign Trek', count: bookings.filter(b => b.clientType === 'FOREIGN_TREK').length, icon: '🏔️' },
                  { type: 'Individual', count: bookings.filter(b => b.clientType === 'INDIVIDUAL').length, icon: '👤' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between py-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-lg md:text-xl">{item.icon}</span>
                      <span className="text-xs md:text-sm text-slate-600">{item.type}</span>
                    </div>
                    <span className="text-sm md:text-base font-semibold text-slate-900">{item.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
