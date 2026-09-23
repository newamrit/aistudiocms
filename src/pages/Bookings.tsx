import { useState, useRef, useEffect, useMemo } from 'react';
import { BookingStatus, Booking } from '../types';
import { 
  Search, Filter, Plus, Eye, Calendar, Users, MapPin, Trash2, 
  Check, X, ChevronDown, Download, Sparkles, Layers, 
  CalendarRange, RotateCcw, ArrowRight, DollarSign,
  Tag, Clock, ChevronRight, FileText, Printer, FileSpreadsheet,
  BarChart3, TrendingUp
} from 'lucide-react';
import { useBookings } from '../contexts/BookingContext';
import { useAuth } from '../contexts/AuthContext';
import { sounds } from '../utils/sounds';
import BookingsReportModal from '../components/BookingsReportModal';
import BookingStatusMonthlyChart from '../components/BookingStatusMonthlyChart';

interface BookingsProps {
  onNavigate: (page: string, id?: number) => void;
}

const statusOptions: { value: BookingStatus; label: string; desc: string; color: string; dotColor: string }[] = [
  { value: 'PROPOSED', label: 'Proposed', desc: 'Initial quote & inquiry draft', color: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300 dark:border-amber-800', dotColor: 'bg-amber-500' },
  { value: 'CONFIRMED', label: 'Confirmed', desc: 'Advance paid & dates locked', color: 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-300 dark:border-blue-800', dotColor: 'bg-blue-500' },
  { value: 'IN_PROGRESS', label: 'In Progress', desc: 'Tour currently running on field', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800', dotColor: 'bg-emerald-500' },
  { value: 'COMPLETED', label: 'Completed', desc: 'Tour finished & accounts settled', color: 'bg-slate-100 text-slate-800 dark:bg-slate-800/80 dark:text-slate-200 border-slate-300 dark:border-slate-700', dotColor: 'bg-slate-400' },
  { value: 'CANCELLED', label: 'Cancelled', desc: 'Cancelled or abandoned trip', color: 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-300 dark:border-rose-800', dotColor: 'bg-rose-500' },
];

type DatePreset = 'ALL' | 'TODAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'NEXT_30_DAYS' | 'SPRING_2026' | 'AUTUMN_2026' | 'CUSTOM';

export default function Bookings({ onNavigate }: BookingsProps) {
  const { user } = useAuth();
  const { 
    bookings: bookingsList, 
    isLoading: isBookingsLoading, 
    error: bookingsError, 
    refreshBookings, 
    deleteBooking, 
    bulkUpdateStatus, 
    bulkDeleteBookings 
  } = useBookings();
  
  // Search & Filter state
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<BookingStatus | 'ALL'>('ALL');
  const [clientTypeFilter, setClientTypeFilter] = useState('ALL');
  
  // Date Range state
  const [datePreset, setDatePreset] = useState<DatePreset>('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Bulk Selection states
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showAnalyticsChart, setShowAnalyticsChart] = useState(true);
  const [selectedChartMonth, setSelectedChartMonth] = useState<string | null>(null);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [showSingleDeleteConfirm, setShowSingleDeleteConfirm] = useState<number | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  
  const statusMenuRef = useRef<HTMLDivElement>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const datePickerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const masterCheckboxRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut (Ctrl/Cmd + K) to focus search
  useEffect(() => {
    refreshBookings();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (statusMenuRef.current && !statusMenuRef.current.contains(e.target as Node)) {
        setShowStatusDropdown(false);
      }
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setShowExportDropdown(false);
      }
      if (datePickerRef.current && !datePickerRef.current.contains(e.target as Node)) {
        setShowDatePicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Apply Quick Date Presets
  const applyPreset = (preset: DatePreset) => {
    setDatePreset(preset);
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const formatDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    if (preset === 'ALL') {
      setDateFrom('');
      setDateTo('');
    } else if (preset === 'TODAY') {
      const todayStr = formatDate(now);
      setDateFrom(todayStr);
      setDateTo(todayStr);
    } else if (preset === 'THIS_WEEK') {
      const currentDay = now.getDay();
      const firstDay = new Date(now);
      firstDay.setDate(now.getDate() - currentDay);
      const lastDay = new Date(firstDay);
      lastDay.setDate(firstDay.getDate() + 6);
      setDateFrom(formatDate(firstDay));
      setDateTo(formatDate(lastDay));
    } else if (preset === 'THIS_MONTH') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      setDateFrom(formatDate(firstDay));
      setDateTo(formatDate(lastDay));
    } else if (preset === 'NEXT_30_DAYS') {
      const futureDay = new Date(now);
      futureDay.setDate(now.getDate() + 30);
      setDateFrom(formatDate(now));
      setDateTo(formatDate(futureDay));
    } else if (preset === 'SPRING_2026') {
      setDateFrom('2026-03-01');
      setDateTo('2026-05-31');
    } else if (preset === 'AUTUMN_2026') {
      setDateFrom('2026-09-01');
      setDateTo('2026-11-30');
    }
  };

  // Real-time multi-criteria filtering
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    return bookingsList.filter(b => {
      // 1. Text Search (Client Name, Booking Code, Phone, Email, Package, Notes)
      const matchesSearch = !q || (
        b.clientName.toLowerCase().includes(q) ||
        b.bookingCode.toLowerCase().includes(q) ||
        b.clientPhone.toLowerCase().includes(q) ||
        (b.clientEmail && b.clientEmail.toLowerCase().includes(q)) ||
        (b.packageName && b.packageName.toLowerCase().includes(q)) ||
        (b.notes && b.notes.toLowerCase().includes(q))
      );

      // 2. Status Filter
      const matchesStatus = statusFilter === 'ALL' || b.status === statusFilter;

      // 3. Client Type Filter
      const matchesClient = clientTypeFilter === 'ALL' || b.clientType === clientTypeFilter;

      // 4. Date Range Filter (checks if trip overlaps with selected range or start date is within)
      let matchesDate = true;
      if (dateFrom && dateTo) {
        // Overlap logic: booking.startDate <= dateTo && booking.endDate >= dateFrom
        matchesDate = b.startDate <= dateTo && b.endDate >= dateFrom;
      } else if (dateFrom) {
        matchesDate = b.endDate >= dateFrom || b.startDate >= dateFrom;
      } else if (dateTo) {
        matchesDate = b.startDate <= dateTo;
      }

      return matchesSearch && matchesStatus && matchesClient && matchesDate;
    });
  }, [bookingsList, search, statusFilter, clientTypeFilter, dateFrom, dateTo]);

  const filteredIds = filtered.map(b => b.id);
  const isAllSelected = filtered.length > 0 && filtered.every(b => selectedIds.includes(b.id));
  const isSomeSelected = selectedIds.length > 0 && !isAllSelected;

  // Handle master checkbox indeterminate state
  useEffect(() => {
    if (masterCheckboxRef.current) {
      masterCheckboxRef.current.indeterminate = isSomeSelected;
    }
  }, [isSomeSelected]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds(prev => prev.filter(id => !filteredIds.includes(id)));
    } else {
      setSelectedIds(prev => Array.from(new Set([...prev, ...filteredIds])));
    }
  };

  const toggleSelectOne = (id: number) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleBulkStatusChange = (newStatus: BookingStatus) => {
    if (selectedIds.length === 0) return;
    
    const count = selectedIds.length;
    bulkUpdateStatus(selectedIds, newStatus, user?.name || 'Administrator', user?.role || 'SUPER_ADMIN');
    sounds.success();
    setShowStatusDropdown(false);
    showToast(`Successfully updated ${count} booking${count > 1 ? 's' : ''} to "${newStatus.replace('_', ' ')}"`);
    setSelectedIds([]);
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    const count = selectedIds.length;
    bulkDeleteBookings(selectedIds);
    sounds.delete();
    setShowBulkDeleteConfirm(false);
    showToast(`Deleted ${count} booking${count > 1 ? 's' : ''}`);
    setSelectedIds([]);
  };

  const handleExportCSVData = (bookingsToExport: Booking[], filenamePrefix = 'paila-nepal-bookings') => {
    if (bookingsToExport.length === 0) {
      showToast('No bookings available to export.');
      return;
    }

    const reportDate = new Date();
    const formattedDate = reportDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const formattedTime = reportDate.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

    const totalAgreed = bookingsToExport.reduce((s, b) => s + b.totalAgreedAmount, 0);
    const totalAdvance = bookingsToExport.reduce((s, b) => s + b.advanceReceived, 0);
    const totalBalance = totalAgreed - totalAdvance;
    const totalPax = bookingsToExport.reduce((s, b) => s + b.paxCount, 0);

    const rows = [
      ['PAILA NEPAL TOURS & TRAVELS PVT. LTD. - BOOKINGS AUDIT REPORT'],
      [`Generated On: ${formattedDate} at ${formattedTime}`],
      [`Generated By: ${user?.name || 'Administrator'} (${user?.role || 'SUPER_ADMIN'})`],
      [`Total Records: ${bookingsToExport.length}`, `Total Pax: ${totalPax}`, `Contract Revenue: NPR ${totalAgreed.toLocaleString()}`, `Advances Received: NPR ${totalAdvance.toLocaleString()}`, `Balance Outstanding: NPR ${totalBalance.toLocaleString()}`],
      [],
      [
        'S.N.',
        'Booking Code',
        'Client Name',
        'Client Type',
        'Contact Phone',
        'Contact Email',
        'Tour Package',
        'Start Date',
        'End Date',
        'Duration (Days)',
        'Pax Count',
        'Agreed Total (NPR)',
        'Advance Received (NPR)',
        'Balance Due (NPR)',
        'Booking Status',
        'Assigned Tour Operator',
        'Created By',
        'Created Date',
        'Special Notes'
      ]
    ];

    bookingsToExport.forEach((b, idx) => {
      let durationDays = 1;
      try {
        const start = new Date(b.startDate).getTime();
        const end = new Date(b.endDate).getTime();
        durationDays = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1);
      } catch {
        durationDays = 1;
      }

      rows.push([
        String(idx + 1),
        `"${b.bookingCode}"`,
        `"${b.clientName}"`,
        `"${b.clientType}"`,
        `"${b.clientPhone}"`,
        `"${b.clientEmail || ''}"`,
        `"${b.packageName || 'Custom Itinerary'}"`,
        `"${b.startDate}"`,
        `"${b.endDate}"`,
        String(durationDays),
        String(b.paxCount),
        String(b.totalAgreedAmount),
        String(b.advanceReceived),
        String(b.totalAgreedAmount - b.advanceReceived),
        `"${b.status}"`,
        `"${b.assignedTourOperatorName || 'Unassigned'}"`,
        `"${b.createdByName || 'Staff'}"`,
        `"${b.createdAt}"`,
        `"${(b.notes || '').replace(/"/g, '""')}"`
      ]);
    });

    // Totals row
    rows.push([]);
    rows.push([
      'TOTALS',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      String(totalPax),
      String(totalAgreed),
      String(totalAdvance),
      String(totalBalance),
      '',
      '',
      '',
      '',
      ''
    ]);

    const csvContent = '\uFEFF' + rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${filenamePrefix}-${reportDate.toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    sounds.click();
    showToast(`Exported ${bookingsToExport.length} booking records to CSV spreadsheet.`);
  };

  const handleExportFilteredCSV = () => {
    handleExportCSVData(filtered, 'paila-nepal-filtered-bookings');
  };

  const handleExportSelectedCSV = () => {
    const selectedBookings = bookingsList.filter(b => selectedIds.includes(b.id));
    handleExportCSVData(selectedBookings, 'paila-nepal-selected-bookings');
  };

  const handleDeleteSingle = (id: number) => {
    deleteBooking(id);
    sounds.delete();
    setShowSingleDeleteConfirm(null);
    setSelectedIds(prev => prev.filter(item => item !== id));
    showToast('Booking deleted successfully.');
  };

  const handleSelectChartMonth = (yearMonth: string) => {
    const [y, m] = yearMonth.split('-');
    const year = parseInt(y);
    const month = parseInt(m);
    const firstDay = `${yearMonth}-01`;
    const lastDate = new Date(year, month, 0).getDate();
    const lastDay = `${yearMonth}-${String(lastDate).padStart(2, '0')}`;
    
    if (selectedChartMonth === yearMonth) {
      // Toggle off
      setSelectedChartMonth(null);
      setDateFrom('');
      setDateTo('');
      setDatePreset('ALL');
      showToast('Cleared month filter');
    } else {
      setSelectedChartMonth(yearMonth);
      setDateFrom(firstDay);
      setDateTo(lastDay);
      setDatePreset('CUSTOM');
      showToast(`Filtered for ${new Date(year, month - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`);
    }
  };

  const resetAllFilters = () => {
    setSearch('');
    setStatusFilter('ALL');
    setClientTypeFilter('ALL');
    setDatePreset('ALL');
    setDateFrom('');
    setDateTo('');
    setSelectedChartMonth(null);
    sounds.click();
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      PROPOSED: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800',
      CONFIRMED: 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800',
      IN_PROGRESS: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
      COMPLETED: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700',
      CANCELLED: 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800',
    };
    return colors[status] || '';
  };

  const getClientTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      INSTITUTIONAL: '🏫 Institutional',
      CORPORATE: '🏢 Corporate',
      FOREIGN_TREK: '🏔️ Foreign Trek',
      INDIVIDUAL: '👤 Individual',
    };
    return labels[type] || type;
  };

  // Helper to highlight matching text
  const highlightMatch = (text: string, query: string) => {
    if (!query.trim()) return text;
    const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
    return (
      <span>
        {parts.map((part, i) => 
          part.toLowerCase() === query.toLowerCase() ? (
            <mark key={i} className="bg-amber-200 dark:bg-amber-500/30 text-slate-900 dark:text-amber-200 px-0.5 rounded">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </span>
    );
  };

  const hasActiveFilters = Boolean(
    search.trim() || 
    statusFilter !== 'ALL' || 
    clientTypeFilter !== 'ALL' || 
    dateFrom || 
    dateTo || 
    datePreset !== 'ALL'
  );

  const selectedBookingsList = bookingsList.filter(b => selectedIds.includes(b.id));
  const totalRevenue = filtered.reduce((s, b) => s + b.totalAgreedAmount, 0);
  const totalPax = filtered.reduce((s, b) => s + b.paxCount, 0);

  return (
    <div className="p-4 md:p-6 space-y-5 animate-fade-in relative">
      {/* Success Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-3 animate-in slide-in-from-bottom-5">
          <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
            <Check size={14} />
          </div>
          <span className="text-sm font-medium">{toastMessage}</span>
          <button 
            onClick={() => setToastMessage(null)}
            className="text-slate-400 hover:text-white ml-2 p-1 cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-paila-blue/10 dark:bg-paila-blue/30 text-paila-blue dark:text-blue-300 flex items-center gap-1.5">
              <Layers size={12} />
              Bookings & Tour Itineraries
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Bookings</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            Search, filter by travel dates, and manage customer tour dossiers
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Export Report Dropdown Menu */}
          <div className="relative" ref={exportMenuRef}>
            <button
              type="button"
              onClick={() => {
                sounds.click();
                setShowExportDropdown(!showExportDropdown);
              }}
              className="flex items-center gap-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 px-3.5 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-700/70 shadow-2xs transition-all cursor-pointer"
              title="Export filtered list to PDF statement or CSV spreadsheet"
            >
              <Download size={16} className="text-paila-blue dark:text-blue-400" />
              <span>Export Report</span>
              <ChevronDown size={14} className={`text-slate-400 transition-transform duration-200 ${showExportDropdown ? 'rotate-180' : ''}`} />
            </button>

            {showExportDropdown && (
              <div className="absolute top-full mt-2 right-0 z-50 w-72 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-2 text-slate-800 dark:text-slate-200 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 mb-1">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Export Filtered View ({filtered.length} Bookings):
                  </p>
                </div>
                <div className="space-y-1">
                  <button
                    type="button"
                    onClick={() => {
                      setShowExportDropdown(false);
                      setShowReportModal(true);
                      sounds.modalOpen();
                    }}
                    className="w-full text-left p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors flex items-start gap-2.5 group cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-lg bg-paila-blue/10 dark:bg-paila-blue/30 text-paila-blue dark:text-blue-300 flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
                      <FileText size={16} />
                    </div>
                    <div className="flex-1">
                      <span className="font-bold text-xs text-slate-900 dark:text-white block">
                        PDF Statement / Archival Report
                      </span>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Official statement with letterhead & tax breakdown
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowExportDropdown(false);
                      handleExportFilteredCSV();
                    }}
                    className="w-full text-left p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors flex items-start gap-2.5 group cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 dark:bg-emerald-500/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
                      <FileSpreadsheet size={16} />
                    </div>
                    <div className="flex-1">
                      <span className="font-bold text-xs text-slate-900 dark:text-white block">
                        CSV Spreadsheet (Excel)
                      </span>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Raw tabular data, Pax counts & financial totals
                      </p>
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Analytics Chart Toggle */}
          <button
            type="button"
            onClick={() => {
              sounds.click();
              setShowAnalyticsChart(!showAnalyticsChart);
            }}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all border cursor-pointer ${
              showAnalyticsChart
                ? 'bg-paila-blue/10 dark:bg-paila-blue/30 text-paila-blue dark:text-blue-300 border-paila-blue/30'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/70'
            }`}
            title={showAnalyticsChart ? 'Hide monthly trend chart' : 'Show monthly trend chart'}
          >
            <BarChart3 size={16} className={showAnalyticsChart ? 'text-paila-blue dark:text-blue-400' : 'text-slate-500'} />
            <span className="hidden sm:inline">Analytics</span>
          </button>

          <button
            type="button"
            onClick={() => {
              sounds.click();
              refreshBookings();
            }}
            disabled={isBookingsLoading}
            className="flex items-center gap-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 px-3.5 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-700/70 shadow-2xs transition-all cursor-pointer disabled:opacity-60"
            title="Sync live from MySQL database"
          >
            <RotateCcw size={15} className={`text-paila-blue dark:text-blue-400 ${isBookingsLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{isBookingsLoading ? 'Syncing...' : 'Sync DB'}</span>
          </button>

          <button
            onClick={() => onNavigate('new-booking')}
            className="flex items-center gap-2 bg-paila-orange text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-paila-orange-light shadow-md hover:shadow-lg transition-all cursor-pointer"
          >
            <Plus size={16} />
            New Booking
          </button>
        </div>
      </div>

      {/* Database Sync Status Notice */}
      {bookingsError && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 p-3 rounded-xl flex items-center justify-between text-xs text-amber-800 dark:text-amber-300 animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <span>⚠️</span>
            <span>Database synchronization notice: {bookingsError}</span>
          </div>
          <button
            onClick={() => refreshBookings()}
            className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-lg text-xs cursor-pointer transition-colors"
          >
            Retry Sync
          </button>
        </div>
      )}

      {/* Monthly Booking Status Breakdown Chart */}
      {showAnalyticsChart && (
        <BookingStatusMonthlyChart
          bookings={bookingsList}
          onSelectMonth={handleSelectChartMonth}
          selectedMonth={selectedChartMonth}
          className="animate-in fade-in slide-in-from-top-2 duration-200"
        />
      )}

      {/* Advanced Real-Time Search & Date-Range Filter Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-2xs space-y-3">
        {/* Main Controls Row */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Real-time Text Search Bar */}
          <div className="flex-1 min-w-[260px] relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search by client name, ref ID (e.g. PNH-2026-001), phone, package..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-14 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-paila-blue/30 focus:border-paila-blue outline-none transition-all"
            />
            {search ? (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
                title="Clear search"
              >
                <X size={14} />
              </button>
            ) : (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-0.5 text-[10px] font-mono text-slate-400 bg-slate-200/60 dark:bg-slate-700/60 px-1.5 py-0.5 rounded">
                <span>⌘</span><span>K</span>
              </div>
            )}
          </div>

          {/* Date Range Selector Popover */}
          <div className="relative" ref={datePickerRef}>
            <button
              type="button"
              onClick={() => setShowDatePicker(!showDatePicker)}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all border cursor-pointer ${
                dateFrom || dateTo || datePreset !== 'ALL'
                  ? 'bg-blue-50 dark:bg-blue-950/60 text-paila-blue dark:text-blue-300 border-blue-300 dark:border-blue-800 shadow-2xs'
                  : 'bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <CalendarRange size={16} className={dateFrom || dateTo ? 'text-paila-blue dark:text-blue-400' : 'text-slate-400'} />
              <span>
                {dateFrom && dateTo
                  ? `${dateFrom} → ${dateTo}`
                  : dateFrom
                  ? `From ${dateFrom}`
                  : dateTo
                  ? `Until ${dateTo}`
                  : datePreset !== 'ALL'
                  ? datePreset.replace('_', ' ')
                  : 'Travel Dates'}
              </span>
              <ChevronDown size={14} className={`text-slate-400 transition-transform ${showDatePicker ? 'rotate-180' : ''}`} />
            </button>

            {/* Date Range Modal / Dropdown */}
            {showDatePicker && (
              <div className="absolute top-full mt-2 left-0 sm:right-auto z-40 w-80 md:w-96 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-4 text-slate-800 dark:text-slate-200 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-3">
                  <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    <CalendarRange size={14} />
                    <span>Filter By Travel Dates</span>
                  </div>
                  {(dateFrom || dateTo || datePreset !== 'ALL') && (
                    <button
                      onClick={() => applyPreset('ALL')}
                      className="text-[11px] font-semibold text-rose-500 hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer"
                    >
                      Clear Dates
                    </button>
                  )}
                </div>

                {/* Quick Presets */}
                <div className="mb-4">
                  <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Quick Presets
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                    {[
                      { id: 'ALL', label: 'All Dates' },
                      { id: 'TODAY', label: 'Today' },
                      { id: 'THIS_WEEK', label: 'This Week' },
                      { id: 'THIS_MONTH', label: 'This Month' },
                      { id: 'NEXT_30_DAYS', label: 'Next 30 Days' },
                      { id: 'SPRING_2026', label: 'Spring 2026' },
                    ].map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => applyPreset(p.id as DatePreset)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all text-left truncate cursor-pointer ${
                          datePreset === p.id && !dateFrom
                            ? 'bg-paila-blue text-white font-bold'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Date Inputs */}
                <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                    Custom Travel Range
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[11px] text-slate-500 block mb-1 font-medium">Start Date (From)</span>
                      <input
                        type="date"
                        value={dateFrom}
                        onChange={e => {
                          setDateFrom(e.target.value);
                          setDatePreset('CUSTOM');
                        }}
                        className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-paila-blue/30 focus:border-paila-blue outline-none"
                      />
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-500 block mb-1 font-medium">End Date (To)</span>
                      <input
                        type="date"
                        value={dateTo}
                        onChange={e => {
                          setDateTo(e.target.value);
                          setDatePreset('CUSTOM');
                        }}
                        className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-paila-blue/30 focus:border-paila-blue outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setShowDatePicker(false)}
                    className="px-4 py-1.5 bg-paila-blue text-white rounded-xl text-xs font-semibold hover:bg-blue-700 transition-colors cursor-pointer"
                  >
                    Apply Filter
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-slate-400 hidden sm:block" />
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as BookingStatus | 'ALL')}
              className="px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-paila-blue/30 focus:border-paila-blue outline-none transition-all cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="PROPOSED">Proposed</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          {/* Client Type Filter */}
          <select
            value={clientTypeFilter}
            onChange={e => setClientTypeFilter(e.target.value)}
            className="px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-paila-blue/30 focus:border-paila-blue outline-none transition-all cursor-pointer"
          >
            <option value="ALL">All Client Types</option>
            <option value="INSTITUTIONAL">Institutional</option>
            <option value="CORPORATE">Corporate</option>
            <option value="FOREIGN_TREK">Foreign Trek</option>
            <option value="INDIVIDUAL">Individual</option>
          </select>

          {/* Reset All Filters Button */}
          {hasActiveFilters && (
            <button
              onClick={resetAllFilters}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors cursor-pointer"
              title="Clear all search and filter conditions"
            >
              <RotateCcw size={13} />
              <span>Reset</span>
            </button>
          )}
        </div>

        {/* Active Filter Badges */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs">
            <span className="text-slate-400 font-medium">Active Filters:</span>
            
            {search && (
              <span className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
                <Search size={11} className="text-slate-400" />
                <span>"{search}"</span>
                <button onClick={() => setSearch('')} className="hover:text-rose-500 ml-0.5"><X size={12} /></button>
              </span>
            )}

            {(dateFrom || dateTo || datePreset !== 'ALL') && (
              <span className="inline-flex items-center gap-1 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 px-2.5 py-1 rounded-lg border border-blue-200 dark:border-blue-900">
                <CalendarRange size={11} />
                <span>
                  {dateFrom && dateTo ? `${dateFrom} to ${dateTo}` : dateFrom ? `From ${dateFrom}` : dateTo ? `Until ${dateTo}` : datePreset}
                </span>
                <button onClick={() => applyPreset('ALL')} className="hover:text-rose-500 ml-0.5"><X size={12} /></button>
              </span>
            )}

            {statusFilter !== 'ALL' && (
              <span className="inline-flex items-center gap-1 bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 px-2.5 py-1 rounded-lg border border-amber-200 dark:border-amber-900">
                <Tag size={11} />
                <span>Status: {statusFilter.replace('_', ' ')}</span>
                <button onClick={() => setStatusFilter('ALL')} className="hover:text-rose-500 ml-0.5"><X size={12} /></button>
              </span>
            )}

            {clientTypeFilter !== 'ALL' && (
              <span className="inline-flex items-center gap-1 bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 px-2.5 py-1 rounded-lg border border-purple-200 dark:border-purple-900">
                <span>Type: {clientTypeFilter.replace('_', ' ')}</span>
                <button onClick={() => setClientTypeFilter('ALL')} className="hover:text-rose-500 ml-0.5"><X size={12} /></button>
              </span>
            )}

            <div className="flex items-center gap-2 ml-auto">
              <span className="text-slate-400 hidden sm:inline">
                Found <strong>{filtered.length}</strong> of {bookingsList.length} total
              </span>
              <button
                onClick={() => {
                  sounds.modalOpen();
                  setShowReportModal(true);
                }}
                className="flex items-center gap-1 text-[11px] font-semibold text-paila-blue dark:text-blue-400 hover:underline bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-lg border border-blue-200 dark:border-blue-900 cursor-pointer"
                title="View & print statement report"
              >
                <FileText size={11} />
                <span>Export Report</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Floating Sticky Bulk Actions Bar (Appears when 1+ rows are selected) */}
      {selectedIds.length > 0 && (
        <div className="sticky top-14 z-30 bg-gradient-to-r from-slate-900 via-[#0a1b3a] to-slate-900 text-white rounded-2xl p-3 md:p-4 shadow-xl border border-blue-900/60 animate-in slide-in-from-top-3 duration-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-paila-orange flex items-center justify-center font-bold text-sm shadow-md">
              {selectedIds.length}
            </div>
            <div>
              <p className="text-sm font-bold text-white flex items-center gap-1.5">
                <span>{selectedIds.length} booking{selectedIds.length > 1 ? 's' : ''} selected</span>
                <span className="text-xs text-blue-300 font-normal hidden sm:inline">• Manage multiple records</span>
              </p>
              <div className="flex items-center gap-3 text-xs text-slate-300 mt-0.5">
                <button
                  type="button"
                  onClick={toggleSelectAll}
                  className="hover:text-white underline cursor-pointer"
                >
                  {isAllSelected ? 'Deselect all in view' : `Select all in view (${filtered.length})`}
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Status Change Dropdown Menu */}
            <div className="relative" ref={statusMenuRef}>
              <button
                type="button"
                onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                className="flex items-center gap-2 bg-gradient-to-r from-paila-blue to-blue-600 hover:from-blue-700 hover:to-blue-800 text-white px-3.5 py-2 rounded-xl text-xs md:text-sm font-semibold transition-all shadow-md cursor-pointer border border-blue-400/30"
              >
                <Sparkles size={15} className="text-amber-300" />
                <span>Update Status</span>
                <ChevronDown size={14} className={`transition-transform duration-200 ${showStatusDropdown ? 'rotate-180' : ''}`} />
              </button>

              {showStatusDropdown && (
                <div className="absolute top-full mt-2 left-0 sm:right-0 sm:left-auto z-50 w-72 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-2 text-slate-800 dark:text-slate-200 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 mb-1">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400">
                      Apply Status to {selectedIds.length} Bookings:
                    </p>
                  </div>
                  <div className="space-y-1">
                    {statusOptions.map(option => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => handleBulkStatusChange(option.value)}
                        className="w-full text-left p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors flex items-start gap-2.5 group cursor-pointer"
                      >
                        <span className={`w-2.5 h-2.5 rounded-full ${option.dotColor} mt-1 shrink-0 group-hover:scale-125 transition-transform`} />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs text-slate-900 dark:text-white">{option.label}</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded border bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-mono">
                              {option.value}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{option.desc}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* PDF Statement for Selected */}
            <button
              type="button"
              onClick={() => {
                sounds.modalOpen();
                setShowReportModal(true);
              }}
              className="flex items-center gap-1.5 bg-paila-blue/90 hover:bg-paila-blue text-white px-3 py-2 rounded-xl text-xs md:text-sm font-semibold transition-colors border border-blue-400/30 cursor-pointer"
              title="Generate printable PDF report statement for selected records"
            >
              <Printer size={14} />
              <span className="hidden sm:inline">Statement (PDF)</span>
            </button>

            {/* CSV Export Button */}
            <button
              type="button"
              onClick={handleExportSelectedCSV}
              className="flex items-center gap-1.5 bg-slate-800/90 hover:bg-slate-700/90 text-slate-200 hover:text-white px-3 py-2 rounded-xl text-xs md:text-sm font-medium transition-colors border border-slate-700 cursor-pointer"
              title="Export selected rows as CSV spreadsheet"
            >
              <Download size={14} />
              <span className="hidden sm:inline">Export CSV</span>
            </button>

            {/* Bulk Delete Button */}
            <button
              type="button"
              onClick={() => setShowBulkDeleteConfirm(true)}
              className="flex items-center gap-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-300 hover:text-red-100 px-3 py-2 rounded-xl text-xs md:text-sm font-semibold transition-colors border border-red-500/30 cursor-pointer"
              title="Delete all selected bookings"
            >
              <Trash2 size={14} />
              <span>Delete ({selectedIds.length})</span>
            </button>

            {/* Clear Selection Button */}
            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="p-2 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="Deselect all"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Bookings Table Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50/90 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-slate-800 select-none">
                {/* Master Selection Checkbox */}
                <th className="px-4 py-3.5 w-12 text-center">
                  <label className="flex items-center justify-center cursor-pointer p-1">
                    <input
                      ref={masterCheckboxRef}
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-paila-blue focus:ring-paila-blue/40 cursor-pointer"
                      title={isAllSelected ? 'Deselect all' : 'Select all filtered'}
                    />
                  </label>
                </th>
                <th className="text-left px-4 py-3.5 text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Booking Code / Ref</th>
                <th className="text-left px-4 py-3.5 text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Client Details</th>
                <th className="text-left px-4 py-3.5 text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Tour Package</th>
                <th className="text-left px-4 py-3.5 text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Travel Dates</th>
                <th className="text-left px-4 py-3.5 text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Pax</th>
                <th className="text-left px-4 py-3.5 text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Total / Advance</th>
                <th className="text-left px-4 py-3.5 text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Status</th>
                <th className="text-right px-4 py-3.5 text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.map(booking => {
                const isSelected = selectedIds.includes(booking.id);
                return (
                  <tr 
                    key={booking.id} 
                    className={`transition-colors cursor-pointer ${
                      isSelected 
                        ? 'bg-blue-50/80 dark:bg-blue-950/40 border-l-4 border-paila-blue' 
                        : 'hover:bg-slate-50/60 dark:hover:bg-slate-800/40'
                    }`}
                    onClick={(e) => {
                      // Only toggle if not clicking directly on action buttons
                      const target = e.target as HTMLElement;
                      if (!target.closest('button') && !target.closest('input')) {
                        toggleSelectOne(booking.id);
                      }
                    }}
                  >
                    {/* Row Checkbox */}
                    <td className="px-4 py-3.5 text-center" onClick={e => e.stopPropagation()}>
                      <label className="flex items-center justify-center cursor-pointer p-1">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectOne(booking.id)}
                          className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-paila-blue focus:ring-paila-blue/40 cursor-pointer"
                        />
                      </label>
                    </td>

                    {/* Booking Code / Reference ID */}
                    <td className="px-4 py-3.5">
                      <div className="font-mono text-xs text-paila-blue dark:text-blue-400 font-bold bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-md border border-blue-200 dark:border-blue-900 inline-block">
                        {highlightMatch(booking.bookingCode, search)}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">{getClientTypeLabel(booking.clientType)}</p>
                    </td>

                    {/* Client Name & Contacts */}
                    <td className="px-4 py-3.5">
                      <p className="text-sm font-bold text-slate-900 dark:text-white">
                        {highlightMatch(booking.clientName, search)}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {highlightMatch(booking.clientPhone, search)}
                      </p>
                    </td>

                    {/* Package */}
                    <td className="px-4 py-3.5">
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                        {highlightMatch(booking.packageName || 'Custom Itinerary', search)}
                      </p>
                    </td>

                    {/* Travel Dates */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 font-medium">
                        <Calendar size={13} className="text-paila-blue dark:text-blue-400 shrink-0" />
                        <span className="font-semibold">{booking.startDate}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 pl-4 flex items-center gap-1">
                        <span>to</span>
                        <span className="font-medium text-slate-600 dark:text-slate-400">{booking.endDate}</span>
                      </div>
                    </td>

                    {/* Pax */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1 text-sm font-bold text-slate-700 dark:text-slate-300">
                        <Users size={14} className="text-slate-400" />
                        {booking.paxCount}
                      </div>
                    </td>

                    {/* Amounts */}
                    <td className="px-4 py-3.5">
                      <p className="text-sm font-bold text-slate-900 dark:text-white tabular-nums">
                        NPR {booking.totalAgreedAmount.toLocaleString()}
                      </p>
                      <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                        Adv: NPR {booking.advanceReceived.toLocaleString()}
                      </p>
                    </td>

                    {/* Status Badge */}
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold rounded-full border shadow-2xs ${getStatusColor(booking.status)}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          booking.status === 'PROPOSED' ? 'bg-amber-500' :
                          booking.status === 'CONFIRMED' ? 'bg-blue-500' :
                          booking.status === 'IN_PROGRESS' ? 'bg-emerald-500' :
                          booking.status === 'COMPLETED' ? 'bg-slate-400' : 'bg-rose-500'
                        }`} />
                        {booking.status.replace('_', ' ')}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3.5 text-right" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => onNavigate('booking-detail', booking.id)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/50 dark:hover:bg-blue-900/60 text-xs text-paila-blue dark:text-blue-300 font-semibold transition-colors cursor-pointer"
                          title="View Full Booking Dossier"
                        >
                          <Eye size={13} />
                          <span>View</span>
                        </button>
                        <button
                          onClick={() => setShowSingleDeleteConfirm(booking.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors cursor-pointer"
                          title="Delete Booking"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {filtered.length === 0 && (
          <div className="text-center py-14 px-4">
            <div className="w-16 h-16 rounded-3xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3 text-slate-400">
              <Search size={28} />
            </div>
            <p className="text-slate-800 dark:text-slate-200 font-bold text-base">No bookings match your search & filter criteria</p>
            <p className="text-slate-500 dark:text-slate-400 text-xs mt-1 max-w-sm mx-auto">
              We couldn't find any bookings matching "{search || 'your selected filters'}". Try adjusting your dates or clearing filters.
            </p>
            {hasActiveFilters && (
              <button
                onClick={resetAllFilters}
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-paila-blue text-white rounded-xl text-xs font-semibold hover:bg-blue-700 transition-all cursor-pointer shadow-md"
              >
                <RotateCcw size={13} />
                <span>Reset All Filters</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Summary Footer Statistics */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400 pt-2 px-1">
        <div className="flex items-center gap-3">
          <span>
            Showing <strong className="text-slate-800 dark:text-slate-200">{filtered.length}</strong> of <strong className="text-slate-800 dark:text-slate-200">{bookingsList.length}</strong> bookings
          </span>
          {selectedIds.length > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-paila-blue dark:text-blue-300 font-bold">
              {selectedIds.length} Selected
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-4 flex-wrap">
          <span className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
            <Users size={13} className="text-slate-400" />
            <span>Total Pax: <strong className="font-bold">{totalPax}</strong></span>
          </span>
          <span className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
            <DollarSign size={13} className="text-emerald-500" />
            <span>Filtered Revenue: <strong className="font-bold text-slate-900 dark:text-white">NPR {totalRevenue.toLocaleString()}</strong></span>
          </span>
          <button
            type="button"
            onClick={() => {
              sounds.modalOpen();
              setShowReportModal(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold transition-colors border border-slate-200 dark:border-slate-700 cursor-pointer"
          >
            <Printer size={13} />
            <span>Audit Report</span>
          </button>
        </div>
      </div>

      {/* Bookings Accounting & Archival Statement Modal */}
      {showReportModal && (
        <BookingsReportModal
          bookings={selectedIds.length > 0 ? selectedBookingsList : filtered}
          allBookings={bookingsList}
          activeFilters={{
            search,
            status: statusFilter,
            clientType: clientTypeFilter,
            datePreset,
            dateFrom,
            dateTo,
          }}
          currentUser={user}
          onClose={() => setShowReportModal(false)}
        />
      )}

      {/* Bulk Delete Confirmation Modal */}
      {showBulkDeleteConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-lg p-6 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in zoom-in-95">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-950/60 rounded-2xl flex items-center justify-center text-red-600 dark:text-red-400 shrink-0">
                <Trash2 size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Delete {selectedIds.length} Selected Bookings?</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">This operation cannot be undone</p>
              </div>
            </div>

            <p className="text-sm text-slate-600 dark:text-slate-300 mb-3">
              You are about to permanently remove the following bookings from the database:
            </p>

            {/* List preview of selected bookings */}
            <div className="max-h-40 overflow-y-auto rounded-xl bg-slate-50 dark:bg-slate-800/80 p-3 mb-5 border border-slate-200 dark:border-slate-700 space-y-1.5 divide-y divide-slate-200/50 dark:divide-slate-700/50">
              {selectedBookingsList.map(b => (
                <div key={b.id} className="pt-1.5 first:pt-0 flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800 dark:text-slate-200">{b.bookingCode} - {b.clientName}</span>
                  <span className="text-slate-400">{b.packageName || 'Custom'}</span>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowBulkDeleteConfirm(false)}
                className="flex-1 px-4 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBulkDelete}
                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition-all cursor-pointer"
              >
                Confirm Bulk Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Single Delete Confirmation Modal */}
      {showSingleDeleteConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md p-6 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in zoom-in-95">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-950/60 rounded-2xl flex items-center justify-center text-red-600 dark:text-red-400">
                <Trash2 size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Delete Booking</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">This action cannot be undone</p>
              </div>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-6">
              Are you sure you want to delete this booking? All associated operational allocations, vouchers, and itinerary check-ins will be permanently removed.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowSingleDeleteConfirm(null)}
                className="flex-1 px-4 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeleteSingle(showSingleDeleteConfirm)}
                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition-all cursor-pointer"
              >
                Delete Booking
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
