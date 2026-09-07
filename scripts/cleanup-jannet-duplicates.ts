import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const targetName = 'jannet';

  // Find client
  const client = await prisma.client.findFirst({
    where: { name: { equals: targetName, mode: 'insensitive' } },
    include: {
      appointments: {
        include: { services: true },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!client) {
    console.log(`No client found with name "${targetName}"`);
    return;
  }

  console.log(`Client: ${client.name} (${client.email})`);
  console.log(`Total appointments: ${client.appointments.length}`);

  // Filter Boston Women Dry Cut duplicates
  const duplicates = client.appointments.filter(
    (a) => a.locationId === 'boston' && a.services.some(s => s.name === 'Women Dry Cut')
  );

  if (duplicates.length <= 1) {
    console.log(`No duplicates for Boston Women Dry Cut (found ${duplicates.length})`);
    return;
  }

  console.log(`Found ${duplicates.length} duplicate Boston Women Dry Cut appointments.`);
  duplicates.forEach((a) => {
    console.log(`  - ${a.id} | ${a.date.toISOString()} | ${a.startTime} | createdAt ${a.createdAt.toISOString()}`);
  });

  // Keep the most recent one, delete the rest
  const [keep, ...remove] = duplicates;
  const removeIds = remove.map((a) => a.id);

  console.log(`\nKeeping: ${keep.id}`);
  console.log(`Removing: ${removeIds.join(', ')}`);

  const deleted = await prisma.appointment.deleteMany({
    where: { id: { in: removeIds } },
  });

  console.log(`Deleted ${deleted.count} duplicate appointment(s).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
