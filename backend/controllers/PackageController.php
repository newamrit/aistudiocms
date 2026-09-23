<?php
declare(strict_types=1);

namespace Paila\Controllers;

use Paila\Config\Database;
use Paila\Middleware\AuthMiddleware;
use Paila\Middleware\SecurityHeaders;
use PDO;

class PackageController {
    /**
     * GET /api/v1/packages
     */
    public function index(): void {
        $pdo = Database::getConnection();
        $stmt = $pdo->query('SELECT p.*, COUNT(i.id) AS days_count 
                             FROM packages p 
                             LEFT JOIN itinerary_days i ON p.id = i.package_id 
                             WHERE p.is_active = 1 
                             GROUP BY p.id 
                             ORDER BY p.title ASC');
        $packages = $stmt->fetchAll();

        foreach ($packages as &$pkg) {
            $dayStmt = $pdo->prepare('SELECT * FROM itinerary_days WHERE package_id = :pid ORDER BY day_number ASC');
            $dayStmt->execute([':pid' => $pkg['id']]);
            $pkg['itineraryDays'] = $dayStmt->fetchAll();
        }

        echo json_encode(['data' => $packages, 'count' => count($packages)]);
    }

    /**
     * POST /api/v1/packages
     */
    public function store(): void {
        AuthMiddleware::requireRole(['SUPER_ADMIN', 'SALES']);
        $input = SecurityHeaders::getJsonInput();

        if (empty($input['title']) || empty($input['durationDays'])) {
            http_response_code(422);
            echo json_encode(['error' => 'Title and duration are required']);
            return;
        }

        $pdo = Database::getConnection();
        $slug = strtolower(trim(preg_replace('/[^A-Za-z0-9-]+/', '-', $input['title'])));

        $stmt = $pdo->prepare('INSERT INTO packages (
            title, slug, duration_days, duration_nights, standard_price,
            category, overview, inclusions, exclusions, is_active
        ) VALUES (
            :title, :slug, :days, :nights, :price, :category, :overview, :inclusions, :exclusions, 1
        )');

        $stmt->execute([
            ':title' => SecurityHeaders::sanitizeString($input['title']),
            ':slug' => $slug,
            ':days' => (int)$input['durationDays'],
            ':nights' => (int)($input['durationNights'] ?? max(0, (int)$input['durationDays'] - 1)),
            ':price' => (float)($input['standardPrice'] ?? 0.0),
            ':category' => SecurityHeaders::sanitizeString($input['category'] ?? 'Trekking'),
            ':overview' => SecurityHeaders::sanitizeString($input['overview'] ?? ''),
            ':inclusions' => SecurityHeaders::sanitizeString($input['inclusions'] ?? ''),
            ':exclusions' => SecurityHeaders::sanitizeString($input['exclusions'] ?? '')
        ]);

        $newId = (int)$pdo->lastInsertId();

        // Save package itinerary days if provided
        if (!empty($input['itineraryDays']) && is_array($input['itineraryDays'])) {
            $dayStmt = $pdo->prepare('INSERT INTO itinerary_days (
                package_id, day_number, title, description, overnight_location, meals_included
            ) VALUES (
                :pid, :dnum, :title, :desc, :loc, :meals
            )');
            $dIndex = 1;
            foreach ($input['itineraryDays'] as $day) {
                if (empty($day['title']) && empty($day['description'])) continue;
                $dayStmt->execute([
                    ':pid' => $newId,
                    ':dnum' => (int)($day['dayNumber'] ?? $dIndex),
                    ':title' => SecurityHeaders::sanitizeString($day['title'] ?? "Day {$dIndex}"),
                    ':desc' => SecurityHeaders::sanitizeString($day['description'] ?? ''),
                    ':loc' => SecurityHeaders::sanitizeString($day['overnightLocation'] ?? ''),
                    ':meals' => SecurityHeaders::sanitizeString($day['mealsIncluded'] ?? 'B, L, D')
                ]);
                $dIndex++;
            }
        }

        echo json_encode(['success' => true, 'id' => $newId, 'message' => 'Package created']);
    }

    /**
     * PUT/PATCH /api/v1/packages/{id}
     */
    public function update(int $id): void {
        AuthMiddleware::requireRole(['SUPER_ADMIN', 'SALES']);
        $input = SecurityHeaders::getJsonInput();
        $pdo = Database::getConnection();

        $stmt = $pdo->prepare('SELECT id FROM packages WHERE id = :id LIMIT 1');
        $stmt->execute([':id' => $id]);
        if (!$stmt->fetch()) {
            http_response_code(404);
            echo json_encode(['error' => 'Package not found']);
            return;
        }

        $fields = [];
        $params = [':id' => $id];

        if (isset($input['title'])) {
            $fields[] = 'title = :title';
            $params[':title'] = SecurityHeaders::sanitizeString($input['title']);
            if (empty($input['slug'])) {
                $fields[] = 'slug = :slug';
                $params[':slug'] = strtolower(trim(preg_replace('/[^A-Za-z0-9-]+/', '-', $input['title'])));
            }
        }
        if (!empty($input['slug'])) {
            $fields[] = 'slug = :slug';
            $params[':slug'] = strtolower(trim(preg_replace('/[^A-Za-z0-9-]+/', '-', $input['slug'])));
        }
        if (isset($input['durationDays'])) {
            $fields[] = 'duration_days = :days';
            $params[':days'] = (int)$input['durationDays'];
        }
        if (isset($input['durationNights'])) {
            $fields[] = 'duration_nights = :nights';
            $params[':nights'] = (int)$input['durationNights'];
        }
        if (isset($input['standardPrice'])) {
            $fields[] = 'standard_price = :price';
            $params[':price'] = (float)$input['standardPrice'];
        }
        if (isset($input['category'])) {
            $fields[] = 'category = :category';
            $params[':category'] = SecurityHeaders::sanitizeString($input['category']);
        }
        if (isset($input['overview'])) {
            $fields[] = 'overview = :overview';
            $params[':overview'] = SecurityHeaders::sanitizeString($input['overview']);
        }
        if (isset($input['inclusions'])) {
            $fields[] = 'inclusions = :inclusions';
            $params[':inclusions'] = SecurityHeaders::sanitizeString($input['inclusions']);
        }
        if (isset($input['exclusions'])) {
            $fields[] = 'exclusions = :exclusions';
            $params[':exclusions'] = SecurityHeaders::sanitizeString($input['exclusions']);
        }
        if (isset($input['isActive'])) {
            $fields[] = 'is_active = :is_active';
            $params[':is_active'] = ((bool)$input['isActive']) ? 1 : 0;
        }

        if (!empty($fields)) {
            $sql = 'UPDATE packages SET ' . implode(', ', $fields) . ' WHERE id = :id';
            $pdo->prepare($sql)->execute($params);
        }

        // Update itinerary days if provided
        if (isset($input['itineraryDays']) && is_array($input['itineraryDays'])) {
            $pdo->prepare('DELETE FROM itinerary_days WHERE package_id = :pid')->execute([':pid' => $id]);
            $dayStmt = $pdo->prepare('INSERT INTO itinerary_days (
                package_id, day_number, title, description, overnight_location, meals_included
            ) VALUES (
                :pid, :dnum, :title, :desc, :loc, :meals
            )');
            $dIndex = 1;
            foreach ($input['itineraryDays'] as $day) {
                if (empty($day['title']) && empty($day['description'])) continue;
                $dayStmt->execute([
                    ':pid' => $id,
                    ':dnum' => (int)($day['dayNumber'] ?? $dIndex),
                    ':title' => SecurityHeaders::sanitizeString($day['title'] ?? "Day {$dIndex}"),
                    ':desc' => SecurityHeaders::sanitizeString($day['description'] ?? ''),
                    ':loc' => SecurityHeaders::sanitizeString($day['overnightLocation'] ?? ''),
                    ':meals' => SecurityHeaders::sanitizeString($day['mealsIncluded'] ?? 'B, L, D')
                ]);
                $dIndex++;
            }
        }

        echo json_encode(['success' => true, 'message' => 'Package updated successfully']);
    }

    /**
     * DELETE /api/v1/packages/{id}
     */
    public function delete(int $id): void {
        AuthMiddleware::requireRole(['SUPER_ADMIN']);
        $pdo = Database::getConnection();

        // Check if there are active bookings with this package
        $stmt = $pdo->prepare('SELECT COUNT(*) FROM bookings WHERE package_id = :id');
        $stmt->execute([':id' => $id]);
        $bookingCount = (int)$stmt->fetchColumn();

        if ($bookingCount > 0) {
            // Soft delete to protect referential integrity
            $pdo->prepare('UPDATE packages SET is_active = 0 WHERE id = :id')->execute([':id' => $id]);
            echo json_encode(['success' => true, 'message' => 'Package has linked bookings; marked as inactive.']);
            return;
        }

        $pdo->prepare('DELETE FROM packages WHERE id = :id')->execute([':id' => $id]);
        echo json_encode(['success' => true, 'message' => 'Package deleted successfully']);
    }
}
