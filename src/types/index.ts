export type UserRole = 'SUPER_ADMIN' | 'SALES' | 'OPERATIONS' | 'TOUR_OPERATOR';

export interface User {
  id: number;
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  phone: string;
  isActive: boolean;
  avatar?: string;
}

export type BookingStatus = 'PROPOSED' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type ClientType = 'INSTITUTIONAL' | 'CORPORATE' | 'INDIVIDUAL' | 'FOREIGN_TREK';

export interface Package {
  id: number;
  title: string;
  slug: string;
  durationDays: number;
  durationNights: number;
  standardPrice: number;
  overview: string;
  inclusions: string;
  exclusions: string;
  category: string;
  itineraryDays?: ItineraryDay[];
}

export interface ItineraryDay {
  id: number;
  dayNumber: number;
  title: string;
  description: string;
  overnightLocation: string;
  mealsIncluded: string;
}

export interface BookingStatusHistoryEntry {
  id: string | number;
  bookingId: number;
  bookingCode?: string;
  fromStatus?: BookingStatus | null;
  toStatus: BookingStatus;
  changedAt: string;
  changedBy: {
    id?: number;
    name: string;
    role: UserRole | string;
    email?: string;
    avatar?: string;
  };
  reason?: string;
  notes?: string;
  source?: 'ADMIN_PORTAL' | 'OPERATIONS' | 'FIELD_APP' | 'SYSTEM' | 'BULK_ACTION';
}

export interface Booking {
  id: number;
  bookingCode: string;
  clientType: ClientType;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  packageId: number | null;
  packageName?: string;
  status: BookingStatus;
  startDate: string;
  endDate: string;
  paxCount: number;
  totalAgreedAmount: number;
  advanceReceived: number;
  assignedTourOperatorId: number | null;
  assignedTourOperatorName?: string;
  notes: string;
  createdBy: number;
  createdByName?: string;
  createdAt: string;
  itineraryDays: ItineraryDay[];
  statusHistory?: BookingStatusHistoryEntry[];
}

export type VendorCategory = 'HOTEL' | 'RESTAURANT' | 'VEHICLE' | 'ACTIVITY' | 'GUIDE_PERMIT' | 'OTHER';
export type ServiceType = 'HOTEL' | 'RESTAURANT' | 'VEHICLE' | 'ACTIVITY' | 'OTHER';
export type PaymentStatus = 'PENDING' | 'PARTIALLY_PAID' | 'SETTLED';
export type PaymentMode = 'CASH' | 'BANK_TRANSFER' | 'ESEWA' | 'KHALTI' | 'CHEQUE';

export type VehicleType = '712 Bus' | 'Super Bus' | 'Tourist Bus' | 'Scorpio' | 'Bolero' | 'Hiace' | 'EV Hiace' | 'Taxi';

export interface Vendor {
  id: number;
  name: string;
  category: VendorCategory;
  location: string;
  contactPerson: string;
  phone: string;
  panVatNumber: string;
  bankAccountDetails: string;
  isActive: boolean;
  vehicleType?: VehicleType;
  plateNumber?: string;
}

export interface OperationAllocation {
  id: number;
  bookingId: number;
  bookingCode: string;
  vendorId: number;
  vendorName: string;
  serviceType: ServiceType;
  serviceDate: string;
  agreedCost: number;
  amountPaid: number;
  paymentStatus: PaymentStatus;
  fieldUpdatedByOperator: boolean;
  specialNotes: string;
  serviceDetails?: string;
  invoiceNumber?: string;
  notes?: string;
}

export interface VendorPayment {
  id: number;
  operationAllocationId: number;
  amount: number;
  paymentMode: PaymentMode;
  referenceNumber: string;
  paidAt: string;
  recordedBy: number;
  recordedByName: string;
}

export interface DashboardStats {
  totalBookings: number;
  activeBookings: number;
  totalRevenue: number;
  pendingPayments: number;
  upcomingTours: number;
  completedThisMonth: number;
}

