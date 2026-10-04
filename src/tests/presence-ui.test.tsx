import React from 'react'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { PresencePopover } from '@/features/presence/components/presence-popover'
import { PresenceConsentDialog } from '@/features/presence/components/presence-consent-dialog'
import { AdminCampusBoundary } from '@/features/presence/components/admin-campus-boundary'
import { StatusCluster } from '@/shared/ui/status-cluster'
import { DEFAULT_CAMPUS_ZONE } from '@/features/presence/schema'

describe('Presence UI Components Suite', () => {
  describe('PresencePopover', () => {
    it('renders inside status, zone name, and formatted verified time', () => {
      const handleRefresh = vi.fn()
      const handleTogglePause = vi.fn()
      const handleOpenConsent = vi.fn()

      render(
        <PresencePopover
          open={true}
          onOpenChange={vi.fn()}
          presenceState="in"
          zoneName="Main Campus"
          confidence="high"
          accuracyMeters={15}
          verifiedAt="2026-10-02T12:30:00.000Z"
          consent={{
            userId: 'u1',
            consentGiven: true,
            isPaused: false,
            visibility: 'everyone',
          }}
          onRefreshLocation={handleRefresh}
          onTogglePause={handleTogglePause}
          onOpenConsentDialog={handleOpenConsent}
        />
      )

      expect(screen.getByText('Campus Presence')).toBeInTheDocument()
      expect(screen.getByText('Inside Campus Boundary')).toBeInTheDocument()
      expect(screen.getAllByText('Main Campus').length).toBeGreaterThanOrEqual(1)
      expect(screen.getByText('ACTIVE')).toBeInTheDocument()
      expect(screen.getByText(/Zero Storage/i)).toBeInTheDocument()
      expect(screen.getByText('Check Location Now')).toBeInTheDocument()

      fireEvent.click(screen.getByText('Check Location Now'))
      expect(handleRefresh).toHaveBeenCalledTimes(1)
    })

    it('displays warning when GPS accuracy is low (> 100m) per PLAN.md §5.1', () => {
      render(
        <PresencePopover
          open={true}
          onOpenChange={vi.fn()}
          presenceState="in"
          zoneName="Main Campus"
          confidence="low"
          accuracyMeters={145}
          consent={{
            userId: 'u1',
            consentGiven: true,
            isPaused: false,
            visibility: 'everyone',
          }}
          onRefreshLocation={vi.fn()}
          onTogglePause={vi.fn()}
          onOpenConsentDialog={vi.fn()}
        />
      )

      expect(screen.getByText(/Low GPS Accuracy \(145m\)/i)).toBeInTheDocument()
      expect(screen.getByText(/GPS signal may be weak indoors/i)).toBeInTheDocument()
    })
  })

  describe('PresenceConsentDialog', () => {
    it('displays plain-language privacy guarantees and allows visibility selection', async () => {
      const handleSave = vi.fn()

      render(
        <PresenceConsentDialog
          open={true}
          onOpenChange={vi.fn()}
          currentConsent={null}
          onSaveConsent={handleSave}
        />
      )

      expect(screen.getByText('Campus Presence & Privacy')).toBeInTheDocument()
      expect(screen.getByText('Zero GPS Coordinates Stored')).toBeInTheDocument()
      expect(screen.getByText('No Tracking Outside Campus')).toBeInTheDocument()
      expect(screen.getByText('One-Tap Pause & Complete Revocation')).toBeInTheDocument()

      // Select Friends visibility
      const friendsBtn = screen.getByRole('button', { name: /Friends/i })
      await act(async () => {
        fireEvent.click(friendsBtn)
      })

      // Grant consent
      const grantBtn = screen.getByRole('button', { name: /I Consent & Enable Presence/i })
      await act(async () => {
        fireEvent.click(grantBtn)
      })

      expect(handleSave).toHaveBeenCalledWith({
        consentGiven: true,
        isPaused: false,
        visibility: 'friends',
      })
    })

    it('shows Revoke Consent button when already consented', async () => {
      const handleSave = vi.fn()

      render(
        <PresenceConsentDialog
          open={true}
          onOpenChange={vi.fn()}
          currentConsent={{
            userId: 'u1',
            consentGiven: true,
            isPaused: false,
            visibility: 'nobody',
          }}
          onSaveConsent={handleSave}
        />
      )

      const revokeBtn = screen.getByRole('button', { name: /Revoke Consent/i })
      expect(revokeBtn).toBeInTheDocument()

      await act(async () => {
        fireEvent.click(revokeBtn)
      })
      expect(handleSave).toHaveBeenCalledWith({
        consentGiven: false,
        isPaused: false,
        visibility: 'nobody',
      })
    })
  })

  describe('AdminCampusBoundary', () => {
    it('allows testing coordinates against campus boundary with visual result', () => {
      render(<AdminCampusBoundary initialZone={DEFAULT_CAMPUS_ZONE} />)

      expect(screen.getByText('Campus Boundary Polygon')).toBeInTheDocument()
      expect(screen.getByText(/Polygon Vertices \(4\)/i)).toBeInTheDocument()

      const checkBtn = screen.getByRole('button', { name: /Run Polygon Check/i })
      fireEvent.click(checkBtn)

      // 12.9735, 79.1620 is inside Main Campus
      expect(screen.getByText(/INSIDE CAMPUS \(IN\)/i)).toBeInTheDocument()
    })
  })

  describe('StatusCluster Integration', () => {
    it('opens presence details popover when clicking the presence details trigger', () => {
      render(
        <StatusCluster
          presenceState="in"
          identifier="23BCE1042"
          userName="Shashwat Choudhary"
        />
      )

      const detailsBtn = screen.getByRole('button', {
        name: /Presence status and campus boundary details/i,
      })
      expect(detailsBtn).toBeInTheDocument()

      fireEvent.click(detailsBtn)

      // Presence popover opens
      expect(screen.getByText('Campus Presence')).toBeInTheDocument()
      expect(screen.getByText('Inside Campus Boundary')).toBeInTheDocument()
    })
  })
})
