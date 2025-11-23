<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit;
}

require __DIR__ . '/Database.php';
require __DIR__ . '/Response.php';

$database = null;
try {
    $database = (new Database())->getConnection();
} catch (Exception $e) {
    Response::json(['error' => $e->getMessage()], 500);
}

$resource = $_GET['resource'] ?? 'events';

switch ($resource) {
    case 'events':
        handleEvents($database);
        break;
    case 'users':
        handleUsers($database);
        break;
    case 'favorites':
        handleFavorites($database);
        break;
    case 'admin':
        handleAdmin($database);
        break;
    case 'recommendations':
        handleRecommendations($database);
        break;
    default:
        Response::json(['error' => 'Nerastas resursas'], 404);
}

function getJsonInput(): array
{
    $content = file_get_contents('php://input');
    $decoded = json_decode($content, true);
    return is_array($decoded) ? $decoded : [];
}

function handleEvents(mysqli $db): void
{
    $method = $_SERVER['REQUEST_METHOD'];
    if ($method === 'GET') {
        $id = $_GET['id'] ?? null;
        $includeAll = isset($_GET['include_all']);
        $baseQuery = "SELECT e.*, u.name AS organizer_name FROM events e LEFT JOIN users u ON e.organizer_id = u.id WHERE 1=1";
        $params = [];
        $types = '';

        if (!$includeAll) {
            $baseQuery .= " AND e.status = 'approved'";
        }

        if ($id) {
            $baseQuery .= " AND e.id = ? LIMIT 1";
            $params[] = $id;
            $types .= 'i';
            $stmt = $db->prepare($baseQuery);
            $stmt->bind_param($types, ...$params);
            $stmt->execute();
            $result = $stmt->get_result()->fetch_assoc();
            Response::json(['event' => $result]);
        }

        if (!empty($_GET['category'])) {
            $baseQuery .= " AND e.category = ?";
            $params[] = $_GET['category'];
            $types .= 's';
        }

        if (!empty($_GET['location'])) {
            $baseQuery .= " AND e.location LIKE CONCAT('%', ?, '%')";
            $params[] = $_GET['location'];
            $types .= 's';
        }

        if (!empty($_GET['search'])) {
            $baseQuery .= " AND (e.title LIKE CONCAT('%', ?, '%') OR e.description LIKE CONCAT('%', ?, '%'))";
            $params[] = $_GET['search'];
            $params[] = $_GET['search'];
            $types .= 'ss';
        }

        if (!empty($_GET['organizer_id'])) {
            $baseQuery .= " AND e.organizer_id = ?";
            $params[] = (int)$_GET['organizer_id'];
            $types .= 'i';
        }

        $baseQuery .= " ORDER BY e.event_date ASC LIMIT 100";
        $stmt = $db->prepare($baseQuery);
        if (!empty($params)) {
            $stmt->bind_param($types, ...$params);
        }
        $stmt->execute();
        $events = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
        Response::json(['events' => $events]);
    }

    if ($method === 'POST') {
        $data = getJsonInput();
        $required = ['title', 'description', 'category', 'event_date', 'location'];
        foreach ($required as $field) {
            if (empty($data[$field])) {
                Response::json(['error' => "Trūksta lauko: {$field}"], 422);
            }
        }

        $stmt = $db->prepare("INSERT INTO events (title, description, category, location, event_date, price, lat, lng, status, organizer_id) VALUES (?,?,?,?,?,?,?,?, 'pending', ?)");
        $price = isset($data['price']) ? (float)$data['price'] : 0;
        $lat = isset($data['lat']) ? (float)$data['lat'] : 0;
        $lng = isset($data['lng']) ? (float)$data['lng'] : 0;
        $organizer = !empty($data['organizer_id']) ? (int)$data['organizer_id'] : null;
        $stmt->bind_param(
            'sssssdddi',
            $data['title'],
            $data['description'],
            $data['category'],
            $data['location'],
            $data['event_date'],
            $price,
            $lat,
            $lng,
            $organizer
        );
        $stmt->execute();
        Response::json(['message' => 'Renginys užregistruotas', 'id' => $stmt->insert_id], 201);
    }

    if ($method === 'PUT') {
        $data = getJsonInput();
        if (empty($_GET['id'])) {
            Response::json(['error' => 'Nenurodytas renginio ID'], 422);
        }
        $id = (int)$_GET['id'];
        $fields = ['title', 'description', 'category', 'location', 'event_date', 'price', 'lat', 'lng'];
        $setParts = [];
        $params = [];
        $types = '';

        foreach ($fields as $field) {
            if (isset($data[$field])) {
                $setParts[] = "$field = ?";
                $params[] = $data[$field];
                $types .= in_array($field, ['price', 'lat', 'lng'], true) ? 'd' : 's';
            }
        }

        if (!$setParts) {
            Response::json(['error' => 'Nėra laukų atnaujinimui'], 422);
        }

        $params[] = $id;
        $types .= 'i';

        $sql = "UPDATE events SET " . implode(', ', $setParts) . ", updated_at = NOW() WHERE id = ?";
        $stmt = $db->prepare($sql);
        $stmt->bind_param($types, ...$params);
        $stmt->execute();
        Response::json(['message' => 'Renginys atnaujintas']);
    }

    if ($method === 'DELETE') {
        if (empty($_GET['id'])) {
            Response::json(['error' => 'Nenurodytas renginio ID'], 422);
        }
        $id = (int)$_GET['id'];
        $stmt = $db->prepare("DELETE FROM events WHERE id = ?");
        $stmt->bind_param('i', $id);
        $stmt->execute();
        Response::json(['message' => 'Renginys pašalintas']);
    }
}

