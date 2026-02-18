import { useCallback, useEffect, useRef, useState } from 'react'

export interface Participant {
  id: string
  name: string
  isHost: boolean
  isCameraOn: boolean
  isMicOn: boolean
  lastSeen: number
}

interface UseParticipantsOptions {
  meetingId: string
  participantId: string
  name: string
  isHost: boolean
  isCameraOn: boolean
  isMicOn: boolean
}

const HEARTBEAT_INTERVAL_MS = 500
const POLL_INTERVAL_MS = 500

const useParticipants = ({
  meetingId,
  participantId,
  name,
  isHost,
  isCameraOn,
  isMicOn,
}: UseParticipantsOptions) => {
  const [participants, setParticipants] = useState<Participant[]>([])

  // Keep a ref to the latest cam/mic state so the heartbeat always sends fresh values
  const stateRef = useRef({ isCameraOn, isMicOn })
  useEffect(() => {
    stateRef.current = { isCameraOn, isMicOn }
  }, [isCameraOn, isMicOn])

  const sendHeartbeat = useCallback(async () => {
    if (!meetingId || !participantId) return
    try {
      await fetch(`/api/meeting/${meetingId}/participants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: participantId,
          name,
          isHost,
          isCameraOn: stateRef.current.isCameraOn,
          isMicOn: stateRef.current.isMicOn,
        }),
      })
    } catch {
      // ignore network errors
    }
  }, [meetingId, participantId, name, isHost])

  const fetchParticipants = useCallback(async () => {
    if (!meetingId) return
    try {
      const res = await fetch(`/api/meeting/${meetingId}/participants`)
      const data = await res.json()
      setParticipants(data.participants ?? [])
    } catch {
      // ignore
    }
  }, [meetingId])

  // Register immediately on mount, then heartbeat every 4 s
  useEffect(() => {
    sendHeartbeat()
    const hb = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS)
    return () => clearInterval(hb)
  }, [sendHeartbeat])

  // Poll for the participant list every 3 s
  useEffect(() => {
    fetchParticipants()
    const poll = setInterval(fetchParticipants, POLL_INTERVAL_MS)
    return () => clearInterval(poll)
  }, [fetchParticipants])

  // Deregister on unmount
  useEffect(() => {
    return () => {
      if (!meetingId || !participantId) return
      navigator.sendBeacon(
        `/api/meeting/${meetingId}/participants?participantId=${participantId}`,
        // sendBeacon uses DELETE-like semantics via a small workaround:
        // we'll just let the stale-pruning handle it since sendBeacon only supports POST
      )
      // Best-effort DELETE
      fetch(`/api/meeting/${meetingId}/participants?participantId=${participantId}`, {
        method: 'DELETE',
        keepalive: true,
      }).catch(() => {})
    }
  }, [meetingId, participantId])

  return { participants }
}

export default useParticipants
