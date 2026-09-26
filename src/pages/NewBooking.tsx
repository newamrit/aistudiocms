import { useState } from 'react';
import { ClientType, ItineraryDay, BookingStatus } from '../types';
import { Save, Plus, Trash2, GripVertical, ArrowLeft, FileText } from 'lucide-react';
import { useBookings } from '../contexts/BookingContext';
import { usePackages } from '../contexts/PackageContext';
import { useAuth } from '../contexts/AuthContext';
import { sounds } from '../utils/sounds';

interface NewBookingProps {
  onNavigate: (page: string) => void;
}

export default function NewBooking({ onNavigate }: NewBookingProps) {
  const { addBooking } = useBookings();
  const { packages } = usePackages();
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [clientType, setClientType] = useState<ClientType>('INSTITUTIONAL');
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [groupBatch, setGroupBatch] = useState('');
  const [selectedPackage, setSelectedPackage] = useState<number | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [paxCount, setPaxCount] = useState(1);
  const [totalAmount, setTotalAmount] = useState(0);
  const [advanceAmount, setAdvanceAmount] = useState(0);
  const [notes, setNotes] = useState('');
  const [buildLater, setBuildLater] = useState(false);
  const [itineraryDays, setItineraryDays] = useState<ItineraryDay[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const addDay = () => {
    const newDay: ItineraryDay = {
      id: Date.now(),
      dayNumber: itineraryDays.length + 1,
      title: '',
      description: '',
      overnightLocation: '',
      mealsIncluded: 'B, L, D'
    };
    setItineraryDays([...itineraryDays, newDay]);
  };

  const updateDay = (id: number, field: keyof ItineraryDay, value: string | number) => {
    setItineraryDays(days => days.map(d => d.id === id ? { ...d, [field]: value } : d));
  };

  const removeDay = (id: number) => {
    setItineraryDays(days => days.filter(d => d.id !== id).map((d, i) => ({ ...d, dayNumber: i + 1 })));
  };

  const handlePackageSelect = (pkgId: number) => {
    setSelectedPackage(pkgId);
    const pkg = packages.find(p => p.id === pkgId);
    if (pkg) {
      setTotalAmount(pkg.standardPrice * paxCount);
    }
  };

  const handleSubmit = async (status: BookingStatus = 'CONFIRMED') => {
    setSubmitError(null);
    if (!clientName.trim()) {
      setSubmitError('Client / Organization Name is required.');
      setStep(1);
      return;
    }

    setIsSubmitting(true);
    try {
      const selectedPkg = selectedPackage ? packages.find(p => p.id === selectedPackage) : null;
      const extraNotes: string[] = [];
      if (contactPerson) extraNotes.push(`Contact: ${contactPerson}`);
      if (groupBatch) extraNotes.push(`Group/Batch: ${groupBatch}`);
      if (notes) extraNotes.push(notes);

      await addBooking({
        clientType,
        clientName: clientName.trim(),
        clientEmail: clientEmail.trim() || `contact-${Date.now()}@pailanepal.com.np`,
        clientPhone: clientPhone.trim() || 'N/A',
        packageId: selectedPackage,
        packageName: selectedPkg?.title,
        status,
        startDate: startDate || new Date().toISOString().split('T')[0],
        endDate: endDate || new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
        paxCount: Math.max(1, paxCount),
        totalAgreedAmount: totalAmount,
        advanceReceived: advanceAmount,
        assignedTourOperatorId: null,
        assignedTourOperatorName: undefined,
        notes: extraNotes.join(' | '),
        createdBy: user?.id || 1,
        createdByName: user?.name || 'Staff',
        createdAt: new Date().toISOString().split('T')[0],
        itineraryDays,
      });
      
      sounds.success();
      onNavigate('bookings');
    } catch (err: any) {
      console.error('Error creating booking:', err);
      setSubmitError(err?.message || 'Failed to save booking to database. Please check your connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 animate-fade-in max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => onNavigate('bookings')} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
          <ArrowLeft size={20} className="text-slate-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">New Booking</h1>
          <p className="text-slate-500 text-sm mt-0.5">Create a new tour booking or proposal</p>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center gap-2 mb-8">
        {['Client Details', 'Package & Dates', 'Itinerary', 'Review'].map((label, i) => (
          <div key={i} className="flex items-center gap-2 flex-1">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
              step > i + 1 ? 'bg-green-500 text-white' : step === i + 1 ? 'bg-paila-blue text-white' : 'bg-slate-200 text-slate-500'
            }`}>
              {step > i + 1 ? '✓' : i + 1}
            </div>
            <span className={`text-xs font-medium hidden sm:block ${step === i + 1 ? 'text-paila-blue' : 'text-slate-500'}`}>
              {label}
            </span>
            {i < 3 && <div className="flex-1 h-0.5 bg-slate-200 rounded" />}
          </div>
        ))}
      </div>

      {/* Step 1: Client Details */}
      {step === 1 && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 animate-fade-in">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Client Information</h2>
          
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">Client Category</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { value: 'INSTITUTIONAL', label: '🏫 Institutional', desc: 'Schools & Colleges' },
                { value: 'CORPORATE', label: '🏢 Corporate', desc: 'Company Events' },
                { value: 'FOREIGN_TREK', label: '🏔️ Foreign Trek', desc: 'International Groups' },
                { value: 'INDIVIDUAL', label: '👤 Individual', desc: 'Private Groups' },
              ].map(type => (
                <button
                  key={type.value}
                  onClick={() => setClientType(type.value as ClientType)}
                  className={`p-3 rounded-lg border-2 text-left transition-all ${
                    clientType === type.value
                      ? 'border-paila-blue bg-blue-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <p className="text-sm font-medium">{type.label}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{type.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Dynamic Fields based on Client Category */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-4">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">
              Required fields for {clientType === 'INSTITUTIONAL' ? 'Institutional' : clientType === 'CORPORATE' ? 'Corporate' : clientType === 'FOREIGN_TREK' ? 'Foreign Trek' : 'Individual'} Client
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Common: Client / Organization Name */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Client / Organization Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={clientName}
                  onChange={e => setClientName(e.target.value)}
                  placeholder={
                    clientType === 'INSTITUTIONAL' ? "e.g., St. Xavier's College" :
                    clientType === 'CORPORATE' ? "e.g., Nabil Bank Ltd." :
                    clientType === 'FOREIGN_TREK' ? "e.g., Hans Mueller (Germany)" :
                    "e.g., Ramesh & Family"
                  }
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-paila-blue/20 focus:border-paila-blue outline-none bg-white"
                />
              </div>

              {/* Common: Phone Number */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  value={clientPhone}
                  onChange={e => setClientPhone(e.target.value)}
                  placeholder="+977-98XXXXXXXX"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-paila-blue/20 focus:border-paila-blue outline-none bg-white"
                />
              </div>

              {/* Contact Person - for Institutional & Corporate */}
              {(clientType === 'INSTITUTIONAL' || clientType === 'CORPORATE') && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Contact Person <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={contactPerson}
                    onChange={e => setContactPerson(e.target.value)}
                    placeholder={
                      clientType === 'INSTITUTIONAL' ? "e.g., Principal Ram Sharma" :
                      "e.g., HR Manager Sita Thapa"
                    }
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-paila-blue/20 focus:border-paila-blue outline-none bg-white"
                  />
                </div>
              )}

              {/* Group (Batch) - only for Institutional */}
              {clientType === 'INSTITUTIONAL' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Group (Batch) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={groupBatch}
                    onChange={e => setGroupBatch(e.target.value)}
                    placeholder="e.g., BBS 3rd Year - Batch 2025"
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-paila-blue/20 focus:border-paila-blue outline-none bg-white"
                  />
                </div>
              )}

              {/* Email - optional for all */}
              <div className={clientType === 'INSTITUTIONAL' || clientType === 'CORPORATE' ? 'md:col-span-2' : ''}>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Email Address <span className="text-slate-400 text-xs">(optional)</span>
                </label>
                <input
                  type="email"
                  value={clientEmail}
                  onChange={e => setClientEmail(e.target.value)}
                  placeholder="contact@example.com"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-paila-blue/20 focus:border-paila-blue outline-none bg-white"
                />
              </div>
            </div>
          </div>

          {/* Validation hint */}
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-4">
            <span className="w-1.5 h-1.5 bg-red-400 rounded-full" />
            <span>Fields marked with <span className="text-red-500 font-medium">*</span> are required</span>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={() => setStep(2)}
              disabled={
                !clientName || 
                !clientPhone || 
                ((clientType === 'INSTITUTIONAL' || clientType === 'CORPORATE') && !contactPerson) ||
                (clientType === 'INSTITUTIONAL' && !groupBatch)
              }
              className="px-6 py-2.5 bg-paila-blue text-white rounded-lg text-sm font-medium hover:bg-paila-blue-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next: Package & Dates →
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Package & Dates */}
      {step === 2 && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 animate-fade-in">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Package & Schedule</h2>
          
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">Select Package Template</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {packages.map(pkg => (
                <button
                  key={pkg.id}
                  onClick={() => handlePackageSelect(pkg.id)}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    selectedPackage === pkg.id
                      ? 'border-paila-blue bg-blue-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <p className="text-sm font-semibold text-slate-900">{pkg.title}</p>
                  <p className="text-xs text-slate-500 mt-1">{pkg.durationDays}D / {pkg.durationNights}N • NPR {pkg.standardPrice.toLocaleString()}/pax</p>
                  <p className="text-[10px] text-slate-400 mt-1 line-clamp-2">{pkg.overview}</p>
                </button>
              ))}
              <button
                onClick={() => { setSelectedPackage(null); setBuildLater(true); }}
                className={`p-4 rounded-lg border-2 border-dashed text-left transition-all ${
                  selectedPackage === null
                    ? 'border-paila-orange bg-orange-50'
                    : 'border-slate-300 hover:border-slate-400'
                }`}
              >
                <p className="text-sm font-semibold text-slate-700">🔧 Custom Itinerary</p>
                <p className="text-xs text-slate-500 mt-1">Build day-by-day from scratch</p>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-paila-blue/20 focus:border-paila-blue outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-paila-blue/20 focus:border-paila-blue outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Number of Pax</label>
              <input
                type="number"
                value={Number.isFinite(paxCount) ? paxCount : 1}
                onChange={e => {
                  const val = Number(e.target.value);
                  setPaxCount(Number.isFinite(val) ? Math.max(1, val) : 1);
                }}
                min={1}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-paila-blue/20 focus:border-paila-blue outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Total Agreed Amount (NPR)</label>
              <input
                type="number"
                value={Number.isFinite(totalAmount) ? totalAmount : 0}
                onChange={e => {
                  const val = Number(e.target.value);
                  setTotalAmount(Number.isFinite(val) ? Math.max(0, val) : 0);
                }}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-paila-blue/20 focus:border-paila-blue outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Advance Received (NPR)</label>
              <input
                type="number"
                value={Number.isFinite(advanceAmount) ? advanceAmount : 0}
                onChange={e => {
                  const val = Number(e.target.value);
                  setAdvanceAmount(Number.isFinite(val) ? Math.max(0, val) : 0);
                }}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-paila-blue/20 focus:border-paila-blue outline-none"
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Notes</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              placeholder="Special requirements, dietary needs, etc."
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-paila-blue/20 focus:border-paila-blue outline-none resize-none"
            />
          </div>

          <div className="mt-6 flex justify-between">
            <button onClick={() => setStep(1)} className="px-6 py-2.5 border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors">
              ← Back
            </button>
            <button
              onClick={() => setStep(3)}
              className="px-6 py-2.5 bg-paila-blue text-white rounded-lg text-sm font-medium hover:bg-paila-blue-light transition-colors"
            >
              Next: Itinerary →
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Itinerary Builder */}
      {step === 3 && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Day-by-Day Itinerary</h2>
            <button
              onClick={addDay}
              className="flex items-center gap-1.5 px-3 py-2 bg-paila-orange text-white rounded-lg text-xs font-medium hover:bg-paila-orange-light transition-colors"
            >
              <Plus size={14} />
              Add Day
            </button>
          </div>

          {itineraryDays.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl">
              <FileText size={40} className="mx-auto text-slate-300 mb-3" />
              <p className="text-slate-500 text-sm mb-2">No itinerary days added yet</p>
              <p className="text-slate-400 text-xs mb-4">Click "Add Day" to start building the itinerary, or save as draft</p>
              <button
                onClick={addDay}
                className="px-4 py-2 bg-paila-orange text-white rounded-lg text-xs font-medium hover:bg-paila-orange-light transition-colors"
              >
                Add First Day
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {itineraryDays.map((day, index) => (
                <div key={day.id} className="border border-slate-200 rounded-lg p-4 hover:border-slate-300 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="flex flex-col items-center gap-1 pt-1">
                      <GripVertical size={16} className="text-slate-300 cursor-grab" />
                      <div className="w-8 h-8 bg-paila-blue text-white rounded-full flex items-center justify-center text-xs font-bold">
                        {day.dayNumber}
                      </div>
                    </div>
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-3">
                        <input
                          type="text"
                          value={day.title}
                          onChange={e => updateDay(day.id, 'title', e.target.value)}
                          placeholder={`Day ${day.dayNumber} Title (e.g., Drive to Pokhara)`}
                          className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-paila-blue/20 focus:border-paila-blue outline-none"
                        />
                        <button
                          onClick={() => removeDay(day.id)}
                          className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <textarea
                        value={day.description}
                        onChange={e => updateDay(day.id, 'description', e.target.value)}
                        placeholder="Describe activities, route, highlights..."
                        rows={2}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-paila-blue/20 focus:border-paila-blue outline-none resize-none"
                      />
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <input
                          type="text"
                          value={day.overnightLocation}
                          onChange={e => updateDay(day.id, 'overnightLocation', e.target.value)}
                          placeholder="Overnight at..."
                          className="px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-paila-blue/20 focus:border-paila-blue outline-none"
                        />
                        <input
                          type="text"
                          value={day.mealsIncluded}
                          onChange={e => updateDay(day.id, 'mealsIncluded', e.target.value)}
                          placeholder="Meals: B, L, D"
                          className="px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-paila-blue/20 focus:border-paila-blue outline-none"
                        />
                        <div className="flex items-center text-xs text-slate-500">
                          {index < itineraryDays.length - 1 && <span className="text-green-600">→ Day {day.dayNumber + 1}</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-6 flex justify-between">
            <button onClick={() => setStep(2)} className="px-6 py-2.5 border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors">
              ← Back
            </button>
            <div className="flex gap-3">
              <button
                onClick={() => setBuildLater(true)}
                className="px-6 py-2.5 border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
              >
                Build Later
              </button>
              <button
                onClick={() => setStep(4)}
                className="px-6 py-2.5 bg-paila-blue text-white rounded-lg text-sm font-medium hover:bg-paila-blue-light transition-colors"
              >
                Review & Save →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 4: Review */}
      {step === 4 && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 animate-fade-in">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Review & Confirm</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Client Details</h3>
                <div className="bg-slate-50 rounded-lg p-4 space-y-2">
                  <p className="text-sm"><span className="text-slate-500">Name:</span> <span className="font-medium">{clientName || '—'}</span></p>
                  <p className="text-sm"><span className="text-slate-500">Type:</span> <span className="font-medium">{clientType.replace('_', ' ')}</span></p>
                  <p className="text-sm"><span className="text-slate-500">Phone:</span> <span className="font-medium">{clientPhone || '—'}</span></p>
                  {(clientType === 'INSTITUTIONAL' || clientType === 'CORPORATE') && contactPerson && (
                    <p className="text-sm"><span className="text-slate-500">Contact Person:</span> <span className="font-medium">{contactPerson}</span></p>
                  )}
                  {clientType === 'INSTITUTIONAL' && groupBatch && (
                    <p className="text-sm"><span className="text-slate-500">Group (Batch):</span> <span className="font-medium">{groupBatch}</span></p>
                  )}
                  {clientEmail && (
                    <p className="text-sm"><span className="text-slate-500">Email:</span> <span className="font-medium">{clientEmail}</span></p>
                  )}
                </div>
              </div>
              <div>
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Schedule</h3>
                <div className="bg-slate-50 rounded-lg p-4 space-y-2">
                  <p className="text-sm"><span className="text-slate-500">Package:</span> <span className="font-medium">{selectedPackage ? packages.find(p => p.id === selectedPackage)?.title : 'Custom'}</span></p>
                  <p className="text-sm"><span className="text-slate-500">Dates:</span> <span className="font-medium">{startDate || 'TBD'} → {endDate || 'TBD'}</span></p>
                  <p className="text-sm"><span className="text-slate-500">Pax:</span> <span className="font-medium">{Number.isFinite(Number(paxCount)) ? paxCount : 1}</span></p>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Financials</h3>
                <div className="bg-slate-50 rounded-lg p-4 space-y-2">
                  <p className="text-sm"><span className="text-slate-500">Total Amount:</span> <span className="font-bold text-paila-blue">NPR {(Number.isFinite(totalAmount) ? totalAmount : 0).toLocaleString()}</span></p>
                  <p className="text-sm"><span className="text-slate-500">Advance:</span> <span className="font-medium text-green-700">NPR {(Number.isFinite(advanceAmount) ? advanceAmount : 0).toLocaleString()}</span></p>
                  <p className="text-sm"><span className="text-slate-500">Balance Due:</span> <span className="font-medium text-red-600">NPR {Math.max(0, (Number(totalAmount) || 0) - (Number(advanceAmount) || 0)).toLocaleString()}</span></p>
                </div>
              </div>
              <div>
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Itinerary</h3>
                <div className="bg-slate-50 rounded-lg p-4">
                  {itineraryDays.length > 0 ? (
                    <p className="text-sm font-medium">{itineraryDays.length} days planned</p>
                  ) : (
                    <p className="text-sm text-slate-500 italic">Itinerary to be built later</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {notes && (
            <div className="mt-4">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Notes</h3>
              <p className="text-sm text-slate-700 bg-amber-50 border border-amber-200 rounded-lg p-3">{notes}</p>
            </div>
          )}

          {submitError && (
            <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm font-medium">
              ⚠️ {submitError}
            </div>
          )}

          <div className="mt-6 flex justify-between">
            <button 
              disabled={isSubmitting}
              onClick={() => setStep(3)} 
              className="px-6 py-2.5 border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              ← Back
            </button>
            <div className="flex gap-3">
              <button
                disabled={isSubmitting}
                onClick={() => handleSubmit('PROPOSED')}
                className="px-6 py-2.5 border border-paila-blue text-paila-blue rounded-lg text-sm font-medium hover:bg-blue-50 transition-colors disabled:opacity-50"
              >
                {isSubmitting ? 'Saving...' : 'Save as Proposal'}
              </button>
              <button
                disabled={isSubmitting}
                onClick={() => handleSubmit('CONFIRMED')}
                className="flex items-center gap-2 px-6 py-2.5 bg-paila-orange text-white rounded-lg text-sm font-medium hover:bg-paila-orange-light transition-colors disabled:opacity-50 shadow-sm"
              >
                <Save size={16} className={isSubmitting ? 'animate-spin' : ''} />
                {isSubmitting ? 'Creating in Database...' : 'Confirm Booking'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
