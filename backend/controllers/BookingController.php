<?php
declare(strict_types=1);

namespace Paila\Controllers;

use Paila\Config\Database;
use Paila\Middleware\AuthMiddleware;
use Paila\Middleware\SecurityHeaders;
use PDO;

class BookingController {
    /**
     * GET /api/v1/bookings
     * Returns 100% database-driven bookings with dynamically joined itinerary and financials.
     */
    public function index(): void {
        AuthMiddleware::authenticate();
        $pdo = Database::getConnection();

        $status = $_GET['status'] ?? null;
        $search = $_GET['search'] ?? null;

        $sql = 'SELECT b.*, 
                       (b.total_agreed_amount - b.advance_received) AS remaining_balance,
                       COALESCE((SELECT SUM(agreed_cost) FROM operation_allocations WHERE booking_id = b.id), 0.00) AS total_operational_cost,
                       (b.total_agreed_amount - COALESCE((SELECT SUM(agreed_cost) FROM operation_allocations WHERE booking_id = b.id), 0.00)) AS estimated_gross_profit
                FROM bookings b
                WHERE 1=1';
        $params = [];

        if ($status && in_array($status, ['PROPOSED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'], true)) {
            $sql .= ' AND b.status = :status';
            $params[':status'] = $status;
        }

        if ($search) {
            $sql .= ' AND (b.booking_code LIKE :search OR b.client_name LIKE :search OR b.client_email LIKE :search)';
            $params[':search'] = '%' . SecurityHeaders::sanitizeString($search) . '%';
        }

        $sql .= ' ORDER BY b.id DESC';

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $bookings = $stmt->fetchAll();

        // Attach itinerary days
        foreach ($bookings as &$booking) {
            $dayStmt = $pdo->prepare('SELECT * FROM itinerary_days WHERE booking_id = :bid OR (package_id = :pid AND booking_id IS NULL) ORDER BY day_number ASC');
            $dayStmt->execute([':bid' => $booking['id'], ':pid' => $booking['package_id'] ?? 0]);
            $booking['itineraryDays'] = $dayStmt->fetchAll();

            // Status history
            $histStmt = $pdo->prepare('SELECT * FROM booking_status_history WHERE booking_id = :bid ORDER BY changed_at ASC');
            $histStmt->execute([':bid' => $booking['id']]);
            $booking['statusHistory'] = $histStmt->fetchAll();
        }

        echo json_encode(['data' => $bookings, 'count' => count($bookings)]);
    }

