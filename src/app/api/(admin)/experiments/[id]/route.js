import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET - THis will get experiment by ID with conditions and puzzle counts
export async function GET(request, { params }) {
  try {
    // Extract experiment ID from params
    const { id } = await params;
    const experimentId = parseInt(id);

    // Validate experiment ID
    if (!experimentId) {
      return NextResponse.json({
        message: 'Experiment ID is required'
      }, { status: 400 });
    }

    //this will fectch the experiment by ID, from the database 
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

    //If no experiment with that ID exists it will return message
    if (!experiment) {
      return NextResponse.json({
        message: 'Experiment not found'
      }, { status: 404 });
    }

    // Format the response so that frontend gets exactly what it needs
    // This avoids sending unnecessary data
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
        puzzleCount: condition._count.puzzles,
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

// DELETE - Delete an experiment by ID only if it is inactive and belongs to the experimenter
export async function DELETE(request, { params }) {
  try {
    const userEmail = request.headers.get('user-email');
    const { id } = await params;
    const experimentId = parseInt(id);
    
    if (!userEmail) {
      return NextResponse.json({ message: 'User email required' }, { status: 400 });
    }

    // this will try to find the experimenter by email in the database via prisma
    const experimenter = await prisma.experimenters.findUnique({
      where: { email: userEmail }
    });

    if (!experimenter) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    // Check if experiment actually belongs to the user
    const experiment = await prisma.experiment.findFirst({
      where: {
        id: experimentId,
        experimenterId: experimenter.id
      }
    });

    if (!experiment) {
      return NextResponse.json({ message: 'Experiment not found' }, { status: 404 });
    }

    // Only allow deletion if experiment is inactive 
    // Active experiments cannot be deleted 
    if (experiment.isActive) {
      return NextResponse.json({ 
        message: 'Cannot delete an active experiment. Please deactivate it first.' 
      }, { status: 400 });
    }

     // Delete the experiment
    // Any related conditions and puzzles will also be removed automatically 
   // if cascading deletes are defined in the Prisma schema
    await prisma.experiment.delete({
      where: { id: experimentId }
    });

    return NextResponse.json({ message: 'Experiment deleted successfully' });

  } catch (error) {
    console.error('Experiment deletion error:', error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

// PUT - Update experiment details 
export async function PUT(request, { params }) {
  try {
    const body = await request.json();
    const userEmail = request.headers.get('user-email');
    const { id } = await params;
    const experimentId = parseInt(id);
    
    if (!userEmail) {
      return NextResponse.json({ message: 'User email required' }, { status: 400 });
    }

    // this will try to find the experimenter by email in the database via prisma
    const experimenter = await prisma.experimenters.findUnique({
      where: { email: userEmail }
    });

    if (!experimenter) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    const { name, description, adviceformat, timerEnabled, timeLimit } = body;

    // Update experiment with the new details
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

// PATCH - activate or deactivate an experiment
// Activating an experiment will automatically deactivate any other active experiments for that user
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

    // this will try to find the experimenter by email in the database via prisma
    const experimenter = await prisma.experimenters.findUnique({
      where: { email: userEmail }
    });

    if (!experimenter) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    // this will Check if experiment actually belongs to the experimenter
    const experiment = await prisma.experiment.findFirst({
      where: {
        id: experimentId,
        experimenterId: experimenter.id
      }
    });

    if (!experiment) {
      return NextResponse.json({ message: 'Experiment not found' }, { status: 404 });
    }

    // If activating, first deactivate any other active experiments for this experimenter
    if (isActive) {
      await prisma.experiment.updateMany({
        where: {
          experimenterId: experimenter.id,
          id: { not: experimentId } 
        },
        data: {
          isActive: false
        }
      });
    }

    // Now update the requested experiment's active status
    // This allows both activation and deactivation
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