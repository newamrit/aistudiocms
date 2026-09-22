import { useState } from 'react';
import { BookingStatus } from '../types';
import { Search, Filter, Plus, Eye, Calendar, Users, MapPin, Trash2 } from 'lucide-react';
import { useBookings } from '../contexts/BookingContext';
import { sounds } from '../utils/sounds';

interface BookingsProps {
  onNavigate: (page: string, id?: number) => void;
}

export default function Bookings({ onNavigate }: BookingsProps) {
  const { bookings: bookingsList, deleteBooking } = useBookings();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<BookingStatus | 'ALL'>('ALL');
  const [clientTypeFilter, setClientTypeFilter] = useState('ALL');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null);

  const filtered = bookingsList.filter(b => {
    const matchesSearch = b.clientName.toLowerCase().includes(search.toLowerCase()) ||
      b.bookingCode.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || b.status === statusFilter;
    const matchesClient = clientTypeFilter === 'ALL' || b.clientType === clientTypeFilter;
    return matchesSearch && matchesStatus && matchesClient;
  });

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

  const getClientTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      INSTITUTIONAL: '🏫 Institutional',
      CORPORATE: '🏢 Corporate',
      FOREIGN_TREK: '🏔️ Foreign Trek',
      INDIVIDUAL: '👤 Individual',
    };
    return labels[type] || type;
  };

  const handleDelete = (id: number) => {
    deleteBooking(id);
    sounds.delete();
    setShowDeleteConfirm(null);
  };

  return (
    <div className="p-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Bookings</h1>
          <p className="text-slate-500 text-sm mt-1">Manage all tour bookings and proposals</p>
        </div>
        <button
          onClick={() => onNavigate('new-booking')}
          className="flex items-center gap-2 bg-paila-blue text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-paila-blue-light transition-colors"
        >
          <Plus size={16} />
          New Booking
        </button>
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
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-slate-400" />
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as BookingStatus | 'ALL')}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-paila-blue/20 focus:border-paila-blue outline-none"
            >
              <option value="ALL">All Status</option>
              <option value="PROPOSED">Proposed</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
          <select
            value={clientTypeFilter}
            onChange={e => setClientTypeFilter(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-paila-blue/20 focus:border-paila-blue outline-none"
          >
            <option value="ALL">All Client Types</option>
            <option value="INSTITUTIONAL">Institutional</option>
            <option value="CORPORATE">Corporate</option>
            <option value="FOREIGN_TREK">Foreign Trek</option>
            <option value="INDIVIDUAL">Individual</option>
          </select>
        </div>
      </div>

      {/* Bookings Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Booking</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Client</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Package</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Dates</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Pax</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Amount</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Status</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(booking => (
                <tr key={booking.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-5 py-3.5">
                    <span className="font-mono text-xs text-paila-blue font-medium">{booking.bookingCode}</span>
                    <p className="text-[10px] text-slate-400 mt-0.5">{getClientTypeLabel(booking.clientType)}</p>
                  </td>
                  <td className="px-5 py-3.5">
                    <p className="text-sm font-medium text-slate-900">{booking.clientName}</p>
                    <p className="text-xs text-slate-500">{booking.clientPhone}</p>
                  </td>
                  <td className="px-5 py-3.5">
                    <p className="text-sm text-slate-700">{booking.packageName || 'Custom'}</p>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1 text-xs text-slate-600">
                      <Calendar size={12} />
                      <span>{booking.startDate}</span>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-0.5">
                      <span>to {booking.endDate}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1 text-sm text-slate-700">
                      <Users size={14} className="text-slate-400" />
                      {booking.paxCount}
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <p className="text-sm font-medium text-slate-900">NPR {booking.totalAgreedAmount.toLocaleString()}</p>
                    <p className="text-[10px] text-green-600">Adv: NPR {booking.advanceReceived.toLocaleString()}</p>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex px-2.5 py-1 text-[10px] font-semibold rounded-full border ${getStatusColor(booking.status)}`}>
                      {booking.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onNavigate('booking-detail', booking.id)}
                        className="flex items-center gap-1 text-xs text-paila-blue hover:text-paila-orange transition-colors font-medium"
                      >
                        <Eye size={14} />
                        View
                      </button>
                      <button
                        onClick={() => setShowDeleteConfirm(booking.id)}
                        className="flex items-center gap-1 text-xs text-red-600 hover:text-red-800 transition-colors font-medium"
                      >
                        <Trash2 size={14} />
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="text-center py-12">
            <MapPin size={40} className="mx-auto text-slate-300 mb-3" />
            <p className="text-slate-500 text-sm">No bookings found matching your filters.</p>
          </div>
        )}
      </div>

      {/* Summary Footer */}
      <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
        <span>Showing {filtered.length} of {bookingsList.length} bookings</span>
        <span>Total Revenue: NPR {filtered.reduce((s, b) => s + b.totalAgreedAmount, 0).toLocaleString()}</span>
      </div>

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
              Are you sure you want to delete this booking? All associated data will be permanently removed.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(showDeleteConfirm)}
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
