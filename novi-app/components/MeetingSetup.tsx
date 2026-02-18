'use client'

import { useEffect, useRef, useState } from 'react'
import {
  VideoCameraIcon,
  VideoCameraSlashIcon,
  MicrophoneIcon,
  SpeakerXMarkIcon,
} from '@heroicons/react/24/solid'
import { Button } from './ui/button'

interface MeetingSetupProps {
  onJoin: (cameraOn: boolean, micOn: boolean) => void
  description?: string
}

const MeetingSetup = ({ onJoin, description }: MeetingSetupProps) => {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const [isCameraOn, setIsCameraOn] = useState(true)
  const [isMicOn, setIsMicOn] = useState(true)
  const [cameraError, setCameraError] = useState(false)

  // Start camera stream on mount
  useEffect(() => {
    const startStream = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        })
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
        }
        // Apply initial states
        stream.getVideoTracks().forEach((t) => (t.enabled = isCameraOn))
        stream.getAudioTracks().forEach((t) => (t.enabled = isMicOn))
      } catch (err) {
        console.error('Could not access camera/mic:', err)
        setCameraError(true)
      }
    }
    startStream()

    return () => {
      // Stop all tracks when leaving setup
      streamRef.current?.getTracks().forEach((t) => t.stop())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const toggleCamera = () => {
    const next = !isCameraOn
    setIsCameraOn(next)
    streamRef.current?.getVideoTracks().forEach((t) => (t.enabled = next))
  }

  const toggleMic = () => {
    const next = !isMicOn
    setIsMicOn(next)
    streamRef.current?.getAudioTracks().forEach((t) => (t.enabled = next))
  }

  const handleJoin = () => {
    // Stop the setup stream — MeetingRoom will create its own
    streamRef.current?.getTracks().forEach((t) => t.stop())
    onJoin(isCameraOn, isMicOn)
  }

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center gap-8 px-4">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-black text-white mb-1">Ready to join?</h1>
        {description && (
          <p className="text-gray-400 text-sm max-w-md">{description}</p>
        )}
      </div>

      {/* Camera preview */}
      <div className="relative w-full max-w-lg aspect-video bg-gray-800 rounded-2xl overflow-hidden shadow-2xl">
        {cameraError || !isCameraOn ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <div className="w-20 h-20 rounded-full bg-gray-700 flex items-center justify-center">
              <VideoCameraSlashIcon className="w-10 h-10 text-gray-400" />
            </div>
            <p className="text-gray-400 text-sm">
              {cameraError ? 'Camera unavailable' : 'Camera is off'}
            </p>
          </div>
        ) : null}
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className={`w-full h-full object-cover scale-x-[-1] transition-opacity duration-300 ${
            isCameraOn && !cameraError ? 'opacity-100' : 'opacity-0'
          }`}
        />
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4">
        {/* Camera toggle */}
        <button
          onClick={toggleCamera}
          className={`flex flex-col items-center gap-1.5 group`}
          aria-label={isCameraOn ? 'Turn camera off' : 'Turn camera on'}
        >
          <div
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200 shadow-lg
              ${isCameraOn
                ? 'bg-gray-700 hover:bg-gray-600'
                : 'bg-red-600 hover:bg-red-700'
              }`}
          >
            {isCameraOn ? (
              <VideoCameraIcon className="w-7 h-7 text-white" />
            ) : (
              <VideoCameraSlashIcon className="w-7 h-7 text-white" />
            )}
          </div>
          <span className="text-xs text-gray-400">
            {isCameraOn ? 'Camera On' : 'Camera Off'}
          </span>
        </button>

        {/* Mic toggle */}
        <button
          onClick={toggleMic}
          className={`flex flex-col items-center gap-1.5 group`}
          aria-label={isMicOn ? 'Mute microphone' : 'Unmute microphone'}
        >
          <div
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200 shadow-lg
              ${isMicOn
                ? 'bg-gray-700 hover:bg-gray-600'
                : 'bg-red-600 hover:bg-red-700'
              }`}
          >
            {isMicOn ? (
              <MicrophoneIcon className="w-7 h-7 text-white" />
            ) : (
              <SpeakerXMarkIcon className="w-7 h-7 text-white" />
            )}
          </div>
          <span className="text-xs text-gray-400">
            {isMicOn ? 'Mic On' : 'Mic Off'}
          </span>
        </button>
      </div>

      {/* Join button */}
      <Button
        onClick={handleJoin}
        className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg px-12 py-6 rounded-2xl
          transition-all duration-200 hover:scale-105 shadow-lg shadow-blue-900/40"
      >
        Join Meeting
      </Button>
    </div>
  )
}

export default MeetingSetup
