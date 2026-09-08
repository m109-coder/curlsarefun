require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.appointment.findMany({
  orderBy: { createdAt: 'desc' },
  take: 5,
  include: { services: true },
}).then((list) => {
  for (const a of list) {
    console.log(JSON.stringify({
      id: a.id,
      status: a.status,
      total: String(a.totalAmount),
      depositPaid: a.depositPaid,
      guests: a.guestCount,
      createdAt: a.createdAt,
      services: a.services.map((s) => ({ name: s.name, price: String(s.price), deposit: String(s.depositAmount) })),
    }));
  }
}).finally(() => p.$disconnect());
