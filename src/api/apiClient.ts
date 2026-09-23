import { 
  Booking, Package, Vendor, OperationAllocation, VendorPayment, 
  BookingStatus, BookingStatusHistoryEntry, User, CompanySettings,
  Alert, Activity, PaymentStatus
} from '../types';

// Storage cache keys for graceful offline fallback & immediate hydration
export const DB_KEYS = {
  BOOKINGS: 'paila_cms_bookings',
  PACKAGES: 'paila_cms_packages',
  VENDORS: 'paila_cms_vendors',
  ALLOCATIONS: 'paila_cms_allocations',
  VENDOR_PAYMENTS: 'paila_cms_vendor_payments',
  USERS: 'paila_cms_users',
  SETTINGS: 'paila_cms_company_settings',
  ALERTS: 'paila_cms_alerts',
  ACTIVITIES: 'paila_cms_activities'
} as const;

function readCache<T>(key: string, defaultData: T[] = []): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch {
    // Ignore cache read errors
  }
  return defaultData;
}

function writeCache<T>(key: string, data: T[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    // Ignore cache write errors
  }
}

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('paila_auth_token') || '';
  return {
    'Content-Type': 'application/json',
    ...(token ? { 
      'Authorization': `Bearer ${token}`,
      'X-Auth-Token': token
    } : {})
  };
}

