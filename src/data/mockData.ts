import { User, Package, Booking, Vendor, OperationAllocation, VendorPayment } from '../types';

export const users: User[] = [
  { id: 1, name: 'Rajesh Shrestha', email: 'admin@pailanepal.com', role: 'SUPER_ADMIN', phone: '+977-9841234567', isActive: true },
  { id: 2, name: 'Sita Maharjan', email: 'sales@pailanepal.com', role: 'SALES', phone: '+977-9851234567', isActive: true },
  { id: 3, name: 'Bikash Tamang', email: 'ops@pailanepal.com', role: 'OPERATIONS', phone: '+977-9861234567', isActive: true },
  { id: 4, name: 'Prakash Gurung', email: 'tour@pailanepal.com', role: 'TOUR_OPERATOR', phone: '+977-9871234567', isActive: true },
  { id: 5, name: 'Anita Rai', email: 'anita@pailanepal.com', role: 'SALES', phone: '+977-9881234567', isActive: true },
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
    id: 1, bookingCode: 'PNH-2026-001', clientType: 'INSTITUTIONAL',
    clientName: 'St. Xavier\'s College', clientEmail: 'admin@stxaviers.edu.np', clientPhone: '+977-1-4234567',
    packageId: 2, packageName: 'Pokhara Student Excursion', status: 'CONFIRMED',
    startDate: '2026-02-15', endDate: '2026-02-18', paxCount: 45,
    totalAgreedAmount: 382500, advanceReceived: 150000,
    assignedTourOperatorId: 4, assignedTourOperatorName: 'Prakash Gurung',
    notes: 'College educational tour. Need vegetarian meal options for 10 students.',
    createdBy: 2, createdByName: 'Sita Maharjan', createdAt: '2026-01-10',
    itineraryDays: [
      { id: 1, dayNumber: 1, title: 'Drive to Pokhara', description: 'Early morning departure from Kathmandu. Scenic drive via Mugling. Lunch at highway restaurant. Arrive Pokhara by afternoon. Check-in hotel.', overnightLocation: 'Hotel Lake Star, Lakeside', mealsIncluded: 'L, D' },
      { id: 2, dayNumber: 2, title: 'Sarangkot Sunrise & Lakeside Exploration', description: 'Early morning drive to Sarangkot for sunrise view. Return to hotel for breakfast. Visit Davis Falls, Gupteshwor Cave. Afternoon boating on Phewa Lake.', overnightLocation: 'Hotel Lake Star, Lakeside', mealsIncluded: 'B, L, D' },
      { id: 3, dayNumber: 3, title: 'World Peace Pagoda & Departure Prep', description: 'Morning hike to World Peace Pagoda. Afternoon free for shopping and leisure. Evening cultural program.', overnightLocation: 'Hotel Lake Star, Lakeside', mealsIncluded: 'B, L, D' },
      { id: 4, dayNumber: 4, title: 'Return to Kathmandu', description: 'Breakfast at hotel. Check out and drive back to Kathmandu. Lunch en route. Arrive Kathmandu by evening.', overnightLocation: '', mealsIncluded: 'B, L' },
    ]
  },
  {
    id: 2, bookingCode: 'PNH-2026-002', clientType: 'FOREIGN_TREK',
    clientName: 'Hans Mueller (Germany)', clientEmail: 'hans.mueller@email.de', clientPhone: '+49-170-1234567',
    packageId: 1, packageName: 'Annapurna Base Camp Trek', status: 'IN_PROGRESS',
    startDate: '2026-01-20', endDate: '2026-01-29', paxCount: 4,
    totalAgreedAmount: 180000, advanceReceived: 180000,
    assignedTourOperatorId: 4, assignedTourOperatorName: 'Prakash Gurung',
    notes: 'Foreign trekkers. All permits arranged. Acclimatization day at Machhapuchhre BC.',
    createdBy: 2, createdByName: 'Sita Maharjan', createdAt: '2025-12-15',
    itineraryDays: [
      { id: 5, dayNumber: 1, title: 'Drive to Nayapul & Trek to Tikhedhunga', description: 'Early drive to Nayapul. Start trek through sub-tropical forest.', overnightLocation: 'Tikhedhunga Teahouse', mealsIncluded: 'B, L, D' },
      { id: 6, dayNumber: 2, title: 'Trek to Ghorepani via Ulleri', description: 'Steep climb up Ulleri stone steps. Reach Ghorepani through rhododendron forest.', overnightLocation: 'Ghorepani Teahouse', mealsIncluded: 'B, L, D' },
      { id: 7, dayNumber: 3, title: 'Poon Hill Sunrise & Trek to Tadapani', description: 'Pre-dawn hike to Poon Hill (3,210m) for panoramic sunrise. Return to Ghorepani for breakfast.', overnightLocation: 'Tadapani Teahouse', mealsIncluded: 'B, L, D' },
    ]
  },
  {
    id: 3, bookingCode: 'PNH-2026-003', clientType: 'CORPORATE',
    clientName: 'Nabil Bank Ltd.', clientEmail: 'hr@nabilbank.com', clientPhone: '+977-1-4567890',
    packageId: 4, packageName: 'Chitwan Jungle Safari', status: 'PROPOSED',
    startDate: '2026-03-05', endDate: '2026-03-07', paxCount: 25,
    totalAgreedAmount: 300000, advanceReceived: 0,
    assignedTourOperatorId: null,
    notes: 'Corporate team building event. Need conference room for 1 evening session.',
    createdBy: 5, createdByName: 'Anita Rai', createdAt: '2026-01-20',
    itineraryDays: [
      { id: 8, dayNumber: 1, title: 'Drive to Chitwan', description: 'Morning departure by AC bus. Arrive Sauraha by afternoon. Check-in resort. Welcome drink & briefing.', overnightLocation: 'Green Park Resort, Sauraha', mealsIncluded: 'L, D' },
      { id: 9, dayNumber: 2, title: 'Full Day Jungle Activities', description: 'Morning elephant ride. Canoe ride on Rapti River. Afternoon jungle walk. Evening Tharu cultural dance.', overnightLocation: 'Green Park Resort, Sauraha', mealsIncluded: 'B, L, D' },
      { id: 10, dayNumber: 3, title: 'Bird Watching & Return', description: 'Early morning bird watching. Breakfast. Drive back to Kathmandu.', overnightLocation: '', mealsIncluded: 'B, L' },
    ]
  },
  {
    id: 4, bookingCode: 'PNH-2026-004', clientType: 'INSTITUTIONAL',
    clientName: 'Budhanilkantha School', clientEmail: 'info@budhanilkanthaschool.edu.np', clientPhone: '+977-1-4371234',
    packageId: 6, packageName: 'Kathmandu Heritage Tour', status: 'COMPLETED',
    startDate: '2026-01-05', endDate: '2026-01-06', paxCount: 60,
    totalAgreedAmount: 300000, advanceReceived: 300000,
    assignedTourOperatorId: 4, assignedTourOperatorName: 'Prakash Gurung',
    notes: 'School heritage tour completed successfully.',
    createdBy: 2, createdByName: 'Sita Maharjan', createdAt: '2025-12-20',
    itineraryDays: [
      { id: 11, dayNumber: 1, title: 'Heritage Sites Day 1', description: 'Visit Pashupatinath, Boudhanath, and Swayambhunath.', overnightLocation: 'N/A (Day return)', mealsIncluded: 'L' },
      { id: 12, dayNumber: 2, title: 'Heritage Sites Day 2', description: 'Visit Patan Durbar Square and Bhaktapur Durbar Square.', overnightLocation: '', mealsIncluded: 'L' },
    ]
  },
  {
    id: 5, bookingCode: 'PNH-2026-005', clientType: 'INDIVIDUAL',
    clientName: 'Ramesh & Family', clientEmail: 'ramesh.sharma@gmail.com', clientPhone: '+977-9801234567',
    packageId: 5, packageName: 'Langtang Valley Trek', status: 'CONFIRMED',
    startDate: '2026-02-20', endDate: '2026-02-26', paxCount: 6,
    totalAgreedAmount: 195000, advanceReceived: 80000,
    assignedTourOperatorId: 4, assignedTourOperatorName: 'Prakash Gurung',
    notes: 'Family group with 2 children (ages 12 and 14). Moderate pace required.',
    createdBy: 5, createdByName: 'Anita Rai', createdAt: '2026-01-15',
    itineraryDays: [
      { id: 13, dayNumber: 1, title: 'Drive to Syabrubesi', description: 'Scenic drive from Kathmandu to Syabrubesi (1,460m).', overnightLocation: 'Syabrubesi Lodge', mealsIncluded: 'L, D' },
      { id: 14, dayNumber: 2, title: 'Trek to Lama Hotel', description: 'Trek through bamboo forest along Langtang river.', overnightLocation: 'Lama Hotel', mealsIncluded: 'B, L, D' },
    ]
  },
  {
    id: 6, bookingCode: 'PNH-2026-006', clientType: 'INSTITUTIONAL',
    clientName: 'Patan Multiple Campus', clientEmail: 'principal@patancampus.edu.np', clientPhone: '+977-1-5523456',
    packageId: null, packageName: undefined, status: 'PROPOSED',
    startDate: '2026-03-15', endDate: '2026-03-20', paxCount: 35,
    totalAgreedAmount: 0, advanceReceived: 0,
    assignedTourOperatorId: null,
    notes: 'Custom itinerary needed. College wants a mix of trekking and cultural visits. Budget: NPR 15,000 per student.',
    createdBy: 2, createdByName: 'Sita Maharjan', createdAt: '2026-01-25',
    itineraryDays: []
  },
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
  { id: 1, bookingId: 1, bookingCode: 'PNH-2026-001', vendorId: 1, vendorName: 'Hotel Lake Star', serviceType: 'HOTEL', serviceDate: '2026-02-15', agreedCost: 135000, amountPaid: 50000, paymentStatus: 'PARTIALLY_PAID', fieldUpdatedByOperator: false, specialNotes: '15 rooms (triple sharing) for 3 nights' },
  { id: 2, bookingId: 1, bookingCode: 'PNH-2026-001', vendorId: 6, vendorName: 'Sajha Yatayat Bus', serviceType: 'VEHICLE', serviceDate: '2026-02-15', agreedCost: 35000, amountPaid: 35000, paymentStatus: 'SETTLED', fieldUpdatedByOperator: false, specialNotes: '45-seater AC bus, round trip' },
  { id: 3, bookingId: 1, bookingCode: 'PNH-2026-001', vendorId: 4, vendorName: 'Highway Dhaba', serviceType: 'RESTAURANT', serviceDate: '2026-02-15', agreedCost: 22500, amountPaid: 0, paymentStatus: 'PENDING', fieldUpdatedByOperator: false, specialNotes: 'Lunch for 45 pax x 2 days (to & return)' },
  { id: 4, bookingId: 1, bookingCode: 'PNH-2026-001', vendorId: 5, vendorName: 'Pokhara Kitchen', serviceType: 'RESTAURANT', serviceDate: '2026-02-15', agreedCost: 45000, amountPaid: 0, paymentStatus: 'PENDING', fieldUpdatedByOperator: false, specialNotes: 'Meals in Pokhara (B, L, D for 2.5 days)' },
  { id: 5, bookingId: 2, bookingCode: 'PNH-2026-002', vendorId: 7, vendorName: 'Himalayan Jeep Service', serviceType: 'VEHICLE', serviceDate: '2026-01-20', agreedCost: 25000, amountPaid: 25000, paymentStatus: 'SETTLED', fieldUpdatedByOperator: false, specialNotes: 'Jeep for KTM-Nayapul-KTM' },
  { id: 6, bookingId: 2, bookingCode: 'PNH-2026-002', vendorId: 10, vendorName: 'Pasang Tamang (Guide)', serviceType: 'ACTIVITY', serviceDate: '2026-01-20', agreedCost: 40000, amountPaid: 20000, paymentStatus: 'PARTIALLY_PAID', fieldUpdatedByOperator: false, specialNotes: 'Licensed guide for 10 days including porter arrangement' },
  { id: 7, bookingId: 4, bookingCode: 'PNH-2026-004', vendorId: 6, vendorName: 'Sajha Yatayat Bus', serviceType: 'VEHICLE', serviceDate: '2026-01-05', agreedCost: 40000, amountPaid: 40000, paymentStatus: 'SETTLED', fieldUpdatedByOperator: false, specialNotes: '60-seater bus for 2 days heritage tour' },
  { id: 8, bookingId: 5, bookingCode: 'PNH-2026-005', vendorId: 7, vendorName: 'Himalayan Jeep Service', serviceType: 'VEHICLE', serviceDate: '2026-02-20', agreedCost: 18000, amountPaid: 0, paymentStatus: 'PENDING', fieldUpdatedByOperator: false, specialNotes: 'Jeep for family (6 pax) KTM-Syabrubesi-KTM' },
];

