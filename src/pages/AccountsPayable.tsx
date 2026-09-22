import { useState } from 'react';
import { operationAllocations as initialAllocations, vendorPayments, bookings } from '../data/mockData';
import { OperationAllocation, PaymentMode } from '../types';
import { Search, Wallet, TrendingDown, CheckCircle, Clock, AlertTriangle, Plus, X } from 'lucide-react';
import { useActivities } from '../contexts/ActivityContext';
import { sounds } from '../utils/sounds';

export default function AccountsPayable() {
  const { logActivity } = useActivities();
  const [allocations, setAllocations] = useState<OperationAllocation[]>(initialAllocations);
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

  const handleRecordVendorPayment = () => {
    if (!selectedAllocationId || !paymentAmount) {
      alert('Please select an allocation and enter payment amount');
      return;
    }

    const allocation = allocations.find(a => a.id === selectedAllocationId);
    if (!allocation) return;

    const amountNum = Number(paymentAmount);
    const newPaid = allocation.amountPaid + amountNum;
    const newStatus = newPaid >= allocation.agreedCost ? 'SETTLED' : 'PARTIALLY_PAID';

    setAllocations(prev =>
      prev.map(a =>
        a.id === selectedAllocationId
          ? { ...a, amountPaid: newPaid, paymentStatus: newStatus }
          : a
      )
    );

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
    alert(`Payment of NPR ${amountNum.toLocaleString()} recorded for ${allocation.vendorName}!`);
    setShowPaymentModal(false);
    setSelectedAllocationId(null);
    setPaymentAmount('');
    setReferenceNumber('');
  };

  return (
    <div className="p-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Accounts Payable</h1>
          <p className="text-slate-500 text-sm mt-1">Vendor payment tracking and financial ledger</p>
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
            <span className="text-xs text-slate-500 font-medium">Total Agreed</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">NPR {totalAgreed.toLocaleString()}</p>
          <p className="text-xs text-slate-400 mt-1">{allocations.length} allocations</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
              <CheckCircle size={20} className="text-green-600" />
            </div>
            <span className="text-xs text-slate-500 font-medium">Total Paid</span>
          </div>
          <p className="text-2xl font-bold text-green-700">NPR {totalPaid.toLocaleString()}</p>
          <p className="text-xs text-slate-400 mt-1">{vendorPayments.length} transactions</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center">
              <TrendingDown size={20} className="text-red-600" />
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
            <span className="text-xs text-slate-500 font-medium">Settlement Rate</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{Math.round((totalPaid / totalAgreed) * 100)}%</p>
          <p className="text-xs text-slate-400 mt-1">of total agreed cost</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
        <div className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-[200px] relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by vendor or booking code..."
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

      {/* Ledger Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Vendor</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Booking Number</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Package</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Agreed Cost</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Paid</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Balance</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Status</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(alloc => {
                const balance = alloc.agreedCost - alloc.amountPaid;
                const payments = getPaymentHistory(alloc.id);
                const booking = bookings.find(b => b.bookingCode === alloc.bookingCode);
                const packageName = booking?.packageName || 'Custom Package';
                return (
                  <tr key={alloc.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-5 py-3.5">
                      <p className="text-sm font-medium text-slate-900">{alloc.vendorName}</p>
                      <p className="text-[10px] text-slate-400">{alloc.serviceDate}</p>
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
                        className="text-xs text-paila-blue font-medium hover:text-paila-orange transition-colors opacity-0 group-hover:opacity-100"
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

      {/* Recent Payment History */}
      <div className="mt-6 bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="font-semibold text-slate-900 mb-4">Recent Payment Transactions</h3>
        <div className="space-y-3">
          {vendorPayments.slice(0, 5).map(payment => (
            <div key={payment.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle size={14} className="text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900">NPR {payment.amount.toLocaleString()}</p>
                  <p className="text-[10px] text-slate-500">
                    {payment.paymentMode} • Ref: {payment.referenceNumber} • by {payment.recordedByName}
                  </p>
                </div>
              </div>
              <span className="text-xs text-slate-400">{new Date(payment.paidAt).toLocaleDateString()}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">Record Vendor Payment</h3>
              <button onClick={() => setShowPaymentModal(false)} className="p-1 hover:bg-slate-100 rounded-lg">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Allocation / Service</label>
                <select
                  value={selectedAllocationId || ''}
                  onChange={e => setSelectedAllocationId(Number(e.target.value))}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-paila-blue/20 focus:border-paila-blue outline-none"
                >
                  <option value="">Select allocation...</option>
                  {allocations.filter(a => a.paymentStatus !== 'SETTLED').map(a => (
                    <option key={a.id} value={a.id}>{a.vendorName} - {a.bookingCode} (Due: NPR {(a.agreedCost - a.amountPaid).toLocaleString()})</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Amount (NPR) *</label>
                  <input
                    type="number"
                    value={paymentAmount}
                    onChange={e => setPaymentAmount(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-paila-blue/20 focus:border-paila-blue outline-none"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Payment Mode *</label>
                  <select
                    value={paymentMode}
                    onChange={e => setPaymentMode(e.target.value as PaymentMode)}
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
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-paila-blue/20 focus:border-paila-blue outline-none"
                  placeholder="Transaction / receipt number (e.g. NBL-98213)"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Payment Date</label>
                <input
                  type="date"
                  defaultValue={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-paila-blue/20 focus:border-paila-blue outline-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowPaymentModal(false)} className="px-4 py-2.5 border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors">
                Cancel
              </button>
              <button onClick={handleRecordVendorPayment} className="px-4 py-2.5 bg-paila-blue text-white rounded-lg text-sm font-medium hover:bg-paila-blue-light transition-colors">
                Record Payment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
