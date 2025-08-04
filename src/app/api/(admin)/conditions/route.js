// app/api/conditions/route.js
import { NextResponse } from 'next/server';
import prisma from '../../../../../lib/prisma';

export async function POST(request) {
  try {
    const { experimentId, name, description, adviceformat, timerEnabled, timeLimit, order } = await request.json();

    console.log('=== CONDITIONS API DEBUG ===');
    console.log('Received data:', { experimentId, name, description, adviceformat, timerEnabled, timeLimit, order });

    // Validation
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

    const expId = parseInt(experimentId);
    if (isNaN(expId)) {
      return NextResponse.json(
        { message: 'Invalid experiment ID format' },
        { status: 400 }
      );
    }

    // Check if experiment exists
    const existingExperiment = await prisma.experiment.findUnique({
      where: { id: expId }
    });

    if (!existingExperiment) {
      return NextResponse.json(
        { message: 'Experiment not found' },
        { status: 404 }
      );
    }

    // Check for duplicate condition names in this experiment (case-insensitive)
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

    // FIXED: Find the lowest available order (fills gaps from deletions)
    const existingOrders = existingConditions.map(c => c.order).sort((a, b) => a - b);
    
    let nextOrder = 1;
    for (let i = 0; i < existingOrders.length; i++) {
      if (existingOrders[i] === nextOrder) {
        nextOrder++;
      } else {
        // Found a gap, use this order
        break;
      }
    }

    console.log(`📊 Existing orders: [${existingOrders.join(', ')}], assigning order: ${nextOrder}`);

    // Create new condition
    const condition = await prisma.condition.create({
      data: {
        experimentId: expId,
        name: trimmedName,
        description: description?.trim() || null,
        adviceformat: adviceformat,
        timerEnabled: Boolean(timerEnabled),
        timeLimit: timeLimit ? parseInt(timeLimit) : null,
        order: nextOrder  // Use calculated order that fills gaps
      },
      include: {
        _count: {
          select: { puzzles: true }
        }
      }
    });

    console.log('✅ Condition created successfully:', condition);

    return NextResponse.json({
      message: 'Condition saved successfully',
      condition: condition
    }, { status: 201 });
    
  } catch (error) {
    console.error('❌ Error saving condition:', error);
    
    // Handle unique constraint violations with more detailed error info
    if (error.code === 'P2002') {
      console.log('Unique constraint error details:', error.meta);
      
      if (error.meta?.target?.includes('name')) {
        return NextResponse.json(
          { message: 'A condition with this name already exists in this experiment' },
          { status: 400 }
        );
      }
      if (error.meta?.target?.includes('order')) {
        // This should be rare now with the fixed logic, but just in case
        return NextResponse.json(
          { message: 'Order conflict detected. Please try again.' },
          { status: 400 }
        );
      }
      
      // Generic unique constraint error
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

    // Get all conditions for this experiment with puzzle counts
    const conditions = await prisma.condition.findMany({
      where: { experimentId: expId },
      orderBy: { order: 'asc' },
      include: {
        _count: {
          select: { puzzles: true }
        }
      }
    });

    console.log(`✅ Found ${conditions.length} conditions for experiment ${experimentId}`);

    return NextResponse.json({ conditions }, { status: 200 });

  } catch (error) {
    console.error('❌ Error fetching conditions:', error);
    return NextResponse.json(
      { message: 'Failed to fetch conditions' },
      { status: 500 }
    );
  }
}