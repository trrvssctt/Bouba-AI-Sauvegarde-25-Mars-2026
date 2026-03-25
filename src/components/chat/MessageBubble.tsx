import { useState } from 'react'
import { motion } from 'motion/react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { User, Bot, ThumbsUp, ThumbsDown, Copy, Sparkles, Mail, Calendar, DollarSign, ExternalLink, Check, FileText, TrendingUp, TrendingDown } from 'lucide-react'
import { cn } from '@/src/lib/utils'
import { useChatStore } from '@/src/stores/chatStore'

interface MessageBubbleProps {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  agent?: string
  isStreaming?: boolean
  suggestions?: string[]
  feedback?: 'up' | 'down'
  onSuggestionClick?: (suggestion: string) => void
}

// ── Rich content detectors ──────────────────────────────────────────────

function detectEmailCard(content: string) {
  const m = content.match(/```email\n([\s\S]*?)```/)
  if (!m) return null
  try { return JSON.parse(m[1]) } catch { return null }
}

function detectCalendarCard(content: string) {
  const m = content.match(/```event\n([\s\S]*?)```/)
  if (!m) return null
  try { return JSON.parse(m[1]) } catch { return null }
}

function detectFinanceCard(content: string) {
  const m = content.match(/```finance\n([\s\S]*?)```/)
  if (!m) return null
  try { return JSON.parse(m[1]) } catch { return null }
}

function stripRichBlocks(content: string) {
  return content
    .replace(/```email\n[\s\S]*?```/g, '')
    .replace(/```event\n[\s\S]*?```/g, '')
    .replace(/```finance\n[\s\S]*?```/g, '')
    .trim()
}

// ── Rich card components ────────────────────────────────────────────────

function EmailCard({ data }: { data: any }) {
  return (
    <div className="mt-3 bg-red-50 border border-red-200 rounded-xl p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-2">
        <Mail className="w-4 h-4 text-red-500" />
        <span className="text-xs font-bold text-red-600 uppercase tracking-wider">Email</span>
      </div>
      {data.subject && <p className="font-semibold text-gray-900 text-sm">{data.subject}</p>}
      {data.from && <p className="text-xs text-gray-500 mt-0.5">De : {data.from}</p>}
      {data.to && <p className="text-xs text-gray-500">À : {data.to}</p>}
      {data.date && <p className="text-xs text-gray-400">{data.date}</p>}
      {data.snippet && (
        <p className="mt-2 text-sm text-gray-700 border-t border-red-100 pt-2 line-clamp-3">{data.snippet}</p>
      )}
    </div>
  )
}

function CalendarCard({ data }: { data: any }) {
  return (
    <div className="mt-3 bg-blue-50 border border-blue-200 rounded-xl p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-2">
        <Calendar className="w-4 h-4 text-blue-500" />
        <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Événement</span>
      </div>
      {data.title && <p className="font-semibold text-gray-900 text-sm">{data.title}</p>}
      {data.start && <p className="text-xs text-gray-600 mt-1">📅 {new Date(data.start).toLocaleString('fr-FR')}</p>}
      {data.end && <p className="text-xs text-gray-500">→ {new Date(data.end).toLocaleString('fr-FR')}</p>}
      {data.location && <p className="text-xs text-gray-500">📍 {data.location}</p>}
      {data.attendees && data.attendees.length > 0 && (
        <p className="text-xs text-gray-500">👥 {data.attendees.join(', ')}</p>
      )}
      {data.link && (
        <a href={data.link} target="_blank" rel="noopener noreferrer"
          className="mt-2 inline-flex items-center gap-1 text-xs text-blue-600 hover:underline">
          <ExternalLink className="w-3 h-3" /> Ouvrir dans Calendar
        </a>
      )}
    </div>
  )
}

