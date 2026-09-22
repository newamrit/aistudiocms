import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useFieldActivity } from '../contexts/FieldActivityContext';
import { useBookings } from '../contexts/BookingContext';
import { useAlerts } from '../contexts/AlertContext';
import { vendors, operationAllocations } from '../data/mockData';
import {
  Phone, MapPin, Clock, AlertTriangle, AlertCircle, CheckCircle, Play,
  ArrowRight, Users, Mountain, Truck, UtensilsCrossed, Building2,
  Wallet, Plus, X, Check, MessageSquare, Navigation, Sun, Moon,
  Sunrise, Sunset, ChevronRight, RefreshCw, Shield, Zap, LogOut, Camera, Upload, Image as ImageIcon, Trash2, Wifi, WifiOff, CloudOff
} from 'lucide-react';
import { useRef } from 'react';
import { sounds } from '../utils/sounds';
import { getCurrentNepalTime } from '../utils/timeFormat';
import { useSyncQueue } from '../hooks/useOfflineData';
import { initializeOfflineSupport } from '../utils/offlineDB';
import { apiClient } from '../api/tourLeaderApi';

type TourStatus = 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED';
type SwapType = 'HOTEL' | 'RESTAURANT' | 'VEHICLE' | 'ACTIVITY';

interface SpotExpense {
  id: number;
  bookingId: number;
  description: string;
  amount: number;
  category: string;
  recordedAt: string;
  recordedBy: string;
  hasReceipt?: boolean;
  receiptPreview?: string;
}

interface VendorSwap {
  id: number;
  bookingId: number;
  originalVendor: string;
  newVendor: string;
  swapType: SwapType;
  reason: string;
  swappedAt: string;
  swappedBy: string;
  authorized: boolean;
}

