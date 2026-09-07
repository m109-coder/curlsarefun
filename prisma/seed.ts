import { PrismaClient } from '@prisma/client'
import { salonLocations } from '../src/config/locations'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

function getExecutionOrder(service: any): number {
  const nameLower = service.name.toLowerCase()

  if (nameLower.includes('consultation') || nameLower.includes('detangling')) return 10
  if (nameLower.includes('conditioning') || nameLower.includes('gloss')) return 40
  if (service.category === 'haircuts' || nameLower.includes('cut')) return 20
  if (service.category === 'color' || nameLower.includes('highlight') || nameLower.includes('color') || nameLower.includes('tint')) return 30
  if (service.category === 'styling' || nameLower.includes('style') || nameLower.includes('set')) return 50
  if (service.category === 'salon' || nameLower.includes('makeup')) return 60
  return 99
}

async function main() {
  console.log('Starting database seed...')

  // Clean up existing test data so each location gets its exclusive catalog
  console.log('Cleaning existing appointments and services...')
  await prisma.appointment.deleteMany()
  await prisma.service.deleteMany()

  // Create admin user only if it doesn't exist (do not overwrite existing password)
  const adminUser = await prisma.adminUser.upsert({
    where: { email: 'admin@curlsarefun.com' },
    update: {},
    create: {
      email: 'admin@curlsarefun.com',
      name: 'Admin User',
      password: await bcrypt.hash('password123', 10),
      role: 'admin',
    },
  })
  console.log(`Seeded admin user: ${adminUser.email}`)

  // Create services for each location using the real catalog
  for (const location of salonLocations) {
    for (const service of location.services) {
      await prisma.service.upsert({
        where: { id: service.id },
        update: {},
        create: {
          id: service.id,
          locationId: location.id,
          name: service.name,
          description: service.description,
          duration: service.duration,
          price: service.price,
          depositAmount: service.depositAmount,
          category: service.category,
          executionOrder: getExecutionOrder(service),
        },
      })
      console.log(`Seeded service: ${service.name} for ${location.name}`)
    }
  }

  console.log('Database seed completed')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
