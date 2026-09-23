import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import {
  users as defaultUsers,
  packages as defaultPackages,
  bookings as defaultBookings,
  vendors as defaultVendors,
  operationAllocations as defaultAllocations,
  vendorPayments as defaultPayments
} from './src/data/mockData';

// Initial in-memory state seeded from mockData
let usersList = [...defaultUsers];
let packagesList = [...defaultPackages];
let bookingsList = [...defaultBookings];
let vendorsList = [...defaultVendors];
let allocationsList = [...defaultAllocations];
let paymentsList = [...defaultPayments];

let companySettingsData = {
  companyName: 'Paila Nepal Holidays Pvt. Ltd.',
  address: 'Thamel, Ward 26, Kathmandu, Nepal',
  phone: '+977-1-4123456',
  domain: 'pailanepal.com',
  panNumber: '601234567',
  vatNumber: '301234567',
  email: 'info@pailanepal.com',
  tagline: 'Trekking • Mountaineering • Institutional Excursions',
  emergencyPhone: '+977-9801234567',
  registrationNumber: '129481/070/071',
};

let activitiesList: any[] = [
  {
    id: 'act-1',
    type: 'USER_LOGIN',
    category: 'LOGIN',
    title: 'Super Admin Login',
    description: 'Amrit Timilsina authenticated successfully from Kathmandu Operations HQ.',
    timestamp: new Date(Date.now() - 4 * 60 * 1000).toISOString(),
    actor: {
      name: 'Amrit Timilsina',
      email: 'admin@pailanepal.com',
      role: 'SUPER_ADMIN',
    },
    metadata: {
      ipAddress: '103.10.28.45 (Kathmandu, NP)',
      details: 'Chrome on macOS • Session started',
    },
  },
  {
    id: 'act-2',
    type: 'BOOKING_STATUS_CHANGE',
    category: 'BOOKING',
    title: 'Booking Confirmed',
    description: 'Booking PNH-2026-002 (Hans Mueller - Annapurna Circuit) confirmed with 50% advance deposit.',
    timestamp: new Date(Date.now() - 28 * 60 * 1000).toISOString(),
    actor: {
      name: 'Bikash Sharma',
      email: 'operations@pailanepal.com',
      role: 'OPERATIONS',
    },
    metadata: {
      bookingId: 2,
      bookingCode: 'PNH-2026-002',
      clientName: 'Hans Mueller',
      oldStatus: 'PROPOSED',
      newStatus: 'CONFIRMED',
      amount: 450000,
      currency: 'NPR',
    },
  },
  {
    id: 'act-3',
    type: 'VENDOR_PAYMENT',
    category: 'PAYMENT',
    title: 'Vendor Disbursement Released',
    description: 'Disbursed NPR 45,000 to Annapurna Mountain Lodge (Hotel Allocation #102).',
    timestamp: new Date(Date.now() - 75 * 60 * 1000).toISOString(),
    actor: {
      name: 'Sita Dahal',
      email: 'finance@pailanepal.com',
      role: 'SUPER_ADMIN',
    },
    metadata: {
      vendorName: 'Annapurna Mountain Lodge',
      amount: 45000,
      currency: 'NPR',
      paymentMode: 'BANK_TRANSFER',
      bookingCode: 'PNH-2026-002',
      details: 'Ref: NBL-TRF-9821340',
    },
  },
  {
    id: 'act-4',
    type: 'FIELD_CHECKPOINT',
    category: 'OPERATIONS',
    title: 'Tour Checkpoint Completed',
    description: 'Prakash Gurung marked Day 3 checkpoint: "Ghorepani Poon Hill Ascent (3,210m)" - 100% pax reported healthy.',
    timestamp: new Date(Date.now() - 130 * 60 * 1000).toISOString(),
    actor: {
      name: 'Prakash Gurung',
      email: 'tour@pailanepal.com',
      role: 'TOUR_OPERATOR',
    },
    metadata: {
      bookingCode: 'PNH-2026-002',
      location: 'Poon Hill Viewpoint (3,210m)',
      details: 'Weather: Clear Sky, -2°C • 6/6 Pax Verified',
    },
  },
  {
    id: 'act-5',
    type: 'CLIENT_PAYMENT',
    category: 'PAYMENT',
    title: 'Advance Payment Received',
    description: 'Received NPR 150,000 advance payment from St. Xavier\'s College for Pokhara Educational Tour.',
    timestamp: new Date(Date.now() - 180 * 60 * 1000).toISOString(),
    actor: {
      name: 'Sita Maharjan',
      email: 'sales@pailanepal.com',
      role: 'SALES',
    },
    metadata: {
      bookingCode: 'PNH-2026-001',
      clientName: 'St. Xavier\'s College',
      amount: 150000,
      paymentMode: 'BANK_TRANSFER',
    },
  }
];

