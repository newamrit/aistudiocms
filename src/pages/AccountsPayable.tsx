import { useState } from 'react';
import { OperationAllocation, PaymentMode } from '../types';
import { Search, Wallet, TrendingDown, CheckCircle, Clock, AlertTriangle, Plus, X } from 'lucide-react';
import { useOperations } from '../contexts/OperationsContext';
import { useBookings } from '../contexts/BookingContext';
import { useActivities } from '../contexts/ActivityContext';
import { SkeletonLoader } from '../components/common/SkeletonLoader';
import { EmptyState } from '../components/common/EmptyState';
import { sounds } from '../utils/sounds';

export default function AccountsPayable() {
  const { allocations, vendorPayments, isLoading, recordVendorPayment } = useOperations();
  const { bookings } = useBookings();
  const { logActivity } = useActivities();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedAllocationId, setSelectedAllocationId] = useState<number | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('BANK_TRANSFER');
  const [referenceNumber, setReferenceNumber] = useState('');

  const totalAgreed = allocations.reduce((s, a) => s + a.agreedCost, 0);
  const totalPaid = allocations.reduce((s, a) => s + a.amountPaid, 0);
  const totalPending = totalAgreed - totalPaid;
  const pendingCount = allocations.filter(a => a.paymentStatus !== 'SETTLED').length;

  const filtered = allocations.filter(a => {
    const matchesSearch = a.vendorName.toLowerCase().includes(search.toLowerCase()) ||
      a.bookingCode.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || a.paymentStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getPaymentHistory = (allocationId: number) => {
    return vendorPayments.filter(p => p.operationAllocationId === allocationId);
  };

  const handleRecordVendorPayment = async () => {
    if (!selectedAllocationId || !paymentAmount) {
      return;
    }

    const allocation = allocations.find(a => a.id === selectedAllocationId);
    if (!allocation) return;

    const amountNum = Number(paymentAmount);

    try {
      await recordVendorPayment({
        operationAllocationId: selectedAllocationId,
        amount: amountNum,
        paymentMode,
        referenceNumber,
        recordedBy: 1,
        recordedByName: 'Finance Manager'
      });

      logActivity({
        type: 'VENDOR_PAYMENT',
        category: 'PAYMENT',
        title: `Vendor Payment Disbursed: ${allocation.vendorName}`,
        description: `Disbursed NPR ${amountNum.toLocaleString()} via ${paymentMode.replace('_', ' ')} for booking ${allocation.bookingCode} (${allocation.serviceType}).`,
        actor: {
          name: 'Finance Manager',
          role: 'SUPER_ADMIN',
        },
        metadata: {
          vendorName: allocation.vendorName,
          bookingCode: allocation.bookingCode,
          amount: amountNum,
          currency: 'NPR',
          paymentMode,
          details: referenceNumber ? `Ref: ${referenceNumber}` : 'Direct Disbursement',
        },
      });

      sounds.cashRegister();
      setShowPaymentModal(false);
      setSelectedAllocationId(null);
      setPaymentAmount('');
      setReferenceNumber('');
    } catch (err) {
      console.error('Failed to record vendor payment:', err);
    }
  };

  return (
    <div className="p-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Accounts Payable (AP)</h1>
          <p className="text-slate-500 text-sm mt-1">Vendor balances, disbursement schedules, and payment settlement</p>
        </div>
        <button
          onClick={() => {
            const firstPending = allocations.find(a => a.paymentStatus !== 'SETTLED');
            if (firstPending) {
              setSelectedAllocationId(firstPending.id);
              setShowPaymentModal(true);
            }
          }}
          disabled={pendingCount === 0}
          className="flex items-center gap-2 bg-paila-blue text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-paila-blue-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          <Plus size={16} />
          Record Vendor Payment
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Committed</span>
            <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center">
              <Wallet size={18} className="text-blue-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">NPR {totalAgreed.toLocaleString()}</p>
          <p className="text-xs text-slate-500 mt-1">{allocations.length} total allocations</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Disbursed</span>
            <div className="w-9 h-9 bg-emerald-50 rounded-lg flex items-center justify-center">
              <CheckCircle size={18} className="text-emerald-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-emerald-600 mt-2">NPR {totalPaid.toLocaleString()}</p>
          <p className="text-xs text-slate-500 mt-1">{allocations.filter(a => a.paymentStatus === 'SETTLED').length} fully settled</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Outstanding Payable</span>
            <div className="w-9 h-9 bg-red-50 rounded-lg flex items-center justify-center">
              <AlertTriangle size={18} className="text-red-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-red-600 mt-2">NPR {totalPending.toLocaleString()}</p>
          <p className="text-xs text-slate-500 mt-1">{pendingCount} pending vendors</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Settlement Rate</span>
            <div className="w-9 h-9 bg-purple-50 rounded-lg flex items-center justify-center">
              <TrendingDown size={18} className="text-purple-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-purple-600 mt-2">
            {totalAgreed > 0 && Number.isFinite(totalPaid) && Number.isFinite(totalAgreed) ? String(Math.round((totalPaid / totalAgreed) * 100)) : '0'}%
          </p>
          <p className="text-xs text-slate-500 mt-1">Paid vs Committed</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
        <div className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-[200px] relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by vendor name or booking code..."
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
            <option value="PENDING">Pending (Unpaid)</option>
            <option value="PARTIALLY_PAID">Partially Paid</option>
            <option value="SETTLED">Settled</option>
          </select>
        </div>
      </div>

      {/* Allocations Table */}
      {isLoading ? (
        <SkeletonLoader type="table" rows={5} />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={allocations.length === 0 ? "No Vendor Allocations in Database" : "No Allocations Found"}
          description={
            allocations.length === 0
              ? "No operational cost allocations have been logged yet. Bookings will generate vendor payables automatically."
              : "No vendor payables match your filter criteria."
          }
        />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden mb-6">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Vendor</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Booking</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Package / Service</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Agreed Cost</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Paid</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Balance Due</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Status</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(alloc => {
                  const balance = alloc.agreedCost - alloc.amountPaid;
                  const booking = bookings.find(b => b.id === alloc.bookingId);
                  const packageName = booking?.packageName || 'Custom Package';

                  return (
                    <tr key={alloc.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-5 py-3.5">
                        <p className="text-sm font-semibold text-slate-900">{alloc.vendorName}</p>
                        <p className="text-xs text-slate-400">Date: {alloc.serviceDate}</p>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="font-mono text-xs text-paila-blue font-medium">{alloc.bookingCode}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="text-sm text-slate-700">{packageName}</p>
                        <p className="text-[10px] text-slate-400">{alloc.serviceType}</p>
                      </td>
                      <td className="px-5 py-3.5 text-sm font-medium text-slate-900">NPR {alloc.agreedCost.toLocaleString()}</td>
                      <td className="px-5 py-3.5 text-sm text-green-600 font-medium">NPR {alloc.amountPaid.toLocaleString()}</td>
                      <td className="px-5 py-3.5">
                        <span className={`text-sm font-bold ${balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          NPR {balance.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`px-2.5 py-1 text-[10px] font-semibold rounded-full ${
                          alloc.paymentStatus === 'SETTLED' ? 'bg-green-100 text-green-700' :
                          alloc.paymentStatus === 'PARTIALLY_PAID' ? 'bg-amber-100 text-amber-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {alloc.paymentStatus.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <button
                          onClick={() => { setSelectedAllocationId(alloc.id); setShowPaymentModal(true); }}
                          className="text-xs text-paila-blue font-medium hover:text-paila-orange transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                        >
                          + Pay
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50 border-t-2 border-slate-200">
                  <td colSpan={3} className="px-5 py-3 text-sm font-semibold text-slate-700">TOTALS</td>
                  <td className="px-5 py-3 text-sm font-bold text-slate-900">NPR {filtered.reduce((s, a) => s + a.agreedCost, 0).toLocaleString()}</td>
                  <td className="px-5 py-3 text-sm font-bold text-green-700">NPR {filtered.reduce((s, a) => s + a.amountPaid, 0).toLocaleString()}</td>
                  <td className="px-5 py-3 text-sm font-bold text-red-600">NPR {filtered.reduce((s, a) => s + (a.agreedCost - a.amountPaid), 0).toLocaleString()}</td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Recent Payment History */}
      <div className="mt-6 bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="font-semibold text-slate-900 mb-4">Recent Payment Transactions</h3>
        {vendorPayments.length === 0 ? (
          <p className="text-xs text-slate-500 py-3">No payments recorded yet.</p>
        ) : (
          <div className="space-y-3">
            {vendorPayments.slice(0, 5).map(payment => (
              <div key={payment.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle size={14} className="text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">NPR {payment.amount.toLocaleString()}</p>
                    <p className="text-xs text-slate-500">
                      {payment.paymentMode.replace('_', ' ')} • {payment.paidAt}
                      {payment.referenceNumber && ` • Ref: ${payment.referenceNumber}`}
                    </p>
                  </div>
                </div>
                <span className="text-xs text-slate-400 font-mono">#{payment.id}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Record Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900">Record Vendor Payment</h3>
              <button onClick={() => setShowPaymentModal(false)} className="p-1 hover:bg-slate-100 rounded-lg cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Select Allocation *</label>
                <select
                  value={selectedAllocationId || ''}
                  onChange={e => {
                    const id = Number(e.target.value);
                    setSelectedAllocationId(id);
                    const alloc = allocations.find(a => a.id === id);
                    if (alloc) {
                      setPaymentAmount(String(alloc.agreedCost - alloc.amountPaid));
                    }
                  }}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-paila-blue/20 focus:border-paila-blue outline-none"
                >
                  <option value="">Select an allocation...</option>
                  {allocations
                    .filter(a => a.paymentStatus !== 'SETTLED')
                    .map(a => (
                      <option key={a.id} value={a.id}>
                        {a.vendorName} - {a.bookingCode} (Due: NPR {(a.agreedCost - a.amountPaid).toLocaleString()})
                      </option>
                    ))}
                </select>
              </div>

              {selectedAllocationId && (
                <div className="p-3 bg-slate-50 rounded-lg text-xs space-y-1">
                  {(() => {
                    const a = allocations.find(al => al.id === selectedAllocationId);
                    if (!a) return null;
                    return (
                      <>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Agreed Cost:</span>
                          <span className="font-medium text-slate-800">NPR {a.agreedCost.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Already Paid:</span>
                          <span className="font-medium text-green-600">NPR {a.amountPaid.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between border-t border-slate-200 pt-1">
                          <span className="font-semibold text-slate-700">Remaining Balance:</span>
                          <span className="font-bold text-red-600">NPR {(a.agreedCost - a.amountPaid).toLocaleString()}</span>
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Payment Amount (NPR) *</label>
                <input
                  type="number"
                  value={paymentAmount}
                  onChange={e => setPaymentAmount(e.target.value)}
                  placeholder="e.g. 50000"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-paila-blue/20 focus:border-paila-blue outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Payment Mode</label>
                <select
                  value={paymentMode}
                  onChange={e => setPaymentMode(e.target.value as PaymentMode)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-paila-blue/20 focus:border-paila-blue outline-none"
                >
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="ESEWA">eSewa</option>
                  <option value="KHALTI">Khalti</option>
                  <option value="CONNECT_IPS">ConnectIPS</option>
                  <option value="CASH">Cash</option>
                  <option value="CHEQUE">Cheque</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Reference / Cheque Number</label>
                <input
                  type="text"
                  value={referenceNumber}
                  onChange={e => setReferenceNumber(e.target.value)}
                  placeholder="e.g. TXN-839210 or CHQ-00123"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-paila-blue/20 focus:border-paila-blue outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowPaymentModal(false)}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleRecordVendorPayment}
                disabled={!selectedAllocationId || !paymentAmount || Number(paymentAmount) <= 0}
                className="px-4 py-2 bg-paila-blue text-white rounded-lg text-sm font-medium hover:bg-paila-blue-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
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
