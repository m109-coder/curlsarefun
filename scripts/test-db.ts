import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testDatabase() {
  try {
    console.log('=== VERIFICACIÓN DE BASE DE DATOS ===');
    
    const user = await prisma.adminUser.findUnique({
      where: { email: 'admin@curlsarefun.com' }
    });
    
    if (!user) {
      console.log('❌ Usuario NO encontrado en la base de datos');
      console.log('El seed probablemente falló. Ejecutando seed...');
      
      // Try to seed
      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash('password123', 10);
      
      const newUser = await prisma.adminUser.create({
        data: {
          email: 'admin@curlsarefun.com',
          name: 'Admin User',
          password: hashedPassword,
          role: 'admin',
        },
      });
      
      console.log('✅ Usuario creado:', newUser.email);
    } else {
      console.log('✅ Usuario encontrado en la base de datos');
      console.log('Detalles:', {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        hasPassword: !!user.password,
        passwordLength: user.password?.length,
        passwordPrefix: user.password?.substring(0, 10),
      });
    }
  } catch (error) {
    console.error('❌ Error al verificar base de datos:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testDatabase();