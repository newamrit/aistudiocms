import { User, Package, Booking, Vendor, OperationAllocation, VendorPayment } from '../types';

export const users: User[] = [
  { id: 1, name: 'Rajesh Shrestha', email: 'admin@pailanepal.com', password: 'password', role: 'SUPER_ADMIN', phone: '+977-9841234567', isActive: true },
  { id: 2, name: 'Sita Maharjan', email: 'sales@pailanepal.com', password: 'password', role: 'SALES', phone: '+977-9851234567', isActive: true },
  { id: 3, name: 'Bikash Tamang', email: 'ops@pailanepal.com', password: 'password', role: 'OPERATIONS', phone: '+977-9861234567', isActive: true },
  { id: 4, name: 'Prakash Gurung', email: 'tour@pailanepal.com', password: 'password', role: 'TOUR_OPERATOR', phone: '+977-9871234567', isActive: true },
  { id: 5, name: 'Anita Rai', email: 'anita@pailanepal.com', password: 'password', role: 'SALES', phone: '+977-9881234567', isActive: true },
];

export const packages: Package[] = [
  {
    id: 1, title: 'Annapurna Base Camp Trek', slug: 'annapurna-base-camp',
    durationDays: 10, durationNights: 9, standardPrice: 45000,
    overview: 'A classic trek to the Annapurna Base Camp at 4,130m through diverse landscapes, rhododendron forests, and traditional Gurung villages.',
    inclusions: 'All ground transport, teahouse accommodation, meals during trek, TIMS card, ACAP permit, experienced guide & porter',
    exclusions: 'Personal expenses, travel insurance, tips, extra nights in Kathmandu',
    category: 'Trekking'
  },
  {
    id: 2, title: 'Pokhara Student Excursion', slug: 'pokhara-student-excursion',
    durationDays: 4, durationNights: 3, standardPrice: 8500,
    overview: 'Educational tour for students covering Pokhara lakeside, Sarangkot sunrise, Davis Falls, Gupteshwor Cave, and boating on Phewa Lake.',
    inclusions: 'Tourist bus transport, hotel stay (twin/triple sharing), all meals, boat ride, entrance fees, tour guide',
    exclusions: 'Personal expenses, paragliding (optional), insurance',
    category: 'Educational'
  },
  {
    id: 3, title: 'Everest View Trek', slug: 'everest-view-trek',
    durationDays: 8, durationNights: 7, standardPrice: 65000,
    overview: 'Short Everest region trek to Tengboche with stunning views of Everest, Ama Dablam, and Lhotse without going to base camp.',
    inclusions: 'Kathmandu-Lukla flights, teahouse stay, meals, Sagarmatha NP permit, TIMS, guide & porter',
    exclusions: 'Personal gear, insurance, tips, hot showers (extra)',
    category: 'Trekking'
  },
  {
    id: 4, title: 'Chitwan Jungle Safari', slug: 'chitwan-jungle-safari',
    durationDays: 3, durationNights: 2, standardPrice: 12000,
    overview: 'Wildlife adventure in Chitwan National Park with elephant ride, canoe trip, jungle walk, and Tharu cultural show.',
    inclusions: 'AC transport, resort stay, all meals, park entry, all activities, naturalist guide',
    exclusions: 'Personal expenses, beverages, tips',
    category: 'Tour'
  },
  {
    id: 5, title: 'Langtang Valley Trek', slug: 'langtang-valley-trek',
    durationDays: 7, durationNights: 6, standardPrice: 35000,
    overview: 'Trek through the beautiful Langtang valley with views of Langtang Lirung, Tibetan Buddhist monasteries, and traditional Tamang culture.',
    inclusions: 'Transport from Kathmandu, teahouse stay, meals, Langtang NP permit, TIMS, guide',
    exclusions: 'Personal expenses, insurance, tips',
    category: 'Trekking'
  },
  {
    id: 6, title: 'Kathmandu Heritage Tour', slug: 'kathmandu-heritage-tour',
    durationDays: 2, durationNights: 1, standardPrice: 5000,
    overview: 'Cultural city tour covering UNESCO World Heritage Sites: Pashupatinath, Boudhanath, Swayambhunath, Patan Durbar Square, and Bhaktapur.',
    inclusions: 'Private vehicle, licensed guide, all entrance fees, lunch',
    exclusions: 'Personal expenses, tips, dinner',
    category: 'Cultural'
  },
];

