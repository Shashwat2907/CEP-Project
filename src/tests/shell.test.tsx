import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import * as React from 'react'
import { Sidebar, STUDENT_NAV_ITEMS, TEACHER_NAV_ITEMS } from '@/shared/ui/sidebar'
import { StatusCluster } from '@/shared/ui/status-cluster'
import { ThemeToggle } from '@/shared/ui/theme-toggle'
import { TopBar } from '@/shared/ui/top-bar'
import { MobileNav } from '@/shared/ui/mobile-nav'
import { AppShell } from '@/shared/ui/app-shell'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  usePathname: () => '/',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}))

// Mock next/link to render standard <a> tags
vi.mock('next/link', () => ({
  default: ({ children, href, className, onClick }: { children: React.ReactNode; href: string; className?: string; onClick?: () => void }) => (
    <a href={href} className={className} onClick={onClick}>
      {children}
    </a>
  ),
}))

describe('App Shell — Sidebar & Role Navigation', () => {
  it('renders student navigation items by default', () => {
    render(<Sidebar role="student" userName="Aarav Sharma" identifier="23BCE1001" />)

    // Check all student items exist
    STUDENT_NAV_ITEMS.forEach((item) => {
      expect(screen.getByText(item.label)).toBeInTheDocument()
    })

    // Verify teacher items are NOT in student nav
    expect(screen.queryByText('Assigned Complaints')).not.toBeInTheDocument()
    expect(screen.queryByText('Sessions')).not.toBeInTheDocument()
  })

  it('renders teacher navigation items when role is teacher', () => {
    render(<Sidebar role="teacher" userName="Dr. Sunita Rao" identifier="T-CS-101" />)

    // Check teacher items exist
    TEACHER_NAV_ITEMS.forEach((item) => {
      expect(screen.getByText(item.label)).toBeInTheDocument()
    })

    // Verify student-only items are NOT in teacher nav
    expect(screen.queryByText('Clubs')).not.toBeInTheDocument()
    expect(screen.queryByText('Lost & Found')).not.toBeInTheDocument()
  })

  it('applies 3px highlight border to active link', () => {
    render(<Sidebar role="student" activePath="/complaints" />)

    const complaintsLink = screen.getByText('Complaints').closest('a')
    expect(complaintsLink).toHaveClass('border-highlight')
  })

  it('renders theme toggle above the pinned user profile card', () => {
    render(
      <Sidebar
        role="student"
        userName="Aarav Sharma"
        identifier="23BCE1001"
      />
    )

    // Theme toggle in sidebar mode exists
    expect(screen.getByRole('button', { name: /Switch to dark mode/i })).toBeInTheDocument()
    expect(screen.getByText('Aarav Sharma')).toBeInTheDocument()
    expect(screen.getByText('23BCE1001')).toBeInTheDocument()
    expect(screen.getByText('AS')).toBeInTheDocument() // Initials
  })
})

describe('App Shell — Signature Status Cluster & Pop-out ID Card (DESIGN.MD §7)', () => {
  it('renders quick Digital ID button with identifier badge', () => {
    render(<StatusCluster identifier="23BCE1042" userName="Shashwat Choudhary" />)

    const idBtn = screen.getByRole('button', { name: /Open Digital ID Card for Shashwat Choudhary/i })
    expect(idBtn).toBeInTheDocument()
    expect(idBtn).toHaveTextContent('Digital ID')
    expect(idBtn).toHaveTextContent('23BCE1042')
  })

  it('directly toggles presence on click (simple toggle only without interrupting modal)', () => {
    const handleToggle = vi.fn()
    render(<StatusCluster presenceState="in" onPresenceToggle={handleToggle} />)

    const pill = screen.getByRole('button', { name: /Campus presence: IN\. Click to toggle/i })
    expect(pill).toBeInTheDocument()

    // Click directly flips presence to OUT
    fireEvent.click(pill)
    expect(handleToggle).toHaveBeenCalledWith('out')
  })

  it('opens verifiable official college ID card dialog when clicking quick ID button', () => {
    render(
      <StatusCluster
        identifier="23BCE1042"
        userName="Shashwat Choudhary"
        department="Computer Science & Engineering"
        role="student"
      />
    )

    const idBtn = screen.getByRole('button', { name: /Open Digital ID Card/i })
    fireEvent.click(idBtn)

    // Verifiable College Card popout opens
    expect(screen.getByText('Campus University')).toBeInTheDocument()
    expect(screen.getByText('Official Student Identity Card')).toBeInTheDocument()
    expect(screen.getByText('VERIFIED')).toBeInTheDocument()
    expect(screen.getByText('LIVE VERIFICATION')).toBeInTheDocument()
    expect(screen.getByText(/Refreshes in/i)).toBeInTheDocument()
  })

  it('renders notification bell with unread count badge', () => {
    render(<StatusCluster unreadNotifications={5} />)

    const bell = screen.getByRole('button', { name: /5 unread notifications/i })
    expect(bell).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
  })
})

describe('App Shell — TopBar', () => {
  it('renders top bar with brand header and status cluster', () => {
    render(<TopBar identifier="23BCE1042" userName="Aarav Sharma" />)

    expect(screen.getByRole('banner')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Open menu/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Open Digital ID Card/i })).toBeInTheDocument()
  })
})

describe('App Shell — Theme Toggle', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.classList.remove('dark')
  })

  it('toggles dark mode class on document root and persists in localStorage', () => {
    render(<ThemeToggle />)

    const toggle = screen.getByRole('button', { name: /Switch to dark theme/i })
    expect(toggle).toBeInTheDocument()

    // Click to toggle to dark mode
    fireEvent.click(toggle)
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(localStorage.getItem('cep-theme')).toBe('dark')

    // Click again to toggle back to light mode
    fireEvent.click(toggle)
    expect(document.documentElement.classList.contains('dark')).toBe(false)
    expect(localStorage.getItem('cep-theme')).toBe('light')
  })
})

describe('App Shell — Mobile Navigation', () => {
  it('renders 5 primary bottom tabs for mobile screens', () => {
    render(<MobileNav role="student" activePath="/" />)

    const mobileNav = screen.getByRole('navigation', { name: /Mobile navigation/i })
    expect(mobileNav).toBeInTheDocument()
    expect(screen.getByText('Home')).toBeInTheDocument()
    expect(screen.getByText('Complaints')).toBeInTheDocument()
    expect(screen.getByText('Meet')).toBeInTheDocument()
    expect(screen.getByText('Community')).toBeInTheDocument()
    expect(screen.getByText('More')).toBeInTheDocument()
  })

  it('opens More sheet when clicking the More tab', () => {
    render(<MobileNav role="student" />)

    const moreBtn = screen.getByRole('button', { name: /More options/i })
    fireEvent.click(moreBtn)

    expect(screen.getByText('Menu & Services')).toBeInTheDocument()
    expect(screen.getByText('Clubs')).toBeInTheDocument()
    expect(screen.getByText('Lost & Found')).toBeInTheDocument()
  })
})

describe('App Shell — Full Component Integration', () => {
  it('renders AppShell layout with children and responsive containers', () => {
    render(
      <AppShell
        userName="Shashwat Choudhary"
        identifier="23BCE1042"
        department="Computer Science"
        initialRole="student"
      >
        <div data-testid="test-content">Dashboard Content</div>
      </AppShell>
    )

    expect(screen.getByTestId('test-content')).toBeInTheDocument()
    expect(screen.getAllByText('Campus')[0]).toBeInTheDocument()
    expect(screen.getByText('STUDENT PORTAL')).toBeInTheDocument()
  })
})
