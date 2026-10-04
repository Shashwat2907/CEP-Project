'use client'

import * as React from 'react'
import {
  Search,
  Plus,
  ShieldCheck,
  MapPin,
  Clock,
  Filter,
  AlertTriangle,
  Building2,
  CheckCircle2,
  HelpCircle,
  Eye,
  EyeOff,
  UserCheck,
  CreditCard,
  Flag,
  FileText,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/shared/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/shared/ui/dialog'
import {
  ITEM_CATEGORIES,
  CAMPUS_LOCATIONS,
  DROPOFF_POINTS,
  LOST_FOUND_STATUS_METAS,
  type LostFoundItemRecord,
  type ItemType,
  type ItemCategory,
  type ItemStatus,
} from '../schema'
import {
  reportLostItemAction,
  reportFoundItemAction,
  submitClaimAction,
  reviewClaimAction,
  confirmPickupWithDigitalIdAction,
  reportAbuseAction,
} from '../actions'

export interface LostFoundDashboardProps {
  initialItems?: LostFoundItemRecord[]
  currentUserId?: string
  currentCollegeId?: string
}

export function LostFoundDashboard({
  initialItems = [],
  currentUserId = '00000000-0000-0000-0000-000000000001',
  currentCollegeId = '23BCE1042',
}: LostFoundDashboardProps) {
  const [items, setItems] = React.useState<LostFoundItemRecord[]>(initialItems)
  const [activeTab, setActiveTab] = React.useState<'all' | 'lost' | 'found'>('all')
  const [selectedCategory, setSelectedCategory] = React.useState<'all' | ItemCategory>('all')
  const [selectedStatus, setSelectedStatus] = React.useState<'all' | ItemStatus>('all')
  const [searchQuery, setSearchQuery] = React.useState('')

  // Modals
  const [isReportLostOpen, setIsReportLostOpen] = React.useState(false)
  const [isReportFoundOpen, setIsReportFoundOpen] = React.useState(false)
  const [isClaimOpen, setIsClaimOpen] = React.useState(false)
  const [isPickupOpen, setIsPickupOpen] = React.useState(false)
  const [isAbuseOpen, setIsAbuseOpen] = React.useState(false)
  const [selectedItem, setSelectedItem] = React.useState<LostFoundItemRecord | null>(null)
  const [generatedHandoverCode, setGeneratedHandoverCode] = React.useState<string | null>(null)
  const [feedback, setFeedback] = React.useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  // Report Lost Form State
  const [lostCategory, setLostCategory] = React.useState<ItemCategory>('electronics')
  const [lostTitle, setLostTitle] = React.useState('')
  const [lostDesc, setLostDesc] = React.useState('')
  const [lostLocation, setLostLocation] = React.useState<string>(CAMPUS_LOCATIONS[0])
  const [lostDate, setLostDate] = React.useState(new Date().toISOString().slice(0, 10))
  const [lostTimeWindow, setLostTimeWindow] = React.useState('Morning (09:00 - 12:00)')

  // Report Found Form State
  const [foundCategory, setFoundCategory] = React.useState<ItemCategory>('electronics')
  const [foundTitle, setFoundTitle] = React.useState('')
  const [foundDesc, setFoundDesc] = React.useState('')
  const [foundHiddenDetail, setFoundHiddenDetail] = React.useState('')
  const [foundQuestion, setFoundQuestion] = React.useState('')
  const [foundLocation, setFoundLocation] = React.useState<string>(CAMPUS_LOCATIONS[0])
  const [foundDropoff, setFoundDropoff] = React.useState<string>(DROPOFF_POINTS[0])
  const [foundDate, setFoundDate] = React.useState(new Date().toISOString().slice(0, 10))
  const [foundTimeWindow, setFoundTimeWindow] = React.useState('Afternoon (14:00 - 16:00)')

  // Claim Form State
  const [claimAnswer, setClaimAnswer] = React.useState('')
  const [claimProof, setClaimProof] = React.useState('')

  // Pickup Form State
  const [claimantDigitalIdInput, setClaimantDigitalIdInput] = React.useState(currentCollegeId)
  const [pickupNotes, setPickupNotes] = React.useState('')

  // Abuse Form State
  const [abuseReason, setAbuseReason] = React.useState('')

  // Filtered Items
  const filteredItems = React.useMemo(() => {
    return items.filter((item) => {
      const matchesTab = activeTab === 'all' || item.type === activeTab
      const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory
      const matchesStatus = selectedStatus === 'all' || item.status === selectedStatus
      const matchesSearch =
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.location.toLowerCase().includes(searchQuery.toLowerCase())

      return matchesTab && matchesCategory && matchesStatus && matchesSearch
    })
  }, [items, activeTab, selectedCategory, selectedStatus, searchQuery])

  // Handlers
  const handleReportLost = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!lostTitle.trim()) return
    setIsSubmitting(true)
    try {
      const res = await reportLostItemAction({
        category: lostCategory,
        title: lostTitle.trim(),
        description: lostDesc.trim(),
        location: lostLocation,
        incidentDate: lostDate,
        timeWindow: lostTimeWindow,
        photoUrls: [],
      })
      if (res.ok && res.data) {
        setItems((prev) => [res.data!, ...prev])
        setFeedback(`Lost item "${res.data.title}" reported successfully. We will alert you on potential matches.`)
        setIsReportLostOpen(false)
        setLostTitle('')
        setLostDesc('')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReportFound = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!foundTitle.trim() || !foundHiddenDetail.trim() || !foundQuestion.trim()) return
    setIsSubmitting(true)
    try {
      const res = await reportFoundItemAction({
        category: foundCategory,
        title: foundTitle.trim(),
        description: foundDesc.trim(),
        hiddenDetail: foundHiddenDetail.trim(),
        verificationQuestion: foundQuestion.trim(),
        location: foundLocation,
        dropoffPoint: foundDropoff as any,
        incidentDate: foundDate,
        timeWindow: foundTimeWindow,
        photoUrls: [],
      })
      if (res.ok && res.data) {
        setItems((prev) => [res.data!, ...prev])
        setGeneratedHandoverCode(res.data.handoverCode || 'HO-1092')
        setFeedback(`Found item logged! Handover code generated for finder drop-off.`)
        setIsReportFoundOpen(false)
        setFoundTitle('')
        setFoundDesc('')
        setFoundHiddenDetail('')
        setFoundQuestion('')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSubmitClaim = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedItem || !claimAnswer.trim()) return
    setIsSubmitting(true)
    try {
      const res = await submitClaimAction({
        itemId: selectedItem.id,
        answerToQuestion: claimAnswer.trim(),
        additionalProof: claimProof.trim() || undefined,
      })
      if (res.ok) {
        setItems((prev) =>
          prev.map((i) => (i.id === selectedItem.id ? { ...i, status: 'claim_under_review' } : i))
        )
        setFeedback(res.message)
        setIsClaimOpen(false)
        setClaimAnswer('')
        setClaimProof('')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleConfirmPickup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedItem || !claimantDigitalIdInput.trim()) return
    setIsSubmitting(true)
    try {
      const res = await confirmPickupWithDigitalIdAction({
        itemId: selectedItem.id,
        claimId: 'claim-active',
        claimantDigitalId: claimantDigitalIdInput.trim(),
        deskNotes: pickupNotes.trim() || undefined,
      })
      if (res.ok) {
        setItems((prev) =>
          prev.map((i) =>
            i.id === selectedItem.id
              ? {
                  ...i,
                  status: 'returned',
                  pickupDigitalId: claimantDigitalIdInput.trim(),
                }
              : i
          )
        )
        setFeedback(res.message)
        setIsPickupOpen(false)
        setPickupNotes('')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReportAbuse = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedItem || !abuseReason.trim()) return
    setIsSubmitting(true)
    try {
      const res = await reportAbuseAction({
        itemId: selectedItem.id,
        reason: abuseReason.trim(),
      })
      if (res.ok) {
        setItems((prev) => prev.filter((i) => i.id !== selectedItem.id))
        setFeedback(res.message)
        setIsAbuseOpen(false)
        setAbuseReason('')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* 1. Header & Quick Actions */}
      <div className="bg-surface border border-border rounded-lg p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-border">
          <div>
            <h1 className="font-display text-h1 font-bold text-ink tracking-tight">
              Campus Lost & Found
            </h1>
            <p className="text-small text-ink-muted mt-0.5">
              Verified campus drop-off desks, anti-theft secret questions, and Digital ID pickup confirmation.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsReportLostOpen(true)}
            >
              <span>I Lost Something</span>
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsReportFoundOpen(true)}
            >
              <Plus size={15} />
              <span>I Found Something</span>
            </Button>
          </div>
        </div>

        {/* Handover Code Banner for Finders (Finder Safety) */}
        {generatedHandoverCode && (
          <div className="p-4 rounded-md bg-highlight/15 border border-highlight text-ink space-y-1 animate-in fade-in">
            <div className="flex items-center justify-between">
              <span className="font-display text-small font-bold flex items-center gap-1.5 uppercase tracking-wide">
                <ShieldCheck size={16} /> Finder Safety Handover Code
              </span>
              <button
                type="button"
                onClick={() => setGeneratedHandoverCode(null)}
                className="text-xs font-mono underline hover:text-ink cursor-pointer"
              >
                Done
              </button>
            </div>
            <p className="text-small text-ink leading-snug">
              Please drop off the item at your selected campus desk. Present this code to security:
            </p>
            <div className="mt-1 font-mono text-xl font-bold bg-surface px-3 py-1.5 rounded-sm border border-border inline-block tracking-wider">
              {generatedHandoverCode}
            </div>
          </div>
        )}

        {/* Feedback message */}
        {feedback && (
          <div className="p-3 bg-in-campus/10 border border-in-campus/30 rounded-sm text-small text-in-campus flex items-center justify-between">
            <span>{feedback}</span>
            <button
              type="button"
              onClick={() => setFeedback(null)}
              className="text-xs font-mono underline hover:text-ink cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search items by keyword, item name, or location..."
              className="w-full bg-surface-sunken border border-border rounded-sm pl-9 pr-3 py-2 text-small font-body text-ink placeholder:text-ink-muted focus-visible:outline-2 focus-visible:outline-ink"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value as any)}
              className="bg-surface-sunken border border-border rounded-sm px-3 py-2 text-small font-medium text-ink focus-visible:outline-2 focus-visible:outline-ink cursor-pointer"
            >
              <option value="all">All Categories</option>
              {ITEM_CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as any)}
              className="bg-surface-sunken border border-border rounded-sm px-3 py-2 text-small font-medium text-ink focus-visible:outline-2 focus-visible:outline-ink cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="reported">Reported</option>
              <option value="matched">Matched</option>
              <option value="claim_under_review">Claim Under Review</option>
              <option value="ready_for_pickup">Ready for Pickup</option>
              <option value="returned">Returned</option>
              <option value="expired">Expired</option>
            </select>
          </div>
        </div>

        {/* Type Switcher Tabs */}
        <div className="flex items-center gap-2 pt-1 border-t border-border">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={cn(
              'px-3 py-1 rounded-sm text-small font-medium transition-colors cursor-pointer border',
              activeTab === 'all'
                ? 'bg-ink text-on-ink border-ink'
                : 'bg-surface text-ink-muted border-border hover:bg-surface-sunken hover:text-ink'
            )}
          >
            All Items ({items.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('found')}
            className={cn(
              'px-3 py-1 rounded-sm text-small font-medium transition-colors cursor-pointer border',
              activeTab === 'found'
                ? 'bg-ink text-on-ink border-ink'
                : 'bg-surface text-ink-muted border-border hover:bg-surface-sunken hover:text-ink'
            )}
          >
            Found Items ({items.filter((i) => i.type === 'found').length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('lost')}
            className={cn(
              'px-3 py-1 rounded-sm text-small font-medium transition-colors cursor-pointer border',
              activeTab === 'lost'
                ? 'bg-ink text-on-ink border-ink'
                : 'bg-surface text-ink-muted border-border hover:bg-surface-sunken hover:text-ink'
            )}
          >
            Lost Items ({items.filter((i) => i.type === 'lost').length})
          </button>
        </div>
      </div>

      {/* 2. Items Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredItems.length === 0 ? (
          <div className="col-span-full py-12 text-center bg-surface border border-dashed border-border rounded-lg p-6 space-y-3">
            <HelpCircle size={36} className="mx-auto text-ink-muted opacity-50" />
            <h3 className="font-display text-h2 font-bold text-ink">
              No lost & found listings match your criteria.
            </h3>
            <p className="text-small text-ink-muted max-w-sm mx-auto">
              If you lost an item, report it now so you are notified as soon as someone turns it in.
            </p>
          </div>
        ) : (
          filteredItems.map((item) => {
            const statusMeta = LOST_FOUND_STATUS_METAS[item.status] || {
              label: item.status,
              badgeClass: 'bg-surface-sunken text-ink-muted',
            }

            return (
              <div
                key={item.id}
                className="bg-surface border border-border rounded-md p-5 transition-colors hover:border-ink/50 space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  {/* Status row */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={cn(
                          'text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-sm border',
                          statusMeta.badgeClass
                        )}
                      >
                        {statusMeta.label}
                      </span>
                      <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded-xs bg-surface-sunken text-ink-muted border border-border">
                        {item.type.toUpperCase()}
                      </span>
                    </div>

                    <span className="text-[11px] font-mono text-ink-muted">
                      {item.incidentDate}
                    </span>
                  </div>

                  {/* Title & Description */}
                  <div>
                    <h3 className="font-display text-base font-bold text-ink leading-snug">
                      {item.title}
                    </h3>
                    <p className="text-small text-ink-muted mt-1 leading-normal line-clamp-2">
                      {item.description}
                    </p>
                  </div>

                  {/* Metadata Chips */}
                  <div className="space-y-1.5 text-[11px] font-mono text-ink-muted pt-1 border-t border-border">
                    <div className="flex items-center gap-1">
                      <MapPin size={12} className="shrink-0" />
                      <span className="truncate">{item.location}</span>
                    </div>

                    {item.dropoffPoint && (
                      <div className="flex items-center gap-1 text-ink font-semibold">
                        <Building2 size={12} className="shrink-0 text-in-campus" />
                        <span className="truncate">Desk: {item.dropoffPoint}</span>
                      </div>
                    )}

                    {item.timeWindow && (
                      <div className="flex items-center gap-1">
                        <Clock size={12} className="shrink-0" />
                        <span>{item.timeWindow}</span>
                      </div>
                    )}

                    {item.pickupDigitalId && (
                      <div className="flex items-center gap-1 text-in-campus font-bold">
                        <CheckCircle2 size={12} className="shrink-0" />
                        <span>Claimant Verified ID: {item.pickupDigitalId}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Footer */}
                <div className="pt-3 border-t border-border flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedItem(item)
                      setIsAbuseOpen(true)
                    }}
                    className="text-[11px] font-mono text-ink-muted hover:text-danger flex items-center gap-1 transition-colors cursor-pointer"
                    title="Report listing abuse"
                  >
                    <Flag size={11} />
                    <span>Report</span>
                  </button>

                  <div className="flex items-center gap-2">
                    {/* If item is found and not yet returned/expired, claimant can claim */}
                    {item.type === 'found' && (item.status === 'reported' || item.status === 'matched') && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => {
                          setSelectedItem(item)
                          setIsClaimOpen(true)
                        }}
                        className="text-xs h-7 px-2.5"
                      >
                        <span>Claim Item</span>
                      </Button>
                    )}

                    {/* Desk staff confirmation with Digital ID */}
                    {item.status === 'ready_for_pickup' && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setSelectedItem(item)
                          setIsPickupOpen(true)
                        }}
                        className="text-xs h-7 px-2.5 border-ink text-ink font-semibold"
                      >
                        <CreditCard size={12} />
                        <span>Confirm Pickup</span>
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* 3. Report Lost Modal */}
      <Dialog open={isReportLostOpen} onOpenChange={setIsReportLostOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Report a Lost Item</DialogTitle>
            <DialogDescription>
              Submit details so campus security desks and students can match it if found.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleReportLost} className="space-y-4 py-2">
            <div>
              <label className="text-small font-medium text-ink block mb-1">
                Category *
              </label>
              <select
                value={lostCategory}
                onChange={(e) => setLostCategory(e.target.value as ItemCategory)}
                className="w-full bg-surface-sunken border border-border rounded-sm px-3 py-2 text-small font-medium text-ink focus-visible:outline-2 focus-visible:outline-ink cursor-pointer"
              >
                {ITEM_CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-small font-medium text-ink block mb-1">
                Item Title *
              </label>
              <input
                type="text"
                required
                value={lostTitle}
                onChange={(e) => setLostTitle(e.target.value)}
                placeholder="e.g. Casio Scientific Calculator FX-991EX"
                className="w-full bg-surface-sunken border border-border rounded-sm px-3 py-2 text-small text-ink placeholder:text-ink-muted focus-visible:outline-2 focus-visible:outline-ink"
              />
            </div>

            <div>
              <label className="text-small font-medium text-ink block mb-1">
                Description & Distinguishing Features *
              </label>
              <textarea
                required
                value={lostDesc}
                onChange={(e) => setLostDesc(e.target.value)}
                rows={3}
                placeholder="Describe color, model, scratches, case, or contents..."
                className="w-full bg-surface-sunken border border-border rounded-sm px-3 py-2 text-small text-ink placeholder:text-ink-muted focus-visible:outline-2 focus-visible:outline-ink font-body"
              />
            </div>

            <div>
              <label className="text-small font-medium text-ink block mb-1">
                Last Seen Location *
              </label>
              <select
                value={lostLocation}
                onChange={(e) => setLostLocation(e.target.value)}
                className="w-full bg-surface-sunken border border-border rounded-sm px-3 py-2 text-small font-medium text-ink focus-visible:outline-2 focus-visible:outline-ink cursor-pointer"
              >
                {CAMPUS_LOCATIONS.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-small font-medium text-ink block mb-1">
                  Incident Date
                </label>
                <input
                  type="date"
                  required
                  value={lostDate}
                  onChange={(e) => setLostDate(e.target.value)}
                  className="w-full bg-surface-sunken border border-border rounded-sm px-3 py-2 text-small font-mono text-ink focus-visible:outline-2 focus-visible:outline-ink"
                />
              </div>
              <div>
                <label className="text-small font-medium text-ink block mb-1">
                  Approx Time
                </label>
                <input
                  type="text"
                  value={lostTimeWindow}
                  onChange={(e) => setLostTimeWindow(e.target.value)}
                  placeholder="e.g. 10:00 - 11:30"
                  className="w-full bg-surface-sunken border border-border rounded-sm px-3 py-2 text-small text-ink focus-visible:outline-2 focus-visible:outline-ink"
                />
              </div>
            </div>

            <DialogFooter className="mt-4">
              <Button type="button" variant="secondary" onClick={() => setIsReportLostOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={isSubmitting || !lostTitle.trim()}>
                <span>Report Lost Item</span>
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 4. Report Found Modal (With Verification Question & Dropoff) */}
      <Dialog open={isReportFoundOpen} onOpenChange={setIsReportFoundOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Report a Found Item</DialogTitle>
            <DialogDescription>
              Finder safety: you will receive a handover code to deposit this item at a campus security or department desk.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleReportFound} className="space-y-4 py-2">
            <div>
              <label className="text-small font-medium text-ink block mb-1">
                Category *
              </label>
              <select
                value={foundCategory}
                onChange={(e) => setFoundCategory(e.target.value as ItemCategory)}
                className="w-full bg-surface-sunken border border-border rounded-sm px-3 py-2 text-small font-medium text-ink focus-visible:outline-2 focus-visible:outline-ink cursor-pointer"
              >
                {ITEM_CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-small font-medium text-ink block mb-1">
                Item Title *
              </label>
              <input
                type="text"
                required
                value={foundTitle}
                onChange={(e) => setFoundTitle(e.target.value)}
                placeholder="e.g. Blue Stanley Water Bottle"
                className="w-full bg-surface-sunken border border-border rounded-sm px-3 py-2 text-small text-ink placeholder:text-ink-muted focus-visible:outline-2 focus-visible:outline-ink"
              />
            </div>

            <div>
              <label className="text-small font-medium text-ink block mb-1">
                General Description *
              </label>
              <textarea
                required
                value={foundDesc}
                onChange={(e) => setFoundDesc(e.target.value)}
                rows={2}
                placeholder="Basic appearance without revealing the secret detail..."
                className="w-full bg-surface-sunken border border-border rounded-sm px-3 py-2 text-small text-ink placeholder:text-ink-muted focus-visible:outline-2 focus-visible:outline-ink font-body"
              />
            </div>

            {/* Secret Verification Detail per PLAN.MD §5.5 */}
            <div className="p-3 bg-highlight/15 border border-highlight rounded-md space-y-3">
              <div>
                <label className="text-small font-bold text-ink block mb-1 flex items-center gap-1">
                  <EyeOff size={14} /> Secret Identifying Detail *
                </label>
                <input
                  type="text"
                  required
                  value={foundHiddenDetail}
                  onChange={(e) => setFoundHiddenDetail(e.target.value)}
                  placeholder="e.g. Sticker of Rick & Morty on base, or serial number ending 84"
                  className="w-full bg-surface border border-border rounded-sm px-3 py-1.5 text-small text-ink focus-visible:outline-2 focus-visible:outline-ink"
                />
                <span className="text-[10px] text-ink-muted mt-0.5 block">
                  Hidden from public listings. Only visible to you and the security desk to verify claims.
                </span>
              </div>

              <div>
                <label className="text-small font-bold text-ink block mb-1 flex items-center gap-1">
                  <HelpCircle size={14} /> Verification Question for Claimants *
                </label>
                <input
                  type="text"
                  required
                  value={foundQuestion}
                  onChange={(e) => setFoundQuestion(e.target.value)}
                  placeholder="e.g. What sticker or engraved initials are on the item?"
                  className="w-full bg-surface border border-border rounded-sm px-3 py-1.5 text-small text-ink focus-visible:outline-2 focus-visible:outline-ink"
                />
              </div>
            </div>

            <div>
              <label className="text-small font-medium text-ink block mb-1">
                Where did you find it? *
              </label>
              <select
                value={foundLocation}
                onChange={(e) => setFoundLocation(e.target.value)}
                className="w-full bg-surface-sunken border border-border rounded-sm px-3 py-2 text-small font-medium text-ink focus-visible:outline-2 focus-visible:outline-ink cursor-pointer"
              >
                {CAMPUS_LOCATIONS.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-small font-medium text-ink block mb-1">
                Drop-Off Desk (Finder Handover) *
              </label>
              <select
                value={foundDropoff}
                onChange={(e) => setFoundDropoff(e.target.value)}
                className="w-full bg-surface-sunken border border-border rounded-sm px-3 py-2 text-small font-semibold text-ink focus-visible:outline-2 focus-visible:outline-ink cursor-pointer"
              >
                {DROPOFF_POINTS.map((dp) => (
                  <option key={dp} value={dp}>
                    {dp}
                  </option>
                ))}
              </select>
            </div>

            <DialogFooter className="mt-4">
              <Button type="button" variant="secondary" onClick={() => setIsReportFoundOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={isSubmitting || !foundTitle.trim()}>
                <span>Submit & Get Handover Code</span>
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 5. Claim Submission Dialog */}
      <Dialog open={isClaimOpen} onOpenChange={setIsClaimOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Claim Found Item</DialogTitle>
            <DialogDescription>
              Answer the finder's verification question to prove ownership before desk pickup.
            </DialogDescription>
          </DialogHeader>

          {selectedItem && (
            <form onSubmit={handleSubmitClaim} className="space-y-4 py-2">
              <div className="p-3 rounded-md bg-surface-sunken border border-border space-y-1">
                <span className="text-[10px] font-mono text-ink-muted uppercase block">Item</span>
                <p className="font-display font-bold text-ink text-small">{selectedItem.title}</p>
                <p className="text-[11px] font-mono text-ink-muted">Location: {selectedItem.location}</p>
              </div>

              {selectedItem.verificationQuestion && (
                <div className="p-3 rounded-md bg-highlight/15 border border-highlight space-y-1.5">
                  <span className="text-small font-bold text-ink flex items-center gap-1">
                    <HelpCircle size={14} /> Verification Question:
                  </span>
                  <p className="text-small text-ink font-medium">
                    "{selectedItem.verificationQuestion}"
                  </p>
                </div>
              )}

              <div>
                <label className="text-small font-medium text-ink block mb-1">
                  Your Answer *
                </label>
                <textarea
                  required
                  value={claimAnswer}
                  onChange={(e) => setClaimAnswer(e.target.value)}
                  rows={2}
                  placeholder="State the exact color, sticker, serial number, or identifying mark..."
                  className="w-full bg-surface-sunken border border-border rounded-sm px-3 py-2 text-small text-ink placeholder:text-ink-muted focus-visible:outline-2 focus-visible:outline-ink font-body"
                />
              </div>

              <div>
                <label className="text-small font-medium text-ink block mb-1">
                  Additional Proof (Optional)
                </label>
                <input
                  type="text"
                  value={claimProof}
                  onChange={(e) => setClaimProof(e.target.value)}
                  placeholder="e.g. Purchase invoice photo link or exact purchase date"
                  className="w-full bg-surface-sunken border border-border rounded-sm px-3 py-2 text-small text-ink placeholder:text-ink-muted focus-visible:outline-2 focus-visible:outline-ink"
                />
              </div>

              <DialogFooter className="mt-4">
                <Button type="button" variant="secondary" onClick={() => setIsClaimOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" disabled={isSubmitting || !claimAnswer.trim()}>
                  <span>Submit Claim</span>
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* 6. Desk Pickup Confirmation with Digital ID Dialog (PLAN.MD §5.5) */}
      <Dialog open={isPickupOpen} onOpenChange={setIsPickupOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Pickup with Digital ID</DialogTitle>
            <DialogDescription>
              Security desk verification: verify claimant's live digital ID credential before physical release.
            </DialogDescription>
          </DialogHeader>

          {selectedItem && (
            <form onSubmit={handleConfirmPickup} className="space-y-4 py-2">
              <div className="p-3 bg-surface-sunken border border-border rounded-md space-y-1">
                <span className="text-[10px] font-mono text-ink-muted uppercase block">Item to Release</span>
                <p className="font-display font-bold text-ink">{selectedItem.title}</p>
                <p className="text-[11px] font-mono text-ink-muted">Held at: {selectedItem.dropoffPoint || 'Security Desk'}</p>
              </div>

              <div>
                <label className="text-small font-medium text-ink block mb-1 flex items-center gap-1.5">
                  <CreditCard size={14} /> Claimant Digital ID / Roll Number *
                </label>
                <input
                  type="text"
                  required
                  value={claimantDigitalIdInput}
                  onChange={(e) => setClaimantDigitalIdInput(e.target.value)}
                  placeholder="e.g. 23BCE1042"
                  className="w-full bg-surface-sunken border border-border rounded-sm px-3 py-2 text-small font-mono uppercase text-ink focus-visible:outline-2 focus-visible:outline-ink"
                />
                <span className="text-[10px] text-ink-muted mt-0.5 block">
                  Verify against student's 30-second rotating digital ID card or via /verify.
                </span>
              </div>

              <div>
                <label className="text-small font-medium text-ink block mb-1">
                  Desk Staff Handover Notes
                </label>
                <input
                  type="text"
                  value={pickupNotes}
                  onChange={(e) => setPickupNotes(e.target.value)}
                  placeholder="e.g. Handed over at Main Gate Security Desk"
                  className="w-full bg-surface-sunken border border-border rounded-sm px-3 py-2 text-small text-ink placeholder:text-ink-muted focus-visible:outline-2 focus-visible:outline-ink"
                />
              </div>

              <DialogFooter className="mt-4">
                <Button type="button" variant="secondary" onClick={() => setIsPickupOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={isSubmitting || !claimantDigitalIdInput.trim()}
                >
                  <UserCheck size={14} />
                  <span>Confirm Handover</span>
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* 7. Abuse Reporting Dialog */}
      <Dialog open={isAbuseOpen} onOpenChange={setIsAbuseOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Report Listing Abuse</DialogTitle>
            <DialogDescription>
              Flag inappropriate, fraudulent, or abusive posts to campus administration.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleReportAbuse} className="space-y-4 py-2">
            <div>
              <label className="text-small font-medium text-ink block mb-1">
                Reason for Reporting *
              </label>
              <textarea
                required
                value={abuseReason}
                onChange={(e) => setAbuseReason(e.target.value)}
                rows={3}
                placeholder="Explain why this listing violates campus guidelines (e.g. prank, spam, profanity)..."
                className="w-full bg-surface-sunken border border-border rounded-sm px-3 py-2 text-small text-ink placeholder:text-ink-muted focus-visible:outline-2 focus-visible:outline-ink font-body"
              />
            </div>

            <DialogFooter className="mt-4">
              <Button type="button" variant="secondary" onClick={() => setIsAbuseOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="danger" disabled={isSubmitting || !abuseReason.trim()}>
                <span>Submit Report</span>
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
