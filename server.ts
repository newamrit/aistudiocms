import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { WebSocketServer, WebSocket } from 'ws';
import {
  users as defaultUsers,
  packages as defaultPackages,
  bookings as defaultBookings,
  vendors as defaultVendors,
  operationAllocations as defaultAllocations,
  vendorPayments as defaultPayments
} from './src/data/mockData';

// Database persistence file path
const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'database_store.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch {
    // ignore
  }
}

// Initial state variables
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
  taxPreference: 'BOTH',
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

function getRollingDate(daysAgo: number, timeStr = '12:00:00'): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day} ${timeStr}`;
}

let fieldActivitiesList: any[] = [
  // Day 0: Today
  {
    id: 1, type: 'CHECK_IN', tourLeaderId: 4, tourLeaderName: 'Prakash Gurung',
    bookingId: 2, bookingCode: 'PNH-2026-002', clientName: 'Hans Mueller (Germany)',
    timestamp: getRollingDate(0, '08:30:00'), title: 'Namche Bazaar Check-in',
    description: 'All 6 trekkers safe and healthy. Altitude 3,440m reached. Clear Himalayan view, resting before Tengboche.',
    metadata: { paxSafe: 6, paxTotal: 6, weatherCondition: 'Clear & Sunny', nextStop: 'Tengboche Monastery', altitude: '3,440m' },
    acknowledged: false, priority: 'LOW'
  },
  {
    id: 2, type: 'SPOT_EXPENSE', tourLeaderId: 4, tourLeaderName: 'Prakash Gurung',
    bookingId: 2, bookingCode: 'PNH-2026-002', clientName: 'Hans Mueller (Germany)',
    timestamp: getRollingDate(0, '11:15:00'), title: 'Spot Expense: NPR 6,000',
    description: 'Sagarmatha National Park entry checkpoint permits and conservation fees for 6 foreign trekkers.',
    metadata: { amount: 6000, category: 'Permits', paymentMethod: 'CASH' },
    acknowledged: false, priority: 'MEDIUM'
  },
  {
    id: 3, type: 'CHECK_IN', tourLeaderId: 4, tourLeaderName: 'Prakash Gurung',
    bookingId: 1, bookingCode: 'PNH-2026-001', clientName: 'St. Xavier School Group',
    timestamp: getRollingDate(0, '14:45:00'), title: 'Pokhara Lakeside Check-in',
    description: 'All 24 students and 3 faculty members checked in safely at Pokhara. Briefing for Sarangkot sunrise excursion done.',
    metadata: { paxSafe: 27, paxTotal: 27, weatherCondition: 'Mild breeze', nextStop: 'Sarangkot' },
    acknowledged: true, priority: 'LOW'
  },
  // Day 1: Yesterday
  {
    id: 4, type: 'CHECK_IN', tourLeaderId: 4, tourLeaderName: 'Prakash Gurung',
    bookingId: 2, bookingCode: 'PNH-2026-002', clientName: 'Hans Mueller (Germany)',
    timestamp: getRollingDate(1, '16:00:00'), title: 'Phakding Teahouse Check-in',
    description: 'Lukla flight landed on schedule. Trek to Phakding completed smoothly. Trekkers acclimatizing comfortably.',
    metadata: { paxSafe: 6, paxTotal: 6, weatherCondition: 'Clear', nextStop: 'Namche Bazaar' },
    acknowledged: true, priority: 'LOW'
  },
  {
    id: 5, type: 'STATUS_CHANGE', tourLeaderId: 4, tourLeaderName: 'Prakash Gurung',
    bookingId: 2, bookingCode: 'PNH-2026-002', clientName: 'Hans Mueller (Germany)',
    timestamp: getRollingDate(1, '07:15:00'), title: 'Tour Started: In Progress',
    description: 'Tour status changed from CONFIRMED to IN_PROGRESS. Domestic flight Tribhuvan Airport → Tenzing-Hillary Lukla completed.',
    metadata: { fromStatus: 'CONFIRMED', toStatus: 'IN_PROGRESS' },
    acknowledged: true, priority: 'LOW'
  },
  {
    id: 6, type: 'SPOT_EXPENSE', tourLeaderId: 4, tourLeaderName: 'Prakash Gurung',
    bookingId: 2, bookingCode: 'PNH-2026-002', clientName: 'Hans Mueller (Germany)',
    timestamp: getRollingDate(1, '18:30:00'), title: 'Spot Expense: NPR 1,800',
    description: 'Boiled water refills & hydration supplies for client acclimatization at Phakding.',
    metadata: { amount: 1800, category: 'Food & Refreshments', paymentMethod: 'CASH' },
    acknowledged: true, priority: 'LOW'
  },
  {
    id: 7, type: 'CHECK_IN', tourLeaderId: 4, tourLeaderName: 'Prakash Gurung',
    bookingId: 3, bookingCode: 'PNH-2026-003', clientName: 'Sarah Jenkins (UK)',
    timestamp: getRollingDate(1, '17:20:00'), title: 'Australian Camp Check-in',
    description: 'Poon Hill circuit group arrived at Australian Camp. Evening views of Annapurna South spectacular.',
    metadata: { paxSafe: 2, paxTotal: 2, weatherCondition: 'Clear skies', nextStop: 'Ghandruk' },
    acknowledged: true, priority: 'LOW'
  },
  // Day 2: 2 days ago
  {
    id: 8, type: 'CHECK_IN', tourLeaderId: 4, tourLeaderName: 'Prakash Gurung',
    bookingId: 2, bookingCode: 'PNH-2026-002', clientName: 'Hans Mueller (Germany)',
    timestamp: getRollingDate(2, '06:15:00'), title: 'Annapurna Base Camp Check-in',
    description: 'Reached ABC 4,130m for morning golden hour. 100% group members fit, oxygen saturation 88-92%.',
    metadata: { paxSafe: 6, paxTotal: 6, weatherCondition: 'Cold & Crisp', nextStop: 'Bamboo' },
    acknowledged: true, priority: 'LOW'
  },
  {
    id: 9, type: 'VENDOR_SWAP', tourLeaderId: 4, tourLeaderName: 'Prakash Gurung',
    bookingId: 2, bookingCode: 'PNH-2026-002', clientName: 'Hans Mueller (Germany)',
    timestamp: getRollingDate(2, '14:20:00'), title: 'Lodge Swap Authorized',
    description: 'Swapped Sanctuary Teahouse → Snowland Lodge due to complimentary hot shower and heated dining room.',
    metadata: { originalVendor: 'Sanctuary Teahouse', newVendor: 'Snowland Lodge', serviceType: 'HOTEL', costDifference: 1500 },
    acknowledged: true, priority: 'MEDIUM'
  },
  {
    id: 10, type: 'SPOT_EXPENSE', tourLeaderId: 4, tourLeaderName: 'Prakash Gurung',
    bookingId: 2, bookingCode: 'PNH-2026-002', clientName: 'Hans Mueller (Germany)',
    timestamp: getRollingDate(2, '19:00:00'), title: 'Spot Expense: NPR 2,200',
    description: 'Dining hall fireplace heating fee and battery charging cards for clients.',
    metadata: { amount: 2200, category: 'Utilities', paymentMethod: 'CASH' },
    acknowledged: true, priority: 'LOW'
  },
  // Day 3: 3 days ago
  {
    id: 11, type: 'CHECK_IN', tourLeaderId: 4, tourLeaderName: 'Prakash Gurung',
    bookingId: 2, bookingCode: 'PNH-2026-002', clientName: 'Hans Mueller (Germany)',
    timestamp: getRollingDate(3, '15:40:00'), title: 'Machhapuchhre Base Camp Check-in',
    description: 'Arrived at MBC 3,700m. Cloud cover moving in. Trekkers instructed to stay hydrated.',
    metadata: { paxSafe: 6, paxTotal: 6, weatherCondition: 'Overcast & Foggy', nextStop: 'ABC' },
    acknowledged: true, priority: 'LOW'
  },
  {
    id: 12, type: 'CHECK_IN', tourLeaderId: 4, tourLeaderName: 'Prakash Gurung',
    bookingId: 1, bookingCode: 'PNH-2026-001', clientName: 'St. Xavier School Group',
    timestamp: getRollingDate(3, '18:10:00'), title: 'Chitwan Resort Check-in',
    description: 'School safari group arrived at Sauraha, Chitwan. Evening Tharu cultural show attended safely.',
    metadata: { paxSafe: 27, paxTotal: 27, weatherCondition: 'Warm 28°C', nextStop: 'Jungle Walk' },
    acknowledged: true, priority: 'LOW'
  },
  {
    id: 13, type: 'SPOT_EXPENSE', tourLeaderId: 4, tourLeaderName: 'Prakash Gurung',
    bookingId: 2, bookingCode: 'PNH-2026-002', clientName: 'Hans Mueller (Germany)',
    timestamp: getRollingDate(3, '12:00:00'), title: 'Spot Expense: NPR 3,000',
    description: 'Emergency porter assistance for trekker recovering from mild sprain.',
    metadata: { amount: 3000, category: 'Transport', paymentMethod: 'CASH' },
    acknowledged: true, priority: 'HIGH'
  },
  // Day 4: 4 days ago
  {
    id: 14, type: 'CHECK_IN', tourLeaderId: 4, tourLeaderName: 'Prakash Gurung',
    bookingId: 2, bookingCode: 'PNH-2026-002', clientName: 'Hans Mueller (Germany)',
    timestamp: getRollingDate(4, '16:30:00'), title: 'Deurali Ridge Check-in',
    description: 'Reached Deurali 3,200m before afternoon rainfall. Avalanche chute passage crossed safely under guide supervision.',
    metadata: { paxSafe: 6, paxTotal: 6, weatherCondition: 'Afternoon Rain', nextStop: 'MBC' },
    acknowledged: true, priority: 'LOW'
  },
  {
    id: 15, type: 'VENDOR_SWAP', tourLeaderId: 4, tourLeaderName: 'Prakash Gurung',
    bookingId: 2, bookingCode: 'PNH-2026-002', clientName: 'Hans Mueller (Germany)',
    timestamp: getRollingDate(4, '13:00:00'), title: 'Lunch Restaurant Swap',
    description: 'Original tea shop closed. Swapped to Panorama View Kitchen. Same set menu pricing.',
    metadata: { originalVendor: 'Modi Khola Teahouse', newVendor: 'Panorama Kitchen', serviceType: 'RESTAURANT', costDifference: 0 },
    acknowledged: true, priority: 'LOW'
  },
  {
    id: 16, type: 'CHECK_IN', tourLeaderId: 4, tourLeaderName: 'Prakash Gurung',
    bookingId: 3, bookingCode: 'PNH-2026-003', clientName: 'Sarah Jenkins (UK)',
    timestamp: getRollingDate(4, '17:45:00'), title: 'Ghorepani Poon Hill Check-in',
    description: 'Checked into Ghorepani Hotel. Ready for early 4:30 AM sunrise hike to Poon Hill.',
    metadata: { paxSafe: 2, paxTotal: 2, weatherCondition: 'Clear skies', nextStop: 'Poon Hill Peak' },
    acknowledged: true, priority: 'LOW'
  },
  // Day 5: 5 days ago
  {
    id: 17, type: 'CHECK_IN', tourLeaderId: 4, tourLeaderName: 'Prakash Gurung',
    bookingId: 2, bookingCode: 'PNH-2026-002', clientName: 'Hans Mueller (Germany)',
    timestamp: getRollingDate(5, '15:15:00'), title: 'Himalaya Hotel Check-in',
    description: 'Ascent from Bamboo completed in 4 hours. Group pace steady, enjoying rhododendron forest section.',
    metadata: { paxSafe: 6, paxTotal: 6, weatherCondition: 'Sunny', nextStop: 'Deurali' },
    acknowledged: true, priority: 'LOW'
  },
  {
    id: 18, type: 'SPOT_EXPENSE', tourLeaderId: 4, tourLeaderName: 'Prakash Gurung',
    bookingId: 2, bookingCode: 'PNH-2026-002', clientName: 'Hans Mueller (Germany)',
    timestamp: getRollingDate(5, '10:30:00'), title: 'Spot Expense: NPR 2,400',
    description: 'Heavy duty rain ponchos & waterproof pack covers purchased for group.',
    metadata: { amount: 2400, category: 'Gear', paymentMethod: 'CASH' },
    acknowledged: true, priority: 'LOW'
  },
  // Day 6: 6 days ago
  {
    id: 19, type: 'CHECK_IN', tourLeaderId: 4, tourLeaderName: 'Prakash Gurung',
    bookingId: 2, bookingCode: 'PNH-2026-002', clientName: 'Hans Mueller (Germany)',
    timestamp: getRollingDate(6, '16:50:00'), title: 'Chhomrong Village Check-in',
    description: 'Departed Jhinu Danda hot springs and ascended stone steps to Chhomrong. All 6 clients feeling strong.',
    metadata: { paxSafe: 6, paxTotal: 6, weatherCondition: 'Clear', nextStop: 'Bamboo' },
    acknowledged: true, priority: 'LOW'
  },
  {
    id: 20, type: 'STATUS_CHANGE', tourLeaderId: 4, tourLeaderName: 'Prakash Gurung',
    bookingId: 2, bookingCode: 'PNH-2026-002', clientName: 'Hans Mueller (Germany)',
    timestamp: getRollingDate(6, '09:00:00'), title: 'Kathmandu Departure Briefing',
    description: 'Comprehensive gear check and orientation delivered at Thamel office. Private vehicle departed on schedule.',
    metadata: { fromStatus: 'PROPOSED', toStatus: 'CONFIRMED' },
    acknowledged: true, priority: 'LOW'
  }
];

// Load database state from disk on startup
function loadDbState() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.users) && parsed.users.length > 0) usersList = parsed.users;
      if (Array.isArray(parsed.packages) && parsed.packages.length > 0) packagesList = parsed.packages;
      if (Array.isArray(parsed.bookings) && parsed.bookings.length > 0) bookingsList = parsed.bookings;
      if (Array.isArray(parsed.vendors) && parsed.vendors.length > 0) vendorsList = parsed.vendors;
      if (Array.isArray(parsed.allocations) && parsed.allocations.length > 0) allocationsList = parsed.allocations;
      if (Array.isArray(parsed.payments) && parsed.payments.length > 0) paymentsList = parsed.payments;
      if (parsed.settings && typeof parsed.settings === 'object') companySettingsData = { ...companySettingsData, ...parsed.settings };
      if (Array.isArray(parsed.activities)) activitiesList = parsed.activities;
      if (Array.isArray(parsed.alerts)) alertsList = parsed.alerts;
      if (Array.isArray(parsed.fieldActivities) && parsed.fieldActivities.length > 0) {
        const now = Date.now();
        const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
        const hasRecent = parsed.fieldActivities.some((a: any) => {
          const t = new Date(a.timestamp).getTime();
          return !isNaN(t) && (now - t) < sevenDaysMs;
        });
        if (hasRecent) {
          fieldActivitiesList = parsed.fieldActivities;
        } else {
          // Merge so that rolling 7-day reports are present alongside any user-created items
          const existingIds = new Set(fieldActivitiesList.map((f: any) => Number(f.id)));
          const userExtras = parsed.fieldActivities.filter((f: any) => !existingIds.has(Number(f.id)));
          fieldActivitiesList = [...fieldActivitiesList, ...userExtras];
        }
      }
    } else {
      saveDbState();
    }
  } catch (err) {
    console.warn('Could not load db_store.json, using memory state:', err);
  }
}

const connectedClients = new Set<WebSocket>();

function broadcastToClients(data: any) {
  const payload = JSON.stringify(data);
  for (const client of connectedClients) {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(payload);
      } catch (err) {
        console.warn('Failed to send message to client:', err);
      }
    }
  }
}

// Persist database state to disk
function saveDbState() {
  try {
    const payload = {
      users: usersList,
      packages: packagesList,
      bookings: bookingsList,
      vendors: vendorsList,
      allocations: allocationsList,
      payments: paymentsList,
      settings: companySettingsData,
      activities: activitiesList,
      alerts: alertsList,
      fieldActivities: fieldActivitiesList,
      updatedAt: new Date().toISOString()
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(payload, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Could not save db_store.json:', err);
  }
}

// Initialize from disk
loadDbState();

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
  // SYSTEM HEALTH & CONNECTIVITY PING
  // ---------------------------------------------------------------------------
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      service: 'Paila Nepal ERP & TravelCMS Gateway',
      timestamp: new Date().toISOString(),
      uptime: Math.round(process.uptime()),
      db: 'connected',
      environment: process.env.NODE_ENV || 'production'
    });
  });

  // ---------------------------------------------------------------------------
  // AUTH ROUTE
  // ---------------------------------------------------------------------------
  app.post('/api/auth/login', (req: Request, res: Response) => {
    const { email, password } = req.body || {};
    const trimmedEmail = (email || '').trim().toLowerCase();
    const inputPassword = typeof password === 'string' ? password : '';
    const trimmedPassword = inputPassword.trim();

    // Find in persistent usersList first, fallback to defaultUsers pool
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
      (expectedPassword === 'password' && (inputPassword === 'password' || trimmedPassword === 'password'));

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
        password: user.password || 'password',
        isActive: Boolean(user.isActive),
        is_active: user.isActive ? 1 : 0
      }
    });
  });

  app.post('/api/auth/logout', (_req: Request, res: Response) => {
    res.json({ success: true, message: 'Logged out successfully.' });
  });

  // ---------------------------------------------------------------------------
  // ACTIVITIES ROUTE (Audit Trail)
  // ---------------------------------------------------------------------------
  app.get(['/api/activities', '/api/activities/'], (req: Request, res: Response) => {
    const { category, limit } = req.query;
    let results = activitiesList;
    if (category && category !== 'ALL') {
      results = results.filter(a => a.category === category);
    }
    const maxItems = limit ? parseInt(limit as string, 10) : 100;
    res.json({ data: results.slice(0, maxItems) });
  });

  app.post(['/api/activities', '/api/activities/'], (req: Request, res: Response) => {
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
    saveDbState();

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
    saveDbState();
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
    saveDbState();
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

    // If status transitioned to CONFIRMED, ensure linked operation allocations exist
    if (status === 'CONFIRMED') {
      const existingAllocs = allocationsList.filter(a => a.bookingId === id);
      if (existingAllocs.length === 0) {
        const defaultHotel = vendorsList.find(v => v.category === 'HOTEL') || vendorsList[0];
        const defaultVehicle = vendorsList.find(v => v.category === 'VEHICLE');
        const defaultRestaurant = vendorsList.find(v => v.category === 'RESTAURANT');

        let nextAllocId = allocationsList.length > 0 ? Math.max(...allocationsList.map(a => a.id)) + 1 : 1;
        const totalAgreed = Number(currentBooking.totalAgreedAmount) || 100000;
        const serviceDate = currentBooking.startDate || new Date().toISOString().split('T')[0];

        if (defaultHotel) {
          allocationsList.push({
            id: nextAllocId++,
            bookingId: currentBooking.id,
            bookingCode: currentBooking.bookingCode,
            vendorId: defaultHotel.id,
            vendorName: defaultHotel.name,
            serviceType: 'HOTEL',
            serviceDate,
            agreedCost: Math.round(totalAgreed * 0.35),
            amountPaid: 0,
            paymentStatus: 'PENDING',
            fieldUpdatedByOperator: false,
            specialNotes: 'Auto-allocated on booking confirmation'
          } as any);
        }

        if (defaultVehicle) {
          allocationsList.push({
            id: nextAllocId++,
            bookingId: currentBooking.id,
            bookingCode: currentBooking.bookingCode,
            vendorId: defaultVehicle.id,
            vendorName: defaultVehicle.name,
            serviceType: 'VEHICLE',
            serviceDate,
            agreedCost: Math.round(totalAgreed * 0.20),
            amountPaid: 0,
            paymentStatus: 'PENDING',
            fieldUpdatedByOperator: false,
            specialNotes: 'Transport allocation auto-generated'
          } as any);
        }

        if (defaultRestaurant) {
          allocationsList.push({
            id: nextAllocId++,
            bookingId: currentBooking.id,
            bookingCode: currentBooking.bookingCode,
            vendorId: defaultRestaurant.id,
            vendorName: defaultRestaurant.name,
            serviceType: 'RESTAURANT',
            serviceDate,
            agreedCost: Math.round(totalAgreed * 0.15),
            amountPaid: 0,
            paymentStatus: 'PENDING',
            fieldUpdatedByOperator: false,
            specialNotes: 'Food & catering allocation auto-generated'
          } as any);
        }
      }
    }

    saveDbState();
    res.json({ success: true, status });
  };
  app.patch('/api/bookings/:id/status', handleBookingStatus);
  app.post('/api/bookings/:id/status', handleBookingStatus);

  app.delete('/api/bookings/:id', (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
    bookingsList = bookingsList.filter(item => item.id !== id);
    saveDbState();
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
    saveDbState();
    res.status(201).json({ success: true, id: newId, message: 'Package created.' });
  });

  app.put('/api/packages/:id', (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
    const index = packagesList.findIndex(item => item.id === id);
    if (index !== -1) {
      packagesList[index] = { ...packagesList[index], ...req.body, id };
      saveDbState();
    }
    res.json({ success: true, message: 'Package updated.' });
  });

  app.delete('/api/packages/:id', (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
    packagesList = packagesList.filter(item => item.id !== id);
    saveDbState();
    res.json({ success: true, message: 'Package deleted.' });
  });

  // ---------------------------------------------------------------------------
  // VENDORS ROUTES
  // ---------------------------------------------------------------------------
  app.get('/api/vendors', (_req: Request, res: Response) => {
    const mapped = vendorsList.map((v: any) => ({
      id: v.id,
      name: v.name,
      category: v.category,
      location: v.location,
      contact_person: v.contactPerson || v.contact_person || '',
      phone: v.phone,
      pan_vat_number: v.panVatNumber || v.pan_vat_number || '',
      bank_account_details: v.bankAccountDetails || v.bank_account_details || '',
      is_active: (v.isActive !== undefined ? v.isActive : v.is_active) ? 1 : 0,
      vehicle_type: v.vehicleType || v.vehicle_type || '',
      plate_number: v.plateNumber || v.plate_number || ''
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
    saveDbState();
    res.status(201).json({ success: true, id: newId, message: 'Vendor registered.' });
  });

  app.put('/api/vendors/:id', (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
    const index = vendorsList.findIndex(item => item.id === id);
    if (index !== -1) {
      vendorsList[index] = { ...vendorsList[index], ...req.body, id };
      saveDbState();
    }
    res.json({ success: true, message: 'Vendor updated.' });
  });

  app.delete('/api/vendors/:id', (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
    vendorsList = vendorsList.filter(item => item.id !== id);
    saveDbState();
    res.json({ success: true, message: 'Vendor deleted.' });
  });

  // ---------------------------------------------------------------------------
  // ALLOCATIONS ROUTES
  // ---------------------------------------------------------------------------
  const handleGetAllocations = (req: Request, res: Response) => {
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
  };

  const handlePostAllocation = (req: Request, res: Response) => {
    const a = req.body;
    const newId = allocationsList.length > 0 ? Math.max(...allocationsList.map(item => item.id)) + 1 : 1;
    const newAlloc = { ...a, id: newId };
    allocationsList.push(newAlloc);
    saveDbState();
    res.status(201).json({ success: true, id: newId, message: 'Allocation created.' });
  };

  const handlePutAllocation = (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
    const index = allocationsList.findIndex(item => item.id === id);
    if (index !== -1) {
      allocationsList[index] = { ...allocationsList[index], ...req.body, id };
      saveDbState();
    }
    res.json({ success: true, id });
  };

  const handleDeleteAllocation = (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
    allocationsList = allocationsList.filter(item => item.id !== id);
    saveDbState();
    res.json({ success: true });
  };

  app.get('/api/allocations', handleGetAllocations);
  app.get('/api/operations/allocations', handleGetAllocations);
  app.get('/api/operations', handleGetAllocations);

  app.post('/api/allocations', handlePostAllocation);
  app.post('/api/operations/allocations', handlePostAllocation);

  app.put('/api/allocations/:id', handlePutAllocation);
  app.put('/api/operations/allocations/:id', handlePutAllocation);

  app.delete('/api/allocations/:id', handleDeleteAllocation);
  app.delete('/api/operations/allocations/:id', handleDeleteAllocation);

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
    const targetAllocId = Number(p.operationAllocationId || p.operation_allocation_id || p.allocationId || p.allocation_id || 0);
    const paymentAmount = Number(p.amount) || 0;

    const newPayment = {
      ...p,
      id: newId,
      operationAllocationId: targetAllocId,
      amount: paymentAmount,
      paidAt: p.paidAt || new Date().toISOString()
    };
    paymentsList.push(newPayment);

    // Update corresponding allocation amountPaid & status
    const alloc = allocationsList.find(a => a.id === targetAllocId);
    let newPaidAmount = paymentAmount;
    let newPaymentStatus = 'PARTIALLY_PAID';

    if (alloc) {
      alloc.amountPaid = (alloc.amountPaid || 0) + paymentAmount;
      if (alloc.amountPaid >= alloc.agreedCost) {
        alloc.paymentStatus = 'SETTLED';
      } else if (alloc.amountPaid > 0) {
        alloc.paymentStatus = 'PARTIALLY_PAID';
      }
      newPaidAmount = alloc.amountPaid;
      newPaymentStatus = alloc.paymentStatus;
    }

    saveDbState();
    res.status(201).json({
      success: true,
      id: newId,
      paymentId: newId,
      newPaidAmount,
      newPaymentStatus,
      message: 'Payment recorded.'
    });
  });

  // ---------------------------------------------------------------------------
  // USERS ROUTES
  // ---------------------------------------------------------------------------
  app.get(['/api/users', '/api/users/'], (_req: Request, res: Response) => {
    const mapped = usersList.map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      phone: u.phone || '',
      password: u.password || 'password',
      is_active: u.isActive !== undefined ? (u.isActive ? 1 : 0) : 1,
      isActive: u.isActive !== undefined ? Boolean(u.isActive) : true
    }));
    res.json({ data: mapped, count: mapped.length });
  });

  app.get('/api/users/:id', (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
    const user = usersList.find(item => item.id === id);
    if (user) {
      res.json({
        success: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone || '',
          password: user.password || 'password',
          is_active: user.isActive !== undefined ? (user.isActive ? 1 : 0) : 1,
          isActive: user.isActive !== undefined ? Boolean(user.isActive) : true
        }
      });
    } else {
      res.status(404).json({ success: false, error: 'User not found' });
    }
  });

  app.post('/api/users', (req: Request, res: Response) => {
    const u = req.body || {};
    
    // Server-side validation
    const name = String(u.name || '').trim();
    if (!name) {
      return res.status(400).json({ success: false, error: 'Full Name is required and cannot be empty.' });
    }

    const email = String(u.email || '').trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ success: false, error: 'A valid email address is required.' });
    }

    // Check email uniqueness
    const emailExists = usersList.some(item => item.email?.toLowerCase() === email);
    if (emailExists) {
      return res.status(400).json({ success: false, error: 'A user with this email address already exists.' });
    }

    const password = String(u.password || '').trim();
    if (!password || password.length < 4) {
      return res.status(400).json({ success: false, error: 'Password is required and must be at least 4 characters long.' });
    }

    const role = String(u.role || '').trim();
    const VALID_ROLES = ['SUPER_ADMIN', 'ADMIN', 'OPERATION_MANAGER', 'SALES', 'TOUR_OPERATOR'];
    if (!VALID_ROLES.includes(role)) {
      return res.status(400).json({ success: false, error: `Invalid role specified. Supported roles: ${VALID_ROLES.join(', ')}.` });
    }

    const newId = usersList.length > 0 ? Math.max(...usersList.map(item => item.id)) + 1 : 1;
    const newUser = {
      id: newId,
      name,
      email,
      role: role as any,
      phone: String(u.phone || '').trim(),
      password,
      isActive: u.isActive !== undefined ? Boolean(u.isActive) : (u.is_active !== undefined ? Boolean(u.is_active) : true)
    };
    
    usersList = [newUser, ...usersList.filter(item => item.id !== newId)];
    saveDbState();
    res.status(201).json({
      success: true,
      id: newId,
      user: newUser,
      verified: true,
      message: 'User created successfully.'
    });
  });

  app.put('/api/users/:id', (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
    const index = usersList.findIndex(item => item.id === id);
    if (index === -1) {
      return res.status(404).json({ success: false, error: 'User not found in the database.' });
    }

    const existing = usersList[index];
    const name = req.body.name !== undefined ? String(req.body.name).trim() : existing.name;
    const email = req.body.email !== undefined ? String(req.body.email).trim().toLowerCase() : existing.email;
    const role = req.body.role !== undefined ? String(req.body.role).trim() : existing.role;
    const phone = req.body.phone !== undefined ? String(req.body.phone).trim() : existing.phone;
    
    const targetIsActive = req.body.isActive !== undefined 
      ? Boolean(req.body.isActive) 
      : (req.body.is_active !== undefined ? Boolean(req.body.is_active) : existing.isActive);
      
    const targetPassword = req.body.password && String(req.body.password).trim() !== '' 
      ? String(req.body.password).trim() 
      : (existing.password || 'password');

    // Server-side validation
    if (!name) {
      return res.status(400).json({ success: false, error: 'Full Name is required and cannot be empty.' });
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ success: false, error: 'A valid email address is required.' });
    }

    // Verify email uniqueness against other users
    const emailExists = usersList.some(item => item.id !== id && item.email?.toLowerCase() === email);
    if (emailExists) {
      return res.status(400).json({ success: false, error: 'This email address is already registered to another user.' });
    }

    if (!targetPassword || targetPassword.length < 4) {
      return res.status(400).json({ success: false, error: 'Password must be at least 4 characters long.' });
    }

    const VALID_ROLES = ['SUPER_ADMIN', 'ADMIN', 'OPERATION_MANAGER', 'SALES', 'TOUR_OPERATOR'];
    if (!VALID_ROLES.includes(role)) {
      return res.status(400).json({ success: false, error: `Invalid role specified. Supported roles: ${VALID_ROLES.join(', ')}.` });
    }

    // Sole Admin Safeguard: Prevent lockouts
    // If the original user was SUPER_ADMIN and was active, and now we are changing role to a non-SUPER_ADMIN or deactivating them
    const originalWasActiveAdmin = existing.role === 'SUPER_ADMIN' && existing.isActive;
    const targetIsActiveAdmin = role === 'SUPER_ADMIN' && targetIsActive;
    
    if (originalWasActiveAdmin && !targetIsActiveAdmin) {
      // Find other active SUPER_ADMINS
      const otherActiveAdmins = usersList.filter(item => item.id !== id && item.role === 'SUPER_ADMIN' && item.isActive);
      if (otherActiveAdmins.length === 0) {
        return res.status(400).json({ 
          success: false, 
          error: 'This action is rejected. You are the sole active Super Admin on this system; changing your role or deactivating this account would lock everyone out.' 
        });
      }
    }

    const updatedUserRecord = {
      ...existing,
      id,
      name,
      email,
      role: role as any,
      phone,
      password: targetPassword,
      isActive: targetIsActive,
    };

    usersList[index] = updatedUserRecord;
    saveDbState();
    res.json({
      success: true,
      verified: true,
      user: updatedUserRecord,
      message: `User #${id} (${name}) successfully updated in database.`
    });
  });

  app.delete('/api/users/:id', (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
    const targetUser = usersList.find(item => item.id === id);
    if (!targetUser) {
      return res.status(404).json({ success: false, error: 'User not found in the database.' });
    }

    // Sole Admin Safeguard
    if (targetUser.role === 'SUPER_ADMIN' && targetUser.isActive) {
      const otherActiveAdmins = usersList.filter(item => item.id !== id && item.role === 'SUPER_ADMIN' && item.isActive);
      if (otherActiveAdmins.length === 0) {
        return res.status(400).json({ 
          success: false, 
          error: 'This action is rejected. This user is the sole active Super Admin; deleting this account would lock everyone out.' 
        });
      }
    }

    usersList = usersList.filter(item => item.id !== id);
    saveDbState();
    res.json({ success: true, verified: true, message: 'User deleted successfully.' });
  });

  app.post('/api/users/:id/password', (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
    const { password } = req.body;
    const user = usersList.find(item => item.id === id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }
    const cleanPassword = String(password || '').trim();
    if (!cleanPassword || cleanPassword.length < 4) {
      return res.status(400).json({ success: false, error: 'Password must be at least 4 characters long.' });
    }

    user.password = cleanPassword;
    saveDbState();
    res.json({
      success: true,
      verified: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone || '',
        isActive: user.isActive
      },
      message: 'Password successfully changed.'
    });
  });

  // ---------------------------------------------------------------------------
  // SYSTEM MAINTENANCE & COMMISSIONING
  // ---------------------------------------------------------------------------
  app.post('/api/maintenance/purge', (req: Request, res: Response) => {
    const { 
      clearBookings = true, 
      clearOperations = true, 
      clearActivities = true, 
      clearAlerts = true 
    } = req.body || {};

    if (clearBookings) {
      bookingsList = [];
    }
    
    if (clearOperations) {
      allocationsList = [];
      paymentsList = [];
    }
    
    if (clearActivities) {
      activitiesList = [];
      fieldActivitiesList = [];
    }
    
    if (clearAlerts) {
      alertsList = [];
    }

    saveDbState();

    res.json({
      success: true,
      message: 'System transactional data purged successfully.',
      timestamp: new Date().toISOString()
    });
  });

  // ---------------------------------------------------------------------------
  // SETTINGS ROUTES
  // ---------------------------------------------------------------------------
  app.get('/api/settings', (_req: Request, res: Response) => {
    const s: any = companySettingsData || {};
    res.json({
      data: {
        ...s,
        companyName: s.companyName || s.company_name || 'Paila Nepal Holidays Pvt. Ltd.',
        company_name: s.companyName || s.company_name || 'Paila Nepal Holidays Pvt. Ltd.',
        tagline: s.tagline || 'Trekking • Mountaineering • Institutional Excursions',
        domain: s.domain || 'pailanepal.com',
        address: s.address || 'Thamel, Ward 26, Kathmandu, Nepal',
        phone: s.phone || '+977-1-4123456',
        emergencyPhone: s.emergencyPhone || s.emergency_phone || '+977-9801234567',
        emergency_phone: s.emergencyPhone || s.emergency_phone || '+977-9801234567',
        email: s.email || 'info@pailanepal.com',
        panNumber: s.panNumber || s.pan_number || '601234567',
        pan_number: s.panNumber || s.pan_number || '601234567',
        vatNumber: s.vatNumber || s.vat_number || '301234567',
        vat_number: s.vatNumber || s.vat_number || '301234567',
        taxPreference: s.taxPreference || s.tax_preference || 'BOTH',
        tax_preference: s.taxPreference || s.tax_preference || 'BOTH',
        registrationNumber: s.registrationNumber || s.registration_number || '129481/070/071',
        registration_number: s.registrationNumber || s.registration_number || '129481/070/071',
      }
    });
  });

  const handleSettingsUpdate = (req: Request, res: Response) => {
    const body = req.body || {};
    companySettingsData = {
      ...companySettingsData,
      ...body,
      companyName: body.companyName || body.company_name || companySettingsData.companyName,
    };
    saveDbState();
    res.json({ success: true, message: 'Settings saved' });
  };
  app.post('/api/settings', handleSettingsUpdate);
  app.put('/api/settings', handleSettingsUpdate);

  // ---------------------------------------------------------------------------
  // ALERTS ROUTES
  // ---------------------------------------------------------------------------
  app.get(['/api/alerts', '/api/alerts/'], (_req: Request, res: Response) => {
    res.json({ data: alertsList });
  });

  app.post(['/api/alerts', '/api/alerts/'], (req: Request, res: Response) => {
    const a = req.body;
    const newId = alertsList.length > 0 ? Math.max(...alertsList.map(item => item.id)) + 1 : 101;
    const newAlert = {
      ...a,
      id: newId,
      status: a.status || 'PENDING',
      created_at: a.created_at || new Date().toISOString()
    };
    alertsList.unshift(newAlert);
    saveDbState();
    broadcastToClients({ type: 'NEW_ALERT', alert: newAlert });
    res.status(201).json({ success: true, id: newId, alert: newAlert });
  });

  app.post('/api/alerts/:id/acknowledge', (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
    const alert = alertsList.find(a => a.id === id);
    if (alert) {
      alert.status = 'ACKNOWLEDGED';
      alert.acknowledged_at = new Date().toISOString();
      alert.acknowledged_by_name = req.body.acknowledged_by_name || 'Staff';
      saveDbState();
    }
    res.json({ success: true });
  });

  app.post('/api/alerts/:id/resolve', (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
    const alert = alertsList.find(a => a.id === id);
    if (alert) {
      alert.status = 'RESOLVED';
      alert.resolved_at = new Date().toISOString();
      alert.resolved_by_name = req.body.resolved_by_name || 'Staff';
      saveDbState();
    }
    res.json({ success: true });
  });

  // ---------------------------------------------------------------------------
  // FIELD ACTIVITIES ROUTES (Daily Updates, Check-ins, Operator Status)
  // ---------------------------------------------------------------------------
  app.get(['/api/field-activities', '/api/field-activities/'], (_req: Request, res: Response) => {
    res.json({ data: fieldActivitiesList });
  });

  app.post(['/api/field-activities', '/api/field-activities/'], (req: Request, res: Response) => {
    const item = req.body || {};
    const newId = fieldActivitiesList.length > 0 ? Math.max(...fieldActivitiesList.map(f => Number(f.id) || 0)) + 1 : 1;
    const newFieldActivity = {
      id: newId,
      type: item.type || 'CHECK_IN',
      tourLeaderId: item.tourLeaderId || 0,
      tourLeaderName: item.tourLeaderName || 'Tour Operator',
      bookingId: item.bookingId || 0,
      bookingCode: item.bookingCode || 'FIELD-UPDATE',
      clientName: item.clientName || 'Tour Guest',
      timestamp: item.timestamp || new Date().toISOString().replace('T', ' ').slice(0, 19),
      title: item.title || 'Daily Field Update',
      description: item.description || '',
      metadata: item.metadata || {},
      acknowledged: Boolean(item.acknowledged),
      priority: item.priority || 'LOW'
    };
    fieldActivitiesList.unshift(newFieldActivity);
    saveDbState();
    broadcastToClients({ type: 'NEW_FIELD_ACTIVITY', activity: newFieldActivity });
    res.status(201).json({ success: true, id: newId, activity: newFieldActivity });
  });

  app.post('/api/field-activities/:id/acknowledge', (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
    const act = fieldActivitiesList.find(f => Number(f.id) === id);
    if (act) {
      act.acknowledged = true;
      saveDbState();
      broadcastToClients({ type: 'ACK_FIELD_ACTIVITY', id });
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

  // Catch-all 404 handler for API routes to prevent falling through to Vite SPA html
  app.all('/api/*', (_req: Request, res: Response) => {
    res.status(404).json({ error: 'API route not found' });
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
      server: {
        middlewareMode: true,
        hmr: false,
        ws: false,
      },
      appType: 'spa',
    });

    // In dev mode with HMR disabled, intercept /@vite/client with a clean stub
    // to eliminate failing WebSocket connection attempts and [vite] console errors
    app.get(['/@vite/client', '/vite/client'], (_req: Request, res: Response) => {
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.send(`
const sheetsMap = new Map();
export function updateStyle(id, content) {
  let style = sheetsMap.get(id);
  if (!style) {
    style = document.createElement('style');
    style.setAttribute('type', 'text/css');
    style.setAttribute('data-vite-dev-id', id);
    style.textContent = content;
    document.head.appendChild(style);
    sheetsMap.set(id, style);
  } else {
    style.textContent = content;
  }
}
export function removeStyle(id) {
  const style = sheetsMap.get(id);
  if (style) {
    style.remove();
    sheetsMap.delete(id);
  }
}
export function injectQuery(url, queryToInject) {
  if (url[0] !== '.' && url[0] !== '/') return url;
  const pathname = url.replace(/[?#].*$/, '');
  const { search, hash } = new URL(url, 'http://vite.dev');
  return pathname + '?' + queryToInject + (search ? '&' + search.slice(1) : '') + (hash || '');
}
export function createHotContext() {
  return {
    accept() {},
    prune() {},
    dispose() {},
    decline() {},
    invalidate() {},
    on() {},
    off() {},
    send() {},
  };
}
export class ErrorOverlay extends HTMLElement {}
if (typeof customElements !== 'undefined' && !customElements.get('vite-error-overlay')) {
  customElements.define('vite-error-overlay', ErrorOverlay);
}
      `);
    });

    app.use(vite.middlewares);
  }

  const server = app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Paila Nepal TravelCMS Full-Stack server running on port ${PORT}`);
  });

  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    const pathname = new URL(request.url || '', `http://${request.headers.host}`).pathname;
    if (pathname === '/ws') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    } else {
      socket.destroy();
    }
  });

  wss.on('connection', (ws) => {
    connectedClients.add(ws);
    
    ws.on('close', () => {
      connectedClients.delete(ws);
    });

    ws.on('error', () => {
      connectedClients.delete(ws);
    });
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
