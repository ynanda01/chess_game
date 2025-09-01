import { NextResponse } from 'next/server';
import prisma from '../../../../../lib/prisma';

export async function POST(request) {
  try {
    const { name, description, experimenterId, experimentId } = await request.json();

    // Validation
    if (!name || !name.trim()) {
      return NextResponse.json(
        { message: 'Experiment name is required' },
        { status: 400 }
      );
    }

    if (!experimenterId) {
      return NextResponse.json(
        { message: 'Experimenter ID is required' },
        { status: 400 }
      );
    }

    // checking if any experimenter exists or not
    const experimenter = await prisma.experimenters.findUnique({
      where: { id: experimenterId }
    });

    if (!experimenter) {
      return NextResponse.json(
        { message: 'Invalid experimenter ID' },
        { status: 400 }
      );
    }

    let experiment;

      // If experimentId is provided, we are updating an existing experiment
    if (experimentId) {
     
      const expId = parseInt(experimentId);
      if (isNaN(expId)) {
        return NextResponse.json(
          { message: 'Invalid experiment ID format' },
          { status: 400 }
        );
      }

      // Checking if this experiment exists and belongs to this experimenter
      const existingExperiment = await prisma.experiment.findUnique({
        where: { id: expId }
      });

      if (!existingExperiment) {
        return NextResponse.json(
          { message: 'Experiment not found' },
          { status: 404 }
        );
      }

      if (existingExperiment.experimenterId !== experimenterId) {
        return NextResponse.json(
          { message: 'Unauthorized to update this experiment' },
          { status: 403 }
        );
      }

      // updating the experiment
      experiment = await prisma.experiment.update({
        where: { id: expId },
        data: {
          name: name.trim(),
          description: description?.trim() || '',
          updated_at: new Date()
        },
      });

    } else {
      // Creating a new experiment
      experiment = await prisma.experiment.create({
        data: {
          name: name.trim(),
          description: description?.trim() || '',
          experimenterId: experimenterId,
        },
      });
    }

    return NextResponse.json(
      {
        message: experimentId ? 'Experiment updated successfully' : 'Experiment created successfully',
        experiment
      },
      { status: experimentId ? 200 : 201 }
    );
       
  } catch (error) {
    console.error('Error with experiment:', error);
    return NextResponse.json(
      { message: 'Failed to process experiment' },
      { status: 500 }
    );
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

    const experiment = await prisma.experiment.findUnique({
      where: { id: expId },
      include: {
        experimenter: {
          select: { id: true, name: true, email: true }
        },
        conditions: {
          orderBy: { order: 'asc' },
          include: {
            puzzles: {
              orderBy: { order: 'asc' },
              include: {
                advice: true
              }
            }
          }
        }
      }
    });

    if (!experiment) {
      return NextResponse.json(
        { message: 'Experiment not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ experiment });
   
  } catch (error) {
    console.error('Error fetching experiment:', error);
    return NextResponse.json(
      { message: 'Failed to fetch experiment' },
      { status: 500 }
    );
  }
}