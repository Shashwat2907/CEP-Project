'use client'

import * as React from 'react'
import {
  UploadCloud,
  FileText,
  AlertCircle,
  CheckCircle2,
  Download,
  Users,
  UserPlus,
  RefreshCw,
  UserX,
} from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { importRosterCsv } from '../actions'
import { RosterImportResult } from '../schema'
import { cn } from '@/lib/utils'

export const SAMPLE_ROSTER_CSV = `college_email,college_id,full_name,role,branch,year,division,batch,department
aarav.sharma@college.edu,23BCE1001,Aarav Sharma,student,Computer Science & Engineering,2,A,B1,
priya.patel@college.edu,23BCE1002,Priya Patel,student,Computer Science & Engineering,2,A,B2,
rohan.verma@college.edu,23ME1003,Rohan Verma,student,Mechanical Engineering,3,B,M1,
sunita.rao@college.edu,FAC-CS-042,Dr. Sunita Rao,teacher,,,,,,Computer Science & Engineering
ramesh.kumar@college.edu,FAC-ME-015,Prof. Ramesh Kumar,teacher,,,,,,Mechanical Engineering
admin.desk@college.edu,ADM-001,Campus Administrator,admin,,,,,,Administration`

export function RosterUploadCard({
  onImportComplete,
}: {
  onImportComplete?: (result: RosterImportResult) => void
}) {
  const [csvContent, setCsvContent] = React.useState('')
  const [filename, setFilename] = React.useState('')
  const [isProcessing, setIsProcessing] = React.useState(false)
  const [result, setResult] = React.useState<RosterImportResult | null>(null)
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)
  const fileInputRef = React.useRef<HTMLInputElement | null>(null)

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setFilename(file.name)
    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      setCsvContent(text)
      setResult(null)
      setErrorMessage(null)
    }
    reader.readAsText(file)
  }

  const handleDownloadTemplate = () => {
    const blob = new Blob([SAMPLE_ROSTER_CSV], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'college-roster-template.csv'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleExecuteImport = async () => {
    if (!csvContent.trim()) {
      setErrorMessage('Please select or paste a CSV file first')
      return
    }

    setIsProcessing(true)
    setErrorMessage(null)

    try {
      const res = await importRosterCsv(csvContent, filename || 'roster.csv')
      if (res.ok) {
        setResult(res.data)
        onImportComplete?.(res.data)
      } else {
        setErrorMessage(res.error.message)
      }
    } catch {
      setErrorMessage('Failed to process roster import')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="p-6 rounded-lg border border-border bg-surface shadow-xs space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-4">
        <div>
          <h3 className="font-display text-h3 font-bold text-ink">Upload Authoritative College Roster</h3>
          <p className="text-small text-ink-muted mt-0.5">
            Matches on college email, establishes enrollment/staff IDs, and synchronizes account invitations.
          </p>
        </div>

        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={handleDownloadTemplate}
          className="flex items-center gap-1.5 shrink-0"
        >
          <Download size={14} strokeWidth={1.75} />
          <span>Download CSV Template</span>
        </Button>
      </div>

      {/* Upload Box */}
      <div
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          'p-8 border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors flex flex-col items-center justify-center gap-3',
          filename ? 'border-in-campus bg-in-campus/5' : 'border-border hover:border-ink bg-surface-sunken/40'
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          onChange={handleFileUpload}
          className="hidden"
        />

        <div className="w-12 h-12 rounded-full bg-surface border border-border flex items-center justify-center shadow-xs">
          {filename ? (
            <FileText size={24} className="text-in-campus" />
          ) : (
            <UploadCloud size={24} className="text-ink-muted" />
          )}
        </div>

        <div>
          <p className="font-display text-small font-bold text-ink">
            {filename ? filename : 'Click or drag college roster CSV here'}
          </p>
          <p className="text-meta text-ink-muted mt-0.5">
            {filename ? 'File loaded and ready to import' : 'Supports standard UTF-8 CSV with header row'}
          </p>
        </div>
      </div>

      {/* Action button */}
      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => {
            setCsvContent(SAMPLE_ROSTER_CSV)
            setFilename('sample-roster.csv')
            setResult(null)
          }}
        >
          Load Demo Sample
        </Button>

        <Button
          type="button"
          variant="primary"
          size="sm"
          onClick={handleExecuteImport}
          disabled={!csvContent || isProcessing}
          className="flex items-center gap-2"
        >
          <RefreshCw size={14} className={cn(isProcessing && 'animate-spin')} />
          <span>{isProcessing ? 'Validating & Importing...' : 'Execute Roster Import'}</span>
        </Button>
      </div>

      {errorMessage && (
        <div className="p-3.5 rounded-md bg-danger/10 border border-danger/20 text-danger text-small flex items-start gap-2">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Import Result Stats */}
      {result && (
        <div className="p-5 rounded-lg bg-surface-sunken border border-border space-y-4">
          <div className="flex items-center gap-2 text-in-campus font-bold">
            <CheckCircle2 size={18} />
            <span>Roster Import Processed ({result.filename})</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-md bg-surface border border-border">
              <span className="text-meta text-ink-muted block font-mono">NEW INVITED</span>
              <span className="font-display text-2xl font-bold text-in-campus flex items-center gap-1.5 mt-1">
                <UserPlus size={18} />
                {result.inserted}
              </span>
            </div>

            <div className="p-3 rounded-md bg-surface border border-border">
              <span className="text-meta text-ink-muted block font-mono">UPDATED</span>
              <span className="font-display text-2xl font-bold text-ink flex items-center gap-1.5 mt-1">
                <Users size={18} />
                {result.updated}
              </span>
            </div>

            <div className="p-3 rounded-md bg-surface border border-border">
              <span className="text-meta text-ink-muted block font-mono">DEACTIVATED</span>
              <span className="font-display text-2xl font-bold text-ink-muted flex items-center gap-1.5 mt-1">
                <UserX size={18} />
                {result.deactivated}
              </span>
            </div>

            <div className="p-3 rounded-md bg-surface border border-border">
              <span className="text-meta text-ink-muted block font-mono">ERRORS</span>
              <span className={cn(
                'font-display text-2xl font-bold flex items-center gap-1.5 mt-1',
                result.errors.length > 0 ? 'text-danger' : 'text-ink-muted'
              )}>
                <AlertCircle size={18} />
                {result.errors.length}
              </span>
            </div>
          </div>

          {/* Error Table if any rows failed */}
          {result.errors.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-border">
              <p className="text-small font-bold text-danger">Row Validation Errors:</p>
              <div className="max-h-48 overflow-y-auto divide-y divide-border border border-border rounded-md bg-surface">
                {result.errors.map((err, idx) => (
                  <div key={idx} className="p-2.5 text-meta font-mono flex items-start gap-2">
                    <span className="px-1.5 py-0.5 rounded-sm bg-danger/10 text-danger shrink-0">
                      Row {err.row}
                    </span>
                    <span className="text-ink-muted">
                      {err.collegeEmail ? `${err.collegeEmail}: ` : ''}
                      {err.error}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