function handleUsers(mysqli $db): void
{
    $method = $_SERVER['REQUEST_METHOD'];

    if ($method === 'GET') {
        if (empty($_GET['id'])) {
            Response::json(['error' => 'Reikia vartotojo ID'], 422);
        }

        $stmt = $db->prepare("SELECT id, name, email, role, organization, bio, phone, city, interests FROM users WHERE id = ? LIMIT 1");
        $stmt->bind_param('i', $_GET['id']);
        $stmt->execute();
        $user = $stmt->get_result()->fetch_assoc();

        if (!$user) {
            Response::json(['error' => 'Vartotojas nerastas'], 404);
        }

        Response::json(['user' => $user]);
    }

    if ($method === 'POST') {
        $data = getJsonInput();
        $required = ['name', 'email', 'password', 'role'];
        foreach ($required as $field) {
            if (empty($data[$field])) {
                Response::json(['error' => "Trūksta lauko: {$field}"], 422);
            }
        }

        $stmt = $db->prepare("SELECT id FROM users WHERE email = ? LIMIT 1");
        $stmt->bind_param('s', $data['email']);
        $stmt->execute();
        if ($stmt->get_result()->fetch_assoc()) {
            Response::json(['error' => 'El. pašto adresas jau naudojamas'], 409);
        }

        $hash = password_hash($data['password'], PASSWORD_BCRYPT);
        $stmt = $db->prepare("INSERT INTO users (name, email, password_hash, role, organization, bio, phone, city, interests) VALUES (?,?,?,?,?,?,?,?,?)");
        $organization = $data['organization'] ?? null;
        $bio = $data['bio'] ?? null;
        $phone = $data['phone'] ?? null;
        $city = $data['city'] ?? null;
        $interests = $data['interests'] ?? null;
        $stmt->bind_param('sssssssss', $data['name'], $data['email'], $hash, $data['role'], $organization, $bio, $phone, $city, $interests);
        $stmt->execute();

        Response::json([
            'message' => 'Vartotojas sukurtas',
            'user' => [
                'id' => $stmt->insert_id,
                'name' => $data['name'],
                'email' => $data['email'],
                'role' => $data['role'],
                'organization' => $organization,
                'bio' => $bio,
                'phone' => $phone,
                'city' => $city,
                'interests' => $interests,
            ],
        ], 201);
    }

    if ($method === 'PUT') {
        $data = getJsonInput();
        if (empty($data['id'])) {
            Response::json(['error' => 'Trūksta vartotojo ID'], 422);
        }

        $fields = [];
        $params = [];
        $types = '';

        $updatable = ['name', 'email', 'organization', 'bio', 'phone', 'city', 'interests'];
        foreach ($updatable as $field) {
            if (isset($data[$field])) {
                $fields[] = "{$field} = ?";
                $params[] = $data[$field];
                $types .= 's';
            }
        }

        if (isset($data['role'])) {
            $allowedRoles = ['user', 'organizer', 'admin'];
            if (!in_array($data['role'], $allowedRoles, true)) {
                Response::json(['error' => 'Neteisinga rolė'], 422);
            }
            $fields[] = "role = ?";
            $params[] = $data['role'];
            $types .= 's';
        }

        if (!empty($data['password'])) {
            $fields[] = "password_hash = ?";
            $params[] = password_hash($data['password'], PASSWORD_BCRYPT);
            $types .= 's';
        }

        if (!$fields) {
            Response::json(['error' => 'Nenurodyti keistini laukai'], 422);
        }

        $params[] = (int)$data['id'];
        $types .= 'i';
        $query = "UPDATE users SET " . implode(', ', $fields) . " WHERE id = ?";
        $stmt = $db->prepare($query);
        $stmt->bind_param($types, ...$params);
        $stmt->execute();

        Response::json(['message' => 'Profilis atnaujintas']);
    }

    Response::json(['error' => 'Metodas nepalaikomas'], 405);
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        Response::json(['error' => 'Metodas nepalaikomas'], 405);
    }

    $data = getJsonInput();
    $required = ['name', 'email', 'password', 'role'];
    foreach ($required as $field) {
        if (empty($data[$field])) {
            Response::json(['error' => "Trūksta lauko: {$field}"], 422);
        }
    }

    $stmt = $db->prepare("SELECT id FROM users WHERE email = ? LIMIT 1");
    $stmt->bind_param('s', $data['email']);
    $stmt->execute();
    if ($stmt->get_result()->fetch_assoc()) {
        Response::json(['error' => 'El. pašto adresas jau naudojamas'], 409);
    }

    $hash = password_hash($data['password'], PASSWORD_BCRYPT);
    $stmt = $db->prepare("INSERT INTO users (name, email, password_hash, role) VALUES (?,?,?,?)");
    $stmt->bind_param('ssss', $data['name'], $data['email'], $hash, $data['role']);
    $stmt->execute();

    Response::json([
        'message' => 'Vartotojas sukurtas',
        'user' => [
            'id' => $stmt->insert_id,
            'name' => $data['name'],
            'email' => $data['email'],
            'role' => $data['role'],
        ],
    ], 201);
}

