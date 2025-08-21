// app/api/experiments/active/route.js
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Same counterbalancing function as in player-sessions
function getRandomisedConditionOrder(conditions, sessionCount) {
  const numConditions = conditions.length;
  if (numConditions === 0) return [];
  
  // Calculate rotation offset based on session count
  const offset = sessionCount % numConditions;
  
  // Create rotation array: shift conditions by offset positions
  const rotation = [
    ...conditions.slice(offset),
    ...conditions.slice(0, offset)
  ];
  
  return rotation;
}

// GET - Get the currently active experiment for participants
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const playerName = searchParams.get('playerName');

    // Get active experiment (no user authentication needed for participants)
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
          orderBy: { id: 'asc' } // CHANGED: Order by ID instead of order field
        },
        experimenter: {
          select: {
            name: true,
            email: false // Don't expose email to participants
          }
        }
      }
    });

    if (!activeExperiment) {
      return NextResponse.json({ 
        message: 'No active experiment available',
        active: false 
      }, { status: 404 });
    }

    // Apply counterbalancing if we have a player session request
    let conditionsToReturn = activeExperiment.conditions;
    
    if (playerName) {
      // Check if this player already has session orders (return their existing order)
      const existingOrders = await prisma.sessionExperimentOrder.findMany({
        where: {
          player_Name: playerName.trim(),
          experimentId: activeExperiment.id
        },
        orderBy: { order: 'asc' }
      });

      if (existingOrders.length > 0) {
        // Player has existing orders - return conditions in their assigned order
        conditionsToReturn = existingOrders.map(orderItem => {
          return activeExperiment.conditions.find(condition => 
            condition.id === orderItem.conditionId
          );
        }).filter(condition => condition !== undefined);
        
        console.log(`Returning existing order for ${playerName}:`, conditionsToReturn.map(c => c.id));
      } else {
        // New player - apply counterbalancing
        const sessionCount = await prisma.playerSession.count({
          where: { experimentId: activeExperiment.id }
        });
        
        conditionsToReturn = getRandomisedConditionOrder(
          activeExperiment.conditions, 
          sessionCount
        );
        
        console.log(`New randomised order for ${playerName} (session ${sessionCount + 1}):`, 
          conditionsToReturn.map(c => c.id));
      }
    } else {
      console.log('No playerName provided, returning original condition order');
    }

    // Transform for frontend
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
        originalOrder: condition.order, // Keep track of original condition order
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

    // Add debug info if playerName is provided
    if (playerName) {
      transformedExperiment.debug = {
        playerName: playerName,
        conditionOrder: conditionsToReturn.map(c => ({ id: c.id, name: c.name, originalOrder: c.order }))
      };
    }

    return NextResponse.json(transformedExperiment);

  } catch (error) {
    console.error('Active experiment fetch error:', error);
    return NextResponse.json({ 
      message: 'Server error',
      active: false 
    }, { status: 500 });
  }
}

// POST - Check if experiment is still active (for ongoing sessions)
export async function POST(request) {
  try {
    const { experimentId } = await request.json();
    
    if (!experimentId) {
      return NextResponse.json({ 
        message: 'Experiment ID required',
        active: false 
      }, { status: 400 });
    }

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