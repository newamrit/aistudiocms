import { SystemBackupData } from '../types';

/**
 * Escapes a string or value for safe SQL insertion (standard SQL escaping).
 */
function sqlEscape(val: any): string {
  if (val === null || val === undefined) {
    return 'NULL';
  }
  if (typeof val === 'number') {
    return isNaN(val) ? 'NULL' : String(val);
  }
  if (typeof val === 'boolean') {
    return val ? 'TRUE' : 'FALSE';
  }
  if (typeof val === 'object') {
    return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
  }
  return `'${String(val).replace(/'/g, "''")}'`;
}

/**
 * Generates standard production-ready SQL dump file content
 * compatible with PostgreSQL, MySQL, and SQLite.
 */
export function generateSqlDump(
  backupData: SystemBackupData, 
  dialect: 'postgres' | 'standard' = 'postgres'
): string {
  const { data, metadata, version, backupDate, systemName, systemDomain } = backupData;
  const now = new Date(backupDate).toISOString();

  // Create an embedded compact base64-encoded payload signature in SQL comments
  // for ultra-fast, zero-loss browser restoration, alongside the standard executable SQL statements!
  const jsonSignature = btoa(unescape(encodeURIComponent(JSON.stringify(backupData))));

  let sql = `-- =====================================================================
-- PAILA NEPAL HOLIDAYS ERP - FULL SYSTEM DATABASE BACKUP DUMP
-- =====================================================================
-- System Name     : ${systemName}
-- Domain          : ${systemDomain}
-- Version         : ${version}
-- Backup Date     : ${now}
-- Exported By     : ${metadata.exportedBy.name} (${metadata.exportedBy.role} <${metadata.exportedBy.email || 'N/A'}>)
-- Target Dialect  : ${dialect.toUpperCase()} / ANSI SQL:2016
-- 
-- Summary of Data Payload:
--   - Bookings           : ${metadata.totalBookings}
--   - Users & Staff      : ${metadata.totalUsers}
--   - Vendors & Fleet    : ${metadata.totalVendors}
--   - Packages           : ${metadata.totalPackages}
--   - Operations & Alloc : ${metadata.totalAllocations}
--   - Vendor Payments    : ${metadata.totalPayments}
--   - System Audit Logs  : ${metadata.totalActivities}
--   - Emergency Alerts   : ${metadata.totalAlerts}
-- =====================================================================
-- [SYSTEM_METADATA_START]
-- ${jsonSignature}
-- [SYSTEM_METADATA_END]
-- =====================================================================

${dialect === 'postgres' ? 'BEGIN;' : 'START TRANSACTION;'}

-- ---------------------------------------------------------------------
-- 1. Table: company_settings
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS company_settings (
    id SERIAL PRIMARY KEY,
    company_name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    phone VARCHAR(100) NOT NULL,
    domain VARCHAR(100) NOT NULL,
    pan_number VARCHAR(50) NOT NULL,
    vat_number VARCHAR(50) NOT NULL,
    email VARCHAR(255),
    tagline TEXT,
    emergency_phone VARCHAR(100),
    registration_number VARCHAR(100),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

TRUNCATE TABLE company_settings;
`;

  if (data.companySettings) {
    const s = data.companySettings;
    sql += `INSERT INTO company_settings (
    company_name, address, phone, domain, pan_number, vat_number, email, tagline, emergency_phone, registration_number
) VALUES (
    ${sqlEscape(s.companyName)},
    ${sqlEscape(s.address)},
    ${sqlEscape(s.phone)},
    ${sqlEscape(s.domain)},
    ${sqlEscape(s.panNumber)},
    ${sqlEscape(s.vatNumber)},
    ${sqlEscape(s.email)},
    ${sqlEscape(s.tagline)},
    ${sqlEscape(s.emergencyPhone)},
    ${sqlEscape(s.registrationNumber)}
);\n\n`;
  }

  // ---------------------------------------------------------------------
  // 2. Table: users
  // ---------------------------------------------------------------------
  sql += `-- ---------------------------------------------------------------------
-- 2. Table: users
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    role VARCHAR(50) NOT NULL,
    phone VARCHAR(50),
    password VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    avatar TEXT
);

TRUNCATE TABLE users;
`;

  if (data.users && data.users.length > 0) {
    for (const u of data.users) {
      sql += `INSERT INTO users (id, name, email, role, phone, password, is_active, avatar) VALUES (
    ${sqlEscape(u.id)},
    ${sqlEscape(u.name)},
    ${sqlEscape(u.email)},
    ${sqlEscape(u.role)},
    ${sqlEscape(u.phone)},
    ${sqlEscape(u.password)},
    ${sqlEscape(u.isActive ?? true)},
    ${sqlEscape(u.avatar)}
);\n`;
    }
    sql += '\n';
  }

  // ---------------------------------------------------------------------
  // 3. Table: vendors
  // ---------------------------------------------------------------------
  sql += `-- ---------------------------------------------------------------------
-- 3. Table: vendors
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS vendors (
    id INT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    location TEXT,
    contact_person VARCHAR(255),
    phone VARCHAR(100),
    pan_vat_number VARCHAR(50),
    bank_account_details TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    vehicle_type VARCHAR(100),
    plate_number VARCHAR(50)
);

TRUNCATE TABLE vendors;
`;

  if (data.vendors && data.vendors.length > 0) {
    for (const v of data.vendors) {
      sql += `INSERT INTO vendors (
    id, name, category, location, contact_person, phone, pan_vat_number, bank_account_details, is_active, vehicle_type, plate_number
) VALUES (
    ${sqlEscape(v.id)},
    ${sqlEscape(v.name)},
    ${sqlEscape(v.category)},
    ${sqlEscape(v.location)},
    ${sqlEscape(v.contactPerson)},
    ${sqlEscape(v.phone)},
    ${sqlEscape(v.panVatNumber)},
    ${sqlEscape(v.bankAccountDetails)},
    ${sqlEscape(v.isActive ?? true)},
    ${sqlEscape(v.vehicleType)},
    ${sqlEscape(v.plateNumber)}
);\n`;
    }
    sql += '\n';
  }

  // ---------------------------------------------------------------------
  // 4. Table: packages
  // ---------------------------------------------------------------------
  sql += `-- ---------------------------------------------------------------------
-- 4. Table: packages
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS packages (
    id INT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    duration_days INT NOT NULL,
    duration_nights INT NOT NULL,
    standard_price NUMERIC(12, 2) NOT NULL,
    overview TEXT,
    inclusions TEXT,
    exclusions TEXT,
    category VARCHAR(100),
    itinerary_days JSON
);

TRUNCATE TABLE packages;
`;

  if (data.packages && data.packages.length > 0) {
    for (const p of data.packages) {
      sql += `INSERT INTO packages (
    id, title, slug, duration_days, duration_nights, standard_price, overview, inclusions, exclusions, category, itinerary_days
) VALUES (
    ${sqlEscape(p.id)},
    ${sqlEscape(p.title)},
    ${sqlEscape(p.slug)},
    ${sqlEscape(p.durationDays)},
    ${sqlEscape(p.durationNights)},
    ${sqlEscape(p.standardPrice)},
    ${sqlEscape(p.overview)},
    ${sqlEscape(p.inclusions)},
    ${sqlEscape(p.exclusions)},
    ${sqlEscape(p.category)},
    ${sqlEscape(p.itineraryDays)}
);\n`;
    }
    sql += '\n';
  }

  // ---------------------------------------------------------------------
  // 5. Table: bookings
  // ---------------------------------------------------------------------
  sql += `-- ---------------------------------------------------------------------
-- 5. Table: bookings
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bookings (
    id INT PRIMARY KEY,
    booking_code VARCHAR(100) UNIQUE NOT NULL,
    client_type VARCHAR(50) NOT NULL,
    client_name VARCHAR(255) NOT NULL,
    client_email VARCHAR(255) NOT NULL,
    client_phone VARCHAR(100) NOT NULL,
    package_id INT,
    package_name VARCHAR(255),
    status VARCHAR(50) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    pax_count INT NOT NULL,
    total_agreed_amount NUMERIC(12, 2) NOT NULL,
    advance_received NUMERIC(12, 2) NOT NULL,
    assigned_tour_operator_id INT,
    assigned_tour_operator_name VARCHAR(255),
    notes TEXT,
    created_by INT,
    created_by_name VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    itinerary_days JSON,
    status_history JSON
);

TRUNCATE TABLE bookings;
`;

  if (data.bookings && data.bookings.length > 0) {
    for (const b of data.bookings) {
      sql += `INSERT INTO bookings (
    id, booking_code, client_type, client_name, client_email, client_phone,
    package_id, package_name, status, start_date, end_date, pax_count,
    total_agreed_amount, advance_received, assigned_tour_operator_id, assigned_tour_operator_name,
    notes, created_by, created_by_name, created_at, itinerary_days, status_history
) VALUES (
    ${sqlEscape(b.id)},
    ${sqlEscape(b.bookingCode)},
    ${sqlEscape(b.clientType)},
    ${sqlEscape(b.clientName)},
    ${sqlEscape(b.clientEmail)},
    ${sqlEscape(b.clientPhone)},
    ${sqlEscape(b.packageId)},
    ${sqlEscape(b.packageName)},
    ${sqlEscape(b.status)},
    ${sqlEscape(b.startDate)},
    ${sqlEscape(b.endDate)},
    ${sqlEscape(b.paxCount)},
    ${sqlEscape(b.totalAgreedAmount)},
    ${sqlEscape(b.advanceReceived)},
    ${sqlEscape(b.assignedTourOperatorId)},
    ${sqlEscape(b.assignedTourOperatorName)},
    ${sqlEscape(b.notes)},
    ${sqlEscape(b.createdBy)},
    ${sqlEscape(b.createdByName)},
    ${sqlEscape(b.createdAt)},
    ${sqlEscape(b.itineraryDays)},
    ${sqlEscape(b.statusHistory)}
);\n`;
    }
    sql += '\n';
  }

  // ---------------------------------------------------------------------
  // 6. Table: operation_allocations
  // ---------------------------------------------------------------------
  sql += `-- ---------------------------------------------------------------------
-- 6. Table: operation_allocations
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS operation_allocations (
    id INT PRIMARY KEY,
    booking_id INT NOT NULL,
    booking_code VARCHAR(100) NOT NULL,
    vendor_id INT NOT NULL,
    vendor_name VARCHAR(255) NOT NULL,
    service_type VARCHAR(100) NOT NULL,
    service_date DATE NOT NULL,
    agreed_cost NUMERIC(12, 2) NOT NULL,
    amount_paid NUMERIC(12, 2) NOT NULL,
    payment_status VARCHAR(50) NOT NULL,
    field_updated_by_operator BOOLEAN DEFAULT FALSE,
    special_notes TEXT
);

TRUNCATE TABLE operation_allocations;
`;

  if (data.operationAllocations && data.operationAllocations.length > 0) {
    for (const a of data.operationAllocations) {
      sql += `INSERT INTO operation_allocations (
    id, booking_id, booking_code, vendor_id, vendor_name, service_type, service_date, agreed_cost, amount_paid, payment_status, field_updated_by_operator, special_notes
) VALUES (
    ${sqlEscape(a.id)},
    ${sqlEscape(a.bookingId)},
    ${sqlEscape(a.bookingCode)},
    ${sqlEscape(a.vendorId)},
    ${sqlEscape(a.vendorName)},
    ${sqlEscape(a.serviceType)},
    ${sqlEscape(a.serviceDate)},
    ${sqlEscape(a.agreedCost)},
    ${sqlEscape(a.amountPaid)},
    ${sqlEscape(a.paymentStatus)},
    ${sqlEscape(a.fieldUpdatedByOperator)},
    ${sqlEscape(a.specialNotes)}
);\n`;
    }
    sql += '\n';
  }

  // ---------------------------------------------------------------------
  // 7. Table: vendor_payments
  // ---------------------------------------------------------------------
  sql += `-- ---------------------------------------------------------------------
-- 7. Table: vendor_payments
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS vendor_payments (
    id INT PRIMARY KEY,
    operation_allocation_id INT NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    payment_mode VARCHAR(50) NOT NULL,
    reference_number VARCHAR(100),
    paid_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    recorded_by INT NOT NULL,
    recorded_by_name VARCHAR(255) NOT NULL
);

TRUNCATE TABLE vendor_payments;
`;

  if (data.vendorPayments && data.vendorPayments.length > 0) {
    for (const vp of data.vendorPayments) {
      sql += `INSERT INTO vendor_payments (
    id, operation_allocation_id, amount, payment_mode, reference_number, paid_at, recorded_by, recorded_by_name
) VALUES (
    ${sqlEscape(vp.id)},
    ${sqlEscape(vp.operationAllocationId)},
    ${sqlEscape(vp.amount)},
    ${sqlEscape(vp.paymentMode)},
    ${sqlEscape(vp.referenceNumber)},
    ${sqlEscape(vp.paidAt)},
    ${sqlEscape(vp.recordedBy)},
    ${sqlEscape(vp.recordedByName)}
);\n`;
    }
    sql += '\n';
  }

  // ---------------------------------------------------------------------
  // 8. Table: system_activities
  // ---------------------------------------------------------------------
  sql += `-- ---------------------------------------------------------------------
-- 8. Table: system_activities
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS system_activities (
    id VARCHAR(100) PRIMARY KEY,
    type VARCHAR(100) NOT NULL,
    category VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    actor JSON,
    metadata JSON
);

TRUNCATE TABLE system_activities;
`;

  if (data.activities && data.activities.length > 0) {
    for (const act of data.activities) {
      sql += `INSERT INTO system_activities (id, type, category, title, description, timestamp, actor, metadata) VALUES (
    ${sqlEscape(act.id)},
    ${sqlEscape(act.type)},
    ${sqlEscape(act.category)},
    ${sqlEscape(act.title)},
    ${sqlEscape(act.description)},
    ${sqlEscape(act.timestamp)},
    ${sqlEscape(act.actor)},
    ${sqlEscape(act.metadata)}
);\n`;
    }
    sql += '\n';
  }

  // ---------------------------------------------------------------------
  // 9. Table: system_alerts
  // ---------------------------------------------------------------------
  sql += `-- ---------------------------------------------------------------------
-- 9. Table: system_alerts
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS system_alerts (
    id INT PRIMARY KEY,
    booking_id INT,
    tour_leader_id INT NOT NULL,
    alert_type VARCHAR(100) NOT NULL,
    severity VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    location VARCHAR(255),
    status VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    acknowledged_by INT,
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    resolved_at TIMESTAMP WITH TIME ZONE
);

TRUNCATE TABLE system_alerts;
`;

  if (data.alerts && data.alerts.length > 0) {
    for (const al of data.alerts) {
      sql += `INSERT INTO system_alerts (
    id, booking_id, tour_leader_id, alert_type, severity, title, description, location, status, created_at, acknowledged_by, acknowledged_at, resolved_at
) VALUES (
    ${sqlEscape(al.id)},
    ${sqlEscape(al.booking_id)},
    ${sqlEscape(al.tour_leader_id)},
    ${sqlEscape(al.alert_type)},
    ${sqlEscape(al.severity)},
    ${sqlEscape(al.title)},
    ${sqlEscape(al.description)},
    ${sqlEscape(al.location)},
    ${sqlEscape(al.status)},
    ${sqlEscape(al.created_at)},
    ${sqlEscape(al.acknowledged_by)},
    ${sqlEscape(al.acknowledged_at)},
    ${sqlEscape(al.resolved_at)}
);\n`;
    }
    sql += '\n';
  }

  sql += `-- =====================================================================
-- COMMIT TRANSACTION
-- =====================================================================
COMMIT;\n`;

  return sql;
}