async function requestApi<T>(path: string, options?: RequestInit): Promise<T> {
  const headers = {
    ...getAuthHeaders(),
    ...(options?.headers as Record<string, string> || {})
  };

  const response = await fetch(`/api${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => null);
    const errorMsg = errData?.error || errData?.message || `HTTP ${response.status}: ${response.statusText}`;
    console.error(`[REST API ERROR] ${options?.method || 'GET'} /api${path} failed:`, errorMsg);
    throw new Error(errorMsg);
  }

  return response.json();
}

/**
 * Maps raw MySQL booking rows to TypeScript Booking objects
 */
function mapSqlBooking(row: any): Booking {
  return {
    id: Number(row.id),
    bookingCode: row.booking_code,
    clientType: row.client_type,
    clientName: row.client_name,
    clientEmail: row.client_email,
    clientPhone: row.client_phone || '',
    packageId: row.package_id ? Number(row.package_id) : null,
    packageName: row.package_name || undefined,
    status: row.status as BookingStatus,
    startDate: row.start_date,
    endDate: row.end_date,
    paxCount: Number(row.pax_count) || 1,
    totalAgreedAmount: Number(row.total_agreed_amount) || 0,
    advanceReceived: Number(row.advance_received) || 0,
    assignedTourOperatorId: row.assigned_tour_operator_id ? Number(row.assigned_tour_operator_id) : null,
    assignedTourOperatorName: row.assigned_tour_operator_name || undefined,
    notes: row.notes || '',
    createdBy: Number(row.created_by) || 1,
    createdByName: row.created_by_name || undefined,
    createdAt: row.created_at || new Date().toISOString(),
    itineraryDays: Array.isArray(row.itineraryDays) ? row.itineraryDays.map((d: any) => ({
      id: Number(d.id),
      dayNumber: Number(d.day_number),
      title: d.title,
      description: d.description || '',
      overnightLocation: d.overnight_location || '',
      mealsIncluded: d.meals_included || ''
    })) : [],
    statusHistory: Array.isArray(row.statusHistory) ? row.statusHistory.map((h: any) => ({
      id: h.id,
      bookingId: Number(h.booking_id),
      bookingCode: h.booking_code,
      fromStatus: h.from_status,
      toStatus: h.to_status,
      changedAt: h.changed_at,
      changedBy: {
        id: h.changed_by_id ? Number(h.changed_by_id) : undefined,
        name: h.changed_by_name || 'Staff',
        role: h.changed_by_role || 'SUPER_ADMIN'
      },
      reason: h.reason || undefined,
      notes: h.notes || undefined,
      source: h.source || 'ADMIN_PORTAL'
    })) : []
  };
}

/**
 * Maps raw MySQL vendor rows to TypeScript Vendor objects
 */
function mapSqlVendor(row: any): Vendor {
  return {
    id: Number(row.id),
    name: row.name,
    category: row.category,
    location: row.location || '',
    contactPerson: row.contact_person || '',
    phone: row.phone || '',
    panVatNumber: row.pan_vat_number || '',
    bankAccountDetails: row.bank_account_details || '',
    isActive: Boolean(row.is_active)
  };
}

/**
 * Maps raw MySQL package rows to TypeScript Package objects
 */
function mapSqlPackage(row: any): Package {
  return {
    id: Number(row.id),
    title: row.title,
    slug: row.slug || '',
    durationDays: Number(row.duration_days) || 1,
    durationNights: Number(row.duration_nights) || 0,
    standardPrice: Number(row.standard_price) || 0,
    overview: row.overview || '',
    inclusions: row.inclusions || '',
    exclusions: row.exclusions || '',
    category: row.category || 'Trekking',
    itineraryDays: Array.isArray(row.itineraryDays) ? row.itineraryDays.map((d: any) => ({
      id: Number(d.id),
      dayNumber: Number(d.day_number),
      title: d.title,
      description: d.description || '',
      overnightLocation: d.overnight_location || '',
      mealsIncluded: d.meals_included || ''
    })) : []
  };
}

/**
 * Maps raw MySQL allocation rows to TypeScript OperationAllocation objects
 */
function mapSqlAllocation(row: any): OperationAllocation {
  return {
    id: Number(row.id),
    bookingId: Number(row.booking_id),
    bookingCode: row.booking_code || '',
    vendorId: Number(row.vendor_id),
    vendorName: row.vendor_name || '',
    serviceType: row.service_type,
    serviceDate: row.service_date,
    serviceDetails: row.special_notes || row.service_details || '',
    agreedCost: Number(row.agreed_cost) || 0,
    amountPaid: Number(row.amount_paid) || 0,
    paymentStatus: row.payment_status || 'PENDING',
    fieldUpdatedByOperator: Boolean(row.field_updated_by_operator),
    specialNotes: row.special_notes || '',
    invoiceNumber: row.invoice_number || undefined,
    notes: row.special_notes || row.notes || undefined
  };
}

/**
 * Maps raw MySQL user rows to TypeScript User objects
 */
function mapSqlUser(row: any): User {
  return {
    id: Number(row.id),
    name: row.name,
    email: row.email,
    role: row.role,
    phone: row.phone || '',
    isActive: Boolean(row.is_active)
  };
}

/**
 * Maps raw MySQL vendor payment rows to TypeScript VendorPayment objects
 */
function mapSqlVendorPayment(row: any): VendorPayment {
  return {
    id: Number(row.id),
    operationAllocationId: Number(row.operation_allocation_id),
    amount: Number(row.amount),
    paymentMode: row.payment_mode || 'BANK_TRANSFER',
    referenceNumber: row.reference_number || '',
    paidAt: row.paid_at || new Date().toISOString(),
    recordedBy: Number(row.recorded_by || 1),
    recordedByName: row.recorded_by_name || 'Finance Manager'
  };
}

/**
 * Core TravelCMS REST API Client.
 * Directly communicates with MySQL Database via the backend PHP REST Gateway.
 */
export const apiClient = {
  // -------------------------------------------------------------------------
  // Bookings API (Live Database)
  // -------------------------------------------------------------------------
  bookings: {
    async list(filters?: { status?: BookingStatus; search?: string }): Promise<Booking[]> {
      const cached = readCache<Booking>(DB_KEYS.BOOKINGS);
      try {
        const queryParams = new URLSearchParams();
        if (filters?.status) queryParams.set('status', filters.status);
        if (filters?.search) queryParams.set('search', filters.search);
        
        const qStr = queryParams.toString();
        const res = await requestApi<{ data: any[]; count: number }>(`/bookings${qStr ? `?${qStr}` : ''}`);
        
        if (Array.isArray(res?.data) && res.data.length > 0) {
          const mapped = res.data.map(mapSqlBooking);
          writeCache(DB_KEYS.BOOKINGS, mapped);
          return mapped;
        }
      } catch (err) {
        // Backend query fallback to local cache
      }

      let list = cached;
      if (filters?.status) list = list.filter(b => b.status === filters.status);
      if (filters?.search) {
        const query = filters.search.toLowerCase();
        list = list.filter(b => 
          b.bookingCode.toLowerCase().includes(query) ||
          b.clientName.toLowerCase().includes(query) ||
          b.clientEmail.toLowerCase().includes(query)
        );
      }
      return list;
    },

    async getById(id: number): Promise<Booking> {
      try {
        const res = await requestApi<{ data: any }>(`/bookings/${id}`);
        if (res?.data) {
          return mapSqlBooking(res.data);
        }
      } catch (err) {
        // Fallback to cache
      }
      const list = readCache<Booking>(DB_KEYS.BOOKINGS);
      const found = list.find(b => b.id === id);
      if (!found) throw new Error(`Booking #${id} not found in database.`);
      return found;
    },

    async create(data: Omit<Booking, 'id' | 'bookingCode'>): Promise<Booking> {
      let newId = Date.now();
      let bookingCode = `PNH-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 900) + 100)}`;
      
      try {
        const res = await requestApi<{ success: boolean; id: number; bookingCode: string }>(
          '/bookings',
          {
            method: 'POST',
            body: JSON.stringify(data)
          }
        );
        if (res?.id) newId = res.id;
        if (res?.bookingCode) bookingCode = res.bookingCode;
      } catch (err) {
        console.warn('Backend booking create fallback to local database:', err);
      }

      const newBooking: Booking = {
        ...data,
        id: newId,
        bookingCode,
        createdAt: data.createdAt || new Date().toISOString().split('T')[0],
        itineraryDays: data.itineraryDays || [],
        statusHistory: [
          {
            id: `sh-${newId}-1`,
            bookingId: newId,
            bookingCode,
            fromStatus: null,
            toStatus: data.status || 'PROPOSED',
            changedAt: new Date().toISOString(),
            changedBy: {
              id: data.createdBy || 1,
              name: data.createdByName || 'Staff Member',
              role: 'SALES'
            },
            reason: 'Initial booking registered in database.',
            source: 'ADMIN_PORTAL'
          }
        ]
      };

      const list = readCache<Booking>(DB_KEYS.BOOKINGS);
      writeCache(DB_KEYS.BOOKINGS, [newBooking, ...list.filter(b => b.id !== newBooking.id)]);
      return newBooking;
    },

    async update(id: number, updates: Partial<Booking>): Promise<Booking> {
      const list = readCache<Booking>(DB_KEYS.BOOKINGS);
      const index = list.findIndex(b => b.id === id);
      let updated: Booking;
      if (index !== -1) {
        updated = { ...list[index], ...updates, id };
        list[index] = updated;
        writeCache(DB_KEYS.BOOKINGS, list);
      } else {
        updated = { id, bookingCode: `PNH-${id}`, clientName: 'Client', ...updates } as Booking;
        writeCache(DB_KEYS.BOOKINGS, [updated, ...list]);
      }

      try {
        await requestApi<{ success: boolean }>(`/bookings/${id}`, {
          method: 'POST',
          body: JSON.stringify(updates)
        });
      } catch (err) {
        console.warn(`Booking #${id} update persisted in local database:`, err);
      }

      return updated;
    },

    async updateStatus(
      id: number,
      newStatus: BookingStatus,
      options?: {
        reason?: string;
        notes?: string;
        actor?: { id?: number; name: string; role: string; email?: string };
        source?: 'ADMIN_PORTAL' | 'OPERATIONS' | 'FIELD_APP' | 'SYSTEM' | 'BULK_ACTION';
      }
    ): Promise<Booking> {
      const list = readCache<Booking>(DB_KEYS.BOOKINGS);
      const index = list.findIndex(b => b.id === id);
      if (index === -1) throw new Error(`Booking #${id} not found.`);

      const current = list[index];
      const oldStatus = current.status;

      const historyEntry: BookingStatusHistoryEntry = {
        id: `sh-${id}-${Date.now()}`,
        bookingId: id,
        bookingCode: current.bookingCode,
        fromStatus: oldStatus,
        toStatus: newStatus,
        changedAt: new Date().toISOString(),
        changedBy: {
          id: options?.actor?.id || 1,
          name: options?.actor?.name || 'Staff Member',
          role: options?.actor?.role || 'SUPER_ADMIN',
          email: options?.actor?.email
        },
        reason: options?.reason || `Status updated from ${oldStatus} to ${newStatus}`,
        notes: options?.notes || '',
        source: options?.source || 'ADMIN_PORTAL'
      };

      const updated: Booking = {
        ...current,
        status: newStatus,
        statusHistory: [...(current.statusHistory || []), historyEntry]
      };

      list[index] = updated;
      writeCache(DB_KEYS.BOOKINGS, list);

      try {
        await requestApi<{ success: boolean; status: string }>(`/bookings/${id}/status`, {
          method: 'POST',
          body: JSON.stringify({
            status: newStatus,
            reason: options?.reason,
            notes: options?.notes,
            source: options?.source
          })
        });
      } catch (err) {
        console.warn(`Status update for booking #${id} persisted in local database:`, err);
      }

      return updated;
    },

    async delete(id: number): Promise<void> {
      const list = readCache<Booking>(DB_KEYS.BOOKINGS);
      writeCache(DB_KEYS.BOOKINGS, list.filter(b => b.id !== id));

      try {
        await requestApi(`/bookings/${id}`, { method: 'DELETE' });
      } catch (err) {
        console.warn(`Booking #${id} deletion persisted in local database:`, err);
      }
    }
  },

  // -------------------------------------------------------------------------
  // Packages API (Live Database)
  // -------------------------------------------------------------------------
  packages: {
    async list(): Promise<Package[]> {
      try {
        const res = await requestApi<{ data: any[]; count: number }>('/packages');
        if (Array.isArray(res.data)) {
          const mapped = res.data.map(mapSqlPackage);
          writeCache(DB_KEYS.PACKAGES, mapped);
          return mapped;
        }
      } catch (err) {
        console.warn('Packages API query fallback to cache:', err);
      }
      return readCache<Package>(DB_KEYS.PACKAGES);
    },

    async getById(id: number): Promise<Package> {
      const list = await this.list();
      const found = list.find(p => p.id === id);
      if (!found) throw new Error(`Package #${id} not found in database.`);
      return found;
    },

    async create(pkg: Omit<Package, 'id'>): Promise<Package> {
      let createdId = Date.now();
      try {
        const res = await requestApi<{ success: boolean; id: number; message: string }>('/packages', {
          method: 'POST',
          body: JSON.stringify(pkg)
        });
        if (res?.id) createdId = res.id;
      } catch (err: any) {
        console.warn('Backend package create fallback to local cache:', err);
      }

      const created: Package = {
        ...pkg,
        id: createdId,
        slug: pkg.slug || pkg.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')
      };
      const list = readCache<Package>(DB_KEYS.PACKAGES);
      writeCache(DB_KEYS.PACKAGES, [created, ...list.filter(p => p.id !== created.id)]);
      return created;
    },

    async update(id: number, updates: Partial<Package>): Promise<Package> {
      try {
        await requestApi<{ success: boolean; message: string }>(`/packages/${id}`, {
          method: 'PUT',
          body: JSON.stringify(updates)
        });
      } catch (err) {
        console.warn(`Package #${id} database update failed, falling back to cache:`, err);
      }

      const list = readCache<Package>(DB_KEYS.PACKAGES);
      const index = list.findIndex(p => p.id === id);
      if (index === -1) throw new Error(`Package #${id} not found.`);
      const updated = { ...list[index], ...updates, id };
      list[index] = updated;
      writeCache(DB_KEYS.PACKAGES, list);
      return updated;
    },

    async delete(id: number): Promise<void> {
      try {
        await requestApi<{ success: boolean; message: string }>(`/packages/${id}`, {
          method: 'DELETE'
        });
      } catch (err) {
        console.warn(`Package #${id} database delete failed, falling back to cache:`, err);
      }

      const list = readCache<Package>(DB_KEYS.PACKAGES);
      writeCache(DB_KEYS.PACKAGES, list.filter(p => p.id !== id));
    }
  },

  // -------------------------------------------------------------------------
  // Vendors API (Live Database)
  // -------------------------------------------------------------------------
  vendors: {
    async list(): Promise<Vendor[]> {
      try {
        const res = await requestApi<{ data: any[]; count: number }>('/vendors');
        if (Array.isArray(res.data)) {
          const mapped = res.data.map(mapSqlVendor);
          writeCache(DB_KEYS.VENDORS, mapped);
          return mapped;
        }
      } catch (err) {
        console.warn('Vendors API query fallback to cache:', err);
      }
      return readCache<Vendor>(DB_KEYS.VENDORS);
    },

    async getById(id: number): Promise<Vendor> {
      const list = await this.list();
      const found = list.find(v => v.id === id);
      if (!found) throw new Error(`Vendor #${id} not found in database.`);
      return found;
    },

    async create(vendor: Omit<Vendor, 'id'>): Promise<Vendor> {
      let createdId = Date.now();
      try {
        const res = await requestApi<{ success: boolean; id: number; message: string }>('/vendors', {
          method: 'POST',
          body: JSON.stringify(vendor)
        });
        if (res?.id) createdId = res.id;
      } catch (err: any) {
        console.warn('Backend vendor create fallback to local database:', err);
      }

      const created: Vendor = {
        ...vendor,
        id: createdId,
        isActive: vendor.isActive ?? true
      };
      const list = readCache<Vendor>(DB_KEYS.VENDORS);
      writeCache(DB_KEYS.VENDORS, [created, ...list.filter(v => v.id !== created.id)]);
      return created;
    },

    async update(id: number, updates: Partial<Vendor>): Promise<Vendor> {
      try {
        await requestApi<{ success: boolean; message: string }>(`/vendors/${id}`, {
          method: 'PUT',
          body: JSON.stringify(updates)
        });
      } catch (err) {
        console.warn(`Vendor #${id} database update failed, falling back to cache:`, err);
      }

      const list = readCache<Vendor>(DB_KEYS.VENDORS);
      const index = list.findIndex(v => v.id === id);
      if (index === -1) throw new Error(`Vendor #${id} not found.`);
      const updated = { ...list[index], ...updates, id };
      list[index] = updated;
      writeCache(DB_KEYS.VENDORS, list);
      return updated;
    },

    async delete(id: number): Promise<void> {
      try {
        await requestApi<{ success: boolean; message: string }>(`/vendors/${id}`, {
          method: 'DELETE'
        });
      } catch (err) {
        console.warn(`Vendor #${id} database delete failed, falling back to cache:`, err);
      }

      const list = readCache<Vendor>(DB_KEYS.VENDORS);
      writeCache(DB_KEYS.VENDORS, list.filter(v => v.id !== id));
    }
  },

  // -------------------------------------------------------------------------
  // Operations & Allocations API (Accounts Payable)
  // -------------------------------------------------------------------------
  operations: {
    async listAllocations(filter?: { bookingId?: number; paymentStatus?: string }): Promise<OperationAllocation[]> {
      try {
        const queryParams = new URLSearchParams();
        if (filter?.bookingId) queryParams.set('booking_id', String(filter.bookingId));
        if (filter?.paymentStatus) queryParams.set('payment_status', filter.paymentStatus);

        const qStr = queryParams.toString();
        const res = await requestApi<{ data: any[]; count: number }>(`/allocations${qStr ? `?${qStr}` : ''}`);
        if (Array.isArray(res.data)) {
          const mapped = res.data.map(mapSqlAllocation);
          writeCache(DB_KEYS.ALLOCATIONS, mapped);
          return mapped;
        }
      } catch (err) {
        console.warn('Allocations API fallback to cache:', err);
      }

      let list = readCache<OperationAllocation>(DB_KEYS.ALLOCATIONS);
      if (filter?.bookingId) list = list.filter(a => a.bookingId === filter.bookingId);
      if (filter?.paymentStatus) list = list.filter(a => a.paymentStatus === filter.paymentStatus);
      return list;
    },

    async createAllocation(allocation: Omit<OperationAllocation, 'id' | 'amountPaid' | 'paymentStatus'>): Promise<OperationAllocation> {
      let createdId = Date.now();
      try {
        const res = await requestApi<{ success: boolean; id: number; message: string }>('/allocations', {
          method: 'POST',
          body: JSON.stringify(allocation)
        });
        if (res?.id) createdId = res.id;
      } catch (err: any) {
        console.warn('Backend allocation create fallback to local database:', err);
      }

      const created: OperationAllocation = {
        ...allocation,
        id: createdId,
        amountPaid: 0,
        paymentStatus: 'PENDING'
      };
      const list = readCache<OperationAllocation>(DB_KEYS.ALLOCATIONS);
      writeCache(DB_KEYS.ALLOCATIONS, [created, ...list.filter(a => a.id !== created.id)]);
      return created;
    },

    async updateAllocation(id: number, updates: Partial<OperationAllocation>): Promise<OperationAllocation> {
      try {
        await requestApi<{ success: boolean; id: number }>(`/allocations/${id}`, {
          method: 'PUT',
          body: JSON.stringify(updates)
        });
      } catch (err) {
        console.warn(`Allocation #${id} database update failed, falling back to cache:`, err);
      }

      const list = readCache<OperationAllocation>(DB_KEYS.ALLOCATIONS);
      const index = list.findIndex(a => a.id === id);
      if (index === -1) throw new Error(`Allocation #${id} not found.`);
      
      const existing = list[index];
      const agreedCost = updates.agreedCost !== undefined ? Number(updates.agreedCost) : existing.agreedCost;
      const amountPaid = updates.amountPaid !== undefined ? Number(updates.amountPaid) : existing.amountPaid;
      
      let paymentStatus = existing.paymentStatus;
      if (amountPaid >= agreedCost && agreedCost > 0) {
        paymentStatus = 'SETTLED';
      } else if (amountPaid > 0) {
        paymentStatus = 'PARTIALLY_PAID';
      } else {
        paymentStatus = 'PENDING';
      }

      const updated = {
        ...existing,
        ...updates,
        agreedCost,
        amountPaid,
        paymentStatus
      };
      list[index] = updated;
      writeCache(DB_KEYS.ALLOCATIONS, list);
      return updated;
    },

    async deleteAllocation(id: number): Promise<void> {
      try {
        await requestApi<{ success: boolean }>(`/allocations/${id}`, {
          method: 'DELETE'
        });
      } catch (err) {
        console.warn(`Allocation #${id} database delete failed, falling back to cache:`, err);
      }

      const list = readCache<OperationAllocation>(DB_KEYS.ALLOCATIONS);
      writeCache(DB_KEYS.ALLOCATIONS, list.filter(a => a.id !== id));
    },

    async listPayments(): Promise<VendorPayment[]> {
      try {
        const res = await requestApi<{ data: any[]; count: number }>('/vendor-payments');
        if (Array.isArray(res.data)) {
          const mapped = res.data.map(mapSqlVendorPayment);
          writeCache(DB_KEYS.VENDOR_PAYMENTS, mapped);
          return mapped;
        }
      } catch (err) {
        console.warn('Vendor payments query fallback to cache:', err);
      }
      return readCache<VendorPayment>(DB_KEYS.VENDOR_PAYMENTS);
    },

    async recordPayment(payment: Omit<VendorPayment, 'id' | 'paidAt'>): Promise<{ payment: VendorPayment; allocation: OperationAllocation }> {
      let paymentId = Date.now();
      const allocations = readCache<OperationAllocation>(DB_KEYS.ALLOCATIONS);
      const allocIndex = allocations.findIndex(a => a.id === payment.operationAllocationId);
      const currentAlloc = allocIndex !== -1 ? allocations[allocIndex] : null;
      
      const currentPaid = currentAlloc ? currentAlloc.amountPaid : 0;
      const targetAgreed = currentAlloc ? currentAlloc.agreedCost : payment.amount;
      const calculatedPaidAmount = currentPaid + payment.amount;
      let calculatedStatus: PaymentStatus = 'PARTIALLY_PAID';
      if (calculatedPaidAmount >= targetAgreed && targetAgreed > 0) {
        calculatedStatus = 'SETTLED';
      }

      let newPaidAmount = calculatedPaidAmount;
      let newPaymentStatus: PaymentStatus = calculatedStatus;

      try {
        const res = await requestApi<{
          success: boolean;
          paymentId: number;
          newPaidAmount: number;
          newPaymentStatus: PaymentStatus;
        }>('/vendor-payments', {
          method: 'POST',
          body: JSON.stringify(payment)
        });

        if (res?.paymentId) paymentId = res.paymentId;
        if (res?.newPaidAmount !== undefined) newPaidAmount = res.newPaidAmount;
        if (res?.newPaymentStatus) newPaymentStatus = res.newPaymentStatus;
      } catch (err: any) {
        console.warn('Backend payment record fallback to local database:', err);
      }

      const newPayment: VendorPayment = {
        ...payment,
        id: paymentId,
        paidAt: new Date().toISOString()
      };

      let updatedAllocation: OperationAllocation;

      if (allocIndex !== -1 && currentAlloc) {
        updatedAllocation = {
          ...currentAlloc,
          amountPaid: newPaidAmount,
          paymentStatus: newPaymentStatus
        };
        allocations[allocIndex] = updatedAllocation;
        writeCache(DB_KEYS.ALLOCATIONS, allocations);
      } else {
        updatedAllocation = {
          id: payment.operationAllocationId,
          bookingId: 0,
          bookingCode: '',
          vendorId: 0,
          vendorName: '',
          serviceType: 'OTHER',
          serviceDate: '',
          agreedCost: newPaidAmount,
          amountPaid: newPaidAmount,
          paymentStatus: newPaymentStatus,
          fieldUpdatedByOperator: false,
          specialNotes: ''
        };
      }

      const payments = readCache<VendorPayment>(DB_KEYS.VENDOR_PAYMENTS);
      writeCache(DB_KEYS.VENDOR_PAYMENTS, [newPayment, ...payments.filter(p => p.id !== newPayment.id)]);
      return { payment: newPayment, allocation: updatedAllocation };
    }
  },

  // -------------------------------------------------------------------------
  // Users & Auth API (Live Database)
  // -------------------------------------------------------------------------
  users: {
    async list(): Promise<User[]> {
      const cached = readCache<User>(DB_KEYS.USERS);
      try {
        const res = await requestApi<{ data: any[]; count: number }>('/users');
        if (Array.isArray(res?.data) && res.data.length > 0) {
          const mapped = res.data.map(mapSqlUser);
          writeCache(DB_KEYS.USERS, mapped);
          return mapped;
        }
      } catch (err) {
        // Expected fallback
      }
      return cached;
    },

    async create(user: { name: string; email: string; role: string; phone?: string; password?: string; isActive?: boolean }): Promise<User> {
      let createdId = Date.now();
      try {
        const res = await requestApi<{ success: boolean; id: number; user: any; message: string }>('/users', {
          method: 'POST',
          body: JSON.stringify(user)
        });
        if (res?.id) createdId = res.id;
      } catch (err) {
        console.warn('Backend user create failed, saving to cache:', err);
      }

      const created: User = {
        id: createdId,
        name: user.name,
        email: user.email,
        role: user.role as any,
        phone: user.phone || '',
        password: user.password || 'password',
        isActive: user.isActive ?? true
      };
      const list = readCache<User>(DB_KEYS.USERS);
      writeCache(DB_KEYS.USERS, [created, ...list.filter(u => u.id !== created.id)]);
      return created;
    },

    async update(id: number, updates: Partial<User>): Promise<User> {
      const list = readCache<User>(DB_KEYS.USERS);
      const index = list.findIndex(u => u.id === id);
      let updated: User;
      if (index !== -1) {
        updated = { ...list[index], ...updates, id };
        list[index] = updated;
        writeCache(DB_KEYS.USERS, list);
      } else {
        updated = { id, name: 'User', email: 'user@pailanepal.com', role: 'SALES', isActive: true, ...updates } as User;
        writeCache(DB_KEYS.USERS, [updated, ...list]);
      }

      try {
        await requestApi<{ success: boolean; message: string }>(`/users/${id}`, {
          method: 'PUT',
          body: JSON.stringify(updates)
        });
      } catch (err) {
        console.warn(`User #${id} database update failed, cached locally:`, err);
      }

      return updated;
    },

    async delete(id: number): Promise<void> {
      const list = readCache<User>(DB_KEYS.USERS);
      writeCache(DB_KEYS.USERS, list.filter(u => u.id !== id));

      try {
        await requestApi<{ success: boolean; message: string }>(`/users/${id}`, {
          method: 'DELETE'
        });
      } catch (err) {
        console.warn(`User #${id} database delete failed:`, err);
      }
    },

    async setPassword(id: number, password: string): Promise<void> {
      const list = readCache<User>(DB_KEYS.USERS);
      const index = list.findIndex(u => u.id === id);
      if (index !== -1) {
        list[index] = { ...list[index], password };
        writeCache(DB_KEYS.USERS, list);
      }

      try {
        await requestApi<{ success: boolean; message: string }>(`/users/${id}/password`, {
          method: 'POST',
          body: JSON.stringify({ password })
        });
      } catch (err) {
        console.warn(`User #${id} setPassword database update failed:`, err);
      }
    }
  },

  // -------------------------------------------------------------------------
  // Company Settings API (Live Database)
  // -------------------------------------------------------------------------
  settings: {
    async get(): Promise<CompanySettings | null> {
      try {
        const res = await requestApi<{ data: any }>('/settings');
        if (res?.data) {
          const db = res.data;
          return {
            companyName: db.company_name,
            tagline: db.tagline || '',
            domain: db.domain || '',
            address: db.address || '',
            phone: db.phone || '',
            emergencyPhone: db.emergency_phone || '',
            email: db.email || '',
            panNumber: db.pan_number || '',
            vatNumber: db.vat_number || '',
            registrationNumber: db.registration_number || '',
            currency: db.currency || 'NPR',
            taxRate: Number(db.tax_rate) || 13,
            bankDetails: {
              bankName: db.bank_name || '',
              accountName: db.bank_account_name || '',
              accountNumber: db.bank_account_number || '',
              branch: db.bank_branch || '',
              swiftCode: db.bank_swift_code || ''
            }
          };
        }
      } catch (err) {
        console.warn('Settings API fallback to cache:', err);
      }
      return null;
    },

    async update(settings: Partial<CompanySettings>): Promise<boolean> {
      try {
        await requestApi('/settings', {
          method: 'POST',
          body: JSON.stringify({
            company_name: settings.companyName,
            tagline: settings.tagline,
            domain: settings.domain,
            address: settings.address,
            phone: settings.phone,
            emergency_phone: settings.emergencyPhone,
            email: settings.email,
            pan_number: settings.panNumber,
            vat_number: settings.vatNumber,
            registration_number: settings.registrationNumber,
            currency: settings.currency,
            tax_rate: settings.taxRate,
            bank_name: settings.bankDetails?.bankName,
            bank_account_name: settings.bankDetails?.accountName,
            bank_account_number: settings.bankDetails?.accountNumber,
            bank_branch: settings.bankDetails?.branch,
            bank_swift_code: settings.bankDetails?.swiftCode
          })
        });
        return true;
      } catch (err) {
        console.error('Failed to update company settings in database:', err);
        return false;
      }
    }
  },

  // -------------------------------------------------------------------------
  // Alerts & Safety Escalations API (Live Database)
  // -------------------------------------------------------------------------
  alerts: {
    async getAll(): Promise<Alert[]> {
      try {
        const res = await requestApi<{ data: any[] }>('/alerts');
        if (Array.isArray(res?.data)) {
          const mapped: Alert[] = res.data.map(a => ({
            id: Number(a.id),
            booking_id: a.booking_id ? Number(a.booking_id) : null,
            tour_leader_id: Number(a.tour_leader_id),
            alert_type: a.alert_type,
            severity: a.severity,
            title: a.title,
            description: a.description || null,
            location: a.location || null,
            status: a.status === 'ACTIVE' ? 'PENDING' : a.status,
            acknowledged_by: a.acknowledged_by ? Number(a.acknowledged_by) : null,
            acknowledged_by_name: a.acknowledged_by_name || null,
            acknowledged_at: a.acknowledged_at || null,
            resolved_at: a.resolved_at || null,
            created_at: a.created_at,
            tour_leader_name: a.tour_leader_name || undefined,
            tour_leader_phone: a.tour_leader_phone || undefined,
            booking_code: a.booking_code || undefined,
            client_name: a.client_name || undefined
          }));
          writeCache(DB_KEYS.ALERTS, mapped);
          return mapped;
        }
      } catch (err) {
        console.warn('Alerts API fallback to cache:', err);
      }
      return readCache<Alert>(DB_KEYS.ALERTS);
    },

    async create(alert: Omit<Alert, 'id' | 'status' | 'acknowledged_by' | 'acknowledged_at' | 'created_at'>): Promise<Alert> {
      let createdId = Date.now();
      try {
        const res = await requestApi<{ success: boolean; id: number }>('/alerts', {
          method: 'POST',
          body: JSON.stringify(alert)
        });
        if (res?.id) createdId = res.id;
      } catch (err) {
        console.warn('Alert DB creation failed, saving to cache:', err);
      }

      const newAlert: Alert = {
        ...alert,
        id: createdId,
        status: 'PENDING',
        acknowledged_by: null,
        acknowledged_at: null,
        created_at: new Date().toISOString()
      };
      const list = readCache<Alert>(DB_KEYS.ALERTS);
      writeCache(DB_KEYS.ALERTS, [newAlert, ...list]);
      return newAlert;
    },

    async acknowledge(id: number): Promise<void> {
      try {
        await requestApi(`/alerts/${id}/acknowledge`, { method: 'POST' });
      } catch (err) {
        console.warn(`Alert #${id} DB acknowledge fallback:`, err);
      }
      const list = readCache<Alert>(DB_KEYS.ALERTS);
      writeCache(DB_KEYS.ALERTS, list.map(a => a.id === id ? { ...a, status: 'ACKNOWLEDGED', acknowledged_at: new Date().toISOString() } : a));
    },

    async resolve(id: number): Promise<void> {
      try {
        await requestApi(`/alerts/${id}/resolve`, { method: 'POST' });
      } catch (err) {
        console.warn(`Alert #${id} DB resolve fallback:`, err);
      }
      const list = readCache<Alert>(DB_KEYS.ALERTS);
      writeCache(DB_KEYS.ALERTS, list.map(a => a.id === id ? { ...a, status: 'RESOLVED', resolved_at: new Date().toISOString() } : a));
    }
  },

  // -------------------------------------------------------------------------
  // Activities & Audit Stream API (Live Database)
  // -------------------------------------------------------------------------
  activities: {
    async getAll(): Promise<Activity[]> {
      try {
        const res = await requestApi<{ data: Activity[] }>('/activities');
        if (Array.isArray(res?.data)) {
          writeCache(DB_KEYS.ACTIVITIES, res.data);
          return res.data;
        }
      } catch (err) {
        console.warn('Activities API fallback to cache:', err);
      }
      return readCache<Activity>(DB_KEYS.ACTIVITIES);
    },

    async log(activity: Omit<Activity, 'id' | 'timestamp'> & { id?: string | number; timestamp?: string }): Promise<Activity> {
      const id = activity.id !== undefined ? String(activity.id) : `act-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const timestamp = activity.timestamp || new Date().toISOString();
      const newActivity: Activity = { ...activity, id, timestamp };

      try {
        await requestApi('/activities', {
          method: 'POST',
          body: JSON.stringify(newActivity)
        });
      } catch (err) {
        console.warn('Activity DB log fallback to cache:', err);
      }

      const list = readCache<Activity>(DB_KEYS.ACTIVITIES);
      writeCache(DB_KEYS.ACTIVITIES, [newActivity, ...list.slice(0, 99)]);
      return newActivity;
    }
  },

  // -------------------------------------------------------------------------
  // Tour Leader API (Live Database)
  // -------------------------------------------------------------------------
  tourLeader: {
    async getActiveTour(): Promise<any> {
      try {
        const res = await requestApi<{ data: any }>('/tour-leader/active-tour');
        return res?.data || null;
      } catch (err) {
        console.warn('Tour leader active tour API error:', err);
        return null;
      }
    },

    async swapVendor(data: {
      booking_id: number;
      original_vendor_name: string;
      new_vendor_name: string;
      service_type: string;
      reason: string;
      cost_difference?: number;
      payment_method?: string;
      contact_phone?: string;
    }): Promise<boolean> {
      try {
        await requestApi('/tour-leader/swap-vendor', {
          method: 'POST',
          body: JSON.stringify(data)
        });
        return true;
      } catch (err) {
        console.error('Failed to swap vendor in database:', err);
        return false;
      }
    },

    async logExpense(data: {
      booking_id: number;
      amount: number;
      category: string;
      title?: string;
      notes?: string;
      payment_method?: string;
    }): Promise<boolean> {
      try {
        await requestApi('/tour-leader/log-expense', {
          method: 'POST',
          body: JSON.stringify(data)
        });
        return true;
      } catch (err) {
        console.error('Failed to log expense in database:', err);
        return false;
      }
    },

    async updateStatus(data: {
      booking_id: number;
      status: string;
      notes?: string;
    }): Promise<boolean> {
      try {
        await requestApi('/tour-leader/update-status', {
          method: 'POST',
          body: JSON.stringify(data)
        });
        return true;
      } catch (err) {
        console.error('Failed to update tour status in database:', err);
        return false;
      }
    }
  }
};
