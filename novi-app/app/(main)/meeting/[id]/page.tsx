'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import Loading from '@/components/Loading'
import MeetingSetup from '@/components/MeetingSetup'
import MeetingRoom from '@/components/MeetingRoom'

const MeetingPage = () => {
    const { id } = useParams<{ id: string }>()
    const { isLoaded, user } = useUser()

    const [isSetupComplete, setIsSetupComplete] = useState(false)
    const [cameraOn, setCameraOn] = useState(true)
    const [micOn, setMicOn] = useState(true)
    const [isHost, setIsHost] = useState(false)
    const [description, setDescription] = useState('')

    useEffect(() => {
        if (!id || !user) return
        // Check if the current user created this meeting (host)
        const hostId = sessionStorage.getItem(`meeting_${id}_host`)
        const desc = sessionStorage.getItem(`meeting_${id}_description`) ?? ''
        setIsHost(hostId === user.id)
        setDescription(desc)
    }, [id, user])

    if (!isLoaded) return <Loading />

    if (!id) return (
        <p className="text-center text-3xl font-bold text-white mt-20">
            Invalid meeting link
        </p>
    )

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