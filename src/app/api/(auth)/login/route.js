import prisma from '../../../../../lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(request) {
  try {
    const { Email, password } = await request.json();

    // Checking required fields
    if (!Email || !password) {
      return new Response(
        JSON.stringify({ message: 'Email and password are required.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Find the user in database
    const user = await prisma.experimenters.findUnique({
      where: { email: Email },
    });

    if (!user) {
      return new Response(
        JSON.stringify({ message: 'Invalid email or password.' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Checking the password
    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      return new Response(
        JSON.stringify({ message: 'Invalid email or password.' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Return user data without password
    const { password: _, ...userWithoutPassword } = user;

    return new Response(
      JSON.stringify({
        message: 'Login successful',
        user: userWithoutPassword
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Login error:', error);
    return new Response(
      JSON.stringify({ message: 'Internal Server Error please check' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}