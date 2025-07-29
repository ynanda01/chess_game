// app/api/login/route.js (with enhanced debugging)
import prisma from '../../../../lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(request) {
  try {
    const { Email, password } = await request.json();
    
    // Debug logging
    console.log('=== LOGIN DEBUG ===');
    console.log('Received Email:', Email);
    console.log('Received Password:', password); // Temporarily log actual password for debugging
    console.log('Received Password length:', password?.length);

    // Basic validation
    if (!Email || !password) {
      console.log('❌ Missing email or password');
      return new Response(
        JSON.stringify({ message: 'Email and password are required.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Find user in database
    console.log('🔍 Searching for user with email:', Email);
    const user = await prisma.experimenters.findUnique({
      where: { email: Email },
    });

    if (!user) {
      console.log('❌ User not found in database');
      console.log('Available users:', await prisma.experimenters.findMany({
        select: { id: true, email: true, name: true }
      }));
      return new Response(
        JSON.stringify({ message: 'Invalid email or password.' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ User found:', { id: user.id, email: user.email, name: user.name });

    // Check password
    console.log('🔐 Comparing passwords...');
    console.log('Stored password hash:', user.password);
    console.log('Plain text password to check:', password);
    
    // Try bcrypt comparison
    const validPassword = await bcrypt.compare(password, user.password);
    console.log('BCrypt comparison result:', validPassword);
    
    // Additional debugging - check if the stored password is actually hashed
    const isHashed = user.password.startsWith('$2a$') || user.password.startsWith('$2b$') || user.password.startsWith('$2y$');
    console.log('Password appears to be hashed:', isHashed);
    
    // If the stored password doesn't appear to be hashed, do a direct comparison
    // (This is for debugging only - you should hash your passwords properly!)
    if (!isHashed) {
      console.log('⚠️ WARNING: Password is not hashed! Doing direct comparison for testing...');
      const directMatch = password === user.password;
      console.log('Direct string comparison result:', directMatch);
      
      if (directMatch) {
        console.log('✅ Login successful with direct comparison (INSECURE!)');
        const { password: _, ...userWithoutPassword } = user;
        return new Response(
          JSON.stringify({
            message: 'Login successful (password not hashed - please fix this!)',
            user: userWithoutPassword
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    if (!validPassword) {
      console.log('❌ Password comparison failed');
      
      // Additional debugging: try to hash the password and see what we get
      console.log('🔧 Testing hash generation...');
      const testHash = await bcrypt.hash(password, 10);
      console.log('Test hash for current password:', testHash);
      
      return new Response(
        JSON.stringify({ message: 'Invalid email or password.' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Success
    console.log('✅ Login successful for user:', user.email);
    const { password: _, ...userWithoutPassword } = user;

    return new Response(
      JSON.stringify({
        message: 'Login successful',
        user: userWithoutPassword
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('❌ Login error:', error);
    return new Response(
      JSON.stringify({ message: 'Internal Server Error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}