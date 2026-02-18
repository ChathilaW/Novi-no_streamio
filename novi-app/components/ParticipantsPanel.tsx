'use client'

import {
  VideoCameraIcon,
  VideoCameraSlashIcon,
  MicrophoneIcon,
  SpeakerXMarkIcon,
  XMarkIcon,
  UsersIcon,
  LinkIcon,
  CheckIcon,
} from '@heroicons/react/24/solid'
import type { Participant } from '@/hooks/useParticipants'

interface ParticipantsPanelProps {
  participants: Participant[]
  isOpen: boolean
  onClose: () => void
  copied: boolean
  copyLink: () => void
}

const ParticipantsPanel = ({ participants, isOpen, onClose, copied, copyLink }: ParticipantsPanelProps) => {
  if (!isOpen) return null

  // Sort: host first, then alphabetically
  const sorted = [...participants].sort((a, b) => {
    if (a.isHost && !b.isHost) return -1
    if (!a.isHost && b.isHost) return 1
    return a.name.localeCompare(b.name)
  })

  return (
    <div
      className="
        flex flex-col
        w-64 flex-shrink-0
        bg-gray-900/95 backdrop-blur-md
        rounded-2xl
        border border-gray-700/50
        shadow-2xl
        overflow-hidden
        animate-slide-in-right
      "
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700/50 flex-shrink-0">
        <div className="flex items-center gap-2">
          <UsersIcon className="w-4 h-4 text-blue-400" />
          <span className="text-white font-semibold text-sm">Participants</span>
          <span className="ml-1 bg-blue-600/30 text-blue-300 text-xs font-bold px-2 py-0.5 rounded-full">
            {participants.length}
          </span>
        </div>
        <button
          onClick={onClose}
          aria-label="Close participants panel"
          className="w-6 h-6 rounded-full flex items-center justify-center
            text-gray-400 hover:text-white hover:bg-gray-700
            transition-all duration-150"
        >
          <XMarkIcon className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Participant list — scrollable, fills remaining height */}
      <div className="flex-1 overflow-y-auto py-2 px-2 space-y-1 min-h-0">
        {sorted.length === 0 ? (
          <p className="text-gray-500 text-xs text-center mt-8">No participants yet</p>
        ) : (
          sorted.map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl
                bg-gray-800/60 hover:bg-gray-800/90 transition-colors duration-150"
            >
              {/* Avatar */}
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600
                flex items-center justify-center flex-shrink-0 shadow-md">
                <span className="text-white text-xs font-bold uppercase">
                  {p.name.charAt(0)}
                </span>
              </div>

              {/* Name + host badge */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-white text-xs font-medium truncate">
                    {p.name}
                  </span>
                  {p.isHost && (
                    <span className="bg-orange-500/20 text-orange-400 text-[9px]
                      font-bold px-1.5 py-0.5 rounded-full border border-orange-500/30
                      flex-shrink-0">
                      Host
                    </span>
                  )}
                </div>
              </div>

              {/* Camera & Mic status icons */}
              <div className="flex items-center gap-1 flex-shrink-0">
                {p.isCameraOn ? (
                  <VideoCameraIcon className="w-3.5 h-3.5 text-gray-400" title="Camera on" />
                ) : (
                  <VideoCameraSlashIcon className="w-3.5 h-3.5 text-red-500" title="Camera off" />
                )}
                {p.isMicOn ? (
                  <MicrophoneIcon className="w-3.5 h-3.5 text-gray-400" title="Mic on" />
                ) : (
                  <SpeakerXMarkIcon className="w-3.5 h-3.5 text-red-500" title="Muted" />
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer — Invite button */}
      <div className="flex-shrink-0 px-3 py-3 border-t border-gray-700/50">
        <button
          onClick={copyLink}
          aria-label="Copy invite link"
          className={`w-full flex items-center justify-center gap-2 py-2 rounded-xl
            text-sm font-semibold transition-all duration-200
            ${
              copied
                ? 'bg-green-600/20 text-green-400 border border-green-600/40'
                : 'bg-blue-600/20 text-blue-300 border border-blue-600/40 hover:bg-blue-600/30'
            }`}
        >
          {copied ? (
            <><CheckIcon className="w-4 h-4" />Link Copied!</>
          ) : (
            <><LinkIcon className="w-4 h-4" />Invite</>  
          )}
        </button>
      </div>
    </div>
  )
}

export default ParticipantsPanel
