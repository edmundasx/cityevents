<?php
class Database {
    private $connection;

    public function __construct()
    {
        $config = require __DIR__ . '/config.php';
        $this->connection = new mysqli(
            $config['host'],
            $config['username'],
            $config['password'],
            $config['database'],
            (int)$config['port']
        );

        if ($this->connection->connect_error) {
            throw new Exception('Nepavyko prisijungti prie DB: ' . $this->connection->connect_error);
        }

        $this->connection->set_charset('utf8mb4');
    }

    public function getConnection(): mysqli
    {
        return $this->connection;
    }
}
