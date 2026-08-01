import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
  Upload, FileText, Trash2, Search, Sparkles, Database,
  CheckCircle2, AlertCircle, Loader2, Send, X, HardDrive
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/src/lib/utils'

// ── Types ──────────────────────────────────────────────────────────────────

interface Doc {
  id: string
  name: string
  size_bytes: number
  created_at: string
  status: 'indexed' | 'processing' | 'error'
  chunk_count?: number
}

interface UploadingFile {
  name: string
  progress: number // 0-100
  done: boolean
  error: boolean
}

// ── Helpers ────────────────────────────────────────────────────────────────

function formatSize(bytes: number): string {
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(1)} MB`
  return `${(bytes / 1_024).toFixed(0)} KB`
}

function getFileIcon(name: string) {
  const ext = name.split('.').pop()?.toLowerCase()
  const colors: Record<string, string> = {
    pdf: 'text-red-500',
    docx: 'text-blue-500',
    doc: 'text-blue-500',
    txt: 'text-secondary',
    csv: 'text-green-500',
  }
  return colors[ext || ''] || 'text-primary'
}

const authHeader = () => ({
  Authorization: `Bearer ${localStorage.getItem('bouba_auth_token')}`,
})

// ── Component ──────────────────────────────────────────────────────────────

export default function KnowledgePage() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [documents, setDocuments] = useState<Doc[]>([])
  const [loadingDocs, setLoadingDocs] = useState(false)
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([])
  const [search, setSearch] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // "Tester la base" state
  const [question, setQuestion] = useState('')
  const [querying, setQuerying] = useState(false)
  const [answer, setAnswer] = useState<string | null>(null)
  const [queryError, setQueryError] = useState<string | null>(null)

  // ── Load documents ────────────────────────────────────────────────────

  const loadDocuments = useCallback(async () => {
    setLoadingDocs(true)
    try {
      const res = await fetch('/api/knowledge/documents', { headers: authHeader() })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setDocuments(Array.isArray(data) ? data : (data.data ?? data.documents ?? []))
    } catch (err: any) {
      toast.error('Impossible de charger les documents')
    } finally {
      setLoadingDocs(false)
    }
  }, [])

  useEffect(() => {
    loadDocuments()
  }, [loadDocuments])

  // ── Upload ────────────────────────────────────────────────────────────

  const uploadFiles = async (files: File[]) => {
    if (!files.length) return

    const newEntries: UploadingFile[] = files.map(f => ({
      name: f.name,
      progress: 0,
      done: false,
      error: false,
    }))
    setUploadingFiles(prev => [...prev, ...newEntries])

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const entryIndex = uploadingFiles.length + i

      try {
        const warning = await new Promise<string | null>((resolve, reject) => {
          const xhr = new XMLHttpRequest()
          const formData = new FormData()
          formData.append('file', file)

          xhr.upload.addEventListener('progress', e => {
            if (e.lengthComputable) {
              const pct = Math.round((e.loaded / e.total) * 90)
              setUploadingFiles(prev =>
                prev.map((uf, idx) => (idx === entryIndex ? { ...uf, progress: pct } : uf))
              )
            }
          })

          xhr.addEventListener('load', () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              setUploadingFiles(prev =>
                prev.map((uf, idx) =>
                  idx === entryIndex ? { ...uf, progress: 100, done: true } : uf
                )
              )
              try {
                const json = JSON.parse(xhr.responseText)
                resolve(json.warning ?? null)
              } catch {
                resolve(null)
              }
            } else {
              let errorMsg = `Erreur ${xhr.status}`
              try { errorMsg = JSON.parse(xhr.responseText)?.error || errorMsg } catch {}
              reject(new Error(errorMsg))
            }
          })

          xhr.addEventListener('error', () => reject(new Error('Erreur réseau')))

          xhr.open('POST', '/api/knowledge/upload')
          xhr.setRequestHeader('Authorization', `Bearer ${localStorage.getItem('bouba_auth_token')}`)
          xhr.send(formData)
        })

        if (warning) {
          toast.warning(`${file.name} enregistré — ${warning}`)
        } else {
          toast.success(`${file.name} indexé avec succès`)
        }
      } catch (err: any) {
        setUploadingFiles(prev =>
          prev.map((uf, idx) =>
            idx === entryIndex ? { ...uf, error: true, done: true } : uf
          )
        )
        toast.error(`${file.name} : ${(err as any)?.message || 'Erreur lors de l\'import'}`)
      }
    }

    // Reload document list after all uploads
    await loadDocuments()

    // Clean up finished upload entries after a short delay
    setTimeout(() => {
      setUploadingFiles(prev => prev.filter(uf => !uf.done))
    }, 3000)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    uploadFiles(files)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const files = Array.from(e.dataTransfer.files).filter(f =>
      /\.(pdf|docx|txt|csv|xlsx|xls)$/i.test(f.name)
    )
    if (files.length === 0) {
      toast.error('Formats acceptés : PDF, Excel, CSV, TXT')
      return
    }
    uploadFiles(files)
  }

  // ── Delete ────────────────────────────────────────────────────────────

  const handleDelete = async (doc: Doc) => {
    if (!confirm(`Supprimer "${doc.name}" ? Cette action est irréversible.`)) return
    setDeletingId(doc.id)
    try {
      const res = await fetch(`/api/knowledge/documents/${doc.id}`, {
        method: 'DELETE',
        headers: authHeader(),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setDocuments(prev => prev.filter(d => d.id !== doc.id))
      toast.success(`${doc.name} supprimé`)
    } catch {
      toast.error('Erreur lors de la suppression')
    } finally {
      setDeletingId(null)
    }
  }

  // ── Query ─────────────────────────────────────────────────────────────

  const handleQuery = async () => {
    if (!question.trim()) return
    setQuerying(true)
    setAnswer(null)
    setQueryError(null)
    try {
      const res = await fetch('/api/knowledge/query', {
        method: 'POST',
        headers: { ...authHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: question.trim() }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setAnswer(data.answer ?? JSON.stringify(data))
    } catch {
      setQueryError("Erreur lors de la requête. Vérifiez que des documents sont indexés.")
    } finally {
      setQuerying(false)
    }
  }

  // ── Derived ───────────────────────────────────────────────────────────

  const filteredDocs = documents.filter(d =>
    d.name.toLowerCase().includes(search.toLowerCase())
  )

  const totalBytes = documents.reduce((s, d) => s + d.size_bytes, 0)
  const totalChunks = documents.reduce((s, d) => s + (d.chunk_count ?? 0), 0)
  const indexedCount = documents.filter(d => d.status === 'indexed').length

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <div className="space-y-8 pb-10">

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="space-y-1">
        <h2 className="text-2xl font-display font-bold text-secondary">Base de connaissance</h2>
        <p className="text-muted text-sm">
          Importez vos catalogues, tarifs ou guides — Bouba les utilisera automatiquement dans ses réponses.
        </p>
      </motion.div>

      <>
          {/* ── Stats strip ─────────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4"
          >
            {[
              { label: 'Documents', value: documents.length.toString(), icon: <FileText className="w-5 h-5 text-primary" /> },
              { label: 'Indexés', value: indexedCount.toString(), icon: <CheckCircle2 className="w-5 h-5 text-success" /> },
              { label: 'Vecteurs', value: totalChunks > 0 ? totalChunks.toLocaleString('fr') : '—', icon: <Sparkles className="w-5 h-5 text-primary-light" /> },
              { label: 'Stockage', value: totalBytes > 0 ? formatSize(totalBytes) : '0 KB', icon: <HardDrive className="w-5 h-5 text-muted" /> },
            ].map(stat => (
              <div key={stat.label} className="glass-card p-5 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-background flex items-center justify-center shrink-0">
                  {stat.icon}
                </div>
                <div>
                  <p className="text-xs font-bold text-muted uppercase tracking-widest">{stat.label}</p>
                  <p className="text-xl font-display font-bold text-secondary">{stat.value}</p>
                </div>
              </div>
            ))}
          </motion.div>

          {/* ── Upload area ──────────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
            onDragEnter={e => { e.preventDefault(); setIsDragging(true) }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={cn(
              'border-2 border-dashed rounded-3xl p-12 text-center transition-all duration-200 cursor-pointer',
              isDragging
                ? 'border-primary bg-primary/5 scale-[1.01] shadow-violet'
                : 'border-border hover:border-primary/50 hover:bg-primary/[0.02]'
            )}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="max-w-xs mx-auto space-y-4 pointer-events-none">
              <div className={cn(
                'w-16 h-16 rounded-2xl flex items-center justify-center mx-auto transition-colors',
                isDragging ? 'bg-primary text-white' : 'bg-primary/10 text-primary'
              )}>
                <Upload className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="font-display font-bold text-secondary">Glissez vos fichiers ici</h3>
                <p className="text-xs text-muted">PDF, Excel (.xlsx), CSV, TXT — jusqu'à 15 MB par fichier</p>
              </div>
              <div
                className="btn-primary w-full py-2 text-sm pointer-events-auto"
                onClick={e => { e.stopPropagation(); fileInputRef.current?.click() }}
              >
                Parcourir les fichiers
              </div>
            </div>
            <input
              type="file"
              ref={fileInputRef}
              accept=".pdf,.docx,.txt,.csv,.xlsx,.xls"
              multiple
              onChange={handleFileChange}
              className="hidden"
            />
          </motion.div>

          {/* ── Upload progress ───────────────────────────────────────────── */}
          <AnimatePresence>
            {uploadingFiles.filter(f => !f.done).map((uf, i) => (
              <motion.div
                key={`${uf.name}-${i}`}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="glass-card p-4 flex items-center gap-4"
              >
                <FileText className="w-5 h-5 text-primary shrink-0" />
                <div className="flex-1 min-w-0 space-y-1.5">
                  <p className="text-sm font-medium text-secondary truncate">{uf.name}</p>
                  <div className="h-1.5 bg-background rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-primary rounded-full"
                      animate={{ width: `${uf.progress}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                </div>
                <span className="text-xs font-mono text-muted shrink-0">{uf.progress}%</span>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* ── Documents list ────────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <h3 className="font-display font-bold text-secondary">Documents indexés</h3>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Rechercher…"
                  className="bg-surface border border-border rounded-xl pl-10 pr-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                />
              </div>
            </div>

            <div className="glass-card overflow-hidden">
              {loadingDocs ? (
                <div className="flex items-center justify-center py-16 gap-3 text-muted">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="text-sm">Chargement…</span>
                </div>
              ) : filteredDocs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                  <Database className="w-10 h-10 text-muted" />
                  <p className="text-sm font-semibold text-secondary">
                    {search ? 'Aucun document ne correspond à votre recherche' : 'Aucun document importé'}
                  </p>
                  {!search && (
                    <p className="text-xs text-muted max-w-xs">
                      Importez votre catalogue produits (CSV/Excel), vos tarifs ou guides PDF — Bouba les consultera lors de vos conversations.
                    </p>
                  )}
                </div>
              ) : (
                <table className="w-full text-left">
                  <thead className="bg-background/60 border-b border-border">
                    <tr>
                      <th className="px-6 py-4 text-[10px] font-bold text-muted uppercase tracking-widest">Nom</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-muted uppercase tracking-widest hidden sm:table-cell">Taille</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-muted uppercase tracking-widest hidden md:table-cell">Date</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-muted uppercase tracking-widest">Statut</th>
                      <th className="px-6 py-4" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    <AnimatePresence>
                      {filteredDocs.map(doc => (
                        <motion.tr
                          key={doc.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="hover:bg-background/40 transition-colors"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <FileText className={cn('w-4 h-4 shrink-0', getFileIcon(doc.name))} />
                              <span className="text-sm font-medium text-secondary truncate max-w-[180px]">{doc.name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-xs text-muted hidden sm:table-cell">
                            {formatSize(doc.size_bytes)}
                          </td>
                          <td className="px-6 py-4 text-xs text-muted hidden md:table-cell">
                            {new Date(doc.created_at).toLocaleDateString('fr-FR')}
                          </td>
                          <td className="px-6 py-4">
                            {doc.status === 'indexed' && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider bg-success/10 text-success">
                                <CheckCircle2 className="w-3 h-3" /> Indexé
                              </span>
                            )}
                            {doc.status === 'processing' && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider bg-warning/10 text-warning animate-pulse">
                                <Loader2 className="w-3 h-3 animate-spin" /> Traitement
                              </span>
                            )}
                            {doc.status === 'error' && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider bg-danger/10 text-danger">
                                <AlertCircle className="w-3 h-3" /> Erreur
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => handleDelete(doc)}
                              disabled={deletingId === doc.id}
                              className="p-2 rounded-lg text-muted hover:text-danger hover:bg-danger/10 transition-colors disabled:opacity-50"
                              title="Supprimer"
                            >
                              {deletingId === doc.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </button>
                          </td>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  </tbody>
                </table>
              )}
            </div>
          </motion.div>

          {/* ── Tester la base ────────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass-card p-6 space-y-5"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-display font-bold text-secondary">Tester la base</h3>
                <p className="text-xs text-muted">Posez une question sur vos documents indexés</p>
              </div>
            </div>

            <div className="flex gap-3">
              <input
                type="text"
                value={question}
                onChange={e => setQuestion(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !querying && handleQuery()}
                placeholder="Ex : Que dit le guide interne sur les congés ?"
                className="input-bouba flex-1"
                disabled={querying}
              />
              <button
                onClick={handleQuery}
                disabled={querying || !question.trim()}
                className="btn-primary shrink-0 flex items-center gap-2"
              >
                {querying ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                <span className="hidden sm:inline">Envoyer</span>
              </button>
            </div>

            <AnimatePresence>
              {answer && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="relative bg-background border border-border rounded-2xl p-5"
                >
                  <button
                    onClick={() => setAnswer(null)}
                    className="absolute top-3 right-3 p-1 rounded-lg text-muted hover:text-secondary transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <Sparkles className="w-4 h-4 text-primary" />
                    </div>
                    <p className="text-sm text-secondary leading-relaxed pr-6 whitespace-pre-wrap">{answer}</p>
                  </div>
                </motion.div>
              )}
              {queryError && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-start gap-3 bg-danger/5 border border-danger/20 rounded-2xl p-4"
                >
                  <AlertCircle className="w-5 h-5 text-danger shrink-0 mt-0.5" />
                  <p className="text-sm text-danger">{queryError}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* ── Tip banner ───────────────────────────────────────────────── */}
          <div className="relative overflow-hidden bg-secondary text-white rounded-3xl p-8">
            <div className="pointer-events-none absolute -right-8 -bottom-8 w-48 h-48 text-white/5">
              <Database className="w-full h-full -rotate-12" />
            </div>
            <div className="relative z-10 space-y-3 max-w-lg">
              <div className="flex items-center gap-2 text-primary-light">
                <Sparkles className="w-5 h-5" />
                <span className="text-xs font-bold uppercase tracking-widest">Exemples d'utilisation</span>
              </div>
              <h3 className="text-xl font-display font-bold">Bouba connaît votre catalogue</h3>
              <ul className="text-sm text-white/70 leading-relaxed space-y-1 list-disc list-inside">
                <li>« Je viens de vendre un <strong className="text-white">ordinateur Dell XPS</strong> à Jean Martin, génère le reçu »</li>
                <li>« Quel est le prix de notre <strong className="text-white">forfait Pro</strong> ? »</li>
                <li>« Liste tous nos produits avec une marge supérieure à 30% »</li>
              </ul>
              <p className="text-xs text-white/50 mt-2">
                Importez un fichier CSV ou Excel avec vos produits (nom, prix, description, référence…).
              </p>
            </div>
          </div>
        </>
    </div>
  )
}
