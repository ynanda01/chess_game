import { NextResponse } from 'next/server';
import prisma from '../../../../../../lib/prisma';

// GET a single condition by ID, including its experiment info and puzzle counts
export async function GET(request, { params }) {
  try {
    const { id } = params;
    
    const conditionId = parseInt(id);
    if (isNaN(conditionId)) {
      return NextResponse.json(
        { message: 'Invalid condition ID format' },
        { status: 400 }
      );
    }

    // Fetch the condition along with its experiment details and puzzle count
    const condition = await prisma.condition.findUnique({
      where: { id: conditionId },
      include: {
        experiment: {
          select: { 
            id: true, 
            name: true, 
            description: true,
            experimenterId: true
          }
        },
        _count: {
          select: { puzzles: true }
        }
      }
    });

    if (!condition) {
      return NextResponse.json(
        { message: 'Condition not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ condition }, { status: 200 });

  } catch (error) {
    return NextResponse.json(
      { message: 'Failed to fetch condition' },
      { status: 500 }
    );
  }
}

// Update a condition by ID
export async function PUT(request, { params }) {
  try {
    const { id } = params;
    const { name, description, adviceformat, timerEnabled, timeLimit } = await request.json();
    
    const conditionId = parseInt(id);
    if (isNaN(conditionId)) {
      return NextResponse.json(
        { message: 'Invalid condition ID format' },
        { status: 400 }
      );
    }

    // First it will check if the condition is exists or not
    const existingCondition = await prisma.condition.findUnique({
      where: { id: conditionId },
      include: {
        experiment: true
      }
    });

    if (!existingCondition) {
      return NextResponse.json(
        { message: 'Condition not found' },
        { status: 404 }
      );
    }

    // If a new name was provided, check for duplicates inside the same experiment
    if (name && name.trim() !== existingCondition.name) {
      const trimmedName = name.trim();
      const existingConditions = await prisma.condition.findMany({
        where: {
          experimentId: existingCondition.experimentId,
          id: { not: conditionId }
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
    }

    // Updating the condition with the provided fields
    // Only the fields that are provided in the request body will be updated.
    const updatedCondition = await prisma.condition.update({
      where: { id: conditionId },
      data: {
        name: name?.trim() || existingCondition.name,
        description: description !== undefined ? (description?.trim() || null) : existingCondition.description,
        adviceformat: adviceformat || existingCondition.adviceformat,
        timerEnabled: timerEnabled !== undefined ? Boolean(timerEnabled) : existingCondition.timerEnabled,
        timeLimit: timeLimit !== undefined ? (timeLimit ? parseInt(timeLimit) : null) : existingCondition.timeLimit
      },
      include: {
        _count: {
          select: { puzzles: true }
        }
      }
    });

    return NextResponse.json({
      message: 'Condition updated successfully',
      condition: updatedCondition
    }, { status: 200 });

  } catch (error) {
    return NextResponse.json({
      message: 'Failed to update condition',
      error: error.message 
    }, { status: 500 });
  }
}

// Delete a condition by its ID
export async function DELETE(request, { params }) {
  try {
    const { id } = params;
    
    const conditionId = parseInt(id);
    if (isNaN(conditionId)) {
      return NextResponse.json(
        { message: 'Invalid condition ID format' },
        { status: 400 }
      );
    }

    // Check if condition exists before deleting
    const existingCondition = await prisma.condition.findUnique({
      where: { id: conditionId },
      include: {
        _count: {
          select: { puzzles: true }
        }
      }
    });

    if (!existingCondition) {
      return NextResponse.json(
        { message: 'Condition not found' },
        { status: 404 }
      );
    }

    // Delete the condition (this will also delete associated puzzles due to cascading)
    await prisma.condition.delete({
      where: { id: conditionId }
    });

    return NextResponse.json({
      message: 'Condition and associated puzzles deleted successfully'
    }, { status: 200 });

  } catch (error) {
    return NextResponse.json({
      message: 'Failed to delete condition',
      error: error.message 
    }, { status: 500 });
  }
}
