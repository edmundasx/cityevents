CREATE DATABASE IF NOT EXISTS cityevents CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE cityevents;

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    email VARCHAR(190) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('user','organizer','admin') DEFAULT 'user',
    organization VARCHAR(180) NULL,
    bio TEXT NULL,
    phone VARCHAR(40) NULL,
    city VARCHAR(120) NULL,
    interests VARCHAR(255) NULL,
    blocked TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    organizer_id INT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(80) NOT NULL,
    location VARCHAR(255) NOT NULL,
    lat DECIMAL(10,6) DEFAULT 0,
    lng DECIMAL(10,6) DEFAULT 0,
    event_date DATETIME NOT NULL,
    price DECIMAL(10,2) DEFAULT 0,
    status ENUM('pending','approved','rejected') DEFAULT 'pending',
    cover_image VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_events_user FOREIGN KEY (organizer_id) REFERENCES users(id) ON DELETE SET NULL
);
CREATE INDEX idx_events_category ON events(category);
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_events_date ON events(event_date);

CREATE TABLE IF NOT EXISTS favorites (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    event_id INT NOT NULL,
    tag ENUM('favorite','going') DEFAULT 'favorite',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY user_event_tag (user_id, event_id, tag),
    CONSTRAINT fk_favorites_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_favorites_event FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    event_id INT NOT NULL,
    type VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_notifications_event FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
);

INSERT INTO users (name, email, password_hash, role) VALUES
('Demo Administrator', 'admin@cityevents.test', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin'),
('Demo Organizatorius', 'organizer@cityevents.test', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'organizer');

INSERT INTO events (organizer_id, title, description, category, location, lat, lng, event_date, price, status, cover_image)
VALUES
(2, 'Miesto mugė', 'Sezoninė miesto mugė su vietiniais gamintojais ir scena', 'food', 'Rotušės aikštė', 54.6872, 25.2797, DATE_ADD(NOW(), INTERVAL 7 DAY), 0, 'approved', 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=800&q=80'),
(2, 'Technologijų vakaras', 'Diskusijos ir dirbtuvės apie inovacijas', 'business', 'Technopolis Vilnius', 54.6690, 25.2747, DATE_ADD(NOW(), INTERVAL 14 DAY), 15.00, 'pending', 'https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?auto=format&fit=crop&w=800&q=80'),
(2, 'Muzikos piknikas', 'Gyva muzika parke ir maisto furgonai', 'music', 'Bernardinų sodas', 54.6840, 25.2900, DATE_ADD(NOW(), INTERVAL 3 DAY), 5.00, 'approved', 'https://images.unsplash.com/photo-1506157786151-b8491531f063?auto=format&fit=crop&w=800&q=80');
