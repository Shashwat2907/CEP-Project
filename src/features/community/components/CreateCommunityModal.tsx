'use client'

import React, { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X, Users, AlertCircle, Sparkles } from 'lucide-react'
import { createCommunityAction } from '../actions'

export function CreateCommunityModal() {
  const [isOpen, setIsOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isPrivate, setIsPrivate] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const handleOpen = () => {
    setName('')
    setDescription('')
    setIsPrivate(false)
    setErrorMsg(null)
    setIsOpen(true)
  }

  const handleClose = () => {
    if (isPending) return
    setIsOpen(false)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    if (name.trim().length < 3) {
      setErrorMsg('Community name must be at least 3 characters long.')
      return
    }

    startTransition(async () => {
      const res = await createCommunityAction({
        name: name.trim(),
        description: description.trim() || undefined,
        private: isPrivate,
      })

      if (res.success && res.communityId) {
        setIsOpen(false)
        router.push(`/community/${res.communityId}`)
      } else {
        setErrorMsg(res.error || 'Failed to create community')
      }
    })
  }

  return (
    <>
      <button
        onClick={handleOpen}
        className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-ink text-on-ink hover:opacity-90 shadow-sm transition-all cursor-pointer"
      >
        <Plus size={15} />
        <span>Create Community</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-xl max-w-md w-full p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-border mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 text-primary flex items-center justify-center">
                  <Users size={16} />
                </div>
                <div>
                  <h3 className="font-bold text-sm md:text-base text-ink font-display">
                    Start a New Community
                  </h3>
                  <p className="text-[11px] text-ink-muted">
                    Create a student interest group or study circle
                  </p>
                </div>
              </div>
              <button
                onClick={handleClose}
                disabled={isPending}
                className="text-ink-muted hover:text-ink p-1 rounded-md"
              >
                <X size={16} />
              </button>
            </div>

            {/* Error banner */}
            {errorMsg && (
              <div className="mb-4 p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
                <AlertCircle size={14} className="shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-ink mb-1">
                  Community Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Competitive Programming, AI Builders, Game Dev"
                  maxLength={60}
                  required
                  className="w-full px-3 py-2 text-xs md:text-sm bg-surface-elevated border border-border rounded-lg text-ink focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <span className="text-[10px] text-ink-muted mt-1 block">
                  Keep it clear and recognizable across campus (3–60 chars)
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink mb-1">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What is this community about? Who should join?"
                  maxLength={300}
                  rows={3}
                  className="w-full px-3 py-2 text-xs md:text-sm bg-surface-elevated border border-border rounded-lg text-ink focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                />
                <span className="text-[10px] text-ink-muted mt-1 block">
                  {description.length}/300 characters
                </span>
              </div>

              {/* Private toggle */}
              <div className="p-3 rounded-lg border border-border bg-surface-elevated/50 flex items-start gap-3">
                <input
                  type="checkbox"
                  id="community-private"
                  checked={isPrivate}
                  onChange={(e) => setIsPrivate(e.target.checked)}
                  className="mt-0.5 rounded border-border text-primary focus:ring-primary"
                />
                <label htmlFor="community-private" className="text-xs cursor-pointer select-none">
                  <span className="font-semibold text-ink block">Private Community</span>
                  <span className="text-[11px] text-ink-muted block mt-0.5">
                    If checked, only invited or approved students can view and participate in discussions.
                  </span>
                </label>
              </div>

              {/* Notice */}
              <div className="p-2.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-700 dark:text-indigo-300 text-[11px] flex items-center gap-2">
                <Sparkles size={13} className="shrink-0" />
                <span>As the creator, you will automatically become the room's moderator.</span>
              </div>

              {/* Actions */}
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isPending}
                  className="px-3.5 py-1.5 text-xs text-ink-muted hover:text-ink border border-border rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!name.trim() || isPending}
                  className="px-4 py-1.5 text-xs font-semibold bg-ink text-on-ink hover:opacity-90 rounded-lg disabled:opacity-40 shadow-sm transition-all cursor-pointer"
                >
                  {isPending ? 'Creating...' : 'Create Community'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
