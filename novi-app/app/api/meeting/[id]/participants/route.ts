import { NextRequest, NextResponse } from 'next/server'

export interface Participant {
  id: string
  name: string
  isHost: boolean
  isCameraOn: boolean
  isMicOn: boolean
  lastSeen: number // epoch ms
}

/** In-memory store: meetingId → Map<participantId, Participant> */
const meetingParticipants = new Map<string, Map<string, Participant>>()

const STALE_THRESHOLD_MS = 10_000 // prune participants not seen in 10 s

function getRoom(meetingId: string): Map<string, Participant> {
  if (!meetingParticipants.has(meetingId)) {
    meetingParticipants.set(meetingId, new Map())
  }
  return meetingParticipants.get(meetingId)!
}

function pruneStale(room: Map<string, Participant>) {
  const now = Date.now()
  for (const [id, p] of room.entries()) {
    if (now - p.lastSeen > STALE_THRESHOLD_MS) {
      room.delete(id)
    }
  }
}

/** GET /api/meeting/[id]/participants → { participants: Participant[] } */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const room = getRoom(id)
  pruneStale(room)
  return NextResponse.json({ participants: Array.from(room.values()) })
}

/** POST /api/meeting/[id]/participants → register / heartbeat */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await req.json() as Omit<Participant, 'lastSeen'>
  const room = getRoom(id)
  room.set(body.id, { ...body, lastSeen: Date.now() })
  pruneStale(room)
  return NextResponse.json({ ok: true })
}

/** DELETE /api/meeting/[id]/participants?participantId=xxx → remove on leave */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const participantId = req.nextUrl.searchParams.get('participantId')
  if (participantId) {
    getRoom(id).delete(participantId)
  }
  return NextResponse.json({ ok: true })
}
