<?php
declare(strict_types=1);

namespace Paila\Controllers;

use PDO;
use Paila\Config\Database;
use Paila\Middleware\AuthMiddleware;
use Paila\Middleware\SecurityHeaders;

/**
 * Controller for System Audit Trail & Real-Time Activities
 * Synchronizes with MySQL system_activities table.
 */
class ActivityController {
    /**
     * GET /api/activities
     * Returns the most recent system activities from MySQL.
     */
    public function index(): void {
        AuthMiddleware::authenticate();
        $pdo = Database::getConnection();

        $limit = isset($_GET['limit']) ? min(200, max(10, (int)$_GET['limit'])) : 100;
        $category = $_GET['category'] ?? null;

        if ($category && $category !== 'ALL') {
            $stmt = $pdo->prepare("SELECT * FROM system_activities WHERE category = :cat ORDER BY timestamp DESC LIMIT :lim");
            $stmt->bindValue(':cat', $category);
            $stmt->bindValue(':lim', $limit, PDO::PARAM_INT);
            $stmt->execute();
        } else {
            $stmt = $pdo->prepare("SELECT * FROM system_activities ORDER BY timestamp DESC LIMIT :lim");
            $stmt->bindValue(':lim', $limit, PDO::PARAM_INT);
            $stmt->execute();
        }

        $rows = $stmt->fetchAll();
        $activities = [];

        foreach ($rows as $r) {
            $metadata = null;
            if (!empty($r['metadata'])) {
                $decoded = json_decode($r['metadata'], true);
                if (is_array($decoded)) {
                    $metadata = $decoded;
                }
            }

            $activities[] = [
                'id' => $r['id'],
                'type' => $r['type'],
                'category' => $r['category'],
                'title' => $r['title'],
                'description' => $r['description'],
                'timestamp' => $r['timestamp'],
                'actor' => [
                    'id' => $r['actor_id'] ? (int)$r['actor_id'] : null,
                    'name' => $r['actor_name'],
                    'role' => $r['actor_role'],
                    'email' => $r['actor_email'] ?? null,
                ],
                'metadata' => $metadata
            ];
        }

        echo json_encode(['data' => $activities]);
    }

    /**
     * POST /api/activities
     * Records a new system activity or field checkpoint in MySQL.
     */
    public function store(): void {
        $user = AuthMiddleware::authenticate();
        $input = SecurityHeaders::getJsonInput();
        $pdo = Database::getConnection();

        $title = SecurityHeaders::sanitizeString($input['title'] ?? '');
        if (empty($title)) {
            http_response_code(422);
            echo json_encode(['error' => 'Activity title is required']);
            return;
        }

        $id = !empty($input['id']) ? SecurityHeaders::sanitizeString($input['id']) : ('act-' . time() . '-' . rand(1000, 9999));
        $type = SecurityHeaders::sanitizeString($input['type'] ?? 'GENERAL');
        $category = SecurityHeaders::sanitizeString($input['category'] ?? 'GENERAL');
        $description = SecurityHeaders::sanitizeString($input['description'] ?? '');

        $actor = $input['actor'] ?? [];
        $actorId = !empty($actor['id']) ? (int)$actor['id'] : ($user['id'] ?? null);
        $actorName = !empty($actor['name']) ? SecurityHeaders::sanitizeString($actor['name']) : ($user['name'] ?? 'Staff');
        $actorRole = !empty($actor['role']) ? SecurityHeaders::sanitizeString($actor['role']) : ($user['role'] ?? 'SUPER_ADMIN');
        $actorEmail = !empty($actor['email']) ? filter_var($actor['email'], FILTER_SANITIZE_EMAIL) : ($user['email'] ?? null);

        $metadata = null;
        if (isset($input['metadata']) && is_array($input['metadata'])) {
            $metadata = json_encode($input['metadata']);
        }

        $stmt = $pdo->prepare("INSERT INTO system_activities (
            id, type, category, title, description, actor_id, actor_name, actor_role, actor_email, metadata
        ) VALUES (
            :id, :type, :category, :title, :description, :actor_id, :actor_name, :actor_role, :actor_email, :metadata
        )");

        $stmt->execute([
            ':id' => $id,
            ':type' => $type,
            ':category' => $category,
            ':title' => $title,
            ':description' => $description,
            ':actor_id' => $actorId,
            ':actor_name' => $actorName,
            ':actor_role' => $actorRole,
            ':actor_email' => $actorEmail,
            ':metadata' => $metadata
        ]);

        http_response_code(201);
        echo json_encode(['success' => true, 'id' => $id, 'message' => 'Activity logged in database.']);
    }
}
