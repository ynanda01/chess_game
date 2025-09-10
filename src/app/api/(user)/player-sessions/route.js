import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();


//  Rotate an array ( which means conditions or puzzles ) to the right
// means like 123 -> 231 if offset is 1
//  Used for counterbalancing both conditions and puzzles.
 
function rotateArrayRight(arr, offset) {
  const n = arr.length;
  if (n === 0) return [];
  const shift = offset % n;
  return [...arr.slice(n-shift), ...arr.slice(0, n-shift)];
}


// POST - Create a new player session

export async function POST(request) {
  try {
    const { playerName } = await request.json();

    // Validate player name
    if (!playerName || playerName.trim().length === 0) {
      return NextResponse.json({ message: 'Player name is required' }, { status: 400 });
    }

    // Get the active experiment with conditions and puzzles
    const activeExperiment = await prisma.experiment.findFirst({
      where: { isActive: true },
      include: {
        conditions: {
          orderBy: { id: 'asc' },
          include: { puzzles: { orderBy: { id: 'asc' } } }
        }
      }
    });

    if (!activeExperiment) {
      return NextResponse.json({ message: 'No active experiment available' }, { status: 404 });
    }

    // Check if a session already exists for this player or not
    const existingSession = await prisma.playerSession.findUnique({
      where: {
        player_name_experimentId: {
          player_name: playerName.trim(),
          experimentId: activeExperiment.id
        }
      }
    });

    if (existingSession) {
      return NextResponse.json({
        message: 'Session already exists',
        sessionId: existingSession.id,
        playerName: existingSession.player_name,
        experimentId: existingSession.experimentId,
        experimentName: activeExperiment.name,
        displayLevel: existingSession.display_level,
        existing: true
      });
    }

    // Determine how many sessions are exist (used for counterbalancing)
    const sessionCount = await prisma.playerSession.count({
      where: { experimentId: activeExperiment.id }
    });

    // Rotate conditions for this session
    const rotatedConditions = rotateArrayRight(activeExperiment.conditions, sessionCount);

    // Assign the first condition from the rotated list
    const assignedCondition = rotatedConditions[0];

    // Create new player session
    const session = await prisma.playerSession.create({
      data: {
        player_name: playerName.trim(),
        experimentId: activeExperiment.id,
        conditionId: assignedCondition.id,
        display_level: 1
      }
    });

    // Clear previous condition and puzzle orders for this player
    await prisma.sessionExperimentOrder.deleteMany({
      where: { player_Name: playerName.trim(), experimentId: activeExperiment.id }
    });
    await prisma.sessionPuzzleOrder.deleteMany({
      where: { player_Name: playerName.trim(), experimentId: activeExperiment.id }
    });

    // Store the counterbalanced order for conditions and puzzles
    for (const condition of activeExperiment.conditions) {
      const rotatedIndex = rotatedConditions.findIndex(c => c.id === condition.id);
      await prisma.sessionExperimentOrder.create({
        data: {
          player_Name: playerName.trim(),
          experimentId: activeExperiment.id,
          conditionId: condition.id,
          order: rotatedIndex + 1
        }
      });

      // Rotate puzzles independently for each condition
      const rotatedPuzzles = rotateArrayRight(condition.puzzles, sessionCount);
      for (const puzzle of condition.puzzles) {
        const rotatedPuzzleIndex = rotatedPuzzles.findIndex(p => p.id === puzzle.id);
        await prisma.sessionPuzzleOrder.create({
          data: {
            player_Name: playerName.trim(),
            experimentId: activeExperiment.id,
            conditionId: condition.id,
            puzzleId: puzzle.id,
            order: rotatedPuzzleIndex + 1
          }
        });
      }
    }

    // Return session info and counterbalancing details
    return NextResponse.json({
      message: 'Session created successfully',
      sessionId: session.id,
      playerName: session.player_name,
      experimentId: session.experimentId,
      experimentName: activeExperiment.name,
      conditionId: session.conditionId,
      conditionName: assignedCondition.name,
      displayLevel: session.display_level,
      existing: false,
      counterbalancing: {
        sessionNumber: sessionCount + 1,
        conditionOrder: rotatedConditions.map((c, idx) => ({
          set: idx + 1,
          conditionId: c.id,
          conditionName: c.name
        }))
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Session creation error:', error);

    // This error code indicates a unique constraint violation in Prisma
    if (error.code === 'P2002') {
      return NextResponse.json({ message: 'Session already exists for this player' }, { status: 409 });
    }

    return NextResponse.json({ message: 'Server error while creating session' }, { status: 500 });
  }
}


// GET - Fetch a player's session details
// Returns session info, progress stats, and counterbalancing details
 
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const playerName = searchParams.get('playerName');

    if (!sessionId && !playerName) {
      return NextResponse.json({ message: 'Session ID or player name required' }, { status: 400 });
    }

    let session;

    // Fetch session by ID or latest session for the player
    if (sessionId) {
      session = await prisma.playerSession.findUnique({
        where: { id: parseInt(sessionId) },
        include: {
          experiment: {
            select: { id: true, name: true, isActive: true, experimenter: { select: { name: true } } }
          },
          responses: {
            include: { puzzle: { select: { id: true, order: true, condition: { select: { name: true, order: true } } } } }
          }
        }
      });
    } else {
      session = await prisma.playerSession.findFirst({
        where: { player_name: playerName },
        include: {
          experiment: {
            select: { id: true, name: true, isActive: true, experimenter: { select: { name: true } } }
          },
          responses: {
            include: { puzzle: { select: { id: true, order: true, condition: { select: { name: true, order: true } } } } }
          }
        },
        orderBy: { started_at: 'desc' }
      });
    }

    if (!session) {
      return NextResponse.json({ message: 'Session not found' }, { status: 404 });
    }

    // Fetch the player's condition order
    const sessionOrders = await prisma.sessionExperimentOrder.findMany({
      where: { player_Name: session.player_name, experimentId: session.experimentId },
      orderBy: { order: 'asc' }
    });


    // Calculate progress for the session
    const totalResponses = session.responses.length;
    const completedResponses = session.responses.filter(r => !r.skipped).length;
    const skippedResponses = session.responses.filter(r => r.skipped).length;

    return NextResponse.json({
      sessionId: session.id,
      playerName: session.player_name,
      experimentId: session.experimentId,
      experimentName: session.experiment.name,
      experimenterName: session.experiment.experimenter.name,
      conditionId: session.conditionId,
      displayLevel: session.display_level,
      startedAt: session.started_at,
      completedAt: session.completed_at,
      isActive: session.experiment.isActive,
      progress: {
        totalResponses,
        completedResponses,
        skippedResponses,
        completionRate: totalResponses > 0 ? (completedResponses / totalResponses * 100).toFixed(1) : 0
      },
      responses: session.responses.map(response => ({
        id: response.id,
        puzzleId: response.puzzleId,
        puzzleOrder: response.puzzle.order,
        conditionName: response.puzzle.condition.name,
        conditionOrder: response.puzzle.condition.order,
        skipped: response.skipped,
        completedAt: response.completed_at
      })),
      counterbalancing: {
        conditionOrder: sessionOrders.map(order => ({
          set: order.order,
          conditionId: order.conditionId
        }))
      }
    });

  } catch (error) {
    console.error('Session fetch error:', error);
    return NextResponse.json({ message: 'Server error while fetching session' }, { status: 500 });
  }
}

// PUT - Update session details like completion status or display level
// Allows marking session as completed or updating the current display level
// This is useful for resuming sessions or marking them completed

export async function PUT(request) {
  try {
    const { sessionId, completed, displayLevel } = await request.json();

    // Validate session ID
    if (!sessionId) {
      return NextResponse.json({ message: 'Session ID is required' }, { status: 400 });
    }

    // Prepare update data
    const updateData = {};
    if (completed !== undefined) updateData.completed_at = completed ? new Date() : null;
    if (displayLevel !== undefined) updateData.display_level = parseInt(displayLevel);

    // Update session in the database
    const session = await prisma.playerSession.update({
      where: { id: parseInt(sessionId) },
      data: updateData,
      include: { experiment: { select: { name: true, isActive: true } } }
    });

    // Return updated session info
    return NextResponse.json({
      message: 'Session updated successfully',
      sessionId: session.id,
      playerName: session.player_name,
      experimentName: session.experiment.name,
      displayLevel: session.display_level,
      completedAt: session.completed_at
    });

  } catch (error) {
    console.error('Session update error:', error);
    return NextResponse.json({ message: 'Server error while updating session' }, { status: 500 });
  }
}
