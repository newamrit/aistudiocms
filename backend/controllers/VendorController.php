<?php
declare(strict_types=1);

namespace Paila\Controllers;

use Paila\Config\Database;
use Paila\Middleware\AuthMiddleware;
use Paila\Middleware\SecurityHeaders;
use PDO;

class VendorController {
    /**
     * GET /api/v1/vendors
     * Returns vendors with dynamic financial aggregate calculations:
     * total_allocated, total_paid, balance_due.
     */
    public function index(): void {
        AuthMiddleware::authenticate();
        $pdo = Database::getConnection();

        $sql = 'SELECT v.*,
                       COALESCE(SUM(oa.agreed_cost), 0.00) AS total_allocated,
                       COALESCE(SUM(oa.amount_paid), 0.00) AS total_paid,
                       (COALESCE(SUM(oa.agreed_cost), 0.00) - COALESCE(SUM(oa.amount_paid), 0.00)) AS balance_due,
                       COUNT(oa.id) AS allocation_count
                FROM vendors v
                LEFT JOIN operation_allocations oa ON v.id = oa.vendor_id
                WHERE v.is_active = 1
                GROUP BY v.id
                ORDER BY v.name ASC';

        $stmt = $pdo->query($sql);
        $vendors = $stmt->fetchAll();

        echo json_encode(['data' => $vendors, 'count' => count($vendors)]);
    }

    /**
     * GET /api/v1/allocations
     * Returns operational allocations for Accounts Payable.
     */
    public function getAllocations(): void {
        AuthMiddleware::authenticate();
        $pdo = Database::getConnection();

        $status = $_GET['payment_status'] ?? null;
        $bookingId = $_GET['booking_id'] ?? null;

        $sql = 'SELECT oa.*,
                       (oa.agreed_cost - oa.amount_paid) AS balance_remaining,
                       b.start_date, b.end_date, b.client_name, b.status AS booking_status,
                       v.contact_person, v.phone AS vendor_phone, v.pan_vat_number, v.bank_account_details
                FROM operation_allocations oa
                JOIN bookings b ON oa.booking_id = b.id
                JOIN vendors v ON oa.vendor_id = v.id
                WHERE 1=1';
        $params = [];

        if ($status && in_array($status, ['PENDING', 'PARTIALLY_PAID', 'SETTLED'], true)) {
            $sql .= ' AND oa.payment_status = :status';
            $params[':status'] = $status;
        }

        if ($bookingId) {
            $sql .= ' AND oa.booking_id = :bid';
            $params[':bid'] = (int)$bookingId;
        }

        $sql .= ' ORDER BY oa.service_date DESC, oa.id DESC';

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $allocations = $stmt->fetchAll();

        echo json_encode(['data' => $allocations, 'count' => count($allocations)]);
    }

