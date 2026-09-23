<?php
declare(strict_types=1);

namespace Paila\Controllers;

use PDO;
use Paila\Config\Database;
use Paila\Middleware\AuthMiddleware;
use Paila\Middleware\SecurityHeaders;

/**
 * Controller for Operational Alerts & Safety Escalations
 * Synchronizes with MySQL system_alerts table.
 */
class AlertController {
    /**
     * GET /api/alerts
     * Returns all alerts with booking and tour leader join info.
     */
    public function index(): void {
        AuthMiddleware::authenticate();
        $pdo = Database::getConnection();

        $sql = "SELECT 
                    a.id, 
                    a.booking_id, 
                    a.tour_leader_id, 
                    a.alert_type, 
                    a.severity, 
                    a.title, 
                    a.description, 
                    a.location, 
                    CASE 
                        WHEN a.status = 'ACTIVE' THEN 'PENDING'
                        ELSE a.status 
                    END AS status,
                    a.acknowledged_by, 
                    u_ack.name AS acknowledged_by_name,
                    a.acknowledged_at, 
                    a.resolved_at, 
                    a.created_at,
                    b.booking_code,
                    b.client_name,
                    u_tl.name AS tour_leader_name,
                    u_tl.phone AS tour_leader_phone
                FROM system_alerts a
                LEFT JOIN bookings b ON a.booking_id = b.id
                LEFT JOIN users u_tl ON a.tour_leader_id = u_tl.id
                LEFT JOIN users u_ack ON a.acknowledged_by = u_ack.id
                ORDER BY a.created_at DESC
                LIMIT 100";

        $stmt = $pdo->query($sql);
        $alerts = $stmt->fetchAll();

        echo json_encode(['data' => $alerts]);
    }

    /**
     * POST /api/alerts
     * Creates a new operational alert.
     */
    public function store(): void {
        $user = AuthMiddleware::authenticate();
        $input = SecurityHeaders::getJsonInput();
        $pdo = Database::getConnection();

        $title = SecurityHeaders::sanitizeString($input['title'] ?? '');
        if (empty($title)) {
            http_response_code(422);
            echo json_encode(['error' => 'Alert title is required']);
            return;
        }

        $bookingId = !empty($input['booking_id']) ? (int)$input['booking_id'] : (!empty($input['bookingId']) ? (int)$input['bookingId'] : null);
        $tourLeaderId = !empty($input['tour_leader_id']) ? (int)$input['tour_leader_id'] : (!empty($input['tourLeaderId']) ? (int)$input['tourLeaderId'] : ($user['id'] ?? 1));
        
        $alertType = SecurityHeaders::sanitizeString($input['alert_type'] ?? $input['alertType'] ?? 'EMERGENCY_SOS');
        $validSeverities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
        $severity = in_array($input['severity'] ?? '', $validSeverities, true) ? $input['severity'] : 'HIGH';

        $description = SecurityHeaders::sanitizeString($input['description'] ?? '');
        $location = SecurityHeaders::sanitizeString($input['location'] ?? '');

        $stmt = $pdo->prepare("INSERT INTO system_alerts (
            booking_id, tour_leader_id, alert_type, severity, title, description, location, status
        ) VALUES (
            :booking_id, :tour_leader_id, :alert_type, :severity, :title, :description, :location, 'ACTIVE'
        )");

        $stmt->execute([
            ':booking_id' => $bookingId,
            ':tour_leader_id' => $tourLeaderId,
            ':alert_type' => $alertType,
            ':severity' => $severity,
            ':title' => $title,
            ':description' => $description,
            ':location' => $location
        ]);

        $newId = (int)$pdo->lastInsertId();

        // Also record in system_activities
        try {
            $actStmt = $pdo->prepare("INSERT INTO system_activities (
                id, type, category, title, description, actor_id, actor_name, actor_role, actor_email, metadata
            ) VALUES (
                :id, 'FIELD_ALERT', 'ALERT', :title, :desc, :uid, :uname, :urole, :uemail, :metadata
            )");
            $actStmt->execute([
                ':id' => 'act-alert-' . time() . '-' . rand(100, 999),
                ':title' => "🚨 {$severity} Alert: {$title}",
                ':desc' => $description ?: "Alert logged at {$location}",
                ':uid' => $user['id'] ?? null,
                ':uname' => $user['name'] ?? 'Staff',
                ':urole' => $user['role'] ?? 'OPERATIONS',
                ':uemail' => $user['email'] ?? null,
                ':metadata' => json_encode(['alertId' => $newId, 'location' => $location, 'severity' => $severity])
            ]);
        } catch (\Throwable $e) {
            // Ignore activity logging failure
        }

        http_response_code(201);
        echo json_encode([
            'success' => true,
            'id' => $newId,
            'message' => 'Alert successfully logged to database.'
        ]);
    }

    /**
     * POST/PATCH /api/alerts/{id}/acknowledge
     */
    public function acknowledge(int $id): void {
        $user = AuthMiddleware::authenticate();
        $pdo = Database::getConnection();

        $stmt = $pdo->prepare("UPDATE system_alerts SET 
            status = 'ACKNOWLEDGED', 
            acknowledged_by = :uid, 
            acknowledged_at = CURRENT_TIMESTAMP 
            WHERE id = :id");

        $stmt->execute([
            ':uid' => $user['id'] ?? 1,
            ':id' => $id
        ]);

        echo json_encode(['success' => true, 'message' => "Alert #{$id} acknowledged"]);
    }

    /**
     * POST/PATCH /api/alerts/{id}/resolve
     */
    public function resolve(int $id): void {
        AuthMiddleware::authenticate();
        $pdo = Database::getConnection();

        $stmt = $pdo->prepare("UPDATE system_alerts SET 
            status = 'RESOLVED', 
            resolved_at = CURRENT_TIMESTAMP 
            WHERE id = :id");

        $stmt->execute([':id' => $id]);

        echo json_encode(['success' => true, 'message' => "Alert #{$id} marked as resolved"]);
    }
}
