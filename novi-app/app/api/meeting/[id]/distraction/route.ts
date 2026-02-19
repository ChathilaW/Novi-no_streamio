import { NextRequest, NextResponse } from 'next/server'

interface DistractionEntry {
  participantId: string
  name: string
  status: 'FOCUSED' | 'DISTRACTED' | 'NO FACE' | 'ERROR'
  totalChecks: number       // every POST with FOCUSED or DISTRACTED increments this
  distractedChecks: number  // increments only when DISTRACTED
  peakDistractionPct: number  // highest rolling distraction % seen so far
  peakDistractionTime: number // epoch ms when peakDistractionPct was recorded
  lastSeen: number
}

/** In-memory store: meetingId → Map<participantId, DistractionEntry> */
const meetingDistraction = new Map<string, Map<string, DistractionEntry>>()

const STALE_THRESHOLD_MS = 10_000

function getRoom(meetingId: string): Map<string, DistractionEntry> {
  if (!meetingDistraction.has(meetingId)) {
    meetingDistraction.set(meetingId, new Map())
  }
  return meetingDistraction.get(meetingId)!
}

function pruneStale(room: Map<string, DistractionEntry>) {
  const now = Date.now()
  for (const [id, entry] of room.entries()) {
    if (now - entry.lastSeen > STALE_THRESHOLD_MS) {
      room.delete(id)
    }
  }
}

/**
 * GET /api/meeting/[id]/distraction
 * Returns {
 *   distractedCount,   — currently DISTRACTED participants
 *   totalCount,        — participants with FOCUSED or DISTRACTED status
 *   participants: [{   — per-participant stats
 *     participantId, name,
 *     totalChecks, distractedChecks, distractionPct
 *   }]
 * }
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const room = getRoom(id)
  pruneStale(room)

  let distractedCount = 0
  let totalCount = 0
  const participants = []

  for (const entry of room.values()) {
    if (entry.status === 'FOCUSED' || entry.status === 'DISTRACTED') {
      totalCount++
      if (entry.status === 'DISTRACTED') distractedCount++
    }
    const distractionPct =
      entry.totalChecks > 0
        ? Math.round((entry.distractedChecks / entry.totalChecks) * 100)
        : 0
    participants.push({
      participantId: entry.participantId,
      name: entry.name,
      totalChecks: entry.totalChecks,
      distractedChecks: entry.distractedChecks,
      distractionPct,
      peakDistractionPct: entry.peakDistractionPct,
      peakDistractionTime: entry.peakDistractionTime,
    })
  }

  return NextResponse.json({ distractedCount, totalCount, participants })
}

/**
 * POST /api/meeting/[id]/distraction
 * Body: { participantId, name, status }
 * Increments cumulative counters (never reset while participant is in meeting).
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await req.json() as {
    participantId: string
    name: string
    status: DistractionEntry['status']
  }
  const room = getRoom(id)
  const existing = room.get(body.participantId)

  const totalChecks = (existing?.totalChecks ?? 0) +
    (body.status === 'FOCUSED' || body.status === 'DISTRACTED' ? 1 : 0)
  const distractedChecks = (existing?.distractedChecks ?? 0) +
    (body.status === 'DISTRACTED' ? 1 : 0)

  const newPct = totalChecks > 0 ? Math.round((distractedChecks / totalChecks) * 100) : 0
  const now = Date.now()
  const peakDistractionPct = Math.max(existing?.peakDistractionPct ?? 0, newPct)
  const peakDistractionTime =
    newPct >= peakDistractionPct && newPct > (existing?.peakDistractionPct ?? 0)
      ? now
      : (existing?.peakDistractionTime ?? now)

  room.set(body.participantId, {
    participantId: body.participantId,
    name: body.name,
    status: body.status,
    totalChecks,
    distractedChecks,
    peakDistractionPct,
    peakDistractionTime,
    lastSeen: now,
  })

  pruneStale(room)
  return NextResponse.json({ ok: true })
}

/**
 * DELETE /api/meeting/[id]/distraction?participantId=xxx
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const participantId = req.nextUrl.searchParams.get('participantId')
  if (participantId) getRoom(id).delete(participantId)
  return NextResponse.json({ ok: true })
}
