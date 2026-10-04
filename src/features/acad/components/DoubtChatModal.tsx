'use client'

import * as React from 'react'
import {
  Bot,
  Send,
  Trash2,
  X,
  FileText,
  AlertCircle,
  HelpCircle,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import type { DoubtMessage, DoubtCitation } from '../schema'
import { askDoubtQuestionAction, clearDoubtThreadAction } from '../actions'

interface DoubtChatModalProps {
  isOpen: boolean
  onClose: () => void
  resourceId?: string
  subjectId?: string
  scopeTitle?: string
  initialMessages?: DoubtMessage[]
  initialThreadId?: string
}

export function DoubtChatModal({
  isOpen,
  onClose,
  resourceId,
  subjectId,
  scopeTitle = 'Course Material',
  initialMessages = [],
  initialThreadId,
}: DoubtChatModalProps) {
  const [messages, setMessages] = React.useState<DoubtMessage[]>(initialMessages)
  const [threadId, setThreadId] = React.useState<string | undefined>(initialThreadId)
  const [inputQuestion, setInputQuestion] = React.useState('')
  const [isLoading, setIsLoading] = React.useState(false)
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null)
  const [quotaRemaining, setQuotaRemaining] = React.useState<number | null>(null)
  const [expandedCitationIndex, setExpandedCitationIndex] = React.useState<string | null>(null)

  const messagesEndRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isOpen])

  if (!isOpen) return null

  const handleSend = async (questionToSend?: string) => {
    const text = (questionToSend || inputQuestion).trim()
    if (!text || isLoading) return

    setIsLoading(true)
    setErrorMsg(null)

    // Optimistic user message
    const tempId = `temp-${messages.length + 1}`
    const tempUserMsg: DoubtMessage = {
      id: tempId,
      thread_id: threadId || 'temp',
      sender_role: 'user',
      content: text,
      citations: [],
      confidence_status: 'grounded',
    }
    setMessages((prev) => [...prev, tempUserMsg])
    setInputQuestion('')

    try {
      const formData = new FormData()
      formData.set('question', text)
      if (resourceId) formData.set('resource_id', resourceId)
      if (subjectId) formData.set('subject_id', subjectId)
      if (threadId) formData.set('thread_id', threadId)

      const result = await askDoubtQuestionAction(formData)

      if (!result.ok) {
        setErrorMsg(result.error.message)
        // Remove optimistic user message on failure
        setMessages((prev) => prev.filter((m) => m.id !== tempUserMsg.id))
      } else {
        setThreadId(result.data.threadId)
        setQuotaRemaining(result.data.quotaRemaining)
        // Replace temp message with server confirmed and append assistant message
        setMessages((prev) => [
          ...prev.filter((m) => m.id !== tempUserMsg.id),
          result.data.userMessage,
          result.data.assistantMessage,
        ])
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to get answer'
      setErrorMsg(msg)
      setMessages((prev) => prev.filter((m) => m.id !== tempUserMsg.id))
    } finally {
      setIsLoading(false)
    }
  }

  const handleClearHistory = async () => {
    if (!threadId || messages.length === 0) return
    if (!confirm('Are you sure you want to clear this doubt chat history?')) return

    try {
      const fd = new FormData()
      fd.set('thread_id', threadId)
      const res = await clearDoubtThreadAction(fd)
      if (res.ok) {
        setMessages([])
        setErrorMsg(null)
      }
    } catch {
      setErrorMsg('Failed to clear chat history.')
    }
  }

  const toggleCitation = (key: string) => {
    setExpandedCitationIndex((prev) => (prev === key ? null : key))
  }

  const quickPrompts = [
    'Summarize the core topics in this document',
    'What are the key formulas or algorithms covered?',
    'Explain the most challenging concept simply',
    'What potential exam questions could come from this?',
  ]

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="doubt-chat-title"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '42rem',
          height: '85vh',
          maxHeight: '44rem',
          backgroundColor: 'var(--card)',
          color: 'var(--card-foreground)',
          borderRadius: '0.75rem',
          border: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.2)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '1rem 1.25rem',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'var(--muted)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '2.25rem',
                height: '2.25rem',
                borderRadius: '0.5rem',
                backgroundColor: 'var(--primary)',
                color: 'var(--primary-foreground)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Bot size={20} />
            </div>
            <div>
              <h2
                id="doubt-chat-title"
                style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}
              >
                Doubt AI Assistant
              </h2>
              <p
                style={{
                  fontSize: '0.75rem',
                  color: 'var(--muted-foreground)',
                  margin: 0,
                  maxWidth: '22rem',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
                title={scopeTitle}
              >
                Grounded in: {scopeTitle}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {quotaRemaining !== null && (
              <span
                style={{
                  fontSize: '0.75rem',
                  padding: '0.25rem 0.5rem',
                  borderRadius: '9999px',
                  backgroundColor: 'var(--accent)',
                  color: 'var(--accent-foreground)',
                  fontWeight: 500,
                }}
              >
                {quotaRemaining} AI calls left today
              </span>
            )}
            {messages.length > 0 && (
              <button
                type="button"
                onClick={handleClearHistory}
                title="Clear conversation"
                style={{
                  padding: '0.375rem',
                  borderRadius: '0.375rem',
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--muted-foreground)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <Trash2 size={16} />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close doubt chat"
              style={{
                padding: '0.375rem',
                borderRadius: '0.375rem',
                border: 'none',
                background: 'transparent',
                color: 'var(--muted-foreground)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Message Thread Area */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '1.25rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          }}
        >
          {messages.length === 0 ? (
            <div
              style={{
                margin: 'auto',
                maxWidth: '28rem',
                textAlign: 'center',
                padding: '1.5rem',
              }}
            >
              <div
                style={{
                  width: '3.5rem',
                  height: '3.5rem',
                  borderRadius: '50%',
                  backgroundColor: 'var(--muted)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1rem',
                  color: 'var(--primary)',
                }}
              >
                <Sparkles size={24} />
              </div>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                Ask any doubt about this document
              </h3>
              <p
                style={{
                  fontSize: '0.8125rem',
                  color: 'var(--muted-foreground)',
                  marginBottom: '1.5rem',
                  lineHeight: 1.5,
                }}
              >
                Answers are grounded strictly in the verified text chunks. Every claim is backed by
                exact page citations.
              </p>

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                  textAlign: 'left',
                }}
              >
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: 'var(--muted-foreground)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  Quick prompt ideas:
                </span>
                {quickPrompts.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSend(p)}
                    style={{
                      padding: '0.5rem 0.75rem',
                      borderRadius: '0.5rem',
                      border: '1px solid var(--border)',
                      backgroundColor: 'var(--muted)',
                      color: 'var(--foreground)',
                      fontSize: '0.8125rem',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'background-color 0.15s ease',
                    }}
                  >
                    💡 {p}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg, mIdx) => {
              const isUser = msg.sender_role === 'user'

              return (
                <div
                  key={msg.id || mIdx}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: isUser ? 'flex-end' : 'flex-start',
                    maxWidth: '85%',
                    alignSelf: isUser ? 'flex-end' : 'flex-start',
                  }}
                >
                  <div
                    style={{
                      padding: '0.75rem 1rem',
                      borderRadius: isUser
                        ? '1rem 1rem 0.25rem 1rem'
                        : '1rem 1rem 1rem 0.25rem',
                      backgroundColor: isUser ? 'var(--primary)' : 'var(--muted)',
                      color: isUser ? 'var(--primary-foreground)' : 'var(--foreground)',
                      fontSize: '0.875rem',
                      lineHeight: 1.5,
                      whiteSpace: 'pre-wrap',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                    }}
                  >
                    {msg.content}
                  </div>

                  {/* Citations & Confidence Status for Assistant */}
                  {!isUser && (
                    <div style={{ marginTop: '0.5rem', width: '100%' }}>
                      {msg.confidence_status === 'weak_retrieval' && (
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.375rem',
                            padding: '0.375rem 0.625rem',
                            borderRadius: '0.375rem',
                            backgroundColor: 'rgba(234, 179, 8, 0.12)',
                            color: '#b45309',
                            fontSize: '0.75rem',
                            marginBottom: '0.375rem',
                          }}
                        >
                          <AlertCircle size={14} />
                          <span>Information not directly found in the uploaded text chunks.</span>
                        </div>
                      )}

                      {msg.citations && msg.citations.length > 0 && (
                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.375rem',
                            marginTop: '0.25rem',
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.375rem',
                              flexWrap: 'wrap',
                            }}
                          >
                            <span
                              style={{
                                fontSize: '0.75rem',
                                color: 'var(--muted-foreground)',
                                fontWeight: 500,
                              }}
                            >
                              Sources:
                            </span>
                            {msg.citations.map((cite: DoubtCitation, cIdx: number) => {
                              const citeKey = `${mIdx}-${cIdx}`
                              const isExpanded = expandedCitationIndex === citeKey

                              return (
                                <button
                                  key={cIdx}
                                  type="button"
                                  onClick={() => toggleCitation(citeKey)}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.25rem',
                                    padding: '0.2rem 0.5rem',
                                    borderRadius: '0.375rem',
                                    border: '1px solid var(--border)',
                                    backgroundColor: isExpanded
                                      ? 'var(--accent)'
                                      : 'var(--card)',
                                    color: isExpanded
                                      ? 'var(--accent-foreground)'
                                      : 'var(--foreground)',
                                    fontSize: '0.75rem',
                                    fontWeight: 500,
                                    cursor: 'pointer',
                                  }}
                                >
                                  <FileText size={12} />
                                  <span>
                                    {cite.page_number
                                      ? `Page ${cite.page_number}`
                                      : `Section ${cIdx + 1}`}
                                  </span>
                                  {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                </button>
                              )
                            })}
                          </div>

                          {/* Expanded citation excerpt */}
                          {msg.citations.map((cite: DoubtCitation, cIdx: number) => {
                            const citeKey = `${mIdx}-${cIdx}`
                            if (expandedCitationIndex !== citeKey) return null

                            return (
                              <div
                                key={`expanded-${cIdx}`}
                                style={{
                                  padding: '0.5rem 0.75rem',
                                  borderRadius: '0.375rem',
                                  backgroundColor: 'var(--muted)',
                                  borderLeft: '3px solid var(--primary)',
                                  fontSize: '0.75rem',
                                  color: 'var(--muted-foreground)',
                                  fontStyle: 'italic',
                                  lineHeight: 1.4,
                                }}
                              >
                                &ldquo;{cite.excerpt}&rdquo;
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })
          )}

          {isLoading && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                alignSelf: 'flex-start',
                padding: '0.75rem 1rem',
                borderRadius: '1rem 1rem 1rem 0.25rem',
                backgroundColor: 'var(--muted)',
                color: 'var(--muted-foreground)',
                fontSize: '0.8125rem',
              }}
            >
              <Bot size={16} className="animate-spin" />
              <span>Analyzing document and generating citation-grounded response...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Error banner */}
        {errorMsg && (
          <div
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: 'rgba(239, 68, 68, 0.12)',
              color: 'var(--destructive)',
              fontSize: '0.8125rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderTop: '1px solid rgba(239, 68, 68, 0.2)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertCircle size={16} />
              <span>{errorMsg}</span>
            </div>
            <button
              type="button"
              onClick={() => setErrorMsg(null)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--destructive)',
                cursor: 'pointer',
              }}
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Input Bar */}
        <div
          style={{
            padding: '0.875rem 1.25rem',
            borderTop: '1px solid var(--border)',
            backgroundColor: 'var(--card)',
          }}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleSend()
            }}
            style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}
          >
            <input
              type="text"
              value={inputQuestion}
              onChange={(e) => setInputQuestion(e.target.value)}
              placeholder="Ask a doubt about this study material..."
              disabled={isLoading}
              style={{
                flex: 1,
                padding: '0.625rem 0.875rem',
                borderRadius: '0.5rem',
                border: '1px solid var(--border)',
                backgroundColor: 'var(--background)',
                color: 'var(--foreground)',
                fontSize: '0.875rem',
                outline: 'none',
              }}
            />
            <button
              type="submit"
              disabled={isLoading || !inputQuestion.trim()}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.375rem',
                padding: '0.625rem 1rem',
                borderRadius: '0.5rem',
                backgroundColor: 'var(--primary)',
                color: 'var(--primary-foreground)',
                fontSize: '0.875rem',
                fontWeight: 500,
                border: 'none',
                cursor: isLoading || !inputQuestion.trim() ? 'not-allowed' : 'pointer',
                opacity: isLoading || !inputQuestion.trim() ? 0.6 : 1,
              }}
            >
              <Send size={16} />
              <span>Ask</span>
            </button>
          </form>
          <div
            style={{
              fontSize: '0.7rem',
              color: 'var(--muted-foreground)',
              marginTop: '0.375rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
            }}
          >
            <HelpCircle size={12} />
            <span>Answers strictly cite verified document pages. Never hallucinated.</span>
          </div>
        </div>
      </div>
    </div>
  )
}