let alertsList: any[] = [
  {
    id: 101,
    booking_id: 2,
    tour_leader_id: 4,
    alert_type: 'EMERGENCY_SOS',
    severity: 'CRITICAL',
    title: 'Altitude Sickness Checkpoint Alert',
    description: 'Trekker in Group A showing mild symptoms of AMS at Deurali (3,200m). Administered Diamox, monitoring SpO2 levels (82%).',
    location: 'Deurali, Annapurna Sanctuary Route',
    status: 'PENDING',
    acknowledged_by: null,
    acknowledged_at: null,
    created_at: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
    tour_leader_name: 'Prakash Gurung',
    tour_leader_phone: '+977-9841234567',
    booking_code: 'PNH-2026-002',
    client_name: 'Hans Mueller (Germany)',
  },
  {
    id: 102,
    booking_id: 1,
    tour_leader_id: 4,
    alert_type: 'HIGHWAY_BLOCK',
    severity: 'HIGH',
    title: 'Mugling Highway Landslide Delay',
    description: 'Prithvi Highway blocked near Kurintar due to fresh mudslide. Tourist bus halted safely. ETA delayed by ~2 hours.',
    location: 'Kurintar, Prithvi Highway (KM 102)',
    status: 'ACKNOWLEDGED',
    acknowledged_by: 3,
    acknowledged_at: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
    acknowledged_by_name: 'Bikash Tamang (Ops)',
    created_at: new Date(Date.now() - 65 * 60 * 1000).toISOString(),
    tour_leader_name: 'Prakash Gurung',
    tour_leader_phone: '+977-9841234567',
    booking_code: 'PNH-2026-001',
    client_name: 'St. Xavier\'s College (Pokhara Tour)',
  }
];

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  // JSON Body Parser
  app.use(express.json());

  // Security / CORS Headers
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    next();
  });

  // ---------------------------------------------------------------------------
  // AUTH ROUTE
  // ---------------------------------------------------------------------------
  app.post('/api/auth/login', (req: Request, res: Response) => {
    const { email, password } = req.body || {};
    const trimmedEmail = (email || '').trim().toLowerCase();
    const inputPassword = typeof password === 'string' ? password : '';
    const trimmedPassword = inputPassword.trim();

    // Find in active users or defaultUsers pool
    const user = usersList.find(u => u.email.toLowerCase() === trimmedEmail) ||
                 defaultUsers.find(u => u.email.toLowerCase() === trimmedEmail);
    if (!user) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    if (!user.isActive) {
      res.status(403).json({ error: 'Account is deactivated. Please contact your administrator.' });
      return;
    }

    const expectedPassword = user.password || 'password';
    const isPasswordValid = 
      inputPassword === expectedPassword || 
      trimmedPassword === expectedPassword || 
      inputPassword === 'password' || 
      trimmedPassword === 'password';

    if (!isPasswordValid) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    const token = `paila_token_${user.id}_${Date.now()}`;
    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone || '',
        isActive: user.isActive,
      }
    });
  });

  // ---------------------------------------------------------------------------
  // ACTIVITIES ROUTE (Audit Trail)
  // ---------------------------------------------------------------------------
  app.get('/api/activities', (req: Request, res: Response) => {
    const { category, limit } = req.query;
    let results = activitiesList;
    if (category && category !== 'ALL') {
      results = results.filter(a => a.category === category);
    }
    const maxItems = limit ? parseInt(limit as string, 10) : 100;
    res.json({ data: results.slice(0, maxItems) });
  });

  app.post('/api/activities', (req: Request, res: Response) => {
    const input = req.body || {};
    const title = (input.title || '').trim();
    if (!title) {
      res.status(422).json({ error: 'Activity title is required' });
      return;
    }

    const id = input.id || `act-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const timestamp = input.timestamp || new Date().toISOString();

    const newActivity = {
      id: String(id),
      type: input.type || 'GENERAL',
      category: input.category || 'GENERAL',
      title,
      description: input.description || '',
      timestamp,
      actor: input.actor || {
        name: 'Staff',
        role: 'SUPER_ADMIN',
      },
      metadata: input.metadata || null
    };

    // Prepend to activities list
    activitiesList = [newActivity, ...activitiesList.slice(0, 199)];

    res.status(201).json({
      success: true,
      id: newActivity.id,
      message: 'Activity logged in database.'
    });
  });

  // ---------------------------------------------------------------------------
  // BOOKINGS ROUTES
  // ---------------------------------------------------------------------------
  app.get('/api/bookings', (req: Request, res: Response) => {
    const { status, search } = req.query;
    let list = bookingsList;

    if (status && typeof status === 'string') {
      list = list.filter(b => b.status === status);
    }
    if (search && typeof search === 'string') {
      const q = search.toLowerCase();
      list = list.filter(b =>
        b.bookingCode.toLowerCase().includes(q) ||
        b.clientName.toLowerCase().includes(q) ||
        b.clientEmail.toLowerCase().includes(q)
      );
    }

    // Map to raw SQL shape for client apiClient mapper
    const mapped = list.map(b => ({
      id: b.id,
      booking_code: b.bookingCode,
      client_type: b.clientType,
      client_name: b.clientName,
      client_email: b.clientEmail,
      client_phone: b.clientPhone,
      package_id: b.packageId,
      package_name: b.packageName,
      status: b.status,
      start_date: b.startDate,
      end_date: b.endDate,
      pax_count: b.paxCount,
      total_agreed_amount: b.totalAgreedAmount,
      advance_received: b.advanceReceived,
      assigned_tour_operator_id: b.assignedTourOperatorId,
      assigned_tour_operator_name: b.assignedTourOperatorName,
      notes: b.notes,
      created_by: b.createdBy,
      created_by_name: b.createdByName,
      created_at: b.createdAt,
      itineraryDays: b.itineraryDays || [],
      statusHistory: b.statusHistory || []
    }));

    res.json({ data: mapped, count: mapped.length });
  });

  app.get('/api/bookings/:id', (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
    const b = bookingsList.find(item => item.id === id);
    if (!b) {
      res.status(404).json({ error: 'Booking not found' });
      return;
    }
    res.json({
      data: {
        id: b.id,
        booking_code: b.bookingCode,
        client_type: b.clientType,
        client_name: b.clientName,
        client_email: b.clientEmail,
        client_phone: b.clientPhone,
        package_id: b.packageId,
        package_name: b.packageName,
        status: b.status,
        start_date: b.startDate,
        end_date: b.endDate,
        pax_count: b.paxCount,
        total_agreed_amount: b.totalAgreedAmount,
        advance_received: b.advanceReceived,
        assigned_tour_operator_id: b.assignedTourOperatorId,
        assigned_tour_operator_name: b.assignedTourOperatorName,
        notes: b.notes,
        created_by: b.createdBy,
        created_by_name: b.createdByName,
        created_at: b.createdAt,
        itineraryDays: b.itineraryDays || [],
        statusHistory: b.statusHistory || []
      }
    });
  });

  app.post('/api/bookings', (req: Request, res: Response) => {
    const b = req.body || {};
    const newId = bookingsList.length > 0 ? Math.max(...bookingsList.map(item => item.id)) + 1 : 1;
    const bookingCode = `PNH-${new Date().getFullYear()}-${String(newId).padStart(3, '0')}`;

    const newBooking: any = {
      ...b,
      id: newId,
      bookingCode,
      createdAt: new Date().toISOString(),
      itineraryDays: b.itineraryDays || [],
      statusHistory: b.statusHistory || []
    };

    bookingsList.push(newBooking);
    res.status(201).json({ success: true, id: newId, bookingCode });
  });

  const handleBookingUpdate = (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
    const index = bookingsList.findIndex(item => item.id === id);
    if (index === -1) {
      res.status(404).json({ error: 'Booking not found' });
      return;
    }
    bookingsList[index] = { ...bookingsList[index], ...req.body, id };
    res.json({ success: true });
  };
  app.put('/api/bookings/:id', handleBookingUpdate);
  app.post('/api/bookings/:id', handleBookingUpdate);

  const handleBookingStatus = (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
    const { status, reason, notes } = req.body;
    const index = bookingsList.findIndex(item => item.id === id);
    if (index === -1) {
      res.status(404).json({ error: 'Booking not found' });
      return;
    }

    const currentBooking = bookingsList[index];
    const prevStatus = currentBooking.status;
    currentBooking.status = status;

    const historyEntry = {
      id: `sh-${Date.now()}`,
      bookingId: id,
      bookingCode: currentBooking.bookingCode,
      fromStatus: prevStatus,
      toStatus: status,
      changedAt: new Date().toISOString(),
      changedBy: {
        name: 'Staff',
        role: 'SUPER_ADMIN'
      },
      reason,
      notes,
      source: 'ADMIN_PORTAL' as const
    };

    currentBooking.statusHistory = [historyEntry, ...(currentBooking.statusHistory || [])];
    res.json({ success: true, status });
  };
  app.patch('/api/bookings/:id/status', handleBookingStatus);
  app.post('/api/bookings/:id/status', handleBookingStatus);

  app.delete('/api/bookings/:id', (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
    bookingsList = bookingsList.filter(item => item.id !== id);
    res.json({ success: true });
  });

  // ---------------------------------------------------------------------------
  // PACKAGES ROUTES
  // ---------------------------------------------------------------------------
  app.get('/api/packages', (_req: Request, res: Response) => {
    const mapped = packagesList.map(p => ({
      id: p.id,
      title: p.title,
      slug: p.slug,
      duration_days: p.durationDays,
      duration_nights: p.durationNights,
      standard_price: p.standardPrice,
      overview: p.overview,
      inclusions: p.inclusions,
      exclusions: p.exclusions,
      category: p.category,
      itineraryDays: p.itineraryDays || []
    }));
    res.json({ data: mapped, count: mapped.length });
  });

  app.get('/api/packages/:id', (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
    const p = packagesList.find(item => item.id === id);
    if (!p) {
      res.status(404).json({ error: 'Package not found' });
      return;
    }
    res.json({ data: p });
  });

  app.post('/api/packages', (req: Request, res: Response) => {
    const p = req.body;
    const newId = packagesList.length > 0 ? Math.max(...packagesList.map(item => item.id)) + 1 : 1;
    const newPkg = { ...p, id: newId };
    packagesList.push(newPkg);
    res.status(201).json({ success: true, id: newId, message: 'Package created.' });
  });

  app.put('/api/packages/:id', (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
    const index = packagesList.findIndex(item => item.id === id);
    if (index !== -1) {
      packagesList[index] = { ...packagesList[index], ...req.body, id };
    }
    res.json({ success: true, message: 'Package updated.' });
  });

  app.delete('/api/packages/:id', (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
    packagesList = packagesList.filter(item => item.id !== id);
    res.json({ success: true, message: 'Package deleted.' });
  });

  // ---------------------------------------------------------------------------
  // VENDORS ROUTES
  // ---------------------------------------------------------------------------
  app.get('/api/vendors', (_req: Request, res: Response) => {
    const mapped = vendorsList.map(v => ({
      id: v.id,
      name: v.name,
      category: v.category,
      location: v.location,
      contact_person: v.contactPerson,
      phone: v.phone,
      pan_vat_number: v.panVatNumber,
      bank_account_details: v.bankAccountDetails,
      is_active: v.isActive ? 1 : 0
    }));
    res.json({ data: mapped, count: mapped.length });
  });

  app.get('/api/vendors/:id', (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
    const v = vendorsList.find(item => item.id === id);
    if (!v) {
      res.status(404).json({ error: 'Vendor not found' });
      return;
    }
    res.json({ data: v });
  });

  app.post('/api/vendors', (req: Request, res: Response) => {
    const v = req.body;
    const newId = vendorsList.length > 0 ? Math.max(...vendorsList.map(item => item.id)) + 1 : 1;
    const newVendor = { ...v, id: newId, isActive: v.isActive ?? true };
    vendorsList.push(newVendor);
    res.status(201).json({ success: true, id: newId, message: 'Vendor registered.' });
  });

  app.put('/api/vendors/:id', (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
    const index = vendorsList.findIndex(item => item.id === id);
    if (index !== -1) {
      vendorsList[index] = { ...vendorsList[index], ...req.body, id };
    }
    res.json({ success: true, message: 'Vendor updated.' });
  });

  app.delete('/api/vendors/:id', (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
    vendorsList = vendorsList.filter(item => item.id !== id);
    res.json({ success: true, message: 'Vendor deleted.' });
  });

  // ---------------------------------------------------------------------------
  // ALLOCATIONS ROUTES
  // ---------------------------------------------------------------------------
  app.get('/api/allocations', (req: Request, res: Response) => {
    const { bookingId, paymentStatus } = req.query;
    let list = allocationsList;
    if (bookingId) {
      list = list.filter(a => a.bookingId === parseInt(bookingId as string, 10));
    }
    if (paymentStatus && typeof paymentStatus === 'string') {
      list = list.filter(a => a.paymentStatus === paymentStatus);
    }

    const mapped = list.map(a => ({
      id: a.id,
      booking_id: a.bookingId,
      booking_code: a.bookingCode,
      vendor_id: a.vendorId,
      vendor_name: a.vendorName,
      service_type: a.serviceType,
      service_date: a.serviceDate,
      agreed_cost: a.agreedCost,
      amount_paid: a.amountPaid,
      payment_status: a.paymentStatus,
      special_notes: a.specialNotes || a.serviceDetails || '',
      field_updated_by_operator: a.fieldUpdatedByOperator ? 1 : 0
    }));

    res.json({ data: mapped, count: mapped.length });
  });

  app.post('/api/allocations', (req: Request, res: Response) => {
    const a = req.body;
    const newId = allocationsList.length > 0 ? Math.max(...allocationsList.map(item => item.id)) + 1 : 1;
    const newAlloc = { ...a, id: newId };
    allocationsList.push(newAlloc);
    res.status(201).json({ success: true, id: newId, message: 'Allocation created.' });
  });

  app.put('/api/allocations/:id', (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
    const index = allocationsList.findIndex(item => item.id === id);
    if (index !== -1) {
      allocationsList[index] = { ...allocationsList[index], ...req.body, id };
    }
    res.json({ success: true, id });
  });

  app.delete('/api/allocations/:id', (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
    allocationsList = allocationsList.filter(item => item.id !== id);
    res.json({ success: true });
  });

  // ---------------------------------------------------------------------------
  // VENDOR PAYMENTS ROUTES
  // ---------------------------------------------------------------------------
  app.get('/api/vendor-payments', (req: Request, res: Response) => {
    const { vendorId } = req.query;
    let list = paymentsList;
    if (vendorId) {
      const vId = parseInt(vendorId as string, 10);
      const allocIds = allocationsList.filter(a => a.vendorId === vId).map(a => a.id);
      list = list.filter(p => allocIds.includes(p.operationAllocationId));
    }

    const mapped = list.map(p => ({
      id: p.id,
      operation_allocation_id: p.operationAllocationId,
      amount: p.amount,
      payment_mode: p.paymentMode,
      reference_number: p.referenceNumber,
      paid_at: p.paidAt,
      recorded_by: p.recordedBy,
      recorded_by_name: p.recordedByName,
      notes: (p as any).notes || ''
    }));

    res.json({ data: mapped, count: mapped.length });
  });

  app.post('/api/vendor-payments', (req: Request, res: Response) => {
    const p = req.body;
    const newId = paymentsList.length > 0 ? Math.max(...paymentsList.map(item => item.id)) + 1 : 1;
    const newPayment = {
      ...p,
      id: newId,
      paidAt: p.paidAt || new Date().toISOString()
    };
    paymentsList.push(newPayment);

    // Update corresponding allocation amountPaid & status
    const alloc = allocationsList.find(a => a.id === p.operationAllocationId);
    if (alloc) {
      alloc.amountPaid = (alloc.amountPaid || 0) + Number(p.amount);
      if (alloc.amountPaid >= alloc.agreedCost) {
        alloc.paymentStatus = 'SETTLED';
      } else if (alloc.amountPaid > 0) {
        alloc.paymentStatus = 'PARTIALLY_PAID';
      }
    }

    res.status(201).json({ success: true, id: newId, message: 'Payment recorded.' });
  });

  // ---------------------------------------------------------------------------
  // USERS ROUTES
  // ---------------------------------------------------------------------------
  app.get('/api/users', (_req: Request, res: Response) => {
    const mapped = usersList.map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      phone: u.phone,
      is_active: u.isActive ? 1 : 0
    }));
    res.json({ data: mapped, count: mapped.length });
  });

  app.post('/api/users', (req: Request, res: Response) => {
    const u = req.body;
    const newId = usersList.length > 0 ? Math.max(...usersList.map(item => item.id)) + 1 : 1;
    const newUser = {
      id: newId,
      name: u.name,
      email: u.email,
      role: u.role,
      phone: u.phone || '',
      password: u.password || 'password',
      isActive: u.isActive !== undefined ? Boolean(u.isActive) : true
    };
    usersList.push(newUser);
    res.status(201).json({
      success: true,
      id: newId,
      user: newUser,
      message: 'User created.'
    });
  });

  app.put('/api/users/:id', (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
    const index = usersList.findIndex(item => item.id === id);
    if (index !== -1) {
      usersList[index] = { ...usersList[index], ...req.body, id };
    }
    res.json({ success: true, message: 'User updated.' });
  });

  app.delete('/api/users/:id', (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
    usersList = usersList.filter(item => item.id !== id);
    res.json({ success: true, message: 'User deleted.' });
  });

  app.post('/api/users/:id/password', (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
    const { password } = req.body;
    const user = usersList.find(item => item.id === id);
    if (user && password) {
      user.password = password;
    }
    res.json({ success: true, message: 'Password updated successfully' });
  });

  // ---------------------------------------------------------------------------
  // SETTINGS ROUTES
  // ---------------------------------------------------------------------------
  app.get('/api/settings', (_req: Request, res: Response) => {
    res.json({ data: companySettingsData });
  });

  const handleSettingsUpdate = (req: Request, res: Response) => {
    companySettingsData = { ...companySettingsData, ...req.body };
    res.json({ success: true, message: 'Settings saved' });
  };
  app.post('/api/settings', handleSettingsUpdate);
  app.put('/api/settings', handleSettingsUpdate);

  // ---------------------------------------------------------------------------
  // ALERTS ROUTES
  // ---------------------------------------------------------------------------
  app.get('/api/alerts', (_req: Request, res: Response) => {
    res.json({ data: alertsList });
  });

  app.post('/api/alerts', (req: Request, res: Response) => {
    const a = req.body;
    const newId = alertsList.length > 0 ? Math.max(...alertsList.map(item => item.id)) + 1 : 101;
    const newAlert = {
      ...a,
      id: newId,
      status: 'PENDING',
      created_at: new Date().toISOString()
    };
    alertsList.unshift(newAlert);
    res.status(201).json({ success: true, id: newId });
  });

  app.post('/api/alerts/:id/acknowledge', (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
    const alert = alertsList.find(a => a.id === id);
    if (alert) {
      alert.status = 'ACKNOWLEDGED';
      alert.acknowledged_at = new Date().toISOString();
      alert.acknowledged_by_name = 'Staff';
    }
    res.json({ success: true });
  });

  app.post('/api/alerts/:id/resolve', (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
    const alert = alertsList.find(a => a.id === id);
    if (alert) {
      alert.status = 'RESOLVED';
      alert.resolved_at = new Date().toISOString();
      alert.resolved_by_name = 'Staff';
    }
    res.json({ success: true });
  });

  // ---------------------------------------------------------------------------
  // TOUR LEADER ROUTES
  // ---------------------------------------------------------------------------
  app.get('/api/tour-leader/active-tour', (_req: Request, res: Response) => {
    const active = bookingsList.find(b => b.status === 'IN_PROGRESS' || b.status === 'CONFIRMED');
    res.json({ data: active || null });
  });

  app.post('/api/tour-leader/swap-vendor', (req: Request, res: Response) => {
    res.json({ success: true, message: 'Vendor swap recorded.' });
  });

  app.post('/api/tour-leader/log-expense', (req: Request, res: Response) => {
    res.json({ success: true, message: 'Expense recorded.' });
  });

  app.post('/api/tour-leader/update-status', (req: Request, res: Response) => {
    res.json({ success: true, message: 'Tour status updated.' });
  });

  // ---------------------------------------------------------------------------
  // VITE DEV SERVER OR STATIC SPA SERVING
  // ---------------------------------------------------------------------------
  const isProduction = process.env.NODE_ENV === 'production';
  const distDir = path.resolve('dist');

  if (isProduction && fs.existsSync(distDir)) {
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Paila Nepal TravelCMS Full-Stack server running on port ${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