export type ActivityType =
  | 'BOOKING_CREATED'
  | 'BOOKING_STATUS_CHANGE'
  | 'BOOKING_UPDATED'
  | 'VENDOR_PAYMENT'
  | 'CLIENT_PAYMENT'
  | 'USER_LOGIN'
  | 'USER_LOGOUT'
  | 'FIELD_CHECKPOINT'
  | 'FIELD_ALERT'
  | 'VENDOR_ALLOCATION'
  | 'SETTINGS_UPDATE'
  | 'SYSTEM_BACKUP'
  | 'SYSTEM_RESTORE';

export type ActivityCategory = 'BOOKING' | 'PAYMENT' | 'LOGIN' | 'OPERATIONS' | 'ALERT' | 'SETTINGS' | 'BACKUP';

export interface Activity {
  id: string | number;
  type: ActivityType;
  category: ActivityCategory;
  title: string;
  description: string;
  timestamp: string;
  actor: {
    name: string;
    email?: string;
    role: string;
    avatar?: string;
  };
  metadata?: {
    bookingId?: number;
    bookingCode?: string;
    clientName?: string;
    vendorName?: string;
    amount?: number;
    currency?: string;
    oldStatus?: string;
    newStatus?: string;
    paymentMode?: string;
    location?: string;
    ipAddress?: string;
    details?: string;
  };
}

export interface CompanySettings {
  companyName: string;
  address: string;
  phone: string;
  domain: string;
  panNumber: string;
  vatNumber: string;
  email?: string;
  tagline?: string;
  emergencyPhone?: string;
  registrationNumber?: string;
  currency?: string;
  taxRate?: number;
  bankDetails?: {
    bankName?: string;
    accountName?: string;
    accountNumber?: string;
    branch?: string;
    swiftCode?: string;
  };
}

export interface Alert {
  id: number;
  booking_id: number | null;
  tour_leader_id: number;
  alert_type: 'EMERGENCY_SOS' | 'HIGHWAY_BLOCK' | 'VEHICLE_BREAKDOWN' | 'VENDOR_SWAP' | 'MEDICAL' | 'WEATHER' | 'OTHER';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  title: string;
  description: string | null;
  location: string | null;
  status: 'PENDING' | 'ACKNOWLEDGED' | 'RESOLVED';
  acknowledged_by: number | null;
  acknowledged_by_name?: string | null;
  acknowledged_at: string | null;
  resolved_at?: string | null;
  resolved_by_name?: string | null;
  created_at: string;
  tour_leader_name?: string;
  tour_leader_phone?: string;
  booking_code?: string;
  client_name?: string;
  is_system_offline_alert?: boolean;
}

export interface SystemBackupData {
  version: string;
  backupDate: string;
  systemName: string;
  systemDomain: string;
  environment: string;
  metadata: {
    totalBookings: number;
    totalUsers: number;
    totalVendors: number;
    totalPackages: number;
    totalActivities: number;
    totalAlerts: number;
    totalAllocations: number;
    totalPayments: number;
    exportedBy: {
      name: string;
      email?: string;
      role: string;
    };
  };
  data: {
    companySettings?: CompanySettings;
    bookings?: Booking[];
    users?: User[];
    vendors?: Vendor[];
    packages?: Package[];
    operationAllocations?: OperationAllocation[];
    vendorPayments?: VendorPayment[];
    activities?: Activity[];
    alerts?: Alert[];
    theme?: string;
  };
}

export interface BackupSnapshot {
  id: string;
  timestamp: string;
  type: 'DAILY_AUTO' | 'MANUAL' | 'PRE_RESTORE';
  label: string;
  sizeBytes: number;
  metrics: {
    bookingsCount: number;
    usersCount: number;
    vendorsCount: number;
    packagesCount: number;
    activitiesCount: number;
    hasSettings: boolean;
  };
  backup: SystemBackupData;
}

export interface DailyBackupConfig {
  enabled: boolean;
  scheduledTime: string; // e.g. "02:00"
  retentionDays: number; // e.g. 7, 14, 30
  lastAutoBackupDate: string | null; // e.g. "2026-09-22"
  lastAutoBackupTimestamp: string | null; // ISO
  autoDownloadAfterBackup: boolean;
  downloadFormat?: 'JSON' | 'SQL' | 'BOTH';
}

export interface BackupModuleSelection {
  companySettings: boolean;
  bookings: boolean;
  users: boolean;
  vendors: boolean;
  packages: boolean;
  operations: boolean;
  activities: boolean;
  alerts: boolean;
}


