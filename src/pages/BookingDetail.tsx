import { useState } from 'react';
import { operationAllocations, vendors, packages } from '../data/mockData';
import { BookingStatus, ClientType, ItineraryDay } from '../types';
import {
  ArrowLeft, MapPin, Calendar, Users, Phone, Mail,
  Printer, FileText, CheckCircle, Clock, AlertTriangle,
  ChevronRight, Mountain, Lock, Edit, Trash2, Plus, X
} from 'lucide-react';
import DocumentViewer from '../components/DocumentViewer';
import { useBookings } from '../contexts/BookingContext';
import { sounds } from '../utils/sounds';

interface BookingDetailProps {
  bookingId: number;
  onNavigate: (page: string) => void;
}

export default function BookingDetail({ bookingId, onNavigate }: BookingDetailProps) {
  const { getBookingById, updateBooking, deleteBooking } = useBookings();
  const booking = getBookingById(bookingId);
  const allocations = operationAllocations.filter(a => a.bookingId === bookingId);
  const [activeTab, setActiveTab] = useState<'overview' | 'itinerary' | 'operations' | 'documents'>('overview');
  const [viewingDocument, setViewingDocument] = useState<'proposal' | 'voucher' | 'invoice' | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
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
    alert('Booking updated successfully!');
  };

  const handleDelete = () => {
    deleteBooking(bookingId);
    sounds.delete();
    onNavigate('bookings');
  };

  const totalVendorCost = allocations.reduce((s, a) => s + a.agreedCost, 0);
  const totalVendorPaid = allocations.reduce((s, a) => s + a.amountPaid, 0);

  return (
    <div className="p-6 animate-fade-in">
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
          <button className="flex items-center gap-2 px-4 py-2 bg-paila-blue text-white rounded-lg text-sm font-medium hover:bg-paila-blue-light transition-colors">
            <FileText size={16} />
            Generate PDF
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-slate-100 rounded-lg p-1 no-print">
        {(['overview', 'itinerary', 'operations', 'documents'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all ${
              activeTab === tab ? 'bg-white text-paila-blue shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
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
                  <p className="text-lg font-bold text-paila-blue">NPR {booking.totalAgreedAmount.toLocaleString()}</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <p className="text-xs text-green-600 mb-1">Advance Received</p>
                  <p className="text-lg font-bold text-green-700">NPR {booking.advanceReceived.toLocaleString()}</p>
                </div>
                <div className="bg-red-50 rounded-lg p-4 text-center">
                  <p className="text-xs text-red-600 mb-1">Balance Due</p>
                  <p className="text-lg font-bold text-red-600">NPR {(booking.totalAgreedAmount - booking.advanceReceived).toLocaleString()}</p>
                </div>
              </div>
            </div>

            {/* Vendor Allocations */}
            {allocations.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <h3 className="font-semibold text-slate-900 mb-4">Vendor Allocations</h3>
                <div className="space-y-3">
                  {allocations.map(alloc => (
                    <div key={alloc.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-slate-900">{alloc.vendorName}</p>
                        <p className="text-xs text-slate-500">{alloc.serviceType} • {alloc.serviceDate}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{alloc.specialNotes}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-slate-900">NPR {alloc.agreedCost.toLocaleString()}</p>
                        <p className={`text-xs font-medium ${alloc.paymentStatus === 'SETTLED' ? 'text-green-600' : alloc.paymentStatus === 'PARTIALLY_PAID' ? 'text-amber-600' : 'text-red-500'}`}>
                          {alloc.paymentStatus.replace('_', ' ')} (Paid: {alloc.amountPaid.toLocaleString()})
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t border-slate-200 flex justify-between text-sm">
                  <span className="text-slate-500">Total Vendor Cost: <strong>NPR {totalVendorCost.toLocaleString()}</strong></span>
                  <span className="text-slate-500">Paid: <strong className="text-green-600">NPR {totalVendorPaid.toLocaleString()}</strong></span>
                  <span className="text-slate-500">Due: <strong className="text-red-600">NPR {(totalVendorCost - totalVendorPaid).toLocaleString()}</strong></span>
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
          <h3 className="font-semibold text-slate-900 mb-6">Day-by-Day Itinerary</h3>
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
                      <td className="px-4 py-3 text-sm font-medium">NPR {alloc.agreedCost.toLocaleString()}</td>
                      <td className="px-4 py-3 text-sm text-green-600 font-medium">NPR {alloc.amountPaid.toLocaleString()}</td>
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Tour Proposal & Quote */}
                <button
                  onClick={() => {
                    sounds.modalOpen();
                    setViewingDocument('proposal');
                  }}
                  className="p-6 border-2 border-dashed border-slate-200 rounded-xl hover:border-paila-blue hover:bg-blue-50/50 transition-all text-center group"
                >
                  <FileText size={32} className="mx-auto text-slate-400 group-hover:text-paila-blue transition-colors mb-3" />
                  <p className="font-medium text-sm text-slate-900">Tour Proposal & Quote</p>
                  <p className="text-xs text-slate-500 mt-1">Itinerary, pricing & terms</p>
                  <span className="inline-block mt-3 text-[10px] font-semibold text-paila-blue bg-blue-100 px-2 py-0.5 rounded-full">
                    Preview →
                  </span>
                </button>

                {/* Booking Voucher */}
                <button
                  onClick={() => {
                    sounds.modalOpen();
                    setViewingDocument('voucher');
                  }}
                  className="p-6 border-2 border-dashed border-slate-200 rounded-xl hover:border-paila-orange hover:bg-orange-50/50 transition-all text-center group"
                >
                  <FileText size={32} className="mx-auto text-slate-400 group-hover:text-paila-orange transition-colors mb-3" />
                  <p className="font-medium text-sm text-slate-900">Booking Voucher</p>
                  <p className="text-xs text-slate-500 mt-1">Guest confirmation document</p>
                  <span className="inline-block mt-3 text-[10px] font-semibold text-paila-orange bg-orange-100 px-2 py-0.5 rounded-full">
                    Preview →
                  </span>
                </button>

                {/* Tax / Proforma Invoice */}
                <button
                  onClick={() => {
                    sounds.modalOpen();
                    setViewingDocument('invoice');
                  }}
                  className="p-6 border-2 border-dashed border-slate-200 rounded-xl hover:border-green-500 hover:bg-green-50/50 transition-all text-center group"
                >
                  <FileText size={32} className="mx-auto text-slate-400 group-hover:text-green-600 transition-colors mb-3" />
                  <p className="font-medium text-sm text-slate-900">Tax / Proforma Invoice</p>
                  <p className="text-xs text-slate-500 mt-1">Payment schedule & receipt</p>
                  <span className="inline-block mt-3 text-[10px] font-semibold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                    Preview →
                  </span>
                </button>
              </div>

              {/* Quick Print All */}
              <div className="mt-6 pt-6 border-t border-slate-200">
                <p className="text-xs text-slate-500 mb-3">Quick Actions:</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setViewingDocument('proposal')}
                    className="flex items-center gap-2 px-4 py-2 bg-paila-blue text-white rounded-lg text-xs font-medium hover:bg-paila-blue-light transition-colors"
                  >
                    <Printer size={14} />
                    Print Proposal
                  </button>
                  <button
                    onClick={() => setViewingDocument('voucher')}
                    className="flex items-center gap-2 px-4 py-2 bg-paila-orange text-white rounded-lg text-xs font-medium hover:bg-paila-orange-light transition-colors"
                  >
                    <Printer size={14} />
                    Print Voucher
                  </button>
                  <button
                    onClick={() => setViewingDocument('invoice')}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 transition-colors"
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
                      value={editData.paxCount}
                      onChange={e => setEditData({ ...editData, paxCount: Number(e.target.value) })}
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
                      value={editData.totalAgreedAmount}
                      onChange={e => setEditData({ ...editData, totalAgreedAmount: Number(e.target.value) })}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-paila-blue/20 focus:border-paila-blue outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Advance Received (NPR)</label>
                    <input
                      type="number"
                      value={editData.advanceReceived}
                      onChange={e => setEditData({ ...editData, advanceReceived: Number(e.target.value) })}
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