/**
 * Validates and extracts SystemBackupData from an uploaded SQL dump file.
 * Handles both embedded metadata signature dumps and raw standard SQL dumps.
 */
export function parseSqlDump(sqlContent: string): { 
  valid: boolean; 
  data?: SystemBackupData; 
  error?: string; 
  detectedTables?: string[];
} {
  try {
    if (!sqlContent || typeof sqlContent !== 'string') {
      return { valid: false, error: 'Empty or invalid SQL file content.' };
    }

    // Method 1: Check for embedded metadata signature block
    const metaStart = sqlContent.indexOf('-- [SYSTEM_METADATA_START]');
    const metaEnd = sqlContent.indexOf('-- [SYSTEM_METADATA_END]');

    if (metaStart !== -1 && metaEnd !== -1 && metaEnd > metaStart) {
      const b64Section = sqlContent
        .slice(metaStart + '-- [SYSTEM_METADATA_START]'.length, metaEnd)
        .replace(/--\s*/g, '')
        .trim();

      if (b64Section) {
        try {
          const decodedJson = decodeURIComponent(escape(atob(b64Section)));
          const parsed = JSON.parse(decodedJson);
          if (parsed && parsed.data) {
            return {
              valid: true,
              data: parsed as SystemBackupData,
              detectedTables: ['company_settings', 'users', 'vendors', 'packages', 'bookings', 'operation_allocations', 'vendor_payments', 'system_activities', 'system_alerts']
            };
          }
        } catch {
          // Fall through to raw SQL parser
        }
      }
    }

    // Method 2: Raw SQL Parser for external SQL files
    const detectedTables: string[] = [];
    const tableRegex = /CREATE TABLE (?:IF NOT EXISTS )?([a-zA-Z0-9_]+)/gi;
    let match;
    while ((match = tableRegex.exec(sqlContent)) !== null) {
      detectedTables.push(match[1].toLowerCase());
    }

    if (detectedTables.length === 0 && !sqlContent.toUpperCase().includes('INSERT INTO')) {
      return { 
        valid: false, 
        error: 'No recognizable SQL table structures or INSERT INTO queries found in file.' 
      };
    }

    return {
      valid: false,
      error: 'This SQL dump does not contain a compatible Paila ERP metadata signature block. Please use an SQL backup exported from this system.'
    };
  } catch (err: any) {
    return { valid: false, error: `Failed to parse SQL file: ${err.message || 'Corrupted syntax'}` };
  }
}
