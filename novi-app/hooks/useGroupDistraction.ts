import { useCallback, useEffect, useRef, useState } from 'react'

export interface ParticipantDistractionStat {
  participantId: string
  name: string
  totalChecks: number
  distractedChecks: number
  distractionPct: number
  peakDistractionPct: number   // highest distraction % recorded during this session
  peakDistractionTime: number  // epoch ms when peakDistractionPct was reached
}

interface GroupDistractionData {
  distractedCount: number
  totalCount: number
  participants: ParticipantDistractionStat[]
}

const HOLD_STALE_MS = 3000 // hold last-known data for 3s before dropping a participant

/**
 * useGroupDistraction
 *
 * Polls /api/meeting/[id]/distraction every 200ms.
 *
 * Smoothing: if a participant disappears from the response (e.g. the GET hit
 * a cold Vercel instance), we keep showing their last-known data for up to
 * HOLD_STALE_MS before removing them. This eliminates the UI flicker caused
 * by multi-instance serverless state gaps.
 */
const useGroupDistraction = (meetingId: string): GroupDistractionData => {
  const [data, setData] = useState<GroupDistractionData>({
    distractedCount: 0,
    totalCount: 0,
    participants: [],
  })

  // Last-known per-participant data: participantId → { stat, lastSeenAt }
  const knownRef = useRef<Map<string, { stat: ParticipantDistractionStat; lastSeenAt: number }>>(
    new Map()
  )

  const fetchData = useCallback(async () => {
    if (!meetingId) return
    try {
      const res = await fetch(`/api/meeting/${meetingId}/distraction`)
      const json = await res.json()

      const now = Date.now()
      const fresh: ParticipantDistractionStat[] = json.participants ?? []

      // Update known map with freshly received participants
      for (const stat of fresh) {
        knownRef.current.set(stat.participantId, { stat, lastSeenAt: now })
      }

      // Expire participants not seen for longer than HOLD_STALE_MS
      for (const [id, entry] of knownRef.current.entries()) {
        if (now - entry.lastSeenAt > HOLD_STALE_MS) {
          knownRef.current.delete(id)
        }
      }

      // Rebuild merged participant list from the known map
      const merged = Array.from(knownRef.current.values()).map((e) => e.stat)

      setData({
        distractedCount: json.distractedCount ?? 0,
        totalCount: json.totalCount ?? 0,
        participants: merged,
      })
    } catch {
      // ignore — keep showing last known values
    }
  }, [meetingId])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 200)
    return () => clearInterval(interval)
  }, [fetchData])

  return data
}

export default useGroupDistraction
