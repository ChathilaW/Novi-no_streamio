'use client'

import { useEffect, useRef } from 'react'

interface UseDistractionDetectionOptions {
  videoRef: React.RefObject<HTMLVideoElement | null>
  meetingId: string
  participantId: string
  name: string
  isCameraOn: boolean
}

/**
 * useDistractionDetection
 *
 * Runs combined.js distraction detection locally on the participant's webcam.
 *
 * All cumulative counters (totalChecks, distractedChecks, peak) are kept in
 * client-side refs and sent with every POST — making the server a stateless
 * relay that just stores the latest snapshot. This is Vercel-safe: no
 * serverless instance needs shared in-memory state.
 */
const useDistractionDetection = ({
  videoRef,
  meetingId,
  participantId,
  name,
  isCameraOn,
}: UseDistractionDetectionOptions) => {
  const rafRef = useRef<number | null>(null)
  const lastPostRef = useRef<number>(0)
  const initializedRef = useRef(false)
  const detectRef = useRef<
    ((video: HTMLVideoElement, w: number, h: number, ts: number) => { status: string } | null) | null
  >(null)

  // Client-side cumulative counters — source of truth for distraction stats
  const totalChecksRef = useRef(0)
  const distractedChecksRef = useRef(0)
  const peakDistractionPctRef = useRef(0)
  const peakDistractionTimeRef = useRef(0)

  // Dynamically import combined.js (avoids SSR issues with MediaPipe)
  useEffect(() => {
    if (!meetingId || !participantId) return

    let cancelled = false

    const init = async () => {
      try {
        const mod = await import('@/ml-calculations/combined')
        if (cancelled) return
        await mod.initDistraction()
        detectRef.current = mod.detectDistraction
        initializedRef.current = true
      } catch (err) {
        console.error('[DistractionDetection] init failed:', err)
      }
    }

    init()

    return () => {
      cancelled = true
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      // Best-effort cleanup
      fetch(`/api/meeting/${meetingId}/distraction?participantId=${participantId}`, {
        method: 'DELETE',
        keepalive: true,
      }).catch(() => {})
    }
  }, [meetingId, participantId])

  // Detection loop
  useEffect(() => {
    if (!isCameraOn) return

    const loop = (timestamp: number) => {
      const video = videoRef.current
      if (
        initializedRef.current &&
        detectRef.current &&
        video &&
        video.readyState >= 2 &&
        video.videoWidth > 0
      ) {
        const result = detectRef.current(video, video.videoWidth, video.videoHeight, timestamp)

        // Throttle POST to ~5/s
        if (result && timestamp - lastPostRef.current > 200) {
          lastPostRef.current = timestamp

          const status = result.status as 'FOCUSED' | 'DISTRACTED' | 'NO FACE' | 'ERROR'

          // Update local counters
          if (status === 'FOCUSED' || status === 'DISTRACTED') {
            totalChecksRef.current += 1
            if (status === 'DISTRACTED') distractedChecksRef.current += 1
          }

          const total = totalChecksRef.current
          const distracted = distractedChecksRef.current
          const currentPct = total > 0 ? Math.round((distracted / total) * 100) : 0

          // Update peak
          if (currentPct > peakDistractionPctRef.current) {
            peakDistractionPctRef.current = currentPct
            peakDistractionTimeRef.current = Date.now()
          }

          // Send full snapshot — server just overwrites, no accumulation needed
          fetch(`/api/meeting/${meetingId}/distraction`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              participantId,
              name,
              status,
              totalChecks: total,
              distractedChecks: distracted,
              peakDistractionPct: peakDistractionPctRef.current,
              peakDistractionTime: peakDistractionTimeRef.current,
            }),
          }).catch(() => {})
        }
      }

      rafRef.current = requestAnimationFrame(loop)
    }

    rafRef.current = requestAnimationFrame(loop)

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [isCameraOn, meetingId, participantId, name, videoRef])
}

export default useDistractionDetection
