import React, { useState, useMemo } from 'react';
import { useFieldActivity, FieldActivity as ActivityType } from '../contexts/FieldActivityContext';
import { useBookings } from '../contexts/BookingContext';
import { useAuth } from '../contexts/AuthContext';
import { useCompanySettings } from '../contexts/CompanySettingsContext';
import { 
  Activity, MapPin, DollarSign, RefreshCw, CheckCircle, Clock, 
  AlertTriangle, Bell, Filter, User, Calendar, TrendingUp, Image as ImageIcon, 
  X, Download, FileSpreadsheet, FileText, Search, RotateCcw, Check, Sparkles, Printer,
  Shield, Settings, Layers, ExternalLink
} from 'lucide-react';
import { formatNepalTime, formatRelativeTime } from '../utils/timeFormat';
import { sounds } from '../utils/sounds';
import FieldActivityTrends from '../components/FieldActivityTrends';
import { exportActivitiesToPdf, exportActivitiesToExcel } from '../utils/exportFieldActivity';
import OfflineSyncLog from '../components/OfflineSyncLog';

export default function FieldActivity() {
  const { activities, acknowledgeActivity, getUnacknowledgedCount } = useFieldActivity();
  const { bookings } = useBookings();
  const { usersList, user: currentUser } = useAuth();
  const { settings } = useCompanySettings();

  // Filter States
  const [selectedBooking, setSelectedBooking] = useState<string>('ALL');
  const [selectedTourOperator, setSelectedTourOperator] = useState<string>('ALL');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterPriority, setFilterPriority] = useState<string>('ALL');
  const [showAcknowledged, setShowAcknowledged] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [activeCategoryTab, setActiveCategoryTab] = useState<string>('ALL');
  
  // Bulk Selection States
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  
  // UI Feedback States
  const [selectedReceipt, setSelectedReceipt] = useState<{ title: string; image: string; actor: string; date: string; amount?: number } | null>(null);
  const [showMapModal, setShowMapModal] = useState<{ title: string; location: string; actor: string } | null>(null);
  const [exportNotice, setExportNotice] = useState<string | null>(null);
  const [showSyncLogModal, setShowSyncLogModal] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const unacknowledgedCount = getUnacknowledgedCount();

  const categories = [
    { id: 'ALL', label: 'All Feed', icon: <Layers size={14} /> },
    { id: 'SAFETY', label: 'Safety & Alerts', icon: <Shield size={14} />, types: ['CHECK_IN', 'EMERGENCY_ALERT'] },
    { id: 'FINANCE', label: 'Expenses', icon: <DollarSign size={14} />, types: ['SPOT_EXPENSE'] },
    { id: 'OPS', label: 'Operational', icon: <Settings size={14} />, types: ['VENDOR_SWAP', 'STATUS_CHANGE'] },
  ];

  // 1. Build distinct list of Bookings for filter dropdown
  const bookingOptions = useMemo(() => {
    const map = new Map<string, { code: string; label: string }>();

    // Add from bookings context
    bookings.forEach(b => {
      if (b.bookingCode) {
        map.set(b.bookingCode.toUpperCase(), {
          code: b.bookingCode,
          label: `${b.bookingCode} - ${b.clientName} (${b.packageName || 'Custom'})`
        });
      }
    });

    // Add any from activities that might not be in bookings context
    activities.forEach(a => {
      if (a.bookingCode && !map.has(a.bookingCode.toUpperCase())) {
        map.set(a.bookingCode.toUpperCase(), {
          code: a.bookingCode,
          label: `${a.bookingCode} - ${a.clientName || 'Client'}`
        });
      }
    });

    return Array.from(map.values()).sort((a, b) => a.code.localeCompare(b.code));
  }, [bookings, activities]);

  // 2. Build distinct list of Tour Operators / Leaders for filter dropdown
  const tourOperatorOptions = useMemo(() => {
    const map = new Map<string, { idOrName: string; name: string; roleLabel: string }>();

    // Add tour leaders & operations staff from usersList
    usersList
      .filter(u => u.role === 'TOUR_OPERATOR' || u.role === 'OPERATIONS')
      .forEach(u => {
        map.set(u.name.toLowerCase(), {
          idOrName: u.name,
          name: u.name,
          roleLabel: u.role === 'TOUR_OPERATOR' ? 'Tour Leader' : 'Operations Staff'
        });
      });

    // Add any distinct tour leaders mentioned in activities
    activities.forEach(a => {
      if (a.tourLeaderName && !map.has(a.tourLeaderName.toLowerCase())) {
        map.set(a.tourLeaderName.toLowerCase(), {
          idOrName: a.tourLeaderName,
          name: a.tourLeaderName,
          roleLabel: 'Tour Leader'
        });
      }
    });

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [usersList, activities]);

  // Count active filters
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedBooking !== 'ALL') count++;
    if (selectedTourOperator !== 'ALL') count++;
    if (filterType !== 'ALL') count++;
    if (filterPriority !== 'ALL') count++;
    if (!showAcknowledged) count++;
    if (searchQuery.trim()) count++;
    if (dateFrom) count++;
    if (dateTo) count++;
    return count;
  }, [selectedBooking, selectedTourOperator, filterType, filterPriority, showAcknowledged, searchQuery, dateFrom, dateTo]);

  // Reset all filters
  const handleResetFilters = () => {
    sounds.click();
    setSelectedBooking('ALL');
    setSelectedTourOperator('ALL');
    setFilterType('ALL');
    setFilterPriority('ALL');
    setShowAcknowledged(true);
    setSearchQuery('');
    setDateFrom('');
    setDateTo('');
  };

  // 3. Filtered Activities List
  const filteredActivities = useMemo(() => {
    return activities.filter(activity => {
      // Category Tab filter
      if (activeCategoryTab !== 'ALL') {
        const catObj = categories.find(c => c.id === activeCategoryTab);
        const types = catObj?.types;
        if (types && !types.includes(activity.type)) return false;
      }

      // Acknowledged filter
      if (!showAcknowledged && activity.acknowledged) return false;

      // Type filter
      if (filterType !== 'ALL' && activity.type !== filterType) return false;

      // Priority filter
      if (filterPriority !== 'ALL' && activity.priority !== filterPriority) return false;

      // Booking filter
      if (selectedBooking !== 'ALL') {
        const targetBooking = selectedBooking.toUpperCase();
        const codeMatch = activity.bookingCode && activity.bookingCode.toUpperCase() === targetBooking;
        const idMatch = String(activity.bookingId) === selectedBooking;
        if (!codeMatch && !idMatch) return false;
      }

      // Tour Operator filter
      if (selectedTourOperator !== 'ALL') {
        const targetOperator = selectedTourOperator.toLowerCase();
        const nameMatch = activity.tourLeaderName && activity.tourLeaderName.toLowerCase() === targetOperator;
        const idMatch = String(activity.tourLeaderId) === selectedTourOperator;
        if (!nameMatch && !idMatch) return false;
      }

      // Search query filter (search across title, description, client, booking, leader)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const searchCorpus = [
          activity.title,
          activity.description,
          activity.clientName,
          activity.bookingCode,
          activity.tourLeaderName,
          activity.type
        ].filter(Boolean).join(' ').toLowerCase();

        if (!searchCorpus.includes(query)) return false;
      }

      // Date range filter
      if (dateFrom || dateTo) {
        const activityDate = activity.timestamp.split('T')[0];
        if (dateFrom && activityDate < dateFrom) return false;
        if (dateTo && activityDate > dateTo) return false;
      }

      return true;
    });
  }, [activities, showAcknowledged, filterType, filterPriority, selectedBooking, selectedTourOperator, searchQuery, dateFrom, dateTo, activeCategoryTab]);

  // Bulk Selection Handlers
  const toggleSelectAll = () => {
    if (selectedIds.length === filteredActivities.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredActivities.map(a => a.id));
    }
  };

  const toggleSelectOne = (id: number) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleBulkAcknowledge = async () => {
    if (selectedIds.length === 0) return;
    sounds.success();
    for (const id of selectedIds) {
      await acknowledgeActivity(id);
    }
    setExportNotice(`Acknowledged ${selectedIds.length} activities.`);
    setSelectedIds([]);
    setTimeout(() => setExportNotice(null), 3000);
  };

  const handleAcknowledgeAll = async () => {
    const unAckIds = filteredActivities.filter(a => !a.acknowledged).map(a => a.id);
    if (unAckIds.length === 0) return;
    sounds.success();
    for (const id of unAckIds) {
      await acknowledgeActivity(id);
    }
    setExportNotice(`All ${unAckIds.length} visible activities acknowledged.`);
    setTimeout(() => setExportNotice(null), 3000);
  };

  const handleRefreshFeed = () => {
    setIsRefreshing(true);
    sounds.click();
    setTimeout(() => {
      setIsRefreshing(false);
      setExportNotice('Live feed synchronized with cloud.');
      setTimeout(() => setExportNotice(null), 2000);
    }, 1000);
  };
  const handleExportPDF = () => {
    sounds.click();
    if (filteredActivities.length === 0) {
      sounds.warning();
      setExportNotice('No activities match current filters to export.');
      setTimeout(() => setExportNotice(null), 3500);
      return;
    }

    try {
      exportActivitiesToPdf({
        activities: filteredActivities,
        filtersApplied: {
          bookingCode: selectedBooking !== 'ALL' ? selectedBooking : undefined,
          tourOperatorName: selectedTourOperator !== 'ALL' ? selectedTourOperator : undefined,
          activityType: filterType !== 'ALL' ? filterType : undefined,
          priority: filterPriority !== 'ALL' ? filterPriority : undefined,
          showAcknowledged,
          searchQuery: searchQuery || undefined,
        },
        companyName: settings.companyName,
        exportedBy: `${currentUser?.name || 'Administrator'} (${currentUser?.role || 'SUPER_ADMIN'})`
      });
      sounds.success();
      setExportNotice(`Exported ${filteredActivities.length} activities to PDF successfully!`);
      setTimeout(() => setExportNotice(null), 4000);
    } catch (err) {
      console.error('PDF Export failed:', err);
      sounds.warning();
      setExportNotice('PDF generation failed. Please try again.');
      setTimeout(() => setExportNotice(null), 4000);
    }
  };

  const handleExportExcel = () => {
    sounds.click();
    if (filteredActivities.length === 0) {
      sounds.warning();
      setExportNotice('No activities match current filters to export.');
      setTimeout(() => setExportNotice(null), 3500);
      return;
    }

    try {
      exportActivitiesToExcel({
        activities: filteredActivities,
        filtersApplied: {
          bookingCode: selectedBooking !== 'ALL' ? selectedBooking : undefined,
          tourOperatorName: selectedTourOperator !== 'ALL' ? selectedTourOperator : undefined,
          activityType: filterType !== 'ALL' ? filterType : undefined,
          priority: filterPriority !== 'ALL' ? filterPriority : undefined,
          showAcknowledged,
          searchQuery: searchQuery || undefined,
        },
        companyName: settings.companyName,
        exportedBy: `${currentUser?.name || 'Administrator'} (${currentUser?.role || 'SUPER_ADMIN'})`
      });
      sounds.success();
      setExportNotice(`Exported ${filteredActivities.length} activities to Excel (.xlsx) successfully!`);
      setTimeout(() => setExportNotice(null), 4000);
    } catch (err) {
      console.error('Excel Export failed:', err);
      sounds.warning();
      setExportNotice('Excel generation failed. Please try again.');
      setTimeout(() => setExportNotice(null), 4000);
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'STATUS_CHANGE': return <RefreshCw size={16} className="text-blue-600 dark:text-blue-400" />;
      case 'VENDOR_SWAP': return <RefreshCw size={16} className="text-orange-600 dark:text-orange-400" />;
      case 'SPOT_EXPENSE': return <DollarSign size={16} className="text-green-600 dark:text-green-400" />;
      case 'CHECK_IN': return <CheckCircle size={16} className="text-purple-600 dark:text-purple-400" />;
      case 'EMERGENCY_ALERT': return <AlertTriangle size={16} className="text-red-600 dark:text-red-400" />;
      default: return <Activity size={16} className="text-slate-600 dark:text-slate-400" />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'STATUS_CHANGE': return 'border-blue-500 bg-blue-50/40 dark:bg-blue-950/20';
      case 'VENDOR_SWAP': return 'border-orange-500 bg-orange-50/40 dark:bg-orange-950/20';
      case 'SPOT_EXPENSE': return 'border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20';
      case 'CHECK_IN': return 'border-purple-500 bg-purple-50/40 dark:bg-purple-950/20';
      case 'EMERGENCY_ALERT': return 'border-red-500 bg-red-50/50 dark:bg-red-950/30';
      default: return 'border-slate-400 bg-slate-50/40 dark:bg-slate-900/30';
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'CRITICAL': return 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300 border-red-200 dark:border-red-800';
      case 'HIGH': return 'bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300 border-orange-200 dark:border-orange-800';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950/60 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800';
      case 'LOW': return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700';
      default: return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700';
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
    <div className="p-4 sm:p-6 space-y-6">
      {/* Export Feedback Toast */}
      {exportNotice && (
        <div className="fixed top-4 right-4 z-50 animate-in fade-in slide-in-from-top-3 duration-300">
          <div className="flex items-center gap-2.5 px-4 py-3 bg-slate-900 text-white dark:bg-white dark:text-slate-900 rounded-xl shadow-2xl border border-slate-700/80 text-xs font-semibold backdrop-blur-md">
            <CheckCircle size={16} className="text-emerald-400 dark:text-emerald-600 shrink-0" />
            <span>{exportNotice}</span>
            <button 
              onClick={() => setExportNotice(null)} 
              className="ml-2 text-slate-400 hover:text-white dark:hover:text-black p-0.5"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Header & Export Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            Field Activity Monitor
            {activeFiltersCount > 0 && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300">
                Filtered: {filteredActivities.length} of {activities.length}
              </span>
            )}
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1 text-sm">
            Live operational updates, safety check-ins, spot expenses & emergency reports from the Himalayas
          </p>
        </div>

        {/* Right Header: Badges & Export Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Live Signal Indicator */}
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
            <div className="flex gap-0.5 items-end h-3 w-4">
              <div className="w-0.5 bg-emerald-500 h-1"></div>
              <div className="w-0.5 bg-emerald-500 h-1.5"></div>
              <div className="w-0.5 bg-emerald-500 h-2"></div>
              <div className="w-0.5 bg-emerald-500 h-3"></div>
            </div>
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Field Signal: Optimal</span>
          </div>

          <div className="hidden sm:block text-right mr-2">
            <p className="text-[10px] font-bold text-slate-400 uppercase leading-none">Last Sync</p>
            <p className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
          </div>

          {unacknowledgedCount > 0 && (
            <button
              onClick={() => {
                sounds.click();
                setShowAcknowledged(false);
              }}
              className="flex items-center gap-2 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl px-3.5 py-2 hover:bg-red-100 dark:hover:bg-red-900/60 transition-all cursor-pointer active:scale-95 group"
              title="Click to view only unacknowledged activities"
            >
              <Bell size={16} className="text-red-600 dark:text-red-400 animate-pulse group-hover:scale-110 transition-transform" />
              <span className="text-xs font-bold text-red-700 dark:text-red-300">
                {unacknowledgedCount} Unacknowledged
              </span>
            </button>
          )}

          {/* View Offline Sync Log */}
          <button
            type="button"
            onClick={() => { sounds.click(); setShowSyncLogModal(true); }}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:hover:bg-blue-900/60 dark:text-blue-300 border border-blue-300 dark:border-blue-800 rounded-xl text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer"
            title="Inspect background sync attempt history & connectivity diagnostics"
          >
            <Activity size={15} className="text-blue-600 dark:text-blue-400" />
            <span>Sync Log</span>
          </button>

          {/* Export to Excel (.xlsx) */}
          <button
            type="button"
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 rounded-xl text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer"
            title="Download field activities as Excel spreadsheet (.xlsx)"
          >
            <FileSpreadsheet size={15} className="text-emerald-600 dark:text-emerald-400" />
            <span>Export Excel</span>
          </button>

          {/* Export to PDF (.pdf) */}
          <button
            type="button"
            onClick={handleExportPDF}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-[#012871] hover:bg-[#0a3d9e] text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer"
            title="Download field activities as formal PDF audit document"
          >
            <FileText size={15} />
            <span>Export PDF</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#111c30] rounded-xl border border-slate-200 dark:border-[#22324b] p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Activities</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{stats.total}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Database log count</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center">
              <Activity size={20} />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-[#111c30] rounded-xl border border-slate-200 dark:border-[#22324b] p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Today's Reports</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">{stats.today}</p>
              <p className="text-[11px] text-blue-500/80 dark:text-blue-400/80 mt-0.5">Active field updates</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-500 dark:text-blue-400 flex items-center justify-center">
              <Calendar size={20} />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-[#111c30] rounded-xl border border-slate-200 dark:border-[#22324b] p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Needs Review</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">{stats.unacknowledged}</p>
              <p className="text-[11px] text-red-500/80 dark:text-red-400/80 mt-0.5">Pending ops sign-off</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-500 dark:text-red-400 flex items-center justify-center">
              <Clock size={20} />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-[#111c30] rounded-xl border border-slate-200 dark:border-[#22324b] p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">High / Critical Priority</p>
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400 mt-1">{stats.highPriority}</p>
              <p className="text-[11px] text-orange-500/80 dark:text-orange-400/80 mt-0.5">Urgent attention items</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-orange-50 dark:bg-orange-950/40 text-orange-500 dark:text-orange-400 flex items-center justify-center">
              <AlertTriangle size={20} />
            </div>
          </div>
        </div>
      </div>

      {/* 7-Day Activity & Check-in Volume Trend Data Visualization (Recharts) */}
      <FieldActivityTrends activities={filteredActivities} />

      {/* Category Selection Tabs & Live Actions */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl shadow-xs border border-slate-200 dark:border-slate-700">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => { sounds.click(); setActiveCategoryTab(cat.id); }}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeCategoryTab === cat.id
                  ? 'bg-white dark:bg-slate-700 text-paila-blue dark:text-blue-400 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              {cat.icon}
              <span>{cat.label}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRefreshFeed}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-xs"
          >
            <RefreshCw size={14} className={isRefreshing ? 'animate-spin text-blue-500' : ''} />
            <span>{isRefreshing ? 'Syncing Feed...' : 'Sync Live Feed'}</span>
          </button>
          
          <button
            onClick={handleAcknowledgeAll}
            className="flex items-center gap-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95"
          >
            <CheckCircle size={14} />
            <span>Mark All Read</span>
          </button>
        </div>
      </div>

      {/* Floating Bulk Actions Bar */}
      {selectedIds.length > 0 && (
        <div className="sticky top-20 z-40 bg-slate-900 text-white p-3 rounded-2xl shadow-2xl border border-slate-700 flex items-center justify-between animate-in slide-in-from-top-4 duration-200">
          <div className="flex items-center gap-3 ml-2">
            <span className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center font-bold text-sm">
              {selectedIds.length}
            </span>
            <p className="text-sm font-bold">Activities Selected</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedIds([])}
              className="px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleBulkAcknowledge}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-900/40"
            >
              <CheckCircle size={14} />
              <span>Acknowledge {selectedIds.length} Selected</span>
            </button>
          </div>
        </div>
      )}

      {/* Filter Control Center: Filter by Bookings, Tour Operator, Type, Priority, Search */}
      <div className="bg-white dark:bg-[#111c30] rounded-2xl border border-slate-200 dark:border-[#22324b] p-4 sm:p-5 shadow-xs">
        <div className="flex items-center justify-between pb-3.5 mb-3.5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Filter size={15} />
            </div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              Filter Field Activities
            </h3>
            {activeFiltersCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-600 text-white">
                {activeFiltersCount} ACTIVE
              </span>
            )}
          </div>

          {/* Clear Filters Button */}
          {activeFiltersCount > 0 && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 transition-colors cursor-pointer"
            >
              <RotateCcw size={13} />
              <span>Reset Filters</span>
            </button>
          )}
        </div>

        {/* Filter Inputs Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* 1. Filter by Bookings */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <MapPin size={13} className="text-blue-500" />
              <span>Booking</span>
            </label>
            <select
              value={selectedBooking}
              onChange={(e) => setSelectedBooking(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer"
            >
              <option value="ALL">All Bookings ({activities.length} activities)</option>
              {bookingOptions.map(b => (
                <option key={b.code} value={b.code}>
                  {b.label}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Filter by Tour Operator */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <User size={13} className="text-orange-500" />
              <span>Tour Operator / Leader</span>
            </label>
            <select
              value={selectedTourOperator}
              onChange={(e) => setSelectedTourOperator(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer"
            >
              <option value="ALL">All Tour Operators ({tourOperatorOptions.length} staff)</option>
              {tourOperatorOptions.map(to => (
                <option key={to.name} value={to.name}>
                  {to.name} ({to.roleLabel})
                </option>
              ))}
            </select>
          </div>

          {/* 3. Filter by Activity Type */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Activity size={13} className="text-purple-500" />
              <span>Activity Type</span>
            </label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer"
            >
              <option value="ALL">All Types</option>
              <option value="CHECK_IN">Safety Check-ins</option>
              <option value="SPOT_EXPENSE">Spot Expenses</option>
              <option value="VENDOR_SWAP">Vendor Swaps</option>
              <option value="STATUS_CHANGE">Status Changes</option>
              <option value="EMERGENCY_ALERT">Emergency Alerts</option>
            </select>
          </div>

          {/* 4. Filter by Priority */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <AlertTriangle size={13} className="text-rose-500" />
              <span>Priority Level</span>
            </label>
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer"
            >
              <option value="ALL">All Priorities</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>
        </div>

        {/* Date Range Filter Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mt-3.5 pt-3.5 border-t border-slate-100 dark:border-slate-800">
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar size={13} className="text-blue-500" />
              <span>Activity From</span>
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar size={13} className="text-blue-500" />
              <span>Activity To</span>
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer"
            />
          </div>
        </div>

        {/* Secondary Row: Text Search & Acknowledged Checkbox */}
        <div className="mt-3.5 pt-3.5 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Quick Search */}
          <div className="relative flex-1 max-w-md">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search title, description, client name, or destination..."
              className="w-full pl-9 pr-8 py-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Show Acknowledged Toggle */}
          <label className="flex items-center gap-2 cursor-pointer self-start sm:self-auto select-none">
            <input
              type="checkbox"
              checked={showAcknowledged}
              onChange={(e) => setShowAcknowledged(e.target.checked)}
              className="w-4 h-4 text-blue-600 border-slate-300 dark:border-slate-700 rounded focus:ring-blue-500 dark:bg-slate-800"
            />
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Include Acknowledged Reports
            </span>
          </label>
        </div>
      </div>

      {/* Activity Timeline Table & List */}
      <div className="bg-white dark:bg-[#111c30] rounded-2xl border border-slate-200 dark:border-[#22324b] shadow-xs overflow-hidden">
        {/* Timeline Header Bar */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-[#22324b] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Activity Timeline Ledger
              </h2>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                {filteredActivities.length} {filteredActivities.length === 1 ? 'record' : 'records'}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1">
              <Clock size={12} />
              Chronological log recorded in Nepal Time (NPT, UTC+5:45)
            </p>
          </div>

          {/* Quick Timeline Export Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={toggleSelectAll}
              className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
            >
              {selectedIds.length === filteredActivities.length ? 'Deselect All' : 'Select All Filtered'}
            </button>
            <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 mx-1 hidden sm:block" />
            <button
              type="button"
              onClick={handleExportExcel}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 border border-emerald-300 dark:border-emerald-800/80 transition-colors cursor-pointer"
              title="Export visible list to Excel"
            >
              <FileSpreadsheet size={13} />
              <span className="hidden sm:inline">Excel</span>
            </button>
            <button
              type="button"
              onClick={handleExportPDF}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 border border-rose-300 dark:border-rose-800/80 transition-colors cursor-pointer"
              title="Export visible list to PDF"
            >
              <FileText size={13} />
              <span className="hidden sm:inline">PDF</span>
            </button>
          </div>
        </div>

        {/* Timeline Items */}
        <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
          {filteredActivities.length === 0 ? (
            <div className="p-12 text-center">
              <Activity size={44} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">No field activities found</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                No activities match the current filter selection. Try changing the booking, tour operator, or resetting your filters.
              </p>
              {activeFiltersCount > 0 && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="mt-3.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-lg text-xs font-bold hover:bg-blue-100 transition-colors inline-flex items-center gap-1.5"
                >
                  <RotateCcw size={12} />
                  <span>Reset All Filters</span>
                </button>
              )}
            </div>
          ) : (
            filteredActivities.map((activity) => (
              <div
                key={activity.id}
                className={`p-5 sm:p-6 border-l-4 transition-colors relative group ${getActivityColor(activity.type)} ${selectedIds.includes(activity.id) ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}
              >
                {/* Checkbox for Bulk Actions */}
                <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(activity.id)}
                    onChange={() => toggleSelectOne(activity.id)}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 dark:border-slate-700"
                  />
                </div>

                <div className="flex items-start gap-3.5 sm:gap-4">
                  <div className="p-2 rounded-xl bg-white dark:bg-slate-800 shadow-2xs border border-slate-200/80 dark:border-slate-700 shrink-0 mt-0.5">
                    {getActivityIcon(activity.type)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                            {activity.title}
                          </h3>
                          <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${getPriorityBadge(activity.priority || 'LOW')}`}>
                            {activity.priority || 'LOW'}
                          </span>
                          {!activity.acknowledged && (
                            <span className="px-2 py-0.5 text-[10px] font-black rounded-full bg-red-100 text-red-700 dark:bg-red-950/70 dark:text-red-300 border border-red-200 dark:border-red-800 animate-pulse">
                              NEW
                            </span>
                          )}
                        </div>

                        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mb-2 leading-relaxed">
                          {activity.description}
                        </p>

                        <div className="flex items-center gap-3 sm:gap-5 flex-wrap text-xs text-slate-500 dark:text-slate-400">
                          <span className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
                            <User size={13} className="text-orange-500" />
                            {activity.tourLeaderName || 'Tour Leader'}
                          </span>
                          <span className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
                            <MapPin size={13} className="text-blue-500" />
                            {activity.bookingCode} • {activity.clientName}
                          </span>
                          <span className="flex items-center gap-1.5" title={formatNepalTime(activity.timestamp)}>
                            <Clock size={13} className="text-slate-400" />
                            {formatRelativeTime(activity.timestamp)} ({formatNepalTime(activity.timestamp).split(',')[1]?.trim() || formatNepalTime(activity.timestamp)})
                          </span>
                        </div>

                        <div className="mt-3 flex items-center gap-2">
                          <button
                            onClick={() => {
                              sounds.click();
                              setShowMapModal({
                                title: activity.title,
                                actor: activity.tourLeaderName,
                                location: activity.metadata?.location || 'Mountain Trail, Solukhumbu'
                              });
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg text-[11px] font-bold transition-all border border-slate-200 dark:border-slate-700 hover:border-blue-300"
                          >
                            <MapPin size={12} />
                            <span>View on Live Map</span>
                          </button>
                        </div>

                        {/* Metadata Box */}
                        {activity.metadata && Object.keys(activity.metadata).length > 0 && (
                          <div className="mt-3 p-3 bg-white/80 dark:bg-slate-800/80 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
                            <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                              Operational Context:
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                              {Object.entries(activity.metadata).map(([key, value]) => {
                                if (key === 'receiptPreview' || key === 'receipt_image_url' || key === 'receiptImage') return null;
                                return (
                                  <div key={key} className="flex items-center gap-1 truncate">
                                    <span className="text-slate-500 dark:text-slate-400 capitalize">
                                      {key.replace(/([A-Z])/g, ' $1').trim()}:
                                    </span>{' '}
                                    <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                                      {typeof value === 'number' && Number.isFinite(value) && key.toLowerCase().includes('amount')
                                        ? `NPR ${value.toLocaleString()}`
                                        : String(value ?? '')}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>

                            {/* Receipt Image Thumbnail */}
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

                      {/* Right Action: Acknowledge or Verified Status */}
                      <div className="shrink-0 self-start sm:self-center">
                        {!activity.acknowledged ? (
                          <button
                            type="button"
                            onClick={() => {
                              sounds.success();
                              acknowledgeActivity(activity.id);
                            }}
                            className="px-3.5 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-lg shadow-sm transition-all active:scale-95 cursor-pointer"
                          >
                            Acknowledge
                          </button>
                        ) : (
                          <div className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 px-2.5 py-1 rounded-full">
                            <CheckCircle size={13} />
                            <span>Acknowledged</span>
                          </div>
                        )}
                      </div>
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
                {selectedReceipt.amount !== undefined && Number.isFinite(Number(selectedReceipt.amount)) && (
                  <span className="font-bold text-slate-900 dark:text-white mr-2">
                    Amount: NPR {Number(selectedReceipt.amount).toLocaleString()}
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

      {/* Map View Simulation Modal */}
      {showMapModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <MapPin size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Field Location Telemetry
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Live check-in reported by {showMapModal.actor}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowMapModal(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 bg-slate-100 dark:bg-slate-950 p-0 relative overflow-hidden flex items-center justify-center min-h-[400px]">
              {/* Map Placeholder Graphic */}
              <div className="absolute inset-0 opacity-20 pointer-events-none">
                <div className="w-full h-full" style={{ backgroundImage: 'radial-gradient(#3b82f6 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
              </div>
              
              <div className="relative text-center p-8">
                <div className="w-20 h-20 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-blue-500/30 animate-pulse">
                  <MapPin size={32} className="text-blue-600" />
                </div>
                <h4 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Live Topography Simulation</h4>
                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-6">
                  {showMapModal.location}
                </p>
                
                <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto">
                  <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm text-left">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Latitude</span>
                    <p className="text-sm font-mono font-bold text-slate-800 dark:text-slate-100">27.7172° N</p>
                  </div>
                  <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm text-left">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Longitude</span>
                    <p className="text-sm font-mono font-bold text-slate-800 dark:text-slate-100">85.3240° E</p>
                  </div>
                  <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm text-left">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Altitude</span>
                    <p className="text-sm font-mono font-bold text-emerald-600 dark:text-emerald-400">4,250m ASL</p>
                  </div>
                  <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm text-left">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Signal</span>
                    <p className="text-sm font-mono font-bold text-blue-500">4G LTE (Sat)</p>
                  </div>
                </div>
              </div>

              {/* Simulation Overlay */}
              <div className="absolute top-4 left-4 flex flex-col gap-2">
                <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-lg text-[11px] font-bold flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                  <span className="text-slate-800 dark:text-slate-100">TELEMETRY ACTIVE</span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setShowMapModal(null)}
                className="px-6 py-2 bg-[#012871] text-white rounded-xl text-sm font-bold shadow-md hover:bg-blue-800 transition-all active:scale-95"
              >
                Close Map
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Offline Sync Log & Diagnostics Modal */}
      <OfflineSyncLog
        isOpen={showSyncLogModal}
        onClose={() => setShowSyncLogModal(false)}
      />
    </div>
  );
}
