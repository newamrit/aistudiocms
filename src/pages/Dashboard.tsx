import { useAuth } from '../contexts/AuthContext';
import { useBookings } from '../contexts/BookingContext';
import { operationAllocations } from '../data/mockData';
import RecentActivitiesFeed from '../components/RecentActivitiesFeed';
import {
  CalendarDays, TrendingUp, Wallet, Users, Mountain,
  AlertCircle, CheckCircle2, Clock, ArrowUpRight, ArrowDownRight,
  ShieldCheck, Activity as ActivityIcon
} from 'lucide-react';

export default function Dashboard() {
  const { user } = useAuth();
  const { bookings } = useBookings();
  if (!user) return null;

  const totalBookings = bookings.length;
  const activeBookings = bookings.filter(b => ['CONFIRMED', 'IN_PROGRESS'].includes(b.status)).length;
  const totalRevenue = bookings.reduce((sum, b) => sum + b.totalAgreedAmount, 0);
  const totalAdvance = bookings.reduce((sum, b) => sum + b.advanceReceived, 0);
  const pendingVendorPayments = operationAllocations.reduce((sum, o) => sum + (o.agreedCost - o.amountPaid), 0);
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

      {/* Main Content Grid */}
      {isSuperAdmin ? (
        /* Super Admin Layout: Activities Stream (7 cols) + Bookings & Metrics (5 cols) */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 space-y-6">
            <RecentActivitiesFeed />
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