export const vendorPayments: VendorPayment[] = [
  { id: 1, operationAllocationId: 1, amount: 50000, paymentMode: 'BANK_TRANSFER', referenceNumber: 'NAB-TRF-2026-001', paidAt: '2026-01-28 10:30:00', recordedBy: 1, recordedByName: 'Rajesh Shrestha' },
  { id: 2, operationAllocationId: 2, amount: 35000, paymentMode: 'BANK_TRANSFER', referenceNumber: 'NAB-TRF-2026-002', paidAt: '2026-01-25 14:15:00', recordedBy: 1, recordedByName: 'Rajesh Shrestha' },
  { id: 3, operationAllocationId: 5, amount: 25000, paymentMode: 'BANK_TRANSFER', referenceNumber: 'NAB-TRF-2026-003', paidAt: '2026-01-18 09:00:00', recordedBy: 1, recordedByName: 'Rajesh Shrestha' },
  { id: 4, operationAllocationId: 6, amount: 20000, paymentMode: 'ESEWA', referenceNumber: 'ESW-2026-001', paidAt: '2026-01-19 11:45:00', recordedBy: 3, recordedByName: 'Bikash Tamang' },
  { id: 5, operationAllocationId: 7, amount: 40000, paymentMode: 'BANK_TRANSFER', referenceNumber: 'NAB-TRF-2026-004', paidAt: '2026-01-03 16:00:00', recordedBy: 1, recordedByName: 'Rajesh Shrestha' },
];
