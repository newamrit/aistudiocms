import { useState } from 'react';
import { ServiceType, Vendor } from '../types';
import { Search, Plus, Building2, Truck, UtensilsCrossed, Mountain, UserCheck, Filter, User } from 'lucide-react';
import { useBookings } from '../contexts/BookingContext';
import { useOperations } from '../contexts/OperationsContext';
import { useVendors } from '../contexts/VendorContext';
import { useAuth } from '../contexts/AuthContext';
import { SkeletonLoader } from '../components/common/SkeletonLoader';
import { EmptyState } from '../components/common/EmptyState';
import { sounds } from '../utils/sounds';

export default function Operations() {
  const { bookings, updateBooking } = useBookings();
  const { allocations, isLoading, error, addAllocation } = useOperations();
  const { vendors } = useVendors();
  const { usersList } = useAuth();

  const [search, setSearch] = useState('');
  const [serviceFilter, setServiceFilter] = useState<string>('ALL');
  const [showAllocateModal, setShowAllocateModal] = useState(false);
  const [showAssignLeaderModal, setShowAssignLeaderModal] = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState<number | null>(null);
  const [selectedLeaderId, setSelectedLeaderId] = useState<number | null>(null);
  const [selectedServiceType, setSelectedServiceType] = useState<string>('');
  const [selectedVendorId, setSelectedVendorId] = useState<number | null>(null);
  const [serviceDate, setServiceDate] = useState<string>('');
  const [agreedCost, setAgreedCost] = useState<number | ''>('');
  const [specialNotes, setSpecialNotes] = useState<string>('');

  const getVendorDetails = (vendorId: number) => vendors.find(v => v.id === vendorId);

  const confirmedBookings = bookings.filter(b => ['CONFIRMED', 'IN_PROGRESS'].includes(b.status));
  const tourLeaders = usersList.filter(u => u.role === 'TOUR_OPERATOR' && u.isActive);
  
  // Filter vendors based on selected service type
  const filteredVendors = selectedServiceType 
    ? vendors.filter(v => v.category === selectedServiceType && v.isActive)
    : vendors.filter(v => v.isActive);
  
  const filteredAllocations = allocations.filter(a => {
    const matchesSearch = a.vendorName.toLowerCase().includes(search.toLowerCase()) ||
      a.bookingCode.toLowerCase().includes(search.toLowerCase());
    const matchesService = serviceFilter === 'ALL' || a.serviceType === serviceFilter;
    return matchesSearch && matchesService;
  });

  const getServiceIcon = (type: string) => {
    switch (type) {
      case 'HOTEL': return <Building2 size={16} className="text-blue-600" />;
      case 'VEHICLE': return <Truck size={16} className="text-green-600" />;
      case 'RESTAURANT': return <UtensilsCrossed size={16} className="text-orange-600" />;
      case 'ACTIVITY': return <Mountain size={16} className="text-purple-600" />;
      default: return <UserCheck size={16} className="text-slate-600" />;
    }
  };

  const getServiceColor = (type: string) => {
    switch (type) {
      case 'HOTEL': return 'bg-blue-100 text-blue-700';
      case 'VEHICLE': return 'bg-green-100 text-green-700';
      case 'RESTAURANT': return 'bg-orange-100 text-orange-700';
      case 'ACTIVITY': return 'bg-purple-100 text-purple-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const handleAllocateVendor = async () => {
    if (!selectedBookingId || !selectedServiceType || !selectedVendorId || !agreedCost) {
      return;
    }

    const booking = bookings.find(b => b.id === selectedBookingId);
    const vendor = vendors.find(v => v.id === selectedVendorId);
    if (!booking || !vendor) return;

    try {
      await addAllocation({
        bookingId: selectedBookingId,
        bookingCode: booking.bookingCode,
        vendorId: selectedVendorId,
        vendorName: vendor.name,
        serviceType: selectedServiceType as ServiceType,
        serviceDate: serviceDate || booking.startDate,
        agreedCost: Number(agreedCost),
        specialNotes: specialNotes.trim(),
        fieldUpdatedByOperator: false
      });

      sounds.success();
      setShowAllocateModal(false);
      setSelectedServiceType('');
      setSelectedVendorId(null);
      setServiceDate('');
      setAgreedCost('');
      setSpecialNotes('');
    } catch (err) {
      console.error('Failed to allocate vendor:', err);
    }
  };

  const handleAssignTourLeader = () => {
    if (!selectedBookingId || !selectedLeaderId) return;
    const leader = tourLeaders.find(l => l.id === selectedLeaderId);
    if (!leader) return;

    updateBooking(selectedBookingId, {
      assignedTourOperatorId: leader.id,
      assignedTourOperatorName: leader.name,
    });
    sounds.success();
    setShowAssignLeaderModal(false);
    setSelectedBookingId(null);
    setSelectedLeaderId(null);
  };

  return (
    <div className="p-6 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Operations & Allocations</h1>
          <p className="text-slate-500 text-sm mt-1">Manage vendor assignments, costs, and tour operations</p>
        </div>
        <button
          onClick={() => setShowAllocateModal(true)}
          className="flex items-center gap-2 bg-paila-blue text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-paila-blue-light transition-colors"
        >
          <Plus size={16} />
          Allocate Vendor
        </button>
      </div>

      {/* Confirmed Tours Requiring Allocation */}
      <h2 className="text-base font-semibold text-slate-900 mb-3">Active Tours</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {confirmedBookings.map(booking => (
          <div key={booking.id} className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-xs text-paila-blue font-semibold">{booking.bookingCode}</span>
              <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full ${
                booking.status === 'CONFIRMED' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'
              }`}>
                {booking.status}
              </span>
            </div>
            <p className="text-sm font-semibold text-slate-900">{booking.clientName}</p>
            <p className="text-xs text-slate-500 mt-1">{booking.packageName || 'Custom'} • {Number.isFinite(Number(booking.paxCount)) ? booking.paxCount : 1} pax</p>
            <div className="mt-3 flex items-center justify-between text-xs">
              <span className="text-slate-500">{booking.startDate} → {booking.endDate}</span>
              <span className="text-paila-blue font-medium">
                {allocations.filter(a => a.bookingId === booking.id).length} vendors
              </span>
            </div>
            
            {/* Tour Leader Assignment */}
            <div className="mt-3 pt-3 border-t border-slate-100">
              {booking.assignedTourOperatorName ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-paila-blue rounded-full flex items-center justify-center">
                      <User size={12} className="text-white" />
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500">Tour Leader</p>
                      <p className="text-xs font-semibold text-slate-900">{booking.assignedTourOperatorName}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedBookingId(booking.id);
                      setSelectedLeaderId(booking.assignedTourOperatorId);
                      setShowAssignLeaderModal(true);
                    }}
                    className="text-[10px] text-paila-blue hover:text-paila-orange transition-colors font-medium cursor-pointer"
                  >
                    Change
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setSelectedBookingId(booking.id);
                    setShowAssignLeaderModal(true);
                  }}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-paila-orange/10 text-paila-orange rounded-lg text-xs font-semibold hover:bg-paila-orange/20 transition-colors cursor-pointer"
                >
                  <User size={14} />
                  Assign Tour Leader
                </button>
              )}
            </div>
          </div>
        ))}
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
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-slate-400" />
            <select
              value={serviceFilter}
              onChange={e => setServiceFilter(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-paila-blue/20 focus:border-paila-blue outline-none"
            >
              <option value="ALL">All Services</option>
              <option value="HOTEL">Hotels</option>
              <option value="VEHICLE">Vehicles</option>
              <option value="RESTAURANT">Restaurants</option>
              <option value="ACTIVITY">Activities</option>
            </select>
          </div>
        </div>
      </div>

      {/* Allocations Table */}
      {isLoading ? (
        <SkeletonLoader type="table" rows={4} />
      ) : filteredAllocations.length === 0 ? (
        <EmptyState
          title={allocations.length === 0 ? "No Operational Allocations in Database" : "No Allocations Found"}
          description={
            allocations.length === 0
              ? "No vendors have been allocated to active tours yet. Click 'Allocate Vendor' above to bind hotels, vehicles, or guides."
              : "No allocations match your search criteria. Try adjusting your search query or filter."
          }
          actionText={allocations.length === 0 ? "Allocate Vendor" : undefined}
          onAction={allocations.length === 0 ? () => setShowAllocateModal(true) : undefined}
        />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Booking</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Vendor</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Service</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Date</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Agreed Cost</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Paid</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Balance</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAllocations.map(alloc => (
                  <tr key={alloc.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-3.5">
                      <span className="font-mono text-xs text-paila-blue font-medium">{alloc.bookingCode}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        {getServiceIcon(alloc.serviceType)}
                        <span className="text-sm font-medium text-slate-900">{alloc.vendorName}</span>
                      </div>
                      {/* Vehicle details inline */}
                      {(() => {
                        const vendor = getVendorDetails(alloc.vendorId);
                        if (vendor?.category === 'VEHICLE') {
                          return (
                            <div className="flex items-center gap-2 mt-1 ml-6">
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
                      <p className="text-[10px] text-slate-400 mt-0.5 ml-6">{alloc.specialNotes}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`px-2 py-1 text-[10px] font-semibold rounded-full ${getServiceColor(alloc.serviceType)}`}>
                        {alloc.serviceType}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-slate-600">{alloc.serviceDate}</td>
                    <td className="px-5 py-3.5 text-sm font-medium text-slate-900">NPR {(Number.isFinite(Number(alloc.agreedCost)) ? Number(alloc.agreedCost) : 0).toLocaleString()}</td>
                    <td className="px-5 py-3.5 text-sm text-green-600 font-medium">NPR {(Number.isFinite(Number(alloc.amountPaid)) ? Number(alloc.amountPaid) : 0).toLocaleString()}</td>
                    <td className="px-5 py-3.5 text-sm text-red-600 font-medium">NPR {Math.max(0, (Number(alloc.agreedCost) || 0) - (Number(alloc.amountPaid) || 0)).toLocaleString()}</td>
                    <td className="px-5 py-3.5">
                      <span className={`px-2.5 py-1 text-[10px] font-semibold rounded-full ${
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
        </div>
      )}

      {/* Allocation Modal */}
      {showAllocateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 animate-fade-in">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Allocate Vendor to Tour</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Select Tour Booking *</label>
                <select
                  value={selectedBookingId || ''}
                  onChange={e => setSelectedBookingId(e.target.value ? Number(e.target.value) : null)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-paila-blue/20 focus:border-paila-blue outline-none"
                >
                  <option value="">Choose a tour...</option>
                  {confirmedBookings.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.bookingCode} - {b.clientName} ({b.packageName || 'Custom'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Service Type *</label>
                <select
                  value={selectedServiceType}
                  onChange={e => {
                    setSelectedServiceType(e.target.value);
                    setSelectedVendorId(null);
                  }}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-paila-blue/20 focus:border-paila-blue outline-none"
                >
                  <option value="">Select service type...</option>
                  <option value="HOTEL">Hotel / Accommodation</option>
                  <option value="VEHICLE">Transportation / Vehicle</option>
                  <option value="RESTAURANT">Restaurant / Meals</option>
                  <option value="ACTIVITY">Activity / Permit</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Select Vendor *</label>
                <select
                  value={selectedVendorId || ''}
                  onChange={e => setSelectedVendorId(e.target.value ? Number(e.target.value) : null)}
                  disabled={!selectedServiceType}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-paila-blue/20 focus:border-paila-blue outline-none disabled:bg-slate-50 disabled:text-slate-400"
                >
                  <option value="">Choose a vendor...</option>
                  {filteredVendors.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.name} - {v.location}
                      {v.category === 'VEHICLE' && v.vehicleType ? ` (${v.vehicleType})` : ''}
                    </option>
                  ))}
                </select>
                {!selectedServiceType && (
                  <p className="text-xs text-amber-600 mt-1">Please select a service type first</p>
                )}
                {selectedServiceType && filteredVendors.length === 0 && (
                  <p className="text-xs text-red-600 mt-1">No vendors available for this service type</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Service Date *</label>
                  <input
                    type="date"
                    value={serviceDate}
                    onChange={e => setServiceDate(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-paila-blue/20 focus:border-paila-blue outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Agreed Cost (NPR) *</label>
                  <input
                    type="number"
                    min="0"
                    value={agreedCost}
                    onChange={e => setAgreedCost(e.target.value ? Number(e.target.value) : '')}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-paila-blue/20 focus:border-paila-blue outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Special Notes</label>
                <textarea
                  rows={2}
                  value={specialNotes}
                  onChange={e => setSpecialNotes(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-paila-blue/20 focus:border-paila-blue outline-none resize-none"
                  placeholder="Room count, vehicle type, dietary requirements..."
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowAllocateModal(false);
                  setSelectedServiceType('');
                  setSelectedVendorId(null);
                }}
                className="px-4 py-2.5 border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleAllocateVendor}
                disabled={!selectedBookingId || !selectedServiceType || !selectedVendorId || !agreedCost}
                className="px-4 py-2.5 bg-paila-blue text-white rounded-lg text-sm font-medium hover:bg-paila-blue-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                Allocate Vendor
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Tour Leader Modal */}
      {showAssignLeaderModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 animate-fade-in">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Assign Tour Leader</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Select Tour Leader</label>
                <select
                  value={selectedLeaderId || ''}
                  onChange={e => setSelectedLeaderId(e.target.value ? Number(e.target.value) : null)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-paila-blue/20 focus:border-paila-blue outline-none"
                >
                  <option value="">Choose a tour leader...</option>
                  {tourLeaders.map(leader => (
                    <option key={leader.id} value={leader.id}>
                      {leader.name} - {leader.phone}
                    </option>
                  ))}
                </select>
              </div>

              {selectedLeaderId && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-xs text-blue-800">
                    <span className="font-semibold">Selected:</span>{' '}
                    {tourLeaders.find(l => l.id === selectedLeaderId)?.name}
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    {tourLeaders.find(l => l.id === selectedLeaderId)?.email}
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowAssignLeaderModal(false);
                  setSelectedBookingId(null);
                  setSelectedLeaderId(null);
                }}
                className="px-4 py-2.5 border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleAssignTourLeader}
                disabled={!selectedLeaderId}
                className="px-4 py-2.5 bg-paila-orange text-white rounded-lg text-sm font-medium hover:bg-paila-orange-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                Assign Leader
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
