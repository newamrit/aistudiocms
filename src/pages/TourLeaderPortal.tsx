import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useFieldActivity } from '../contexts/FieldActivityContext';
import { useBookings } from '../contexts/BookingContext';
import { useAlerts } from '../contexts/AlertContext';
import { useActivities } from '../contexts/ActivityContext';
import { useOperations } from '../contexts/OperationsContext';
import { useVendors } from '../contexts/VendorContext';
import { useCompanySettings } from '../contexts/CompanySettingsContext';
import { OperationAllocation, BookingStatus } from '../types';
import {
  Phone, MapPin, Clock, AlertTriangle, AlertCircle, CheckCircle, Play,
  ArrowRight, Users, Mountain, Truck, UtensilsCrossed, Building2,
  Wallet, Plus, X, Check, MessageSquare, Navigation, Sun, Moon,
  Sunrise, Sunset, ChevronRight, RefreshCw, Shield, Zap, LogOut, Camera, Upload, Image as ImageIcon, Trash2, Wifi, WifiOff, CloudOff, Mail
} from 'lucide-react';
import { useRef } from 'react';
import { sounds } from '../utils/sounds';
import { getCurrentNepalTime } from '../utils/timeFormat';
import { useSyncQueue } from '../hooks/useOfflineData';
import { initializeOfflineSupport } from '../utils/offlineDB';
import { apiClient } from '../api/tourLeaderApi';
import ThemeToggle from '../components/ThemeToggle';
import DatabaseStatusBulbs from '../components/DatabaseStatusBulbs';
import { PWAInstallPrompt } from '../components/PWAInstallPrompt';

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
  const { user, logout, usersList, refreshUsers } = useAuth();
  const { settings } = useCompanySettings();
  const { addActivity, activities } = useFieldActivity();
  const { bookings, updateBooking } = useBookings();
  const { allocations: allocationsList, updateAllocation } = useOperations();
  const { vendors } = useVendors();
  const { createAlert } = useAlerts();
  const { logActivity } = useActivities();
  const [activeTab, setActiveTab] = useState<'cockpit' | 'contacts' | 'expenses' | 'swaps'>('cockpit');

  // Sync users list from database on portal load
  useEffect(() => {
    refreshUsers();
  }, [refreshUsers]);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedNewStatus, setSelectedNewStatus] = useState<BookingStatus>('IN_PROGRESS');
  const [statusChangeNote, setStatusChangeNote] = useState<string>('');
  const [isSubmittingStatusChange, setIsSubmittingStatusChange] = useState<boolean>(false);
  const [showDailyStatusModal, setShowDailyStatusModal] = useState(false);
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showCallModal, setShowCallModal] = useState(false);
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [activityViewLimit, setActivityViewLimit] = useState<number>(5);

  // Emergency Alert Form State
  const [alertType, setAlertType] = useState<'EMERGENCY_SOS' | 'HIGHWAY_BLOCK' | 'VEHICLE_BREAKDOWN' | 'VENDOR_SWAP' | 'MEDICAL' | 'WEATHER' | 'OTHER'>('EMERGENCY_SOS');
  const [alertSeverity, setAlertSeverity] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('CRITICAL');
  const [alertTitle, setAlertTitle] = useState('Emergency SOS');
  const [alertDescription, setAlertDescription] = useState('');
  const [alertLocation, setAlertLocation] = useState('');
  const [isSubmittingAlert, setIsSubmittingAlert] = useState(false);
  const [alertSuccessToast, setAlertSuccessToast] = useState<string | null>(null);

  // Daily Status Update Form State
  const [dailyStatusType, setDailyStatusType] = useState<string>('All Safe & Well');
  const [dailyStatusDescription, setDailyStatusDescription] = useState<string>('');
  const [dailyStatusLocation, setDailyStatusLocation] = useState<string>('');
  const [dailyStatusWeather, setDailyStatusWeather] = useState<string>('Clear & Pleasant');
  const [isSubmittingDailyStatus, setIsSubmittingDailyStatus] = useState<boolean>(false);

  // Spot Expense Form State
  const [expenseAmount, setExpenseAmount] = useState<string>('');
  const [expenseCategory, setExpenseCategory] = useState<string>('Food');
  const [expenseDescription, setExpenseDescription] = useState<string>('');
  const [expensePaymentMethod, setExpensePaymentMethod] = useState<string>('CASH');
  const [isSubmittingExpense, setIsSubmittingExpense] = useState<boolean>(false);

  // Vendor Swap Form State
  const [swapServiceType, setSwapServiceType] = useState<SwapType>('HOTEL');
  const [swapOriginalVendorName, setSwapOriginalVendorName] = useState<string>('');
  const [swapSelectedNewVendorId, setSwapSelectedNewVendorId] = useState<string>('');
  const [swapNewVendorName, setSwapNewVendorName] = useState<string>('');
  const [swapNewVendorPhone, setSwapNewVendorPhone] = useState<string>('');
  const [swapNewVendorLocation, setSwapNewVendorLocation] = useState<string>('');
  const [swapReason, setSwapReason] = useState<string>('');
  const [swapCostDifference, setSwapCostDifference] = useState<string>('0');
  const [swapPaymentMethod, setSwapPaymentMethod] = useState<string>('CASH');
  const [isSubmittingSwap, setIsSubmittingSwap] = useState<boolean>(false);

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

  // Tour Leader is assigned strictly to one tour at a time
  const myAssignedTour = bookings.find(b => b.assignedTourOperatorId === user?.id && ['IN_PROGRESS', 'CONFIRMED'].includes(b.status)) 
    || bookings.find(b => b.assignedTourOperatorId === user?.id);
  const upcomingTour = myAssignedTour || null;

  // Mock expenses and swaps
  const [spotExpenses, setSpotExpenses] = useState<SpotExpense[]>([
    { id: 1, bookingId: 2, description: 'Extra water bottles for group (heat wave)', amount: 1200, category: 'Refreshments', recordedAt: '2026-01-21 14:30', recordedBy: 'Prakash Gurung', hasReceipt: true },
    { id: 2, bookingId: 2, description: 'Emergency medicine at pharmacy', amount: 850, category: 'Medical', recordedAt: '2026-01-22 09:15', recordedBy: 'Prakash Gurung', hasReceipt: true },
  ]);

  const [vendorSwaps, setVendorSwaps] = useState<VendorSwap[]>([
    { id: 1, bookingId: 2, originalVendor: 'Ghorepani Teahouse', newVendor: 'Snow Leopard Lodge', swapType: 'HOTEL', reason: 'Original teahouse fully booked due to season rush', swappedAt: '2026-01-21 16:45', swappedBy: 'Prakash Gurung', authorized: true },
  ]);

  // Expenses and swaps strictly filtered to the assigned tour currently viewed
  const visibleExpenses = spotExpenses.filter(e => upcomingTour ? e.bookingId === upcomingTour.id : false);
  const visibleSwaps = vendorSwaps.filter(s => upcomingTour ? s.bookingId === upcomingTour.id : false);

  // Get allocations for active tour
  const tourAllocations = upcomingTour
    ? allocationsList.filter(a => a.bookingId === upcomingTour.id)
    : [];

  const handleOpenSwapModal = (serviceType?: SwapType, originalName?: string) => {
    const typeToUse = serviceType || 'HOTEL';
    setSwapServiceType(typeToUse);
    
    // Find matching allocation from current tour
    const matchingAlloc = tourAllocations.find(a => a.serviceType === typeToUse);
    const origName = originalName || matchingAlloc?.vendorName || (tourAllocations[0]?.vendorName || 'Hotel Lake Star');
    setSwapOriginalVendorName(origName);

    // Find first potential candidate from registered vendors matching this service type
    const availVendors = vendors.filter(v => 
      v.isActive && 
      (typeToUse === 'ACTIVITY' ? (v.category === 'ACTIVITY' || v.category === 'GUIDE_PERMIT') : v.category === typeToUse) && 
      v.name !== origName
    );

    if (availVendors.length > 0) {
      setSwapSelectedNewVendorId(availVendors[0].id.toString());
      setSwapNewVendorName(availVendors[0].name);
      setSwapNewVendorPhone(availVendors[0].phone || '');
      setSwapNewVendorLocation(availVendors[0].location || '');
    } else {
      setSwapSelectedNewVendorId('CUSTOM');
      setSwapNewVendorName('');
      setSwapNewVendorPhone('');
      setSwapNewVendorLocation('');
    }

    setSwapReason('');
    setSwapCostDifference('0');
    setSwapPaymentMethod('CASH');
    setShowSwapModal(true);
  };

  const handleSwapServiceTypeChange = (type: SwapType) => {
    setSwapServiceType(type);
    const matchingAlloc = tourAllocations.find(a => a.serviceType === type);
    const orig = matchingAlloc?.vendorName || (tourAllocations[0]?.vendorName || '');
    setSwapOriginalVendorName(orig);
    
    const matchingNew = vendors.filter(v => 
      v.isActive && 
      (type === 'ACTIVITY' ? (v.category === 'ACTIVITY' || v.category === 'GUIDE_PERMIT') : v.category === type) && 
      v.name !== orig
    );

    if (matchingNew.length > 0) {
      setSwapSelectedNewVendorId(matchingNew[0].id.toString());
      setSwapNewVendorName(matchingNew[0].name);
      setSwapNewVendorPhone(matchingNew[0].phone || '');
      setSwapNewVendorLocation(matchingNew[0].location || '');
    } else {
      setSwapSelectedNewVendorId('CUSTOM');
      setSwapNewVendorName('');
      setSwapNewVendorPhone('');
      setSwapNewVendorLocation('');
    }
  };

  const handleSelectNewVendorPreset = (selectedVal: string) => {
    setSwapSelectedNewVendorId(selectedVal);
    if (selectedVal === 'CUSTOM') {
      setSwapNewVendorName('');
      setSwapNewVendorPhone('');
      setSwapNewVendorLocation('');
    } else {
      const found = vendors.find(v => v.id.toString() === selectedVal);
      if (found) {
        setSwapNewVendorName(found.name);
        setSwapNewVendorPhone(found.phone || '');
        setSwapNewVendorLocation(found.location || '');
      }
    }
  };

  const statusSteps: TourStatus[] = ['CONFIRMED', 'IN_PROGRESS', 'COMPLETED'];
  const currentStatusIndex = upcomingTour ? statusSteps.indexOf(upcomingTour.status as TourStatus) : -1;

  // Dynamic Office & Admin Staff (Zero hardcoding - synced with Settings & Database Users)
  const activeOfficeStaff = (usersList || [])
    .filter(u => u.isActive && (u.role === 'SUPER_ADMIN' || u.role === 'OPERATIONS' || u.role === 'SALES'))
    .sort((a, b) => {
      const order: Record<string, number> = { 'SUPER_ADMIN': 1, 'OPERATIONS': 2, 'SALES': 3 };
      return (order[a.role] || 99) - (order[b.role] || 99);
    });

  const primaryAdmin = activeOfficeStaff.find(u => u.role === 'SUPER_ADMIN') || usersList.find(u => u.role === 'SUPER_ADMIN');
  const primaryOps = activeOfficeStaff.find(u => u.role === 'OPERATIONS') || usersList.find(u => u.role === 'OPERATIONS');

  // Dynamic Speed-dial contacts
  const speedDialContacts = [
    ...(upcomingTour?.clientPhone ? [{
      name: upcomingTour.clientName.split(' ')[0] || 'Client',
      phone: upcomingTour.clientPhone,
      role: `Client: ${upcomingTour.clientName}`,
      icon: <Users size={20} />,
      color: 'bg-blue-500'
    }] : []),
    {
      name: 'Office HQ',
      phone: settings.phone || '+977-1-4123456',
      role: `${settings.companyName || 'Paila Nepal'} (Main Desk)`,
      icon: <Building2 size={20} />,
      color: 'bg-purple-500'
    },
    {
      name: primaryAdmin?.name ? primaryAdmin.name.split(' ')[0] : 'Admin',
      phone: primaryAdmin?.phone || settings.emergencyPhone || '+977-9841234567',
      role: `${primaryAdmin?.name || 'Administrator'} (Admin)`,
      icon: <Shield size={20} />,
      color: 'bg-paila-blue'
    },
    ...(primaryOps ? [{
      name: primaryOps.name.split(' ')[0],
      phone: primaryOps.phone || settings.phone || '+977-1-4123456',
      role: `${primaryOps.name} (Operations)`,
      icon: <Truck size={20} />,
      color: 'bg-emerald-600'
    }] : []),
    {
      name: 'Police',
      phone: '100',
      role: 'Nepal Police',
      icon: <AlertTriangle size={20} />,
      color: 'bg-red-500'
    },
    {
      name: 'Ambulance',
      phone: '102',
      role: 'Emergency Medical',
      icon: <Zap size={20} />,
      color: 'bg-orange-500'
    },
    {
      name: 'Tourism Board',
      phone: '+977-1-4248669',
      role: 'Nepal Tourism Helpline',
      icon: <Mountain size={20} />,
      color: 'bg-green-500'
    },
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

  const handleOpenStatusModal = () => {
    if (upcomingTour) {
      const defaultTarget: BookingStatus = 
        upcomingTour.status === 'CONFIRMED' ? 'IN_PROGRESS' :
        upcomingTour.status === 'IN_PROGRESS' ? 'COMPLETED' : 'CONFIRMED';
      setSelectedNewStatus(defaultTarget);
      setStatusChangeNote('');
      setShowStatusModal(true);
    }
  };

  const handleStatusChange = async (targetStatus?: BookingStatus) => {
    if (!upcomingTour || !user) return;
    const newStatus = targetStatus || selectedNewStatus;
    const oldStatus = upcomingTour.status;

    setIsSubmittingStatusChange(true);

    try {
      // 1. Update Booking Context State
      updateBooking(upcomingTour.id, {
        status: newStatus,
        notes: statusChangeNote.trim() 
          ? `${upcomingTour.notes ? `${upcomingTour.notes}\n` : ''}[${new Date().toLocaleDateString()}] Status updated to ${newStatus} by ${user.name}: ${statusChangeNote.trim()}` 
          : upcomingTour.notes,
      });

      // 2. Add to Tour Leader field activity
      addActivity({
        type: 'STATUS_CHANGE',
        tourLeaderId: user.id,
        tourLeaderName: user.name,
        bookingId: upcomingTour.id,
        bookingCode: upcomingTour.bookingCode,
        clientName: upcomingTour.clientName,
        title: `Tour Status Changed: ${newStatus.replace('_', ' ')}`,
        description: `Tour status transitioned from ${oldStatus.replace('_', ' ')} to ${newStatus.replace('_', ' ')}.${statusChangeNote.trim() ? ` Field Note: "${statusChangeNote.trim()}"` : ''}`,
        metadata: { fromStatus: oldStatus, toStatus: newStatus, notes: statusChangeNote.trim() },
        priority: newStatus === 'IN_PROGRESS' ? 'MEDIUM' : newStatus === 'COMPLETED' ? 'LOW' : 'HIGH'
      });

      // 3. Log to Super Admin operations stream
      logActivity({
        type: 'BOOKING_STATUS_CHANGE',
        category: 'OPERATIONS',
        title: `🏁 Tour Status Updated: ${upcomingTour.bookingCode} ➔ ${newStatus.replace('_', ' ')}`,
        description: `${user.name} changed status of ${upcomingTour.bookingCode} (${upcomingTour.clientName}) from ${oldStatus} to ${newStatus}.${statusChangeNote.trim() ? ` Field note: ${statusChangeNote.trim()}` : ''}`,
        actor: {
          name: user.name,
          email: user.email,
          role: 'TOUR_OPERATOR',
        },
        metadata: {
          bookingId: upcomingTour.id,
          bookingCode: upcomingTour.bookingCode,
          clientName: upcomingTour.clientName,
          details: `Status: ${oldStatus} -> ${newStatus}`,
        },
      });

      sounds.success();
      setAlertSuccessToast(`Tour status updated to ${newStatus.replace('_', ' ')}!`);
      setTimeout(() => setAlertSuccessToast(null), 5000);
      setShowStatusModal(false);
    } catch (err) {
      console.error('Failed to change tour status:', err);
      alert('Failed to update tour status. Please try again.');
    } finally {
      setIsSubmittingStatusChange(false);
    }
  };

  const handleOpenDailyStatusModal = () => {
    const currentLoc = upcomingTour?.itineraryDays?.find(d => d.dayNumber === selectedDayNumber)?.overnightLocation 
      || upcomingTour?.packageName 
      || 'Current Route Stop';
    setDailyStatusType('All Safe & Well');
    setDailyStatusLocation(currentLoc);
    setDailyStatusWeather('Clear & Pleasant');
    setDailyStatusDescription('All group members are fit and healthy. Today\'s schedule is running smoothly on track.');
    setShowDailyStatusModal(true);
  };

  const handleSelectDailyStatusPreset = (status: string, defaultDesc: string) => {
    setDailyStatusType(status);
    if (!dailyStatusDescription || [
      'All group members are fit and healthy',
      'Group departed on schedule',
      'Group arrived safely at accommodation',
      'Trek commenced on schedule',
      'Reached destination checkpoint safely',
      'Group enjoying scheduled meal break',
      'Brief rest and hydration stop',
      'Minor delay or itinerary adjustment',
    ].some(prefix => dailyStatusDescription.toLowerCase().includes(prefix.toLowerCase()))) {
      setDailyStatusDescription(defaultDesc);
    }
  };

  const handleSubmitDailyStatusUpdate = async () => {
    if (!user) return;
    if (!dailyStatusDescription.trim()) {
      alert('Please enter a description or notes for the daily update.');
      return;
    }

    setIsSubmittingDailyStatus(true);
    try {
      const finalDesc = dailyStatusDescription.trim();
      const targetTour = upcomingTour || bookings.find(b => b.assignedTourOperatorId === user.id) || bookings[0];
      const finalLoc = dailyStatusLocation.trim() || targetTour?.itineraryDays?.find(d => d.dayNumber === selectedDayNumber)?.overnightLocation || `Day ${selectedDayNumber} Checkpoint`;

      // 1. Add to local tour activity feed
      addActivity({
        type: 'CHECK_IN',
        tourLeaderId: user.id,
        tourLeaderName: user.name,
        bookingId: targetTour ? targetTour.id : 0,
        bookingCode: targetTour ? targetTour.bookingCode : 'FIELD-UPDATE',
        clientName: targetTour ? targetTour.clientName : 'Field Operations Checkpoint',
        title: `Day ${selectedDayNumber} Check-In: ${dailyStatusType}`,
        description: finalDesc,
        metadata: { 
          dailyStatus: dailyStatusType,
          dayNumber: selectedDayNumber,
          location: finalLoc,
          weather: dailyStatusWeather,
          notes: finalDesc
        },
        priority: dailyStatusType === 'Minor Issue' ? 'MEDIUM' : 'LOW'
      });

      // 2. Log to Super Admin recent activities audit stream
      logActivity({
        type: 'FIELD_CHECKPOINT',
        category: 'OPERATIONS',
        title: `📍 Day ${selectedDayNumber} Check-In: ${dailyStatusType}`,
        description: finalDesc,
        actor: {
          name: user.name,
          email: user.email,
          role: 'TOUR_OPERATOR',
        },
        metadata: {
          bookingId: targetTour?.id,
          bookingCode: targetTour?.bookingCode,
          clientName: targetTour?.clientName,
          location: finalLoc,
          details: `Status: ${dailyStatusType} • Weather: ${dailyStatusWeather}`,
        },
      });

      sounds.success();
      setShowDailyStatusModal(false);
      setAlertSuccessToast(`Day ${selectedDayNumber} Update "${dailyStatusType}" recorded with field notes!`);
      setTimeout(() => setAlertSuccessToast(null), 5000);
    } catch (err) {
      console.error('Failed to submit daily update:', err);
      alert('Failed to submit daily update. Please try again.');
    } finally {
      setIsSubmittingDailyStatus(false);
    }
  };

  const handleVendorSwap = async () => {
    if (!upcomingTour || !user) return;

    if (!swapOriginalVendorName.trim()) {
      alert('Please select or specify the original vendor to be swapped.');
      return;
    }

    if (!swapNewVendorName.trim()) {
      alert('Please enter or choose the new vendor name.');
      return;
    }

    if (!swapReason.trim()) {
      alert('Please provide the operational reason for this vendor swap.');
      return;
    }

    setIsSubmittingSwap(true);

    try {
      const origName = swapOriginalVendorName.trim();
      const newName = swapNewVendorName.trim();
      const costDiff = parseFloat(swapCostDifference) || 0;
      const formattedTime = new Date().toISOString().replace('T', ' ').substring(0, 16);

      // 1. Add to Vendor Swaps history
      const newSwap: VendorSwap = {
        id: Date.now(),
        bookingId: upcomingTour.id,
        originalVendor: origName,
        newVendor: newName,
        swapType: swapServiceType,
        reason: swapReason.trim(),
        swappedAt: formattedTime,
        swappedBy: user.name,
        authorized: true,
      };

      setVendorSwaps(prev => [newSwap, ...prev]);

      // 2. Update allocation so database, day schedule & contacts reflect the new vendor name
      const targetAlloc = allocationsList.find(a => a.bookingId === upcomingTour.id && (a.vendorName === origName || a.serviceType === swapServiceType));
      if (targetAlloc) {
        updateAllocation(targetAlloc.id, {
          vendorName: newName,
          fieldUpdatedByOperator: true,
          specialNotes: `${targetAlloc.specialNotes ? `${targetAlloc.specialNotes} | ` : ''}Emergency Swapped from ${origName}: ${swapReason.trim()}`,
        });
      }

      // 3. Add to field activity context for live operator recent activity feed
      addActivity({
        type: 'VENDOR_SWAP',
        tourLeaderId: user.id,
        tourLeaderName: user.name,
        bookingId: upcomingTour.id,
        bookingCode: upcomingTour.bookingCode,
        clientName: upcomingTour.clientName,
        title: `Vendor Swapped: ${origName} ➔ ${newName}`,
        description: `Emergency ${swapServiceType} swap: ${swapReason.trim()}${costDiff !== 0 ? ` • Cost Diff: NPR ${costDiff > 0 ? `+${costDiff}` : costDiff}` : ''}`,
        metadata: {
          originalVendor: origName,
          newVendor: newName,
          serviceType: swapServiceType,
          reason: swapReason.trim(),
          costDifference: costDiff,
          paymentMethod: swapPaymentMethod,
          contactPhone: swapNewVendorPhone,
          location: swapNewVendorLocation,
        },
        priority: 'MEDIUM',
      });

      // 4. Log to Super Admin operations audit stream
      logActivity({
        type: 'VENDOR_ALLOCATION',
        category: 'OPERATIONS',
        title: `🔄 Vendor Swapped: ${origName} ➔ ${newName}`,
        description: `Day ${selectedDayNumber} • ${swapServiceType}: ${swapReason.trim()}`,
        actor: {
          name: user.name,
          email: user.email,
          role: 'TOUR_OPERATOR',
        },
        metadata: {
          bookingId: upcomingTour.id,
          bookingCode: upcomingTour.bookingCode,
          clientName: upcomingTour.clientName,
          vendorName: newName,
          details: `Original: ${origName} • Reason: ${swapReason.trim()} • By ${user.name}`,
        },
      });

      // 5. Offline Sync or API sync
      const swapData = {
        booking_id: upcomingTour.id,
        day_number: selectedDayNumber,
        original_vendor_name: origName,
        new_vendor_name: newName,
        service_type: swapServiceType,
        reason: swapReason.trim(),
        cost_difference: costDiff,
        payment_method: swapPaymentMethod,
        contact_phone: swapNewVendorPhone,
        location: swapNewVendorLocation,
      };

      if (!navigator.onLine) {
        const { SyncQueue } = await import('../utils/offlineDB');
        await SyncQueue.add('/api/tour-leader/swap-vendor', 'POST', swapData);
        sounds.warning();
      } else {
        try {
          await apiClient.post('/tour-leader/swap-vendor', swapData);
          sounds.success();
        } catch {
          const { SyncQueue } = await import('../utils/offlineDB');
          await SyncQueue.add('/api/tour-leader/swap-vendor', 'POST', swapData);
          sounds.warning();
        }
      }

      setAlertSuccessToast(`Vendor swap to "${newName}" authorized & recorded!`);
      setTimeout(() => setAlertSuccessToast(null), 5000);
      setShowSwapModal(false);
    } catch (err) {
      console.error('Failed to authorize vendor swap:', err);
      alert('Failed to authorize vendor swap. Please try again.');
    } finally {
      setIsSubmittingSwap(false);
    }
  };

  const handleExpense = async () => {
    if (!upcomingTour || !user) return;

    const parsedAmount = parseFloat(expenseAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      alert('Please enter a valid expense amount in NPR.');
      return;
    }

    if (!expenseDescription.trim()) {
      alert('Please enter a description for the expense.');
      return;
    }

    setIsSubmittingExpense(true);

    try {
      const formattedTime = new Date().toISOString().replace('T', ' ').substring(0, 16);
      const newExpense: SpotExpense = {
        id: Date.now(),
        bookingId: upcomingTour.id,
        description: expenseDescription.trim(),
        amount: parsedAmount,
        category: expenseCategory,
        recordedAt: formattedTime,
        recordedBy: user.name,
        hasReceipt: !!receiptFile,
        receiptPreview: receiptPreview || undefined,
      };

      setSpotExpenses(prev => [newExpense, ...prev]);

      const expenseData = {
        booking_id: upcomingTour.id,
        day_number: selectedDayNumber,
        title: `${expenseCategory} Expense: NPR ${parsedAmount.toLocaleString()}`,
        category: expenseCategory,
        amount: parsedAmount,
        payment_method: expensePaymentMethod,
        notes: expenseDescription.trim(),
        receipt_image_url: receiptPreview || undefined
      };

      // Add to field activity context for live timeline and recent activity feed
      addActivity({
        type: 'SPOT_EXPENSE',
        tourLeaderId: user.id,
        tourLeaderName: user.name,
        bookingId: upcomingTour.id,
        bookingCode: upcomingTour.bookingCode,
        clientName: upcomingTour.clientName,
        title: `Spot Expense: NPR ${parsedAmount.toLocaleString()} (${expenseCategory})`,
        description: expenseDescription.trim(),
        metadata: { 
          amount: parsedAmount, 
          category: expenseCategory,
          paymentMethod: expensePaymentMethod,
          hasReceipt: !!receiptFile,
          receiptName: receiptFile?.name || null
        },
        priority: 'MEDIUM'
      });

      // Log to Super Admin activity audit
      logActivity({
        type: 'VENDOR_PAYMENT',
        category: 'PAYMENT',
        title: `💸 Spot Expense: NPR ${parsedAmount.toLocaleString()} (${expenseCategory})`,
        description: `${expenseDescription.trim()} (Method: ${expensePaymentMethod})`,
        actor: {
          name: user.name,
          email: user.email,
          role: 'TOUR_OPERATOR',
        },
        metadata: {
          bookingId: upcomingTour.id,
          bookingCode: upcomingTour.bookingCode,
          clientName: upcomingTour.clientName,
          amount: parsedAmount,
          paymentMode: expensePaymentMethod,
          details: `Category: ${expenseCategory} • Logged by ${user.name}`,
        },
      });

      // Queue for sync if offline, or execute immediately if online
      if (!navigator.onLine) {
        const { SyncQueue } = await import('../utils/offlineDB');
        await SyncQueue.add('/api/tour-leader/log-expense', 'POST', expenseData);
        sounds.cashRegister();
      } else {
        try {
          await apiClient.post('/tour-leader/log-expense', expenseData);
          sounds.cashRegister();
        } catch {
          // If API call fails, queue for retry
          const { SyncQueue } = await import('../utils/offlineDB');
          await SyncQueue.add('/api/tour-leader/log-expense', 'POST', expenseData);
          sounds.cashRegister();
        }
      }

      setShowExpenseModal(false);
      setAlertSuccessToast(`Recorded NPR ${parsedAmount.toLocaleString()} (${expenseCategory}) spot expense!`);
      setTimeout(() => setAlertSuccessToast(null), 5000);

      // Reset expense state
      setExpenseAmount('');
      setExpenseDescription('');
      setExpenseCategory('Food');
      setExpensePaymentMethod('CASH');
      setReceiptFile(null);
      setReceiptPreview(null);
    } catch (err) {
      console.error('Failed to submit expense:', err);
      alert('Failed to record expense. Please try again.');
    } finally {
      setIsSubmittingExpense(false);
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

  const handleOpenAlertModal = (initialType: 'EMERGENCY_SOS' | 'HIGHWAY_BLOCK' | 'VEHICLE_BREAKDOWN' | 'VENDOR_SWAP' | 'MEDICAL' | 'WEATHER' | 'OTHER' = 'EMERGENCY_SOS') => {
    const currentLoc = upcomingTour?.itineraryDays?.find(d => d.dayNumber === selectedDayNumber)?.overnightLocation 
      || upcomingTour?.packageName 
      || 'Current Route Location';
    setAlertType(initialType);
    setAlertLocation(currentLoc);

    if (initialType === 'EMERGENCY_SOS') {
      setAlertSeverity('CRITICAL');
      setAlertTitle('Emergency SOS');
      setAlertDescription('Urgent life-safety emergency reported. Immediate operations intervention and assistance required.');
    } else if (initialType === 'MEDICAL') {
      setAlertSeverity('CRITICAL');
      setAlertTitle('Medical Emergency / Altitude Sickness (AMS)');
      setAlertDescription('Trekker exhibiting severe altitude sickness symptoms / injury. Administering first aid, evaluating emergency helicopter evacuation.');
    } else if (initialType === 'HIGHWAY_BLOCK') {
      setAlertSeverity('HIGH');
      setAlertTitle('Highway / Road Inaccessible');
      setAlertDescription('Highway route blocked due to landslide/debris. Transport halted, requesting alternative itinerary clearance.');
    } else if (initialType === 'VEHICLE_BREAKDOWN') {
      setAlertSeverity('HIGH');
      setAlertTitle('Vehicle Breakdown');
      setAlertDescription('Tour transport vehicle has suffered mechanical failure. Mechanical assistance or replacement vehicle required.');
    } else if (initialType === 'WEATHER') {
      setAlertSeverity('HIGH');
      setAlertTitle('Severe Weather Hazard');
      setAlertDescription('Adverse weather condition (heavy blizzard / flash storm). Trekking paused, all guests safely sheltered.');
    } else if (initialType === 'VENDOR_SWAP') {
      setAlertSeverity('MEDIUM');
      setAlertTitle('Vendor / Lodge Reallocation');
      setAlertDescription('Allocated teahouse / vehicle vendor unavailable. Reallocating to alternate service partner.');
    } else {
      setAlertSeverity('MEDIUM');
      setAlertTitle('Operational Alert');
      setAlertDescription('');
    }

    setShowAlertModal(true);
  };

  const handleSelectAlertType = (type: 'EMERGENCY_SOS' | 'HIGHWAY_BLOCK' | 'VEHICLE_BREAKDOWN' | 'VENDOR_SWAP' | 'MEDICAL' | 'WEATHER' | 'OTHER') => {
    setAlertType(type);
    if (type === 'EMERGENCY_SOS') {
      setAlertSeverity('CRITICAL');
      setAlertTitle('Emergency SOS');
      setAlertDescription('Urgent life-safety emergency reported. Immediate operations intervention and assistance required.');
    } else if (type === 'MEDICAL') {
      setAlertSeverity('CRITICAL');
      setAlertTitle('Medical Emergency / Altitude Sickness (AMS)');
      setAlertDescription('Trekker exhibiting severe altitude sickness symptoms / injury. Administering first aid, evaluating emergency helicopter evacuation.');
    } else if (type === 'HIGHWAY_BLOCK') {
      setAlertSeverity('HIGH');
      setAlertTitle('Highway / Road Inaccessible');
      setAlertDescription('Highway route blocked due to landslide/debris. Transport halted, requesting alternative itinerary clearance.');
    } else if (type === 'VEHICLE_BREAKDOWN') {
      setAlertSeverity('HIGH');
      setAlertTitle('Vehicle Breakdown');
      setAlertDescription('Tour transport vehicle has suffered mechanical failure. Mechanical assistance or replacement vehicle required.');
    } else if (type === 'WEATHER') {
      setAlertSeverity('HIGH');
      setAlertTitle('Severe Weather Hazard');
      setAlertDescription('Adverse weather condition (heavy blizzard / flash storm). Trekking paused, all guests safely sheltered.');
    } else if (type === 'VENDOR_SWAP') {
      setAlertSeverity('MEDIUM');
      setAlertTitle('Vendor / Lodge Reallocation');
      setAlertDescription('Allocated teahouse / vehicle vendor unavailable. Reallocating to alternate service partner.');
    } else {
      setAlertSeverity('MEDIUM');
      setAlertTitle('Operational Alert');
      setAlertDescription('');
    }
  };

  const handleSendEmergencyAlert = async () => {
    if (!user) return;
    if (!alertDescription.trim()) {
      alert('Please enter a description for the emergency alert.');
      return;
    }

    try {
      setIsSubmittingAlert(true);
      sounds.warning();

      const finalLocation = alertLocation.trim() || upcomingTour?.itineraryDays?.find(d => d.dayNumber === selectedDayNumber)?.overnightLocation || 'Current Route Location';

      const newAlertId = await createAlert({
        booking_id: upcomingTour ? upcomingTour.id : null,
        tour_leader_id: user.id,
        tour_leader_name: user.name,
        tour_leader_phone: user.phone || '+977-9841234567',
        booking_code: upcomingTour?.bookingCode,
        client_name: upcomingTour?.clientName,
        alert_type: alertType,
        severity: alertSeverity,
        title: alertTitle.trim() || 'Emergency Alert',
        description: alertDescription.trim(),
        location: finalLocation,
      });

      // 1. Add to field activities for tour operator portal recent activity
      addActivity({
        type: 'EMERGENCY_ALERT',
        tourLeaderId: user.id,
        tourLeaderName: user.name,
        bookingId: upcomingTour ? upcomingTour.id : 0,
        bookingCode: upcomingTour ? upcomingTour.bookingCode : 'FIELD-SOS',
        clientName: upcomingTour ? upcomingTour.clientName : 'Field Emergency Broadcast',
        title: `🚨 ${alertSeverity} Alert: ${alertTitle.trim() || 'Emergency Alert'}`,
        description: alertDescription.trim(),
        metadata: {
          alertId: newAlertId,
          alertType: alertType,
          severity: alertSeverity,
          location: finalLocation,
        },
        priority: alertSeverity === 'CRITICAL' ? 'CRITICAL' : alertSeverity === 'HIGH' ? 'HIGH' : 'MEDIUM',
      });

      // 2. Log to ActivityContext audit stream for Super Admin
      logActivity({
        type: 'FIELD_ALERT',
        category: 'ALERT',
        title: `🚨 ${alertSeverity} Alert: ${alertTitle.trim() || 'Emergency Alert'}`,
        description: alertDescription.trim(),
        actor: {
          name: user.name,
          email: user.email,
          role: 'TOUR_OPERATOR',
        },
        metadata: {
          bookingId: upcomingTour?.id,
          bookingCode: upcomingTour?.bookingCode,
          clientName: upcomingTour?.clientName,
          location: finalLocation,
          details: `Severity: ${alertSeverity} • Ref: Alert #${newAlertId}`,
        },
      });

      setShowAlertModal(false);
      setAlertSuccessToast(`Emergency Alert "${alertTitle.trim() || 'Emergency'}" dispatched to Operations HQ & Super Admin!`);
      setTimeout(() => setAlertSuccessToast(null), 6000);
    } catch (err) {
      console.error('Failed to create alert:', err);
      alert('Failed to send alert. Please try again.');
    } finally {
      setIsSubmittingAlert(false);
    }
  };

  if (!user) return null;

  return (
    <div className="w-full min-h-screen bg-slate-50 flex flex-col">
      {/* Mobile Header */}
      <header className="bg-gradient-to-br from-[#012871] to-[#0a3d99] text-white sticky top-0 z-30 shadow-xl">
        <div className="px-3.5 py-3 sm:px-5 sm:py-4">
          <div className="flex items-center justify-between gap-2">
            {/* User Profile / Tour Leader Info */}
            <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
              <div className="relative shrink-0">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-[#f35500] to-[#d94b00] rounded-full flex items-center justify-center font-bold text-sm sm:text-base shadow-md shadow-orange-500/30">
                  {user.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 sm:w-3.5 sm:h-3.5 bg-emerald-500 rounded-full ring-2 ring-[#012871]"></div>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-[10px] sm:text-xs text-blue-200 font-medium uppercase tracking-wider">Tour Leader</p>
                  <span className="inline-flex sm:hidden items-center gap-1 text-[9px] font-semibold text-emerald-300 bg-emerald-500/20 px-1.5 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    Duty
                  </span>
                </div>
                <p className="text-sm sm:text-base font-bold truncate">{user.name.split(' ')[0]}</p>
              </div>
            </div>

            {/* Right Header Actions: Compact & completely in-frame on all screen sizes */}
            <div className="flex items-center gap-1 sm:gap-2 shrink-0">
              {/* Offline/Sync Status Indicator */}
              {isOffline && (
                <div className="flex items-center gap-1 bg-red-500/20 border border-red-400/50 px-2 py-1 rounded-full animate-pulse text-[10px] sm:text-xs font-semibold text-red-200">
                  <WifiOff size={12} className="text-red-300" />
                  <span className="hidden xs:inline">Offline</span>
                </div>
              )}
              
              {/* Sync Queue Indicator */}
              {syncStats.total > 0 && (
                <button
                  onClick={syncNow}
                  disabled={syncing || isOffline}
                  className="flex items-center gap-1 bg-amber-500/20 border border-amber-400/50 px-2 py-1 rounded-full hover:bg-amber-500/30 transition-colors disabled:opacity-50 text-[10px] sm:text-xs font-semibold text-amber-200"
                  title={syncing ? 'Syncing...' : `${syncStats.total} pending sync`}
                >
                  {syncing ? (
                    <RefreshCw size={12} className="text-amber-300 animate-spin" />
                  ) : (
                    <CloudOff size={12} className="text-amber-300" />
                  )}
                  <span>{syncStats.total}</span>
                </button>
              )}

              {/* PWA Install Button */}
              <PWAInstallPrompt bannerVariant="compact" />

              {/* Two Glowing Bulbs for Database & Cloud Sync */}
              <div className="shrink-0 scale-90 sm:scale-100 origin-right">
                <DatabaseStatusBulbs
                  theme="dark"
                  interactive={true}
                  isSyncing={syncing}
                  pendingCount={syncStats.total}
                  onSyncNow={syncNow}
                />
              </div>

              {/* Clock (Visible on Tablet/Desktop to save space on mobile) */}
              <div className="hidden md:flex items-center gap-1.5 bg-white/10 px-2.5 py-1.5 rounded-full text-xs font-semibold">
                <Clock size={13} />
                <span>{currentTime}</span>
              </div>

              {/* On Duty Pill (Visible on sm screens and up) */}
              <div className="hidden sm:flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-full text-xs font-semibold">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <span>On Duty</span>
              </div>

              {/* Sync / Refresh Button */}
              <button
                type="button"
                onClick={async () => {
                  sounds.click();
                  await refreshUsers();
                  if (syncStats.total > 0 && !isOffline) {
                    syncNow();
                  }
                }}
                className="p-1.5 sm:p-2 hover:bg-white/15 active:bg-white/20 rounded-xl transition-colors text-white"
                title="Sync & Refresh"
                aria-label="Sync & Refresh"
              >
                <RefreshCw size={17} className={syncing ? 'animate-spin' : ''} />
              </button>

              {/* Dark/Light Mode Toggle */}
              <div className="shrink-0">
                <ThemeToggle variant="button" className="!p-1.5 sm:!p-2 !bg-white/10 !border-white/20 !text-white hover:!bg-white/20 !rounded-xl" />
              </div>

              {/* Logout Button */}
              <button 
                type="button"
                onClick={logout}
                className="p-1.5 sm:p-2 hover:bg-red-500/30 active:bg-red-500/40 bg-red-500/15 rounded-xl transition-colors text-red-200 hover:text-white border border-red-400/30 shrink-0"
                title="Logout"
                aria-label="Logout"
              >
                <LogOut size={17} />
              </button>
            </div>
          </div>
        </div>

        {/* Current Tour Banner */}
        {upcomingTour ? (
          <div className="px-5 pb-5">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/15 shadow-xl">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-mono text-blue-100 font-semibold">{upcomingTour.bookingCode}</span>
                </div>
                <span className={`px-4 py-1.5 text-sm font-bold rounded-full shadow-lg ${
                  upcomingTour.status === 'IN_PROGRESS' ? 'bg-emerald-500 text-white shadow-emerald-500/30' :
                  upcomingTour.status === 'CONFIRMED' ? 'bg-blue-400 text-white shadow-blue-400/30' :
                  upcomingTour.status === 'COMPLETED' ? 'bg-purple-500 text-white shadow-purple-500/30' :
                  'bg-rose-500 text-white shadow-rose-500/30'
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
        ) : (
          <div className="px-5 pb-5">
            <div className="bg-amber-500/20 backdrop-blur-md rounded-2xl p-4 border border-amber-300/30 text-white shadow-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-400/30 flex items-center justify-center shrink-0">
                  <Shield size={20} className="text-amber-200" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">No Assigned Tours</p>
                  <p className="text-xs text-blue-100 mt-0.5">
                    You can only view and update tours that are specifically assigned to your account.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 px-5 py-6 space-y-6 pb-28">
        {/* Mobile PWA Install Banner */}
        <PWAInstallPrompt bannerVariant="banner" />

        {/* Success Alert Banner */}
        {alertSuccessToast && (
          <div className="bg-emerald-600 text-white p-4 rounded-2xl shadow-lg shadow-emerald-600/20 flex items-center justify-between animate-fade-in">
            <div className="flex items-center gap-3">
              <CheckCircle size={20} className="shrink-0" />
              <p className="text-sm font-semibold">{alertSuccessToast}</p>
            </div>
            <button onClick={() => setAlertSuccessToast(null)} className="p-1 hover:bg-emerald-700 rounded-lg">
              <X size={16} />
            </button>
          </div>
        )}

        {/* Tab: Cockpit */}
        {activeTab === 'cockpit' && (
          <div className="space-y-5 animate-fade-in">
            {/* Status Progression Card */}
            {upcomingTour && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-lg font-bold text-paila-blue">Tour Status</h3>
                  <button
                    onClick={handleOpenStatusModal}
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
                    onClick={handleOpenDailyStatusModal}
                    className="flex flex-col items-center justify-center gap-2 h-20 bg-blue-50 border-2 border-blue-200/60 rounded-2xl text-blue-700 hover:bg-blue-100 hover:border-blue-300 transition-all active:scale-[0.98] shadow-sm hover:shadow-md"
                  >
                    <CheckCircle size={24} />
                    <span className="text-xs font-bold">Daily Update</span>
                  </button>
                  <button
                    onClick={() => handleOpenSwapModal()}
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
                  onClick={() => handleOpenAlertModal('EMERGENCY_SOS')}
                  className="w-full mt-4 flex items-center justify-center gap-3 h-14 bg-gradient-to-r from-red-600 via-red-500 to-rose-600 text-white rounded-2xl text-sm font-bold shadow-lg shadow-red-500/30 hover:from-red-700 hover:to-rose-700 hover:shadow-xl hover:shadow-red-500/40 transition-all active:scale-[0.98]"
                >
                  <AlertTriangle size={20} className="animate-pulse" />
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
                ? allocationsList.filter(a => 
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
                      <div className="border-t border-slate-100 pt-4 mt-2">
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                            Assigned Services ({dayVendors.length})
                          </p>
                          <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
                            Day {selectedDay.dayNumber} Allocations
                          </span>
                        </div>
                        <div className="space-y-3">
                          {dayVendors.map((vendor) => {
                            const matchedVendor = vendors.find(
                              (v) => v.id === vendor.vendorId || v.name.toLowerCase() === vendor.vendorName.toLowerCase()
                            );
                            const phone = matchedVendor?.phone;
                            const isHotel = vendor.serviceType === 'HOTEL';
                            const isVehicle = vendor.serviceType === 'VEHICLE';
                            const isRestaurant = vendor.serviceType === 'RESTAURANT';
                            
                            const serviceLabel = isHotel
                              ? 'Hotel / Accommodation'
                              : isVehicle
                              ? 'Vehicle / Transport'
                              : isRestaurant
                              ? 'Restaurant / Meals'
                              : 'Activity / Guide';

                            return (
                              <div 
                                key={vendor.id} 
                                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-slate-50/90 border border-slate-200/90 rounded-2xl hover:border-blue-200 hover:bg-slate-50 transition-all shadow-xs"
                              >
                                <div className="flex items-start gap-3 min-w-0 flex-1">
                                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-2xs ${
                                    isHotel ? 'bg-blue-100 text-blue-800' :
                                    isVehicle ? 'bg-emerald-100 text-emerald-800' :
                                    isRestaurant ? 'bg-amber-100 text-amber-800' :
                                    'bg-purple-100 text-purple-800'
                                  }`}>
                                    {isHotel ? <Building2 size={20} /> :
                                     isVehicle ? <Truck size={20} /> :
                                     isRestaurant ? <UtensilsCrossed size={20} /> :
                                     <Mountain size={20} />}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex flex-wrap items-center gap-1.5 mb-1">
                                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wide ${
                                        isHotel ? 'bg-blue-100/80 text-blue-800 border border-blue-200' :
                                        isVehicle ? 'bg-emerald-100/80 text-emerald-800 border border-emerald-200' :
                                        isRestaurant ? 'bg-amber-100/80 text-amber-800 border border-amber-200' :
                                        'bg-purple-100/80 text-purple-800 border border-purple-200'
                                      }`}>
                                        {serviceLabel}
                                      </span>
                                      {vendor.fieldUpdatedByOperator && (
                                        <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded border border-amber-300">
                                          Field Swapped
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-sm font-bold text-slate-900 leading-snug break-words">
                                      {vendor.vendorName}
                                    </p>
                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-slate-600 font-medium">
                                      {phone ? (
                                        <span className="flex items-center gap-1 text-slate-700">
                                          <Phone size={12} className="text-emerald-600 shrink-0" />
                                          <span className="font-semibold">{phone}</span>
                                        </span>
                                      ) : (
                                        <span className="text-slate-400 italic">No direct phone</span>
                                      )}
                                      {vendor.agreedCost > 0 && (
                                        <span className="text-slate-500">
                                          Cost: <span className="font-semibold text-slate-800">NPR {vendor.agreedCost.toLocaleString()}</span>
                                        </span>
                                      )}
                                    </div>
                                    {vendor.specialNotes && (
                                      <p className="text-xs text-slate-500 mt-1 line-clamp-2 bg-white/80 p-1.5 rounded-lg border border-slate-200/60">
                                        <span className="font-semibold text-slate-600">Note:</span> {vendor.specialNotes}
                                      </p>
                                    )}
                                  </div>
                                </div>
                                
                                <div className="flex items-center gap-2 self-end sm:self-center shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200/60 w-full sm:w-auto justify-end">
                                  {phone && (
                                    <a
                                      href={`tel:${phone}`}
                                      className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold rounded-xl border border-emerald-200 transition-colors flex items-center gap-1.5 active:scale-95 shadow-2xs"
                                      title={`Call ${vendor.vendorName}`}
                                    >
                                      <Phone size={13} />
                                      Call
                                    </a>
                                  )}
                                  <button
                                    onClick={() => handleOpenSwapModal(vendor.serviceType as SwapType, vendor.vendorName)}
                                    className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold rounded-xl border border-amber-300 transition-colors flex items-center gap-1.5 active:scale-95 shadow-2xs"
                                    title="Emergency Swap this vendor"
                                  >
                                    <RefreshCw size={13} />
                                    Swap Vendor
                                  </button>
                                </div>
                              </div>
                            );
                          })}
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
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-paila-blue">Recent Activity</h3>
                  {activities.filter(a => a.tourLeaderId === user?.id || (upcomingTour && a.bookingId === upcomingTour.id)).length > 0 && (
                    <span className="px-2 py-0.5 text-xs font-bold bg-blue-100 text-paila-blue rounded-full">
                      {activities.filter(a => a.tourLeaderId === user?.id || (upcomingTour && a.bookingId === upcomingTour.id)).length}
                    </span>
                  )}
                </div>
                <span className="text-xs font-medium text-slate-400">Live Field Log</span>
              </div>

              {(() => {
                const leaderActivities = activities
                  .filter(a => a.tourLeaderId === user?.id || (upcomingTour && a.bookingId === upcomingTour.id))
                  .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime() || b.id - a.id);

                if (leaderActivities.length === 0) {
                  return (
                    <div className="py-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                      <Clock size={28} className="mx-auto text-slate-300 mb-2" />
                      <p className="text-sm font-bold text-slate-600">No field activity recorded yet</p>
                      <p className="text-xs text-slate-400 mt-0.5">Your daily updates, emergency alerts, expenses, and swaps will appear here.</p>
                    </div>
                  );
                }

                const displayedActivities = leaderActivities.slice(0, activityViewLimit);

                return (
                  <div className="space-y-3">
                    {displayedActivities.map((act) => {
                      const isAlert = act.type === 'EMERGENCY_ALERT';
                      const isCheckIn = act.type === 'CHECK_IN';
                      const isSwap = act.type === 'VENDOR_SWAP';
                      const isExpense = act.type === 'SPOT_EXPENSE';

                      return (
                        <div
                          key={act.id}
                          className={`flex items-start gap-3.5 p-4 rounded-2xl transition-all border ${
                            isAlert
                              ? 'bg-red-50/90 border-red-200 text-red-950 shadow-sm'
                              : isCheckIn
                              ? 'bg-blue-50/80 border-blue-200/90 text-blue-950'
                              : isSwap
                              ? 'bg-amber-50/80 border-amber-200 text-amber-950'
                              : isExpense
                              ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                              : 'bg-slate-50 border-slate-200 text-slate-900'
                          }`}
                        >
                          <div className="shrink-0 mt-0.5">
                            {isAlert ? (
                              <div className="w-8 h-8 rounded-xl bg-red-500 text-white flex items-center justify-center shadow-sm">
                                <AlertTriangle size={16} />
                              </div>
                            ) : isCheckIn ? (
                              <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm">
                                <CheckCircle size={16} />
                              </div>
                            ) : isSwap ? (
                              <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-sm">
                                <RefreshCw size={16} />
                              </div>
                            ) : isExpense ? (
                              <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm">
                                <Wallet size={16} />
                              </div>
                            ) : (
                              <div className="w-8 h-8 rounded-xl bg-slate-600 text-white flex items-center justify-center shadow-sm">
                                <Navigation size={16} />
                              </div>
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
                              <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md ${
                                isAlert
                                  ? 'bg-red-200/80 text-red-800'
                                  : isCheckIn
                                  ? 'bg-blue-200/80 text-blue-800'
                                  : isSwap
                                  ? 'bg-amber-200/80 text-amber-800'
                                  : isExpense
                                  ? 'bg-emerald-200/80 text-emerald-800'
                                  : 'bg-slate-200 text-slate-700'
                              }`}>
                                {isAlert
                                  ? `${act.metadata?.severity || 'CRITICAL'} ALERT`
                                  : isCheckIn
                                  ? `DAILY UPDATE`
                                  : isSwap
                                  ? 'VENDOR SWAP'
                                  : isExpense
                                  ? 'SPOT EXPENSE'
                                  : 'TOUR EVENT'}
                              </span>
                              <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1">
                                <Clock size={11} />
                                {act.timestamp ? act.timestamp.split(' ')[1]?.slice(0, 5) || act.timestamp : 'Just now'}
                              </span>
                            </div>

                            <p className="text-sm font-bold leading-snug">
                              {act.title}
                            </p>

                            {act.description && (
                              <p className={`text-xs mt-1.5 leading-relaxed font-medium whitespace-pre-line ${
                                isAlert
                                  ? 'text-red-900 bg-red-100/50 p-2.5 rounded-xl border border-red-200/60'
                                  : isCheckIn
                                  ? 'text-blue-900 bg-blue-100/40 p-2.5 rounded-xl border border-blue-200/50'
                                  : isSwap
                                  ? 'text-amber-900'
                                  : isExpense
                                  ? 'text-emerald-900'
                                  : 'text-slate-600'
                              }`}>
                                {act.description}
                              </p>
                            )}

                            {/* Additional Metadata Tags */}
                            {(act.metadata?.location || act.metadata?.weather) && (
                              <div className="flex flex-wrap items-center gap-2 mt-2 pt-1 text-[11px]">
                                {act.metadata?.location && (
                                  <span className="inline-flex items-center gap-1 font-medium text-slate-600 bg-white/70 px-2 py-0.5 rounded-md border border-slate-200/60">
                                    <MapPin size={10} className="text-slate-400" />
                                    {act.metadata.location}
                                  </span>
                                )}
                                {act.metadata?.weather && (
                                  <span className="inline-flex items-center gap-1 font-medium text-blue-700 bg-white/70 px-2 py-0.5 rounded-md border border-blue-200/60">
                                    {act.metadata.weather}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {leaderActivities.length > 5 && (
                      <button
                        type="button"
                        onClick={() => setActivityViewLimit(prev => prev === 5 ? leaderActivities.length : 5)}
                        className="w-full py-2.5 text-xs font-bold text-paila-blue hover:text-blue-800 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors text-center border border-slate-200 mt-2"
                      >
                        {activityViewLimit === 5
                          ? `View All ${leaderActivities.length} Activities (+${leaderActivities.length - 5} more)`
                          : 'Show Less'}
                      </button>
                    )}
                  </div>
                );
              })()}
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
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <AlertTriangle size={20} />
                  <h3 className="text-lg font-bold">Emergency Helplines</h3>
                </div>
                <span className="text-[11px] font-bold uppercase tracking-wider bg-white/20 px-2.5 py-1 rounded-full">24/7 Response</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {settings.emergencyPhone && (
                  <button
                    onClick={() => openCallModal({
                      name: `${settings.companyName || 'HQ'} (24/7 Hotline)`,
                      phone: settings.emergencyPhone || '+977-9801234567',
                      role: 'HQ 24/7 Field SOS Hotline'
                    })}
                    className="bg-white/25 hover:bg-white/30 backdrop-blur-sm rounded-2xl p-3 text-center active:scale-95 transition-all border border-white/30"
                  >
                    <p className="text-[11px] text-red-100 font-semibold uppercase tracking-wider">HQ 24/7 Hotline</p>
                    <p className="text-sm font-bold truncate mt-0.5">{settings.emergencyPhone}</p>
                  </button>
                )}
                <button onClick={() => openCallModal({ name: 'Nepal Police', phone: '100', role: 'National Emergency Service' })} className="bg-white/20 hover:bg-white/25 backdrop-blur-sm rounded-2xl p-3 text-center active:scale-95 transition-all">
                  <p className="text-[11px] text-red-100 font-semibold uppercase tracking-wider">Police</p>
                  <p className="text-base font-bold mt-0.5">100</p>
                </button>
                <button onClick={() => openCallModal({ name: 'Ambulance & Medical', phone: '102', role: 'Emergency Medical & Evacuation' })} className="bg-white/20 hover:bg-white/25 backdrop-blur-sm rounded-2xl p-3 text-center active:scale-95 transition-all">
                  <p className="text-[11px] text-red-100 font-semibold uppercase tracking-wider">Ambulance</p>
                  <p className="text-base font-bold mt-0.5">102</p>
                </button>
                <button onClick={() => openCallModal({ name: 'Nepal Tourism Board Helpline', phone: '+977-1-4248669', role: 'Tourist Assistance Center' })} className="bg-white/20 hover:bg-white/25 backdrop-blur-sm rounded-2xl p-3 text-center active:scale-95 transition-all">
                  <p className="text-[11px] text-red-100 font-semibold uppercase tracking-wider">Tourism Board</p>
                  <p className="text-sm font-bold truncate mt-0.5">Helpline</p>
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

            {/* Dynamic Office & Head Office Contacts (Zero hardcoding) */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-paila-blue">Office & Admin Directory</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Live synced with office registry and administrator accounts</p>
                </div>
                <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-blue-50 text-paila-blue border border-blue-200/60">
                  {activeOfficeStaff.length + 1} Contacts
                </span>
              </div>

              {/* Head Office Main Card */}
              <div className="mb-4 p-4 rounded-2xl bg-gradient-to-br from-slate-50 to-blue-50/40 border border-slate-200/80">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-paila-blue rounded-2xl flex items-center justify-center text-white shadow-md shadow-paila-blue/20 shrink-0">
                    <Building2 size={24} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-base font-bold text-slate-900 leading-tight">
                        {settings.companyName || 'Paila Nepal Holidays Pvt. Ltd.'}
                      </p>
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-purple-100 text-purple-700">
                        HEAD OFFICE
                      </span>
                    </div>
                    {settings.address && (
                      <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                        <MapPin size={12} className="text-slate-400 shrink-0" />
                        <span className="truncate">{settings.address}</span>
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs font-medium text-slate-700">
                      {settings.phone && (
                        <span className="flex items-center gap-1 font-mono">
                          <Phone size={12} className="text-slate-400" />
                          {settings.phone}
                        </span>
                      )}
                      {settings.emergencyPhone && (
                        <span className="flex items-center gap-1 text-red-600 font-mono font-semibold">
                          <AlertTriangle size={12} />
                          24/7: {settings.emergencyPhone}
                        </span>
                      )}
                      {settings.email && (
                        <span className="flex items-center gap-1 text-slate-500">
                          <Mail size={12} className="text-slate-400" />
                          {settings.email}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {settings.phone && (
                      <a
                        href={`tel:${settings.phone}`}
                        className="p-3 bg-green-100 hover:bg-green-200 text-green-700 rounded-full active:scale-95 transition-transform"
                        title="Call Head Office"
                      >
                        <Phone size={18} />
                      </a>
                    )}
                    {settings.emergencyPhone && (
                      <a
                        href={`tel:${settings.emergencyPhone}`}
                        className="p-3 bg-red-100 hover:bg-red-200 text-red-700 rounded-full active:scale-95 transition-transform"
                        title="Call 24/7 Hotline"
                      >
                        <Phone size={18} />
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {/* Individual Admin & Staff Members (Dynamic from Database) */}
              <div className="space-y-3">
                {activeOfficeStaff.length > 0 ? (
                  activeOfficeStaff.map(staff => {
                    const roleLabel =
                      staff.role === 'SUPER_ADMIN' ? 'Admin / Super Admin' :
                      staff.role === 'OPERATIONS' ? 'Operations Manager' :
                      staff.role === 'SALES' ? 'Sales & Booking Lead' : staff.role;

                    const roleBadgeClass =
                      staff.role === 'SUPER_ADMIN' ? 'bg-purple-100 text-purple-700 border-purple-200' :
                      staff.role === 'OPERATIONS' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                      'bg-blue-100 text-blue-700 border-blue-200';

                    const staffPhone = staff.phone || settings.emergencyPhone || settings.phone || '';

                    return (
                      <div
                        key={staff.id}
                        className="w-full flex items-center gap-4 p-4 hover:bg-slate-50 border border-slate-100 rounded-2xl transition-all"
                      >
                        <button
                          type="button"
                          onClick={() => openCallModal({ name: staff.name, phone: staffPhone, role: roleLabel })}
                          className="flex items-center gap-4 flex-1 text-left min-w-0"
                        >
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-white shadow-sm shrink-0 ${
                            staff.role === 'SUPER_ADMIN' ? 'bg-gradient-to-br from-paila-blue to-blue-700' :
                            staff.role === 'OPERATIONS' ? 'bg-gradient-to-br from-emerald-600 to-teal-700' :
                            'bg-gradient-to-br from-[#f35500] to-orange-600'
                          }`}>
                            {staff.role === 'SUPER_ADMIN' ? (
                              <Shield size={22} />
                            ) : staff.role === 'OPERATIONS' ? (
                              <Truck size={22} />
                            ) : (
                              <Users size={22} />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-base font-bold text-slate-900 truncate">{staff.name}</p>
                              <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md border ${roleBadgeClass}`}>
                                {roleLabel}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 font-medium">
                              <span className="font-mono text-slate-700 font-semibold">{staffPhone || 'No direct phone'}</span>
                              {staff.email && <span className="truncate opacity-70 hidden sm:inline">• {staff.email}</span>}
                            </div>
                          </div>
                        </button>

                        <div className="flex items-center gap-2 shrink-0">
                          {staffPhone ? (
                            <>
                              <a
                                href={`tel:${staffPhone}`}
                                className="p-3 bg-green-100 hover:bg-green-200 text-green-700 rounded-full active:scale-95 transition-transform"
                                title={`Call ${staff.name}`}
                              >
                                <Phone size={18} />
                              </a>
                              <a
                                href={`sms:${staffPhone}`}
                                className="p-3 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-full active:scale-95 transition-transform"
                                title={`SMS ${staff.name}`}
                              >
                                <MessageSquare size={18} />
                              </a>
                            </>
                          ) : (
                            <span className="text-xs text-slate-400 italic">No phone</span>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-6 text-center text-slate-500 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    <p className="text-sm font-semibold">No direct office staff found</p>
                    <p className="text-xs text-slate-400 mt-1">Connect with the Head Office main line above.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Vendor Contacts for Current Tour */}
            {vendorContacts.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <h3 className="text-lg font-bold text-paila-blue mb-4">Tour Vendors</h3>
                <div className="space-y-3">
                  {vendorContacts.map((contact, i) => (
                    <div
                      key={i}
                      className="w-full flex items-center justify-between gap-3 p-4 bg-slate-50/70 border border-slate-200/80 hover:bg-slate-50 rounded-2xl transition-all shadow-2xs"
                    >
                      <button 
                        type="button"
                        onClick={() => openCallModal(contact)}
                        className="flex items-start sm:items-center gap-3.5 flex-1 min-w-0 text-left active:scale-[0.99] transition-transform"
                      >
                        <div className={`w-11 h-11 ${contact.color} rounded-xl flex items-center justify-center text-white shadow-xs shrink-0 mt-0.5 sm:mt-0`}>
                          {contact.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-base font-bold text-slate-900 leading-snug break-words">{contact.name}</p>
                          <p className="text-xs text-slate-600 font-medium mt-0.5">{contact.role}</p>
                          {contact.phone && (
                            <p className="text-xs font-semibold text-emerald-700 mt-0.5 flex items-center gap-1">
                              <Phone size={11} /> {contact.phone}
                            </p>
                          )}
                        </div>
                      </button>
                      <div className="flex gap-2 shrink-0">
                        {contact.phone ? (
                          <a 
                            href={`tel:${contact.phone}`} 
                            className="p-2.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-xl active:scale-95 transition-all flex items-center gap-1 text-xs font-bold shadow-2xs"
                            title={`Call ${contact.name}`}
                          >
                            <Phone size={16} />
                            <span className="hidden xs:inline">Call</span>
                          </a>
                        ) : (
                          <span className="text-xs text-slate-400 italic px-2 py-1">No phone</span>
                        )}
                      </div>
                    </div>
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
              <p className="text-sm text-green-100 mb-2 font-semibold">Total Spot Expenses {upcomingTour && `(${upcomingTour.bookingCode})`}</p>
              <p className="text-3xl font-bold">NPR {visibleExpenses.reduce((s, e) => s + e.amount, 0).toLocaleString()}</p>
              <p className="text-sm text-green-100 mt-2 font-medium">{visibleExpenses.length} disbursements recorded for this assigned tour</p>
            </div>

            {/* Add Expense Button */}
            {upcomingTour ? (
              <button
                onClick={() => setShowExpenseModal(true)}
                className="w-full flex items-center justify-center gap-3 py-5 bg-paila-orange text-white rounded-2xl font-bold text-base shadow-lg active:scale-[0.98] transition-transform"
              >
                <Plus size={22} />
                Record New Expense ({upcomingTour.bookingCode})
              </button>
            ) : (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-center text-amber-800 text-sm font-semibold">
                No active tour assigned. You must have an assigned tour to record field expenses.
              </div>
            )}

            {/* Expense List */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-lg font-bold text-paila-blue">Expense Log</h3>
                {upcomingTour && <span className="text-xs font-semibold text-slate-500">{upcomingTour.bookingCode}</span>}
              </div>
              <div className="divide-y divide-slate-100">
                {visibleExpenses.map(exp => (
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
              {visibleExpenses.length === 0 && (
                <div className="p-10 text-center">
                  <Wallet size={40} className="mx-auto text-slate-300 mb-3" />
                  <p className="text-base text-slate-500 font-medium">No expenses recorded for this assigned tour</p>
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
              <p className="text-sm text-amber-100 mb-2 font-semibold">Vendor Swaps {upcomingTour && `(${upcomingTour.bookingCode})`}</p>
              <p className="text-3xl font-bold">{visibleSwaps.length}</p>
              <p className="text-sm text-amber-100 mt-2 font-medium">{visibleSwaps.filter(s => s.authorized).length} authorized for this tour</p>
            </div>

            {/* New Swap Button */}
            {upcomingTour ? (
              <button
                onClick={() => handleOpenSwapModal()}
                className="w-full flex items-center justify-center gap-3 py-5 bg-paila-blue text-white rounded-2xl font-bold text-base shadow-lg active:scale-[0.98] transition-transform"
              >
                <RefreshCw size={22} />
                Authorize Vendor Swap ({upcomingTour.bookingCode})
              </button>
            ) : (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-center text-amber-800 text-sm font-semibold">
                No active tour assigned. You must have an assigned tour to perform vendor swaps.
              </div>
            )}

            {/* Swap Log */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-lg font-bold text-paila-blue">Swap History</h3>
                {upcomingTour && <span className="text-xs font-semibold text-slate-500">{upcomingTour.bookingCode}</span>}
              </div>
              <div className="divide-y divide-slate-100">
                {visibleSwaps.map(swap => (
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
              {visibleSwaps.length === 0 && (
                <div className="p-10 text-center">
                  <RefreshCw size={40} className="mx-auto text-slate-300 mb-3" />
                  <p className="text-base text-slate-500 font-medium">No vendor swaps recorded for this assigned tour</p>
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-lg p-6 sm:p-7 animate-fade-in max-h-[92vh] overflow-y-auto shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-blue-100 flex items-center justify-center text-paila-blue shadow-sm">
                  <Play size={22} className="text-paila-blue" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-paila-blue">Update Tour Status</h3>
                  <p className="text-xs text-slate-500 font-medium">
                    {upcomingTour.bookingCode} • {upcomingTour.clientName}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowStatusModal(false)}
                className="p-2.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Current Status Pill */}
            <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-2xl mb-5">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Current Status:</span>
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                upcomingTour.status === 'IN_PROGRESS' ? 'bg-emerald-100 text-emerald-800' :
                upcomingTour.status === 'CONFIRMED' ? 'bg-blue-100 text-blue-800' :
                upcomingTour.status === 'COMPLETED' ? 'bg-purple-100 text-purple-800' :
                'bg-red-100 text-red-800'
              }`}>
                {upcomingTour.status.replace('_', ' ')}
              </span>
            </div>

            {/* Status Options */}
            <div className="space-y-3 mb-5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Select New Status:
              </label>

              {[
                {
                  status: 'IN_PROGRESS' as BookingStatus,
                  title: 'IN PROGRESS (On The Road / Trail)',
                  description: 'Active on itinerary route. Enables real-time check-ins, spot expense logs, and GPS tracking.',
                  color: 'emerald',
                  icon: <Play size={18} className="text-emerald-600" />,
                },
                {
                  status: 'CONFIRMED' as BookingStatus,
                  title: 'CONFIRMED (Ready / Scheduled)',
                  description: 'All logistics and permits locked in. Awaiting departure from origin checkpoint.',
                  color: 'blue',
                  icon: <Check size={18} className="text-blue-600" />,
                },
                {
                  status: 'COMPLETED' as BookingStatus,
                  title: 'COMPLETED (Tour Concluded)',
                  description: 'Tour has finished successfully. All travelers returned safely and settlements finalized.',
                  color: 'purple',
                  icon: <CheckCircle size={18} className="text-purple-600" />,
                },
                {
                  status: 'CANCELLED' as BookingStatus,
                  title: 'CANCELLED / SUSPENDED',
                  description: 'Tour halted or cancelled due to force majeure, extreme weather, or emergency.',
                  color: 'rose',
                  icon: <AlertTriangle size={18} className="text-rose-600" />,
                },
              ].map(opt => {
                const isSelected = selectedNewStatus === opt.status;
                const isCurrent = upcomingTour.status === opt.status;

                return (
                  <button
                    key={opt.status}
                    type="button"
                    onClick={() => setSelectedNewStatus(opt.status)}
                    className={`w-full text-left p-4 rounded-2xl border-2 transition-all active:scale-[0.99] flex items-start gap-3.5 ${
                      isSelected
                        ? opt.color === 'emerald'
                          ? 'border-emerald-500 bg-emerald-50/70 ring-2 ring-emerald-500/20'
                          : opt.color === 'blue'
                          ? 'border-blue-500 bg-blue-50/70 ring-2 ring-blue-500/20'
                          : opt.color === 'purple'
                          ? 'border-purple-500 bg-purple-50/70 ring-2 ring-purple-500/20'
                          : 'border-rose-500 bg-rose-50/70 ring-2 ring-rose-500/20'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                      isSelected
                        ? opt.color === 'emerald' ? 'bg-emerald-100 text-emerald-700' :
                          opt.color === 'blue' ? 'bg-blue-100 text-blue-700' :
                          opt.color === 'purple' ? 'bg-purple-100 text-purple-700' :
                          'bg-rose-100 text-rose-700'
                        : 'bg-slate-100 text-slate-500'
                    }`}>
                      {opt.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className={`text-sm font-bold ${isSelected ? 'text-slate-900' : 'text-slate-700'}`}>
                          {opt.title}
                        </p>
                        {isCurrent && (
                          <span className="text-[10px] px-2 py-0.5 bg-slate-200 text-slate-700 rounded-full font-bold">
                            Current
                          </span>
                        )}
                        {isSelected && !isCurrent && (
                          <span className="text-[10px] px-2 py-0.5 bg-paila-orange text-white rounded-full font-bold">
                            Selected
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        {opt.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Field Notes Input */}
            <div className="mb-5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Operational Field Note (Optional)
              </label>
              
              {/* Quick suggestions */}
              <div className="flex flex-wrap gap-1.5 mb-2">
                {[
                  'Group departed on schedule, all members present',
                  'Tour concluded smoothly, guests safely dropped off',
                  'Tour verified ready for departure',
                  'Holding at checkpoint due to road clearing',
                ].map(presetNote => (
                  <button
                    key={presetNote}
                    type="button"
                    onClick={() => setStatusChangeNote(presetNote)}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-semibold transition-colors"
                  >
                    + {presetNote}
                  </button>
                ))}
              </div>

              <textarea
                rows={2}
                value={statusChangeNote}
                onChange={(e) => setStatusChangeNote(e.target.value)}
                placeholder="Add any remarks or context for HQ..."
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-paila-blue/20 focus:border-paila-blue outline-none resize-none font-medium"
              />
            </div>

            {/* Modal Actions */}
            <div className="flex gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowStatusModal(false)}
                className="flex-1 px-5 py-3.5 border-2 border-slate-200 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-50 transition-colors active:scale-95"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleStatusChange()}
                disabled={isSubmittingStatusChange}
                className="flex-1 px-5 py-3.5 bg-gradient-to-r from-paila-blue to-blue-700 text-white rounded-xl text-sm font-bold hover:from-blue-900 hover:to-paila-blue transition-all active:scale-95 shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSubmittingStatusChange ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <CheckCircle size={16} />
                    Confirm Status
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Daily Status Update Modal */}
      {showDailyStatusModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-xl p-6 sm:p-7 animate-fade-in max-h-[92vh] flex flex-col shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-100 flex items-center justify-center text-paila-blue">
                  <CheckCircle size={22} />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-slate-900">
                    Day {selectedDayNumber} Daily Update
                  </h3>
                  <p className="text-xs text-slate-500">
                    {upcomingTour ? `${upcomingTour.bookingCode} • ${upcomingTour.clientName}` : 'Field Progress Update'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowDailyStatusModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="flex-1 overflow-y-auto py-5 space-y-5 pr-1">
              {/* Status Preset Selection */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Select Current Status Event
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { status: 'All Safe & Well', icon: '✅', desc: 'All group members are fit and healthy. Today\'s schedule is running smoothly on track.' },
                    { status: 'Departed from Base', icon: '🚌', desc: 'Group departed on schedule. Journey underway towards next checkpoint.' },
                    { status: 'Started Trek/Activity', icon: '🥾', desc: 'Trek commenced on schedule. Weather good and trail conditions normal.' },
                    { status: 'Reached Destination', icon: '📍', desc: 'Reached destination checkpoint safely. Taking photos and short rest.' },
                    { status: 'Reached Hotel', icon: '🏨', desc: 'Group arrived safely at accommodation. Room check-in completed.' },
                    { status: 'Group Having Meal', icon: '🍽️', desc: 'Group enjoying scheduled meal break. Everyone satisfied.' },
                    { status: 'Rest Stop', icon: '☕', desc: 'Brief rest and hydration stop. Checking pax vitals and gear.' },
                    { status: 'Minor Issue', icon: '⚠️', desc: 'Minor delay or itinerary adjustment encountered. Under control, no emergency.' },
                  ].map(item => {
                    const isSelected = dailyStatusType === item.status;
                    return (
                      <button
                        key={item.status}
                        type="button"
                        onClick={() => handleSelectDailyStatusPreset(item.status, item.desc)}
                        className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all active:scale-95 text-center ${
                          isSelected
                            ? 'border-paila-blue bg-blue-50/80 text-paila-blue ring-2 ring-blue-500/20 shadow-sm'
                            : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                        }`}
                      >
                        <span className="text-2xl mb-1">{item.icon}</span>
                        <span className="text-xs font-bold leading-tight">{item.status}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Location & Weather Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Checkpoint / Location
                    </label>
                    {upcomingTour && (
                      <button
                        type="button"
                        onClick={() => {
                          const loc = upcomingTour.itineraryDays.find(d => d.dayNumber === selectedDayNumber)?.overnightLocation || `Day ${selectedDayNumber} Stop`;
                          setDailyStatusLocation(loc);
                        }}
                        className="text-[10px] text-paila-blue font-semibold hover:underline"
                      >
                        Auto-fill Day {selectedDayNumber}
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    value={dailyStatusLocation}
                    onChange={e => setDailyStatusLocation(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:ring-2 focus:ring-paila-blue/20 focus:border-paila-blue outline-none"
                    placeholder="e.g. Ulleri (1,960m) / Pokhara Lakeside"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Trail / Local Weather
                  </label>
                  <select
                    value={dailyStatusWeather}
                    onChange={e => setDailyStatusWeather(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:ring-2 focus:ring-paila-blue/20 focus:border-paila-blue outline-none"
                  >
                    <option value="Clear & Pleasant">☀️ Clear & Sunny</option>
                    <option value="Partly Cloudy">⛅ Partly Cloudy</option>
                    <option value="Rain / Mist">🌧️ Rain / Mist</option>
                    <option value="Cold / High Winds">💨 Cold / High Winds</option>
                    <option value="Snow / Blizzard">❄️ Snow / Trail Frost</option>
                  </select>
                </div>
              </div>

              {/* Description / Field Notes (Requested Feature) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1">
                    Daily Update Description & Field Notes <span className="text-paila-blue">*</span>
                  </label>
                  <span className="text-[11px] font-mono text-slate-400">
                    {dailyStatusDescription.length} chars
                  </span>
                </div>
                <textarea
                  rows={4}
                  value={dailyStatusDescription}
                  onChange={e => setDailyStatusDescription(e.target.value)}
                  placeholder="Describe group progress, fitness levels, trail conditions, checkpoints cleared, and evening schedule..."
                  className="w-full px-3.5 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:ring-4 focus:ring-paila-blue/15 focus:border-paila-blue outline-none transition-all placeholder:text-slate-400"
                />

                {/* Quick Add Suggestion Chips */}
                <div className="mt-2.5">
                  <p className="text-[11px] font-medium text-slate-500 mb-1.5">Quick Notes (tap to append):</p>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      'All pax fit and in great spirits',
                      'Pace is steady, on schedule',
                      'Mild rain, group using rain gear',
                      'Hotel rooms inspected & allotted',
                      'Dinner arranged for 7:30 PM',
                      'Guides and porters accounted for',
                      'Brief water break at tea shop',
                    ].map((phrase, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          setDailyStatusDescription(prev => {
                            if (!prev.trim()) return phrase + '.';
                            return prev.trim().endsWith('.') ? `${prev} ${phrase}.` : `${prev}, ${phrase}.`;
                          });
                        }}
                        className="text-[11px] px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors active:scale-95 border border-slate-200"
                      >
                        + {phrase}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowDailyStatusModal(false)}
                className="px-5 py-3 rounded-xl border border-slate-200 text-slate-700 font-semibold text-sm hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmittingDailyStatus || !dailyStatusDescription.trim()}
                onClick={handleSubmitDailyStatusUpdate}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-paila-blue to-blue-700 text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-500/20 hover:from-blue-900 hover:to-paila-blue transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
              >
                {isSubmittingDailyStatus ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <CheckCircle size={16} />
                    Submit Daily Update
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Vendor Swap Modal */}
      {showSwapModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-lg p-6 sm:p-7 animate-fade-in max-h-[92vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-700 shadow-sm">
                  <RefreshCw size={22} className="animate-spin-slow" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-paila-blue">Emergency Vendor Swap</h3>
                  <p className="text-xs text-slate-500 font-medium">
                    {upcomingTour?.bookingCode} • Day {selectedDayNumber}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowSwapModal(false)}
                className="p-2.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-5">
              <div className="flex items-start gap-3">
                <span className="text-lg">⚠️</span>
                <div>
                  <p className="text-xs font-bold text-amber-900 uppercase tracking-wide">Operational Field Swap</p>
                  <p className="text-xs text-amber-800 mt-0.5 font-medium leading-relaxed">
                    Authorizes an on-site vendor change. This will update tour allocations and broadcast an immediate alert to Operations.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {/* Service Type Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  1. Service Category
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { type: 'HOTEL' as const, label: 'Hotel / Stay', icon: <Building2 size={16} /> },
                    { type: 'RESTAURANT' as const, label: 'Meals / Food', icon: <UtensilsCrossed size={16} /> },
                    { type: 'VEHICLE' as const, label: 'Transport', icon: <Truck size={16} /> },
                    { type: 'ACTIVITY' as const, label: 'Activity / Guide', icon: <Mountain size={16} /> },
                  ].map(cat => {
                    const isSelected = swapServiceType === cat.type;
                    return (
                      <button
                        key={cat.type}
                        type="button"
                        onClick={() => handleSwapServiceTypeChange(cat.type)}
                        className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 text-xs font-bold transition-all ${
                          isSelected
                            ? 'bg-amber-500 text-white border-amber-500 shadow-md scale-102'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <div className="mb-1">{cat.icon}</div>
                        <span className="text-center leading-tight">{cat.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Original Vendor */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  2. Original Vendor to Replace *
                </label>
                <div className="space-y-2">
                  {tourAllocations.length > 0 && (
                    <select
                      value={swapOriginalVendorName}
                      onChange={(e) => setSwapOriginalVendorName(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-paila-blue/20 focus:border-paila-blue outline-none transition-all"
                    >
                      <option value="">-- Select from Assigned Vendors --</option>
                      {tourAllocations.map(a => (
                        <option key={a.id} value={a.vendorName}>
                          {a.vendorName} ({a.serviceType}) • NPR {a.agreedCost.toLocaleString()}
                        </option>
                      ))}
                    </select>
                  )}
                  <input
                    type="text"
                    value={swapOriginalVendorName}
                    onChange={(e) => setSwapOriginalVendorName(e.target.value)}
                    placeholder="Or type original vendor name..."
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-paila-blue/20 focus:border-paila-blue outline-none placeholder:text-slate-400"
                  />
                </div>
              </div>

              {/* Choose New Vendor */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                    3. Choose & Update New Vendor *
                  </label>
                  <span className="text-[11px] font-semibold text-paila-blue bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                    Editable
                  </span>
                </div>

                {/* Preset Picker */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">
                    Quick Pick Registered Vendor:
                  </label>
                  <select
                    value={swapSelectedNewVendorId}
                    onChange={(e) => handleSelectNewVendorPreset(e.target.value)}
                    className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-paila-blue/20 focus:border-paila-blue outline-none"
                  >
                    <option value="CUSTOM">➕ Other / Custom New Vendor</option>
                    {vendors
                      .filter(v => v.isActive && (
                        swapServiceType === 'ACTIVITY' 
                          ? (v.category === 'ACTIVITY' || v.category === 'GUIDE_PERMIT') 
                          : v.category === swapServiceType
                      ))
                      .map(v => (
                        <option key={v.id} value={v.id.toString()}>
                          {v.name} • {v.location} {v.phone ? `(${v.phone})` : ''}
                        </option>
                      ))}
                  </select>
                </div>

                {/* Editable Vendor Name Input */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    New Vendor Name (Editable) *
                  </label>
                  <input
                    type="text"
                    value={swapNewVendorName}
                    onChange={(e) => setSwapNewVendorName(e.target.value)}
                    placeholder="Enter or modify the replacement vendor name..."
                    className="w-full px-4 py-3 bg-white border-2 border-amber-300 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-amber-400 focus:border-amber-500 outline-none shadow-inner"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    ✏️ You can rename or customize this vendor name (e.g. add driver name, lodge wing, or contact tag).
                  </p>
                </div>

                {/* Contact Phone & Location */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Contact Phone</label>
                    <input
                      type="text"
                      value={swapNewVendorPhone}
                      onChange={(e) => setSwapNewVendorPhone(e.target.value)}
                      placeholder="+977-98XXXXXXXX"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:ring-1 focus:ring-paila-blue outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Location / Landmark</label>
                    <input
                      type="text"
                      value={swapNewVendorLocation}
                      onChange={(e) => setSwapNewVendorLocation(e.target.value)}
                      placeholder="e.g. Ulleri, Pokhara, Thamel"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:ring-1 focus:ring-paila-blue outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Reason for Swap */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  4. Reason for Emergency Swap *
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {[
                    'Overbooked / No room available',
                    'Road blockage / Landslide bypass',
                    'Vehicle breakdown / Flat tyre',
                    'Health / Hygiene standard issue',
                    'Upgraded on guest request',
                  ].map(reasonSnippet => (
                    <button
                      key={reasonSnippet}
                      type="button"
                      onClick={() => setSwapReason(reasonSnippet)}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-semibold transition-colors"
                    >
                      + {reasonSnippet}
                    </button>
                  ))}
                </div>
                <textarea
                  rows={2}
                  value={swapReason}
                  onChange={(e) => setSwapReason(e.target.value)}
                  placeholder="Provide brief details on why this vendor swap is necessary..."
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-paila-blue/20 focus:border-paila-blue outline-none resize-none font-medium"
                />
              </div>

              {/* Cost Difference & Payment Method */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Cost Difference (NPR)
                  </label>
                  <input
                    type="number"
                    value={swapCostDifference}
                    onChange={(e) => setSwapCostDifference(e.target.value)}
                    placeholder="0"
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-paila-blue/20 focus:border-paila-blue outline-none"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Enter 0 if same price, + for extra, - for cheaper</p>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Payment Mode
                  </label>
                  <select
                    value={swapPaymentMethod}
                    onChange={(e) => setSwapPaymentMethod(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-paila-blue/20 focus:border-paila-blue outline-none"
                  >
                    <option value="CASH">Cash (Tour Float Fund)</option>
                    <option value="DIRECT_INVOICE">Direct Invoice to HQ</option>
                    <option value="ADVANCE">Advance Settlement</option>
                    <option value="ESEWA">eSewa / Digital Wallet</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex gap-3 mt-6 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowSwapModal(false)}
                className="flex-1 px-5 py-3.5 border-2 border-slate-200 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-50 transition-colors active:scale-95"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleVendorSwap}
                disabled={isSubmittingSwap || !swapNewVendorName.trim() || !swapReason.trim()}
                className="flex-1 px-5 py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-xl text-sm font-bold hover:from-amber-600 hover:to-amber-700 transition-all active:scale-95 shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmittingSwap ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    Authorizing...
                  </>
                ) : (
                  <>
                    <CheckCircle size={16} />
                    Authorize Swap
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Expense Modal */}
      {showExpenseModal && (
        <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md p-6 sm:p-7 animate-fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-700">
                  <Wallet size={22} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-paila-blue">Record Spot Expense</h3>
                  <p className="text-xs text-slate-500">
                    {upcomingTour ? `Day ${selectedDayNumber} • ${upcomingTour.bookingCode}` : 'Field Disbursement'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowExpenseModal(false);
                  setReceiptFile(null);
                  setReceiptPreview(null);
                }}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                  Amount (NPR) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                    NPR
                  </span>
                  <input
                    type="number"
                    min="1"
                    step="10"
                    value={expenseAmount}
                    onChange={e => setExpenseAmount(e.target.value)}
                    placeholder="0"
                    className="w-full pl-16 pr-4 py-3.5 border-2 border-slate-200 rounded-2xl text-2xl font-bold text-slate-900 focus:ring-2 focus:ring-paila-blue/20 focus:border-paila-blue outline-none text-right"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                  Category <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { id: 'Food', label: 'Food & Meals', icon: '🍽️' },
                    { id: 'Transport', label: 'Transport / Fuel', icon: '🚕' },
                    { id: 'Medical', label: 'Medical / Pharmacy', icon: '💊' },
                    { id: 'Permit', label: 'Permits & Fees', icon: '📄' },
                    { id: 'Refreshments', label: 'Drinks & Snacks', icon: '☕' },
                    { id: 'Other', label: 'Other Misc', icon: '📦' },
                  ].map(cat => {
                    const isSelected = expenseCategory === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setExpenseCategory(cat.id)}
                        className={`flex items-center gap-2 p-2.5 rounded-xl border-2 font-bold text-xs transition-all active:scale-95 text-left ${
                          isSelected
                            ? 'border-paila-blue bg-blue-50 text-paila-blue ring-2 ring-blue-500/20 shadow-sm'
                            : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                        }`}
                      >
                        <span className="text-lg">{cat.icon}</span>
                        <span className="truncate">{cat.id}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Description <span className="text-red-500">*</span>
                  </label>
                  <span className="text-[11px] font-mono text-slate-400">
                    {expenseDescription.length} chars
                  </span>
                </div>
                <textarea
                  rows={2}
                  value={expenseDescription}
                  onChange={e => setExpenseDescription(e.target.value)}
                  placeholder="What was this expense for? (e.g. Bottled water for 8 pax, Taxi to hospital...)"
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:ring-2 focus:ring-paila-blue/20 focus:border-paila-blue outline-none resize-none placeholder:text-slate-400"
                />

                {/* Quick note suggestions */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {[
                    'Bottled mineral water for group',
                    'First aid medicine & painkillers',
                    'Local taxi fare for delayed pax',
                    'Trail entry permit fee',
                    'Group hot lunch break',
                  ].map((phrase, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setExpenseDescription(phrase)}
                      className="text-[10px] px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors border border-slate-200"
                    >
                      + {phrase}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                  Payment Method
                </label>
                <select
                  value={expensePaymentMethod}
                  onChange={e => setExpensePaymentMethod(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-paila-blue/20 focus:border-paila-blue outline-none"
                >
                  <option value="CASH">💵 Cash (From Tour Advance Fund)</option>
                  <option value="PERSONAL">💳 Personal Funds (Reimbursement Claim)</option>
                  <option value="ESEWA">📱 eSewa Digital Wallet</option>
                  <option value="KHALTI">🟣 Khalti Digital Wallet</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                  Attach Receipt / Bill (Optional)
                </label>
                
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
                    className="w-full px-4 py-5 border-2 border-dashed border-slate-300 rounded-2xl text-center cursor-pointer hover:border-paila-blue hover:bg-blue-50/50 transition-all active:scale-[0.98]"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center">
                        <Camera size={24} className="text-slate-400" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-700">Tap to capture or upload bill</p>
                        <p className="text-xs text-slate-500 font-medium">JPG, PNG up to 5MB</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="relative rounded-2xl overflow-hidden border-2 border-green-300 bg-green-50">
                    {/* Preview image */}
                    <img 
                      src={receiptPreview} 
                      alt="Receipt preview" 
                      className="w-full h-44 object-cover"
                    />
                    
                    {/* File info overlay */}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-white">
                          <ImageIcon size={16} />
                          <div>
                            <p className="text-xs font-bold truncate max-w-[180px]">
                              {receiptFile?.name || 'Receipt Uploaded'}
                            </p>
                            {receiptFile && (
                              <p className="text-[10px] opacity-80 font-medium">
                                {(receiptFile.size / 1024).toFixed(1)} KB
                              </p>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={removeReceipt}
                          className="p-2 bg-red-500 hover:bg-red-600 rounded-xl transition-colors"
                          title="Remove receipt"
                        >
                          <Trash2 size={16} className="text-white" />
                        </button>
                      </div>
                    </div>
                    
                    {/* Success badge */}
                    <div className="absolute top-2 right-2 bg-green-500 text-white px-2.5 py-1 rounded-lg flex items-center gap-1">
                      <Check size={12} />
                      <span className="text-xs font-bold">Uploaded</span>
                    </div>
                  </div>
                )}
                
                {/* Upload another button when preview exists */}
                {receiptPreview && (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full mt-2 px-3 py-2 border-2 border-slate-200 rounded-xl text-xs text-slate-600 font-bold hover:bg-slate-50 transition-colors flex items-center justify-center gap-1.5 active:scale-95"
                  >
                    <Upload size={14} />
                    Upload different image
                  </button>
                )}
              </div>
            </div>

            <div className="flex gap-3 mt-6 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setShowExpenseModal(false);
                  setReceiptFile(null);
                  setReceiptPreview(null);
                }}
                className="flex-1 px-4 py-3.5 border-2 border-slate-200 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-50 transition-colors active:scale-95"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmittingExpense || !expenseAmount || !expenseDescription.trim()}
                onClick={handleExpense}
                className="flex-1 flex items-center justify-center gap-2 px-5 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-md transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmittingExpense ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    Recording...
                  </>
                ) : (
                  <>
                    <Wallet size={16} />
                    Record Expense
                  </>
                )}
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
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-xl p-6 sm:p-7 animate-fade-in max-h-[92vh] flex flex-col shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-red-100 flex items-center justify-center text-red-600">
                  <AlertTriangle size={22} className="animate-pulse" />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-slate-900">Broadcast Emergency Alert</h3>
                  <p className="text-xs text-slate-500">
                    {upcomingTour ? `${upcomingTour.bookingCode} • ${upcomingTour.clientName}` : 'Field Operations Broadcast'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAlertModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="flex-1 overflow-y-auto py-5 space-y-5 pr-1">
              {/* Alert Category Selection */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Alert Type / Incident Category
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { type: 'EMERGENCY_SOS' as const, label: 'Life-Safety SOS', icon: AlertCircle, color: 'border-red-500 text-red-700 bg-red-50' },
                    { type: 'MEDICAL' as const, label: 'Medical / AMS', icon: Zap, color: 'border-rose-500 text-rose-700 bg-rose-50' },
                    { type: 'HIGHWAY_BLOCK' as const, label: 'Road Blocked', icon: AlertTriangle, color: 'border-orange-500 text-orange-700 bg-orange-50' },
                    { type: 'VEHICLE_BREAKDOWN' as const, label: 'Vehicle Breakdown', icon: Truck, color: 'border-amber-500 text-amber-700 bg-amber-50' },
                    { type: 'WEATHER' as const, label: 'Severe Weather', icon: CloudOff, color: 'border-sky-500 text-sky-700 bg-sky-50' },
                    { type: 'VENDOR_SWAP' as const, label: 'Vendor / Lodge Issue', icon: RefreshCw, color: 'border-blue-500 text-blue-700 bg-blue-50' },
                  ].map(cat => {
                    const isSelected = alertType === cat.type;
                    const Icon = cat.icon;
                    return (
                      <button
                        key={cat.type}
                        type="button"
                        onClick={() => handleSelectAlertType(cat.type)}
                        className={`flex items-center gap-2 p-3 rounded-xl text-left border-2 transition-all active:scale-95 ${
                          isSelected
                            ? `${cat.color} ring-2 ring-red-400/40 font-bold shadow-sm`
                            : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white font-medium'
                        }`}
                      >
                        <Icon size={18} className={isSelected ? '' : 'text-slate-400'} />
                        <span className="text-xs truncate">{cat.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Severity Selector */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Severity Priority
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { level: 'CRITICAL' as const, label: 'Critical', bg: 'bg-red-600 text-white', activeBorder: 'border-red-600 bg-red-50 text-red-700' },
                    { level: 'HIGH' as const, label: 'High', bg: 'bg-orange-500 text-white', activeBorder: 'border-orange-500 bg-orange-50 text-orange-700' },
                    { level: 'MEDIUM' as const, label: 'Medium', bg: 'bg-amber-500 text-white', activeBorder: 'border-amber-500 bg-amber-50 text-amber-700' },
                    { level: 'LOW' as const, label: 'Low', bg: 'bg-slate-500 text-white', activeBorder: 'border-slate-500 bg-slate-50 text-slate-700' },
                  ].map(sev => (
                    <button
                      key={sev.level}
                      type="button"
                      onClick={() => setAlertSeverity(sev.level)}
                      className={`py-2 px-1 text-center rounded-xl text-xs font-bold border-2 transition-all ${
                        alertSeverity === sev.level
                          ? `${sev.activeBorder} ring-2 ring-offset-1 ring-slate-300 shadow-sm`
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {sev.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Title & Location Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Alert Headline
                  </label>
                  <input
                    type="text"
                    value={alertTitle}
                    onChange={e => setAlertTitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none"
                    placeholder="e.g. AMS Sickness at Deurali"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Location / Route Point
                    </label>
                    {upcomingTour && (
                      <button
                        type="button"
                        onClick={() => {
                          const loc = upcomingTour.itineraryDays.find(d => d.dayNumber === selectedDayNumber)?.overnightLocation || 'Day Checkpoint';
                          setAlertLocation(loc);
                        }}
                        className="text-[10px] text-paila-blue font-semibold hover:underline"
                      >
                        Reset to Day {selectedDayNumber}
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    value={alertLocation}
                    onChange={e => setAlertLocation(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none"
                    placeholder="e.g. Deurali (3,200m) / Mugling KM 84"
                  />
                </div>
              </div>

              {/* Description Input (Requested Feature) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1">
                    Emergency Description & Situation Report <span className="text-red-500">*</span>
                  </label>
                  <span className="text-[11px] font-mono text-slate-400">
                    {alertDescription.length} chars
                  </span>
                </div>
                <textarea
                  rows={4}
                  value={alertDescription}
                  onChange={e => setAlertDescription(e.target.value)}
                  placeholder="Describe the exact situation, number of affected guests, symptoms/injuries, vehicle status, immediate actions taken, and required support or evacuation..."
                  className="w-full px-3.5 py-3 bg-slate-50 border-2 border-red-200/80 rounded-xl text-sm text-slate-900 focus:bg-white focus:ring-4 focus:ring-red-500/15 focus:border-red-500 outline-none transition-all placeholder:text-slate-400"
                />

                {/* Quick Add Suggestions Chips */}
                <div className="mt-2.5">
                  <p className="text-[11px] font-medium text-slate-500 mb-1.5">Quick Situation Tags (tap to append):</p>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      'Trekker AMS symptoms (SpO2 low)',
                      'Helicopter evacuation required',
                      'Landslide road blockage',
                      'Vehicle engine broke down',
                      'All guests safe & sheltered',
                      'Emergency first aid administered',
                      'Need alternative teahouse lodge',
                    ].map((phrase, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          setAlertDescription(prev => {
                            if (!prev.trim()) return phrase + '.';
                            return prev.trim().endsWith('.') ? `${prev} ${phrase}.` : `${prev}, ${phrase}.`;
                          });
                        }}
                        className="text-[11px] px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors active:scale-95 border border-slate-200"
                      >
                        + {phrase}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Operations Notice */}
              <div className="p-3 bg-red-50 rounded-xl border border-red-200 flex items-start gap-2.5">
                <Shield size={16} className="text-red-600 shrink-0 mt-0.5" />
                <p className="text-xs text-red-800 leading-relaxed">
                  <strong>Emergency Priority Notice:</strong> Dispatched alerts immediately trigger audible warnings and appear in the Operations Command Center and Super Admin Audit feed.
                </p>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowAlertModal(false)}
                className="px-5 py-3 rounded-xl border border-slate-200 text-slate-700 font-semibold text-sm hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmittingAlert || !alertDescription.trim()}
                onClick={handleSendEmergencyAlert}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-red-500/30 hover:from-red-700 hover:to-rose-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
              >
                {isSubmittingAlert ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    Broadcasting...
                  </>
                ) : (
                  <>
                    <AlertTriangle size={16} />
                    SEND EMERGENCY ALERT
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