function FinanceCard({ data }: { data: any }) {
  const isPositive = (data.type === 'revenue') || (data.amount > 0)
  return (
    <div className="mt-3 bg-green-50 border border-green-200 rounded-xl p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-2">
        <DollarSign className="w-4 h-4 text-green-600" />
        <span className="text-xs font-bold text-green-700 uppercase tracking-wider">Finance</span>
        {isPositive
          ? <TrendingUp className="w-3.5 h-3.5 text-green-500 ml-auto" />
          : <TrendingDown className="w-3.5 h-3.5 text-red-500 ml-auto" />
        }
      </div>
      {data.label && <p className="font-semibold text-gray-900 text-sm">{data.label}</p>}
      {data.amount !== undefined && (
        <p className={cn("text-xl font-bold mt-1", isPositive ? "text-green-600" : "text-red-600")}>
          {isPositive ? '+' : ''}{Number(data.amount).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
        </p>
      )}
      {data.date && <p className="text-xs text-gray-400 mt-1">{data.date}</p>}
      {data.category && (
        <span className="mt-2 inline-block bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">{data.category}</span>
      )}
    </div>
  )
}

// ── Markdown renderers — ASSISTANT (dark text on white bg) ───────────────

const assistantMarkdown: any = {
  code({ node, inline, className, children, ...props }: any) {
    const match = /language-(\w+)/.exec(className || '')
    const lang = match?.[1] || ''
    const codeStr = String(children).replace(/\n$/, '')
    if (!inline && lang && !['email','event','finance'].includes(lang)) {
      return (
        <SyntaxHighlighter style={oneDark} language={lang} PreTag="div"
          className="rounded-lg text-sm my-2" {...props}>
          {codeStr}
        </SyntaxHighlighter>
      )
    }
    if (inline) {
      return <code className="bg-primary/8 text-primary px-1.5 py-0.5 rounded text-[0.85em] font-mono" {...props}>{children}</code>
    }
    return (
      <pre className="bg-gray-900 text-gray-100 rounded-xl p-4 overflow-x-auto text-sm my-3">
        <code className="font-mono">{children}</code>
      </pre>
    )
  },
  table({ children }: any) {
    return (
      <div className="overflow-x-auto my-3 rounded-xl border border-gray-200">
        <table className="min-w-full text-sm">{children}</table>
      </div>
    )
  },
  th({ children }: any) {
    return <th className="bg-gray-50 px-4 py-2.5 text-left font-bold border-b border-gray-200 text-gray-700 text-xs uppercase tracking-wide">{children}</th>
  },
  td({ children }: any) {
    return <td className="px-4 py-2.5 border-b border-gray-100 text-gray-800">{children}</td>
  },
  a({ href, children }: any) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer"
        className="text-primary underline hover:opacity-80 inline-flex items-center gap-1">
        {children}<ExternalLink className="w-3 h-3 inline opacity-60" />
      </a>
    )
  },
  blockquote({ children }: any) {
    return <blockquote className="border-l-4 border-primary/30 bg-primary/3 pl-4 pr-2 py-1 italic text-gray-600 my-2 rounded-r-lg">{children}</blockquote>
  },
  h1: ({ children }: any) => <h1 className="text-xl font-bold mt-4 mb-2 text-gray-900">{children}</h1>,
  h2: ({ children }: any) => <h2 className="text-lg font-bold mt-3 mb-1.5 text-gray-900">{children}</h2>,
  h3: ({ children }: any) => <h3 className="text-base font-semibold mt-2 mb-1 text-gray-800">{children}</h3>,
  ul: ({ children }: any) => <ul className="list-disc pl-5 space-y-1 my-2">{children}</ul>,
  ol: ({ children }: any) => <ol className="list-decimal pl-5 space-y-1 my-2">{children}</ol>,
  li: ({ children }: any) => <li className="text-gray-800 leading-relaxed">{children}</li>,
  p: ({ children }: any) => <p className="mb-2 leading-relaxed text-gray-800">{children}</p>,
  strong: ({ children }: any) => <strong className="font-semibold text-gray-900">{children}</strong>,
  em: ({ children }: any) => <em className="italic text-gray-700">{children}</em>,
  hr: () => <hr className="border-gray-200 my-4" />,
}

// ── Markdown renderers — USER (white text on primary bg) ─────────────────

const userMarkdown: any = {
  code({ node, inline, className, children, ...props }: any) {
    if (inline) {
      return <code className="bg-white/20 px-1.5 py-0.5 rounded text-[0.85em] font-mono text-white" {...props}>{children}</code>
    }
    return (
      <pre className="bg-white/20 rounded-xl p-3 overflow-x-auto text-sm my-2 text-white">
        <code className="font-mono">{children}</code>
      </pre>
    )
  },
  a({ href, children }: any) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer"
        className="text-white underline opacity-90 hover:opacity-100 inline-flex items-center gap-1">
        {children}
      </a>
    )
  },
  blockquote({ children }: any) {
    return <blockquote className="border-l-4 border-white/40 pl-4 italic text-white/80 my-2">{children}</blockquote>
  },
  h1: ({ children }: any) => <h1 className="text-lg font-bold mt-2 mb-1 text-white">{children}</h1>,
  h2: ({ children }: any) => <h2 className="text-base font-bold mt-2 mb-1 text-white">{children}</h2>,
  h3: ({ children }: any) => <h3 className="text-sm font-semibold mt-1 mb-0.5 text-white">{children}</h3>,
  ul: ({ children }: any) => <ul className="list-disc pl-5 space-y-0.5 my-1">{children}</ul>,
  ol: ({ children }: any) => <ol className="list-decimal pl-5 space-y-0.5 my-1">{children}</ol>,
  li: ({ children }: any) => <li className="text-white/95 leading-relaxed">{children}</li>,
  p: ({ children }: any) => <p className="mb-1.5 leading-relaxed text-white/95">{children}</p>,
  strong: ({ children }: any) => <strong className="font-bold text-white">{children}</strong>,
  em: ({ children }: any) => <em className="italic text-white/90">{children}</em>,
  hr: () => <hr className="border-white/30 my-3" />,
}

// ── Agent badge colors ───────────────────────────────────────────────────

