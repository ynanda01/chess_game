import { NextResponse } from 'next/server';
import prisma from '../../../../../lib/prisma';

export async function POST(request) {
  try {
    const { experimentId, name, description, adviceformat, timerEnabled, timeLimit, order } = await request.json();

    // Required fields are validating
    if (!experimentId) {
      return NextResponse.json(
        { message: 'Experiment ID is required' },
        { status: 400 }
      );
    }

    if (!name || !name.trim()) {
      return NextResponse.json(
        { message: 'Condition name is required' },
        { status: 400 }
      );
    }

    if (!adviceformat) {
      return NextResponse.json(
        { message: 'Advice format is required' },
        { status: 400 }
      );
    }

    // Converting the experimentId to a number and check if it's valid.
    // If it's not a valid number, return a 400 Bad Request response
    // with an error message instead of continuing.

    const expId = parseInt(experimentId);
    if (isNaN(expId)) {
      return NextResponse.json(
        { message: 'Invalid experiment ID format' },
        { status: 400 }
      );
    }

    // Verifying the experiment exists
    const existingExperiment = await prisma.experiment.findUnique({
      where: { id: expId }
    });

    if (!existingExperiment) {
      return NextResponse.json(
        { message: 'Experiment not found' },
        { status: 404 }
      );
    }

    // Check for the duplicate condition names within this experiment
    const trimmedName = name.trim();
    const existingConditions = await prisma.condition.findMany({
      where: {
        experimentId: expId
      }
    });

    const duplicateCondition = existingConditions.find(
      condition => condition.name.toLowerCase() === trimmedName.toLowerCase()
    );

    if (duplicateCondition) {
      return NextResponse.json(
        { message: 'A condition with this name already exists in this experiment' },
        { status: 400 }
      );
    }

    // Determine the next available order number for a new condition.
    // Orders are checked in ascending order, and the first gap in the sequence
    // is filled (for example 1,2,4], the next order will be 3).
    // If no gaps exist, the next highest number is used.
    const existingOrders = existingConditions.map(c => c.order).sort((a, b) => a - b);
    
    let nextOrder = 1;
    for (let i = 0; i < existingOrders.length; i++) {
      if (existingOrders[i] === nextOrder) {
        nextOrder++;
      } else {
        break;
      }
    }

    // Creating the new condition
    const condition = await prisma.condition.create({
      data: {
        experimentId: expId,
        name: trimmedName,
        description: description?.trim() || null,
        adviceformat: adviceformat,
        timerEnabled: Boolean(timerEnabled),
        timeLimit: timeLimit ? parseInt(timeLimit) : null,
        order: nextOrder
      },
      include: {
        _count: {
          select: { puzzles: true }
        }
      }
    });

    return NextResponse.json({
      message: 'Condition saved successfully',
      condition: condition
    }, { status: 201 });
    
  } catch (error) {
    console.error('Error saving condition:', error);
    
    // Handle Prisma unique constraint errors (P2002).
    // If the conflict is on the "name" field, return a 400 response
    if (error.code === 'P2002') {
      if (error.meta?.target?.includes('name')) {
        return NextResponse.json(
          { message: 'A condition with this name already exists in this experiment' },
          { status: 400 }
        );
      }
      if (error.meta?.target?.includes('order')) {
        return NextResponse.json(
          { message: 'Order conflict detected. Please try again.' },
          { status: 400 }
        );
      }
      
      // Normal duplicate conditons checking.
      return NextResponse.json(
        { message: 'A duplicate condition already exists' },
        { status: 400 }
      );
    }
    
    return NextResponse.json({
      message: 'Failed to save condition',
      error: error.message 
    }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const experimentId = searchParams.get('experimentId');

    if (!experimentId) {
      return NextResponse.json(
        { message: 'Experiment ID is required' },
        { status: 400 }
      );
    }

    const expId = parseInt(experimentId);
    if (isNaN(expId)) {
      return NextResponse.json(
        { message: 'Invalid experiment ID format' },
        { status: 400 }
      );
    }

    // Fetch all conditions for the experiment, ordered by their sequence
    const conditions = await prisma.condition.findMany({
      where: { experimentId: expId },
      orderBy: { order: 'asc' },
      include: {
        _count: {
          select: { puzzles: true }
        }
      }
    });

    return NextResponse.json({ conditions }, { status: 200 });

  } catch (error) {
    console.error('Error fetching conditions:', error);
    return NextResponse.json(
      { message: 'Failed to fetch conditions' },
      { status: 500 }
    );
  }
}