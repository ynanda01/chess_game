import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET - Fetch user profile
export async function GET(request) {
  try {
    // Get user info from request headers or body
    const userEmail = request.headers.get('user-email');
    
    if (!userEmail) {
      return NextResponse.json({ message: 'User email required' }, { status: 400 });
    }

    const experimenter = await prisma.experimenters.findUnique({
      where: { email: userEmail },
      select: {
        id: true,
        name: true,
        email: true,
        created_at: true
      }
    });

    if (!experimenter) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    // Split name into firstName and lastName for frontend compatibility
    const nameParts = experimenter.name.split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    return NextResponse.json({
      id: experimenter.id,
      firstName,
      lastName,
      email: experimenter.email,
      avatar: null // Add avatar support later if needed
    });

  } catch (error) {
    console.error('Profile fetch error:', error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

// PUT - Update user profile
export async function PUT(request) {
  try {
    const body = await request.json();
    const userEmail = request.headers.get('user-email');
    
    if (!userEmail) {
      return NextResponse.json({ message: 'User email required' }, { status: 400 });
    }

    const { firstName, lastName, email } = body;
    
    // Combine firstName and lastName
    const fullName = `${firstName || ''} ${lastName || ''}`.trim();

    const updatedExperimenter = await prisma.experimenters.update({
      where: { email: userEmail },
      data: {
        name: fullName,
        email: email || userEmail
      },
      select: {
        id: true,
        name: true,
        email: true
      }
    });

    // Return in frontend format
    const nameParts = updatedExperimenter.name.split(' ');
    const updatedFirstName = nameParts[0] || '';
    const updatedLastName = nameParts.slice(1).join(' ') || '';

    return NextResponse.json({
      id: updatedExperimenter.id,
      firstName: updatedFirstName,
      lastName: updatedLastName,
      email: updatedExperimenter.email,
      avatar: null
    });

  } catch (error) {
    console.error('Profile update error:', error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}