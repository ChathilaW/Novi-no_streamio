import { useCallback, useEffect, useState } from 'react'

/**
 * useMeetingStatus
 *
 * Checks whether a meeting has been ended by the host via the server API.
 * - On mount: fetches /api/meeting/[id]/status
 * - Polls every 3 seconds so participants are kicked out promptly
 * - endMeeting() POSTs to the API (called by the host's EndCallButton)
 */
const useMeetingStatus = (meetingId: string) => {
  const [isEnded, setIsEnded] = useState(false)

  const checkStatus = useCallback(async () => {
    if (!meetingId) return
    try {
      const res = await fetch(`/api/meeting/${meetingId}/status`)
      const data = await res.json()
      if (data.ended) setIsEnded(true)
    } catch {
      // silently ignore network errors
    }
  }, [meetingId])

  // Check on mount, then poll every 3 seconds
  useEffect(() => {
    checkStatus()
    const interval = setInterval(checkStatus, 3000)
    return () => clearInterval(interval)
  }, [checkStatus])

  /** Called by the host to mark the meeting as ended on the server. */
  const endMeeting = useCallback(async () => {
    if (!meetingId) return
    try {
      await fetch(`/api/meeting/${meetingId}/status`, { method: 'POST' })
    } catch {
      // ignore
    }
    setIsEnded(true)
  }, [meetingId])

  return { isEnded, endMeeting }
}

export default useMeetingStatus