    /**
     * GET /api/v1/bookings/{id}
     */
    public function show(int $id): void {
        AuthMiddleware::authenticate();
        $pdo = Database::getConnection();

        $stmt = $pdo->prepare('SELECT b.*, 
                                      (b.total_agreed_amount - b.advance_received) AS remaining_balance
                               FROM bookings b WHERE b.id = :id LIMIT 1');
        $stmt->execute([':id' => $id]);
        $booking = $stmt->fetch();

        if (!$booking) {
            http_response_code(404);
            echo json_encode(['error' => 'Booking not found in database']);
            return;
        }

        // Fetch Itinerary
        $dayStmt = $pdo->prepare('SELECT * FROM itinerary_days WHERE booking_id = :bid OR (package_id = :pid AND booking_id IS NULL) ORDER BY day_number ASC');
        $dayStmt->execute([':bid' => $booking['id'], ':pid' => $booking['package_id'] ?? 0]);
        $booking['itineraryDays'] = $dayStmt->fetchAll();

        // Fetch Allocations
        $allocStmt = $pdo->prepare('SELECT oa.*, (oa.agreed_cost - oa.amount_paid) AS balance_due 
                                   FROM operation_allocations oa 
                                   WHERE oa.booking_id = :bid ORDER BY oa.service_date ASC');
        $allocStmt->execute([':bid' => $booking['id']]);
        $booking['allocations'] = $allocStmt->fetchAll();

        // Status history
        $histStmt = $pdo->prepare('SELECT * FROM booking_status_history WHERE booking_id = :bid ORDER BY changed_at ASC');
        $histStmt->execute([':bid' => $booking['id']]);
        $booking['statusHistory'] = $histStmt->fetchAll();

        echo json_encode(['data' => $booking]);
    }

    /**
     * POST /api/v1/bookings
     * Stores a new booking with database-calculated totals.
     */
    public function store(): void {
        $user = AuthMiddleware::requireRole(['SUPER_ADMIN', 'SALES', 'OPERATIONS']);
        $input = SecurityHeaders::getJsonInput();

        $clientNameRaw = $input['clientName'] ?? $input['client_name'] ?? '';
        // Server-Side Validations: clientName is the essential field
        if (empty(trim((string)$clientNameRaw))) {
            http_response_code(422);
            echo json_encode(['error' => 'Validation error: clientName is required']);
            return;
        }

        $paxCount = max(1, (int)($input['paxCount'] ?? $input['pax_count'] ?? 1));
        $rawPackageId = $input['packageId'] ?? $input['package_id'] ?? null;
        $packageId = !empty($rawPackageId) ? (int)$rawPackageId : null;

        // Fallbacks for optional or client-friendly fields
        $clientName = SecurityHeaders::sanitizeString($clientNameRaw);
        $clientPhone = SecurityHeaders::sanitizeString($input['clientPhone'] ?? $input['client_phone'] ?? 'N/A');
        if (empty($clientPhone)) $clientPhone = 'N/A';
        
        $rawEmail = filter_var($input['clientEmail'] ?? $input['client_email'] ?? '', FILTER_SANITIZE_EMAIL);
        $clientEmail = !empty($rawEmail) ? $rawEmail : 'guest-' . time() . '@pailanepal.com.np';

        $startDate = !empty($input['startDate']) ? $input['startDate'] : (!empty($input['start_date']) ? $input['start_date'] : date('Y-m-d'));
        $endDate = !empty($input['endDate']) ? $input['endDate'] : (!empty($input['end_date']) ? $input['end_date'] : date('Y-m-d', strtotime('+3 days')));

        $validClientTypes = ['INSTITUTIONAL', 'CORPORATE', 'INDIVIDUAL', 'FOREIGN_TREK'];
        $rawClientType = $input['clientType'] ?? $input['client_type'] ?? 'INDIVIDUAL';
        $clientType = in_array($rawClientType, $validClientTypes, true) ? $rawClientType : 'INDIVIDUAL';

        $validStatuses = ['PROPOSED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
        $rawStatus = $input['status'] ?? 'CONFIRMED';
        $status = in_array($rawStatus, $validStatuses, true) ? $rawStatus : 'CONFIRMED';

        $pdo = Database::getConnection();

        Database::transaction(function (PDO $pdo) use ($input, $user, $paxCount, $packageId, $clientName, $clientPhone, $clientEmail, $startDate, $endDate, $clientType, $status) {
            // Verify package existence if passed
            $packageName = null;
            $standardPrice = 0.00;
            $safePackageId = null;

            if ($packageId) {
                $pkgStmt = $pdo->prepare('SELECT id, title, standard_price FROM packages WHERE id = :id LIMIT 1');
                $pkgStmt->execute([':id' => $packageId]);
                $pkg = $pkgStmt->fetch();
                if ($pkg) {
                    $safePackageId = (int)$pkg['id'];
                    $packageName = $pkg['title'];
                    $standardPrice = (float)$pkg['standard_price'];
                }
            }

            if (empty($packageName) && !empty($input['packageName'])) {
                $packageName = SecurityHeaders::sanitizeString($input['packageName']);
            } elseif (empty($packageName) && !empty($input['package_name'])) {
                $packageName = SecurityHeaders::sanitizeString($input['package_name']);
            }

            // Total agreed amount computed server-side if not explicitly negotiated
            $rawAgreed = $input['totalAgreedAmount'] ?? $input['total_agreed_amount'] ?? null;
            $totalAgreedAmount = ($rawAgreed !== null && (float)$rawAgreed > 0)
                ? (float)$rawAgreed
                : ($standardPrice * $paxCount);

            $rawAdvance = $input['advanceReceived'] ?? $input['advance_received'] ?? 0.0;
            $advanceReceived = max(0.0, (float)$rawAdvance);

            // Verify user ID for created_by
            $userId = (int)($user['id'] ?? 1);
            $uCheck = $pdo->prepare('SELECT id FROM users WHERE id = :uid LIMIT 1');
            $uCheck->execute([':uid' => $userId]);
            if (!$uCheck->fetch()) {
                $firstUser = $pdo->query('SELECT id FROM users ORDER BY id ASC LIMIT 1')->fetch();
                $userId = $firstUser ? (int)$firstUser['id'] : 1;
            }

            // Verify assigned tour operator if passed
            $assignedOpId = !empty($input['assignedTourOperatorId']) ? (int)$input['assignedTourOperatorId'] : (!empty($input['assigned_tour_operator_id']) ? (int)$input['assigned_tour_operator_id'] : null);
            $assignedOpName = $input['assignedTourOperatorName'] ?? $input['assigned_tour_operator_name'] ?? null;
            if ($assignedOpId) {
                $opCheck = $pdo->prepare('SELECT id, name FROM users WHERE id = :oid LIMIT 1');
                $opCheck->execute([':oid' => $assignedOpId]);
                $op = $opCheck->fetch();
                if ($op) {
                    $assignedOpName = $op['name'];
                } else {
                    $assignedOpId = null;
                    $assignedOpName = null;
                }
            }

            // Generate Booking Code: PNH-{YEAR}-{Padded Next ID}
            $seqStmt = $pdo->query('SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM bookings');
            $nextId = (int)$seqStmt->fetch()['next_id'];
            $bookingCode = sprintf('PNH-%s-%03d', date('Y'), $nextId);

            $stmt = $pdo->prepare('INSERT INTO bookings (
                booking_code, client_type, client_name, client_email, client_phone,
                package_id, package_name, status, start_date, end_date, pax_count,
                total_agreed_amount, advance_received, assigned_tour_operator_id,
                assigned_tour_operator_name, notes, created_by, created_by_name
            ) VALUES (
                :code, :client_type, :client_name, :client_email, :client_phone,
                :package_id, :package_name, :status, :start_date, :end_date, :pax_count,
                :total_agreed, :advance_received, :assigned_op_id, :assigned_op_name,
                :notes, :created_by, :created_by_name
            )');

            $notes = SecurityHeaders::sanitizeString($input['notes'] ?? '');

            $stmt->execute([
                ':code' => $bookingCode,
                ':client_type' => $clientType,
                ':client_name' => $clientName,
                ':client_email' => $clientEmail,
                ':client_phone' => $clientPhone,
                ':package_id' => $safePackageId,
                ':package_name' => $packageName,
                ':status' => $status,
                ':start_date' => $startDate,
                ':end_date' => $endDate,
                ':pax_count' => $paxCount,
                ':total_agreed' => $totalAgreedAmount,
                ':advance_received' => $advanceReceived,
                ':assigned_op_id' => $assignedOpId,
                ':assigned_op_name' => $assignedOpName,
                ':notes' => $notes,
                ':created_by' => $userId,
                ':created_by_name' => $user['name'] ?? 'Staff'
            ]);

            $bookingId = (int)$pdo->lastInsertId();

            // Insert custom itinerary days if provided
            $itineraryDays = $input['itineraryDays'] ?? $input['itinerary_days'] ?? [];
            if (!empty($itineraryDays) && is_array($itineraryDays)) {
                $dayStmt = $pdo->prepare('INSERT INTO itinerary_days (
                    booking_id, day_number, title, description, overnight_location, meals_included
                ) VALUES (
                    :bid, :day_num, :title, :desc, :location, :meals
                )');

                $dayIdx = 1;
                foreach ($itineraryDays as $day) {
                    if (empty($day['title']) && empty($day['description'])) continue;
                    $dayStmt->execute([
                        ':bid' => $bookingId,
                        ':day_num' => (int)($day['dayNumber'] ?? $day['day_number'] ?? $dayIdx),
                        ':title' => SecurityHeaders::sanitizeString($day['title'] ?? "Day {$dayIdx}"),
                        ':desc' => SecurityHeaders::sanitizeString($day['description'] ?? ''),
                        ':location' => SecurityHeaders::sanitizeString($day['overnightLocation'] ?? $day['overnight_location'] ?? ''),
                        ':meals' => SecurityHeaders::sanitizeString($day['mealsIncluded'] ?? $day['meals_included'] ?? 'B, L, D')
                    ]);
                    $dayIdx++;
                }
            }

            // Insert Initial Status History
            $histStmt = $pdo->prepare('INSERT INTO booking_status_history (
                booking_id, booking_code, from_status, to_status, changed_by_id,
                changed_by_name, changed_by_role, reason, notes, source
            ) VALUES (
                :bid, :code, NULL, :to_status, :uid, :uname, :urole, :reason, :notes, :source
            )');
            $histStmt->execute([
                ':bid' => $bookingId,
                ':code' => $bookingCode,
                ':to_status' => $status,
                ':uid' => $userId,
                ':uname' => $user['name'] ?? 'Staff',
                ':urole' => $user['role'] ?? 'SALES',
                ':reason' => 'Booking created in TravelCMS system.',
                ':notes' => "Pax count: {$paxCount}. Agreed amount: NPR " . number_format($totalAgreedAmount, 2),
                ':source' => 'ADMIN_PORTAL'
            ]);

            http_response_code(201);
            echo json_encode([
                'success' => true,
                'id' => $bookingId,
                'bookingCode' => $bookingCode,
                'message' => "Booking {$bookingCode} successfully registered in database."
            ]);
        });
    }

    /**
     * PATCH /api/v1/bookings/{id}/status
     * Transitions status and updates the immutable audit trail.
     */
    public function updateStatus(int $id): void {
        $user = AuthMiddleware::authenticate();
        $input = SecurityHeaders::getJsonInput();

        $newStatus = $input['status'] ?? '';
        $validStatuses = ['PROPOSED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
        if (!in_array($newStatus, $validStatuses, true)) {
            http_response_code(422);
            echo json_encode(['error' => 'Invalid status value']);
            return;
        }

        $pdo = Database::getConnection();

        Database::transaction(function (PDO $pdo) use ($id, $newStatus, $input, $user) {
            $checkStmt = $pdo->prepare('SELECT id, booking_code, status FROM bookings WHERE id = :id FOR UPDATE');
            $checkStmt->execute([':id' => $id]);
            $current = $checkStmt->fetch();

            if (!$current) {
                http_response_code(404);
                echo json_encode(['error' => 'Booking record not found']);
                return;
            }

            $oldStatus = $current['status'];
            if ($oldStatus === $newStatus) {
                echo json_encode(['success' => true, 'message' => 'Status unchanged']);
                return;
            }

            // Update status
            $upStmt = $pdo->prepare('UPDATE bookings SET status = :status WHERE id = :id');
            $upStmt->execute([':status' => $newStatus, ':id' => $id]);

            // Append to audit trail
            $histStmt = $pdo->prepare('INSERT INTO booking_status_history (
                booking_id, booking_code, from_status, to_status, changed_by_id,
                changed_by_name, changed_by_role, reason, notes, source
            ) VALUES (
                :bid, :code, :from_status, :to_status, :uid, :uname, :urole, :reason, :notes, :source
            )');
            $histStmt->execute([
                ':bid' => $id,
                ':code' => $current['booking_code'],
                ':from_status' => $oldStatus,
                ':to_status' => $newStatus,
                ':uid' => $user['id'],
                ':uname' => $user['name'],
                ':urole' => $user['role'],
                ':reason' => SecurityHeaders::sanitizeString($input['reason'] ?? "Status updated from {$oldStatus} to {$newStatus}"),
                ':notes' => SecurityHeaders::sanitizeString($input['notes'] ?? ''),
                ':source' => $user['role'] === 'TOUR_OPERATOR' ? 'FIELD_APP' : 'ADMIN_PORTAL'
            ]);

            // If booking moves to CONFIRMED, ensure default operational allocations exist
            if ($newStatus === 'CONFIRMED') {
                $checkAlloc = $pdo->prepare('SELECT COUNT(*) as cnt FROM operation_allocations WHERE booking_id = :bid');
                $checkAlloc->execute([':bid' => $id]);
                $allocCount = (int)$checkAlloc->fetch()['cnt'];

                if ($allocCount === 0) {
                    $bStmt = $pdo->prepare('SELECT total_agreed_amount, start_date FROM bookings WHERE id = :id');
                    $bStmt->execute([':id' => $id]);
                    $bRow = $bStmt->fetch();
                    $totalAgreed = (float)($bRow['total_agreed_amount'] ?? 100000);
                    $serviceDate = $bRow['start_date'] ?? date('Y-m-d');

                    $hotelVendor = $pdo->query("SELECT id, name FROM vendors WHERE category = 'HOTEL' AND is_active = 1 LIMIT 1")->fetch();
                    $vehicleVendor = $pdo->query("SELECT id, name FROM vendors WHERE category = 'VEHICLE' AND is_active = 1 LIMIT 1")->fetch();

                    $insertAlloc = $pdo->prepare('INSERT INTO operation_allocations (
                        booking_id, booking_code, vendor_id, vendor_name, service_type, service_date, agreed_cost, amount_paid, payment_status, field_updated_by_operator, special_notes
                    ) VALUES (:bid, :bcode, :vid, :vname, :stype, :sdate, :cost, 0, "PENDING", 0, :notes)');

                    if ($hotelVendor) {
                        $insertAlloc->execute([
                            ':bid' => $id,
                            ':bcode' => $current['booking_code'],
                            ':vid' => $hotelVendor['id'],
                            ':vname' => $hotelVendor['name'],
                            ':stype' => 'HOTEL',
                            ':sdate' => $serviceDate,
                            ':cost' => round($totalAgreed * 0.35, 2),
                            ':notes' => 'Auto-allocated on booking confirmation'
                        ]);
                    }

                    if ($vehicleVendor) {
                        $insertAlloc->execute([
                            ':bid' => $id,
                            ':bcode' => $current['booking_code'],
                            ':vid' => $vehicleVendor['id'],
                            ':vname' => $vehicleVendor['name'],
                            ':stype' => 'VEHICLE',
                            ':sdate' => $serviceDate,
                            ':cost' => round($totalAgreed * 0.20, 2),
                            ':notes' => 'Transport allocation auto-generated'
                        ]);
                    }
                }
            }

            echo json_encode(['success' => true, 'bookingCode' => $current['booking_code'], 'status' => $newStatus]);
        });
    }

    /**
     * PUT/POST /api/v1/bookings/{id}
     */
    public function update(int $id): void {
        AuthMiddleware::authenticate();
        $input = SecurityHeaders::getJsonInput();
        $pdo = Database::getConnection();

        $stmt = $pdo->prepare('SELECT id FROM bookings WHERE id = :id LIMIT 1');
        $stmt->execute([':id' => $id]);
        if (!$stmt->fetch()) {
            http_response_code(404);
            echo json_encode(['error' => 'Booking not found']);
            return;
        }

        $fields = [];
        $params = [':id' => $id];

        if (isset($input['status'])) {
            $validStatuses = ['PROPOSED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
            if (in_array($input['status'], $validStatuses, true)) {
                $fields[] = 'status = :status';
                $params[':status'] = $input['status'];
            }
        }
        if (isset($input['packageId']) || isset($input['package_id'])) {
            $rawPkg = $input['packageId'] ?? $input['package_id'];
            $fields[] = 'package_id = :package_id';
            $params[':package_id'] = !empty($rawPkg) ? (int)$rawPkg : null;
        }
        if (isset($input['packageName']) || isset($input['package_name'])) {
            $fields[] = 'package_name = :package_name';
            $params[':package_name'] = SecurityHeaders::sanitizeString($input['packageName'] ?? $input['package_name']);
        }
        if (isset($input['clientName']) || isset($input['client_name'])) {
            $fields[] = 'client_name = :client_name';
            $params[':client_name'] = SecurityHeaders::sanitizeString($input['clientName'] ?? $input['client_name']);
        }
        if (isset($input['clientEmail']) || isset($input['client_email'])) {
            $fields[] = 'client_email = :client_email';
            $params[':client_email'] = filter_var($input['clientEmail'] ?? $input['client_email'], FILTER_SANITIZE_EMAIL);
        }
        if (isset($input['clientPhone']) || isset($input['client_phone'])) {
            $fields[] = 'client_phone = :client_phone';
            $params[':client_phone'] = SecurityHeaders::sanitizeString($input['clientPhone'] ?? $input['client_phone']);
        }
        if (isset($input['clientType']) || isset($input['client_type'])) {
            $fields[] = 'client_type = :client_type';
            $params[':client_type'] = $input['clientType'] ?? $input['client_type'];
        }
        if (isset($input['startDate']) || isset($input['start_date'])) {
            $fields[] = 'start_date = :start_date';
            $params[':start_date'] = $input['startDate'] ?? $input['start_date'];
        }
        if (isset($input['endDate']) || isset($input['end_date'])) {
            $fields[] = 'end_date = :end_date';
            $params[':end_date'] = $input['endDate'] ?? $input['end_date'];
        }
        if (isset($input['paxCount']) || isset($input['pax_count'])) {
            $fields[] = 'pax_count = :pax_count';
            $params[':pax_count'] = max(1, (int)($input['paxCount'] ?? $input['pax_count']));
        }
        if (isset($input['totalAgreedAmount']) || isset($input['total_agreed_amount'])) {
            $fields[] = 'total_agreed_amount = :total_agreed';
            $params[':total_agreed'] = (float)($input['totalAgreedAmount'] ?? $input['total_agreed_amount']);
        }
        if (isset($input['advanceReceived']) || isset($input['advance_received'])) {
            $fields[] = 'advance_received = :advance_received';
            $params[':advance_received'] = (float)($input['advanceReceived'] ?? $input['advance_received']);
        }
        if (isset($input['assignedTourOperatorId']) || isset($input['assigned_tour_operator_id'])) {
            $rawAssigned = $input['assignedTourOperatorId'] ?? $input['assigned_tour_operator_id'];
            $fields[] = 'assigned_tour_operator_id = :assigned_id';
            $params[':assigned_id'] = !empty($rawAssigned) ? (int)$rawAssigned : null;
        }
        if (isset($input['assignedTourOperatorName']) || isset($input['assigned_tour_operator_name'])) {
            $fields[] = 'assigned_tour_operator_name = :assigned_name';
            $params[':assigned_name'] = SecurityHeaders::sanitizeString($input['assignedTourOperatorName'] ?? $input['assigned_tour_operator_name']);
        }
        if (isset($input['notes'])) {
            $fields[] = 'notes = :notes';
            $params[':notes'] = SecurityHeaders::sanitizeString($input['notes']);
        }

        if (!empty($fields)) {
            $sql = 'UPDATE bookings SET ' . implode(', ', $fields) . ' WHERE id = :id';
            $pdo->prepare($sql)->execute($params);

            // If status changed, record in audit trail
            if (isset($input['status'])) {
                $authUser = AuthMiddleware::authenticate();
                $histStmt = $pdo->prepare('INSERT INTO booking_status_history (
                    booking_id, booking_code, from_status, to_status, changed_by_id,
                    changed_by_name, changed_by_role, reason, notes, source
                ) VALUES (
                    :bid, (SELECT booking_code FROM bookings WHERE id = :bid2), NULL, :to_status, :uid, :uname, :urole, :reason, :notes, :source
                )');
                $histStmt->execute([
                    ':bid' => $id,
                    ':bid2' => $id,
                    ':to_status' => $input['status'],
                    ':uid' => $authUser['id'] ?? 1,
                    ':uname' => $authUser['name'] ?? 'Staff',
                    ':urole' => $authUser['role'] ?? 'OPERATIONS',
                    ':reason' => SecurityHeaders::sanitizeString($input['statusReason'] ?? "Booking updated to {$input['status']}"),
                    ':notes' => SecurityHeaders::sanitizeString($input['notes'] ?? ''),
                    ':source' => ($authUser['role'] ?? '') === 'TOUR_OPERATOR' ? 'FIELD_APP' : 'ADMIN_PORTAL'
                ]);
            }
        }

        echo json_encode(['success' => true, 'message' => 'Booking updated successfully']);
    }

    /**
     * DELETE /api/v1/bookings/{id}
     */
    public function delete(int $id): void {
        AuthMiddleware::requireRole(['SUPER_ADMIN']);
        $pdo = Database::getConnection();

        $stmt = $pdo->prepare('DELETE FROM bookings WHERE id = :id');
        $stmt->execute([':id' => $id]);

        echo json_encode(['success' => true, 'message' => 'Booking deleted successfully']);
    }
}
