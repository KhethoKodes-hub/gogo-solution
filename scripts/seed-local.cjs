const mysql = require('mysql2/promise');
const { hash } = require('bcryptjs');
const { config } = require('dotenv');

config({ path: '.env.local' });
config({ path: '.env' });

async function createDatabase(socketPath, dbName) {
  const bootstrapConnection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'gogo_app',
    password: process.env.DB_PASSWORD || 'gogo_app_pw',
    ...(socketPath ? { socketPath } : {}),
  });

  await bootstrapConnection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
  await bootstrapConnection.end();
}

async function createSeedConnection(socketPath, dbName) {
  return mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'gogo_app',
    password: process.env.DB_PASSWORD || 'gogo_app_pw',
    database: dbName,
    ...(socketPath ? { socketPath } : {}),
    multipleStatements: true,
  });
}

async function createTables(connection) {
  await connection.query(`
    CREATE TABLE IF NOT EXISTS wp_route (
      id INT PRIMARY KEY AUTO_INCREMENT,
      start TEXT NOT NULL,
      end TEXT NOT NULL,
      distance VARCHAR(50) NULL,
      name TEXT NULL,
      travel_time TEXT NULL,
      schools LONGTEXT NULL
    );

    CREATE TABLE IF NOT EXISTS wp_shuttle (
      id INT PRIMARY KEY AUTO_INCREMENT,
      capacity INT NULL,
      name VARCHAR(50) NULL,
      number VARCHAR(50) NULL
    );

    CREATE TABLE IF NOT EXISTS wp_price (
      id INT PRIMARY KEY AUTO_INCREMENT,
      rout_id INT NULL,
      route_id INT NULL,
      shuttle_id INT NULL,
      shuttle_capacity VARCHAR(50) NULL,
      price DECIMAL(12,2) NULL,
      round_price DECIMAL(12,2) NULL
    );

    CREATE TABLE IF NOT EXISTS app_users (
      id INT PRIMARY KEY AUTO_INCREMENT,
      email VARCHAR(120) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      display_name VARCHAR(120) NOT NULL,
      role VARCHAR(30) NOT NULL DEFAULT 'school',
      contact_number VARCHAR(50) NULL,
      school_id INT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS app_oauth_clients (
      id INT PRIMARY KEY AUTO_INCREMENT,
      client_id VARCHAR(120) NOT NULL UNIQUE,
      client_secret_hash VARCHAR(255) NOT NULL,
      allowed_scopes VARCHAR(255) NOT NULL DEFAULT '',
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      name VARCHAR(120) NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS wp_booking (
      id INT PRIMARY KEY AUTO_INCREMENT,
      booking_id VARCHAR(50) NULL,
      rout_id INT NULL,
      shuttle_id INT NULL,
      shuttle_number VARCHAR(50) NULL,
      bus_capacity VARCHAR(50) NULL,
      route_start TEXT NULL,
      route_end TEXT NULL,
      price VARCHAR(255) NULL,
      purchase_order TEXT NULL,
      customer_id INT NULL,
      customer_info VARCHAR(255) NULL,
      booking_status VARCHAR(50) NULL,
      booking_date DATE NULL,
      booking_time VARCHAR(20) NULL,
      contact_name VARCHAR(120) NULL,
      contact_person_no VARCHAR(50) NULL,
      last_updated VARCHAR(30) NULL,
      payment_status VARCHAR(50) NULL
    );
  `);
}

async function seedRoutes(connection) {
  const routes = [
    {
      start: 'OR Tambo International Airport',
      end: 'Sandton',
      distance: '28',
      name: 'Airport to Sandton',
      travel_time: '35 min',
    },
    {
      start: 'Pretoria',
      end: 'Johannesburg',
      distance: '55',
      name: 'Pretoria to Johannesburg',
      travel_time: '50 min',
    },
  ];

  for (const route of routes) {
    const [found] = await connection.query('SELECT id FROM wp_route WHERE start = ? AND end = ? LIMIT 1', [route.start, route.end]);
    if (!found.length) {
      await connection.query(
        'INSERT INTO wp_route (start, end, distance, name, travel_time, schools) VALUES (?, ?, ?, ?, ?, NULL)',
        [route.start, route.end, route.distance, route.name, route.travel_time]
      );
    }
  }
}

