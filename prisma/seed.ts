import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting DinePilot Development Database Seed...');

  const devEmail = 'dev.owner@dinepilot.local';
  const existingUser = await prisma.user.findUnique({
    where: { email: devEmail },
  });

  if (existingUser) {
    console.log('ℹ️ Development user already exists:', devEmail);
    return;
  }

  const passwordHash = await bcrypt.hash('DevPassword123!', 10);

  const user = await prisma.user.create({
    data: {
      firstName: 'Dev',
      lastName: 'Owner',
      email: devEmail,
      passwordHash,
      emailVerified: true,
    },
  });

  console.log('✅ Created development user:', user.email);
  console.log('🔑 Credentials -> Email:', devEmail, '| Password: DevPassword123!');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