export const bookings: Booking[] = [
  {
    id: 1, bookingCode: 'PNH-2026-020', clientType: 'INSTITUTIONAL',
    clientName: 'St. Mary\'s School', clientEmail: 'info@stmarys.edu.np', clientPhone: '+977-1-4410000',
    packageId: 2, packageName: 'Pokhara Student Excursion', status: 'COMPLETED',
    startDate: '2026-09-20', endDate: '2026-09-23', paxCount: 30,
    totalAgreedAmount: 255000, advanceReceived: 255000,
    assignedTourOperatorId: 4, assignedTourOperatorName: 'Prakash Gurung',
    notes: 'School group tour completed successfully.',
    createdBy: 2, createdByName: 'Sita Maharjan', createdAt: '2026-09-01',
    statusHistory: [
      { id: 'sh-1-1', bookingId: 1, bookingCode: 'PNH-2026-020', fromStatus: 'IN_PROGRESS', toStatus: 'COMPLETED', changedAt: '2026-09-23T18:00:00.000Z', changedBy: { id: 1, name: 'Rajesh Shrestha', role: 'SUPER_ADMIN', email: 'admin@pailanepal.com' }, reason: 'Tour concluded.', source: 'ADMIN_PORTAL' }
    ],
    itineraryDays: []
  },
  {
    id: 2, bookingCode: 'PNH-2026-021', clientType: 'INDIVIDUAL',
    clientName: 'Kathmandu Local Hikers', clientEmail: 'kathmandu.hikers@gmail.com', clientPhone: '+977-9800000000',
    packageId: 6, packageName: 'Kathmandu Heritage Tour', status: 'COMPLETED',
    startDate: '2026-09-24', endDate: '2026-09-25', paxCount: 10,
    totalAgreedAmount: 50000, advanceReceived: 50000,
    assignedTourOperatorId: 4, assignedTourOperatorName: 'Prakash Gurung',
    notes: 'Short heritage tour for local group.',
    createdBy: 2, createdByName: 'Sita Maharjan', createdAt: '2026-09-22',
    statusHistory: [
      { id: 'sh-2-1', bookingId: 2, bookingCode: 'PNH-2026-021', fromStatus: 'IN_PROGRESS', toStatus: 'COMPLETED', changedAt: '2026-09-25T17:00:00.000Z', changedBy: { id: 1, name: 'Rajesh Shrestha', role: 'SUPER_ADMIN', email: 'admin@pailanepal.com' }, reason: 'Tour finished.', source: 'ADMIN_PORTAL' }
    ],
    itineraryDays: []
  },
  {
    id: 3, bookingCode: 'PNH-2026-022', clientType: 'FOREIGN_TREK',
    clientName: 'John Doe (USA)', clientEmail: 'john.doe@example.com', clientPhone: '+1-555-0101',
    packageId: 1, packageName: 'Annapurna Base Camp Trek', status: 'IN_PROGRESS',
    startDate: '2026-09-25', endDate: '2026-10-04', paxCount: 2,
    totalAgreedAmount: 90000, advanceReceived: 90000,
    assignedTourOperatorId: 4, assignedTourOperatorName: 'Prakash Gurung',
    notes: 'Starting trek today. Group healthy and excited.',
    createdBy: 2, createdByName: 'Sita Maharjan', createdAt: '2026-08-20',
    statusHistory: [
      { id: 'sh-3-1', bookingId: 3, bookingCode: 'PNH-2026-022', fromStatus: 'CONFIRMED', toStatus: 'IN_PROGRESS', changedAt: '2026-09-25T08:00:00.000Z', changedBy: { id: 4, name: 'Prakash Gurung', role: 'TOUR_OPERATOR', email: 'tour@pailanepal.com' }, reason: 'Group started trek.', source: 'FIELD_APP' }
    ],
    itineraryDays: []
  },
  {
    id: 4, bookingCode: 'PNH-2026-023', clientType: 'FOREIGN_TREK',
    clientName: 'Jane Smith (UK)', clientEmail: 'jane.smith@example.co.uk', clientPhone: '+44-7700-900000',
    packageId: 3, packageName: 'Everest View Trek', status: 'CONFIRMED',
    startDate: '2026-10-10', endDate: '2026-10-17', paxCount: 1,
    totalAgreedAmount: 65000, advanceReceived: 30000,
    assignedTourOperatorId: null,
    notes: 'Solo female traveler. Gear rental assistance needed.',
    createdBy: 5, createdByName: 'Anita Rai', createdAt: '2026-09-10',
    statusHistory: [],
    itineraryDays: []
  },
  {
    id: 5, bookingCode: 'PNH-2026-024', clientType: 'CORPORATE',
    clientName: 'Google Nepal Team', clientEmail: 'events-np@google.com', clientPhone: '+977-1-5500000',
    packageId: 4, packageName: 'Chitwan Jungle Safari', status: 'PROPOSED',
    startDate: '2026-11-05', endDate: '2026-11-07', paxCount: 15,
    totalAgreedAmount: 180000, advanceReceived: 0,
    assignedTourOperatorId: null,
    notes: 'Corporate retreat. Specific request for high-speed WiFi at resort.',
    createdBy: 2, createdByName: 'Sita Maharjan', createdAt: '2026-09-20',
    statusHistory: [],
    itineraryDays: []
  }
];

