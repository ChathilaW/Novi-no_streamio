'use client'

import { useEffect, useRef, useState } from 'react'
import {
  VideoCameraIcon,
  VideoCameraSlashIcon,
  MicrophoneIcon,
  SpeakerXMarkIcon,
  LinkIcon,
  CheckIcon,
} from '@heroicons/react/24/solid'
import EndCallButton from './EndCallButton'
import useCopyLink from '@/hooks/useCopyLink'

interface MeetingRoomProps {
  meetingId: string
  initialCameraOn: boolean
  initialMicOn: boolean
  isHost: boolean
  description?: string
}

const MeetingRoom = ({
  meetingId,
  initialCameraOn,
  initialMicOn,
  isHost,
  description,
}: MeetingRoomProps) => {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const [isCameraOn, setIsCameraOn] = useState(initialCameraOn)
  const [isMicOn, setIsMicOn] = useState(initialMicOn)
  const [cameraError, setCameraError] = useState(false)

  const { copied, copyLink } = useCopyLink()

  useEffect(() => {
    const startStream = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        })
        streamRef.current = stream
        stream.getVideoTracks().forEach((t) => (t.enabled = initialCameraOn))
        stream.getAudioTracks().forEach((t) => (t.enabled = initialMicOn))
        if (videoRef.current) {
          videoRef.current.srcObject = stream
        }
      } catch (err) {
        console.error('Could not access camera/mic:', err)
        setCameraError(true)
      }
    }
    startStream()

    return () => {
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

  return (
    <div className="relative min-h-screen bg-gray-950 flex flex-col items-center justify-center overflow-hidden">

      {/* ── Top-left: Copy Link button ── */}
      <div className="absolute top-5 left-5 z-20">
        <button
          onClick={() => copyLink()}
          aria-label="Copy meeting link"
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold
            shadow-lg transition-all duration-200 hover:scale-105
            ${copied
              ? 'bg-green-600 text-white'
              : 'bg-gray-800/90 text-gray-200 hover:bg-gray-700 border border-gray-600/50'
            }`}
        >
          {copied ? (
            <><CheckIcon className="w-4 h-4" />Link Copied!</>
          ) : (
            <><LinkIcon className="w-4 h-4" />Copy Link</>
          )}
        </button>
      </div>

      {/* Meeting description */}
      {description && (
        <div className="absolute top-5 left-1/2 -translate-x-1/2 z-10
          bg-gray-800/80 backdrop-blur-sm text-white text-sm px-5 py-2 rounded-full shadow-lg">
          {description}
        </div>
      )}

      {/* Host badge */}
      {isHost && (
        <div className="absolute top-5 right-5 z-10
          bg-orange-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg">
          Host
        </div>
      )}

      {/* Main video tile */}
      <div className="relative w-full max-w-3xl aspect-video bg-gray-800 rounded-2xl overflow-hidden shadow-2xl mx-4">
        {(cameraError || !isCameraOn) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-10">
            <div className="w-24 h-24 rounded-full bg-gray-700 flex items-center justify-center">
              <VideoCameraSlashIcon className="w-12 h-12 text-gray-400" />
            </div>
            <p className="text-gray-400 text-sm">
              {cameraError ? 'Camera unavailable' : 'Camera is off'}
            </p>
          </div>
        )}
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className={`w-full h-full object-cover scale-x-[-1] transition-opacity duration-300
            ${isCameraOn && !cameraError ? 'opacity-100' : 'opacity-0'}`}
        />
        {!isMicOn && (
          <div className="absolute bottom-3 left-3 z-20 bg-red-600/90 text-white text-xs
            font-semibold px-2.5 py-1 rounded-full flex items-center gap-1.5">
            <SpeakerXMarkIcon className="w-3.5 h-3.5" />
            Muted
          </div>
        )}
      </div>

      {/* ── Bottom Navbar ── */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50
        flex items-center gap-3 bg-gray-900/90 backdrop-blur-md
        px-6 py-3 rounded-full shadow-2xl border border-gray-700/50">

        {/* Camera toggle */}
        <button
          onClick={toggleCamera}
          aria-label={isCameraOn ? 'Turn camera off' : 'Turn camera on'}
          className="flex flex-col items-center gap-1 group"
        >
          <div className={`w-12 h-12 rounded-full flex items-center justify-center
            transition-all duration-200 hover:scale-110
            ${isCameraOn ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-600 hover:bg-red-700'}`}>
            {isCameraOn
              ? <VideoCameraIcon className="w-6 h-6 text-white" />
              : <VideoCameraSlashIcon className="w-6 h-6 text-white" />}
          </div>
          <span className="text-[10px] text-gray-400 group-hover:text-gray-200 transition-colors">
            {isCameraOn ? 'Camera' : 'Camera Off'}
          </span>
        </button>

        {/* Mic toggle */}
        <button
          onClick={toggleMic}
          aria-label={isMicOn ? 'Mute microphone' : 'Unmute microphone'}
          className="flex flex-col items-center gap-1 group"
        >
          <div className={`w-12 h-12 rounded-full flex items-center justify-center
            transition-all duration-200 hover:scale-110
            ${isMicOn ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-600 hover:bg-red-700'}`}>
            {isMicOn
              ? <MicrophoneIcon className="w-6 h-6 text-white" />
              : <SpeakerXMarkIcon className="w-6 h-6 text-white" />}
          </div>
          <span className="text-[10px] text-gray-400 group-hover:text-gray-200 transition-colors">
            {isMicOn ? 'Mic' : 'Muted'}
          </span>
        </button>

        {isHost && <div className="w-px h-8 bg-gray-700 mx-1" />}
        {isHost && <EndCallButton meetingId={meetingId} streamRef={streamRef} />}
      </div>
    </div>
  )
}

export default MeetingRoom
