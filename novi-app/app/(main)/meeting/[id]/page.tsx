'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { HomeIcon } from '@heroicons/react/24/solid'
import Loading from '@/components/Loading'
import MeetingSetup from '@/components/group-meeting/MeetingSetup'
import MeetingRoom from '@/components/group-meeting/MeetingRoom'
import useMeetingStatus from '@/hooks/useMeetingStatus'

const MeetingPage = () => {
    const { id } = useParams<{ id: string }>()
    const { isLoaded, user } = useUser()
    const router = useRouter()

    const [isSetupComplete, setIsSetupComplete] = useState(false)
    const [cameraOn, setCameraOn] = useState(true)
    const [micOn, setMicOn] = useState(true)
    const [isHost, setIsHost] = useState(false)
    const [description, setDescription] = useState('')
    const [showEnded, setShowEnded] = useState(false)

    const { isEnded } = useMeetingStatus(id ?? '')

    // When the meeting is ended by the host, show the ended screen
    useEffect(() => {
        if (isEnded) {
            setShowEnded(true)
        }
    }, [isEnded])

    useEffect(() => {
        if (!id || !user) return
        const storedValue = sessionStorage.getItem(`meeting_${id}_host`)
        const desc = sessionStorage.getItem(`meeting_${id}_description`) ?? ''
        setIsHost(storedValue === user.id)
        setDescription(desc)
    }, [id, user])

    if (!isLoaded) return <Loading />

    if (!id) return (
        <p className="text-center text-3xl font-bold text-white mt-20">
            Invalid meeting link
        </p>
    )

    // Meeting ended screen — shown to all participants (and host if they somehow land here)
    if (showEnded) {
        return (
            <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-6 px-4">
                <div className="flex flex-col items-center gap-5 text-center max-w-sm">
                    <div className="w-16 h-16 rounded-full bg-red-600/20 flex items-center justify-center">
                        <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-black text-white">Meeting ended by the host</h1>
                    <button
                        onClick={() => router.push('/')}
                        className="flex items-center gap-2 mt-2 bg-blue-600 hover:bg-blue-700 text-white
                            font-bold px-8 py-3 rounded-2xl transition-all duration-200 hover:scale-105"
                    >
                        <HomeIcon className="w-5 h-5" />
                        Go to Home
                    </button>
                </div>
            </div>
        )
    }

    const handleJoin = (camOn: boolean, micOn: boolean) => {
        setCameraOn(camOn)
        setMicOn(micOn)
        setIsSetupComplete(true)
    }

    return (
        <main className="h-screen w-full">
            {!isSetupComplete ? (
                <MeetingSetup
                    onJoin={handleJoin}
                    description={description}
                />
            ) : (
                <MeetingRoom
                    meetingId={id}
                    initialCameraOn={cameraOn}
                    initialMicOn={micOn}
                    isHost={isHost}
                    description={description}
                />
            )}
        </main>
    )
}

export default MeetingPage