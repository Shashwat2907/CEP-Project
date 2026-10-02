import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import {
  Button,
  Input,
  Card,
  CardTitle,
  Chip,
  Avatar,
  EmptyState,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '../shared/ui'

describe('Shared UI Kit — Unit Tests', () => {
  it('renders Button with primary variant and handles click', () => {
    const handleClick = vi.fn()
    render(<Button onClick={handleClick}>Raise complaint</Button>)
    const button = screen.getByRole('button', { name: /raise complaint/i })
    expect(button).toBeDefined()
    expect(button.className).toContain('bg-ink')
    fireEvent.click(button)
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('renders Input with surface-sunken bg and handles error state', () => {
    render(<Input placeholder="Enter student email" error />)
    const input = screen.getByPlaceholderText(/enter student email/i)
    expect(input.className).toContain('bg-surface-sunken')
    expect(input.className).toContain('border-danger')
  })

  it('renders Card and CardTitle correctly', () => {
    render(
      <Card>
        <CardTitle>Attendance Summary</CardTitle>
      </Card>
    )
    expect(screen.getByText('Attendance Summary')).toBeDefined()
  })

  it('renders Chip with status variant', () => {
    render(<Chip variant="in-campus">IN Campus</Chip>)
    const chip = screen.getByText('IN Campus')
    expect(chip.className).toContain('bg-in-campus')
  })

  it('renders Avatar with fallback initials when no image provided', () => {
    render(<Avatar fallback="SC" alt="Shashwat C" />)
    expect(screen.getByText('SC')).toBeDefined()
  })

  it('renders EmptyState with title, description and action', () => {
    render(
      <EmptyState
        title="No complaints yet"
        description="Raise a complaint to get help from college authorities."
        action={<Button>Raise complaint</Button>}
      />
    )
    expect(screen.getByText('No complaints yet')).toBeDefined()
    expect(screen.getByText(/raise a complaint to get help/i)).toBeDefined()
    expect(screen.getByRole('button', { name: /raise complaint/i })).toBeDefined()
  })

  it('renders Tabs and switches content on trigger click', () => {
    render(
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">Overview Content</TabsContent>
        <TabsContent value="history">History Content</TabsContent>
      </Tabs>
    )
    expect(screen.getByText('Overview Content')).toBeDefined()
    expect(screen.queryByText('History Content')).toBeNull()

    fireEvent.click(screen.getByRole('tab', { name: /history/i }))
    expect(screen.getByText('History Content')).toBeDefined()
    expect(screen.queryByText('Overview Content')).toBeNull()
  })
})
