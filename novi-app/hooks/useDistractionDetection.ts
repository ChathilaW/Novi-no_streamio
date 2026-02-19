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
 * All cumulative counters are kept client-side (Vercel-safe stateless relay).
 *
 * NO FACE smoothing: requires NO_FACE_THRESHOLD consecutive NO FACE frames
 * before treating the participant as undetected. Single dropped frames reuse
 * the last known FOCUSED/DISTRACTED status instead, eliminating false positives.
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

  // Client-side cumulative counters
  const totalChecksRef = useRef(0)
  const distractedChecksRef = useRef(0)
  const peakDistractionPctRef = useRef(0)
  const peakDistractionTimeRef = useRef(0)

  // NO FACE smoothing — only report NO FACE after N consecutive misses
  const consecutiveNoFaceRef = useRef(0)
  const lastKnownStatusRef = useRef<'FOCUSED' | 'DISTRACTED' | null>(null)
  const NO_FACE_THRESHOLD = 8 // ~1.6s at 200ms intervals

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
      fetch(`/api/meeting/${meetingId}/distraction?participantId=${participantId}`, {
        method: 'DELETE',
        keepalive: true,
      }).catch(() => {})
    }
  }, [meetingId, participantId])

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

        if (result && timestamp - lastPostRef.current > 200) {
          lastPostRef.current = timestamp

          let status = result.status as 'FOCUSED' | 'DISTRACTED' | 'NO FACE' | 'ERROR'

          // Smooth out transient NO FACE frames
          if (status === 'NO FACE') {
            consecutiveNoFaceRef.current += 1
            if (
              consecutiveNoFaceRef.current < NO_FACE_THRESHOLD &&
              lastKnownStatusRef.current !== null
            ) {
              // Not enough consecutive misses yet — reuse last known good status
              status = lastKnownStatusRef.current
            }
          } else {
            consecutiveNoFaceRef.current = 0
            if (status === 'FOCUSED' || status === 'DISTRACTED') {
              lastKnownStatusRef.current = status
            }
          }

          // Update counters only for meaningful statuses
          if (status === 'FOCUSED' || status === 'DISTRACTED') {
            totalChecksRef.current += 1
            if (status === 'DISTRACTED') distractedChecksRef.current += 1
          }

          const total = totalChecksRef.current
          const distracted = distractedChecksRef.current
          const currentPct = total > 0 ? Math.round((distracted / total) * 100) : 0

          if (currentPct > peakDistractionPctRef.current) {
            peakDistractionPctRef.current = currentPct
            peakDistractionTimeRef.current = Date.now()
          }

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
