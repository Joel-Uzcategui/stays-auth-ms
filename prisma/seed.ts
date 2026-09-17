import 'dotenv/config';
import * as bcrypt from 'bcryptjs';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL?.toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;
  const fullName = process.env.SEED_ADMIN_NAME ?? 'Admin';

  if (!email || !password) {
    throw new Error('Missing SEED_ADMIN_EMAIL or SEED_ADMIN_PASSWORD in .env');
  }

  const admin = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      fullName,
      passwordHash: await bcrypt.hash(password, 10),
      role: 'admin',
    },
  });

  console.log(`Admin ready: ${admin.email} (${admin.role})`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