const agentConfig: Record<string, { label: string; icon: any; bg: string; text: string }> = {
  EMAIL:    { label: 'Email',    icon: Mail,       bg: 'bg-red-50',    text: 'text-red-600' },
  CALENDAR: { label: 'Agenda',   icon: Calendar,   bg: 'bg-blue-50',   text: 'text-blue-600' },
  FINANCE:  { label: 'Finance',  icon: DollarSign, bg: 'bg-green-50',  text: 'text-green-700' },
  CONTACT:  { label: 'Contact',  icon: FileText,   bg: 'bg-purple-50', text: 'text-purple-600' },
  GENERAL:  { label: 'Bouba',    icon: Sparkles,   bg: 'bg-primary/8', text: 'text-primary' },
}

// ── Main component ──────────────────────────────────────────────────────

export default function MessageBubble({
  id, role, content, timestamp, agent, isStreaming, suggestions, feedback, onSuggestionClick
}: MessageBubbleProps) {
  const isUser = role === 'user'
  const date = timestamp instanceof Date ? timestamp : new Date(timestamp)
  const { setFeedback } = useChatStore()
  const [copied, setCopied] = useState(false)

  const emailCard    = !isUser ? detectEmailCard(content)    : null
  const calendarCard = !isUser ? detectCalendarCard(content) : null
  const financeCard  = !isUser ? detectFinanceCard(content)  : null
  const cleanContent = (!isUser && (emailCard || calendarCard || financeCard))
    ? stripRichBlocks(content)
    : content

  const agentKey  = agent?.toUpperCase() || 'GENERAL'
  const agentInfo = agentConfig[agentKey] || agentConfig['GENERAL']
  const AgentIcon = agentInfo.icon

  const handleCopy = () => {
    navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn("flex w-full gap-3 mb-4 group", isUser ? "flex-row-reverse" : "flex-row")}
    >
      {/* Avatar */}
      <div className={cn(
        "w-9 h-9 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm mt-0.5",
        isUser
          ? "bg-gradient-to-br from-primary to-violet-600 text-white"
          : "bg-white border border-border text-primary shadow-card"
      )}>
        {isUser ? <User className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
      </div>

      {/* Content */}
      <div className={cn("flex flex-col max-w-[80%] min-w-0", isUser ? "items-end" : "items-start")}>

        {/* Bubble */}
        <div className={cn(
          "px-4 py-3 rounded-2xl shadow-sm min-w-0",
          isUser
            ? "bg-gradient-to-br from-primary to-violet-600 text-white rounded-tr-sm"
            : "bg-white border border-gray-100 text-gray-800 rounded-tl-sm shadow-[0_2px_12px_rgba(0,0,0,0.06)]"
        )}>
          {/* Agent badge — assistant only */}
          {!isUser && agent && (
            <div className={cn(
              "inline-flex items-center gap-1.5 mb-2.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
              agentInfo.bg, agentInfo.text
            )}>
              <AgentIcon className="w-3 h-3" />
              {agentInfo.label} Agent
            </div>
          )}

          {/* Text */}
          {cleanContent && (
            <div className="text-sm leading-relaxed min-w-0">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={isUser ? userMarkdown : assistantMarkdown}
              >
                {cleanContent}
              </ReactMarkdown>
              {isStreaming && (
                <span className="inline-block w-1.5 h-4 ml-0.5 bg-current animate-pulse align-middle opacity-70" />
              )}
            </div>
          )}

          {/* Rich cards */}
          {emailCard    && <EmailCard    data={emailCard}    />}
          {calendarCard && <CalendarCard data={calendarCard} />}
          {financeCard  && <FinanceCard  data={financeCard}  />}
        </div>

        {/* Suggestions */}
        {!isUser && suggestions && suggestions.length > 0 && !isStreaming && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {suggestions.map((s, i) => (
              <button key={i} onClick={() => onSuggestionClick?.(s)}
                className="px-3 py-1.5 bg-white border border-primary/20 rounded-full text-[11px] font-semibold text-primary hover:bg-primary hover:text-white hover:border-primary transition-all flex items-center gap-1.5 shadow-sm">
                <Sparkles className="w-3 h-3" />{s}
              </button>
            ))}
          </div>
        )}

        {/* Metadata & Actions */}
        <div className={cn(
          "flex items-center gap-2 mt-1.5 px-1",
          isUser ? "flex-row-reverse" : "flex-row"
        )}>
          <span className="text-[10px] text-gray-400 font-medium tabular-nums">
            {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>

          {!isUser && !isStreaming && (
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => setFeedback(id, 'up')}
                className={cn("p-1.5 rounded-lg transition-colors text-xs",
                  feedback === 'up'
                    ? "bg-green-50 text-green-600"
                    : "hover:bg-gray-100 text-gray-400 hover:text-green-600")}>
                <ThumbsUp className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => setFeedback(id, 'down')}
                className={cn("p-1.5 rounded-lg transition-colors",
                  feedback === 'down'
                    ? "bg-red-50 text-red-500"
                    : "hover:bg-gray-100 text-gray-400 hover:text-red-500")}>
                <ThumbsDown className="w-3.5 h-3.5" />
              </button>
              <button onClick={handleCopy}
                className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-700 transition-colors">
                {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          )}
        </div>

      </div>
    </motion.div>
  )
}
