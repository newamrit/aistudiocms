export type UserRole = 'SUPER_ADMIN' | 'SALES' | 'OPERATIONS' | 'TOUR_OPERATOR';

export interface User {
  id: number;
  name: string;
  email: string;
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
  | 'VENDOR_ALLOCATION';

export type ActivityCategory = 'BOOKING' | 'PAYMENT' | 'LOGIN' | 'OPERATIONS' | 'ALERT';

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

