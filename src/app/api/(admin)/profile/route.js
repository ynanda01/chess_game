import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET - This will fetch the profile of the currently logged in experimenter
export async function GET(request) {
  try {
    const userEmail = request.headers.get('user-email');
    
    if (!userEmail) {
      return NextResponse.json({ message: 'User email required' }, { status: 400 });
    }

    // finding the experimenter by email in the database via prisma
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

  // The database stores the user's full name in a single field.
  // Split it into first and last name so the frontend can display them separately.
    const nameParts = experimenter.name.split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    return NextResponse.json({
      id: experimenter.id,
      firstName,
      lastName,
      email: experimenter.email,
      avatar: null // Add avatar support later if needed (image)
    });

  } catch (error) {
    console.error('Profile fetch error:', error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

// PUT - Update experimenter profile
export async function PUT(request) {
  try {
    const body = await request.json();
    const userEmail = request.headers.get('user-email');
    
    if (!userEmail) {
      return NextResponse.json({ message: 'User email required' }, { status: 400 });
    }

    const { firstName, lastName, email } = body;
    
    // Combine first and last name into a single field  for database storage
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

    // Return the updated profile in the format the frontend expects
    // (split full name into first and last names again)
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