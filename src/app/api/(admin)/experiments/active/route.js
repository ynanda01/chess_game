import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// radmoised condition order (1,2,3 -> 2,3,1 -> 3,1,2 etc based on condition count)
function getRandomisedConditionOrder(conditions, sessionCount) {
  const numConditions = conditions.length;
  if (numConditions === 0) return [];
  
  // Calculate rotation based on session count
  const offset = sessionCount % numConditions;
  
  // Rotate the conditions
  const rotation = [
    ...conditions.slice(offset),
    ...conditions.slice(0, offset)
  ];
  
  return rotation;
}

// GET - this will fetch the currently active experiment for participants
// only one experiment can be active at a time
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const playerName = searchParams.get('playerName');

    // this will try to find the active experiment in the database
    const activeExperiment = await prisma.experiment.findFirst({
      where: { 
        isActive: true 
      },
      include: {
        conditions: {
          include: {
            puzzles: {
              include: {
                advice: true
              },
              orderBy: { order: 'asc' }
            }
          },
          orderBy: { id: 'asc' } 
        },
        experimenter: {
          select: {
            name: true,
            email: false
          }
        }
      }
    });

    // If no experiment is active, return message
    if (!activeExperiment) {
      return NextResponse.json({ 
        message: 'No active experiment available',
        active: false 
      }, { status: 404 });
    }

    // { Apply counterbalancing if we have a player session request }
    let conditionsToReturn = activeExperiment.conditions;
    
    if (playerName) {
      // this will Check if this player already has session orders (return their existing order)
      const existingOrders = await prisma.sessionExperimentOrder.findMany({
        where: {
          player_Name: playerName.trim(),
          experimentId: activeExperiment.id
        },
        orderBy: { order: 'asc' }
      });

      if (existingOrders.length > 0) {
        // if Player has existing orders - return their previous conditions in their assigned order
        conditionsToReturn = existingOrders.map(orderItem => {
          return activeExperiment.conditions.find(condition => 
            condition.id === orderItem.conditionId
          );
        }).filter(condition => condition !== undefined);
        
      } else {

        // New player - assign them a new randomised order based on session count
        const sessionCount = await prisma.playerSession.count({
          where: { experimentId: activeExperiment.id }
        });
        
        conditionsToReturn = getRandomisedConditionOrder(
          activeExperiment.conditions, 
          sessionCount
        );
      }
    } 

    // Prepare the experiment data to return, including only required fields
    const transformedExperiment = {
      id: activeExperiment.id,
      name: activeExperiment.name,
      description: activeExperiment.description,
      adviceformat: activeExperiment.adviceformat,
      timerEnabled: activeExperiment.timerEnabled,
      timeLimit: activeExperiment.timeLimit,
      experimenterName: activeExperiment.experimenter.name,
      active: true,
      conditions: conditionsToReturn.map((condition, index) => ({
        id: condition.id,
        name: condition.name,
        description: condition.description,
        adviceformat: condition.adviceformat || activeExperiment.adviceformat,
        timerEnabled: condition.timerEnabled !== null ? condition.timerEnabled : activeExperiment.timerEnabled,
        timeLimit: condition.timeLimit !== null ? condition.timeLimit : activeExperiment.timeLimit,

        // Frontend still sees Set 1, Set 2, Set 3... but gets randomised conditions
        displayOrder: index + 1,
        // Keep track of original condition order
        originalOrder: condition.order, 
        puzzles: condition.puzzles.map(puzzle => ({
          id: puzzle.id,
          fen: puzzle.fen,
          correct_move: puzzle.correct_move,
          order: puzzle.order,
          advice: puzzle.advice ? {
            text: puzzle.advice.text,
            confidence: puzzle.advice.confidence,
            explanation: puzzle.advice.explanation,
            reliability: puzzle.advice.reliability
          } : null
        }))
      }))
    };

    return NextResponse.json(transformedExperiment);

  } catch (error) {
    console.error('Active experiment fetch error:', error);
    return NextResponse.json({ 
      message: 'Server error',
      active: false 
    }, { status: 500 });
  }
}

// POST - This endpoint allows checking if an experiment is still active or not
// it is Useful for ongoing sessions to verify experiment status
export async function POST(request) {
  try {
    // Expecting { experimentId: number } in the request body
    const { experimentId } = await request.json();
    
    if (!experimentId) {
      return NextResponse.json({ 
        message: 'Experiment ID required',
        active: false 
      }, { status: 400 });
    }

    // Try to find the experiment by ID in the database via prisma
    // parsing to int to ensure correct type
    const experiment = await prisma.experiment.findUnique({
      where: { id: parseInt(experimentId) },
      select: { 
        id: true, 
        name: true, 
        isActive: true 
      }
    });

    if (!experiment) {
      return NextResponse.json({ 
        message: 'Experiment not found',
        active: false 
      }, { status: 404 });
    }

    return NextResponse.json({
      id: experiment.id,
      name: experiment.name,
      active: experiment.isActive,
      message: experiment.isActive ? 'Experiment is active' : 'Experiment has been deactivated'
    });

  } catch (error) {
    console.error('Experiment status check error:', error);
    return NextResponse.json({ 
      message: 'Server error',
      active: false 
    }, { status: 500 });
  }
}