    /**
     * POST /api/v1/vendor-payments
     * Records an accounts payable payment with atomic balance validation (prevents overpayment).
     */
    public function recordPayment(): void {
        $user = AuthMiddleware::requireRole(['SUPER_ADMIN', 'OPERATIONS']);
        $input = SecurityHeaders::getJsonInput();

        $allocationId = (int)($input['operationAllocationId'] ?? $input['operation_allocation_id'] ?? $input['allocationId'] ?? $input['allocation_id'] ?? 0);
        $amount = (float)($input['amount'] ?? 0.0);
        $paymentMode = $input['paymentMode'] ?? $input['payment_mode'] ?? 'BANK_TRANSFER';
        $referenceNumber = SecurityHeaders::sanitizeString($input['referenceNumber'] ?? $input['reference_number'] ?? '');

        if ($allocationId <= 0 || $amount <= 0) {
            http_response_code(422);
            echo json_encode(['error' => 'Validation error: Valid operationAllocationId and positive amount are required']);
            return;
        }

        $pdo = Database::getConnection();

        Database::transaction(function (PDO $pdo) use ($allocationId, $amount, $paymentMode, $referenceNumber, $user) {
            // Lock allocation record for financial update
            $stmt = $pdo->prepare('SELECT id, agreed_cost, amount_paid, payment_status, vendor_id, vendor_name 
                                   FROM operation_allocations 
                                   WHERE id = :id FOR UPDATE');
            $stmt->execute([':id' => $allocationId]);
            $allocation = $stmt->fetch();

            if (!$allocation) {
                http_response_code(404);
                echo json_encode(['error' => 'Operational allocation record not found']);
                return;
            }

            $agreedCost = (float)$allocation['agreed_cost'];
            $currentPaid = (float)$allocation['amount_paid'];
            $maxAllowed = $agreedCost - $currentPaid;

            // Security check: Overpayment prevention
            if ($amount > ($maxAllowed + 0.01)) { // Allow minor rounding tolerance
                http_response_code(400);
                echo json_encode([
                    'error' => "Overpayment rejected. Maximum remaining payable balance is NPR " . number_format($maxAllowed, 2),
                    'remaining_balance' => $maxAllowed,
                    'attempted_amount' => $amount
                ]);
                return;
            }

            $newPaid = $currentPaid + $amount;
            $newStatus = ($newPaid >= ($agreedCost - 0.01)) ? 'SETTLED' : 'PARTIALLY_PAID';

            // Insert Payment
            $payStmt = $pdo->prepare('INSERT INTO vendor_payments (
                operation_allocation_id, amount, payment_mode, reference_number,
                paid_at, recorded_by, recorded_by_name
            ) VALUES (
                :alloc_id, :amt, :mode, :ref, NOW(), :uid, :uname
            )');
            $payStmt->execute([
                ':alloc_id' => $allocationId,
                ':amt' => $amount,
                ':mode' => $paymentMode,
                ':ref' => $referenceNumber,
                ':uid' => $user['id'],
                ':uname' => $user['name']
            ]);

            $paymentId = (int)$pdo->lastInsertId();

            // Update Allocation
            $upStmt = $pdo->prepare('UPDATE operation_allocations 
                                    SET amount_paid = :paid, payment_status = :status 
                                    WHERE id = :id');
            $upStmt->execute([
                ':paid' => $newPaid,
                ':status' => $newStatus,
                ':id' => $allocationId
            ]);

            echo json_encode([
                'success' => true,
                'paymentId' => $paymentId,
                'newPaidAmount' => $newPaid,
                'newPaymentStatus' => $newStatus,
                'remainingBalance' => max(0.0, $agreedCost - $newPaid),
                'message' => "Payment of NPR " . number_format($amount, 2) . " successfully recorded."
            ]);
        });
    }

    /**
     * POST /api/v1/vendors
     */
    public function store(): void {
        AuthMiddleware::requireRole(['SUPER_ADMIN', 'OPERATIONS']);
        $input = SecurityHeaders::getJsonInput();

        if (empty($input['name']) || empty($input['category'])) {
            http_response_code(422);
            echo json_encode(['error' => 'Vendor name and category are required']);
            return;
        }

        $pdo = Database::getConnection();
        $stmt = $pdo->prepare('INSERT INTO vendors (
            name, category, location, contact_person, phone, pan_vat_number, bank_account_details, vehicle_type, plate_number, is_active
        ) VALUES (
            :name, :category, :location, :contact_person, :phone, :pan_vat, :bank_details, :vehicle_type, :plate_number, 1
        )');

        $stmt->execute([
            ':name' => SecurityHeaders::sanitizeString($input['name']),
            ':category' => $input['category'],
            ':location' => SecurityHeaders::sanitizeString($input['location'] ?? ''),
            ':contact_person' => SecurityHeaders::sanitizeString($input['contactPerson'] ?? ''),
            ':phone' => SecurityHeaders::sanitizeString($input['phone'] ?? ''),
            ':pan_vat' => SecurityHeaders::sanitizeString($input['panVatNumber'] ?? ''),
            ':bank_details' => SecurityHeaders::sanitizeString($input['bankAccountDetails'] ?? ''),
            ':vehicle_type' => !empty($input['vehicleType']) ? SecurityHeaders::sanitizeString($input['vehicleType']) : null,
            ':plate_number' => !empty($input['plateNumber']) ? SecurityHeaders::sanitizeString($input['plateNumber']) : null,
        ]);

        $id = (int)$pdo->lastInsertId();
        echo json_encode(['success' => true, 'id' => $id, 'message' => 'Vendor registered successfully']);
    }

    /**
     * POST /api/v1/allocations
     */
    public function storeAllocation(): void {
        AuthMiddleware::requireRole(['SUPER_ADMIN', 'OPERATIONS']);
        $input = SecurityHeaders::getJsonInput();

        if (empty($input['bookingId']) || empty($input['vendorId']) || empty($input['serviceType'])) {
            http_response_code(422);
            echo json_encode(['error' => 'Booking, Vendor, and Service Type are required']);
            return;
        }

        $pdo = Database::getConnection();

        // Get booking and vendor info
        $bStmt = $pdo->prepare('SELECT booking_code FROM bookings WHERE id = :bid LIMIT 1');
        $bStmt->execute([':bid' => (int)$input['bookingId']]);
        $booking = $bStmt->fetch();

        $vStmt = $pdo->prepare('SELECT name FROM vendors WHERE id = :vid LIMIT 1');
        $vStmt->execute([':vid' => (int)$input['vendorId']]);
        $vendor = $vStmt->fetch();

        if (!$booking || !$vendor) {
            http_response_code(404);
            echo json_encode(['error' => 'Invalid booking or vendor ID']);
            return;
        }

        $stmt = $pdo->prepare('INSERT INTO operation_allocations (
            booking_id, booking_code, vendor_id, vendor_name, service_type,
            service_date, agreed_cost, amount_paid, payment_status, special_notes
        ) VALUES (
            :bid, :bcode, :vid, :vname, :stype, :sdate, :agreed, 0.00, "PENDING", :notes
        )');

        $stmt->execute([
            ':bid' => (int)$input['bookingId'],
            ':bcode' => $booking['booking_code'],
            ':vid' => (int)$input['vendorId'],
            ':vname' => $vendor['name'],
            ':stype' => $input['serviceType'],
            ':sdate' => $input['serviceDate'] ?? date('Y-m-d'),
            ':agreed' => (float)($input['agreedCost'] ?? 0.0),
            ':notes' => SecurityHeaders::sanitizeString($input['notes'] ?? $input['serviceDetails'] ?? ''),
        ]);

        $id = (int)$pdo->lastInsertId();
        echo json_encode(['success' => true, 'id' => $id, 'message' => 'Allocation created successfully']);
    }

    /**
     * PUT/PATCH /api/v1/vendors/{id}
     */
    public function update(int $id): void {
        AuthMiddleware::requireRole(['SUPER_ADMIN', 'OPERATIONS']);
        $input = SecurityHeaders::getJsonInput();
        $pdo = Database::getConnection();

        $stmt = $pdo->prepare('SELECT id FROM vendors WHERE id = :id LIMIT 1');
        $stmt->execute([':id' => $id]);
        if (!$stmt->fetch()) {
            http_response_code(404);
            echo json_encode(['error' => 'Vendor not found']);
            return;
        }

        $fields = [];
        $params = [':id' => $id];

        if (isset($input['name'])) {
            $fields[] = 'name = :name';
            $params[':name'] = SecurityHeaders::sanitizeString($input['name']);
        }
        if (isset($input['category'])) {
            $fields[] = 'category = :category';
            $params[':category'] = $input['category'];
        }
        if (isset($input['location'])) {
            $fields[] = 'location = :location';
            $params[':location'] = SecurityHeaders::sanitizeString($input['location']);
        }
        if (isset($input['contactPerson'])) {
            $fields[] = 'contact_person = :contact_person';
            $params[':contact_person'] = SecurityHeaders::sanitizeString($input['contactPerson']);
        }
        if (isset($input['phone'])) {
            $fields[] = 'phone = :phone';
            $params[':phone'] = SecurityHeaders::sanitizeString($input['phone']);
        }
        if (isset($input['panVatNumber'])) {
            $fields[] = 'pan_vat_number = :pan_vat';
            $params[':pan_vat'] = SecurityHeaders::sanitizeString($input['panVatNumber']);
        }
        if (isset($input['bankAccountDetails'])) {
            $fields[] = 'bank_account_details = :bank_details';
            $params[':bank_details'] = SecurityHeaders::sanitizeString($input['bankAccountDetails']);
        }
        if (array_key_exists('vehicleType', $input)) {
            $fields[] = 'vehicle_type = :vehicle_type';
            $params[':vehicle_type'] = !empty($input['vehicleType']) ? SecurityHeaders::sanitizeString($input['vehicleType']) : null;
        }
        if (array_key_exists('plateNumber', $input)) {
            $fields[] = 'plate_number = :plate_number';
            $params[':plate_number'] = !empty($input['plateNumber']) ? SecurityHeaders::sanitizeString($input['plateNumber']) : null;
        }
        if (isset($input['isActive'])) {
            $fields[] = 'is_active = :is_active';
            $params[':is_active'] = ((bool)$input['isActive']) ? 1 : 0;
        }

        if (!empty($fields)) {
            $sql = 'UPDATE vendors SET ' . implode(', ', $fields) . ' WHERE id = :id';
            $pdo->prepare($sql)->execute($params);
        }

        echo json_encode(['success' => true, 'message' => 'Vendor updated successfully']);
    }

    /**
     * DELETE /api/v1/vendors/{id}
     */
    public function delete(int $id): void {
        AuthMiddleware::requireRole(['SUPER_ADMIN', 'OPERATIONS']);
        $pdo = Database::getConnection();

        // Check if there are linked operational allocations
        $stmt = $pdo->prepare('SELECT COUNT(*) FROM operation_allocations WHERE vendor_id = :id');
        $stmt->execute([':id' => $id]);
        $hasAllocations = (int)$stmt->fetchColumn() > 0;

        if ($hasAllocations) {
            // Soft delete
            $pdo->prepare('UPDATE vendors SET is_active = 0 WHERE id = :id')->execute([':id' => $id]);
            echo json_encode(['success' => true, 'message' => 'Vendor has historical allocations; marked as inactive.']);
            return;
        }

        $pdo->prepare('DELETE FROM vendors WHERE id = :id')->execute([':id' => $id]);
        echo json_encode(['success' => true, 'message' => 'Vendor deleted successfully']);
    }

    /**
     * PUT/PATCH /api/v1/allocations/{id}
     */
    public function updateAllocation(int $id): void {
        AuthMiddleware::requireRole(['SUPER_ADMIN', 'OPERATIONS']);
        $input = SecurityHeaders::getJsonInput();
        $pdo = Database::getConnection();

        $stmt = $pdo->prepare('SELECT * FROM operation_allocations WHERE id = :id LIMIT 1');
        $stmt->execute([':id' => $id]);
        $existing = $stmt->fetch();
        if (!$existing) {
            http_response_code(404);
            echo json_encode(['error' => 'Allocation not found']);
            return;
        }

        $agreedCost = isset($input['agreedCost']) ? (float)$input['agreedCost'] : (float)$existing['agreed_cost'];
        $amountPaid = isset($input['amountPaid']) ? (float)$input['amountPaid'] : (float)$existing['amount_paid'];

        $paymentStatus = $existing['payment_status'];
        if ($amountPaid >= ($agreedCost - 0.01) && $agreedCost > 0) {
            $paymentStatus = 'SETTLED';
        } elseif ($amountPaid > 0) {
            $paymentStatus = 'PARTIALLY_PAID';
        } else {
            $paymentStatus = 'PENDING';
        }

        $fields = [
            'agreed_cost = :agreed_cost',
            'amount_paid = :amount_paid',
            'payment_status = :payment_status'
        ];
        $params = [
            ':id' => $id,
            ':agreed_cost' => $agreedCost,
            ':amount_paid' => $amountPaid,
            ':payment_status' => $paymentStatus
        ];

        if (isset($input['serviceDate'])) {
            $fields[] = 'service_date = :service_date';
            $params[':service_date'] = $input['serviceDate'];
        }
        if (isset($input['specialNotes']) || isset($input['notes'])) {
            $fields[] = 'special_notes = :special_notes';
            $params[':special_notes'] = SecurityHeaders::sanitizeString($input['specialNotes'] ?? $input['notes'] ?? '');
        }
        if (isset($input['serviceType'])) {
            $fields[] = 'service_type = :service_type';
            $params[':service_type'] = $input['serviceType'];
        }

        $sql = 'UPDATE operation_allocations SET ' . implode(', ', $fields) . ' WHERE id = :id';
        $pdo->prepare($sql)->execute($params);

        echo json_encode([
            'success' => true,
            'id' => $id,
            'agreedCost' => $agreedCost,
            'amountPaid' => $amountPaid,
            'paymentStatus' => $paymentStatus,
            'message' => 'Allocation updated successfully'
        ]);
    }

    /**
     * DELETE /api/v1/allocations/{id}
     */
    public function deleteAllocation(int $id): void {
        AuthMiddleware::requireRole(['SUPER_ADMIN', 'OPERATIONS']);
        $pdo = Database::getConnection();

        $stmt = $pdo->prepare('SELECT amount_paid FROM operation_allocations WHERE id = :id LIMIT 1');
        $stmt->execute([':id' => $id]);
        $existing = $stmt->fetch();
        if (!$existing) {
            http_response_code(404);
            echo json_encode(['error' => 'Allocation not found']);
            return;
        }

        if ((float)$existing['amount_paid'] > 0) {
            http_response_code(400);
            echo json_encode(['error' => 'Cannot delete allocation with recorded vendor payments']);
            return;
        }

        $pdo->prepare('DELETE FROM operation_allocations WHERE id = :id')->execute([':id' => $id]);
        echo json_encode(['success' => true, 'message' => 'Allocation deleted successfully']);
    }

    /**
     * GET /api/v1/vendor-payments
     */
    public function getPayments(): void {
        AuthMiddleware::authenticate();
        $pdo = Database::getConnection();

        $sql = 'SELECT vp.*, 
                       oa.booking_id, oa.booking_code, oa.service_type, oa.vendor_id, oa.vendor_name
                FROM vendor_payments vp
                LEFT JOIN operation_allocations oa ON vp.operation_allocation_id = oa.id
                ORDER BY vp.paid_at DESC, vp.id DESC';

        $stmt = $pdo->query($sql);
        $payments = $stmt->fetchAll();

        echo json_encode(['data' => $payments, 'count' => count($payments)]);
    }
}
