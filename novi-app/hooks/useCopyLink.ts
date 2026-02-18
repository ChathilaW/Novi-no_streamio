import { useState } from 'react'

/**
 * useCopyLink — copies the given URL (or current page URL) to the clipboard.
 * Returns { copied, copyLink } where `copied` is true for 2 seconds after copying.
 */
const useCopyLink = () => {
  const [copied, setCopied] = useState(false)

  const copyLink = async (url?: string) => {
    const target = url ?? window.location.href
    try {
      await navigator.clipboard.writeText(target)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy link:', err)
    }
  }

  return { copied, copyLink }
}

export default useCopyLink
