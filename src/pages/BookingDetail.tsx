import { useState, useMemo } from 'react';
import { BookingStatus, ClientType, ItineraryDay, BookingStatusHistoryEntry } from '../types';
import {
  ArrowLeft, MapPin, Calendar, Users, Phone, Mail,
  Printer, FileText, CheckCircle, Clock, AlertTriangle,
  ChevronRight, Mountain, Lock, Edit, Trash2, Plus, X,
  History, Shield, User, ArrowRight, Sparkles, Download,
  CheckCircle2, AlertCircle, RefreshCw, Check, MessageSquare
} from 'lucide-react';
import DocumentViewer from '../components/DocumentViewer';
import { useBookings } from '../contexts/BookingContext';
import { useOperations } from '../contexts/OperationsContext';
import { useVendors } from '../contexts/VendorContext';
import { usePackages } from '../contexts/PackageContext';
import { useAuth } from '../contexts/AuthContext';
import { sounds } from '../utils/sounds';

interface BookingDetailProps {
  bookingId: number;
  onNavigate: (page: string) => void;
}

export default function BookingDetail({ bookingId, onNavigate }: BookingDetailProps) {
  const { user } = useAuth();
  const { getBookingById, updateBooking, changeBookingStatus, deleteBooking } = useBookings();
  const { allocations: allAllocations } = useOperations();
  const { vendors } = useVendors();
  const { packages } = usePackages();
  const booking = getBookingById(bookingId);
  const allocations = allAllocations.filter(a => a.bookingId === bookingId);
  const [activeTab, setActiveTab] = useState<'overview' | 'itinerary' | 'operations' | 'status-history' | 'documents'>('overview');
  const [viewingDocument, setViewingDocument] = useState<'proposal' | 'voucher' | 'invoice' | 'itinerary-summary' | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Status Change Dialog State
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedNewStatus, setSelectedNewStatus] = useState<BookingStatus>('CONFIRMED');
  const [statusReason, setStatusReason] = useState('');
  const [statusNotes, setStatusNotes] = useState('');
  const [statusToast, setStatusToast] = useState<string | null>(null);
  const [historySortOrder, setHistorySortOrder] = useState<'NEWEST' | 'OLDEST'>('NEWEST');

  const [editData, setEditData] = useState({
    clientType: '' as ClientType,
    clientName: '',
    clientEmail: '',
    clientPhone: '',
    packageId: null as number | null,
    packageName: '',
    status: '' as BookingStatus,
    startDate: '',
    endDate: '',
    paxCount: 0,
    totalAgreedAmount: 0,
    advanceReceived: 0,
    assignedTourOperatorId: null as number | null,
    assignedTourOperatorName: '',
    notes: '',
    itineraryDays: [] as ItineraryDay[],
  });

  if (!booking) {
    return (
      <div className="p-6 text-center">
        <p className="text-slate-500">Booking not found.</p>
        <button onClick={() => onNavigate('bookings')} className="mt-4 text-paila-blue text-sm font-medium">← Back to Bookings</button>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      PROPOSED: 'bg-amber-100 text-amber-800 border-amber-200',
      CONFIRMED: 'bg-blue-100 text-blue-800 border-blue-200',
      IN_PROGRESS: 'bg-green-100 text-green-800 border-green-200',
      COMPLETED: 'bg-slate-100 text-slate-700 border-slate-200',
      CANCELLED: 'bg-red-100 text-red-800 border-red-200',
    };
    return colors[status] || '';
  };

  const handlePrint = () => {
    window.print();
  };

  const handleEdit = () => {
    setEditData({
      clientType: booking.clientType,
      clientName: booking.clientName,
      clientEmail: booking.clientEmail,
      clientPhone: booking.clientPhone,
      packageId: booking.packageId,
      packageName: booking.packageName || '',
      status: booking.status,
      startDate: booking.startDate,
      endDate: booking.endDate,
      paxCount: booking.paxCount,
      totalAgreedAmount: booking.totalAgreedAmount,
      advanceReceived: booking.advanceReceived,
      assignedTourOperatorId: booking.assignedTourOperatorId,
      assignedTourOperatorName: booking.assignedTourOperatorName || '',
      notes: booking.notes,
      itineraryDays: booking.itineraryDays || [],
    });
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    updateBooking(bookingId, editData);
    sounds.success();
    setIsEditing(false);
    setStatusToast('Booking details updated successfully!');
    setTimeout(() => setStatusToast(null), 4000);
  };

  const handleDelete = () => {
    deleteBooking(bookingId);
    sounds.delete();
    onNavigate('bookings');
  };

  const totalVendorCost = allocations.reduce((s, a) => s + (Number(a.agreedCost) || 0), 0);
  const totalVendorPaid = allocations.reduce((s, a) => s + (Number(a.amountPaid) || 0), 0);

  // Status History formatting helpers
  const formatTimestamp = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return dateStr;
    }
  };

  const getRelativeTime = (dateStr: string) => {
    if (!dateStr) return 'Just now';
    try {
      const d = new Date(dateStr);
      const time = d.getTime();
      if (!Number.isFinite(time)) return 'Just now';
      const now = new Date();
      const diffMs = Math.max(0, now.getTime() - time);
      const diffSec = Math.floor(diffMs / 1000);
      const diffMin = Math.floor(diffSec / 60);
      const diffHours = Math.floor(diffMin / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffSec < 60) return 'Just now';
      if (diffMin < 60) return `${diffMin}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 30) return `${diffDays}d ago`;
      const diffMonths = Math.floor(diffDays / 30);
      if (diffMonths < 12) return `${diffMonths}mo ago`;
      const diffYears = Math.floor(diffDays / 365);
      return `${Number.isFinite(diffYears) ? diffYears : 1}y ago`;
    } catch {
      return 'Just now';
    }
  };

  const getRoleBadge = (role?: string) => {
    const r = (role || '').toUpperCase();
    if (r.includes('ADMIN')) {
      return {
        label: 'Super Admin',
        color: 'bg-purple-100 text-purple-800 border-purple-200'
      };
    }
    if (r.includes('OPS') || r.includes('OPERATION')) {
      return {
        label: 'Operations',
        color: 'bg-emerald-100 text-emerald-800 border-emerald-200'
      };
    }
    if (r.includes('SALES')) {
      return {
        label: 'Sales',
        color: 'bg-blue-100 text-blue-800 border-blue-200'
      };
    }
    if (r.includes('TOUR') || r.includes('GUIDE') || r.includes('OPERATOR')) {
      return {
        label: 'Tour Leader',
        color: 'bg-amber-100 text-amber-800 border-amber-200'
      };
    }
    return {
      label: role || 'Staff',
      color: 'bg-slate-100 text-slate-700 border-slate-200'
    };
  };

  const historyEntries = useMemo(() => {
    let list: BookingStatusHistoryEntry[] = [];
    if (booking?.statusHistory && booking.statusHistory.length > 0) {
      list = [...booking.statusHistory];
    } else {
      // Generate sensible baseline entries if booking had no prior history array
      list = [
        {
          id: `created-${booking.id}`,
          bookingId: booking.id,
          bookingCode: booking.bookingCode,
          fromStatus: null,
          toStatus: 'PROPOSED',
          changedAt: booking.createdAt ? `${booking.createdAt}T09:00:00.000Z` : new Date().toISOString(),
          changedBy: {
            name: booking.createdByName || 'Sales Staff',
            role: 'SALES',
          },
          reason: `Initial booking inquiry created for ${booking.clientName}.`,
          source: 'ADMIN_PORTAL'
        }
      ];

      if (booking.status !== 'PROPOSED') {
        list.push({
          id: `current-${booking.id}`,
          bookingId: booking.id,
          bookingCode: booking.bookingCode,
          fromStatus: 'PROPOSED',
          toStatus: booking.status,
          changedAt: new Date().toISOString(),
          changedBy: {
            name: 'Operations Team',
            role: 'OPERATIONS',
          },
          reason: `Status set to ${booking.status.replace('_', ' ')}.`,
          source: 'ADMIN_PORTAL'
        });
      }
    }

    if (historySortOrder === 'NEWEST') {
      return list.sort((a, b) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime());
    } else {
      return list.sort((a, b) => new Date(a.changedAt).getTime() - new Date(b.changedAt).getTime());
    }
  }, [booking, historySortOrder]);

  const handleOpenStatusModal = () => {
    // Default next logical status
    const current = booking.status;
    let nextSt: BookingStatus = 'CONFIRMED';
    if (current === 'PROPOSED') nextSt = 'CONFIRMED';
    else if (current === 'CONFIRMED') nextSt = 'IN_PROGRESS';
    else if (current === 'IN_PROGRESS') nextSt = 'COMPLETED';
    else if (current === 'COMPLETED') nextSt = 'COMPLETED';

    setSelectedNewStatus(nextSt);
    setStatusReason('');
    setStatusNotes('');
    setShowStatusModal(true);
    sounds.modalOpen();
  };

  const handleApplyStatusChange = () => {
    if (selectedNewStatus === booking.status) {
      sounds.warning();
      setStatusToast('Selected status is already the current status.');
      setTimeout(() => setStatusToast(null), 4000);
      return;
    }

    const reasonToSave = statusReason.trim() || `Status updated to ${selectedNewStatus.replace('_', ' ')}`;
    
    changeBookingStatus(bookingId, selectedNewStatus, {
      reason: reasonToSave,
      notes: statusNotes.trim() || undefined,
      actor: {
        name: user?.name || 'Administrator',
        role: user?.role || 'SUPER_ADMIN',
        email: user?.email,
      }
    });

    sounds.success();
    setShowStatusModal(false);
    setStatusToast(`Status successfully changed to ${selectedNewStatus.replace('_', ' ')}`);
    setTimeout(() => setStatusToast(null), 4000);
  };

  const handleExportHistoryCSV = () => {
    const headers = ['Transition Date', 'Changed By Name', 'Role', 'Email', 'From Status', 'To Status', 'Reason', 'Notes', 'Source'];
    const rows = historyEntries.map(e => [
      `"${new Date(e.changedAt).toLocaleString()}"`,
      `"${e.changedBy.name}"`,
      `"${e.changedBy.role}"`,
      `"${e.changedBy.email || ''}"`,
      `"${e.fromStatus || 'INITIAL'}"`,
      `"${e.toStatus}"`,
      `"${(e.reason || '').replace(/"/g, '""')}"`,
      `"${(e.notes || '').replace(/"/g, '""')}"`,
      `"${e.source || 'ADMIN_PORTAL'}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${booking.bookingCode}-status-history.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    sounds.click();
    setStatusToast('Exported Status History to CSV');
    setTimeout(() => setStatusToast(null), 3000);
  };

  const getReasonPresets = (st: BookingStatus) => {
    switch (st) {
      case 'CONFIRMED':
        return [
          'Advance payment (50%) verified via Nabil Bank Transfer',
          'Full payment received in cash / SWIFT transfer',
          'TIMS card and national park trekking permits confirmed',
          'Hotel & transport reservation deposits confirmed'
        ];
      case 'IN_PROGRESS':
        return [
          'Tour group departed Kathmandu base / airport arrival',
          'Tour leader Prakash Gurung verified pax briefing & gear',
          'Jeep / Tourist bus departure confirmed by dispatch',
          'First stage trailhead reached on schedule'
        ];
      case 'COMPLETED':
        return [
          'Tour successfully completed and travelers safely returned',
          'All vendor service accounts reconciled & settled',
          'Guest review & feedback recorded (5-star satisfaction)',
          'Trip log filed and photo archives stored'
        ];
      case 'CANCELLED':
        return [
          'Client cancellation request due to personal reasons',
          'Adverse Himalayan weather & avalanche warning',
          'Advance payment window expired without receipt',
          'Flight cancellation and itinerary aborted'
        ];
      case 'PROPOSED':
      default:
        return [
          'Itinerary and quote modified per client specifications',
          'Reopened proposal for pax count & hotel tier revision',
          'Initial proposal submitted for institutional review'
        ];
    }
  };

  const workflowSteps: { status: BookingStatus; label: string; desc: string }[] = [
    { status: 'PROPOSED', label: 'Proposed', desc: 'Inquiry & Quote' },
    { status: 'CONFIRMED', label: 'Confirmed', desc: 'Deposit & Locked' },
    { status: 'IN_PROGRESS', label: 'In Progress', desc: 'Tour Underway' },
    { status: 'COMPLETED', label: 'Completed', desc: 'Debriefed & Settled' },
  ];

  const getWorkflowStepIndex = (st: BookingStatus) => {
    switch (st) {
      case 'PROPOSED': return 0;
      case 'CONFIRMED': return 1;
      case 'IN_PROGRESS': return 2;
      case 'COMPLETED': return 3;
      default: return -1;
    }
  };

  const currentStepIdx = getWorkflowStepIndex(booking.status);

  return (
    <div className="p-6 animate-fade-in">
      {/* Toast Notification */}
      {statusToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 animate-fade-in border border-slate-700">
          <CheckCircle2 size={18} className="text-green-400 shrink-0" />
          <p className="text-sm font-medium">{statusToast}</p>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-4 mb-6 no-print">
        <button onClick={() => onNavigate('bookings')} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
          <ArrowLeft size={20} className="text-slate-600" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">{booking.bookingCode}</h1>
            <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${getStatusColor(booking.status)}`}>
              {booking.status.replace('_', ' ')}
            </span>
          </div>
          <p className="text-slate-500 text-sm mt-0.5">{booking.clientName} • {booking.packageName || 'Custom Itinerary'}</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={handleOpenStatusModal} 
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-paila-blue to-blue-700 text-white rounded-lg text-sm font-medium shadow-sm hover:opacity-95 transition-all"
          >
            <RefreshCw size={15} />
            Update Status
          </button>
          <button onClick={() => { sounds.click(); handleEdit(); }} className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
            <Edit size={16} />
            Edit
          </button>
          <button onClick={() => { sounds.warning(); setShowDeleteConfirm(true); }} className="flex items-center gap-2 px-4 py-2 border border-red-200 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors">
            <Trash2 size={16} />
            Delete
          </button>
          <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
            <Printer size={16} />
            Print
          </button>
          <button 
            onClick={() => {
              sounds.modalOpen();
              setViewingDocument('itinerary-summary');
            }} 
            className="flex items-center gap-2 px-4 py-2 bg-paila-blue text-white rounded-lg text-sm font-medium hover:bg-paila-blue-light transition-colors shadow-xs cursor-pointer"
            title="Generate and Download Printer-Friendly PDF Summary"
          >
            <FileText size={16} />
            Generate PDF
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-slate-100 rounded-lg p-1 no-print">
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'itinerary', label: 'Itinerary' },
          { id: 'operations', label: 'Operations' },
          { id: 'status-history', label: 'Status History', count: historyEntries.length },
          { id: 'documents', label: 'Documents' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => {
              sounds.tabSwitch();
              setActiveTab(tab.id as any);
            }}
            className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center justify-center gap-2 ${
              activeTab === tab.id ? 'bg-white text-paila-blue shadow-sm font-semibold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span className={`text-[11px] px-1.5 py-0.2 rounded-full font-bold ${
                activeTab === tab.id ? 'bg-paila-blue/10 text-paila-blue' : 'bg-slate-200 text-slate-600'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Client Info */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="font-semibold text-slate-900 mb-4">Client Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500">Client Name</p>
                  <p className="text-sm font-medium text-slate-900">{booking.clientName}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Category</p>
                  <p className="text-sm font-medium text-slate-900">{booking.clientType.replace('_', ' ')}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Phone size={14} className="text-slate-400" />
                  <span className="text-sm text-slate-700">{booking.clientPhone}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail size={14} className="text-slate-400" />
                  <span className="text-sm text-slate-700">{booking.clientEmail}</span>
                </div>
              </div>
            </div>

            {/* Financial Summary */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="font-semibold text-slate-900 mb-4">Financial Summary</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-blue-50 rounded-lg p-4 text-center">
                  <p className="text-xs text-blue-600 mb-1">Total Amount</p>
                  <p className="text-lg font-bold text-paila-blue">NPR {(Number.isFinite(Number(booking.totalAgreedAmount)) ? Number(booking.totalAgreedAmount) : 0).toLocaleString()}</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <p className="text-xs text-green-600 mb-1">Advance Received</p>
                  <p className="text-lg font-bold text-green-700">NPR {(Number.isFinite(Number(booking.advanceReceived)) ? Number(booking.advanceReceived) : 0).toLocaleString()}</p>
                </div>
                <div className="bg-red-50 rounded-lg p-4 text-center">
                  <p className="text-xs text-red-600 mb-1">Balance Due</p>
                  <p className="text-lg font-bold text-red-600">NPR {Math.max(0, (Number(booking.totalAgreedAmount) || 0) - (Number(booking.advanceReceived) || 0)).toLocaleString()}</p>
                </div>
              </div>
            </div>

            {/* Vendor Allocations */}
            {allocations.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <h3 className="font-semibold text-slate-900 mb-4">Vendor Allocations</h3>
                <div className="space-y-3">
                  {allocations.map(alloc => {
                    const cost = Number.isFinite(Number(alloc.agreedCost)) ? Number(alloc.agreedCost) : 0;
                    const paid = Number.isFinite(Number(alloc.amountPaid)) ? Number(alloc.amountPaid) : 0;
                    return (
                      <div key={alloc.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <div>
                          <p className="text-sm font-medium text-slate-900">{alloc.vendorName}</p>
                          <p className="text-xs text-slate-500">{alloc.serviceType} • {alloc.serviceDate}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">{alloc.specialNotes}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-slate-900">NPR {cost.toLocaleString()}</p>
                          <p className={`text-xs font-medium ${alloc.paymentStatus === 'SETTLED' ? 'text-green-600' : alloc.paymentStatus === 'PARTIALLY_PAID' ? 'text-amber-600' : 'text-red-500'}`}>
                            {alloc.paymentStatus.replace('_', ' ')} (Paid: {paid.toLocaleString()})
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-4 pt-4 border-t border-slate-200 flex justify-between text-sm">
                  <span className="text-slate-500">Total Vendor Cost: <strong>NPR {(Number.isFinite(totalVendorCost) ? totalVendorCost : 0).toLocaleString()}</strong></span>
                  <span className="text-slate-500">Paid: <strong className="text-green-600">NPR {(Number.isFinite(totalVendorPaid) ? totalVendorPaid : 0).toLocaleString()}</strong></span>
                  <span className="text-slate-500">Due: <strong className="text-red-600">NPR {Math.max(0, (totalVendorCost || 0) - (totalVendorPaid || 0)).toLocaleString()}</strong></span>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar Info */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="font-semibold text-slate-900 mb-3">Trip Details</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Mountain size={16} className="text-paila-blue" />
                  <div>
                    <p className="text-xs text-slate-500">Package</p>
                    <p className="text-sm font-medium">{booking.packageName || 'Custom'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar size={16} className="text-paila-blue" />
                  <div>
                    <p className="text-xs text-slate-500">Duration</p>
                    <p className="text-sm font-medium">{booking.startDate} → {booking.endDate}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Users size={16} className="text-paila-blue" />
                  <div>
                    <p className="text-xs text-slate-500">Pax Count</p>
                    <p className="text-sm font-medium">{booking.paxCount} persons</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <MapPin size={16} className="text-paila-blue" />
                  <div>
                    <p className="text-xs text-slate-500">Tour Leader</p>
                    <p className="text-sm font-medium">{booking.assignedTourOperatorName || 'Not Assigned'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* PDF Summary Quick Card */}
            <div className="bg-gradient-to-br from-slate-900 to-paila-blue text-white rounded-xl p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <FileText size={18} className="text-paila-orange" />
                <h3 className="font-bold text-sm">Printer-Friendly PDF Dossier</h3>
              </div>
              <p className="text-xs text-slate-200 leading-relaxed mb-4">
                Export an official print-ready summary of this booking's day-by-day itinerary, live operational status, allocations, and financial balance.
              </p>
              <button
                onClick={() => {
                  sounds.modalOpen();
                  setViewingDocument('itinerary-summary');
                }}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-paila-orange hover:bg-paila-orange-light text-white font-semibold text-xs rounded-lg transition-all shadow-xs cursor-pointer"
              >
                <Printer size={14} />
                <span>Generate & Download Summary</span>
              </button>
            </div>

            {/* Status Timeline */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="font-semibold text-slate-900 mb-3">Status Timeline</h3>
              <div className="space-y-3">
                {(['PROPOSED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED'] as BookingStatus[]).map((status, i) => {
                  const statusOrder = ['PROPOSED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED'];
                  const currentIndex = statusOrder.indexOf(booking.status);
                  const isComplete = i <= currentIndex;
                  const isCurrent = status === booking.status;
                  return (
                    <div key={status} className="flex items-center gap-3">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                        isComplete ? 'bg-green-500 text-white' : 'bg-slate-200 text-slate-400'
                      }`}>
                        {isComplete ? <CheckCircle size={14} /> : <Clock size={14} />}
                      </div>
                      <span className={`text-sm ${isCurrent ? 'font-semibold text-paila-blue' : isComplete ? 'text-slate-700' : 'text-slate-400'}`}>
                        {status.replace('_', ' ')}
                        {isCurrent && <span className="ml-2 text-[10px] bg-paila-blue text-white px-1.5 py-0.5 rounded">Current</span>}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {booking.notes && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle size={14} className="text-amber-600" />
                  <p className="text-xs font-semibold text-amber-800">Notes</p>
                </div>
                <p className="text-sm text-amber-700">{booking.notes}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Itinerary Tab */}
      {activeTab === 'itinerary' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-100">
            <div>
              <h3 className="font-semibold text-slate-900 text-base">Day-by-Day Itinerary & Program</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Detailed day-wise travel schedule, mountain routes, meal plans and overnight halts.
              </p>
            </div>
            <button
              onClick={() => {
                sounds.modalOpen();
                setViewingDocument('itinerary-summary');
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-paila-blue text-white rounded-lg text-xs font-semibold hover:bg-paila-blue-light transition-all shadow-2xs cursor-pointer"
            >
              <Printer size={14} />
              <span>Print / Download Itinerary PDF</span>
            </button>
          </div>
          {booking.itineraryDays.length > 0 ? (
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-slate-200" />
              
              <div className="space-y-6">
                {booking.itineraryDays.map((day, index) => (
                  <div key={day.id} className="relative pl-12 avoid-break">
                    {/* Timeline dot */}
                    <div className="absolute left-3 top-1 w-5 h-5 bg-paila-blue rounded-full flex items-center justify-center text-white text-[10px] font-bold z-10">
                      {day.dayNumber}
                    </div>
                    
                    <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
                      <h4 className="font-semibold text-slate-900">Day {day.dayNumber}: {day.title}</h4>
                      <p className="text-sm text-slate-600 mt-2">{day.description}</p>
                      <div className="flex flex-wrap gap-4 mt-3 text-xs text-slate-500">
                        {day.overnightLocation && (
                          <span className="flex items-center gap-1">
                            <MapPin size={12} className="text-paila-orange" />
                            {day.overnightLocation}
                          </span>
                        )}
                        {day.mealsIncluded && (
                          <span className="flex items-center gap-1">
                            🍽️ Meals: {day.mealsIncluded}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {index < booking.itineraryDays.length - 1 && (
                      <div className="flex items-center gap-2 py-2 text-xs text-slate-400">
                        <ChevronRight size={12} />
                        <span>Next day</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <Mountain size={40} className="mx-auto text-slate-300 mb-3" />
              <p className="text-slate-500 text-sm">Itinerary not yet created</p>
            </div>
          )}
        </div>
      )}

      {/* Operations Tab */}
      {activeTab === 'operations' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="font-semibold text-slate-900 mb-4">Operations & Vendor Allocation</h3>
          {allocations.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600">Vendor</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600">Service</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600">Date</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600">Cost</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600">Paid</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {allocations.map(alloc => (
                    <tr key={alloc.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-slate-900">{alloc.vendorName}</p>
                        {/* Vehicle details inline */}
                        {(() => {
                          const vendor = vendors.find(v => v.id === alloc.vendorId);
                          if (vendor?.category === 'VEHICLE') {
                            return (
                              <div className="flex items-center gap-2 mt-1">
                                {vendor.vehicleType && (
                                  <span className="text-[10px] px-1.5 py-0.5 bg-green-100 text-green-700 rounded font-medium">{vendor.vehicleType}</span>
                                )}
                                {vendor.plateNumber && (
                                  <span className="text-[10px] px-1.5 py-0.5 bg-slate-900 text-white font-mono font-bold rounded tracking-wider">{vendor.plateNumber}</span>
                                )}
                              </div>
                            );
                          }
                          return null;
                        })()}
                        <p className="text-[10px] text-slate-400 mt-0.5">{alloc.specialNotes}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 bg-slate-100 text-xs rounded-md font-medium">{alloc.serviceType}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">{alloc.serviceDate}</td>
                      <td className="px-4 py-3 text-sm font-medium">NPR {(Number.isFinite(Number(alloc.agreedCost)) ? Number(alloc.agreedCost) : 0).toLocaleString()}</td>
                      <td className="px-4 py-3 text-sm text-green-600 font-medium">NPR {(Number.isFinite(Number(alloc.amountPaid)) ? Number(alloc.amountPaid) : 0).toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-[10px] font-semibold rounded-full ${
                          alloc.paymentStatus === 'SETTLED' ? 'bg-green-100 text-green-700' :
                          alloc.paymentStatus === 'PARTIALLY_PAID' ? 'bg-amber-100 text-amber-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {alloc.paymentStatus.replace('_', ' ')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-slate-500 text-sm">No vendor allocations yet. Confirm booking to trigger operations.</p>
            </div>
          )}
        </div>
      )}

      {/* Status History Tab */}
      {activeTab === 'status-history' && (
        <div className="space-y-6">
          {/* Workflow Stage Progress Stepper */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100">
              <div>
                <h3 className="font-semibold text-slate-900 text-base flex items-center gap-2">
                  <History size={18} className="text-paila-blue" />
                  Booking Lifecycle & Status Timeline
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Complete audit trail of status transitions, operational updates, and responsible personnel.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportHistoryCSV}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-medium transition-colors"
                  title="Export audit log to CSV"
                >
                  <Download size={14} />
                  Export Log
                </button>
                <button
                  onClick={handleOpenStatusModal}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-paila-blue hover:bg-paila-blue-light text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
                >
                  <RefreshCw size={13} />
                  Change Status
                </button>
              </div>
            </div>

            {/* Stepper Steps */}
            {booking.status === 'CANCELLED' ? (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-rose-100 flex items-center justify-center shrink-0 mt-0.5">
                  <AlertCircle size={20} className="text-rose-600" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-rose-900">Booking Cancelled</h4>
                  <p className="text-xs text-rose-700 mt-1">
                    This booking has been flagged as cancelled. See the status change entries below for the recorded reason and personnel details.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 relative">
                {workflowSteps.map((step, idx) => {
                  const isCompleted = currentStepIdx > idx;
                  const isCurrent = currentStepIdx === idx;
                  return (
                    <div
                      key={step.status}
                      className={`relative p-3.5 rounded-xl border transition-all ${
                        isCurrent
                          ? 'bg-blue-50/70 border-paila-blue shadow-sm ring-1 ring-paila-blue/30'
                          : isCompleted
                          ? 'bg-slate-50/90 border-slate-200'
                          : 'bg-white border-slate-200 opacity-60'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                            isCurrent
                              ? 'bg-paila-blue text-white shadow-sm'
                              : isCompleted
                              ? 'bg-emerald-600 text-white'
                              : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {isCompleted ? <Check size={13} /> : idx + 1}
                        </span>
                        {isCurrent && (
                          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-paila-blue text-white rounded-full">
                            Active
                          </span>
                        )}
                        {isCompleted && (
                          <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                            Passed
                          </span>
                        )}
                      </div>
                      <h4 className={`text-xs font-bold ${isCurrent ? 'text-paila-blue' : 'text-slate-900'}`}>
                        {step.label}
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">{step.desc}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Timeline Stream */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-slate-900">Activity Log & Milestone History</span>
                <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
                  {historyEntries.length} {historyEntries.length === 1 ? 'event' : 'events'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Order:</span>
                <button
                  onClick={() => setHistorySortOrder(prev => prev === 'NEWEST' ? 'OLDEST' : 'NEWEST')}
                  className="px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
                >
                  {historySortOrder === 'NEWEST' ? 'Newest First ↓' : 'Oldest First ↑'}
                </button>
              </div>
            </div>

            <div className="relative pl-6 sm:pl-8 space-y-8 before:absolute before:left-3 sm:before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
              {historyEntries.map((entry, index) => {
                const isLatest = index === 0 && historySortOrder === 'NEWEST';
                const roleBadge = getRoleBadge(entry.changedBy?.role);
                const toStatus = entry.toStatus;
                const fromStatus = entry.fromStatus;

                const getStatusVisuals = (st: BookingStatus) => {
                  switch (st) {
                    case 'PROPOSED':
                      return {
                        bulletBg: 'bg-amber-500 text-white ring-amber-100',
                        badgeStyle: 'bg-amber-100 text-amber-800 border-amber-200',
                        icon: FileText,
                      };
                    case 'CONFIRMED':
                      return {
                        bulletBg: 'bg-blue-600 text-white ring-blue-100',
                        badgeStyle: 'bg-blue-100 text-blue-800 border-blue-200',
                        icon: CheckCircle2,
                      };
                    case 'IN_PROGRESS':
                      return {
                        bulletBg: 'bg-emerald-600 text-white ring-emerald-100',
                        badgeStyle: 'bg-emerald-100 text-emerald-800 border-emerald-200',
                        icon: Mountain,
                      };
                    case 'COMPLETED':
                      return {
                        bulletBg: 'bg-slate-800 text-white ring-slate-100',
                        badgeStyle: 'bg-slate-100 text-slate-800 border-slate-200',
                        icon: CheckCircle,
                      };
                    case 'CANCELLED':
                      return {
                        bulletBg: 'bg-rose-600 text-white ring-rose-100',
                        badgeStyle: 'bg-rose-100 text-rose-800 border-rose-200',
                        icon: AlertCircle,
                      };
                  }
                };

                const visuals = getStatusVisuals(toStatus);
                const IconComponent = visuals.icon;

                return (
                  <div key={entry.id || index} className="relative group">
                    {/* Node marker on vertical line */}
                    <div
                      className={`absolute -left-6 sm:-left-8 top-1 w-6 sm:w-8 h-6 sm:h-8 rounded-full flex items-center justify-center shadow-sm ring-4 ${
                        visuals.bulletBg
                      } ${isLatest ? 'animate-pulse' : ''}`}
                    >
                      <IconComponent size={14} />
                    </div>

                    {/* Timeline card content */}
                    <div className="bg-slate-50/70 group-hover:bg-slate-50 border border-slate-200 rounded-xl p-4 sm:p-5 transition-all shadow-xs">
                      {/* Top Header of Card */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-semibold text-slate-700">Status Changed:</span>
                          {fromStatus ? (
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs px-2 py-0.5 rounded-md font-semibold bg-slate-200 text-slate-700">
                                {fromStatus.replace('_', ' ')}
                              </span>
                              <ArrowRight size={13} className="text-slate-400" />
                              <span className={`text-xs px-2 py-0.5 rounded-md font-semibold border ${visuals.badgeStyle}`}>
                                {toStatus.replace('_', ' ')}
                              </span>
                            </div>
                          ) : (
                            <span className={`text-xs px-2 py-0.5 rounded-md font-semibold border ${visuals.badgeStyle}`}>
                              Initial: {toStatus.replace('_', ' ')}
                            </span>
                          )}

                          {isLatest && (
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-paila-blue text-white rounded-full">
                              Latest State
                            </span>
                          )}
                        </div>

                        {/* Timestamp */}
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 shrink-0">
                          <Clock size={13} className="text-slate-400" />
                          <span className="font-medium text-slate-700">{formatTimestamp(entry.changedAt)}</span>
                          <span className="text-slate-400">({getRelativeTime(entry.changedAt)})</span>
                        </div>
                      </div>

                      {/* Reason Box */}
                      {entry.reason && (
                        <div className="bg-white border border-slate-200/80 rounded-lg p-3 my-2.5 text-xs text-slate-800 flex items-start gap-2 shadow-2xs">
                          <MessageSquare size={15} className="text-paila-blue shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <span className="font-semibold text-slate-900 block mb-0.5">Rationale / Note:</span>
                            <p className="text-slate-700 leading-relaxed">{entry.reason}</p>
                          </div>
                        </div>
                      )}

                      {/* Additional Notes */}
                      {entry.notes && (
                        <div className="text-xs text-slate-600 bg-amber-50/70 border border-amber-200/60 rounded-lg p-2.5 my-2">
                          <span className="font-semibold text-amber-900">Additional Internal Notes: </span>
                          <span>{entry.notes}</span>
                        </div>
                      )}

                      {/* Footer: Personnel & Source Attribution */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 mt-3 border-t border-slate-200/60 text-xs">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-[10px] uppercase">
                            {entry.changedBy?.name ? entry.changedBy.name.charAt(0) : 'U'}
                          </div>
                          <span className="font-medium text-slate-900">
                            {entry.changedBy?.name || 'System Staff'}
                          </span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${roleBadge.color}`}>
                            {roleBadge.label}
                          </span>
                          {entry.changedBy?.email && (
                            <span className="text-slate-400 text-[11px] hidden sm:inline">
                              • {entry.changedBy.email}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1 text-[11px] text-slate-400">
                          <span>Via:</span>
                          <span className="font-medium text-slate-600 bg-white border border-slate-200 px-1.5 py-0.5 rounded text-[10px]">
                            {entry.source === 'FIELD_APP' ? 'Tour Operator Field App' :
                             entry.source === 'BULK_ACTION' ? 'Bulk Action Manager' :
                             entry.source === 'OPERATIONS' ? 'Operations Dispatch' :
                             'Admin Web Portal'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Documents Tab */}
      {activeTab === 'documents' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="font-semibold text-slate-900 mb-4">Documents & Printables</h3>
          
          {/* Status Check - Only CONFIRMED bookings can access documents */}
          {booking.status !== 'CONFIRMED' && booking.status !== 'IN_PROGRESS' && booking.status !== 'COMPLETED' ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Lock size={28} className="text-amber-600" />
              </div>
              <h4 className="text-lg font-semibold text-slate-900 mb-2">Documents Not Available</h4>
              <p className="text-sm text-slate-600 max-w-md mx-auto mb-4">
                Tour documents can only be generated after the booking is <span className="font-semibold text-paila-blue">CONFIRMED</span>.
              </p>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 rounded-lg">
                <AlertTriangle size={16} className="text-amber-600" />
                <span className="text-xs text-amber-800 font-medium">
                  Current status: <span className="font-bold">{booking.status.replace('_', ' ')}</span>
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-4">
                Please confirm the booking (receive advance payment) to unlock document generation.
              </p>
            </div>
          ) : (
            <>
              {/* Confirmation Banner */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 flex items-start gap-3">
                <CheckCircle size={20} className="text-green-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-green-900">Booking Confirmed</p>
                  <p className="text-xs text-green-700 mt-0.5">
                    Documents are available for this confirmed booking. Click any document below to preview and print.
                  </p>
                </div>
              </div>

              {/* Document Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Itinerary & Status Summary (PDF) */}
                <button
                  onClick={() => {
                    sounds.modalOpen();
                    setViewingDocument('itinerary-summary');
                  }}
                  className="p-5 border-2 border-dashed border-paila-blue/40 bg-blue-50/30 rounded-xl hover:border-paila-blue hover:bg-blue-50/70 transition-all text-center group cursor-pointer relative overflow-hidden"
                >
                  <div className="absolute top-2 right-2">
                    <span className="px-1.5 py-0.5 bg-paila-blue text-white text-[9px] font-bold rounded uppercase">
                      New
                    </span>
                  </div>
                  <FileText size={30} className="mx-auto text-paila-blue group-hover:scale-110 transition-transform mb-2.5" />
                  <p className="font-semibold text-sm text-slate-900">Itinerary & Status Summary</p>
                  <p className="text-xs text-slate-500 mt-1">Full roadmap, status log & logistics</p>
                  <span className="inline-block mt-3 text-[10px] font-bold text-paila-blue bg-blue-100 px-2.5 py-0.5 rounded-full">
                    Preview PDF →
                  </span>
                </button>

                {/* Tour Proposal & Quote */}
                <button
                  onClick={() => {
                    sounds.modalOpen();
                    setViewingDocument('proposal');
                  }}
                  className="p-5 border-2 border-dashed border-slate-200 rounded-xl hover:border-paila-blue hover:bg-blue-50/50 transition-all text-center group cursor-pointer"
                >
                  <FileText size={30} className="mx-auto text-slate-400 group-hover:text-paila-blue transition-colors mb-2.5" />
                  <p className="font-medium text-sm text-slate-900">Tour Proposal & Quote</p>
                  <p className="text-xs text-slate-500 mt-1">Itinerary, pricing & terms</p>
                  <span className="inline-block mt-3 text-[10px] font-semibold text-paila-blue bg-blue-100 px-2.5 py-0.5 rounded-full">
                    Preview →
                  </span>
                </button>

                {/* Booking Voucher */}
                <button
                  onClick={() => {
                    sounds.modalOpen();
                    setViewingDocument('voucher');
                  }}
                  className="p-5 border-2 border-dashed border-slate-200 rounded-xl hover:border-paila-orange hover:bg-orange-50/50 transition-all text-center group cursor-pointer"
                >
                  <FileText size={30} className="mx-auto text-slate-400 group-hover:text-paila-orange transition-colors mb-2.5" />
                  <p className="font-medium text-sm text-slate-900">Booking Voucher</p>
                  <p className="text-xs text-slate-500 mt-1">Guest confirmation document</p>
                  <span className="inline-block mt-3 text-[10px] font-semibold text-paila-orange bg-orange-100 px-2.5 py-0.5 rounded-full">
                    Preview →
                  </span>
                </button>

                {/* Tax / Proforma Invoice */}
                <button
                  onClick={() => {
                    sounds.modalOpen();
                    setViewingDocument('invoice');
                  }}
                  className="p-5 border-2 border-dashed border-slate-200 rounded-xl hover:border-green-500 hover:bg-green-50/50 transition-all text-center group cursor-pointer"
                >
                  <FileText size={30} className="mx-auto text-slate-400 group-hover:text-green-600 transition-colors mb-2.5" />
                  <p className="font-medium text-sm text-slate-900">Tax / Proforma Invoice</p>
                  <p className="text-xs text-slate-500 mt-1">Payment schedule & receipt</p>
                  <span className="inline-block mt-3 text-[10px] font-semibold text-green-700 bg-green-100 px-2.5 py-0.5 rounded-full">
                    Preview →
                  </span>
                </button>
              </div>

              {/* Quick Print All */}
              <div className="mt-6 pt-6 border-t border-slate-200">
                <p className="text-xs text-slate-500 mb-3">Quick Actions:</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setViewingDocument('itinerary-summary')}
                    className="flex items-center gap-2 px-4 py-2 bg-paila-blue text-white rounded-lg text-xs font-semibold hover:bg-paila-blue-light transition-colors shadow-2xs cursor-pointer"
                  >
                    <Printer size={14} />
                    Print Itinerary & Status Summary
                  </button>
                  <button
                    onClick={() => setViewingDocument('proposal')}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg text-xs font-medium hover:bg-slate-900 transition-colors cursor-pointer"
                  >
                    <Printer size={14} />
                    Print Proposal
                  </button>
                  <button
                    onClick={() => setViewingDocument('voucher')}
                    className="flex items-center gap-2 px-4 py-2 bg-paila-orange text-white rounded-lg text-xs font-medium hover:bg-paila-orange-light transition-colors cursor-pointer"
                  >
                    <Printer size={14} />
                    Print Voucher
                  </button>
                  <button
                    onClick={() => setViewingDocument('invoice')}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 transition-colors cursor-pointer"
                  >
                    <Printer size={14} />
                    Print Invoice
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Document Viewer Modal */}
      {viewingDocument && booking && (
        <DocumentViewer
          booking={booking}
          documentType={viewingDocument}
          onClose={() => setViewingDocument(null)}
        />
      )}

      {/* Status Change Modal */}
      {showStatusModal && booking && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-xl p-6 animate-fade-in max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-paila-blue/10 flex items-center justify-center text-paila-blue">
                  <RefreshCw size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Update Booking Status</h3>
                  <p className="text-xs text-slate-500">
                    {booking.bookingCode} • {booking.clientName}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowStatusModal(false)}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-5">
              {/* Current Status Banner */}
              <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                <span className="text-slate-500">Current Status:</span>
                <span className={`px-2.5 py-1 rounded-md font-bold text-xs border ${getStatusColor(booking.status)}`}>
                  {booking.status.replace('_', ' ')}
                </span>
              </div>

              {/* Status Picker Grid */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Select New Target Status
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {[
                    { status: 'PROPOSED' as BookingStatus, label: 'Proposed', desc: 'Inquiry / quotation stage', color: 'border-amber-300 text-amber-900 bg-amber-50/60' },
                    { status: 'CONFIRMED' as BookingStatus, label: 'Confirmed', desc: 'Advance deposit received & locked', color: 'border-blue-300 text-blue-900 bg-blue-50/60' },
                    { status: 'IN_PROGRESS' as BookingStatus, label: 'In Progress', desc: 'Tour group active on the field', color: 'border-emerald-300 text-emerald-900 bg-emerald-50/60' },
                    { status: 'COMPLETED' as BookingStatus, label: 'Completed', desc: 'Concluded & accounts settled', color: 'border-slate-400 text-slate-900 bg-slate-100' },
                    { status: 'CANCELLED' as BookingStatus, label: 'Cancelled', desc: 'Trip cancelled / refunded', color: 'border-rose-300 text-rose-900 bg-rose-50/60' },
                  ].map(option => {
                    const isSelected = selectedNewStatus === option.status;
                    const isCurrent = booking.status === option.status;
                    return (
                      <button
                        key={option.status}
                        type="button"
                        onClick={() => {
                          sounds.click();
                          setSelectedNewStatus(option.status);
                        }}
                        className={`text-left p-3 rounded-xl border-2 transition-all flex items-start gap-2.5 ${
                          isSelected
                            ? `${option.color} ring-2 ring-paila-blue shadow-xs font-semibold`
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                          isSelected ? 'border-paila-blue bg-paila-blue text-white' : 'border-slate-300'
                        }`}>
                          {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-slate-900">{option.label}</span>
                            {isCurrent && (
                              <span className="text-[10px] text-slate-500 bg-slate-200 px-1.5 py-0.2 rounded">
                                (Current)
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5 leading-tight">{option.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Preset Reason Suggestions */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1">
                  <Sparkles size={13} className="text-paila-orange" />
                  Quick Transition Rationale Suggestions
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {getReasonPresets(selectedNewStatus).map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        sounds.click();
                        setStatusReason(preset);
                      }}
                      className="text-[11px] px-2.5 py-1 bg-slate-100 hover:bg-paila-blue/10 hover:text-paila-blue hover:border-paila-blue/30 border border-slate-200 rounded-lg text-slate-700 transition-all text-left"
                    >
                      + {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Rationale Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Transition Reason / Explanation <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={statusReason}
                  onChange={e => setStatusReason(e.target.value)}
                  placeholder="e.g. 50% Advance received via Nabil Bank transfer #NAB-2026-081"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-paila-blue/20 focus:border-paila-blue outline-none"
                />
              </div>

              {/* Internal Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Additional Internal Notes (Optional)
                </label>
                <textarea
                  value={statusNotes}
                  onChange={e => setStatusNotes(e.target.value)}
                  rows={2}
                  placeholder="Any operational observations, voucher notes, or vendor reminders..."
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-paila-blue/20 focus:border-paila-blue outline-none resize-none"
                />
              </div>

              {/* Attribution Signature Box */}
              <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-3 text-xs flex items-center gap-3">
                <Shield size={18} className="text-paila-blue shrink-0" />
                <div className="text-slate-600">
                  <span>Signatory attribution: </span>
                  <span className="font-bold text-slate-900">{user?.name || 'Super Admin'}</span>
                  <span className="text-paila-blue font-semibold ml-1">({(user?.role || 'SUPER_ADMIN').replace('_', ' ')})</span>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowStatusModal(false)}
                className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApplyStatusChange}
                className="flex-1 px-4 py-2.5 bg-paila-blue hover:bg-paila-blue-light text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-2"
              >
                <Check size={15} />
                Save & Record Status Transition
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {isEditing && booking && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-4xl p-6 animate-fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-900">Edit Booking</h3>
              <button onClick={() => setIsEditing(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-6">
              {/* Client Information */}
              <div>
                <h4 className="text-sm font-semibold text-slate-900 mb-3">Client Information</h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Client Type</label>
                    <select
                      value={editData.clientType}
                      onChange={e => setEditData({ ...editData, clientType: e.target.value as ClientType })}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-paila-blue/20 focus:border-paila-blue outline-none"
                    >
                      <option value="INSTITUTIONAL">Institutional</option>
                      <option value="CORPORATE">Corporate</option>
                      <option value="INDIVIDUAL">Individual</option>
                      <option value="FOREIGN_TREK">Foreign Trek</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Client Name</label>
                      <input
                        type="text"
                        value={editData.clientName}
                        onChange={e => setEditData({ ...editData, clientName: e.target.value })}
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-paila-blue/20 focus:border-paila-blue outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Phone</label>
                      <input
                        type="text"
                        value={editData.clientPhone}
                        onChange={e => setEditData({ ...editData, clientPhone: e.target.value })}
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-paila-blue/20 focus:border-paila-blue outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
                    <input
                      type="email"
                      value={editData.clientEmail}
                      onChange={e => setEditData({ ...editData, clientEmail: e.target.value })}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-paila-blue/20 focus:border-paila-blue outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Package & Dates */}
              <div>
                <h4 className="text-sm font-semibold text-slate-900 mb-3">Package & Dates</h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Package</label>
                    <select
                      value={editData.packageId || ''}
                      onChange={e => {
                        const pkgId = e.target.value ? Number(e.target.value) : null;
                        const pkg = pkgId ? packages.find(p => p.id === pkgId) : null;
                        setEditData({ 
                          ...editData, 
                          packageId: pkgId,
                          packageName: pkg?.title || ''
                        });
                      }}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-paila-blue/20 focus:border-paila-blue outline-none"
                    >
                      <option value="">Custom Package</option>
                      {packages.map(pkg => (
                        <option key={pkg.id} value={pkg.id}>{pkg.title}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Start Date</label>
                      <input
                        type="date"
                        value={editData.startDate}
                        onChange={e => setEditData({ ...editData, startDate: e.target.value })}
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-paila-blue/20 focus:border-paila-blue outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">End Date</label>
                      <input
                        type="date"
                        value={editData.endDate}
                        onChange={e => setEditData({ ...editData, endDate: e.target.value })}
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-paila-blue/20 focus:border-paila-blue outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Pax Count</label>
                    <input
                      type="number"
                      value={Number.isFinite(editData.paxCount) ? editData.paxCount : 1}
                      onChange={e => setEditData({ ...editData, paxCount: Number.isFinite(Number(e.target.value)) ? Math.max(1, Number(e.target.value)) : 1 })}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-paila-blue/20 focus:border-paila-blue outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Financial Information */}
              <div>
                <h4 className="text-sm font-semibold text-slate-900 mb-3">Financial Information</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Total Amount (NPR)</label>
                    <input
                      type="number"
                      value={Number.isFinite(editData.totalAgreedAmount) ? editData.totalAgreedAmount : 0}
                      onChange={e => setEditData({ ...editData, totalAgreedAmount: Number.isFinite(Number(e.target.value)) ? Math.max(0, Number(e.target.value)) : 0 })}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-paila-blue/20 focus:border-paila-blue outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Advance Received (NPR)</label>
                    <input
                      type="number"
                      value={Number.isFinite(editData.advanceReceived) ? editData.advanceReceived : 0}
                      onChange={e => setEditData({ ...editData, advanceReceived: Number.isFinite(Number(e.target.value)) ? Math.max(0, Number(e.target.value)) : 0 })}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-paila-blue/20 focus:border-paila-blue outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Status & Assignment */}
              <div>
                <h4 className="text-sm font-semibold text-slate-900 mb-3">Status & Assignment</h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Status</label>
                    <select
                      value={editData.status}
                      onChange={e => setEditData({ ...editData, status: e.target.value as BookingStatus })}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-paila-blue/20 focus:border-paila-blue outline-none"
                    >
                      <option value="PROPOSED">Proposed</option>
                      <option value="CONFIRMED">Confirmed</option>
                      <option value="IN_PROGRESS">In Progress</option>
                      <option value="COMPLETED">Completed</option>
                      <option value="CANCELLED">Cancelled</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Assigned Tour Leader</label>
                    <input
                      type="text"
                      value={editData.assignedTourOperatorName}
                      onChange={e => setEditData({ ...editData, assignedTourOperatorName: e.target.value })}
                      placeholder="Enter tour leader name"
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-paila-blue/20 focus:border-paila-blue outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Itinerary */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-slate-900">Itinerary</h4>
                  <button
                    onClick={() => {
                      const newDay: ItineraryDay = {
                        id: Date.now(),
                        dayNumber: editData.itineraryDays.length + 1,
                        title: '',
                        description: '',
                        overnightLocation: '',
                        mealsIncluded: 'B,L,D'
                      };
                      setEditData({ ...editData, itineraryDays: [...editData.itineraryDays, newDay] });
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 bg-paila-blue text-white rounded-lg text-xs font-medium hover:bg-paila-blue-light transition-colors"
                  >
                    <Plus size={14} />
                    Add Day
                  </button>
                </div>
                <div className="space-y-3">
                  {editData.itineraryDays.map((day, index) => (
                    <div key={day.id} className="border border-slate-200 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-slate-700">Day {day.dayNumber}</span>
                        <button
                          onClick={() => {
                            const updatedDays = editData.itineraryDays.filter(d => d.id !== day.id);
                            setEditData({ 
                              ...editData, 
                              itineraryDays: updatedDays.map((d, i) => ({ ...d, dayNumber: i + 1 }))
                            });
                          }}
                          className="p-1 text-red-600 hover:bg-red-50 rounded"
                        >
                          <X size={16} />
                        </button>
                      </div>
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={day.title}
                          onChange={e => {
                            const updatedDays = editData.itineraryDays.map(d => 
                              d.id === day.id ? { ...d, title: e.target.value } : d
                            );
                            setEditData({ ...editData, itineraryDays: updatedDays });
                          }}
                          placeholder="Day title"
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-paila-blue/20 focus:border-paila-blue outline-none"
                        />
                        <textarea
                          value={day.description}
                          onChange={e => {
                            const updatedDays = editData.itineraryDays.map(d => 
                              d.id === day.id ? { ...d, description: e.target.value } : d
                            );
                            setEditData({ ...editData, itineraryDays: updatedDays });
                          }}
                          placeholder="Description"
                          rows={2}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-paila-blue/20 focus:border-paila-blue outline-none resize-none"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={day.overnightLocation}
                            onChange={e => {
                              const updatedDays = editData.itineraryDays.map(d => 
                                d.id === day.id ? { ...d, overnightLocation: e.target.value } : d
                              );
                              setEditData({ ...editData, itineraryDays: updatedDays });
                            }}
                            placeholder="Overnight location"
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-paila-blue/20 focus:border-paila-blue outline-none"
                          />
                          <input
                            type="text"
                            value={day.mealsIncluded}
                            onChange={e => {
                              const updatedDays = editData.itineraryDays.map(d => 
                                d.id === day.id ? { ...d, mealsIncluded: e.target.value } : d
                              );
                              setEditData({ ...editData, itineraryDays: updatedDays });
                            }}
                            placeholder="Meals (B,L,D)"
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-paila-blue/20 focus:border-paila-blue outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  {editData.itineraryDays.length === 0 && (
                    <p className="text-sm text-slate-500 text-center py-4">No itinerary days added</p>
                  )}
                </div>
              </div>

              {/* Notes */}
              <div>
                <h4 className="text-sm font-semibold text-slate-900 mb-3">Notes</h4>
                <textarea
                  value={editData.notes}
                  onChange={e => setEditData({ ...editData, notes: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-paila-blue/20 focus:border-paila-blue outline-none resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setIsEditing(false)}
                className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="flex-1 px-4 py-2.5 bg-paila-blue text-white rounded-lg text-sm font-medium hover:bg-paila-blue-light transition-colors"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 animate-fade-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <Trash2 size={24} className="text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Delete Booking</h3>
                <p className="text-sm text-slate-500">This action cannot be undone</p>
              </div>
            </div>
            <p className="text-sm text-slate-600 mb-6">
              Are you sure you want to delete booking <span className="font-semibold">{booking?.bookingCode}</span>? All associated data will be permanently removed.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
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
