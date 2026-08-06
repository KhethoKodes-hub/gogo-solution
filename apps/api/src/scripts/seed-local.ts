import 'reflect-metadata';
import { config as loadEnv } from 'dotenv';
import { hash } from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import { DataSource, Repository } from 'typeorm';
import { BookingEntity } from '../app/entities/booking.entity';
import { OAuthClientEntity } from '../app/entities/oauth-client.entity';
import { PointEntity } from '../app/entities/point.entity';
import { PriceEntity } from '../app/entities/price.entity';
import { RouteEntity } from '../app/entities/route.entity';
import { ShuttleEntity } from '../app/entities/shuttle.entity';
import { UserEntity } from '../app/entities/user.entity';

loadEnv({ path: '.env.local' });
loadEnv({ path: '.env' });

const dataSource = new DataSource({
  type: 'mariadb',
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || '3306'),
  username: process.env.DB_USER || 'gogo_app',
  password: process.env.DB_PASSWORD || 'gogo_app_pw',
  database: process.env.DB_NAME || 'gogo_shuttles_platform',
  entities: [
    RouteEntity,
    PointEntity,
    ShuttleEntity,
    PriceEntity,
    BookingEntity,
    UserEntity,
    OAuthClientEntity,
  ],
  synchronize: true,
  logging: false,
});

async function seed() {
  await dataSource.initialize();

  const routesRepo = dataSource.getRepository(RouteEntity);
  const shuttleRepo = dataSource.getRepository(ShuttleEntity);
  const pricesRepo = dataSource.getRepository(PriceEntity);
  const usersRepo = dataSource.getRepository(UserEntity);
  const oauthRepo = dataSource.getRepository(OAuthClientEntity);

  await seedRoutes(routesRepo);
  await seedShuttles(shuttleRepo);

  const allRoutes = await routesRepo.find({ order: { id: 'ASC' } });
  const allShuttles = await shuttleRepo.find({ order: { id: 'ASC' } });
  await seedPrices(pricesRepo, allRoutes, allShuttles);

  const demoUserEmail = process.env.SEED_DEMO_USER_EMAIL || 'demo@gogoshuttles.local';
  const demoUserPassword = process.env.SEED_DEMO_USER_PASSWORD || generateDevSecret();
  await seedDemoUser(usersRepo, demoUserEmail, demoUserPassword);

  const m2mClientId = process.env.M2M_DEV_CLIENT_ID || 'local-bff';
  const m2mClientSecret = process.env.M2M_DEV_CLIENT_SECRET || generateDevSecret();
  await seedOauthClient(oauthRepo, m2mClientId, m2mClientSecret);

  await dataSource.destroy();

  console.log('Seed complete');
  console.log(`Demo user: ${demoUserEmail}`);
  console.log(`Demo password: ${demoUserPassword}`);
}

async function seedRoutes(routesRepo: Repository<RouteEntity>) {
  const routeSamples = [
    {
      start: 'OR Tambo International Airport',
      end: 'Sandton',
      distance: '28',
      name: 'Airport to Sandton',
      travelTime: '35 min',
      schools: null,
    },
    {
      start: 'Pretoria',
      end: 'Johannesburg',
      distance: '55',
      name: 'Pretoria to Johannesburg',
      travelTime: '50 min',
      schools: null,
    },
  ];

  for (const row of routeSamples) {
    const existing = await routesRepo.findOne({ where: { start: row.start, end: row.end } });
    if (!existing) {
      await routesRepo.save(routesRepo.create(row));
    }
  }
}

async function seedShuttles(shuttleRepo: Repository<ShuttleEntity>) {
  const shuttleSamples = [
    { capacity: 4, name: 'Compact Line', number: 'CLS-001' },
    { capacity: 15, name: 'Semi Lux', number: 'SLX-015' },
  ];

  for (const row of shuttleSamples) {
    const existing = await shuttleRepo.findOne({ where: { number: row.number } });
    if (!existing) {
      await shuttleRepo.save(shuttleRepo.create(row));
    }
  }
}

async function seedPrices(
  pricesRepo: Repository<PriceEntity>,
  allRoutes: RouteEntity[],
  allShuttles: ShuttleEntity[]
) {
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

    const existing = await pricesRepo.findOne({
      where: {
        route_id: route.id,
        shuttle_id: shuttle.id,
        shuttle_capacity: String(shuttle.capacity ?? ''),
      },
    });

    if (!existing) {
      await pricesRepo.save(
        pricesRepo.create({
          route_id: route.id,
          rout_id: route.id,
          shuttle_id: shuttle.id,
          shuttle_capacity: String(shuttle.capacity ?? ''),
          price: row.price,
          round_price: row.round_price,
        })
      );
    }
  }
}

async function seedDemoUser(
  usersRepo: Repository<UserEntity>,
  demoUserEmail: string,
  demoUserPassword: string
) {
  const demoUser = await usersRepo.findOne({ where: { email: demoUserEmail } });
  if (!demoUser) {
    await usersRepo.save(
      usersRepo.create({
        email: demoUserEmail,
        passwordHash: await hash(demoUserPassword, 10),
        displayName: 'Demo School User',
        role: 'school',
        contactNumber: '+27110000000',
        schoolId: null,
      })
    );
  }
}

async function seedOauthClient(
  oauthRepo: Repository<OAuthClientEntity>,
  clientId: string,
  clientSecret: string
) {
  const client = await oauthRepo.findOne({ where: { clientId } });
  if (!client) {
    await oauthRepo.save(
      oauthRepo.create({
        clientId,
        clientSecretHash: await hash(clientSecret, 10),
        allowedScopes: process.env.M2M_DEV_SCOPES || 'api.read api.write',
        isActive: true,
        name: 'Local BFF Client',
      })
    );
  }
}

function generateDevSecret() {
  return randomBytes(16).toString('hex');
}

seed().catch(async (error) => {
  console.error('Seed failed', error);
  if (dataSource.isInitialized) {
    await dataSource.destroy();
  }
  process.exit(1);
});
