import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function rehashPassword() {
  try {
    console.log('=== REHASHING PASSWORD WITH BCRYPTJS ===');
    
    const hashedPassword = await bcrypt.hash('password123', 10);
    console.log('Nuevo hash generado:', hashedPassword.substring(0, 20) + '...');
    
    const user = await prisma.adminUser.update({
      where: { email: 'admin@curlsarefun.com' },
      data: { password: hashedPassword },
    });
    
    console.log('✅ Contraseña actualizada para:', user.email);
    console.log('Nuevo hash:', user.password.substring(0, 20) + '...');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

rehashPassword();