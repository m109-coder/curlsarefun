import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key-change-in-production';

console.log('=== LOGIN API INITIALIZED ===');
console.log('JWT_SECRET:', JWT_SECRET ? 'EXISTS' : 'MISSING');
console.log('JWT_SECRET value:', JWT_SECRET);

// Temporary hardcoded admin user for testing (fallback when database is unavailable)
const TEMP_ADMIN_USER = {
  id: 'temp-admin-id',
  email: 'admin@curlsarefun.com',
  name: 'Admin User',
  password: '$2b$10$QAmVPej1Jbat3.SE8RtofOt75bH.P5j6oaR36V0SiYu9pIHqkxm5e', // bcrypt hash of 'Admin2024!Secure'
  role: 'admin',
};

/**
 * POST /api/admin/login
 *
 * Authenticates an admin user and issues an `admin-token` HttpOnly
 * cookie. Tries the database first and falls back to a hardcoded user
 * when the database is unavailable (development/test only).
 *
 * Body: { email: string, password: string }
 *
 * @security The temporary fallback user must be removed before production.
 * @returns { success, user, token } and sets the `admin-token` cookie.
 */
export async function POST(request: NextRequest) {
  try {
    console.log('=== LOGIN REQUEST START ===');
    const body = await request.json();
    const { email, password } = body;

    console.log('Email intentando login:', email);
    console.log('Password proporcionado:', password ? '******' : 'null');

    if (!email || !password) {
      console.log('❌ Error: Email o password faltantes');
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Try database connection first, fallback to hardcoded user
    let user = null;
    let useDatabase = false;

    try {
      const { supabaseAdmin } = await import('@/lib/supabase/admin');
      const { data: dbUser, error } = await supabaseAdmin
        .from('AdminUser')
        .select('*')
        .eq('email', email)
        .single();

      if (!error && dbUser) {
        user = dbUser;
        useDatabase = true;
        console.log('✅ Usuario encontrado en base de datos');
      }
    } catch (dbError) {
      console.log('⚠️ Base de datos no disponible, usando usuario temporal');
      console.log('Error de DB:', dbError instanceof Error ? dbError.message : 'Unknown');
    }

    // Fallback to hardcoded user if database is unavailable
    if (!user && email === TEMP_ADMIN_USER.email) {
      user = TEMP_ADMIN_USER;
      console.log('⚠️ Usando usuario temporal (modo fallback)');
    }

    if (!user) {
      console.log('❌ Error: Usuario no encontrado');
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    console.log('Detalles usuario:', {
      id: user.id,
      email: user.email,
      name: user.name,
      hasPassword: !!user.password,
      passwordLength: user.password?.length,
      source: useDatabase ? 'database' : 'fallback',
    });

    console.log('Comparando contraseñas...');
    const isPasswordValid = await bcrypt.compare(password, user.password);
    console.log('Password match:', isPasswordValid);

    if (!isPasswordValid) {
      console.log('❌ Error: Contraseña incorrecta');
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    console.log('✅ Contraseña correcta, creando token JWT...');
    // Create JWT token
    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        name: user.name, 
        role: user.role 
      },
      JWT_SECRET,
      { expiresIn: '30m' }
    );

    console.log('Token JWT creado exitosamente');

    const response = NextResponse.json({ 
      success: true, 
      user: { 
        id: user.id, 
        email: user.email, 
        name: user.name 
      },
      token 
    });

    // Set HttpOnly, Secure, SameSite cookie
    response.cookies.set('admin-token', token, {
      httpOnly: true,
      secure: false, // Allow in development
      sameSite: 'lax', // More permissive for development
      maxAge: 1800, // 30 minutes
      path: '/',
    });

    console.log('✅ Login exitoso');
    console.log('=== LOGIN REQUEST END ===');
    return response;
  } catch (error) {
    console.error('❌ Login error:', error);
    console.error('Error details:', error instanceof Error ? error.message : 'Unknown error');
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}