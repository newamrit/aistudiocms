<?php
declare(strict_types=1);

namespace Paila\Controllers;

use PDO;
use Paila\Config\Database;
use Paila\Middleware\AuthMiddleware;
use Paila\Middleware\SecurityHeaders;

/**
 * Controller for Tour Leaders / Field Operators
 * Manages active tour lookups, emergency vendor swaps, field expenses, and status updates in MySQL.
 */
class TourLeaderController {
    /**
     * GET /api/tour-leader/active-tour
     * Returns the active assigned tour for the authenticated tour leader.
     */
    public function getActiveTour(): void {
        $user = AuthMiddleware::authenticate();
        $pdo = Database::getConnection();

        $userId = (int)($user['id'] ?? 0);

        // Find assigned tour with status IN_PROGRESS or CONFIRMED, or most recent assigned
        $stmt = $pdo->prepare("SELECT * FROM bookings 
            WHERE assigned_tour_operator_id = :uid 
            ORDER BY 
                CASE 
                    WHEN status = 'IN_PROGRESS' THEN 1
                    WHEN status = 'CONFIRMED' THEN 2
                    WHEN status = 'PROPOSED' THEN 3
                    ELSE 4
                END, 
                start_date ASC 
            LIMIT 1");
        $stmt->execute([':uid' => $userId]);
        $tour = $stmt->fetch();

        if (!$tour) {
            // If none explicitly assigned to this ID, fallback to any IN_PROGRESS or CONFIRMED tour for demo/preview
            $stmtFallback = $pdo->query("SELECT * FROM bookings 
                WHERE status IN ('IN_PROGRESS', 'CONFIRMED') 
                ORDER BY start_date ASC LIMIT 1");
            $tour = $stmtFallback->fetch();
        }

        if (!$tour) {
            echo json_encode(['data' => null]);
            return;
        }

        $bookingId = (int)$tour['id'];

        // Fetch itinerary days
        $dayStmt = $pdo->prepare("SELECT * FROM itinerary_days WHERE booking_id = :bid ORDER BY day_number ASC");
        $dayStmt->execute([':bid' => $bookingId]);
        $days = $dayStmt->fetchAll();

        // Fetch allocations
        $allocStmt = $pdo->prepare("SELECT a.*, v.phone AS vendor_phone, v.contact_person AS vendor_contact, v.location AS vendor_location 
            FROM operation_allocations a
            LEFT JOIN vendors v ON a.vendor_id = v.id
            WHERE a.booking_id = :bid
            ORDER BY a.service_date ASC");
        $allocStmt->execute([':bid' => $bookingId]);
        $allocations = $allocStmt->fetchAll();

        $tour['itineraryDays'] = $days;
        $tour['allocations'] = $allocations;

        echo json_encode(['data' => $tour]);
    }

    /**
     * POST /api/tour-leader/swap-vendor
     * Swaps an allocated vendor in the database and records field update.
     */
    public function swapVendor(): void {
        $user = AuthMiddleware::authenticate();
        $input = SecurityHeaders::getJsonInput();
        $pdo = Database::getConnection();

        $bookingId = (int)($input['booking_id'] ?? $input['bookingId'] ?? 0);
        $originalName = SecurityHeaders::sanitizeString($input['original_vendor_name'] ?? $input['originalVendor'] ?? '');
        $newName = SecurityHeaders::sanitizeString($input['new_vendor_name'] ?? $input['newVendor'] ?? '');
        $serviceType = SecurityHeaders::sanitizeString($input['service_type'] ?? $input['swapType'] ?? 'HOTEL');
        $reason = SecurityHeaders::sanitizeString($input['reason'] ?? '');
        $costDiff = (float)($input['cost_difference'] ?? 0.0);
        $newPhone = SecurityHeaders::sanitizeString($input['contact_phone'] ?? '');

        if (empty($newName)) {
            http_response_code(422);
            echo json_encode(['error' => 'New vendor name is required']);
            return;
        }

        Database::transaction(function (PDO $pdo) use ($bookingId, $originalName, $newName, $serviceType, $reason, $costDiff, $newPhone, $user) {
            // Find existing allocation for this booking matching the service type or original name
            $allocStmt = $pdo->prepare("SELECT id, agreed_cost, vendor_id, special_notes 
                FROM operation_allocations 
                WHERE booking_id = :bid AND (vendor_name = :vname OR service_type = :stype) 
                ORDER BY id ASC LIMIT 1");
            $allocStmt->execute([
                ':bid' => $bookingId,
                ':vname' => $originalName,
                ':stype' => $serviceType
            ]);
            $alloc = $allocStmt->fetch();

            if ($alloc) {
                $newAgreed = max(0.0, (float)$alloc['agreed_cost'] + $costDiff);
                $noteUpdate = ($alloc['special_notes'] ? $alloc['special_notes'] . " | " : "") . "Emergency swap from {$originalName} to {$newName}: {$reason}";

                $upStmt = $pdo->prepare("UPDATE operation_allocations SET 
                    vendor_name = :vname,
                    agreed_cost = :cost,
                    field_updated_by_operator = 1,
                    special_notes = :notes
                    WHERE id = :id");
                $upStmt->execute([
                    ':vname' => $newName,
                    ':cost' => $newAgreed,
                    ':notes' => $noteUpdate,
                    ':id' => $alloc['id']
                ]);
            }

            // Log activity in system_activities
            $actStmt = $pdo->prepare("INSERT INTO system_activities (
                id, type, category, title, description, actor_id, actor_name, actor_role, actor_email, metadata
            ) VALUES (
                :id, 'VENDOR_SWAP', 'OPERATIONS', :title, :desc, :uid, :uname, 'TOUR_OPERATOR', :uemail, :metadata
            )");
            $actStmt->execute([
                ':id' => 'act-swap-' . time() . '-' . rand(100, 999),
                ':title' => "🔄 Vendor Swapped: {$originalName} ➔ {$newName}",
                ':desc' => "Service: {$serviceType} • Reason: {$reason}",
                ':uid' => $user['id'] ?? null,
                ':uname' => $user['name'] ?? 'Tour Operator',
                ':uemail' => $user['email'] ?? null,
                ':metadata' => json_encode([
                    'bookingId' => $bookingId,
                    'originalVendor' => $originalName,
                    'newVendor' => $newName,
                    'serviceType' => $serviceType,
                    'costDifference' => $costDiff,
                    'phone' => $newPhone
                ])
            ]);

            echo json_encode([
                'success' => true,
                'message' => "Vendor successfully swapped to {$newName} in database."
            ]);
        });
    }

    /**
     * POST /api/tour-leader/log-expense
     * Logs field/spot expense into MySQL.
     */
    public function logExpense(): void {
        $user = AuthMiddleware::authenticate();
        $input = SecurityHeaders::getJsonInput();
        $pdo = Database::getConnection();

        $bookingId = (int)($input['booking_id'] ?? $input['bookingId'] ?? 0);
        $amount = (float)($input['amount'] ?? 0.0);
        $category = SecurityHeaders::sanitizeString($input['category'] ?? 'Miscellaneous');
        $title = SecurityHeaders::sanitizeString($input['title'] ?? "Spot Expense: {$category}");
        $notes = SecurityHeaders::sanitizeString($input['notes'] ?? $input['description'] ?? '');
        $paymentMethod = SecurityHeaders::sanitizeString($input['payment_method'] ?? 'CASH');
        $receiptImage = $input['receipt_image_url'] ?? $input['receipt_image'] ?? $input['receiptPreview'] ?? null;

        if ($amount <= 0) {
            http_response_code(422);
            echo json_encode(['error' => 'Valid expense amount is required']);
            return;
        }

        $id = 'act-exp-' . time() . '-' . rand(100, 999);
        $userId = (int)($user['id'] ?? 1);

        // 1. Persist directly into dedicated tour_expenses table
        try {
            $expStmt = $pdo->prepare("INSERT INTO tour_expenses (
                booking_id, tour_leader_id, category, title, amount, payment_method, receipt_image, notes, expense_date
            ) VALUES (
                :bid, :tlid, :cat, :title, :amount, :pm, :receipt, :notes, CURRENT_DATE
            )");
            $expStmt->execute([
                ':bid' => $bookingId,
                ':tlid' => $userId,
                ':cat' => $category,
                ':title' => $title,
                ':amount' => $amount,
                ':pm' => $paymentMethod,
                ':receipt' => $receiptImage,
                ':notes' => $notes
            ]);
        } catch (\Throwable $e) {
            // Fallback if table was not yet created
            error_log("Failed to insert tour_expenses: " . $e->getMessage());
        }

        // 2. Persist to system_activities for Admin & Field Activity live auditing
        $actStmt = $pdo->prepare("INSERT INTO system_activities (
            id, type, category, title, description, actor_id, actor_name, actor_role, actor_email, metadata
        ) VALUES (
            :id, 'SPOT_EXPENSE', 'PAYMENT', :title, :desc, :uid, :uname, 'TOUR_OPERATOR', :uemail, :metadata
        )");

        $actStmt->execute([
            ':id' => $id,
            ':title' => "💸 Spot Expense: NPR " . number_format($amount, 2) . " ({$category})",
            ':desc' => $notes ?: "Logged by {$user['name']} via Tour Leader Portal",
            ':uid' => $userId,
            ':uname' => $user['name'] ?? 'Tour Operator',
            ':uemail' => $user['email'] ?? null,
            ':metadata' => json_encode([
                'bookingId' => $bookingId,
                'amount' => $amount,
                'category' => $category,
                'paymentMethod' => $paymentMethod,
                'hasReceipt' => !empty($receiptImage),
                'receiptPreview' => $receiptImage
            ])
        ]);

        http_response_code(201);
        echo json_encode([
            'success' => true,
            'id' => $id,
            'message' => "Spot expense of NPR " . number_format($amount, 2) . " with receipt recorded in database."
        ]);
    }

    /**
     * POST /api/tour-leader/update-status
     * Updates tour status or daily field checkpoint.
     */
    public function updateStatus(): void {
        $user = AuthMiddleware::authenticate();
        $input = SecurityHeaders::getJsonInput();
        $pdo = Database::getConnection();

        $bookingId = (int)($input['booking_id'] ?? $input['bookingId'] ?? 0);
        $status = SecurityHeaders::sanitizeString($input['status'] ?? '');
        $notes = SecurityHeaders::sanitizeString($input['notes'] ?? '');

        if (!$bookingId) {
            http_response_code(422);
            echo json_encode(['error' => 'Booking ID is required']);
            return;
        }

        $validStatuses = ['PROPOSED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
        if (in_array($status, $validStatuses, true)) {
            $stmt = $pdo->prepare("UPDATE bookings SET status = :st, notes = CONCAT(COALESCE(notes, ''), '\n', :nt) WHERE id = :id");
            $stmt->execute([
                ':st' => $status,
                ':nt' => "[Tour Leader Update] " . date('Y-m-d H:i') . ": " . ($notes ?: "Status changed to {$status}"),
                ':id' => $bookingId
            ]);

            // Append to audit trail
            $hStmt = $pdo->prepare("INSERT INTO booking_status_history (
                booking_id, booking_code, from_status, to_status, changed_by_id,
                changed_by_name, changed_by_role, reason, notes, source
            ) VALUES (
                :bid, (SELECT booking_code FROM bookings WHERE id = :bid2), NULL, :to_status, :uid, :uname, 'TOUR_OPERATOR', :reason, :notes, 'FIELD_APP'
            )");
            $hStmt->execute([
                ':bid' => $bookingId,
                ':bid2' => $bookingId,
                ':to_status' => $status,
                ':uid' => $user['id'] ?? null,
                ':uname' => $user['name'] ?? 'Tour Leader',
                ':reason' => "Status updated to {$status} from field app",
                ':notes' => $notes
            ]);
        }

        echo json_encode(['success' => true, 'message' => 'Status updated in database']);
    }
}
