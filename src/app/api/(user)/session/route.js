import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request) {
  try {
    const { player_name } = await request.json();

    if (!player_name || player_name.trim() === '') {
      return new Response(JSON.stringify({ error: 'Player name required' }), { status: 400 });
    }

    // Find the active experiment
    const activeExperiment = await prisma.experiment.findFirst({
      where: { isActive: true }
    });

    if (!activeExperiment) {
      return new Response(JSON.stringify({ error: 'No active experiment found' }), { status: 404 });
    }

    // Check if player already has a session for this experiment (optional)
    const existingSession = await prisma.playerSession.findUnique({
      where: {
        player_name_experimentId: {
          player_name,
          experimentId: activeExperiment.id,
        }
      }
    });

    if (existingSession) {
      // Return existing session if you want to prevent duplicates
      return new Response(JSON.stringify({ session: existingSession }), { status: 200 });
    }

    // Create new session linked to active experiment
    const newSession = await prisma.playerSession.create({
      data: {
        player_name,
        experimentId: activeExperiment.id,
        display_level: 1, // default start level
      }
    });

    return new Response(JSON.stringify({ session: newSession }), { status: 201 });

  } catch (error) {
    console.error('Session creation error:', error);
    return new Response(JSON.stringify({ error: 'Server error' }), { status: 500 });
  }
}
