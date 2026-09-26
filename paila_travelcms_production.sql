-- =====================================================================
-- PAILA NEPAL HOLIDAYS TRAVELCMS - PRODUCTION DATABASE DUMP & SEED
-- =====================================================================
-- System: Paila Nepal Holidays TravelCMS (Travel & Tour ERP)
-- Target RDBMS: MySQL 8.0+ / MariaDB 10.5+ / AWS RDS / GCP Cloud SQL
-- Engine: InnoDB
-- Character Set: utf8mb4
-- Collation: utf8mb4_unicode_ci
-- Compliant with OWASP Security & Relational Referential Integrity
-- Generated: 2026-09-22
-- =====================================================================

SET NAMES utf8mb4;
SET TIME_ZONE = '+05:45';
SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = 'NO_AUTO_VALUE_ON_ZERO,STRICT_TRANS_TABLES,NO_ENGINE_SUBSTITUTION';

-- ---------------------------------------------------------------------
-- DATABASE INITIALIZATION (OPTIONAL IF PRE-CREATED)
-- ---------------------------------------------------------------------
CREATE DATABASE IF NOT EXISTS `paila_travelcms` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `paila_travelcms`;

-- =====================================================================
-- 1. TABLE: company_settings
-- Stores government legal registration, PAN/VAT credentials & branding
-- =====================================================================
DROP TABLE IF EXISTS `company_settings`;
CREATE TABLE `company_settings` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `company_name` VARCHAR(255) NOT NULL DEFAULT 'Paila Nepal Holidays Pvt. Ltd.',
  `tagline` VARCHAR(255) DEFAULT 'Authentic Himalayan Journeys & Cultural Tours',
  `domain` VARCHAR(100) NOT NULL DEFAULT 'pailanepal.com',
  `address` TEXT NOT NULL,
  `phone` VARCHAR(100) NOT NULL DEFAULT '+977-1-4412345',
  `emergency_phone` VARCHAR(100) NOT NULL DEFAULT '+977-9801234567',
  `email` VARCHAR(255) NOT NULL DEFAULT 'info@pailanepal.com',
  `pan_number` VARCHAR(50) NOT NULL DEFAULT '601234567',
  `vat_number` VARCHAR(50) NOT NULL DEFAULT '601234567',
  `registration_number` VARCHAR(100) NOT NULL DEFAULT 'REG-2078-KTM-4491',
  `currency` VARCHAR(10) NOT NULL DEFAULT 'NPR',
  `tax_rate` DECIMAL(5,2) NOT NULL DEFAULT 13.00,
  `bank_name` VARCHAR(255) DEFAULT 'Nabil Bank Ltd.',
  `bank_account_name` VARCHAR(255) DEFAULT 'Paila Nepal Holidays Pvt. Ltd.',
  `bank_account_number` VARCHAR(100) DEFAULT '087012345678901',
  `bank_branch` VARCHAR(255) DEFAULT 'Thamel Branch, Kathmandu',
  `bank_swift_code` VARCHAR(50) DEFAULT 'NARBNPKA',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed Company Credentials
INSERT INTO `company_settings` (
  `id`, `company_name`, `tagline`, `domain`, `address`, `phone`, `emergency_phone`,
  `email`, `pan_number`, `vat_number`, `registration_number`, `currency`, `tax_rate`,
  `bank_name`, `bank_account_name`, `bank_account_number`, `bank_branch`, `bank_swift_code`
) VALUES (
  1,
  'Paila Nepal Holidays Pvt. Ltd.',
  'Authentic Himalayan Journeys & Cultural Tours',
  'pailanepal.com',
  'Amrit Marg, Thamel-29, Kathmandu, Nepal',
  '+977-1-4412345',
  '+977-9801234567',
  'info@pailanepal.com',
  '601234567',
  '601234567',
  'REG-2078-KTM-4491',
  'NPR',
  13.00,
  'Nabil Bank Ltd.',
  'Paila Nepal Holidays Pvt. Ltd.',
  '087012345678901',
  'Thamel Branch, Kathmandu',
  'NARBNPKA'
);

-- =====================================================================
-- 2. TABLE: users
-- Core RBAC accounts: SUPER_ADMIN, SALES, OPERATIONS, TOUR_OPERATOR
-- =====================================================================
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255) NOT NULL UNIQUE,
  `password` VARCHAR(255) NOT NULL,
  `role` ENUM('SUPER_ADMIN', 'SALES', 'OPERATIONS', 'TOUR_OPERATOR') NOT NULL DEFAULT 'SALES',
  `phone` VARCHAR(50) NOT NULL,
  `avatar` TEXT DEFAULT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `last_login_at` TIMESTAMP NULL DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_users_role` (`role`),
  INDEX `idx_users_email` (`email`),
  INDEX `idx_users_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Default password is 'password' (bcrypt hash: $2y$10$wT6d3M1W3P4Q4O8N9K... or standard argon2)