export const vendors: Vendor[] = [
  { id: 1, name: 'Hotel Lake Star', category: 'HOTEL', location: 'Lakeside, Pokhara', contactPerson: 'Ram Bahadur Thapa', phone: '+977-61-534567', panVatNumber: '601234567', bankAccountDetails: 'Nabil Bank, A/C: 08701234567890', isActive: true },
  { id: 2, name: 'Green Park Resort', category: 'HOTEL', location: 'Sauraha, Chitwan', contactPerson: 'Hari Prasad Sharma', phone: '+977-56-540123', panVatNumber: '601987654', bankAccountDetails: 'NIC Asia Bank, A/C: 01909876543210', isActive: true },
  { id: 3, name: 'Mount Everest Hotel', category: 'HOTEL', location: 'Thamel, Kathmandu', contactPerson: 'Dawa Sherpa', phone: '+977-1-4700123', panVatNumber: '601456789', bankAccountDetails: 'Himalayan Bank, A/C: 02304567890123', isActive: true },
  { id: 4, name: 'Highway Dhaba', category: 'RESTAURANT', location: 'Mugling, Chitwan Highway', contactPerson: 'Krishna Lamichhane', phone: '+977-9845678901', panVatNumber: '601111222', bankAccountDetails: '', isActive: true },
  { id: 5, name: 'Pokhara Kitchen', category: 'RESTAURANT', location: 'Lakeside, Pokhara', contactPerson: 'Sunita Gurung', phone: '+977-61-432100', panVatNumber: '601333444', bankAccountDetails: 'Nabil Bank, A/C: 08703334445556', isActive: true },
  { id: 6, name: 'Sajha Yatayat Bus', category: 'VEHICLE', location: 'Kathmandu', contactPerson: 'Bijay Shrestha', phone: '+977-1-4261234', panVatNumber: '601555666', bankAccountDetails: 'Global IME Bank, A/C: 03105556667778', isActive: true, vehicleType: 'Tourist Bus', plateNumber: 'Ba 2 Kha 5678' },
  { id: 7, name: 'Himalayan Jeep Service', category: 'VEHICLE', location: 'Kathmandu', contactPerson: 'Tenzing Bhote', phone: '+977-9801112233', panVatNumber: '601777888', bankAccountDetails: '', isActive: true, vehicleType: 'Scorpio', plateNumber: 'Ga 1 Cha 4523' },
  { id: 8, name: 'Adventure Nepal Rafting', category: 'ACTIVITY', location: 'Trishuli / Bhotekoshi', contactPerson: 'Sanjay Adhikari', phone: '+977-1-4412345', panVatNumber: '601999000', bankAccountDetails: 'Standard Chartered, A/C: 00309990001112', isActive: true },
  { id: 9, name: 'Sunrise Paragliding', category: 'ACTIVITY', location: 'Sarangkot, Pokhara', contactPerson: 'Mukesh Sharma', phone: '+977-61-540000', panVatNumber: '601222333', bankAccountDetails: '', isActive: true },
  { id: 10, name: 'Pasang Tamang (Guide)', category: 'GUIDE_PERMIT', location: 'Kathmandu', contactPerson: 'Pasang Tamang', phone: '+977-9803344556', panVatNumber: '', bankAccountDetails: '', isActive: true },
];

export const operationAllocations: OperationAllocation[] = [
  { id: 1, bookingId: 1, bookingCode: 'PNH-2026-020', vendorId: 1, vendorName: 'Hotel Lake Star', serviceType: 'HOTEL', serviceDate: '2026-09-20', agreedCost: 90000, amountPaid: 90000, paymentStatus: 'SETTLED', fieldUpdatedByOperator: false, specialNotes: 'School group stay' },
  { id: 2, bookingId: 1, bookingCode: 'PNH-2026-020', vendorId: 6, vendorName: 'Sajha Yatayat Bus', serviceType: 'VEHICLE', serviceDate: '2026-09-20', agreedCost: 35000, amountPaid: 35000, paymentStatus: 'SETTLED', fieldUpdatedByOperator: false, specialNotes: 'Bus transport' },
  { id: 3, bookingId: 3, bookingCode: 'PNH-2026-022', vendorId: 7, vendorName: 'Himalayan Jeep Service', serviceType: 'VEHICLE', serviceDate: '2026-09-25', agreedCost: 15000, amountPaid: 15000, paymentStatus: 'SETTLED', fieldUpdatedByOperator: false, specialNotes: 'KTM to trailhead jeep' },
];

export const vendorPayments: VendorPayment[] = [
  { id: 1, operationAllocationId: 1, amount: 90000, paymentMode: 'BANK_TRANSFER', referenceNumber: 'NAB-SEP-001', paidAt: '2026-09-23 10:30:00', recordedBy: 1, recordedByName: 'Rajesh Shrestha' },
  { id: 2, operationAllocationId: 2, amount: 35000, paymentMode: 'BANK_TRANSFER', referenceNumber: 'NAB-SEP-002', paidAt: '2026-09-23 14:15:00', recordedBy: 1, recordedByName: 'Rajesh Shrestha' },
  { id: 3, operationAllocationId: 3, amount: 15000, paymentMode: 'BANK_TRANSFER', referenceNumber: 'NAB-SEP-003', paidAt: '2026-09-25 09:00:00', recordedBy: 1, recordedByName: 'Rajesh Shrestha' },
];
