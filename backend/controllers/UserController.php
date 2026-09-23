<?php
declare(strict_types=1);

namespace Paila\Controllers;

use Paila\Config\Database;
use Paila\Middleware\AuthMiddleware;
use Paila\Middleware\SecurityHeaders;
use PDO;

class UserController {
    /**
     * POST /api/v1/auth/login
     */
    public function login(): void {
        $input = SecurityHeaders::getJsonInput();
        $email = filter_var($input['email'] ?? '', FILTER_SANITIZE_EMAIL);
        $password = $input['password'] ?? '';

        if (empty($email) || empty($password)) {
            http_response_code(400);
            echo json_encode(['error' => 'Email and password required']);
            return;
        }

        $pdo = Database::getConnection();
        $stmt = $pdo->prepare('SELECT id, name, email, password, role, phone, is_active FROM users WHERE email = :email LIMIT 1');
        $stmt->execute([':email' => $email]);
        $user = $stmt->fetch();

        // Secure password verification (bcrypt with auto-hash upgrade for plain-text DB edits)
        $isValidPassword = false;
        if ($user) {
            if (password_verify($password, $user['password'])) {
                $isValidPassword = true;
            } elseif ($user['password'] === $password) {
                // If user entered plaintext directly in phpMyAdmin, accept & upgrade to bcrypt
                $isValidPassword = true;
                try {
                    $newHash = password_hash($password, PASSWORD_BCRYPT);
                    $pdo->prepare('UPDATE users SET password = :p WHERE id = :id')->execute([':p' => $newHash, ':id' => $user['id']]);
                } catch (\Throwable) {}
            }
        }

        if (!$user || !$isValidPassword) {
            http_response_code(401);
            echo json_encode(['error' => 'Invalid email or password']);
            return;
        }

        if (!(bool)$user['is_active']) {
            http_response_code(403);
            echo json_encode(['error' => 'Account has been deactivated. Please contact Super Admin.']);
            return;
        }

        // Update last login
        $pdo->prepare('UPDATE users SET last_login_at = NOW() WHERE id = :id')->execute([':id' => $user['id']]);

        // Issue token
        $payload = [
            'sub' => $user['id'],
            'email' => $user['email'],
            'role' => $user['role'],
            'iat' => time(),
            'exp' => time() + 86400 * 7
        ];
        $token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' . rtrim(strtr(base64_encode(json_encode($payload)), '+/', '-_'), '=') . '.sig';

        unset($user['password']);
        echo json_encode([
            'token' => $token,
            'user' => $user
        ]);
    }

    /**
     * GET /api/v1/users
     */
    public function index(): void {
        AuthMiddleware::authenticate();
        $pdo = Database::getConnection();
        $stmt = $pdo->query('SELECT id, name, email, role, phone, is_active, last_login_at, created_at FROM users ORDER BY id ASC');
        echo json_encode(['data' => $stmt->fetchAll()]);
    }

    /**
     * POST /api/v1/users
     * Create a new team member with secure bcrypt password
     */
    public function store(): void {
        AuthMiddleware::requireRole(['SUPER_ADMIN']);
        $input = SecurityHeaders::getJsonInput();

        $name = SecurityHeaders::sanitizeString($input['name'] ?? '');
        $email = filter_var($input['email'] ?? '', FILTER_SANITIZE_EMAIL);
        $role = $input['role'] ?? 'SALES';
        $phone = SecurityHeaders::sanitizeString($input['phone'] ?? '');
        $password = $input['password'] ?? 'Paila#2026';
        $isActive = isset($input['isActive']) ? ((bool)$input['isActive'] ? 1 : 0) : 1;

        if (empty($name) || empty($email)) {
            http_response_code(422);
            echo json_encode(['error' => 'Name and email are required']);
            return;
        }

        $validRoles = ['SUPER_ADMIN', 'SALES', 'OPERATIONS', 'TOUR_OPERATOR'];
        if (!in_array($role, $validRoles, true)) {
            $role = 'SALES';
        }

        $pdo = Database::getConnection();

        // Check email uniqueness
        $checkStmt = $pdo->prepare('SELECT id FROM users WHERE email = :email LIMIT 1');
        $checkStmt->execute([':email' => $email]);
        if ($checkStmt->fetch()) {
            http_response_code(409);
            echo json_encode(['error' => 'A user with this email address already exists']);
            return;
        }

        $hash = password_hash($password, PASSWORD_BCRYPT);

        $stmt = $pdo->prepare('INSERT INTO users (
            name, email, password, role, phone, is_active
        ) VALUES (
            :name, :email, :password, :role, :phone, :is_active
        )');

        $stmt->execute([
            ':name' => $name,
            ':email' => $email,
            ':password' => $hash,
            ':role' => $role,
            ':phone' => $phone,
            ':is_active' => $isActive
        ]);

        $newId = (int)$pdo->lastInsertId();
        echo json_encode([
            'success' => true,
            'id' => $newId,
            'user' => [
                'id' => $newId,
                'name' => $name,
                'email' => $email,
                'role' => $role,
                'phone' => $phone,
                'isActive' => (bool)$isActive
            ],
            'message' => 'User created successfully'
        ]);
    }

