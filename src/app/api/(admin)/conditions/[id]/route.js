// app/api/conditions/[id]/route.js
import { NextResponse } from 'next/server';
import prisma from '../../../../../../lib/prisma';

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    
    const conditionId = parseInt(id);
    if (isNaN(conditionId)) {
      return NextResponse.json(
        { message: 'Invalid condition ID format' },
        { status: 400 }
      );
    }

    const condition = await prisma.condition.findUnique({
      where: { id: conditionId },
      include: {
        experiment: {
          select: { 
            id: true, 
            name: true, 
            description: true,
            adviceformat: true,
            timerEnabled: true,
            timeLimit: true,
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

    console.log('✅ Fetched condition:', condition.name);

    return NextResponse.json({ condition }, { status: 200 });

  } catch (error) {
    console.error('❌ Error fetching condition:', error);
    return NextResponse.json(
      { message: 'Failed to fetch condition' },
      { status: 500 }
    );
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const { name, description, adviceformat, timerEnabled, timeLimit } = await request.json();
    
    const conditionId = parseInt(id);
    if (isNaN(conditionId)) {
      return NextResponse.json(
        { message: 'Invalid condition ID format' },
        { status: 400 }
      );
    }

    // Check if condition exists
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

    // Check for duplicate condition names in the same experiment (excluding current condition)
    if (name && name.trim() !== existingCondition.name) {
      const trimmedName = name.trim();
      const existingConditions = await prisma.condition.findMany({
        where: {
          experimentId: existingCondition.experimentId,
          id: {
            not: conditionId
          }
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

    // Update condition
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

    console.log('✅ Condition updated:', updatedCondition.name);

    return NextResponse.json({
      message: 'Condition updated successfully',
      condition: updatedCondition
    }, { status: 200 });

  } catch (error) {
    console.error('❌ Error updating condition:', error);
    
    return NextResponse.json({
      message: 'Failed to update condition',
      error: error.message 
    }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    
    const conditionId = parseInt(id);
    if (isNaN(conditionId)) {
      return NextResponse.json(
        { message: 'Invalid condition ID format' },
        { status: 400 }
      );
    }

    // Check if condition exists
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

    // Delete the condition (cascade will handle puzzles and advice)
    await prisma.condition.delete({
      where: { id: conditionId }
    });

    console.log(`✅ Deleted condition "${existingCondition.name}" and ${existingCondition._count.puzzles} associated puzzles`);

    return NextResponse.json({
      message: 'Condition and associated puzzles deleted successfully'
    }, { status: 200 });

  } catch (error) {
    console.error('❌ Error deleting condition:', error);
    return NextResponse.json({
      message: 'Failed to delete condition',
      error: error.message 
    }, { status: 500 });
  }
}