'use client'

import { XMarkIcon, ChartBarIcon, ExclamationTriangleIcon } from '@heroicons/react/24/solid'
import GroupSpeedometer from './Group-Speedometer'
import useGroupDistraction from '@/hooks/useGroupDistraction'

type Props = {
  meetingId: string
  isOpen: boolean
  onClose: () => void
}

const DISTRACTION_THRESHOLD = 75 // percent

export default function GroupDashboard({ meetingId, isOpen, onClose }: Props) {
  const { distractedCount, totalCount, participants } = useGroupDistraction(meetingId)

  if (!isOpen) return null

  // Participants with cumulative distraction > threshold, sorted worst first
  const highlyDistracted = participants
    .filter((p) => p.totalChecks >= 10 && p.distractionPct >= DISTRACTION_THRESHOLD)
    .sort((a, b) => b.distractionPct - a.distractionPct)

  return (
    <div
      className="
        flex flex-col
        w-72 flex-shrink-0
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
          <ChartBarIcon className="w-4 h-4 text-purple-400" />
          <span className="text-white font-semibold text-sm">Group Dashboard</span>
        </div>
        <button
          onClick={onClose}
          aria-label="Close dashboard"
          className="w-6 h-6 rounded-full flex items-center justify-center
            text-gray-400 hover:text-white hover:bg-gray-700 transition-all duration-150"
        >
          <XMarkIcon className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto min-h-0">

        {/* ── Speedometer section ── */}
        <div className="flex items-center justify-center px-4 py-5 border-b border-gray-700/50">
          {totalCount === 0 ? (
            <div className="text-center py-4">
              <p className="text-gray-500 text-sm">Waiting for participants…</p>
              <p className="text-gray-600 text-xs mt-1">Detection starts when cameras are on</p>
            </div>
          ) : (
            <GroupSpeedometer
              distractedCount={distractedCount}
              totalCount={totalCount}
            />
          )}
        </div>

        {/* ── Distracted Participants section ── */}
        <div className="px-3 py-3">
          <div className="flex items-center gap-1.5 mb-2">
            <ExclamationTriangleIcon className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
            <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
              Distracted Participants
            </span>
            <span className="ml-auto text-[10px] text-gray-600">&gt;{DISTRACTION_THRESHOLD}%</span>
          </div>

          {totalCount === 0 ? (
            <p className="text-gray-600 text-xs text-center py-3">No data yet</p>
          ) : highlyDistracted.length === 0 ? (
            <p className="text-green-500/70 text-xs text-center py-3">
              ✓ No highly distracted participants
            </p>
          ) : (
            <div className="space-y-1.5">
              {highlyDistracted.map((p) => (
                <div
                  key={p.participantId}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20"
                >
                  {/* Avatar */}
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-red-500 to-orange-600
                    flex items-center justify-center flex-shrink-0 shadow">
                    <span className="text-white text-[10px] font-bold uppercase">
                      {p.name.charAt(0)}
                    </span>
                  </div>

                  {/* Name */}
                  <span className="flex-1 text-xs text-white font-medium truncate min-w-0">
                    {p.name}
                  </span>

                  {/* Distraction % */}
                  <span className="text-xs font-bold text-red-400 flex-shrink-0">
                    {p.distractionPct}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}