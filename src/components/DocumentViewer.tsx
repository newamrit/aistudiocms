import { Booking, Package, ItineraryDay } from '../types';
import { packages } from '../data/mockData';
import { X, Printer, FileText, Download } from 'lucide-react';
import { sounds } from '../utils/sounds';

type DocumentType = 'proposal' | 'voucher' | 'invoice';

interface DocumentViewerProps {
  booking: Booking;
  documentType: DocumentType;
  onClose: () => void;
}

export default function DocumentViewer({ booking, documentType, onClose }: DocumentViewerProps) {
  const pkg = booking.packageId ? packages.find(p => p.id === booking.packageId) ?? undefined : undefined;
  const balanceDue = booking.totalAgreedAmount - booking.advanceReceived;

  const handlePrint = () => window.print();

  const documentTitles: Record<DocumentType, string> = {
    proposal: 'Tour Proposal & Quotation',
    voucher: 'Booking Voucher',
    invoice: 'Tax / Proforma Invoice',
  };

  return (
    <div className="fixed inset-0 bg-slate-900/70 z-50 flex items-start justify-center overflow-y-auto p-4 no-print-bg">
      <div className="bg-white w-full max-w-4xl my-4 rounded-xl shadow-2xl overflow-hidden animate-fade-in">
        {/* Controls Bar - Hidden on Print */}
        <div className="bg-slate-800 text-white px-5 py-3 flex items-center justify-between no-print sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <FileText size={18} />
            <span className="text-sm font-semibold">{documentTitles[documentType]}</span>
            <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-mono">{booking.bookingCode}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-paila-orange text-white rounded-lg text-xs font-semibold hover:bg-paila-orange-light transition-colors"
            >
              <Printer size={14} />
              Print
            </button>
            <button
              onClick={() => {
                sounds.modalClose();
                onClose();
              }}
              className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Document Content */}
        <div className="print-container bg-white">
          {documentType === 'proposal' && <ProposalDocument booking={booking} pkg={pkg} />}
          {documentType === 'voucher' && <VoucherDocument booking={booking} pkg={pkg} />}
          {documentType === 'invoice' && <InvoiceDocument booking={booking} pkg={pkg} balanceDue={balanceDue} />}
        </div>
      </div>
    </div>
  );
}

/* =================== LETTERHEAD =================== */
function LetterHead() {
  return (
    <div className="border-b-2 border-paila-blue pb-4 mb-6">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 bg-paila-blue rounded-xl flex items-center justify-center text-white font-bold text-lg">
            PN
          </div>
          <div>
            <h1 className="text-xl font-bold text-paila-blue leading-tight">Paila Nepal Holidays</h1>
            <p className="text-[10px] text-slate-500 mt-0.5">Trekking • Tours • Institutional Travel</p>
          </div>
        </div>
        <div className="text-right text-[10px] text-slate-600 leading-relaxed">
          <p className="font-semibold text-slate-800">Head Office</p>
          <p>Thamel, Kathmandu, Nepal</p>
          <p>Phone: +977-1-4123456</p>
          <p>Email: info@pailanepal.com</p>
          <p>PAN: 601234567 | VAT: 301234567</p>
        </div>
      </div>
    </div>
  );
}