function handleFavorites(mysqli $db): void
{
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        Response::json(['error' => 'Metodas nepalaikomas'], 405);
    }

    $data = getJsonInput();
    if (empty($data['user_id']) || empty($data['event_id'])) {
        Response::json(['error' => 'Reikia user_id ir event_id'], 422);
    }

    $tag = !empty($data['tag']) ? $data['tag'] : 'favorite';

    $stmt = $db->prepare("INSERT INTO favorites (user_id, event_id, tag) VALUES (?,?,?) ON DUPLICATE KEY UPDATE tag = VALUES(tag), updated_at = NOW()");
    $stmt->bind_param('iis', $data['user_id'], $data['event_id'], $tag);
    $stmt->execute();
    Response::json(['message' => 'Pažymėta'], 201);
}

function handleRecommendations(mysqli $db): void
{
    $userId = $_GET['user_id'] ?? null;
    $events = [];

    if ($userId) {
        $prefQuery = "SELECT e.category, COUNT(*) as total FROM favorites f JOIN events e ON e.id = f.event_id WHERE f.user_id = ? GROUP BY e.category ORDER BY total DESC LIMIT 3";
        $prefStmt = $db->prepare($prefQuery);
        $prefStmt->bind_param('i', $userId);
        $prefStmt->execute();
        $prefs = $prefStmt->get_result()->fetch_all(MYSQLI_ASSOC);

        if ($prefs) {
            $placeholders = implode(',', array_fill(0, count($prefs), '?'));
            $types = str_repeat('s', count($prefs));
            $query = "SELECT e.*, u.name AS organizer_name FROM events e LEFT JOIN users u ON e.organizer_id = u.id WHERE e.status = 'approved' AND e.category IN ($placeholders) ORDER BY e.event_date ASC LIMIT 10";
            $stmt = $db->prepare($query);
            $values = array_column($prefs, 'category');
            $stmt->bind_param($types, ...$values);
            $stmt->execute();
            $events = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
        }
    }

    if (!$events) {
        $fallback = $db->query("SELECT e.*, u.name AS organizer_name FROM events e LEFT JOIN users u ON e.organizer_id = u.id WHERE e.status = 'approved' ORDER BY e.event_date ASC LIMIT 10");
        $events = $fallback->fetch_all(MYSQLI_ASSOC);
    }

    Response::json(['events' => $events]);
}

function handleAdmin(mysqli $db): void
{
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        Response::json(['error' => 'Metodas nepalaikomas'], 405);
    }

    $data = getJsonInput();

    if (($data['action'] ?? '') === 'update_status') {
        if (empty($data['event_id']) || empty($data['status'])) {
            Response::json(['error' => 'Reikia event_id ir status'], 422);
        }
        $stmt = $db->prepare("UPDATE events SET status = ?, updated_at = NOW() WHERE id = ?");
        $stmt->bind_param('si', $data['status'], $data['event_id']);
        $stmt->execute();

        $eventInfo = $db->prepare("SELECT organizer_id, title FROM events WHERE id = ? LIMIT 1");
        $eventInfo->bind_param('i', $data['event_id']);
        $eventInfo->execute();
        $event = $eventInfo->get_result()->fetch_assoc();

        if ($event && !empty($event['organizer_id'])) {
            $message = $data['status'] === 'approved'
                ? 'Jūsų renginys patvirtintas'
                : 'Jūsų renginys atmestas. Patikslinkite informaciją.';
            $note = $db->prepare("INSERT INTO notifications (user_id, event_id, type, message) VALUES (?,?,?,?)");
            $type = 'status_update';
            $note->bind_param('iiss', $event['organizer_id'], $data['event_id'], $type, $message);
            $note->execute();
        }

        Response::json(['message' => 'Būsena atnaujinta']);
    }

    if (($data['action'] ?? '') === 'block_user') {
        if (empty($data['user_id'])) {
            Response::json(['error' => 'Reikia user_id'], 422);
        }
        $stmt = $db->prepare("UPDATE users SET blocked = 1 WHERE id = ?");
        $stmt->bind_param('i', $data['user_id']);
        $stmt->execute();
        Response::json(['message' => 'Vartotojas užblokuotas']);
    }

    Response::json(['error' => 'Neteisingas veiksmas'], 400);
}
