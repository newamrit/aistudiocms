import React, { useState, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useActivities } from '../contexts/ActivityContext';
import { Activity, ActivityCategory } from '../types';
import {
  LogIn,
  CreditCard,
  CalendarCheck,
  Mountain,
  AlertTriangle,
  Search,
  RefreshCw,
  SlidersHorizontal,
  ChevronRight,
  Shield,
  Clock,
  User,
  X,
  ExternalLink,
  DollarSign,
  MapPin,
  Laptop
} from 'lucide-react';

interface RecentActivitiesFeedProps {
  onNavigateBooking?: (bookingId: number) => void;
  maxItems?: number;
}

export default function RecentActivitiesFeed({ maxItems }: RecentActivitiesFeedProps) {
  const { user } = useAuth();
  const { activities, clearActivities } = useActivities();
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  if (!user || user.role !== 'SUPER_ADMIN') {
    return null;
  }

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const categories: { id: string; label: string; count: number }[] = [
    { id: 'ALL', label: 'All Activities', count: activities.length },
    { id: 'BOOKING', label: 'Bookings', count: activities.filter(a => a.category === 'BOOKING').length },
    { id: 'PAYMENT', label: 'Payments', count: activities.filter(a => a.category === 'PAYMENT').length },
    { id: 'LOGIN', label: 'User Logins', count: activities.filter(a => a.category === 'LOGIN').length },
    { id: 'OPERATIONS', label: 'Field & Operations', count: activities.filter(a => a.category === 'OPERATIONS' || a.category === 'ALERT').length },
  ];

  const filteredActivities = useMemo(() => {
    return activities.filter(item => {
      // Category filter
      if (selectedCategory !== 'ALL') {
        if (selectedCategory === 'OPERATIONS') {
          if (item.category !== 'OPERATIONS' && item.category !== 'ALERT') return false;
        } else if (item.category !== selectedCategory) {
          return false;
        }
      }

      // Search query filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchTitle = item.title.toLowerCase().includes(query);
        const matchDesc = item.description.toLowerCase().includes(query);
        const matchActor = item.actor.name.toLowerCase().includes(query) || (item.actor.email && item.actor.email.toLowerCase().includes(query));
        const matchCode = item.metadata?.bookingCode?.toLowerCase().includes(query);
        const matchVendor = item.metadata?.vendorName?.toLowerCase().includes(query);
        const matchClient = item.metadata?.clientName?.toLowerCase().includes(query);

        return matchTitle || matchDesc || matchActor || matchCode || matchVendor || matchClient;
      }

      return true;
    });
  }, [activities, selectedCategory, searchQuery]);

  const displayedActivities = maxItems ? filteredActivities.slice(0, maxItems) : filteredActivities;

  const getActivityIcon = (category: ActivityCategory, type: string) => {
    switch (category) {
      case 'LOGIN':
        return <LogIn className="text-purple-600" size={16} />;
      case 'PAYMENT':
        return <CreditCard className="text-emerald-600" size={16} />;
      case 'BOOKING':
        return <CalendarCheck className="text-paila-orange" size={16} />;
      case 'ALERT':
        return <AlertTriangle className="text-rose-600" size={16} />;
      case 'OPERATIONS':
      default:
        return <Mountain className="text-paila-blue" size={16} />;
    }
  };

  const getCategoryBadgeClass = (category: ActivityCategory) => {
    switch (category) {
      case 'LOGIN':
        return 'bg-purple-50 text-purple-700 border-purple-200/70';
      case 'PAYMENT':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200/70';
      case 'BOOKING':
        return 'bg-orange-50 text-paila-orange border-orange-200/70';
      case 'ALERT':
        return 'bg-rose-50 text-rose-700 border-rose-200/70';
      case 'OPERATIONS':
      default:
        return 'bg-blue-50 text-paila-blue border-blue-200/70';
    }
  };

  const formatRelativeTime = (timestamp: string) => {
    const diff = Date.now() - new Date(timestamp).getTime();
    const seconds = Math.floor(diff / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
      {/* Header */}
      <div className="p-4 md:p-5 border-b border-slate-100">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h2 className="text-base font-bold text-slate-900 tracking-tight">Recent Activities</h2>
            <span className="text-xs bg-slate-100 text-slate-600 font-medium px-2 py-0.5 rounded-full">
              Audit Stream
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-56">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input
                type="text"
                placeholder="Filter events..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-paila-blue"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            <button
              onClick={handleRefresh}
              title="Refresh Activity Feed"
              className={`p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-transform ${isRefreshing ? 'animate-spin' : ''}`}
            >
              <RefreshCw size={14} />
            </button>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 mt-3 overflow-x-auto no-scrollbar pb-1 text-xs">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1 rounded-lg font-medium whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === cat.id
                  ? 'bg-paila-blue text-white shadow-xs'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/60'
              }`}
            >
              {cat.label}
              <span className={`ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] ${
                selectedCategory === cat.id ? 'bg-white/20 text-white' : 'bg-slate-200/70 text-slate-700'
              }`}>
                {cat.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Activity Stream List */}
      <div className="divide-y divide-slate-100 max-h-[460px] overflow-y-auto">
        {displayedActivities.length === 0 ? (
          <div className="py-12 text-center">
            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400 mb-3">
              <Clock size={20} />
            </div>
            <p className="text-sm font-semibold text-slate-700">No recent events found</p>
            <p className="text-xs text-slate-400 mt-1">Try changing your search keywords or category filters</p>
            {searchQuery && (
              <button
                onClick={() => { setSearchQuery(''); setSelectedCategory('ALL'); }}
                className="mt-3 text-xs font-semibold text-paila-blue hover:underline"
              >
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          displayedActivities.map(activity => {
            return (
              <div
                key={activity.id}
                onClick={() => setSelectedActivity(activity)}
                className="p-3.5 md:p-4 hover:bg-slate-50/80 transition-colors cursor-pointer group flex items-start gap-3.5"
              >
                {/* Category Icon */}
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${getCategoryBadgeClass(activity.category)}`}>
                  {getActivityIcon(activity.category, activity.type)}
                </div>

                {/* Event Body */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-xs md:text-sm text-slate-900 group-hover:text-paila-blue transition-colors">
                        {activity.title}
                      </span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${getCategoryBadgeClass(activity.category)}`}>
                        {activity.category}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400 whitespace-nowrap tabular-nums">
                      {formatRelativeTime(activity.timestamp)}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed mb-2 line-clamp-2">
                    {activity.description}
                  </p>

                  {/* Metadata Chips & Actor */}
                  <div className="flex items-center gap-2 flex-wrap text-[11px]">
                    {/* Actor */}
                    <div className="flex items-center gap-1.5 text-slate-500 font-medium">
                      <User size={12} className="text-slate-400" />
                      <span>{activity.actor.name}</span>
                      <span className="text-[10px] text-slate-400">({activity.actor.role.replace('_', ' ')})</span>
                    </div>

                    {/* Booking Code Tag */}
                    {activity.metadata?.bookingCode && (
                      <span className="bg-slate-100 text-slate-700 font-mono text-[10px] px-1.5 py-0.5 rounded">
                        {activity.metadata.bookingCode}
                      </span>
                    )}

                    {/* Amount Tag */}
                    {activity.metadata?.amount && (
                      <span className="bg-emerald-50 text-emerald-700 font-semibold text-[10px] px-1.5 py-0.5 rounded flex items-center gap-0.5">
                        <DollarSign size={10} />
                        NPR {activity.metadata.amount.toLocaleString()}
                      </span>
                    )}

                    {/* Payment Mode */}
                    {activity.metadata?.paymentMode && (
                      <span className="bg-blue-50 text-paila-blue text-[10px] px-1.5 py-0.5 rounded">
                        {activity.metadata.paymentMode.replace('_', ' ')}
                      </span>
                    )}

                    {/* Location */}
                    {activity.metadata?.location && (
                      <span className="text-slate-500 text-[10px] flex items-center gap-1">
                        <MapPin size={10} className="text-slate-400" />
                        {activity.metadata.location}
                      </span>
                    )}
                  </div>
                </div>

                {/* Right Arrow indicator */}
                <div className="text-slate-300 group-hover:text-slate-500 self-center transition-colors">
                  <ChevronRight size={16} />
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer info & Reset */}
      <div className="p-3 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 px-4">
        <span>Showing {displayedActivities.length} of {activities.length} recorded events</span>
        <button
          onClick={clearActivities}
          className="text-[11px] text-slate-400 hover:text-slate-700 hover:underline cursor-pointer"
        >
          Reset Demo Stream
        </button>
      </div>

      {/* Activity Details Slide-Over / Modal */}
      {selectedActivity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-scale-in">
            {/* Modal Header */}
            <div className="p-5 bg-gradient-to-r from-slate-900 to-paila-blue text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-white">
                  {getActivityIcon(selectedActivity.category, selectedActivity.type)}
                </div>
                <div>
                  <h3 className="font-bold text-sm md:text-base">{selectedActivity.title}</h3>
                  <p className="text-xs text-blue-200">
                    Category: {selectedActivity.category} • ID: {selectedActivity.id}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedActivity(null)}
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 text-xs md:text-sm">
              <div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                  Event Summary
                </span>
                <p className="text-slate-800 bg-slate-50 p-3 rounded-xl border border-slate-200/70 leading-relaxed">
                  {selectedActivity.description}
                </p>
              </div>

              {/* Actor Information */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/70">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                    Initiated By
                  </span>
                  <p className="font-semibold text-slate-900">{selectedActivity.actor.name}</p>
                  <p className="text-[11px] text-slate-500">{selectedActivity.actor.role.replace('_', ' ')}</p>
                  {selectedActivity.actor.email && (
                    <p className="text-[11px] text-slate-400">{selectedActivity.actor.email}</p>
                  )}
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/70">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                    Timestamp
                  </span>
                  <p className="font-semibold text-slate-900">
                    {new Date(selectedActivity.timestamp).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {new Date(selectedActivity.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">({formatRelativeTime(selectedActivity.timestamp)})</p>
                </div>
              </div>

              {/* Specific Metadata Parameters */}
              {selectedActivity.metadata && Object.keys(selectedActivity.metadata).length > 0 && (
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Audit Parameters & Context
                  </span>
                  <div className="bg-slate-50 rounded-xl border border-slate-200/70 divide-y divide-slate-100 overflow-hidden text-xs">
                    {selectedActivity.metadata.bookingCode && (
                      <div className="px-3 py-2 flex items-center justify-between">
                        <span className="text-slate-500">Booking Reference</span>
                        <span className="font-mono font-semibold text-slate-900">{selectedActivity.metadata.bookingCode}</span>
                      </div>
                    )}
                    {selectedActivity.metadata.clientName && (
                      <div className="px-3 py-2 flex items-center justify-between">
                        <span className="text-slate-500">Client / Organization</span>
                        <span className="font-medium text-slate-900">{selectedActivity.metadata.clientName}</span>
                      </div>
                    )}
                    {selectedActivity.metadata.vendorName && (
                      <div className="px-3 py-2 flex items-center justify-between">
                        <span className="text-slate-500">Vendor Partner</span>
                        <span className="font-medium text-slate-900">{selectedActivity.metadata.vendorName}</span>
                      </div>
                    )}
                    {selectedActivity.metadata.amount && (
                      <div className="px-3 py-2 flex items-center justify-between">
                        <span className="text-slate-500">Transaction Value</span>
                        <span className="font-bold text-emerald-700">NPR {selectedActivity.metadata.amount.toLocaleString()}</span>
                      </div>
                    )}
                    {selectedActivity.metadata.paymentMode && (
                      <div className="px-3 py-2 flex items-center justify-between">
                        <span className="text-slate-500">Payment Gateway</span>
                        <span className="font-medium text-paila-blue">{selectedActivity.metadata.paymentMode.replace('_', ' ')}</span>
                      </div>
                    )}
                    {selectedActivity.metadata.oldStatus && selectedActivity.metadata.newStatus && (
                      <div className="px-3 py-2 flex items-center justify-between">
                        <span className="text-slate-500">State Transition</span>
                        <div className="flex items-center gap-1.5">
                          <span className="line-through text-slate-400">{selectedActivity.metadata.oldStatus}</span>
                          <span>→</span>
                          <span className="font-bold text-slate-900">{selectedActivity.metadata.newStatus}</span>
                        </div>
                      </div>
                    )}
                    {selectedActivity.metadata.location && (
                      <div className="px-3 py-2 flex items-center justify-between">
                        <span className="text-slate-500">Geo Checkpoint</span>
                        <span className="font-medium text-slate-900">{selectedActivity.metadata.location}</span>
                      </div>
                    )}
                    {selectedActivity.metadata.ipAddress && (
                      <div className="px-3 py-2 flex items-center justify-between">
                        <span className="text-slate-500">IP & Network Location</span>
                        <span className="font-mono text-slate-700">{selectedActivity.metadata.ipAddress}</span>
                      </div>
                    )}
                    {selectedActivity.metadata.details && (
                      <div className="px-3 py-2 flex items-center justify-between">
                        <span className="text-slate-500">Diagnostics</span>
                        <span className="text-slate-700">{selectedActivity.metadata.details}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end">
              <button
                onClick={() => setSelectedActivity(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold cursor-pointer transition-colors"
              >
                Close Audit Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
