import { NextRequest, NextResponse } from 'next/server'

interface DistractionEntry {
  participantId: string
  name: string
  status: 'FOCUSED' | 'DISTRACTED' | 'NO FACE' | 'ERROR'
  totalChecks: number
  distractedChecks: number
  peakDistractionPct: number
  peakDistractionTime: number
  lastSeen: number
}

/**
 * In-memory relay store: meetingId → Map<participantId, DistractionEntry>
 *
 * The server is a STATELESS RELAY — all cumulative counters come from the
 * client in every POST body. The server just stores the latest snapshot and
 * prunes stale entries. This is safe on Vercel because the client is the
 * single source of truth for counts; any serverless instance can serve GETs
 * since it will receive fresh data in the next POST cycle (~200ms).
 */
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
 * Returns { distractedCount, totalCount, participants[] }
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
 * Body: { participantId, name, status, totalChecks, distractedChecks,
 *         peakDistractionPct, peakDistractionTime }
 *
 * Server simply overwrites — the client owns all counters.
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
    totalChecks: number
    distractedChecks: number
    peakDistractionPct: number
    peakDistractionTime: number
  }
  const room = getRoom(id)

  // Pure overwrite — no server-side accumulation
  room.set(body.participantId, {
    participantId: body.participantId,
    name: body.name,
    status: body.status,
    totalChecks: body.totalChecks ?? 0,
    distractedChecks: body.distractedChecks ?? 0,
    peakDistractionPct: body.peakDistractionPct ?? 0,
    peakDistractionTime: body.peakDistractionTime ?? 0,
    lastSeen: Date.now(),
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
