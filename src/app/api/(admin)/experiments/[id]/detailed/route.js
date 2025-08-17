// app/api/experiments/[id]/detailed/route.js

import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const userEmail = request.headers.get('user-email');

    if (!userEmail) {
      return NextResponse.json({ message: "User email required" }, { status: 401 });
    }

    // Verify the experimenter owns this experiment
    const experimenter = await prisma.experimenters.findUnique({
      where: { email: userEmail },
    });

    if (!experimenter) {
      return NextResponse.json({ message: "Experimenter not found" }, { status: 404 });
    }

    // Fetch the complete experiment data with all related information for export
    const experiment = await prisma.experiment.findFirst({
      where: {
        id: parseInt(id),
        experimenterId: experimenter.id,
      },
      include: {
        conditions: {
          include: {
            puzzles: {
              include: {
                advice: true,
                responses: {
                  include: {
                    session: true,
                    moves: {
                      orderBy: { move_number: 'asc' }
                    }
                  }
                }
              },
              orderBy: { order: 'asc' }
            }
          },
          orderBy: { order: 'asc' }
        },
        sessions: {
          include: {
            responses: {
              include: {
                puzzle: {
                  include: {
                    advice: true,
                    condition: true
                  }
                },
                moves: {
                  orderBy: { move_number: 'asc' }
                }
              }
            }
          },
          orderBy: { started_at: 'asc' }
        },
        sessionOrders: true
      },
    });

    if (!experiment) {
      return NextResponse.json({ message: "Experiment not found" }, { status: 404 });
    }

    // Transform the data to ensure proper structure for export
    const transformedExperiment = {
      ...experiment,
      sessions: experiment.sessions.map(session => ({
        ...session,
        responses: session.responses.map(response => ({
          ...response,
          puzzle: {
            ...response.puzzle,
            condition: response.puzzle.condition
          }
        }))
      }))
    };

    return NextResponse.json(transformedExperiment);

  } catch (error) {
    console.error("Error fetching detailed experiment:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}