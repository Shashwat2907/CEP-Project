'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

interface TabsContextType {
  value: string
  onValueChange: (value: string) => void
}

const TabsContext = React.createContext<TabsContextType | undefined>(undefined)

export function useTabs() {
  const context = React.useContext(TabsContext)
  if (!context) {
    throw new Error('Tabs components must be used within Tabs')
  }
  return context
}

export function Tabs({
  defaultValue,
  value: controlledValue,
  onValueChange: setControlledValue,
  children,
  className,
}: {
  defaultValue?: string
  value?: string
  onValueChange?: (value: string) => void
  children: React.ReactNode
  className?: string
}) {
  const [uncontrolledValue, setUncontrolledValue] = React.useState(defaultValue || '')
  const isControlled = controlledValue !== undefined
  const value = isControlled ? controlledValue : uncontrolledValue
  const onValueChange = isControlled ? setControlledValue! : setUncontrolledValue

  return (
    <TabsContext.Provider value={{ value, onValueChange }}>
      <div className={cn('flex flex-col space-y-4', className)}>{children}</div>
    </TabsContext.Provider>
  )
}

export function TabsList({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      role="tablist"
      className={cn(
        'inline-flex items-center gap-1 rounded-sm bg-surface-sunken p-1 border border-border text-ink-muted w-full sm:w-auto overflow-x-auto no-scrollbar',
        className
      )}
    >
      {children}
    </div>
  )
}

export function TabsTrigger({
  value,
  children,
  className,
}: {
  value: string
  children: React.ReactNode
  className?: string
}) {
  const { value: activeValue, onValueChange } = useTabs()
  const isActive = activeValue === value

  return (
    <button
      role="tab"
      type="button"
      aria-selected={isActive}
      onClick={() => onValueChange(value)}
      className={cn(
        'inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-small font-medium transition-all duration-150',
        'focus-visible:outline-2 focus-visible:outline-ink focus-visible:outline-offset-2',
        isActive
          ? 'bg-surface text-ink font-semibold shadow-sm border border-border'
          : 'text-ink-muted hover:text-ink',
        className
      )}
    >
      {children}
    </button>
  )
}

export function TabsContent({
  value,
  children,
  className,
}: {
  value: string
  children: React.ReactNode
  className?: string
}) {
  const { value: activeValue } = useTabs()

  if (activeValue !== value) return null

  return (
    <div
      role="tabpanel"
      tabIndex={0}
      className={cn('focus-visible:outline-none', className)}
    >
      {children}
    </div>
  )
}
