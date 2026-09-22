import { useState } from 'react';
import { operationAllocations, vendors, users } from '../data/mockData';
import { ServiceType, Vendor } from '../types';
import { Search, Plus, Building2, Truck, UtensilsCrossed, Mountain, UserCheck, Filter, User } from 'lucide-react';
import { useBookings } from '../contexts/BookingContext';
import { sounds } from '../utils/sounds';

const getVendorDetails = (vendorId: number) => vendors.find(v => v.id === vendorId);

export default function Operations() {
  const { bookings, updateBooking } = useBookings();
  const [search, setSearch] = useState('');
  const [serviceFilter, setServiceFilter] = useState<string>('ALL');
  const [showAllocateModal, setShowAllocateModal] = useState(false);
  const [showAssignLeaderModal, setShowAssignLeaderModal] = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState<number | null>(null);
  const [selectedLeaderId, setSelectedLeaderId] = useState<number | null>(null);
  const [selectedServiceType, setSelectedServiceType] = useState<string>('');
  const [selectedVendorId, setSelectedVendorId] = useState<number | null>(null);

  const confirmedBookings = bookings.filter(b => ['CONFIRMED', 'IN_PROGRESS'].includes(b.status));
  const tourLeaders = users.filter(u => u.role === 'TOUR_OPERATOR' && u.isActive);
  
  // Filter vendors based on selected service type
  const filteredVendors = selectedServiceType 
    ? vendors.filter(v => v.category === selectedServiceType)
    : vendors;
  
  const filteredAllocations = operationAllocations.filter(a => {
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

  const handleAssignTourLeader = () => {
    if (selectedBookingId && selectedLeaderId) {
      const leader = users.find(u => u.id === selectedLeaderId);
      if (leader) {
        updateBooking(selectedBookingId, {
          assignedTourOperatorId: leader.id,
          assignedTourOperatorName: leader.name
        });
        sounds.success();
        alert(`Tour leader ${leader.name} assigned successfully!`);
        setShowAssignLeaderModal(false);
        setSelectedBookingId(null);
        setSelectedLeaderId(null);
      }
    }
  };

  return (
    <div className="p-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Operations Management</h1>
          <p className="text-slate-500 text-sm mt-1">Vendor allocation and service tracking for active tours</p>
        </div>
        <button
          onClick={() => setShowAllocateModal(true)}
          className="flex items-center gap-2 bg-paila-orange text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-paila-orange-light transition-colors"
        >
          <Plus size={16} />
          Allocate Vendor
        </button>
      </div>

      {/* Active Tours Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {confirmedBookings.map(booking => (
          <div key={booking.id} className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-mono text-paila-blue font-medium">{booking.bookingCode}</span>
              <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full ${
                booking.status === 'IN_PROGRESS' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
              }`}>
                {booking.status.replace('_', ' ')}
              </span>
            </div>
            <p className="text-sm font-semibold text-slate-900">{booking.clientName}</p>
            <p className="text-xs text-slate-500 mt-1">{booking.packageName || 'Custom'} • {booking.paxCount} pax</p>
            <div className="mt-3 flex items-center justify-between text-xs">
              <span className="text-slate-500">{booking.startDate} → {booking.endDate}</span>
              <span className="text-paila-blue font-medium">
                {operationAllocations.filter(a => a.bookingId === booking.id).length} vendors
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
                    className="text-[10px] text-paila-blue hover:text-paila-orange transition-colors font-medium"
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
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-paila-orange/10 text-paila-orange rounded-lg text-xs font-semibold hover:bg-paila-orange/20 transition-colors"
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
                  <td className="px-5 py-3.5 text-sm font-medium text-slate-900">NPR {alloc.agreedCost.toLocaleString()}</td>
                  <td className="px-5 py-3.5 text-sm text-green-600 font-medium">NPR {alloc.amountPaid.toLocaleString()}</td>
                  <td className="px-5 py-3.5 text-sm text-red-600 font-medium">NPR {(alloc.agreedCost - alloc.amountPaid).toLocaleString()}</td>
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

      {/* Allocation Modal */}
      {showAllocateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 animate-fade-in">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Allocate Vendor to Tour</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Select Booking</label>
                <select
                  value={selectedBookingId || ''}
                  onChange={e => setSelectedBookingId(Number(e.target.value))}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-paila-blue/20 focus:border-paila-blue outline-none"
                >
                  <option value="">Choose a booking...</option>
                  {confirmedBookings.map(b => (
                    <option key={b.id} value={b.id}>{b.bookingCode} - {b.clientName}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Service Type</label>
                <select 
                  value={selectedServiceType}
                  onChange={e => {
                    setSelectedServiceType(e.target.value);
                    setSelectedVendorId(null); // Reset vendor when service type changes
                  }}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-paila-blue/20 focus:border-paila-blue outline-none"
                >
                  <option value="">Select service type...</option>
                  <option value="HOTEL">Hotel / Resort</option>
                  <option value="VEHICLE">Vehicle / Transport</option>
                  <option value="RESTAURANT">Restaurant / Meal Stop</option>
                  <option value="ACTIVITY">Activity / Permit</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Select Vendor
                  {selectedServiceType && (
                    <span className="ml-2 text-xs text-slate-500">
                      ({filteredVendors.length} {selectedServiceType.toLowerCase()} vendor{filteredVendors.length !== 1 ? 's' : ''} available)
                    </span>
                  )}
                </label>
                <select 
                  value={selectedVendorId || ''}
                  onChange={e => setSelectedVendorId(e.target.value ? Number(e.target.value) : null)}
                  disabled={!selectedServiceType}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-paila-blue/20 focus:border-paila-blue outline-none disabled:bg-slate-50 disabled:cursor-not-allowed"
                >
                  <option value="">
                    {selectedServiceType ? 'Choose a vendor...' : 'Select service type first...'}
                  </option>
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
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Service Date</label>
                  <input type="date" className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-paila-blue/20 focus:border-paila-blue outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Agreed Cost (NPR)</label>
                  <input type="number" className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-paila-blue/20 focus:border-paila-blue outline-none" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Special Notes</label>
                <textarea rows={2} className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-paila-blue/20 focus:border-paila-blue outline-none resize-none" placeholder="Room count, vehicle type, dietary requirements..." />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowAllocateModal(false);
                  setSelectedServiceType('');
                  setSelectedVendorId(null);
                }}
                className="px-4 py-2.5 border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => { 
                  if (!selectedBookingId || !selectedServiceType || !selectedVendorId) {
                    alert('Please fill all required fields');
                    return;
                  }
                  sounds.success();
                  alert('Vendor allocated successfully! (Demo)'); 
                  setShowAllocateModal(false);
                  setSelectedServiceType('');
                  setSelectedVendorId(null);
                }}
                disabled={!selectedBookingId || !selectedServiceType || !selectedVendorId}
                className="px-4 py-2.5 bg-paila-blue text-white rounded-lg text-sm font-medium hover:bg-paila-blue-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                className="px-4 py-2.5 border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAssignTourLeader}
                disabled={!selectedLeaderId}
                className="px-4 py-2.5 bg-paila-orange text-white rounded-lg text-sm font-medium hover:bg-paila-orange-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