    /**
     * PUT/PATCH /api/v1/users/{id}
     */
    public function update(int $id): void {
        AuthMiddleware::requireRole(['SUPER_ADMIN']);
        $input = SecurityHeaders::getJsonInput();
        $pdo = Database::getConnection();

        $stmt = $pdo->prepare('SELECT id, role FROM users WHERE id = :id LIMIT 1');
        $stmt->execute([':id' => $id]);
        $existing = $stmt->fetch();

        if (!$existing) {
            http_response_code(404);
            echo json_encode(['error' => 'User not found']);
            return;
        }

        $fields = [];
        $params = [':id' => $id];

        if (isset($input['name'])) {
            $fields[] = 'name = :name';
            $params[':name'] = SecurityHeaders::sanitizeString($input['name']);
        }
        if (isset($input['email'])) {
            $cleanEmail = filter_var($input['email'], FILTER_SANITIZE_EMAIL);
            // Check uniqueness if changing email
            $dupCheck = $pdo->prepare('SELECT id FROM users WHERE email = :email AND id != :id LIMIT 1');
            $dupCheck->execute([':email' => $cleanEmail, ':id' => $id]);
            if ($dupCheck->fetch()) {
                http_response_code(409);
                echo json_encode(['error' => 'Another user already has this email']);
                return;
            }
            $fields[] = 'email = :email';
            $params[':email'] = $cleanEmail;
        }
        if (isset($input['role'])) {
            $validRoles = ['SUPER_ADMIN', 'SALES', 'OPERATIONS', 'TOUR_OPERATOR'];
            if (in_array($input['role'], $validRoles, true)) {
                $fields[] = 'role = :role';
                $params[':role'] = $input['role'];
            }
        }
        if (isset($input['phone'])) {
            $fields[] = 'phone = :phone';
            $params[':phone'] = SecurityHeaders::sanitizeString($input['phone']);
        }
        if (isset($input['isActive'])) {
            // Prevent deactivating root admin #1
            if ($id === 1) {
                $input['isActive'] = true;
            }
            $fields[] = 'is_active = :is_active';
            $params[':is_active'] = ((bool)$input['isActive']) ? 1 : 0;
        }
        if (!empty($input['password'])) {
            $fields[] = 'password = :password';
            $params[':password'] = password_hash($input['password'], PASSWORD_BCRYPT);
        }

        if (empty($fields)) {
            echo json_encode(['success' => true, 'message' => 'No changes requested']);
            return;
        }

        $sql = 'UPDATE users SET ' . implode(', ', $fields) . ' WHERE id = :id';
        $upStmt = $pdo->prepare($sql);
        $upStmt->execute($params);

        echo json_encode(['success' => true, 'message' => 'User updated successfully']);
    }

    /**
     * DELETE /api/v1/users/{id}
     */
    public function delete(int $id): void {
        AuthMiddleware::requireRole(['SUPER_ADMIN']);
        if ($id === 1) {
            http_response_code(403);
            echo json_encode(['error' => 'Primary system administrator account cannot be deleted']);
            return;
        }

        $pdo = Database::getConnection();
        $stmt = $pdo->prepare('DELETE FROM users WHERE id = :id');
        $stmt->execute([':id' => $id]);

        echo json_encode(['success' => true, 'message' => 'User deleted successfully']);
    }

    /**
     * POST /api/v1/users/{id}/password
     */
    public function setPassword(int $id): void {
        AuthMiddleware::requireRole(['SUPER_ADMIN']);
        $input = SecurityHeaders::getJsonInput();
        $password = $input['password'] ?? '';

        if (empty($password) || strlen($password) < 4) {
            http_response_code(422);
            echo json_encode(['error' => 'Password must be at least 4 characters long']);
            return;
        }

        $pdo = Database::getConnection();
        $hash = password_hash($password, PASSWORD_BCRYPT);
        $stmt = $pdo->prepare('UPDATE users SET password = :p WHERE id = :id');
        $stmt->execute([':p' => $hash, ':id' => $id]);

        echo json_encode(['success' => true, 'message' => 'Password updated successfully']);
    }
}
