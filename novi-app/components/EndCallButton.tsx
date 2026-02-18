'use client'

import { PhoneXMarkIcon } from '@heroicons/react/24/solid'
import { useRouter } from 'next/navigation'
import useMeetingStatus from '@/hooks/useMeetingStatus'

interface EndCallButtonProps {
  meetingId: string
  streamRef: React.RefObject<MediaStream | null>
}

const EndCallButton = ({ meetingId, streamRef }: EndCallButtonProps) => {
  const router = useRouter()
  const { endMeeting } = useMeetingStatus(meetingId)

  const handleEndCall = async () => {
    // Tell the server the meeting is over (all other browsers will pick this up via polling)
    await endMeeting()
    // Stop local media tracks
    streamRef.current?.getTracks().forEach((t) => t.stop())
    router.push('/')
  }

  return (
    <button
      onClick={handleEndCall}
      aria-label="End call for everyone"
      className="flex flex-col items-center gap-1 group"
    >
      <div
        className="w-12 h-12 rounded-full bg-red-600 hover:bg-red-700
          flex items-center justify-center transition-all duration-200 hover:scale-110"
      >
        <PhoneXMarkIcon className="w-6 h-6 text-white" />
      </div>
      <span className="text-[10px] text-red-400 group-hover:text-red-300 transition-colors">
        End Call
      </span>
    </button>
  )
}

export default EndCallButton
