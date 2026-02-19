import { useCallback, useEffect, useState } from 'react'

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

/**
 * useGroupDistraction
 *
 * Polls /api/meeting/[id]/distraction every 200ms and returns:
 * - distractedCount / totalCount  (current snapshot for speedometer)
 * - participants[]                (cumulative per-participant stats)
 */
const useGroupDistraction = (meetingId: string): GroupDistractionData => {
  const [data, setData] = useState<GroupDistractionData>({
    distractedCount: 0,
    totalCount: 0,
    participants: [],
  })

  const fetchData = useCallback(async () => {
    if (!meetingId) return
    try {
      const res = await fetch(`/api/meeting/${meetingId}/distraction`)
      const json = await res.json()
      setData({
        distractedCount: json.distractedCount ?? 0,
        totalCount: json.totalCount ?? 0,
        participants: json.participants ?? [],
      })
    } catch {
      // ignore
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
