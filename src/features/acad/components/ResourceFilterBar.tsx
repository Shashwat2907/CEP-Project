'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useTransition, useState, useEffect } from 'react'
import { Search, X, Bookmark, SlidersHorizontal, RotateCcw } from 'lucide-react'
import type { Subject, ResourceType } from '../schema'

interface ResourceFilterBarProps {
  subjects: Subject[]
  branches?: string[]
}

const RESOURCE_TYPES: { label: string; value: ResourceType | 'all' }[] = [
  { label: 'All Types', value: 'all' },
  { label: 'Notes',     value: 'notes' },
  { label: 'PYQs',      value: 'pyq' },
  { label: 'Slides',    value: 'slides' },
  { label: 'Other',     value: 'other' },
]

export function ResourceFilterBar({ subjects, branches }: ResourceFilterBarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  // Read current filter state from URL
  const currentQuery   = searchParams.get('q') ?? ''
  const currentYear    = searchParams.get('year') ?? ''
  const currentBranch  = searchParams.get('branch') ?? ''
  const currentSubject = searchParams.get('subject_id') ?? ''
  const currentType    = searchParams.get('type') ?? 'all'
  const isSavedOnly    = searchParams.get('saved') === 'true'

  // Local state for debounced search
  const [searchTerm, setSearchTerm] = useState(currentQuery)
  const [prevQuery, setPrevQuery] = useState(currentQuery)

  // Adjust state during render if URL search param changes
  if (currentQuery !== prevQuery) {
    setPrevQuery(currentQuery)
    setSearchTerm(currentQuery)
  }

  // Derive unique branches from subjects if not explicitly provided
  const availableBranches =
    branches && branches.length > 0
      ? branches
      : Array.from(new Set(subjects.map((s) => s.branch).filter(Boolean))).sort()

  // Filter subjects based on selected year and branch
  const filteredSubjects = subjects.filter((s) => {
    if (currentYear && s.year !== parseInt(currentYear, 10)) return false
    if (currentBranch && s.branch !== currentBranch) return false
    return true
  })

  // Helper to push URL param updates
  const updateParams = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString())

    Object.entries(updates).forEach(([key, val]) => {
      if (val === null || val === '' || val === 'all') {
        params.delete(key)
      } else {
        params.set(key, val)
      }
    })

    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`, { scroll: false })
    })
  }

  // Handle debounced search
  useEffect(() => {
    const handler = setTimeout(() => {
      if (searchTerm !== currentQuery) {
        updateParams({ q: searchTerm.trim() || null })
      }
    }, 350)
    return () => clearTimeout(handler)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm])


  // Clear all filters
  const handleClearAll = () => {
    setSearchTerm('')
    startTransition(() => {
      router.push(pathname, { scroll: false })
    })
  }

  const hasActiveFilters = Boolean(
    currentQuery || currentYear || currentBranch || currentSubject || (currentType !== 'all') || isSavedOnly
  )

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.875rem',
        background: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: '0.75rem',
        padding: '1rem',
        marginBottom: '1.5rem',
      }}
    >
      {/* Top Search + Saved Row */}
      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1 1 240px' }}>
          <Search
            size={16}
            style={{
              position: 'absolute',
              left: '0.75rem',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--muted-foreground)',
              pointerEvents: 'none',
            }}
          />
          <input
            type="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by resource title or topic..."
            style={{
              width: '100%',
              padding: '0.5rem 2rem 0.5rem 2.25rem',
              borderRadius: '0.375rem',
              border: '1px solid var(--border)',
              background: 'var(--background)',
              color: 'var(--foreground)',
              fontSize: '0.875rem',
              outline: 'none',
            }}
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              aria-label="Clear search text"
              style={{
                position: 'absolute',
                right: '0.625rem',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--muted-foreground)',
                padding: '0.125rem',
              }}
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Saved resources toggle */}
        <button
          type="button"
          onClick={() => updateParams({ saved: isSavedOnly ? null : 'true' })}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.375rem',
            padding: '0.5rem 0.75rem',
            borderRadius: '0.375rem',
            fontSize: '0.8125rem',
            fontWeight: 500,
            cursor: 'pointer',
            border: isSavedOnly ? '1px solid var(--primary)' : '1px solid var(--border)',
            background: isSavedOnly ? 'var(--primary-subtle, rgba(59, 130, 246, 0.1))' : 'var(--background)',
            color: isSavedOnly ? 'var(--primary)' : 'var(--foreground)',
            transition: 'all 0.15s ease',
          }}
        >
          <Bookmark size={15} fill={isSavedOnly ? 'currentColor' : 'none'} />
          <span>Saved</span>
        </button>

        {/* Reset filters button */}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={handleClearAll}
            title="Clear all filters"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem',
              padding: '0.5rem 0.625rem',
              borderRadius: '0.375rem',
              fontSize: '0.75rem',
              border: '1px solid var(--border)',
              background: 'transparent',
              color: 'var(--muted-foreground)',
              cursor: 'pointer',
            }}
          >
            <RotateCcw size={13} />
            <span>Reset</span>
          </button>
        )}
      </div>

      {/* Select Dropdowns Row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '0.625rem',
        }}
      >
        {/* Year Filter */}
        <select
          value={currentYear}
          onChange={(e) => updateParams({ year: e.target.value, subject_id: null })}
          aria-label="Filter by Year"
          style={{
            padding: '0.4375rem 0.625rem',
            borderRadius: '0.375rem',
            border: '1px solid var(--border)',
            background: 'var(--background)',
            color: 'var(--foreground)',
            fontSize: '0.8125rem',
            colorScheme: 'light dark',
          }}
        >
          <option value="" style={{ background: 'var(--background)', color: 'var(--foreground)' }}>All Years</option>
          <option value="1" style={{ background: 'var(--background)', color: 'var(--foreground)' }}>Year 1</option>
          <option value="2" style={{ background: 'var(--background)', color: 'var(--foreground)' }}>Year 2</option>
          <option value="3" style={{ background: 'var(--background)', color: 'var(--foreground)' }}>Year 3</option>
          <option value="4" style={{ background: 'var(--background)', color: 'var(--foreground)' }}>Year 4</option>
        </select>

        {/* Branch Filter */}
        <select
          value={currentBranch}
          onChange={(e) => updateParams({ branch: e.target.value, subject_id: null })}
          aria-label="Filter by Branch"
          style={{
            padding: '0.4375rem 0.625rem',
            borderRadius: '0.375rem',
            border: '1px solid var(--border)',
            background: 'var(--background)',
            color: 'var(--foreground)',
            fontSize: '0.8125rem',
            colorScheme: 'light dark',
          }}
        >
          <option value="" style={{ background: 'var(--background)', color: 'var(--foreground)' }}>All Branches</option>
          {availableBranches.map((b) => (
            <option key={b} value={b} style={{ background: 'var(--background)', color: 'var(--foreground)' }}>
              {b}
            </option>
          ))}
        </select>

        {/* Subject Filter (filtered by year/branch) */}
        <select
          value={currentSubject}
          onChange={(e) => updateParams({ subject_id: e.target.value })}
          aria-label="Filter by Subject"
          style={{
            padding: '0.4375rem 0.625rem',
            borderRadius: '0.375rem',
            border: '1px solid var(--border)',
            background: 'var(--background)',
            color: 'var(--foreground)',
            fontSize: '0.8125rem',
            colorScheme: 'light dark',
          }}
        >
          <option value="" style={{ background: 'var(--background)', color: 'var(--foreground)' }}>All Subjects</option>
          {filteredSubjects.map((s) => (
            <option key={s.id} value={s.id} style={{ background: 'var(--background)', color: 'var(--foreground)' }}>
              {s.code} — {s.name}
            </option>
          ))}
        </select>
      </div>

      {/* Resource Type Filter Chips */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', flexWrap: 'wrap' }}>
        <span
          style={{
            fontSize: '0.75rem',
            color: 'var(--muted-foreground)',
            marginRight: '0.25rem',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.25rem',
          }}
        >
          <SlidersHorizontal size={12} />
          Type:
        </span>
        {RESOURCE_TYPES.map((t) => {
          const isActive = currentType === t.value
          return (
            <button
              key={t.value}
              type="button"
              onClick={() => updateParams({ type: t.value })}
              style={{
                padding: '0.25rem 0.625rem',
                borderRadius: '9999px',
                fontSize: '0.75rem',
                fontWeight: isActive ? 600 : 400,
                cursor: 'pointer',
                border: isActive ? '1px solid var(--primary)' : '1px solid var(--border)',
                background: isActive ? 'var(--primary)' : 'var(--background)',
                color: isActive ? 'var(--primary-foreground, #fff)' : 'var(--muted-foreground)',
                transition: 'all 0.15s ease',
              }}
            >
              {t.label}
            </button>
          )
        })}
      </div>

      {isPending && (
        <div style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', textAlign: 'right' }}>
          Filtering...
        </div>
      )}
    </div>
  )
}
