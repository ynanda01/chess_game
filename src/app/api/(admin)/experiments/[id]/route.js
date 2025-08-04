// app/api/experiments/[id]/route.js
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET - Get experiment details with conditions and puzzle counts
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const experimentId = parseInt(id);

    if (!experimentId) {
      return NextResponse.json({
        message: 'Experiment ID is required'
      }, { status: 400 });
    }

    const experiment = await prisma.experiment.findUnique({
      where: { id: experimentId },
      include: {
        experimenter: {
          select: { name: true }
        },
        conditions: {
          orderBy: { order: 'asc' },
          include: {
            _count: {
              select: { puzzles: true }
            }
          }
        }
      }
    });

    if (!experiment) {
      return NextResponse.json({
        message: 'Experiment not found'
      }, { status: 404 });
    }

    // Format the response
    const formattedExperiment = {
      id: experiment.id,
      name: experiment.name,
      description: experiment.description,
      experimenterName: experiment.experimenter.name,
      isActive: experiment.isActive,
      timerEnabled: experiment.timerEnabled,
      timeLimit: experiment.timeLimit,
      adviceformat: experiment.adviceformat,
      conditions: experiment.conditions.map(condition => ({
        id: condition.id,
        name: condition.name,
        description: condition.description,
        order: condition.order,
        puzzleCount: condition._count.puzzles, // Actual puzzle count from _count
        timerEnabled: condition.timerEnabled,
        timeLimit: condition.timeLimit,
        adviceformat: condition.adviceformat
      }))
    };

    return NextResponse.json(formattedExperiment);

  } catch (error) {
    console.error('Experiment fetch error:', error);
    return NextResponse.json({
      message: 'Server error while fetching experiment'
    }, { status: 500 });
  }
}

// DELETE - Delete experiment
export async function DELETE(request, { params }) {
  try {
    const userEmail = request.headers.get('user-email');
    const { id } = await params;
    const experimentId = parseInt(id);
    
    if (!userEmail) {
      return NextResponse.json({ message: 'User email required' }, { status: 400 });
    }

    // Get experimenter
    const experimenter = await prisma.experimenters.findUnique({
      where: { email: userEmail }
    });

    if (!experimenter) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    // Check if experiment belongs to user
    const experiment = await prisma.experiment.findFirst({
      where: {
        id: experimentId,
        experimenterId: experimenter.id
      }
    });

    if (!experiment) {
      return NextResponse.json({ message: 'Experiment not found' }, { status: 404 });
    }

    // Prevent deletion of active experiments
    if (experiment.isActive) {
      return NextResponse.json({ 
        message: 'Cannot delete an active experiment. Please deactivate it first.' 
      }, { status: 400 });
    }

    // Delete experiment (cascading will handle related data)
    await prisma.experiment.delete({
      where: { id: experimentId }
    });

    return NextResponse.json({ message: 'Experiment deleted successfully' });

  } catch (error) {
    console.error('Experiment deletion error:', error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

// PUT - Update experiment
export async function PUT(request, { params }) {
  try {
    const body = await request.json();
    const userEmail = request.headers.get('user-email');
    const { id } = await params;
    const experimentId = parseInt(id);
    
    if (!userEmail) {
      return NextResponse.json({ message: 'User email required' }, { status: 400 });
    }

    // Get experimenter
    const experimenter = await prisma.experimenters.findUnique({
      where: { email: userEmail }
    });

    if (!experimenter) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    const { name, description, adviceformat, timerEnabled, timeLimit } = body;

    // Update experiment (removed conditionName as it no longer exists)
    const updatedExperiment = await prisma.experiment.update({
      where: {
        id: experimentId,
        experimenterId: experimenter.id
      },
      data: {
        name,
        description: description || '',
        adviceformat: adviceformat || 'text',
        timerEnabled: timerEnabled || false,
        timeLimit: timeLimit || null,
        updated_at: new Date()
      }
    });

    return NextResponse.json({
      id: updatedExperiment.id,
      name: updatedExperiment.name,
      description: updatedExperiment.description,
      isActive: updatedExperiment.isActive,
      created_at: updatedExperiment.created_at
    });

  } catch (error) {
    console.error('Experiment update error:', error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

// PATCH - Toggle experiment active status
export async function PATCH(request, { params }) {
  try {
    const body = await request.json();
    const userEmail = request.headers.get('user-email');
    const { id } = await params;
    const experimentId = parseInt(id);
    const { isActive } = body;
    
    if (!userEmail) {
      return NextResponse.json({ message: 'User email required' }, { status: 400 });
    }

    // Get experimenter
    const experimenter = await prisma.experimenters.findUnique({
      where: { email: userEmail }
    });

    if (!experimenter) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    // Check if experiment belongs to user
    const experiment = await prisma.experiment.findFirst({
      where: {
        id: experimentId,
        experimenterId: experimenter.id
      }
    });

    if (!experiment) {
      return NextResponse.json({ message: 'Experiment not found' }, { status: 404 });
    }

    // If setting to active, first deactivate all other experiments for this user
    if (isActive) {
      await prisma.experiment.updateMany({
        where: {
          experimenterId: experimenter.id,
          id: { not: experimentId } // Exclude the current experiment
        },
        data: {
          isActive: false
        }
      });
    }

    // Update the target experiment
    const updatedExperiment = await prisma.experiment.update({
      where: { 
        id: experimentId 
      },
      data: {
        isActive: isActive,
        updated_at: new Date()
      }
    });

    return NextResponse.json({
      id: updatedExperiment.id,
      name: updatedExperiment.name,
      isActive: updatedExperiment.isActive,
      message: `Experiment ${isActive ? 'activated' : 'deactivated'} successfully`
    });

  } catch (error) {
    console.error('Toggle experiment status error:', error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}