/* =================== PROPOSAL & QUOTE =================== */
function ProposalDocument({ booking, pkg }: { booking: Booking; pkg: Package | undefined }) {
  const perPaxPrice = booking.paxCount > 0 ? Math.round(booking.totalAgreedAmount / booking.paxCount) : 0;

  return (
    <div className="p-10 text-slate-800" style={{ fontFamily: 'Inter, sans-serif' }}>
      <LetterHead />

      {/* Title */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-paila-blue">Tour Proposal & Quotation</h2>
        <p className="text-xs text-slate-500 mt-1">Reference: {booking.bookingCode} | Date: {new Date().toLocaleDateString('en-GB')}</p>
      </div>

      {/* Client Info */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-6 avoid-break">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Prepared For</h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-slate-500 text-xs">Client</p>
            <p className="font-semibold">{booking.clientName}</p>
          </div>
          <div>
            <p className="text-slate-500 text-xs">Category</p>
            <p className="font-semibold">{booking.clientType.replace('_', ' ')}</p>
          </div>
          <div>
            <p className="text-slate-500 text-xs">Contact</p>
            <p className="font-semibold">{booking.clientPhone}</p>
          </div>
          <div>
            <p className="text-slate-500 text-xs">Group Size</p>
            <p className="font-semibold">{booking.paxCount} persons</p>
          </div>
        </div>
      </div>

      {/* Trip Overview */}
      <div className="mb-6 avoid-break">
        <h3 className="text-sm font-bold text-paila-blue border-b border-slate-200 pb-1 mb-3">Trip Overview</h3>
        <div className="grid grid-cols-4 gap-3 text-sm">
          <div className="bg-blue-50 rounded-lg p-3 text-center">
            <p className="text-[10px] text-blue-600 font-semibold">PACKAGE</p>
            <p className="font-bold text-slate-900 mt-1">{pkg?.title || 'Custom Tour'}</p>
          </div>
          <div className="bg-blue-50 rounded-lg p-3 text-center">
            <p className="text-[10px] text-blue-600 font-semibold">DURATION</p>
            <p className="font-bold text-slate-900 mt-1">{pkg?.durationDays || booking.itineraryDays.length} Days</p>
          </div>
          <div className="bg-blue-50 rounded-lg p-3 text-center">
            <p className="text-[10px] text-blue-600 font-semibold">START DATE</p>
            <p className="font-bold text-slate-900 mt-1">{booking.startDate || 'TBD'}</p>
          </div>
          <div className="bg-blue-50 rounded-lg p-3 text-center">
            <p className="text-[10px] text-blue-600 font-semibold">END DATE</p>
            <p className="font-bold text-slate-900 mt-1">{booking.endDate || 'TBD'}</p>
          </div>
        </div>
      </div>

      {/* Itinerary */}
      {booking.itineraryDays.length > 0 && (
        <div className="mb-6 avoid-break">
          <h3 className="text-sm font-bold text-paila-blue border-b border-slate-200 pb-1 mb-3">Day-by-Day Itinerary</h3>
          <div className="space-y-2">
            {booking.itineraryDays.map(day => (
              <div key={day.id} className="flex gap-3 p-3 border border-slate-100 rounded-lg">
                <div className="w-7 h-7 bg-paila-blue text-white rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                  {day.dayNumber}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-900">{day.title}</p>
                  <p className="text-xs text-slate-600 mt-0.5">{day.description}</p>
                  <div className="flex gap-3 mt-1 text-[10px] text-slate-500">
                    {day.overnightLocation && <span>🏨 {day.overnightLocation}</span>}
                    <span>🍽️ {day.mealsIncluded}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pricing */}
      <div className="mb-6 avoid-break">
        <h3 className="text-sm font-bold text-paila-blue border-b border-slate-200 pb-1 mb-3">Pricing</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-100">
              <th className="text-left px-3 py-2 font-semibold">Description</th>
              <th className="text-center px-3 py-2 font-semibold">Qty</th>
              <th className="text-right px-3 py-2 font-semibold">Rate (NPR)</th>
              <th className="text-right px-3 py-2 font-semibold">Amount (NPR)</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-slate-100">
              <td className="px-3 py-2">{pkg?.title || 'Custom Tour Package'}</td>
              <td className="text-center px-3 py-2">{booking.paxCount} pax</td>
              <td className="text-right px-3 py-2">{perPaxPrice.toLocaleString()}</td>
              <td className="text-right px-3 py-2 font-semibold">{booking.totalAgreedAmount.toLocaleString()}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr className="bg-paila-blue text-white font-bold">
              <td colSpan={3} className="px-3 py-2 text-right">Grand Total</td>
              <td className="text-right px-3 py-2">NPR {booking.totalAgreedAmount.toLocaleString()}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Inclusions / Exclusions */}
      <div className="grid grid-cols-2 gap-4 mb-6 avoid-break">
        <div>
          <h3 className="text-sm font-bold text-green-700 mb-2">✓ Inclusions</h3>
          <ul className="text-xs text-slate-700 space-y-1">
            {(pkg?.inclusions || 'All ground transportation, accommodation, meals as per itinerary, licensed guide, necessary permits').split(',').map((item, i) => (
              <li key={i} className="flex gap-1.5">
                <span className="text-green-600">•</span>
                <span>{item.trim()}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-bold text-red-700 mb-2">✗ Exclusions</h3>
          <ul className="text-xs text-slate-700 space-y-1">
            {(pkg?.exclusions || 'Personal expenses, travel insurance, tips, beverages, extra nights').split(',').map((item, i) => (
              <li key={i} className="flex gap-1.5">
                <span className="text-red-600">•</span>
                <span>{item.trim()}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Terms */}
      <div className="border-t border-slate-200 pt-4 text-[10px] text-slate-500 avoid-break">
        <h4 className="font-bold text-slate-700 mb-1">Terms & Conditions</h4>
        <p>• 50% advance payment required to confirm booking. Balance due 7 days prior to departure.</p>
        <p>• Cancellation within 7 days of departure: 50% charge. Within 48 hours: 100% charge.</p>
        <p>• This quotation is valid for 15 days from the date of issue.</p>
        <p>• Paila Nepal Holidays is not liable for losses due to natural disasters, political unrest, or force majeure.</p>
      </div>

      {/* Signature */}
      <div className="mt-8 flex justify-between items-end">
        <div>
          <p className="text-xs text-slate-500">Issued by:</p>
          <p className="text-sm font-semibold mt-4 border-t border-slate-300 pt-1 w-48">
            {booking.createdByName || 'Sales Team'}
          </p>
          <p className="text-[10px] text-slate-500">Paila Nepal Holidays</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-500">Client Acceptance:</p>
          <div className="border-t border-slate-300 pt-1 w-48 mt-8">
            <p className="text-[10px] text-slate-500">Signature & Date</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* =================== BOOKING VOUCHER =================== */
function VoucherDocument({ booking, pkg }: { booking: Booking; pkg: Package | undefined }) {
  return (
    <div className="p-10 text-slate-800" style={{ fontFamily: 'Inter, sans-serif' }}>
      <LetterHead />

      {/* Voucher Header */}
      <div className="bg-paila-blue text-white rounded-lg p-4 mb-6 avoid-break">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-blue-200">Booking Confirmation Voucher</p>
            <h2 className="text-xl font-bold mt-1">{pkg?.title || 'Custom Tour'}</h2>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-blue-200">Voucher No.</p>
            <p className="font-mono font-bold text-lg">{booking.bookingCode}</p>
            <p className="text-[10px] text-blue-200 mt-1">Status: <span className="bg-green-500 px-2 py-0.5 rounded text-white font-bold">CONFIRMED</span></p>
          </div>
        </div>
      </div>

      {/* Guest Details */}
      <div className="mb-6 avoid-break">
        <h3 className="text-sm font-bold text-paila-blue border-b border-slate-200 pb-1 mb-3">Guest / Group Details</h3>
        <div className="grid grid-cols-2 gap-3 text-sm bg-slate-50 rounded-lg p-4">
          <div>
            <p className="text-[10px] text-slate-500 uppercase">Client Name</p>
            <p className="font-semibold">{booking.clientName}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-500 uppercase">Contact Number</p>
            <p className="font-semibold">{booking.clientPhone}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-500 uppercase">Group Size</p>
            <p className="font-semibold">{booking.paxCount} persons</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-500 uppercase">Tour Leader</p>
            <p className="font-semibold">{booking.assignedTourOperatorName || 'To be assigned'}</p>
          </div>
        </div>
      </div>

      {/* Trip Schedule */}
      <div className="mb-6 avoid-break">
        <h3 className="text-sm font-bold text-paila-blue border-b border-slate-200 pb-1 mb-3">Trip Schedule</h3>
        <div className="grid grid-cols-3 gap-3 text-sm">
          <div className="border border-slate-200 rounded-lg p-3 text-center">
            <p className="text-[10px] text-slate-500">DEPARTURE</p>
            <p className="font-bold text-slate-900 mt-1">{booking.startDate || 'TBD'}</p>
          </div>
          <div className="border border-slate-200 rounded-lg p-3 text-center">
            <p className="text-[10px] text-slate-500">RETURN</p>
            <p className="font-bold text-slate-900 mt-1">{booking.endDate || 'TBD'}</p>
          </div>
          <div className="border border-slate-200 rounded-lg p-3 text-center">
            <p className="text-[10px] text-slate-500">DURATION</p>
            <p className="font-bold text-slate-900 mt-1">{booking.itineraryDays.length || pkg?.durationDays || 0} Days</p>
          </div>
        </div>
      </div>

      {/* Itinerary Summary */}
      {booking.itineraryDays.length > 0 && (
        <div className="mb-6 avoid-break">
          <h3 className="text-sm font-bold text-paila-blue border-b border-slate-200 pb-1 mb-3">Itinerary Summary</h3>
          <div className="space-y-1.5">
            {booking.itineraryDays.map(day => (
              <div key={day.id} className="flex gap-2 text-xs py-1.5 border-b border-slate-50">
                <span className="w-6 h-6 bg-paila-orange text-white rounded-full flex items-center justify-center text-[10px] font-bold shrink-0">
                  {day.dayNumber}
                </span>
                <div className="flex-1">
                  <span className="font-semibold">{day.title}</span>
                  {day.overnightLocation && <span className="text-slate-500 ml-2">• {day.overnightLocation}</span>}
                </div>
                <span className="text-slate-500 text-[10px]">🍽️ {day.mealsIncluded}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Emergency Contacts */}
      <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 mb-6 avoid-break">
        <h3 className="text-sm font-bold text-red-800 mb-2 flex items-center gap-2">
          🚨 Emergency Contacts (24/7)
        </h3>
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <p className="font-semibold text-red-900">Tour Leader (On-ground)</p>
            <p className="text-red-800">{booking.assignedTourOperatorName || 'To be assigned'}</p>
            <p className="text-red-700 font-mono">+977-9871234567</p>
          </div>
          <div>
            <p className="font-semibold text-red-900">Paila Nepal Office</p>
            <p className="text-red-800">24/7 Support Line</p>
            <p className="text-red-700 font-mono">+977-1-4123456</p>
          </div>
          <div>
            <p className="font-semibold text-red-900">Admin - Rajesh Shrestha</p>
            <p className="text-red-700 font-mono">+977-9841234567</p>
          </div>
          <div>
            <p className="font-semibold text-red-900">Nepal Emergency</p>
            <p className="text-red-700 font-mono">Police: 100 | Ambulance: 102</p>
          </div>
        </div>
      </div>

      {/* Important Notes */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 avoid-break">
        <h3 className="text-sm font-bold text-amber-800 mb-2">📋 Important Notes for Guests</h3>
        <ul className="text-xs text-amber-900 space-y-1">
          <li>• Please carry original ID/Passport for all hotel check-ins and permit verification.</li>
          <li>• Travel insurance covering emergency evacuation is mandatory for trekking tours.</li>
          <li>• Meals not mentioned in the itinerary are not included in the package cost.</li>
          <li>• Any changes to the itinerary due to weather/road conditions will be communicated by the tour leader.</li>
          <li>• This voucher must be presented at all service points (hotels, transport, activities).</li>
        </ul>
      </div>

      {/* Footer */}
      <div className="border-t-2 border-paila-blue pt-4 mt-8 text-center text-[10px] text-slate-500">
        <p className="font-semibold text-paila-blue">Paila Nepal Holidays — Your Trusted Partner in Himalayan Adventures</p>
        <p>Thamel, Kathmandu | info@pailanepal.com | +977-1-4123456</p>
        <p className="mt-2 italic">Please present this voucher at all service points. Thank you for choosing Paila Nepal Holidays!</p>
      </div>
    </div>
  );
}

/* =================== TAX / PROFORMA INVOICE =================== */
function InvoiceDocument({ booking, pkg, balanceDue }: { booking: Booking; pkg: Package | undefined; balanceDue: number }) {
  const vatRate = 0.13;
  const subtotal = Math.round(booking.totalAgreedAmount / (1 + vatRate));
  const vatAmount = booking.totalAgreedAmount - subtotal;

  return (
    <div className="p-10 text-slate-800" style={{ fontFamily: 'Inter, sans-serif' }}>
      <LetterHead />

      {/* Invoice Header */}
      <div className="flex justify-between items-start mb-8 avoid-break">
        <div>
          <h2 className="text-2xl font-bold text-paila-blue">TAX INVOICE</h2>
          <p className="text-xs text-slate-500 mt-1">Proforma / Tax Invoice</p>
        </div>
        <div className="text-right text-sm">
          <div className="bg-slate-100 rounded-lg p-3">
            <p className="text-[10px] text-slate-500 uppercase">Invoice No.</p>
            <p className="font-mono font-bold text-paila-blue">INV-{booking.bookingCode}</p>
            <p className="text-[10px] text-slate-500 mt-2 uppercase">Invoice Date</p>
            <p className="font-semibold">{new Date().toLocaleDateString('en-GB')}</p>
            <p className="text-[10px] text-slate-500 mt-2 uppercase">Due Date</p>
            <p className="font-semibold">{booking.startDate || 'On completion'}</p>
          </div>
        </div>
      </div>

      {/* Bill To */}
      <div className="grid grid-cols-2 gap-6 mb-6 avoid-break">
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
          <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Bill To</h3>
          <p className="text-sm font-semibold text-slate-900">{booking.clientName}</p>
          <p className="text-xs text-slate-600 mt-1">{booking.clientPhone}</p>
          <p className="text-xs text-slate-600">{booking.clientEmail}</p>
          <p className="text-xs text-slate-500 mt-1">Category: {booking.clientType.replace('_', ' ')}</p>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
          <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">From</h3>
          <p className="text-sm font-semibold text-slate-900">Paila Nepal Holidays</p>
          <p className="text-xs text-slate-600 mt-1">Thamel, Kathmandu, Nepal</p>
          <p className="text-xs text-slate-600">PAN: 601234567</p>
          <p className="text-xs text-slate-600">VAT: 301234567</p>
        </div>
      </div>

      {/* Trip Reference */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6 avoid-break">
        <div className="grid grid-cols-4 gap-3 text-xs">
          <div>
            <p className="text-[10px] text-blue-600 uppercase font-semibold">Booking Ref</p>
            <p className="font-bold text-slate-900">{booking.bookingCode}</p>
          </div>
          <div>
            <p className="text-[10px] text-blue-600 uppercase font-semibold">Package</p>
            <p className="font-bold text-slate-900">{pkg?.title || 'Custom Tour'}</p>
          </div>
          <div>
            <p className="text-[10px] text-blue-600 uppercase font-semibold">Travel Dates</p>
            <p className="font-bold text-slate-900">{booking.startDate || 'TBD'} → {booking.endDate || 'TBD'}</p>
          </div>
          <div>
            <p className="text-[10px] text-blue-600 uppercase font-semibold">Pax</p>
            <p className="font-bold text-slate-900">{booking.paxCount} persons</p>
          </div>
        </div>
      </div>

      {/* Itemized Table */}
      <div className="mb-6 avoid-break">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-paila-blue text-white">
              <th className="text-left px-3 py-2 font-semibold text-xs">S.N.</th>
              <th className="text-left px-3 py-2 font-semibold text-xs">Description</th>
              <th className="text-center px-3 py-2 font-semibold text-xs">Qty</th>
              <th className="text-right px-3 py-2 font-semibold text-xs">Rate (NPR)</th>
              <th className="text-right px-3 py-2 font-semibold text-xs">Amount (NPR)</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-slate-200">
              <td className="px-3 py-2.5">1</td>
              <td className="px-3 py-2.5">
                <p className="font-semibold">{pkg?.title || 'Custom Tour Package'}</p>
                <p className="text-[10px] text-slate-500">{booking.paxCount} pax × {booking.itineraryDays.length || pkg?.durationDays || 0} days</p>
              </td>
              <td className="text-center px-3 py-2.5">{booking.paxCount}</td>
              <td className="text-right px-3 py-2.5">{Math.round(booking.totalAgreedAmount / booking.paxCount).toLocaleString()}</td>
              <td className="text-right px-3 py-2.5 font-semibold">{booking.totalAgreedAmount.toLocaleString()}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div className="flex justify-end mb-8 avoid-break">
        <div className="w-72">
          <div className="flex justify-between py-1.5 text-sm border-b border-slate-100">
            <span className="text-slate-600">Subtotal (Excl. VAT)</span>
            <span className="font-semibold">NPR {subtotal.toLocaleString()}</span>
          </div>
          <div className="flex justify-between py-1.5 text-sm border-b border-slate-100">
            <span className="text-slate-600">VAT (13%)</span>
            <span className="font-semibold">NPR {vatAmount.toLocaleString()}</span>
          </div>
          <div className="flex justify-between py-2 text-sm bg-paila-blue text-white font-bold px-3 rounded-t">
            <span>Grand Total (Incl. VAT)</span>
            <span>NPR {booking.totalAgreedAmount.toLocaleString()}</span>
          </div>
          <div className="flex justify-between py-1.5 text-sm bg-green-100 text-green-800 px-3 border-b border-green-200">
            <span>Less: Advance Received</span>
            <span className="font-semibold">- NPR {booking.advanceReceived.toLocaleString()}</span>
          </div>
          <div className="flex justify-between py-2.5 text-sm bg-paila-orange text-white font-bold px-3 rounded-b">
            <span>BALANCE DUE</span>
            <span>NPR {balanceDue.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Payment Schedule */}
      <div className="mb-6 avoid-break">
        <h3 className="text-sm font-bold text-paila-blue border-b border-slate-200 pb-1 mb-3">Payment Schedule</h3>
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-slate-100">
              <th className="text-left px-3 py-2 font-semibold">Milestone</th>
              <th className="text-left px-3 py-2 font-semibold">Due Date</th>
              <th className="text-right px-3 py-2 font-semibold">Amount (NPR)</th>
              <th className="text-center px-3 py-2 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-slate-100">
              <td className="px-3 py-2">Advance Payment (Booking Confirmation)</td>
              <td className="px-3 py-2">On booking</td>
              <td className="text-right px-3 py-2 font-semibold">{booking.advanceReceived.toLocaleString()}</td>
              <td className="text-center px-3 py-2">
                <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-[10px] font-semibold">RECEIVED</span>
              </td>
            </tr>
            <tr className="border-b border-slate-100">
              <td className="px-3 py-2">Balance Payment</td>
              <td className="px-3 py-2">7 days before departure</td>
              <td className="text-right px-3 py-2 font-semibold">{balanceDue.toLocaleString()}</td>
              <td className="text-center px-3 py-2">
                <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-[10px] font-semibold">PENDING</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Bank Details */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-6 avoid-break">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Bank Details for Payment</h3>
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <p className="text-slate-500">Bank Name</p>
            <p className="font-semibold">Nabil Bank Ltd.</p>
          </div>
          <div>
            <p className="text-slate-500">Account Name</p>
            <p className="font-semibold">Paila Nepal Holidays Pvt. Ltd.</p>
          </div>
          <div>
            <p className="text-slate-500">Account Number</p>
            <p className="font-semibold font-mono">08701234567890</p>
          </div>
          <div>
            <p className="text-slate-500">Branch</p>
            <p className="font-semibold">Thamel, Kathmandu</p>
          </div>
        </div>
        <p className="text-[10px] text-slate-500 mt-2 italic">Digital payments accepted: eSewa, Khalti, IME Pay</p>
      </div>

      {/* Terms */}
      <div className="border-t border-slate-200 pt-4 text-[10px] text-slate-500 avoid-break">
        <h4 className="font-bold text-slate-700 mb-1">Terms of Payment</h4>
        <p>• Payment to be made via bank transfer, cheque, or approved digital wallet.</p>
        <p>• Balance payment must be received 7 days prior to tour departure date.</p>
        <p>• Late payments may incur a 2% monthly service charge.</p>
        <p>• This is a computer-generated invoice. For queries, contact accounts@pailanepal.com</p>
      </div>

      {/* Footer */}
      <div className="border-t-2 border-paila-blue pt-4 mt-6 flex justify-between items-end">
        <div className="text-[10px] text-slate-500">
          <p className="font-semibold text-paila-blue">Paila Nepal Holidays Pvt. Ltd.</p>
          <p>PAN: 601234567 | VAT Registered: 301234567</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-slate-500">Authorized Signatory</p>
          <div className="border-t border-slate-300 pt-1 w-48 mt-8">
            <p className="text-[10px] text-slate-500">For Paila Nepal Holidays</p>
          </div>
        </div>
      </div>
    </div>
  );
}