async function seedShuttles(connection) {
  const shuttles = [
    { capacity: 4, name: 'Compact Line', number: 'CLS-001' },
    { capacity: 15, name: 'Semi Lux', number: 'SLX-015' },
  ];

  for (const shuttle of shuttles) {
    const [found] = await connection.query('SELECT id FROM wp_shuttle WHERE number = ? LIMIT 1', [shuttle.number]);
    if (!found.length) {
      await connection.query('INSERT INTO wp_shuttle (capacity, name, number) VALUES (?, ?, ?)', [shuttle.capacity, shuttle.name, shuttle.number]);
    }
  }
}

async function seedPrices(connection) {
  const [allRoutes] = await connection.query('SELECT id, start, end FROM wp_route ORDER BY id ASC LIMIT 2');
  const [allShuttles] = await connection.query('SELECT id, capacity FROM wp_shuttle ORDER BY id ASC LIMIT 2');

  if (!allRoutes.length || !allShuttles.length) {
    return;
  }

  const priceSeed = [
    { routeIndex: 0, shuttleIndex: 0, price: '480.00', round_price: '960.00' },
    { routeIndex: 0, shuttleIndex: 1, price: '790.00', round_price: '1580.00' },
    { routeIndex: 1, shuttleIndex: 0, price: '620.00', round_price: '1240.00' },
    { routeIndex: 1, shuttleIndex: 1, price: '980.00', round_price: '1960.00' },
  ];

  for (const row of priceSeed) {
    const route = allRoutes[row.routeIndex];
    const shuttle = allShuttles[row.shuttleIndex];
    if (!route || !shuttle) {
      continue;
    }

    const shuttleCapacity = String(shuttle.capacity || '');
    const [found] = await connection.query(
      'SELECT id FROM wp_price WHERE route_id = ? AND shuttle_id = ? AND shuttle_capacity = ? LIMIT 1',
      [route.id, shuttle.id, shuttleCapacity]
    );

    if (!found.length) {
      await connection.query(
        'INSERT INTO wp_price (rout_id, route_id, shuttle_id, shuttle_capacity, price, round_price) VALUES (?, ?, ?, ?, ?, ?)',
        [route.id, route.id, shuttle.id, shuttleCapacity, row.price, row.round_price]
      );
    }
  }
}

async function seedDemoUser(connection) {
  const demoUserEmail = process.env.SEED_DEMO_USER_EMAIL || 'demo@gogoshuttles.local';
  const demoUserPassword = process.env.SEED_DEMO_USER_PASSWORD || 'DemoPass123!';
  const [existingUser] = await connection.query('SELECT id FROM app_users WHERE email = ? LIMIT 1', [demoUserEmail]);

  if (!existingUser.length) {
    const passwordHash = await hash(demoUserPassword, 10);
    await connection.query(
      'INSERT INTO app_users (email, password_hash, display_name, role, contact_number, school_id) VALUES (?, ?, ?, ?, ?, NULL)',
      [demoUserEmail, passwordHash, 'Demo School User', 'school', '+27110000000']
    );
  }

  return { demoUserEmail, demoUserPassword };
}

async function seedM2mClient(connection) {
  const m2mClientId = process.env.M2M_DEV_CLIENT_ID || 'local-bff';
  const m2mClientSecret = process.env.M2M_DEV_CLIENT_SECRET || 'local-dev-secret-please-change';
  const [existingClient] = await connection.query('SELECT id FROM app_oauth_clients WHERE client_id = ? LIMIT 1', [m2mClientId]);

  if (!existingClient.length) {
    const secretHash = await hash(m2mClientSecret, 10);
    await connection.query(
      'INSERT INTO app_oauth_clients (client_id, client_secret_hash, allowed_scopes, is_active, name) VALUES (?, ?, ?, 1, ?)',
      [m2mClientId, secretHash, process.env.M2M_DEV_SCOPES || 'api.read api.write', 'Local BFF Client']
    );
  }
}

async function seed() {
  const socketPath = process.env.DB_SOCKET_PATH;
  const dbName = process.env.DB_NAME || 'gogo_shuttles_platform';

  await createDatabase(socketPath, dbName);
  const connection = await createSeedConnection(socketPath, dbName);

  await createTables(connection);
  await seedRoutes(connection);
  await seedShuttles(connection);
  await seedPrices(connection);
  const { demoUserEmail, demoUserPassword } = await seedDemoUser(connection);
  await seedM2mClient(connection);

  await connection.end();

  console.log('Seed complete');
  console.log(`Demo user: ${demoUserEmail}`);
  console.log(`Demo password: ${demoUserPassword}`);
}

seed().catch((error) => {
  console.error('Seed failed', error.message || error);
  process.exit(1);
});
