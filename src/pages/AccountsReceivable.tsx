import { useState } from 'react';
import { Search, Wallet, TrendingUp, CheckCircle, Clock, AlertTriangle, Plus, X, Users } from 'lucide-react';
import { useBookings } from '../contexts/BookingContext';
import { useActivities } from '../contexts/ActivityContext';
import { SkeletonLoader } from '../components/common/SkeletonLoader';
import { EmptyState } from '../components/common/EmptyState';
import { sounds } from '../utils/sounds';

export default function AccountsReceivable() {
  const { bookings: allBookings, isLoading, updateBooking } = useBookings();
  const { logActivity } = useActivities();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState<number | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('BANK_TRANSFER');
  const [referenceNumber, setReferenceNumber] = useState('');

  // Calculate totals from bookings
  const totalAgreed = allBookings.reduce((s, b) => s + (Number.isFinite(Number(b.totalAgreedAmount)) ? Number(b.totalAgreedAmount) : 0), 0);
  const totalReceived = allBookings.reduce((s, b) => s + (Number.isFinite(Number(b.advanceReceived)) ? Number(b.advanceReceived) : 0), 0);
  const totalPending = Math.max(0, totalAgreed - totalReceived);
  const pendingCount = allBookings.filter(b => (Number(b.advanceReceived) || 0) < (Number(b.totalAgreedAmount) || 0)).length;

  // Filter bookings
  const filtered = allBookings.filter(b => {
    const matchesSearch = b.clientName.toLowerCase().includes(search.toLowerCase()) ||
      b.bookingCode.toLowerCase().includes(search.toLowerCase());
    
    const balance = b.totalAgreedAmount - b.advanceReceived;
    let matchesStatus = false;
    
    if (statusFilter === 'ALL') matchesStatus = true;
    else if (statusFilter === 'SETTLED') matchesStatus = balance === 0;
    else if (statusFilter === 'PARTIALLY_PAID') matchesStatus = b.advanceReceived > 0 && balance > 0;
    else if (statusFilter === 'PENDING') matchesStatus = b.advanceReceived === 0;
    
    return matchesSearch && matchesStatus;
  });

  const getPaymentStatus = (booking: typeof allBookings[0]) => {
    const balance = booking.totalAgreedAmount - booking.advanceReceived;
    if (balance === 0) return 'SETTLED';
    if (booking.advanceReceived > 0) return 'PARTIALLY_PAID';
    return 'PENDING';
  };

  const handleRecordPayment = () => {
    if (!selectedBookingId || !paymentAmount) {
      return;
    }

    const booking = allBookings.find(b => b.id === selectedBookingId);
    if (!booking) return;

    const amountNum = Number(paymentAmount);
    const newAdvance = booking.advanceReceived + amountNum;
    updateBooking(selectedBookingId, {
      advanceReceived: newAdvance
    });

    logActivity({
      type: 'CLIENT_PAYMENT',
      category: 'PAYMENT',
      title: `Client Payment Collected: ${booking.clientName}`,
      description: `Collected NPR ${amountNum.toLocaleString()} via ${paymentMode.replace('_', ' ')} for booking ${booking.bookingCode}.`,
      actor: {
        name: 'Finance Dept',
        role: 'SUPER_ADMIN',
      },
      metadata: {
        bookingId: booking.id,
        bookingCode: booking.bookingCode,
        clientName: booking.clientName,
        amount: amountNum,
        currency: 'NPR',
        paymentMode,
        details: referenceNumber ? `Ref: ${referenceNumber}` : 'Direct Receipt',
      },
    });

    sounds.cashRegister();
    setShowPaymentModal(false);
    setSelectedBookingId(null);
    setPaymentAmount('');
    setPaymentMode('BANK_TRANSFER');
    setReferenceNumber('');
  };

  return (
    <div className="p-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Accounts Receivable</h1>
          <p className="text-slate-500 text-sm mt-1">Client payment tracking and collection management</p>
        </div>
        <button
          onClick={() => setShowPaymentModal(true)}
          className="flex items-center gap-2 bg-paila-orange text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-paila-orange-light transition-colors"
        >
          <Plus size={16} />
          Record Payment
        </button>
      </div>

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
              <Wallet size={20} className="text-paila-blue" />
            </div>
            <span className="text-xs text-slate-500 font-medium">Total Billed</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">NPR {totalAgreed.toLocaleString()}</p>
          <p className="text-xs text-slate-400 mt-1">{allBookings.length} bookings</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
              <CheckCircle size={20} className="text-green-600" />
            </div>
            <span className="text-xs text-slate-500 font-medium">Total Received</span>
          </div>
          <p className="text-2xl font-bold text-green-700">NPR {totalReceived.toLocaleString()}</p>
          <p className="text-xs text-slate-400 mt-1">Advance payments</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center">
              <TrendingUp size={20} className="text-red-600" />
            </div>
            <span className="text-xs text-slate-500 font-medium">Outstanding</span>
          </div>
          <p className="text-2xl font-bold text-red-600">NPR {totalPending.toLocaleString()}</p>
          <p className="text-xs text-slate-400 mt-1">{pendingCount} pending</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center">
              <Clock size={20} className="text-amber-600" />
            </div>
            <span className="text-xs text-slate-500 font-medium">Collection Rate</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{totalAgreed > 0 && Number.isFinite(totalReceived) && Number.isFinite(totalAgreed) ? String(Math.round((totalReceived / totalAgreed) * 100)) : '0'}%</p>
          <p className="text-xs text-slate-400 mt-1">of total billed</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
        <div className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-[200px] relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by client name or booking code..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-paila-blue/20 focus:border-paila-blue outline-none"
            />
          </div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-paila-blue/20 focus:border-paila-blue outline-none"
          >
            <option value="ALL">All Status</option>
            <option value="PENDING">Pending</option>
            <option value="PARTIALLY_PAID">Partially Paid</option>
            <option value="SETTLED">Settled</option>
          </select>
        </div>
      </div>

      {/* Bookings Table */}
      {isLoading ? (
        <SkeletonLoader type="table" rows={5} />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={allBookings.length === 0 ? "No Client Bookings in Database" : "No Bookings Found"}
          description={
            allBookings.length === 0
              ? "No client bookings exist in your system yet. Accounts receivable records will populate as bookings are created."
              : "No client accounts match your search filter."
          }
        />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Booking</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Client</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Package</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Total Amount</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Received</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Balance</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Status</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(booking => {
                  const total = Number.isFinite(Number(booking.totalAgreedAmount)) ? Number(booking.totalAgreedAmount) : 0;
                  const advance = Number.isFinite(Number(booking.advanceReceived)) ? Number(booking.advanceReceived) : 0;
                  const balance = Math.max(0, total - advance);
                  const status = getPaymentStatus(booking);
                  return (
                    <tr key={booking.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-5 py-3.5">
                        <span className="font-mono text-xs text-paila-blue font-medium">{booking.bookingCode}</span>
                        <p className="text-[10px] text-slate-400 mt-0.5">{booking.startDate}</p>
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="text-sm font-medium text-slate-900">{booking.clientName}</p>
                        <p className="text-[10px] text-slate-500">{booking.clientPhone}</p>
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="text-sm text-slate-700">{booking.packageName || 'Custom'}</p>
                        <p className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <Users size={10} /> {Number.isFinite(Number(booking.paxCount)) ? booking.paxCount : 1} pax
                        </p>
                      </td>
                      <td className="px-5 py-3.5 text-sm font-medium text-slate-900">NPR {total.toLocaleString()}</td>
                      <td className="px-5 py-3.5 text-sm text-green-600 font-medium">NPR {advance.toLocaleString()}</td>
                      <td className="px-5 py-3.5">
                        <span className={`text-sm font-bold ${balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          NPR {balance.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`px-2.5 py-1 text-[10px] font-semibold rounded-full ${
                          status === 'SETTLED' ? 'bg-green-100 text-green-700' :
                          status === 'PARTIALLY_PAID' ? 'bg-amber-100 text-amber-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        {balance > 0 && (
                          <button
                            onClick={() => {
                              setSelectedBookingId(booking.id);
                              setShowPaymentModal(true);
                            }}
                            className="text-xs text-paila-blue font-medium hover:text-paila-orange transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                          >
                            + Record Payment
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50 border-t-2 border-slate-200">
                  <td colSpan={3} className="px-5 py-3 text-sm font-semibold text-slate-700">TOTALS</td>
                  <td className="px-5 py-3 text-sm font-bold text-slate-900">NPR {filtered.reduce((s, b) => s + (Number.isFinite(Number(b.totalAgreedAmount)) ? Number(b.totalAgreedAmount) : 0), 0).toLocaleString()}</td>
                  <td className="px-5 py-3 text-sm font-bold text-green-700">NPR {filtered.reduce((s, b) => s + (Number.isFinite(Number(b.advanceReceived)) ? Number(b.advanceReceived) : 0), 0).toLocaleString()}</td>
                  <td className="px-5 py-3 text-sm font-bold text-red-600">NPR {filtered.reduce((s, b) => s + Math.max(0, (Number(b.totalAgreedAmount) || 0) - (Number(b.advanceReceived) || 0)), 0).toLocaleString()}</td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">Record Client Payment</h3>
              <button onClick={() => setShowPaymentModal(false)} className="p-1 hover:bg-slate-100 rounded-lg">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Select Booking</label>
                <select
                  value={selectedBookingId || ''}
                  onChange={e => setSelectedBookingId(Number(e.target.value))}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-paila-blue/20 focus:border-paila-blue outline-none"
                >
                  <option value="">Select booking...</option>
                  {allBookings.filter(b => (Number(b.advanceReceived) || 0) < (Number(b.totalAgreedAmount) || 0)).map(b => {
                    const due = Math.max(0, (Number(b.totalAgreedAmount) || 0) - (Number(b.advanceReceived) || 0));
                    return (
                      <option key={b.id} value={b.id}>
                        {b.bookingCode} - {b.clientName} (Due: NPR {due.toLocaleString()})
                      </option>
                    );
                  })}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Amount (NPR) *</label>
                  <input
                    type="number"
                    value={paymentAmount}
                    onChange={e => setPaymentAmount(e.target.value)}
                    placeholder="0"
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-paila-blue/20 focus:border-paila-blue outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Payment Mode *</label>
                  <select
                    value={paymentMode}
                    onChange={e => setPaymentMode(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-paila-blue/20 focus:border-paila-blue outline-none"
                  >
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                    <option value="CASH">Cash</option>
                    <option value="ESEWA">eSewa</option>
                    <option value="KHALTI">Khalti</option>
                    <option value="CHEQUE">Cheque</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Reference Number</label>
                <input
                  type="text"
                  value={referenceNumber}
                  onChange={e => setReferenceNumber(e.target.value)}
                  placeholder="Transaction / receipt number"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-paila-blue/20 focus:border-paila-blue outline-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowPaymentModal(false)}
                className="px-4 py-2.5 border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRecordPayment}
                className="px-4 py-2.5 bg-paila-blue text-white rounded-lg text-sm font-medium hover:bg-paila-blue-light transition-colors"
              >
                Record Payment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