export default function TourLeaderPortal() {
  const { user, logout } = useAuth();
  const { addActivity } = useFieldActivity();
  const { bookings } = useBookings();
  const { createAlert } = useAlerts();
  const [activeTab, setActiveTab] = useState<'cockpit' | 'contacts' | 'expenses' | 'swaps'>('cockpit');
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showDailyStatusModal, setShowDailyStatusModal] = useState(false);
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showCallModal, setShowCallModal] = useState(false);
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [selectedCallContact, setSelectedCallContact] = useState<{ name: string; phone: string; role: string } | null>(null);
  const [selectedDayNumber, setSelectedDayNumber] = useState<number>(1);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentTime, setCurrentTime] = useState<string>(getCurrentNepalTime());
  const { stats: syncStats, syncing, syncNow } = useSyncQueue();
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  // Initialize offline support
  useEffect(() => {
    initializeOfflineSupport();
  }, []);

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(getCurrentNepalTime());
    }, 60000); // Update every minute

    return () => clearInterval(timer);
  }, []);

  // Listen for connectivity changes
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      sounds.success();
    };
    const handleOffline = () => {
      setIsOffline(true);
      sounds.warning();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Get tours assigned to this tour leader
  const myTours = bookings.filter(b => b.assignedTourOperatorId === user?.id);
  const activeTours = myTours.filter(b => ['CONFIRMED', 'IN_PROGRESS'].includes(b.status));
  const upcomingTour = activeTours[0];

  // Mock expenses and swaps
  const [spotExpenses, setSpotExpenses] = useState<SpotExpense[]>([
    { id: 1, bookingId: 2, description: 'Extra water bottles for group (heat wave)', amount: 1200, category: 'Refreshments', recordedAt: '2026-01-21 14:30', recordedBy: 'Prakash Gurung', hasReceipt: true },
    { id: 2, bookingId: 2, description: 'Emergency medicine at pharmacy', amount: 850, category: 'Medical', recordedAt: '2026-01-22 09:15', recordedBy: 'Prakash Gurung', hasReceipt: true },
  ]);

  const [vendorSwaps, setVendorSwaps] = useState<VendorSwap[]>([
    { id: 1, bookingId: 2, originalVendor: 'Ghorepani Teahouse', newVendor: 'Snow Leopard Lodge', swapType: 'HOTEL', reason: 'Original teahouse fully booked due to season rush', swappedAt: '2026-01-21 16:45', swappedBy: 'Prakash Gurung', authorized: true },
  ]);

  // Get allocations for active tour
  const tourAllocations = upcomingTour
    ? operationAllocations.filter(a => a.bookingId === upcomingTour.id)
    : [];

  const statusSteps: TourStatus[] = ['CONFIRMED', 'IN_PROGRESS', 'COMPLETED'];
  const currentStatusIndex = upcomingTour ? statusSteps.indexOf(upcomingTour.status as TourStatus) : -1;

  // Speed-dial contacts
  const speedDialContacts = [
    { name: 'Client', phone: upcomingTour?.clientPhone || '', role: 'Tour Client', icon: <Users size={20} />, color: 'bg-blue-500' },
    { name: 'Office', phone: '+977-1-4123456', role: 'HQ Kathmandu', icon: <Building2 size={20} />, color: 'bg-purple-500' },
    { name: 'Rajesh', phone: '+977-9841234567', role: 'Admin (Rajesh)', icon: <Shield size={20} />, color: 'bg-paila-blue' },
    { name: 'Emergency', phone: '100', role: 'Nepal Police', icon: <AlertTriangle size={20} />, color: 'bg-red-500' },
    { name: 'Ambulance', phone: '102', role: 'Emergency Medical', icon: <Zap size={20} />, color: 'bg-orange-500' },
    { name: 'Tourism Board', phone: '+977-1-4248669', role: 'Nepal Tourism', icon: <Mountain size={20} />, color: 'bg-green-500' },
  ];

  // Vendor contacts for current tour
  const vendorContacts = tourAllocations.map(alloc => {
    const vendor = vendors.find(v => v.id === alloc.vendorId);
    return {
      name: alloc.vendorName,
      phone: vendor?.phone || '',
      role: `${alloc.serviceType} • ${alloc.serviceDate}`,
      icon: alloc.serviceType === 'HOTEL' ? <Building2 size={20} /> :
            alloc.serviceType === 'VEHICLE' ? <Truck size={20} /> :
            alloc.serviceType === 'RESTAURANT' ? <UtensilsCrossed size={20} /> :
            <Mountain size={20} />,
      color: alloc.serviceType === 'HOTEL' ? 'bg-blue-500' :
             alloc.serviceType === 'VEHICLE' ? 'bg-green-500' :
             alloc.serviceType === 'RESTAURANT' ? 'bg-orange-500' :
             'bg-purple-500',
      allocationId: alloc.id
    };
  });

  const handleStatusChange = (newStatus: TourStatus) => {
    if (upcomingTour && user) {
      addActivity({
        type: 'STATUS_CHANGE',
        tourLeaderId: user.id,
        tourLeaderName: user.name,
        bookingId: upcomingTour.id,
        bookingCode: upcomingTour.bookingCode,
        clientName: upcomingTour.clientName,
        title: `Tour Status Updated to ${newStatus.replace('_', ' ')}`,
        description: `Tour status changed from ${upcomingTour.status.replace('_', ' ')} to ${newStatus.replace('_', ' ')}.`,
        metadata: { fromStatus: upcomingTour.status, toStatus: newStatus },
        priority: newStatus === 'IN_PROGRESS' ? 'MEDIUM' : 'LOW'
      });
      sounds.success();
      alert(`Tour status updated to ${newStatus}! (Demo)`);
      setShowStatusModal(false);
    }
  };

  const handleDailyStatusUpdate = (status: string, notes?: string) => {
    if (upcomingTour && user) {
      addActivity({
        type: 'CHECK_IN',
        tourLeaderId: user.id,
        tourLeaderName: user.name,
        bookingId: upcomingTour.id,
        bookingCode: upcomingTour.bookingCode,
        clientName: upcomingTour.clientName,
        title: `Daily Update: ${status}`,
        description: notes || `Tour leader reported: ${status}`,
        metadata: { 
          dailyStatus: status,
          dayNumber: selectedDayNumber,
          notes: notes || ''
        },
        priority: 'LOW'
      });
      sounds.success();
      alert(`Daily status "${status}" recorded successfully!`);
      setShowDailyStatusModal(false);
    }
  };

  const handleVendorSwap = async () => {
    if (upcomingTour && user) {
      const swapData = {
        booking_id: upcomingTour.id,
        day_number: selectedDayNumber,
        original_vendor_id: 1, // In real implementation, this would come from the form
        new_vendor_id: 2, // In real implementation, this would come from the form
        reason: 'Operational necessity',
        cost_difference: 0,
        payment_method: 'CASH'
      };

      // Add to local activity feed
      addActivity({
        type: 'VENDOR_SWAP',
        tourLeaderId: user.id,
        tourLeaderName: user.name,
        bookingId: upcomingTour.id,
        bookingCode: upcomingTour.bookingCode,
        clientName: upcomingTour.clientName,
        title: 'Vendor Swap Authorized',
        description: 'Emergency vendor swap performed due to operational requirements.',
        metadata: { 
          originalVendor: 'Original Vendor', 
          newVendor: 'New Vendor', 
          serviceType: 'HOTEL',
          reason: 'Operational necessity'
        },
        priority: 'MEDIUM'
      });

      // Queue for sync if offline, or execute immediately if online
      if (!navigator.onLine) {
        const { SyncQueue } = await import('../utils/offlineDB');
        await SyncQueue.add('/api/tour-leader/swap-vendor', 'POST', swapData);
        sounds.warning();
        alert('Vendor swap queued for sync when online');
      } else {
        try {
          await apiClient.post('/tour-leader/swap-vendor', swapData);
          sounds.success();
          alert('Vendor swap authorized and synced!');
        } catch (error) {
          // If API call fails, queue for retry
          const { SyncQueue } = await import('../utils/offlineDB');
          await SyncQueue.add('/api/tour-leader/swap-vendor', 'POST', swapData);
          sounds.warning();
          alert('Vendor swap queued for retry');
        }
      }

      setShowSwapModal(false);
    }
  };

  const handleExpense = async () => {
    if (upcomingTour && user) {
      const expenseData = {
        booking_id: upcomingTour.id,
        day_number: selectedDayNumber,
        title: 'Emergency spot expense',
        category: 'Emergency',
        amount: 0, // In real implementation, this would come from the form
        payment_method: 'CASH',
        notes: 'Emergency spot expense incurred during tour',
        receipt_image_url: receiptPreview || undefined
      };

      // Add to local activity feed
      addActivity({
        type: 'SPOT_EXPENSE',
        tourLeaderId: user.id,
        tourLeaderName: user.name,
        bookingId: upcomingTour.id,
        bookingCode: upcomingTour.bookingCode,
        clientName: upcomingTour.clientName,
        title: 'Spot Expense Recorded',
        description: 'Emergency spot expense incurred during tour.',
        metadata: { 
          amount: 0, 
          category: 'Emergency',
          paymentMethod: 'CASH',
          hasReceipt: !!receiptFile,
          receiptName: receiptFile?.name || null
        },
        priority: 'HIGH'
      });

      // Queue for sync if offline, or execute immediately if online
      if (!navigator.onLine) {
        const { SyncQueue } = await import('../utils/offlineDB');
        await SyncQueue.add('/api/tour-leader/log-expense', 'POST', expenseData);
        sounds.cashRegister();
        alert('Expense queued for sync when online');
      } else {
        try {
          await apiClient.post('/tour-leader/log-expense', expenseData);
          sounds.cashRegister();
          alert('Expense recorded and synced!');
        } catch (error) {
          // If API call fails, queue for retry
          const { SyncQueue } = await import('../utils/offlineDB');
          await SyncQueue.add('/api/tour-leader/log-expense', 'POST', expenseData);
          sounds.cashRegister();
          alert('Expense queued for retry');
        }
      }

      setShowExpenseModal(false);
      // Reset receipt state
      setReceiptFile(null);
      setReceiptPreview(null);
    }
  };

  const openCallModal = (contact: { name: string; phone: string; role: string }) => {
    sounds.click();
    setSelectedCallContact(contact);
    setShowCallModal(true);
  };

  const handleReceiptUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please upload an image file (JPG, PNG, etc.)');
        return;
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB');
        return;
      }
      setReceiptFile(file);
      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setReceiptPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeReceipt = () => {
    setReceiptFile(null);
    setReceiptPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (!user) return null;

  return (
    <div className="w-full min-h-screen bg-slate-50 flex flex-col">
      {/* Mobile Header */}
      <header className="bg-gradient-to-br from-[#012871] to-[#0a3d99] text-white sticky top-0 z-30 shadow-xl">
        <div className="px-5 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-14 h-14 bg-gradient-to-br from-[#f35500] to-[#d94b00] rounded-full flex items-center justify-center font-bold text-lg shadow-lg shadow-orange-500/30">
                  {user.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-emerald-500 rounded-full ring-2 ring-white"></div>
              </div>
              <div>
                <p className="text-sm text-blue-200 font-medium">Tour Leader</p>
                <p className="text-xl font-bold">{user.name.split(' ')[0]}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Offline/Sync Status Indicator */}
              {isOffline && (
                <div className="flex items-center gap-2 bg-red-500/20 border border-red-400/50 px-3 py-2 rounded-full animate-pulse">
                  <WifiOff size={14} className="text-red-300" />
                  <span className="text-xs font-semibold text-red-200">Offline</span>
                </div>
              )}
              
              {/* Sync Queue Indicator */}
              {syncStats.total > 0 && (
                <button
                  onClick={syncNow}
                  disabled={syncing || isOffline}
                  className="flex items-center gap-2 bg-amber-500/20 border border-amber-400/50 px-3 py-2 rounded-full hover:bg-amber-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title={syncing ? 'Syncing...' : `${syncStats.total} pending sync`}
                >
                  {syncing ? (
                    <RefreshCw size={14} className="text-amber-300 animate-spin" />
                  ) : (
                    <CloudOff size={14} className="text-amber-300" />
                  )}
                  <span className="text-xs font-semibold text-amber-200">{syncStats.total}</span>
                </button>
              )}

              <div className="flex items-center gap-2 bg-white/10 px-3 py-2 rounded-full">
                <Clock size={14} />
                <span className="text-xs font-semibold">{currentTime}</span>
              </div>
              <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full">
                <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse" />
                <span className="text-sm font-semibold">On Duty</span>
              </div>
              <button className="p-3 hover:bg-white/10 rounded-lg transition-colors">
                <RefreshCw size={22} />
              </button>
              <button 
                onClick={logout}
                className="p-3 hover:bg-red-500/20 rounded-lg transition-colors"
                title="Logout"
              >
                <LogOut size={22} />
              </button>
            </div>
          </div>
        </div>

        {/* Current Tour Banner */}
        {upcomingTour && (
          <div className="px-5 pb-5">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/15 shadow-xl">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-mono text-blue-100 font-semibold">{upcomingTour.bookingCode}</span>
                <span className={`px-4 py-1.5 text-sm font-bold rounded-full shadow-lg ${
                  upcomingTour.status === 'IN_PROGRESS' ? 'bg-emerald-500 text-white shadow-emerald-500/30' : 'bg-blue-400 text-white shadow-blue-400/30'
                }`}>
                  {upcomingTour.status.replace('_', ' ')}
                </span>
              </div>
              <p className="text-lg font-bold truncate">{upcomingTour.clientName}</p>
              <div className="flex items-center gap-4 mt-3 text-sm text-blue-100 font-medium">
                <span className="flex items-center gap-1.5"><MapPin size={14} /> {upcomingTour.packageName || 'Custom Tour'}</span>
                <span className="flex items-center gap-1.5"><Users size={14} /> {upcomingTour.paxCount} pax</span>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 px-5 py-6 space-y-6 pb-28">
        {/* Tab: Cockpit */}
        {activeTab === 'cockpit' && (
          <div className="space-y-5 animate-fade-in">
            {/* Status Progression Card */}
            {upcomingTour && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-lg font-bold text-paila-blue">Tour Status</h3>
                  <button
                    onClick={() => setShowStatusModal(true)}
                    className="text-base font-bold text-paila-blue hover:text-paila-orange transition-colors flex items-center gap-1"
                  >
                    Update <ChevronRight size={18} />
                  </button>
                </div>
                
                {/* Stepper */}
                <div className="flex items-center justify-between relative">
                  {/* Progress line */}
                  <div className="absolute top-5 left-10 right-10 h-1 bg-slate-200">
                    <div
                      className="h-full bg-paila-orange transition-all duration-500"
                      style={{ width: `${(currentStatusIndex / (statusSteps.length - 1)) * 100}%` }}
                    />
                  </div>
                  
                  {statusSteps.map((status, i) => {
                    const isActive = i <= currentStatusIndex;
                    const isCurrent = i === currentStatusIndex;
                    return (
                      <div key={status} className="relative flex flex-col items-center z-10">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                          isCurrent ? 'bg-paila-orange text-white scale-110 ring-4 ring-paila-orange/20' :
                          isActive ? 'bg-paila-blue text-white' :
                          'bg-slate-200 text-slate-400'
                        }`}>
                          {isActive ? <Check size={18} /> : <span className="text-base font-bold">{i + 1}</span>}
                        </div>
                        <span className={`text-xs mt-2 font-bold ${isCurrent ? 'text-paila-orange' : isActive ? 'text-slate-700' : 'text-slate-400'}`}>
                          {status === 'IN_PROGRESS' ? 'On Road' : status === 'CONFIRMED' ? 'Ready' : 'Done'}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-3 gap-3 mt-6">
                  <button
                    onClick={() => setShowDailyStatusModal(true)}
                    className="flex flex-col items-center justify-center gap-2 h-20 bg-blue-50 border-2 border-blue-200/60 rounded-2xl text-blue-700 hover:bg-blue-100 hover:border-blue-300 transition-all active:scale-[0.98] shadow-sm hover:shadow-md"
                  >
                    <CheckCircle size={24} />
                    <span className="text-xs font-bold">Daily Update</span>
                  </button>
                  <button
                    onClick={() => setShowSwapModal(true)}
                    className="flex flex-col items-center justify-center gap-2 h-20 bg-amber-50 border-2 border-amber-200/60 rounded-2xl text-amber-700 hover:bg-amber-100 hover:border-amber-300 transition-all active:scale-[0.98] shadow-sm hover:shadow-md"
                  >
                    <RefreshCw size={24} />
                    <span className="text-xs font-bold">Swap Vendor</span>
                  </button>
                  <button
                    onClick={() => setShowExpenseModal(true)}
                    className="flex flex-col items-center justify-center gap-2 h-20 bg-emerald-50 border-2 border-emerald-200/60 rounded-2xl text-emerald-700 hover:bg-emerald-100 hover:border-emerald-300 transition-all active:scale-[0.98] shadow-sm hover:shadow-md"
                  >
                    <Wallet size={24} />
                    <span className="text-xs font-bold">Log Expense</span>
                  </button>
                </div>

                {/* Emergency Alert Button */}
                <button
                  onClick={() => setShowAlertModal(true)}
                  className="w-full mt-4 flex items-center justify-center gap-3 h-14 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-2xl text-sm font-bold shadow-lg shadow-red-500/30 hover:from-red-600 hover:to-red-700 hover:shadow-xl hover:shadow-red-500/40 transition-all active:scale-[0.98]"
                >
                  <AlertTriangle size={20} />
                  EMERGENCY ALERT
                </button>
              </div>
            )}

            {/* Day Schedule Selector */}
            {upcomingTour && upcomingTour.itineraryDays.length > 0 && (() => {
              const selectedDay = upcomingTour.itineraryDays.find(d => d.dayNumber === selectedDayNumber) || upcomingTour.itineraryDays[0];
              
              // Calculate date for each day based on start date
              const getDayDate = (dayNum: number) => {
                if (!upcomingTour.startDate) return null;
                const startDate = new Date(upcomingTour.startDate);
                startDate.setDate(startDate.getDate() + dayNum - 1);
                return startDate;
              };
              
              // Get vendors/services for selected day
              const selectedDate = getDayDate(selectedDayNumber);
              const dayVendors = selectedDate 
                ? operationAllocations.filter(a => 
                    a.bookingId === upcomingTour.id && 
                    new Date(a.serviceDate).toDateString() === selectedDate.toDateString()
                  )
                : [];
              
              return (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                  <h3 className="text-lg font-bold text-paila-blue mb-5">📅 Select Day Schedule</h3>
                  
                  {/* Horizontal Day Selector */}
                  <div className="flex gap-3 overflow-x-auto pb-3 mb-5 -mx-1 px-1 no-scrollbar scroll-smooth snap-x">
                    {upcomingTour.itineraryDays.map((day) => {
                      const dayDate = getDayDate(day.dayNumber);
                      const isSelected = day.dayNumber === selectedDayNumber;
                      const isToday = dayDate && new Date().toDateString() === dayDate.toDateString();
                      
                      return (
                        <button
                          key={day.id}
                          onClick={() => setSelectedDayNumber(day.dayNumber)}
                          className={`flex-shrink-0 w-24 py-4 px-3 rounded-2xl transition-all active:scale-95 snap-start ${
                            isSelected 
                              ? 'bg-[#012871] text-white shadow-lg shadow-blue-950/20 scale-105' 
                              : isToday
                                ? 'bg-[#f35500]/10 border-2 border-[#f35500] text-[#f35500]'
                                : 'bg-white text-slate-700 border border-slate-200 hover:border-slate-300 hover:shadow-md'
                          }`}
                        >
                          <div className="text-xs font-semibold uppercase tracking-wide">
                            {dayDate ? dayDate.toLocaleDateString('en-US', { month: 'short' }) : `Day`}
                          </div>
                          <div className="text-3xl font-bold my-1">{day.dayNumber}</div>
                          <div className="text-sm font-medium">
                            {dayDate ? dayDate.getDate() : ''}
                          </div>
                          {isToday && !isSelected && (
                            <div className="text-xs font-bold mt-1 text-[#f35500]">TODAY</div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  
                  {/* Selected Day Details */}
                  <div className="card p-6">
                    <div className="flex items-start gap-4 mb-5">
                      <div className="w-14 h-14 bg-gradient-to-br from-[#012871] to-[#0a3d99] text-white rounded-2xl flex items-center justify-center text-lg font-bold flex-shrink-0 shadow-lg shadow-blue-950/20">
                        {selectedDay.dayNumber}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-lg font-bold text-[#012871]">{selectedDay.title}</h4>
                        {selectedDate && (
                          <p className="text-sm text-slate-500 mt-1 font-medium">
                            {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <p className="text-sm text-slate-600 leading-relaxed mb-5">{selectedDay.description}</p>
                    
                    {/* Location & Meals */}
                    <div className="flex flex-wrap gap-2 mb-5">
                      {selectedDay.overnightLocation && (
                        <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-xl border border-blue-200/60">
                          <MapPin size={14} className="text-blue-700" />
                          <span className="text-xs font-semibold text-blue-700">{selectedDay.overnightLocation}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 rounded-xl border border-amber-200/60">
                        <span className="text-sm">🍽️</span>
                        <span className="text-xs font-semibold text-amber-700">{selectedDay.mealsIncluded}</span>
                      </div>
                    </div>
                    
                    {/* Vendors for this day */}
                    {dayVendors.length > 0 && (
                      <div className="border-t border-slate-100 pt-4">
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Assigned Services</p>
                        <div className="space-y-2">
                          {dayVendors.map((vendor) => (
                            <div key={vendor.id} className="flex items-center gap-3 p-3 bg-slate-50/50 rounded-xl hover:bg-slate-50 transition-colors">
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                                vendor.serviceType === 'HOTEL' ? 'bg-blue-50 text-blue-700' :
                                vendor.serviceType === 'VEHICLE' ? 'bg-emerald-50 text-emerald-700' :
                                vendor.serviceType === 'RESTAURANT' ? 'bg-amber-50 text-amber-700' :
                                'bg-purple-50 text-purple-700'
                              }`}>
                                {vendor.serviceType === 'HOTEL' ? <Building2 size={18} /> :
                                 vendor.serviceType === 'VEHICLE' ? <Truck size={18} /> :
                                 vendor.serviceType === 'RESTAURANT' ? <UtensilsCrossed size={18} /> :
                                 <Mountain size={18} />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-slate-900 truncate">{vendor.vendorName}</p>
                                <p className="text-xs text-slate-500">{vendor.serviceType}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Speed Dial - Quick Contacts */}
            <div className="card p-6">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-bold text-[#012871]">Speed Dial</h3>
                <button
                  onClick={() => setActiveTab('contacts')}
                  className="text-sm font-semibold text-[#012871] hover:text-[#f35500] transition-colors flex items-center gap-1"
                >
                  View All <ChevronRight size={16} />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-4">
                {speedDialContacts.slice(0, 6).map((contact, i) => (
                  <button
                    key={i}
                    onClick={() => openCallModal(contact)}
                    className="flex flex-col items-center gap-2 p-4 rounded-2xl hover:bg-slate-50 transition-all active:scale-95"
                  >
                    <div className={`w-13 h-13 ${contact.color} rounded-full flex items-center justify-center text-white shadow-lg transition-transform hover:scale-105`}>
                      {contact.icon}
                    </div>
                    <span className="text-xs font-semibold text-slate-600 text-center leading-tight">{contact.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-bold text-paila-blue mb-4">Recent Activity</h3>
              <div className="space-y-3">
                {vendorSwaps.slice(0, 2).map(swap => (
                  <div key={swap.id} className="flex items-start gap-3 p-4 bg-amber-50 rounded-xl">
                    <RefreshCw size={16} className="text-amber-600 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-amber-800">Vendor Swapped</p>
                      <p className="text-sm text-amber-700 truncate font-medium">{swap.originalVendor} → {swap.newVendor}</p>
                    </div>
                  </div>
                ))}
                {spotExpenses.slice(0, 2).map(exp => (
                  <div key={exp.id} className="flex items-start gap-3 p-4 bg-green-50 rounded-xl">
                    <Wallet size={16} className="text-green-600 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-green-800">Expense: NPR {exp.amount.toLocaleString()}</p>
                      <p className="text-sm text-green-700 truncate font-medium">{exp.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* No Active Tours */}
            {!upcomingTour && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-10 text-center">
                <Mountain size={48} className="mx-auto text-slate-300 mb-4" />
                <p className="text-lg font-bold text-slate-700">No Active Tours</p>
                <p className="text-base text-slate-500 mt-2">You have no tours assigned right now.</p>
              </div>
            )}
          </div>
        )}

        {/* Tab: Contacts */}
        {activeTab === 'contacts' && (
          <div className="space-y-5 animate-fade-in">
            {/* Emergency Banner */}
            <div className="bg-red-500 rounded-2xl p-6 text-white shadow-lg">
              <div className="flex items-center gap-3 mb-4">
                <AlertTriangle size={20} />
                <h3 className="text-lg font-bold">Emergency Contacts</h3>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <button onClick={() => openCallModal({ name: 'Police', phone: '100', role: 'Emergency' })} className="bg-white/20 backdrop-blur-sm rounded-2xl py-4 text-center active:scale-95 transition-transform">
                  <p className="text-base font-bold">Police</p>
                  <p className="text-sm opacity-90 font-medium">100</p>
                </button>
                <button onClick={() => openCallModal({ name: 'Ambulance', phone: '102', role: 'Emergency' })} className="bg-white/20 backdrop-blur-sm rounded-2xl py-4 text-center active:scale-95 transition-transform">
                  <p className="text-base font-bold">Ambulance</p>
                  <p className="text-sm opacity-90 font-medium">102</p>
                </button>
                <button onClick={() => openCallModal({ name: 'Tourism Board', phone: '+977-1-4248669', role: 'Emergency' })} className="bg-white/20 backdrop-blur-sm rounded-2xl py-4 text-center active:scale-95 transition-transform">
                  <p className="text-base font-bold">Tourism</p>
                  <p className="text-sm opacity-90 font-medium">Helpline</p>
                </button>
              </div>
            </div>

            {/* Client Contact */}
            {upcomingTour && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <h3 className="text-lg font-bold text-paila-blue mb-4">Tour Client</h3>
                <button
                  onClick={() => openCallModal({ name: upcomingTour.clientName, phone: upcomingTour.clientPhone, role: 'Client' })}
                  className="w-full flex items-center gap-4 p-4 bg-blue-50 rounded-2xl active:scale-[0.98] transition-transform"
                >
                  <div className="w-14 h-14 bg-blue-500 rounded-full flex items-center justify-center text-white shadow-md">
                    <Users size={24} />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-lg font-bold text-slate-900">{upcomingTour.clientName}</p>
                    <p className="text-base text-slate-600 font-medium">{upcomingTour.clientPhone}</p>
                  </div>
                  <Phone size={22} className="text-blue-600" />
                </button>
              </div>
            )}

            {/* Office Contacts */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-bold text-paila-blue mb-4">Office & Admin</h3>
              <div className="space-y-3">
                {[
                  { name: 'Rajesh Shrestha', phone: '+977-9841234567', role: 'Admin / Super Admin' },
                  { name: 'Bikash Tamang', phone: '+977-9861234567', role: 'Operations Manager' },
                  { name: 'Sita Maharjan', phone: '+977-9851234567', role: 'Sales / Booking' },
                ].map((contact, i) => (
                  <button
                    key={i}
                    onClick={() => openCallModal(contact)}
                    className="w-full flex items-center gap-4 p-4 hover:bg-slate-50 rounded-2xl active:scale-[0.98] transition-transform"
                  >
                    <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center text-purple-600">
                      <Shield size={20} />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-base font-bold text-slate-900">{contact.name}</p>
                      <p className="text-sm text-slate-500 font-medium">{contact.role}</p>
                    </div>
                    <div className="flex gap-2">
                      <a href={`tel:${contact.phone}`} className="p-3 bg-green-100 text-green-700 rounded-full active:scale-95 transition-transform">
                        <Phone size={18} />
                      </a>
                      <a href={`sms:${contact.phone}`} className="p-3 bg-blue-100 text-blue-700 rounded-full active:scale-95 transition-transform">
                        <MessageSquare size={18} />
                      </a>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Vendor Contacts for Current Tour */}
            {vendorContacts.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <h3 className="text-lg font-bold text-paila-blue mb-4">Tour Vendors</h3>
                <div className="space-y-3">
                  {vendorContacts.map((contact, i) => (
                    <button
                      key={i}
                      onClick={() => openCallModal(contact)}
                      className="w-full flex items-center gap-4 p-4 hover:bg-slate-50 rounded-2xl active:scale-[0.98] transition-transform"
                    >
                      <div className={`w-12 h-12 ${contact.color} rounded-full flex items-center justify-center text-white shadow-md`}>
                        {contact.icon}
                      </div>
                      <div className="flex-1 text-left min-w-0">
                        <p className="text-base font-bold text-slate-900 truncate">{contact.name}</p>
                        <p className="text-sm text-slate-500 font-medium">{contact.role}</p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <a href={`tel:${contact.phone}`} className="p-3 bg-green-100 text-green-700 rounded-full active:scale-95 transition-transform">
                          <Phone size={18} />
                        </a>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab: Expenses */}
        {activeTab === 'expenses' && (
          <div className="space-y-5 animate-fade-in">
            {/* Expense Summary */}
            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-6 text-white shadow-lg">
              <p className="text-sm text-green-100 mb-2 font-semibold">Total Spot Expenses</p>
              <p className="text-3xl font-bold">NPR {spotExpenses.reduce((s, e) => s + e.amount, 0).toLocaleString()}</p>
              <p className="text-sm text-green-100 mt-2 font-medium">{spotExpenses.length} disbursements recorded</p>
            </div>

            {/* Add Expense Button */}
            <button
              onClick={() => setShowExpenseModal(true)}
              className="w-full flex items-center justify-center gap-3 py-5 bg-paila-orange text-white rounded-2xl font-bold text-base shadow-lg active:scale-[0.98] transition-transform"
            >
              <Plus size={22} />
              Record New Expense
            </button>

            {/* Expense List */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100">
                <h3 className="text-lg font-bold text-paila-blue">Expense Log</h3>
              </div>
              <div className="divide-y divide-slate-100">
                {spotExpenses.map(exp => (
                  <div key={exp.id} className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-base font-bold text-slate-900">{exp.description}</p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <span className="text-sm px-3 py-1 bg-slate-100 text-slate-700 rounded-full font-semibold">{exp.category}</span>
                          <span className="text-sm text-slate-500 font-medium">{exp.recordedAt}</span>
                          {exp.hasReceipt && (
                            <span className="text-sm px-3 py-1 bg-green-100 text-green-700 rounded-full font-semibold flex items-center gap-1">
                              <ImageIcon size={12} />
                              Receipt
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="text-lg font-bold text-green-700 shrink-0">NPR {exp.amount.toLocaleString()}</p>
                    </div>
                    {/* Receipt thumbnail */}
                    {exp.hasReceipt && exp.receiptPreview && (
                      <div className="mt-3">
                        <img 
                          src={exp.receiptPreview} 
                          alt="Receipt" 
                          className="w-24 h-24 object-cover rounded-xl border-2 border-slate-200"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {spotExpenses.length === 0 && (
                <div className="p-10 text-center">
                  <Wallet size={40} className="mx-auto text-slate-300 mb-3" />
                  <p className="text-base text-slate-500 font-medium">No expenses recorded yet</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab: Swaps */}
        {activeTab === 'swaps' && (
          <div className="space-y-5 animate-fade-in">
            {/* Swap Summary */}
            <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl p-6 text-white shadow-lg">
              <p className="text-sm text-amber-100 mb-2 font-semibold">Vendor Swaps</p>
              <p className="text-3xl font-bold">{vendorSwaps.length}</p>
              <p className="text-sm text-amber-100 mt-2 font-medium">{vendorSwaps.filter(s => s.authorized).length} authorized</p>
            </div>

            {/* New Swap Button */}
            <button
              onClick={() => setShowSwapModal(true)}
              className="w-full flex items-center justify-center gap-3 py-5 bg-paila-blue text-white rounded-2xl font-bold text-base shadow-lg active:scale-[0.98] transition-transform"
            >
              <RefreshCw size={22} />
              Authorize Vendor Swap
            </button>

            {/* Swap Log */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100">
                <h3 className="text-lg font-bold text-paila-blue">Swap History</h3>
              </div>
              <div className="divide-y divide-slate-100">
                {vendorSwaps.map(swap => (
                  <div key={swap.id} className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <span className={`text-sm px-3 py-1 rounded-full font-bold ${
                        swap.swapType === 'HOTEL' ? 'bg-blue-100 text-blue-700' :
                        swap.swapType === 'VEHICLE' ? 'bg-green-100 text-green-700' :
                        swap.swapType === 'RESTAURANT' ? 'bg-orange-100 text-orange-700' :
                        'bg-purple-100 text-purple-700'
                      }`}>
                        {swap.swapType}
                      </span>
                      {swap.authorized ? (
                        <span className="flex items-center gap-1 text-sm text-green-700 font-bold">
                          <Check size={14} /> Authorized
                        </span>
                      ) : (
                        <span className="text-sm text-amber-700 font-bold">Pending</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-base">
                      <span className="line-through text-slate-400 font-medium">{swap.originalVendor}</span>
                      <ArrowRight size={16} className="text-slate-400" />
                      <span className="font-bold text-slate-900">{swap.newVendor}</span>
                    </div>
                    <p className="text-sm text-slate-600 mt-2 font-medium">{swap.reason}</p>
                    <p className="text-sm text-slate-400 mt-1">{swap.swappedAt}</p>
                  </div>
                ))}
              </div>
              {vendorSwaps.length === 0 && (
                <div className="p-10 text-center">
                  <RefreshCw size={40} className="mx-auto text-slate-300 mb-3" />
                  <p className="text-base text-slate-500 font-medium">No vendor swaps recorded</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] z-30 no-print safe-area-bottom">
        <div className="grid grid-cols-4 max-w-7xl mx-auto">
          {[
            { id: 'cockpit' as const, label: 'Cockpit', icon: <Navigation size={24} /> },
            { id: 'contacts' as const, label: 'Contacts', icon: <Phone size={24} /> },
            { id: 'expenses' as const, label: 'Expenses', icon: <Wallet size={24} /> },
            { id: 'swaps' as const, label: 'Swaps', icon: <RefreshCw size={24} /> },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                sounds.click();
                setActiveTab(tab.id);
              }}
              className={`relative flex flex-col items-center gap-1.5 py-4 transition-all ${
                activeTab === tab.id ? 'text-[#012871]' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {activeTab === tab.id && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-[#f35500] rounded-b-full"></div>
              )}
              {tab.icon}
              <span className="text-xs font-semibold">{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Status Update Modal */}
      {showStatusModal && upcomingTour && (
        <div className="modal-backdrop flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md p-7 animate-fade-in shadow-[0_12px_32px_rgba(0,0,0,0.12)]">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-xl font-bold text-[#012871]">Update Tour Status</h3>
              <button onClick={() => setShowStatusModal(false)} className="p-3 hover:bg-slate-100 rounded-xl transition-colors">
                <X size={22} />
              </button>
            </div>
            <p className="text-base text-slate-600 mb-5 font-medium">Current: <span className="font-bold text-paila-blue">{upcomingTour.status.replace('_', ' ')}</span></p>
            <div className="space-y-3">
              {statusSteps.map(status => {
                const isCurrent = status === upcomingTour.status;
                const isNext = statusSteps.indexOf(status) === currentStatusIndex + 1;
                return (
                  <button
                    key={status}
                    onClick={() => !isCurrent && handleStatusChange(status)}
                    disabled={isCurrent || (!isNext && statusSteps.indexOf(status) > currentStatusIndex + 1)}
                    className={`w-full flex items-center justify-between p-5 rounded-2xl border-2 transition-all active:scale-[0.98] ${
                      isCurrent ? 'border-paila-blue bg-blue-50' :
                      isNext ? 'border-paila-orange bg-orange-50 hover:bg-orange-100' :
                      'border-slate-200 opacity-50 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        isCurrent ? 'bg-paila-blue text-white' :
                        isNext ? 'bg-paila-orange text-white' :
                        'bg-slate-200 text-slate-400'
                      }`}>
                        {isCurrent ? <Check size={18} /> : isNext ? <Play size={18} /> : <Clock size={18} />}
                      </div>
                      <div className="text-left">
                        <p className="text-base font-bold text-slate-900">{status.replace('_', ' ')}</p>
                        <p className="text-sm text-slate-500 font-medium">
                          {status === 'CONFIRMED' ? 'Tour is ready to depart' :
                           status === 'IN_PROGRESS' ? 'Tour is on the road' :
                           'Tour has been completed'}
                        </p>
                      </div>
                    </div>
                    {isNext && <ChevronRight size={22} className="text-paila-orange" />}
                    {isCurrent && <span className="text-sm bg-paila-blue text-white px-3 py-1 rounded-full font-bold">Current</span>}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Daily Status Update Modal */}
      {showDailyStatusModal && (
        <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md p-7 animate-fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-xl font-bold text-paila-blue">Daily Status Update</h3>
              <button onClick={() => setShowDailyStatusModal(false)} className="p-3 hover:bg-slate-100 rounded-full">
                <X size={22} />
              </button>
            </div>
            <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-4 mb-5">
              <p className="text-sm font-bold text-blue-800">📍 Day {selectedDayNumber} Update</p>
              <p className="text-sm text-blue-700 mt-1 font-medium">Report your current status for today's activities.</p>
            </div>
            <div className="space-y-3">
              <p className="text-sm font-bold text-slate-700 mb-2">Select Status:</p>
              {[
                { status: 'Departed from Base', icon: '🚌', desc: 'Started journey from starting point' },
                { status: 'Reached Hotel', icon: '🏨', desc: 'Checked into accommodation' },
                { status: 'Started Trek/Activity', icon: '🥾', desc: 'Began trekking or activity' },
                { status: 'Reached Destination', icon: '📍', desc: 'Arrived at planned destination' },
                { status: 'Group Having Meal', icon: '🍽️', desc: 'Breakfast/Lunch/Dinner in progress' },
                { status: 'Rest Stop', icon: '☕', desc: 'Break or rest period' },
                { status: 'All Safe & Well', icon: '✅', desc: 'Everyone is safe and healthy' },
                { status: 'Minor Issue', icon: '⚠️', desc: 'Small problem that needs attention' },
              ].map((item) => (
                <button
                  key={item.status}
                  onClick={() => handleDailyStatusUpdate(item.status)}
                  className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-slate-200 hover:border-paila-blue hover:bg-blue-50 transition-all active:scale-[0.98] text-left"
                >
                  <span className="text-2xl">{item.icon}</span>
                  <div className="flex-1">
                    <p className="text-base font-bold text-slate-900">{item.status}</p>
                    <p className="text-xs text-slate-500 font-medium">{item.desc}</p>
                  </div>
                </button>
              ))}
            </div>
            <div className="mt-5 pt-5 border-t border-slate-200">
              <label className="block text-sm font-bold text-slate-700 mb-2">Additional Notes (Optional)</label>
              <textarea
                rows={3}
                placeholder="Any additional information about today's progress..."
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-paila-blue/20 focus:border-paila-blue outline-none resize-none"
              />
              <button
                onClick={() => handleDailyStatusUpdate('Custom Update', 'Additional notes provided')}
                className="w-full mt-3 px-4 py-3 bg-slate-100 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-200 transition-colors active:scale-95"
              >
                Submit with Notes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Vendor Swap Modal */}
      {showSwapModal && (
        <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md p-7 animate-fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-xl font-bold text-paila-blue">Emergency Vendor Swap</h3>
              <button onClick={() => setShowSwapModal(false)} className="p-3 hover:bg-slate-100 rounded-full">
                <X size={22} />
              </button>
            </div>
            <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-4 mb-5">
              <p className="text-sm font-bold text-amber-800">⚠️ Emergency Authorization</p>
              <p className="text-sm text-amber-700 mt-1 font-medium">This swap will be logged and sent to operations for review.</p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Service Type</label>
                <select className="w-full px-4 py-4 border-2 border-slate-200 rounded-xl text-base focus:ring-2 focus:ring-paila-blue/20 focus:border-paila-blue outline-none font-medium">
                  <option value="">Select type...</option>
                  <option value="HOTEL">Hotel / Accommodation</option>
                  <option value="RESTAURANT">Restaurant / Meal Stop</option>
                  <option value="VEHICLE">Vehicle / Transport</option>
                  <option value="ACTIVITY">Activity / Permit</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Original Vendor</label>
                <select className="w-full px-4 py-4 border-2 border-slate-200 rounded-xl text-base focus:ring-2 focus:ring-paila-blue/20 focus:border-paila-blue outline-none font-medium">
                  <option value="">Select original vendor...</option>
                  {tourAllocations.map(a => (
                    <option key={a.id} value={a.vendorId}>{a.vendorName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">New Vendor</label>
                <select className="w-full px-4 py-4 border-2 border-slate-200 rounded-xl text-base focus:ring-2 focus:ring-paila-blue/20 focus:border-paila-blue outline-none font-medium">
                  <option value="">Select replacement vendor...</option>
                  {vendors.filter(v => v.isActive).map(v => (
                    <option key={v.id} value={v.id}>{v.name} ({v.category}) - {v.location}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Reason for Swap *</label>
                <textarea
                  rows={3}
                  placeholder="e.g., Original hotel fully booked due to season rush..."
                  className="w-full px-4 py-4 border-2 border-slate-200 rounded-xl text-base focus:ring-2 focus:ring-paila-blue/20 focus:border-paila-blue outline-none resize-none font-medium"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Cost Difference (NPR)</label>
                <input
                  type="number"
                  placeholder="0"
                  className="w-full px-4 py-4 border-2 border-slate-200 rounded-xl text-base focus:ring-2 focus:ring-paila-blue/20 focus:border-paila-blue outline-none font-bold"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowSwapModal(false)} className="flex-1 px-5 py-4 border-2 border-slate-200 text-slate-700 rounded-xl text-base font-bold hover:bg-slate-50 transition-colors active:scale-95">
                Cancel
              </button>
              <button onClick={handleVendorSwap} className="flex-1 px-5 py-4 bg-paila-orange text-white rounded-xl text-base font-bold hover:bg-paila-orange-light transition-colors active:scale-95 shadow-md">
                Authorize Swap
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Expense Modal */}
      {showExpenseModal && (
        <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md p-7 animate-fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-xl font-bold text-paila-blue">Record Spot Expense</h3>
              <button onClick={() => setShowExpenseModal(false)} className="p-3 hover:bg-slate-100 rounded-full">
                <X size={22} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Amount (NPR) *</label>
                <input
                  type="number"
                  placeholder="0"
                  className="w-full px-4 py-4 border-2 border-slate-200 rounded-xl text-2xl focus:ring-2 focus:ring-paila-blue/20 focus:border-paila-blue outline-none font-bold text-center"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Category</label>
                <div className="grid grid-cols-3 gap-3">
                  {['Food', 'Transport', 'Medical', 'Permit', 'Refreshments', 'Other'].map(cat => (
                    <button key={cat} className="px-3 py-3 border-2 border-slate-200 rounded-xl text-sm font-bold hover:border-paila-blue hover:bg-blue-50 transition-colors active:scale-95">
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Description *</label>
                <textarea
                  rows={2}
                  placeholder="What was this expense for?"
                  className="w-full px-4 py-4 border-2 border-slate-200 rounded-xl text-base focus:ring-2 focus:ring-paila-blue/20 focus:border-paila-blue outline-none resize-none font-medium"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Payment Method</label>
                <select className="w-full px-4 py-4 border-2 border-slate-200 rounded-xl text-base focus:ring-2 focus:ring-paila-blue/20 focus:border-paila-blue outline-none font-medium">
                  <option value="CASH">Cash (from tour fund)</option>
                  <option value="PERSONAL">Personal (to be reimbursed)</option>
                  <option value="ESEWA">eSewa</option>
                  <option value="KHALTI">Khalti</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Attach Receipt (Optional)</label>
                
                {/* Hidden file input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleReceiptUpload}
                  className="hidden"
                />
                
                {/* Upload area or preview */}
                {!receiptPreview ? (
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full px-4 py-8 border-2 border-dashed border-slate-300 rounded-2xl text-center cursor-pointer hover:border-paila-blue hover:bg-blue-50/50 transition-all active:scale-[0.98]"
                  >
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center">
                        <Camera size={32} className="text-slate-400" />
                      </div>
                      <div>
                        <p className="text-base font-bold text-slate-700">Tap to capture or upload</p>
                        <p className="text-sm text-slate-500 mt-1 font-medium">JPG, PNG up to 5MB</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="relative rounded-2xl overflow-hidden border-2 border-green-300 bg-green-50">
                    {/* Preview image */}
                    <img 
                      src={receiptPreview} 
                      alt="Receipt preview" 
                      className="w-full h-56 object-cover"
                    />
                    
                    {/* File info overlay */}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 text-white">
                          <ImageIcon size={18} />
                          <div>
                            <p className="text-sm font-bold truncate max-w-[200px]">
                              {receiptFile?.name}
                            </p>
                            <p className="text-xs opacity-90 font-medium">
                              {receiptFile && (receiptFile.size / 1024).toFixed(1)} KB
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={removeReceipt}
                          className="p-2.5 bg-red-500 hover:bg-red-600 rounded-xl transition-colors"
                          title="Remove receipt"
                        >
                          <Trash2 size={18} className="text-white" />
                        </button>
                      </div>
                    </div>
                    
                    {/* Success badge */}
                    <div className="absolute top-3 right-3 bg-green-500 text-white px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                      <Check size={14} />
                      <span className="text-sm font-bold">Uploaded</span>
                    </div>
                  </div>
                )}
                
                {/* Upload another button when preview exists */}
                {receiptPreview && (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full mt-3 px-4 py-3 border-2 border-slate-200 rounded-xl text-sm text-slate-600 font-bold hover:bg-slate-50 transition-colors flex items-center justify-center gap-2 active:scale-95"
                  >
                    <Upload size={16} />
                    Upload different image
                  </button>
                )}
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowExpenseModal(false)} className="flex-1 px-5 py-4 border-2 border-slate-200 text-slate-700 rounded-xl text-base font-bold hover:bg-slate-50 transition-colors active:scale-95">
                Cancel
              </button>
              <button onClick={handleExpense} className="flex-1 px-5 py-4 bg-green-600 text-white rounded-xl text-base font-bold hover:bg-green-700 transition-colors active:scale-95 shadow-md">
                Record Expense
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Call Modal */}
      {showCallModal && selectedCallContact && (
        <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-sm p-7 animate-fade-in text-center">
            <div className="w-24 h-24 bg-paila-blue rounded-full flex items-center justify-center mx-auto mb-5 shadow-lg">
              <Phone size={40} className="text-white" />
            </div>
            <h3 className="text-xl font-bold text-paila-blue">{selectedCallContact.name}</h3>
            <p className="text-base text-slate-600 mt-2 font-medium">{selectedCallContact.role}</p>
            <p className="text-xl font-mono font-bold text-paila-blue mt-4">{selectedCallContact.phone}</p>
            <div className="grid grid-cols-2 gap-4 mt-7">
              <a
                href={`tel:${selectedCallContact.phone}`}
                className="flex items-center justify-center gap-3 py-5 bg-green-500 text-white rounded-2xl font-bold text-base hover:bg-green-600 transition-colors active:scale-95 shadow-md"
              >
                <Phone size={22} />
                Call
              </a>
              <a
                href={`sms:${selectedCallContact.phone}`}
                className="flex items-center justify-center gap-3 py-5 bg-blue-500 text-white rounded-2xl font-bold text-base hover:bg-blue-600 transition-colors active:scale-95 shadow-md"
              >
                <MessageSquare size={22} />
                SMS
              </a>
            </div>
            <button
              onClick={() => setShowCallModal(false)}
              className="w-full mt-4 py-4 border-2 border-slate-200 text-slate-600 rounded-2xl text-base font-bold hover:bg-slate-50 transition-colors active:scale-95"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Alert Modal */}
      {showAlertModal && (
        <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md p-7 animate-fade-in">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-xl font-bold text-slate-900">Send Emergency Alert</h3>
              <button onClick={() => setShowAlertModal(false)} className="p-2 hover:bg-slate-100 rounded-full">
                <X size={22} />
              </button>
            </div>
            
            <div className="space-y-3">
              <button
                onClick={async () => {
                  if (!user || !upcomingTour) return;
                  sounds.warning();
                  await createAlert({
                    booking_id: upcomingTour.id,
                    tour_leader_id: user.id,
                    alert_type: 'EMERGENCY_SOS',
                    severity: 'CRITICAL',
                    title: 'Emergency SOS',
                    description: 'Emergency situation reported. Immediate assistance required.',
                    location: upcomingTour.itineraryDays.find(d => d.dayNumber === selectedDayNumber)?.overnightLocation || 'Unknown',
                  });
                  setShowAlertModal(false);
                  alert('Emergency SOS sent! Help is on the way.');
                }}
                className="w-full flex items-center gap-4 p-5 bg-red-50 border-2 border-red-300 rounded-2xl hover:bg-red-100 transition-colors active:scale-95"
              >
                <AlertCircle size={32} className="text-red-600" />
                <div className="text-left">
                  <p className="text-lg font-bold text-red-900">Emergency SOS</p>
                  <p className="text-sm text-red-700">Life-threatening emergency</p>
                </div>
              </button>

              <button
                onClick={async () => {
                  if (!user || !upcomingTour) return;
                  sounds.warning();
                  await createAlert({
                    booking_id: upcomingTour.id,
                    tour_leader_id: user.id,
                    alert_type: 'HIGHWAY_BLOCK',
                    severity: 'HIGH',
                    title: 'Highway Blocked',
                    description: 'Road blocked or inaccessible. Alternative route needed.',
                    location: upcomingTour.itineraryDays.find(d => d.dayNumber === selectedDayNumber)?.overnightLocation || 'Unknown',
                  });
                  setShowAlertModal(false);
                  alert('Highway block alert sent!');
                }}
                className="w-full flex items-center gap-4 p-5 bg-orange-50 border-2 border-orange-300 rounded-2xl hover:bg-orange-100 transition-colors active:scale-95"
              >
                <AlertTriangle size={32} className="text-orange-600" />
                <div className="text-left">
                  <p className="text-lg font-bold text-orange-900">Highway Block</p>
                  <p className="text-sm text-orange-700">Road blocked or inaccessible</p>
                </div>
              </button>

              <button
                onClick={async () => {
                  if (!user || !upcomingTour) return;
                  sounds.warning();
                  await createAlert({
                    booking_id: upcomingTour.id,
                    tour_leader_id: user.id,
                    alert_type: 'VEHICLE_BREAKDOWN',
                    severity: 'HIGH',
                    title: 'Vehicle Breakdown',
                    description: 'Vehicle has broken down. Mechanical assistance required.',
                    location: upcomingTour.itineraryDays.find(d => d.dayNumber === selectedDayNumber)?.overnightLocation || 'Unknown',
                  });
                  setShowAlertModal(false);
                  alert('Vehicle breakdown alert sent!');
                }}
                className="w-full flex items-center gap-4 p-5 bg-yellow-50 border-2 border-yellow-300 rounded-2xl hover:bg-yellow-100 transition-colors active:scale-95"
              >
                <Truck size={32} className="text-yellow-600" />
                <div className="text-left">
                  <p className="text-lg font-bold text-yellow-900">Vehicle Breakdown</p>
                  <p className="text-sm text-yellow-700">Mechanical failure</p>
                </div>
              </button>

              <button
                onClick={async () => {
                  if (!user || !upcomingTour) return;
                  sounds.warning();
                  await createAlert({
                    booking_id: upcomingTour.id,
                    tour_leader_id: user.id,
                    alert_type: 'VENDOR_SWAP',
                    severity: 'MEDIUM',
                    title: 'Vendor Swap Required',
                    description: 'Need to swap vendor due to operational issues.',
                    location: upcomingTour.itineraryDays.find(d => d.dayNumber === selectedDayNumber)?.overnightLocation || 'Unknown',
                  });
                  setShowAlertModal(false);
                  alert('Vendor swap alert sent!');
                }}
                className="w-full flex items-center gap-4 p-5 bg-blue-50 border-2 border-blue-300 rounded-2xl hover:bg-blue-100 transition-colors active:scale-95"
              >
                <RefreshCw size={32} className="text-blue-600" />
                <div className="text-left">
                  <p className="text-lg font-bold text-blue-900">Vendor Swap</p>
                  <p className="text-sm text-blue-700">Change vendor required</p>
                </div>
              </button>
            </div>

            <button
              onClick={() => setShowAlertModal(false)}
              className="w-full mt-5 py-4 border-2 border-slate-200 text-slate-600 rounded-2xl text-base font-bold hover:bg-slate-50 transition-colors active:scale-95"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
