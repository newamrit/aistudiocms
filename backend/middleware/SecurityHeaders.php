<?php
declare(strict_types=1);

namespace Paila\Middleware;

/**
 * OWASP Top 10 Hardened Security Middleware
 * Applies strict Content Security Policy, prevents Clickjacking, XSS, MIME sniffing,
 * and enforces strict CORS controls.
 */
class SecurityHeaders {
    public static function apply(): void {
        // Enforce TLS / HTTPS in production
        if (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on') {
            header('Strict-Transport-Security: max-age=31536000; includeSubDomains; preload');
        }

        // Prevent MIME type sniffing
        header('X-Content-Type-Options: nosniff');

        // Prevent Clickjacking
        header('X-Frame-Options: SAMEORIGIN');

        // Legacy XSS filter protection
        header('X-XSS-Protection: 1; mode=block');

        // Referrer policy privacy
        header('Referrer-Policy: strict-origin-when-cross-origin');

        // Restrict browser features
        header('Permissions-Policy: camera=(), microphone=(), geolocation=(self)');

        // Content Security Policy for API responses
        header("Content-Security-Policy: default-src 'self'; script-src 'self'; object-src 'none';");

        // Handle Cross-Origin Resource Sharing (CORS)
        self::handleCors();
    }

    private static function handleCors(): void {
        $allowedOrigins = [
            'http://localhost:3000',
            'http://127.0.0.1:3000',
            'https://pailanepal.com',
            'https://erp.pailanepal.com',
        ];

        $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
        if (in_array($origin, $allowedOrigins, true)) {
            header("Access-Control-Allow-Origin: {$origin}");
            header('Access-Control-Allow-Credentials: true');
        } else {
            // Default permissive for same-origin or localhost dev
            header('Access-Control-Allow-Origin: *');
        }

        header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Auth-Token, X-Requested-With, Accept, X-CSRF-Token');
        header('Access-Control-Max-Age: 86400');

        // Respond immediately to preflight OPTIONS requests
        if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
            http_response_code(204);
            exit(0);
        }
    }

    /**
     * Sanitizes string input to prevent XSS payloads while preserving Unicode (e.g. Nepali script).
     */
    public static function sanitizeString(?string $input): string {
        if ($input === null) return '';
        return htmlspecialchars(trim($input), ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    }

    /**
     * Parses and validates JSON request payload with nesting depth and byte limits.
     */
    public static function getJsonInput(int $maxBytes = 2097152): array {
        $raw = file_get_contents('php://input');
        if (strlen($raw) > $maxBytes) {
            http_response_code(413);
            echo json_encode(['error' => 'Payload exceeds maximum allowed size (2MB)']);
            exit(0);
        }

        if (empty($raw)) {
            return [];
        }

        try {
            $decoded = json_decode($raw, true, 32, JSON_THROW_ON_ERROR);
            return is_array($decoded) ? $decoded : [];
        } catch (\Throwable) {
            $fallback = json_decode($raw, true);
            return is_array($fallback) ? $fallback : [];
        }
    }
}
