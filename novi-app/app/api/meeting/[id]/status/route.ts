import { NextRequest, NextResponse } from 'next/server'

/**
 * In-memory store of ended meeting IDs.
 * Lives in the Next.js server process — survives page refreshes and works
 * across all browsers hitting the same dev/prod server.
 */
const endedMeetings = new Set<string>()

/** GET /api/meeting/[id]/status  →  { ended: boolean } */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  return NextResponse.json({ ended: endedMeetings.has(id) })
}

/** POST /api/meeting/[id]/status  →  marks meeting as ended */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  endedMeetings.add(id)
  return NextResponse.json({ ended: true })
}