INSERT INTO `users` (`id`, `name`, `email`, `password`, `role`, `phone`, `is_active`) VALUES
(1, 'Rajesh Shrestha', 'admin@pailanepal.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'SUPER_ADMIN', '+977-9841234567', 1),
(2, 'Sita Maharjan', 'sales@pailanepal.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'SALES', '+977-9851234567', 1),
(3, 'Bikash Tamang', 'ops@pailanepal.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'OPERATIONS', '+977-9861234567', 1),
(4, 'Prakash Gurung', 'tour@pailanepal.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'TOUR_OPERATOR', '+977-9871234567', 1),
(5, 'Anita Rai', 'anita@pailanepal.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'SALES', '+977-9881234567', 1);

-- =====================================================================
-- 3. TABLE: packages
-- Master catalog of tours, treks, and student excursions
-- =====================================================================
DROP TABLE IF EXISTS `packages`;
CREATE TABLE `packages` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `title` VARCHAR(255) NOT NULL,
  `slug` VARCHAR(255) NOT NULL UNIQUE,
  `duration_days` INT UNSIGNED NOT NULL,
  `duration_nights` INT UNSIGNED NOT NULL,
  `standard_price` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `category` VARCHAR(100) NOT NULL DEFAULT 'Trekking',
  `overview` TEXT NOT NULL,
  `inclusions` TEXT NOT NULL,
  `exclusions` TEXT NOT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_packages_category` (`category`),
  INDEX `idx_packages_slug` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `packages` (`id`, `title`, `slug`, `duration_days`, `duration_nights`, `standard_price`, `category`, `overview`, `inclusions`, `exclusions`, `is_active`) VALUES
(1, 'Annapurna Base Camp Trek', 'annapurna-base-camp', 10, 9, 45000.00, 'Trekking', 'A classic trek to the Annapurna Base Camp at 4,130m through diverse landscapes, rhododendron forests, and traditional Gurung villages.', 'All ground transport, teahouse accommodation, meals during trek, TIMS card, ACAP permit, experienced guide & porter', 'Personal expenses, travel insurance, tips, extra nights in Kathmandu', 1),
(2, 'Pokhara Student Excursion', 'pokhara-student-excursion', 4, 3, 8500.00, 'Educational', 'Educational tour for students covering Pokhara lakeside, Sarangkot sunrise, Davis Falls, Gupteshwor Cave, and boating on Phewa Lake.', 'Tourist bus transport, hotel stay (twin/triple sharing), all meals, boat ride, entrance fees, tour guide', 'Personal expenses, paragliding (optional), insurance', 1),
(3, 'Everest View Trek', 'everest-view-trek', 8, 7, 65000.00, 'Trekking', 'Short Everest region trek to Tengboche with stunning views of Everest, Ama Dablam, and Lhotse without going to base camp.', 'Kathmandu-Lukla flights, teahouse stay, meals, Sagarmatha NP permit, TIMS, guide & porter', 'Personal gear, insurance, tips, hot showers (extra)', 1),
(4, 'Chitwan Jungle Safari', 'chitwan-jungle-safari', 3, 2, 12000.00, 'Tour', 'Wildlife adventure in Chitwan National Park with elephant ride, canoe trip, jungle walk, and Tharu cultural show.', 'AC transport, resort stay, all meals, park entry, all activities, naturalist guide', 'Personal expenses, beverages, tips', 1),
(5, 'Langtang Valley Trek', 'langtang-valley-trek', 7, 6, 35000.00, 'Trekking', 'Trek through the beautiful Langtang valley with views of Langtang Lirung, Tibetan Buddhist monasteries, and traditional Tamang culture.', 'Transport from Kathmandu, teahouse stay, meals, Langtang NP permit, TIMS, guide', 'Personal expenses, insurance, tips', 1),
(6, 'Kathmandu Heritage Tour', 'kathmandu-heritage-tour', 2, 1, 5000.00, 'Cultural', 'Cultural city tour covering UNESCO World Heritage Sites: Pashupatinath, Boudhanath, Swayambhunath, Patan Durbar Square, and Bhaktapur.', 'Private vehicle, licensed guide, all entrance fees, lunch', 'Personal expenses, tips, dinner', 1);

-- =====================================================================
-- 4. TABLE: itinerary_days
-- Master itinerary day definitions for packages & bookings
-- =====================================================================
DROP TABLE IF EXISTS `itinerary_days`;
CREATE TABLE `itinerary_days` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `package_id` INT UNSIGNED DEFAULT NULL,
  `booking_id` INT UNSIGNED DEFAULT NULL,
  `day_number` INT UNSIGNED NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT NOT NULL,
  `overnight_location` VARCHAR(255) DEFAULT '',
  `meals_included` VARCHAR(100) DEFAULT 'B, L, D',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_itinerary_package` (`package_id`),
  INDEX `idx_itinerary_booking` (`booking_id`),
  CONSTRAINT `fk_itinerary_package` FOREIGN KEY (`package_id`) REFERENCES `packages` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `itinerary_days` (`id`, `package_id`, `booking_id`, `day_number`, `title`, `description`, `overnight_location`, `meals_included`) VALUES
(1, 1, NULL, 1, 'Drive to Nayapul & Trek to Tikhedhunga', 'Early drive from Pokhara to Nayapul. Start trek through sub-tropical forest.', 'Tikhedhunga Teahouse', 'B, L, D'),
(2, 1, NULL, 2, 'Trek to Ghorepani via Ulleri Steps', 'Steep climb up Ulleri stone steps. Reach Ghorepani through rhododendron forest.', 'Ghorepani Teahouse', 'B, L, D'),
(3, 1, NULL, 3, 'Poon Hill Sunrise & Trek to Tadapani', 'Pre-dawn hike to Poon Hill (3,210m) for panoramic sunrise. Return to Ghorepani for breakfast and continue.', 'Tadapani Teahouse', 'B, L, D'),
(4, 2, NULL, 1, 'Drive to Pokhara & Lakeside Walk', 'Tourist bus drive along Prithvi Highway. Hotel check-in. Evening lakeside walk.', 'Hotel Lake Star, Pokhara', 'L, D'),
(5, 2, NULL, 2, 'Sarangkot Sunrise & Sightseeing', 'Early sunrise at Sarangkot. Visit Davis Falls, Gupteshwor Cave, and Seti Gorge.', 'Hotel Lake Star, Pokhara', 'B, L, D'),
(6, 2, NULL, 3, 'Phewa Boating & Peace Pagoda', 'Boat ride across Phewa Lake, hike to World Peace Pagoda, shopping in Lakeside.', 'Hotel Lake Star, Pokhara', 'B, L, D'),
(7, 2, NULL, 4, 'Return to Kathmandu', 'Breakfast and scenic drive back to Kathmandu.', 'N/A', 'B, L'),
(8, 4, NULL, 1, 'Drive to Chitwan & Sunset View', 'Scenic drive to Sauraha. Welcome drink, village walk and Rapti sunset.', 'Green Park Resort, Sauraha', 'L, D'),
(9, 4, NULL, 2, 'Jungle Safari & Cultural Program', 'Canoeing, elephant breeding center visit, jeep safari, evening Tharu dance.', 'Green Park Resort, Sauraha', 'B, L, D'),
(10, 4, NULL, 3, 'Bird Watching & Return', 'Early morning bird watching walk. Breakfast and drive back.', 'N/A', 'B, L');

-- =====================================================================
-- 5. TABLE: vendors
-- Third-party suppliers: Hotels, Transport fleets, Guides, Activities
-- =====================================================================
DROP TABLE IF EXISTS `vendors`;
CREATE TABLE `vendors` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(255) NOT NULL,
  `category` ENUM('HOTEL', 'RESTAURANT', 'VEHICLE', 'ACTIVITY', 'GUIDE_PERMIT', 'OTHER') NOT NULL,
  `location` TEXT NOT NULL,
  `contact_person` VARCHAR(255) NOT NULL,
  `phone` VARCHAR(100) NOT NULL,
  `pan_vat_number` VARCHAR(50) DEFAULT '',
  `bank_account_details` TEXT DEFAULT NULL,
  `vehicle_type` VARCHAR(100) DEFAULT NULL,
  `plate_number` VARCHAR(50) DEFAULT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_vendors_category` (`category`),
  INDEX `idx_vendors_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `vendors` (`id`, `name`, `category`, `location`, `contact_person`, `phone`, `pan_vat_number`, `bank_account_details`, `vehicle_type`, `plate_number`, `is_active`) VALUES
(1, 'Hotel Lake Star', 'HOTEL', 'Lakeside, Pokhara', 'Ram Bahadur Thapa', '+977-61-534567', '601234567', 'Nabil Bank, A/C: 08701234567890', NULL, NULL, 1),
(2, 'Green Park Resort', 'HOTEL', 'Sauraha, Chitwan', 'Hari Prasad Sharma', '+977-56-540123', '601987654', 'NIC Asia Bank, A/C: 01909876543210', NULL, NULL, 1),
(3, 'Mount Everest Hotel', 'HOTEL', 'Thamel, Kathmandu', 'Dawa Sherpa', '+977-1-4700123', '601456789', 'Himalayan Bank, A/C: 02304567890123', NULL, NULL, 1),
(4, 'Highway Dhaba', 'RESTAURANT', 'Mugling, Chitwan Highway', 'Krishna Lamichhane', '+977-9845678901', '601111222', '', NULL, NULL, 1),
(5, 'Pokhara Kitchen', 'RESTAURANT', 'Lakeside, Pokhara', 'Sunita Gurung', '+977-61-432100', '601333444', 'Nabil Bank, A/C: 08703334445556', NULL, NULL, 1),
(6, 'Sajha Yatayat Bus', 'VEHICLE', 'Kathmandu', 'Bijay Shrestha', '+977-1-4261234', '601555666', 'Global IME Bank, A/C: 03105556667778', 'Tourist Bus', 'Ba 2 Kha 5678', 1),
(7, 'Himalayan Jeep Service', 'VEHICLE', 'Kathmandu', 'Tenzing Bhote', '+977-9801112233', '601777888', '', 'Scorpio', 'Ga 1 Cha 4523', 1),
(8, 'Adventure Nepal Rafting', 'ACTIVITY', 'Trishuli / Bhotekoshi', 'Sanjay Adhikari', '+977-1-4412345', '601999000', 'Standard Chartered, A/C: 00309990001112', NULL, NULL, 1),
(9, 'Sunrise Paragliding', 'ACTIVITY', 'Sarangkot, Pokhara', 'Mukesh Sharma', '+977-61-540000', '601222333', '', NULL, NULL, 1),
(10, 'Pasang Tamang (Guide)', 'GUIDE_PERMIT', 'Kathmandu', 'Pasang Tamang', '+977-9803344556', '', '', NULL, NULL, 1);

-- =====================================================================
-- 6. TABLE: bookings
-- Central Tour reservations with automated calculations & balance tracking
-- =====================================================================
DROP TABLE IF EXISTS `bookings`;
CREATE TABLE `bookings` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `booking_code` VARCHAR(100) NOT NULL UNIQUE,
  `client_type` ENUM('INSTITUTIONAL', 'CORPORATE', 'INDIVIDUAL', 'FOREIGN_TREK') NOT NULL DEFAULT 'INDIVIDUAL',
  `client_name` VARCHAR(255) NOT NULL,
  `client_email` VARCHAR(255) NOT NULL,
  `client_phone` VARCHAR(100) NOT NULL,
  `package_id` INT UNSIGNED DEFAULT NULL,
  `package_name` VARCHAR(255) DEFAULT NULL,
  `status` ENUM('PROPOSED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'PROPOSED',
  `start_date` DATE NOT NULL,
  `end_date` DATE NOT NULL,
  `pax_count` INT UNSIGNED NOT NULL DEFAULT 1,
  `total_agreed_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `advance_received` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `assigned_tour_operator_id` INT UNSIGNED DEFAULT NULL,
  `assigned_tour_operator_name` VARCHAR(255) DEFAULT NULL,
  `notes` TEXT DEFAULT NULL,
  `created_by` INT UNSIGNED NOT NULL,
  `created_by_name` VARCHAR(255) NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_bookings_status` (`status`),
  INDEX `idx_bookings_dates` (`start_date`, `end_date`),
  INDEX `idx_bookings_package` (`package_id`),
  INDEX `idx_bookings_tour_operator` (`assigned_tour_operator_id`),
  CONSTRAINT `fk_bookings_package` FOREIGN KEY (`package_id`) REFERENCES `packages` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_bookings_user` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `bookings` (`id`, `booking_code`, `client_type`, `client_name`, `client_email`, `client_phone`, `package_id`, `package_name`, `status`, `start_date`, `end_date`, `pax_count`, `total_agreed_amount`, `advance_received`, `assigned_tour_operator_id`, `assigned_tour_operator_name`, `notes`, `created_by`, `created_by_name`, `created_at`) VALUES
(1, 'PNH-2026-020', 'INSTITUTIONAL', 'St. Mary\'s School', 'info@stmarys.edu.np', '+977-1-4410000', 2, 'Pokhara Student Excursion', 'COMPLETED', '2026-09-20', '2026-09-23', 30, 255000.00, 255000.00, 4, 'Prakash Gurung', 'School group tour completed successfully.', 2, 'Sita Maharjan', '2026-09-01 09:30:00'),
(2, 'PNH-2026-021', 'INDIVIDUAL', 'Kathmandu Local Hikers', 'kathmandu.hikers@gmail.com', '+977-9800000000', 6, 'Kathmandu Heritage Tour', 'COMPLETED', '2026-09-24', '2026-09-25', 10, 50000.00, 50000.00, 4, 'Prakash Gurung', 'Short heritage tour for local group.', 2, 'Sita Maharjan', '2026-09-22 11:00:00'),
(3, 'PNH-2026-022', 'FOREIGN_TREK', 'John Doe (USA)', 'john.doe@example.com', '+1-555-0101', 1, 'Annapurna Base Camp Trek', 'IN_PROGRESS', '2026-09-25', '2026-10-04', 2, 90000.00, 90000.00, 4, 'Prakash Gurung', 'Starting trek today. Group healthy and excited.', 2, 'Sita Maharjan', '2026-08-20 10:15:00'),
(4, 'PNH-2026-023', 'FOREIGN_TREK', 'Jane Smith (UK)', 'jane.smith@example.co.uk', '+44-7700-900000', 3, 'Everest View Trek', 'CONFIRMED', '2026-10-10', '2026-10-17', 1, 65000.00, 30000.00, NULL, NULL, 'Solo female traveler. Gear rental assistance needed.', 5, 'Anita Rai', '2026-09-10 08:00:00'),
(5, 'PNH-2026-024', 'CORPORATE', 'Google Nepal Team', 'events-np@google.com', '+977-1-5500000', 4, 'Chitwan Jungle Safari', 'PROPOSED', '2026-11-05', '2026-11-07', 15, 180000.00, 0.00, NULL, NULL, 'Corporate retreat. Specific request for high-speed WiFi at resort.', 2, 'Sita Maharjan', '2026-09-20 15:00:00');

-- =====================================================================
-- 7. TABLE: booking_status_history
-- Immutable audit log of every booking status transition
-- =====================================================================
DROP TABLE IF EXISTS `booking_status_history`;
CREATE TABLE `booking_status_history` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `booking_id` INT UNSIGNED NOT NULL,
  `booking_code` VARCHAR(100) NOT NULL,
  `from_status` VARCHAR(50) DEFAULT NULL,
  `to_status` VARCHAR(50) NOT NULL,
  `changed_by_id` INT UNSIGNED DEFAULT NULL,
  `changed_by_name` VARCHAR(255) NOT NULL,
  `changed_by_role` VARCHAR(50) NOT NULL,
  `reason` TEXT DEFAULT NULL,
  `notes` TEXT DEFAULT NULL,
  `source` VARCHAR(50) DEFAULT 'ADMIN_PORTAL',
  `changed_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_history_booking` (`booking_id`),
  CONSTRAINT `fk_history_booking` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `booking_status_history` (`id`, `booking_id`, `booking_code`, `from_status`, `to_status`, `changed_by_id`, `changed_by_name`, `changed_by_role`, `reason`, `notes`, `source`, `changed_at`) VALUES
(1, 1, 'PNH-2026-020', 'IN_PROGRESS', 'COMPLETED', 1, 'Rajesh Shrestha', 'SUPER_ADMIN', 'Tour concluded.', NULL, 'ADMIN_PORTAL', '2026-09-23 18:00:00'),
(2, 2, 'PNH-2026-021', 'IN_PROGRESS', 'COMPLETED', 1, 'Rajesh Shrestha', 'SUPER_ADMIN', 'Tour finished.', NULL, 'ADMIN_PORTAL', '2026-09-25 17:00:00'),
(3, 3, 'PNH-2026-022', 'CONFIRMED', 'IN_PROGRESS', 4, 'Prakash Gurung', 'TOUR_OPERATOR', 'Group started trek.', NULL, 'FIELD_APP', '2026-09-25 08:00:00');

-- =====================================================================
-- 8. TABLE: operation_allocations
-- Service bookings with vendors (Hotels, Transport, Guides, Food)
-- =====================================================================
DROP TABLE IF EXISTS `operation_allocations`;
CREATE TABLE `operation_allocations` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `booking_id` INT UNSIGNED NOT NULL,
  `booking_code` VARCHAR(100) NOT NULL,
  `vendor_id` INT UNSIGNED NOT NULL,
  `vendor_name` VARCHAR(255) NOT NULL,
  `service_type` ENUM('HOTEL', 'RESTAURANT', 'VEHICLE', 'ACTIVITY', 'OTHER') NOT NULL,
  `service_date` DATE NOT NULL,
  `agreed_cost` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `amount_paid` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `payment_status` ENUM('PENDING', 'PARTIALLY_PAID', 'SETTLED') NOT NULL DEFAULT 'PENDING',
  `field_updated_by_operator` TINYINT(1) NOT NULL DEFAULT 0,
  `special_notes` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_allocations_booking` (`booking_id`),
  INDEX `idx_allocations_vendor` (`vendor_id`),
  INDEX `idx_allocations_status` (`payment_status`),
  CONSTRAINT `fk_allocations_booking` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_allocations_vendor` FOREIGN KEY (`vendor_id`) REFERENCES `vendors` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `operation_allocations` (`id`, `booking_id`, `booking_code`, `vendor_id`, `vendor_name`, `service_type`, `service_date`, `agreed_cost`, `amount_paid`, `payment_status`, `field_updated_by_operator`, `special_notes`) VALUES
(1, 1, 'PNH-2026-020', 1, 'Hotel Lake Star', 'HOTEL', '2026-09-20', 90000.00, 90000.00, 'SETTLED', 0, 'School group stay'),
(2, 1, 'PNH-2026-020', 6, 'Sajha Yatayat Bus', 'VEHICLE', '2026-09-20', 35000.00, 35000.00, 'SETTLED', 0, 'Bus transport'),
(3, 3, 'PNH-2026-022', 7, 'Himalayan Jeep Service', 'VEHICLE', '2026-09-25', 15000.00, 15000.00, 'SETTLED', 0, 'KTM to trailhead jeep');

-- =====================================================================
-- 9. TABLE: vendor_payments
-- Accounts Payable disbursements with reference tracking
-- =====================================================================
DROP TABLE IF EXISTS `vendor_payments`;
CREATE TABLE `vendor_payments` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `operation_allocation_id` INT UNSIGNED NOT NULL,
  `amount` DECIMAL(12,2) NOT NULL,
  `payment_mode` ENUM('CASH', 'BANK_TRANSFER', 'ESEWA', 'KHALTI', 'CHEQUE') NOT NULL DEFAULT 'BANK_TRANSFER',
  `reference_number` VARCHAR(100) DEFAULT '',
  `paid_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `recorded_by` INT UNSIGNED NOT NULL,
  `recorded_by_name` VARCHAR(255) NOT NULL,
  `notes` TEXT DEFAULT NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_vpayments_allocation` (`operation_allocation_id`),
  CONSTRAINT `fk_vpayments_allocation` FOREIGN KEY (`operation_allocation_id`) REFERENCES `operation_allocations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_vpayments_user` FOREIGN KEY (`recorded_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `vendor_payments` (`id`, `operation_allocation_id`, `amount`, `payment_mode`, `reference_number`, `paid_at`, `recorded_by`, `recorded_by_name`) VALUES
(1, 1, 90000.00, 'BANK_TRANSFER', 'NAB-SEP-001', '2026-09-23 10:30:00', 1, 'Rajesh Shrestha'),
(2, 2, 35000.00, 'BANK_TRANSFER', 'NAB-SEP-002', '2026-09-23 14:15:00', 1, 'Rajesh Shrestha'),
(3, 3, 15000.00, 'BANK_TRANSFER', 'NAB-SEP-003', '2026-09-25 09:00:00', 1, 'Rajesh Shrestha');

-- =====================================================================
-- 10. TABLE: client_payments
-- Accounts Receivable receipts from customers
-- =====================================================================
DROP TABLE IF EXISTS `client_payments`;
CREATE TABLE `client_payments` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `booking_id` INT UNSIGNED NOT NULL,
  `amount` DECIMAL(12,2) NOT NULL,
  `payment_mode` ENUM('CASH', 'BANK_TRANSFER', 'ESEWA', 'KHALTI', 'CHEQUE', 'CREDIT_CARD') NOT NULL DEFAULT 'BANK_TRANSFER',
  `reference_number` VARCHAR(100) DEFAULT '',
  `paid_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `recorded_by` INT UNSIGNED NOT NULL,
  `recorded_by_name` VARCHAR(255) NOT NULL,
  `notes` TEXT DEFAULT NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_cpayments_booking` (`booking_id`),
  CONSTRAINT `fk_cpayments_booking` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `client_payments` (`id`, `booking_id`, `amount`, `payment_mode`, `reference_number`, `paid_at`, `recorded_by`, `recorded_by_name`, `notes`) VALUES
(1, 1, 255000.00, 'BANK_TRANSFER', 'STX-SEP-001', '2026-09-15 14:00:00', 2, 'Sita Maharjan', 'Full school booking settlement'),
(2, 2, 50000.00, 'BANK_TRANSFER', 'KTM-SEP-001', '2026-09-24 09:30:00', 1, 'Rajesh Shrestha', 'Full local group payment'),
(3, 3, 90000.00, 'BANK_TRANSFER', 'JOHN-SEP-001', '2026-09-20 11:00:00', 2, 'Sita Maharjan', 'Full payment for ABC trek'),
(4, 4, 30000.00, 'ESEWA', 'ESW-JANE-DEP', '2026-09-10 09:30:00', 5, 'Anita Rai', 'Advance deposit for Everest trek');

-- =====================================================================
-- 11. TABLE: system_activities
-- Comprehensive system audit trail
-- =====================================================================
DROP TABLE IF EXISTS `system_activities`;
CREATE TABLE `system_activities` (
  `id` VARCHAR(100) NOT NULL,
  `type` VARCHAR(100) NOT NULL,
  `category` VARCHAR(100) NOT NULL DEFAULT 'GENERAL',
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `actor_id` INT UNSIGNED DEFAULT NULL,
  `actor_name` VARCHAR(255) NOT NULL,
  `actor_role` VARCHAR(50) NOT NULL,
  `actor_email` VARCHAR(255) DEFAULT NULL,
  `metadata` JSON DEFAULT NULL,
  `timestamp` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_activities_timestamp` (`timestamp`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `system_activities` (`id`, `type`, `category`, `title`, `description`, `actor_id`, `actor_name`, `actor_role`, `actor_email`, `timestamp`) VALUES
('act-001', 'BOOKING_CREATED', 'BOOKING', 'New Booking Created', 'Booking PNH-2026-001 created for St. Xavier\'s College', 2, 'Sita Maharjan', 'SALES', 'sales@pailanepal.com', '2026-01-10 09:30:00'),
('act-002', 'BOOKING_STATUS_CHANGE', 'BOOKING', 'Booking Confirmed', 'Booking PNH-2026-001 status changed to CONFIRMED', 1, 'Rajesh Shrestha', 'SUPER_ADMIN', 'admin@pailanepal.com', '2026-01-15 14:20:00'),
('act-003', 'VENDOR_PAYMENT', 'FINANCE', 'Vendor Payment Recorded', 'Payment of NPR 50,000 made to Hotel Lake Star', 1, 'Rajesh Shrestha', 'SUPER_ADMIN', 'admin@pailanepal.com', '2026-01-28 10:30:00');

-- =====================================================================
-- 12. TABLE: system_alerts
-- Operational alerts, safety escalations & notifications
-- =====================================================================
DROP TABLE IF EXISTS `system_alerts`;
CREATE TABLE `system_alerts` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `booking_id` INT UNSIGNED DEFAULT NULL,
  `tour_leader_id` INT UNSIGNED NOT NULL,
  `alert_type` VARCHAR(100) NOT NULL,
  `severity` ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') NOT NULL DEFAULT 'MEDIUM',
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `location` VARCHAR(255) DEFAULT '',
  `status` ENUM('ACTIVE', 'ACKNOWLEDGED', 'RESOLVED') NOT NULL DEFAULT 'ACTIVE',
  `acknowledged_by` INT UNSIGNED DEFAULT NULL,
  `acknowledged_at` TIMESTAMP NULL DEFAULT NULL,
  `resolved_at` TIMESTAMP NULL DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_alerts_status` (`status`),
  INDEX `idx_alerts_severity` (`severity`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `system_alerts` (`id`, `booking_id`, `tour_leader_id`, `alert_type`, `severity`, `title`, `description`, `location`, `status`, `created_at`) VALUES
(1, 2, 4, 'WEATHER_ADVISORY', 'MEDIUM', 'Heavy snowfall near Deurali', 'Trail above Deurali experiencing continuous snowfall. Trekking group holding at Himalaya Lodge.', 'Deurali (3,200m)', 'ACTIVE', '2026-01-21 14:15:00');

-- =====================================================================
-- 13. TABLE: daily_field_logs
-- Field checkpoints, GPS coordinates, group health, weather updates
-- =====================================================================
DROP TABLE IF EXISTS `daily_field_logs`;
CREATE TABLE `daily_field_logs` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `booking_id` INT UNSIGNED NOT NULL,
  `tour_leader_id` INT UNSIGNED NOT NULL,
  `day_number` INT UNSIGNED NOT NULL DEFAULT 1,
  `location_title` VARCHAR(255) NOT NULL,
  `altitude_meters` INT DEFAULT NULL,
  `weather_condition` VARCHAR(100) DEFAULT 'CLEAR',
  `pax_health_status` VARCHAR(255) DEFAULT 'ALL_HEALTHY',
  `trail_notes` TEXT DEFAULT NULL,
  `gps_lat` DECIMAL(10,8) DEFAULT NULL,
  `gps_lng` DECIMAL(11,8) DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_field_booking` (`booking_id`),
  INDEX `idx_field_leader` (`tour_leader_id`),
  CONSTRAINT `fk_field_booking` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- 14. TABLE: tour_expenses
-- Field petty cash, trail permits, emergency porter payments, receipts
-- =====================================================================
DROP TABLE IF EXISTS `tour_expenses`;
CREATE TABLE `tour_expenses` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `booking_id` INT UNSIGNED NOT NULL,
  `tour_leader_id` INT UNSIGNED NOT NULL,
  `category` VARCHAR(100) NOT NULL DEFAULT 'MEALS',
  `title` VARCHAR(255) NOT NULL,
  `amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `currency` VARCHAR(10) NOT NULL DEFAULT 'NPR',
  `payment_method` VARCHAR(50) NOT NULL DEFAULT 'CASH',
  `receipt_image` LONGTEXT DEFAULT NULL,
  `notes` TEXT DEFAULT NULL,
  `expense_date` DATE NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_exp_booking` (`booking_id`),
  INDEX `idx_exp_leader` (`tour_leader_id`),
  CONSTRAINT `fk_exp_booking` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- 15. TABLE: vendor_swaps
-- Emergency on-trail vendor replacements & cost variation tracking
-- =====================================================================
DROP TABLE IF EXISTS `vendor_swaps`;
CREATE TABLE `vendor_swaps` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `booking_id` INT UNSIGNED NOT NULL,
  `tour_leader_id` INT UNSIGNED NOT NULL,
  `original_vendor_id` INT UNSIGNED DEFAULT NULL,
  `original_vendor_name` VARCHAR(255) DEFAULT NULL,
  `new_vendor_name` VARCHAR(255) NOT NULL,
  `service_type` VARCHAR(50) NOT NULL DEFAULT 'HOTEL',
  `reason` TEXT NOT NULL,
  `cost_difference` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `contact_phone` VARCHAR(100) DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_swap_booking` (`booking_id`),
  CONSTRAINT `fk_swap_booking` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- 16. AUTOMATED STORED PROCEDURES & BUSINESS LOGIC INTEGRITY
-- Computed financials (never trust client supplied balances)
-- =====================================================================
DELIMITER //

DROP PROCEDURE IF EXISTS `RecalculateBookingFinancials`//
CREATE PROCEDURE `RecalculateBookingFinancials`(IN in_booking_id INT UNSIGNED)
BEGIN
  DECLARE v_total_client_paid DECIMAL(12,2) DEFAULT 0.00;
  
  -- Calculate total client payments from transaction ledger
  SELECT COALESCE(SUM(amount), 0.00) INTO v_total_client_paid
  FROM `client_payments`
  WHERE `booking_id` = in_booking_id;
  
  -- Update booking master record
  UPDATE `bookings`
  SET `advance_received` = v_total_client_paid
  WHERE `id` = in_booking_id;
END//

DROP PROCEDURE IF EXISTS `RecalculateAllocationFinancials`//
CREATE PROCEDURE `RecalculateAllocationFinancials`(IN in_allocation_id INT UNSIGNED)
BEGIN
  DECLARE v_agreed DECIMAL(12,2) DEFAULT 0.00;
  DECLARE v_paid DECIMAL(12,2) DEFAULT 0.00;
  
  SELECT `agreed_cost` INTO v_agreed
  FROM `operation_allocations`
  WHERE `id` = in_allocation_id;
  
  SELECT COALESCE(SUM(amount), 0.00) INTO v_paid
  FROM `vendor_payments`
  WHERE `operation_allocation_id` = in_allocation_id;
  
  UPDATE `operation_allocations`
  SET 
    `amount_paid` = v_paid,
    `payment_status` = CASE
      WHEN v_paid >= v_agreed AND v_agreed > 0 THEN 'SETTLED'
      WHEN v_paid > 0 THEN 'PARTIALLY_PAID'
      ELSE 'PENDING'
    END
  WHERE `id` = in_allocation_id;
END//

DELIMITER ;

-- Re-enable Foreign Key validation
SET FOREIGN_KEY_CHECKS = 1;

-- =====================================================================
-- END OF PRODUCTION SQL DUMP
-- =====================================================================
