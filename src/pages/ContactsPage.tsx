import { useState, useMemo, useEffect, useRef } from 'react'
import {
  Search,
  Plus,
  Filter,
  MoreHorizontal,
  Mail,
  Phone,
  Edit2,
  Trash2,
  Building2,
  Briefcase,
  User,
  Tags,
  Users,
  Star,
  Download,
  Upload,
  Bot,
  Sparkles,
  X,
  Check,
  ChevronRight,
  ChevronLeft,
  MessageSquare,
  Calendar,
  ExternalLink,
  Save,
  RefreshCw,
  Hash,
  Clock,
  Send,
  FileText,
  History,
  Loader2,
  AlertCircle
} from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import { cn } from '@/src/lib/utils'
import { useContactStore, Contact } from '@/src/stores/contactStore'
import { useContactAI } from '@/src/hooks/useContactAI'
import { useEmailStore } from '@/src/stores/emailStore'
import { useDocumentStore } from '@/src/stores/documentStore'
import { useConnections } from '@/src/hooks/useConnections'
import { toast } from 'sonner'
import GoogleSyncBanner from '@/src/components/GoogleSyncBanner'

type DetailTab = 'info' | 'activity' | 'history'

export default function ContactsPage() {
  const {
    contacts,
    selectedContactId,
    searchQuery,
    activeGroup,
    addContact,
    updateContact,
    deleteContact,
    selectContact,
    setSearchQuery,
    setActiveGroup,
    addTag,
    removeTag,
    loadFromDB
  } = useContactStore()

  const { emails } = useEmailStore()
  const { documents } = useDocumentStore()
  const { connections } = useConnections()
  const contactsConnection = connections.find(c => c.id === 'contacts')
  const isContactsConnected = contactsConnection?.status === 'connected'

  const [syncError, setSyncError] = useState<string | null>(null)
  const [lastSync, setLastSync] = useState<string | null>(contactsConnection?.lastSync || null)

  useEffect(() => {
    loadFromDB()
    if (isContactsConnected) {
      syncGoogleContacts().then(res => {
        if (res.success) setLastSync(new Date().toISOString())
        else if (res.error) setSyncError(res.error)
      })
    }
  }, [])

  const handleContactsSync = async () => {
    setSyncError(null)
    const res = await syncGoogleContacts()
    if (res.success) {
      setLastSync(new Date().toISOString())
      toast.success('Contacts synchronisés')
    } else {
      setSyncError(res.error || 'Erreur de synchronisation')
    }
  }

  const { processContactCommand, addContactViaBouba, deleteContactViaBouba, syncGoogleContacts, isProcessing, isSyncing } = useContactAI()
  const [aiCommand, setAiCommand] = useState('')
  const [showMobileBouba, setShowMobileBouba] = useState(false)
  const [isAddingManually, setIsAddingManually] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Partial<Contact>>({})
  const [detailTab, setDetailTab] = useState<DetailTab>('info')
  const [newTagInput, setNewTagInput] = useState('')
  const [showTagInput, setShowTagInput] = useState(false)
  const [isComposingEmail, setIsComposingEmail] = useState(false)
  const [emailSubject, setEmailSubject] = useState('')
  const [emailBody, setEmailBody] = useState('')
  const [isSendingEmail, setIsSendingEmail] = useState(false)

  // CSV Upload
  const csvInputRef = useRef<HTMLInputElement>(null)
  const [isImporting, setIsImporting] = useState(false)
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number; errors: string[] } | null>(null)

  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setIsImporting(true)
    setImportResult(null)

    try {
      const text = await file.text()
      const lines = text.split(/\r?\n/).filter(l => l.trim())
      if (lines.length < 2) {
        toast.error("Le fichier CSV est vide ou invalide")
        return
      }

      // Detect header
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/['"]/g, ''))
      const rows = lines.slice(1)

      const getCol = (row: string[], ...keys: string[]) => {
        for (const key of keys) {
          const idx = headers.findIndex(h => h.includes(key))
          if (idx !== -1) return (row[idx] || '').trim().replace(/^["']|["']$/g, '')
        }
        return ''
      }

      let imported = 0
      let skipped = 0
      const errors: string[] = []

      for (const line of rows) {
        if (!line.trim()) continue
        // Simple CSV split (handles basic quoting)
        const cols = line.match(/("(?:[^"]|"")*"|[^,]*)/g)?.map(c => c.replace(/^"|"$/g, '').replace(/""/g, '"')) || line.split(',')

        const phone = getCol(cols, 'tel', 'phone', 'mobile', 'telephone', 'téléphone')
        const email = getCol(cols, 'email', 'mail', 'e-mail', 'courriel')

        if (!phone && !email) {
          skipped++
          errors.push(`Ligne ignorée (pas de téléphone ni email): ${line.slice(0, 50)}`)
          continue
        }

        const firstName = getCol(cols, 'prenom', 'prénom', 'first', 'firstname', 'given')
        const lastName = getCol(cols, 'nom', 'last', 'lastname', 'family', 'name') || getCol(cols, 'contact')
        const fullName = getCol(cols, 'full', 'fullname', 'nom complet', 'name') || `${firstName} ${lastName}`.trim() || email || phone

        try {
          addContact({
            name: fullName || email || phone,
            firstName: firstName || fullName.split(' ')[0] || '',
            lastName: lastName || fullName.split(' ').slice(1).join(' ') || '',
            email,
            phone,
            company: getCol(cols, 'company', 'entreprise', 'societe', 'société', 'org'),
            position: getCol(cols, 'position', 'poste', 'title', 'role', 'fonction'),
            tags: [],
            notes: getCol(cols, 'note', 'notes', 'comment'),
            groups: [],
            avatar: '',
          })
          imported++
        } catch (err) {
          errors.push(`Erreur ligne: ${line.slice(0, 50)}`)
          skipped++
        }
      }

      setImportResult({ imported, skipped, errors })
      if (imported > 0) toast.success(`${imported} contact(s) importé(s)`)
      else toast.warning("Aucun contact importé")
    } catch (err) {
      toast.error("Erreur lors de la lecture du fichier")
    } finally {
      setIsImporting(false)
      if (csvInputRef.current) csvInputRef.current.value = ''
    }
  }

  const filteredContacts = useMemo(() => {
    return contacts.filter(c => {
      const matchesSearch =
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.position.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesGroup = !activeGroup || c.groups.includes(activeGroup)
      return matchesSearch && matchesGroup
    })
  }, [contacts, searchQuery, activeGroup])

  const selectedContact = useMemo(() =>
    contacts.find(c => c.id === selectedContactId) || null
  , [contacts, selectedContactId])

  // Emails related to this contact
  const contactEmails = useMemo(() => {
    if (!selectedContact) return []
    const email = selectedContact.email.toLowerCase()
    const name = selectedContact.name.toLowerCase()
    return emails.filter(e =>
      e.fromEmail?.toLowerCase() === email ||
      e.to?.toLowerCase().includes(email) ||
      e.from?.toLowerCase().includes(name)
    ).slice(0, 10)
  }, [selectedContact, emails])

  // Documents related to this contact
  const contactDocs = useMemo(() => {
    if (!selectedContact) return []
    const email = selectedContact.email.toLowerCase()
    const name = selectedContact.name.toLowerCase()
    return documents.filter(d =>
      (d.clientEmail && d.clientEmail.toLowerCase() === email) ||
      (d.clientName && d.clientName.toLowerCase() === name)
    )
  }, [selectedContact, documents])

  // Merged timeline events sorted by date desc
  const timelineEvents = useMemo(() => {
    const events: { date: string; type: 'email' | 'doc'; label: string; sub: string; sent?: boolean; status?: string }[] = []
    contactEmails.forEach(e => events.push({
      date: e.date || '',
      type: 'email',
      label: e.subject || '(Sans objet)',
      sub: e.folder === 'sent' ? 'Email envoyé' : 'Email reçu',
      sent: e.folder === 'sent',
    }))
    contactDocs.forEach(d => events.push({
      date: d.date,
      type: 'doc',
      label: `${d.number}`,
      sub: `${d.type === 'invoice' ? 'Facture' : d.type === 'quote' ? 'Devis' : d.type === 'receipt' ? 'Reçu' : 'Document'} — ${d.totalTTC.toLocaleString('fr-FR')} ${d.companyVat ? '' : ''}`,
      status: d.status,
    }))
    return events.sort((a, b) => (b.date > a.date ? 1 : -1))
  }, [contactEmails, contactDocs])

  // All unique tags from contacts
  const allTags = useMemo(() => {
    const tags = new Set<string>()
    contacts.forEach(c => c.tags.forEach(t => tags.add(t)))
    return Array.from(tags)
  }, [contacts])

  const handleAiCommand = async () => {
    if (!aiCommand.trim()) return
    // Route through Bouba (Contact Agent → PostgreSQL) for CRUD
    const result = await addContactViaBouba(aiCommand)
    if (result.success) {
      toast.success(result.output || 'Contact traité par Bouba !')
      setAiCommand('')
    } else {
      // Fallback: parse locally and save
      const parsed = await processContactCommand(aiCommand)
      if (parsed.success && parsed.data) {
        addContact(parsed.data)
        toast.success(`Contact ${parsed.data.name} ajouté localement`)
        setAiCommand('')
      } else {
        toast.error(parsed.error || result.error || 'Une erreur est survenue')
      }
    }
  }

  const startEditing = (contact: Contact) => {
    setEditingId(contact.id)
    setEditForm(contact)
  }

  const saveEdit = () => {
    if (editingId) {
      updateContact(editingId, editForm)
      setEditingId(null)
      toast.success("Contact mis à jour")
    }
  }

  const handleAddTag = () => {
    if (!newTagInput.trim() || !selectedContact) return
    addTag(selectedContact.id, newTagInput.trim())
    setNewTagInput('')
    setShowTagInput(false)
    toast.success(`Tag "${newTagInput.trim()}" ajouté`)
  }

  const handleSendEmail = async () => {
    if (!selectedContact?.email || !emailSubject.trim()) {
      toast.error("Sujet requis")
      return
    }
    setIsSendingEmail(true)
    try {
      const { useEmailStore: emailStoreImport } = await import('@/src/stores/emailStore')
      const sendEmail = emailStoreImport.getState().sendEmail
      const result = await sendEmail({
        to: selectedContact.email,
        subject: emailSubject,
        body: emailBody,
      })
      if (result.success) {
        toast.success(`Email envoyé à ${selectedContact.name}`)
        setIsComposingEmail(false)
        setEmailSubject('')
        setEmailBody('')
      } else {
        toast.error(result.error || "Erreur envoi")
      }
    } catch {
      toast.error("Erreur lors de l'envoi")
    } finally {
      setIsSendingEmail(false)
    }
  }

  const exportContacts = () => {
    const csv = [
      ['Nom', 'Email', 'Téléphone', 'Entreprise', 'Poste', 'Tags'].join(','),
      ...contacts.map(c => [c.name, c.email, c.phone, c.company, c.position, c.tags.join(';')].join(','))
    ].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.setAttribute('hidden', '')
    a.setAttribute('href', url)
    a.setAttribute('download', 'contacts_bouba.csv')
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    toast.success("Export terminé")
  }

  const formatRelativeDate = (dateStr: string) => {
    const d = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - d.getTime()
    const days = Math.floor(diff / 86400000)
    if (days === 0) return "Aujourd'hui"
    if (days === 1) return "Hier"
    if (days < 7) return `Il y a ${days} jours`
    if (days < 30) return `Il y a ${Math.floor(days / 7)} semaine(s)`
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
  }

  if (!isContactsConnected) {
    return (
      <div className="flex h-full bg-background">
        <GoogleSyncBanner
          service="contacts"
          isConnected={false}
          isLoading={false}
          variant="empty"
          onSync={handleContactsSync}
          onConnect={() => window.location.href = '/settings/connections'}
        />
      </div>
    )
  }

  return (
    <div className="flex h-full bg-background overflow-hidden flex-col">
      {/* Google Contacts Sync Banner */}
      <GoogleSyncBanner
        service="contacts"
        isConnected={isContactsConnected}
        isLoading={false}
        isSyncing={isSyncing}
        lastSync={lastSync}
        error={syncError}
        onSync={handleContactsSync}
        variant="bar"
      />
      <div className="flex flex-1 overflow-hidden">
      {/* Sidebar */}
      <div className="hidden md:flex w-60 lg:w-64 border-r border-border bg-surface/50 p-4 lg:p-6 flex-col gap-6 lg:gap-8 overflow-y-auto">
        <div className="space-y-3">
          <button
            onClick={() => setIsAddingManually(true)}
            className="btn-primary w-full flex items-center justify-center gap-2 py-2.5"
          >
            <Plus className="w-4 h-4" />
            Nouveau contact
          </button>
          <button
            onClick={handleContactsSync}
            disabled={isSyncing}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 border border-border rounded-xl text-sm font-medium text-secondary hover:bg-background transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Import...' : 'Sync Google'}
          </button>

          <div className="bg-primary/5 rounded-2xl p-4 border border-primary/10 space-y-3">
            <div className="flex items-center gap-2 text-primary">
              <Sparkles className="w-4 h-4" />
              <span className="text-[10px] font-bold uppercase tracking-widest">Ajout via Bouba</span>
            </div>
            <p className="text-[11px] text-muted leading-relaxed">
              Ex: "Ajoute Alice Martin, alice@techcorp.com, TechCorp"
            </p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={aiCommand}
                onChange={(e) => setAiCommand(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAiCommand()}
                placeholder="Nom + email ou téléphone..."
                className="flex-1 bg-background border border-border rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/50"
              />
              <button
                onClick={handleAiCommand}
                disabled={isProcessing || !aiCommand.trim()}
                className="p-2 bg-primary text-white rounded-xl hover:bg-primary-dark disabled:opacity-40 transition-colors shrink-0"
              >
                {isProcessing
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <Sparkles className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <h3 className="text-[10px] font-bold text-muted uppercase tracking-widest px-2">Groupes</h3>
            <div className="space-y-1">
              {[null, 'Clients', 'Partenaires', 'VIP', 'Équipe'].map(group => (
                <button
                  key={group || 'all'}
                  onClick={() => setActiveGroup(group)}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium transition-all",
                    activeGroup === group ? "bg-primary text-white shadow-sm" : "text-muted hover:bg-background hover:text-secondary"
                  )}
                >
                  <div className="flex items-center gap-3">
                    {group === null ? <Users className="w-4 h-4" /> : <User className="w-4 h-4" />}
                    <span>{group || 'Tous les contacts'}</span>
                  </div>
                  <span className="text-[10px] opacity-60">
                    {group === null ? contacts.length : contacts.filter(c => c.groups.includes(group)).length}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {allTags.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-[10px] font-bold text-muted uppercase tracking-widest px-2">Tags</h3>
              <div className="flex flex-wrap gap-2 px-2">
                {allTags.map(tag => (
                  <button
                    key={tag}
                    className="text-[10px] font-bold bg-background border border-border px-2 py-1 rounded-full text-muted hover:border-primary hover:text-primary transition-all"
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="mt-auto space-y-2">
          <button onClick={exportContacts} className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-muted hover:bg-background hover:text-secondary transition-all">
            <Download className="w-4 h-4" />
            Exporter CSV
          </button>
          <button
            onClick={() => csvInputRef.current?.click()}
            disabled={isImporting}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-muted hover:bg-background hover:text-secondary transition-all disabled:opacity-50"
          >
            {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {isImporting ? 'Import en cours...' : 'Importer CSV'}
          </button>
          <input
            ref={csvInputRef}
            type="file"
            accept=".csv,.txt"
            className="hidden"
            onChange={handleCsvUpload}
          />
          <p className="text-[10px] text-muted px-3 leading-relaxed">
            Colonnes : nom, email, téléphone*, entreprise, poste<br/>
            *téléphone ou email obligatoire
          </p>
        </div>
      </div>

      {/* Contact List */}
      <div className="flex-1 flex flex-col bg-surface min-w-0">
        <div className="p-3 lg:p-6 border-b border-border flex flex-wrap items-center gap-3 bg-white/50 backdrop-blur-sm sticky top-0 z-10">
          <div className="flex-1 min-w-0 relative">
            <Search className="absolute left-3 lg:left-4 top-1/2 -translate-y-1/2 w-4 h-4 lg:w-5 lg:h-5 text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher un contact..."
              className="w-full bg-background border border-border rounded-xl lg:rounded-2xl pl-10 lg:pl-12 pr-4 py-2.5 lg:py-3 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all"
            />
          </div>
          <div className="flex md:hidden items-center gap-2">
            <button onClick={syncGoogleContacts} disabled={isSyncing} className="p-2 border border-border rounded-xl text-muted hover:bg-background transition-colors disabled:opacity-50">
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => setShowMobileBouba(v => !v)}
              className={`p-2 border rounded-xl transition-colors ${showMobileBouba ? 'bg-primary text-white border-primary' : 'border-border text-primary hover:bg-primary/10'}`}
            >
              <Sparkles className="w-4 h-4" />
            </button>
            <button onClick={() => setIsAddingManually(true)} className="p-2 bg-primary text-white rounded-xl hover:bg-primary-dark transition-colors">
              <Plus className="w-4 h-4" />
            </button>
          </div>
          {/* Mobile Bouba input — collapsible */}
          {showMobileBouba && (
            <div className="w-full mt-2 flex md:hidden items-center gap-2 bg-primary/5 border border-primary/20 rounded-xl px-3 py-2">
              <Sparkles className="w-3.5 h-3.5 text-primary shrink-0" />
              <input
                type="text"
                value={aiCommand}
                onChange={(e) => setAiCommand(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { handleAiCommand(); setShowMobileBouba(false) } }}
                placeholder='Ex: "Ajoute Alice, alice@corp.com"'
                className="flex-1 bg-transparent text-sm border-none focus:ring-0 placeholder:text-muted min-w-0"
                autoFocus
              />
              <button
                onClick={() => { handleAiCommand(); setShowMobileBouba(false) }}
                disabled={isProcessing || !aiCommand.trim()}
                className="p-1.5 bg-primary text-white rounded-lg disabled:opacity-40 hover:bg-primary-dark transition-colors shrink-0"
              >
                {isProcessing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Bot className="w-3 h-3" />}
              </button>
            </div>
          )}
          <div className="hidden md:flex items-center gap-3">
            <button className="p-3 border border-border rounded-2xl text-muted hover:bg-background transition-colors">
              <Filter className="w-5 h-5" />
            </button>
            <div className="h-8 w-px bg-border mx-2" />
            <div className="flex items-center gap-2 text-sm font-bold text-secondary">
              <span className="text-primary">{filteredContacts.length}</span>
              <span className="text-muted">contacts</span>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 lg:p-6">
          {filteredContacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-muted space-y-4">
              <Users className="w-16 h-16 opacity-20" />
              <div>
                <p className="font-bold text-secondary">Aucun contact</p>
                <p className="text-sm">Ajoutez des contacts ou synchronisez avec Google</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredContacts.map(contact => (
                <motion.div
                  key={contact.id}
                  layoutId={contact.id}
                  onClick={() => { selectContact(contact.id); setDetailTab('info') }}
                  className={cn(
                    "group bg-white border rounded-3xl p-4 flex items-center gap-6 cursor-pointer transition-all hover:shadow-xl hover:border-primary/20",
                    selectedContactId === contact.id ? "border-primary ring-1 ring-primary/20 shadow-lg" : "border-border"
                  )}
                >
                  <div className="w-14 h-14 rounded-2xl overflow-hidden bg-primary/10 shrink-0">
                    {contact.avatar ? (
                      <img src={contact.avatar} alt={contact.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-primary font-bold text-xl">
                        {contact.firstName?.[0]}{contact.lastName?.[0]}
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 items-center">
                    <div className="col-span-1">
                      {editingId === contact.id ? (
                        <input
                          autoFocus
                          value={editForm.name}
                          onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                          onClick={(e) => e.stopPropagation()}
                          className="w-full bg-background border border-primary rounded-lg px-2 py-1 text-sm font-bold"
                        />
                      ) : (
                        <h4 className="font-bold text-secondary truncate">{contact.name}</h4>
                      )}
                      <p className="text-xs text-muted truncate">{contact.position}</p>
                    </div>

                    <div className="col-span-1 hidden md:block">
                      <div className="flex items-center gap-2 text-xs text-muted">
                        <Building2 className="w-3 h-3" />
                        <span className="truncate">{contact.company}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted mt-1">
                        <Mail className="w-3 h-3" />
                        <span className="truncate">{contact.email}</span>
                      </div>
                    </div>

                    <div className="col-span-1 hidden md:block">
                      <div className="flex flex-wrap gap-1">
                        {contact.tags.slice(0, 3).map(tag => (
                          <span key={tag} className="text-[9px] font-bold bg-background border border-border px-2 py-0.5 rounded-full text-muted uppercase">
                            {tag}
                          </span>
                        ))}
                        {contact.tags.length > 3 && (
                          <span className="text-[9px] font-bold bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                            +{contact.tags.length - 3}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="col-span-1 flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {editingId === contact.id ? (
                        <button onClick={(e) => { e.stopPropagation(); saveEdit() }} className="p-2 bg-success text-white rounded-xl hover:bg-success/90">
                          <Save className="w-4 h-4" />
                        </button>
                      ) : (
                        <button onClick={(e) => { e.stopPropagation(); startEditing(contact) }} className="p-2 hover:bg-background rounded-xl text-muted hover:text-primary">
                          <Edit2 className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={async (e) => {
                          e.stopPropagation()
                          const result = await deleteContactViaBouba(contact)
                          if (result.success) {
                            toast.success(result.output || 'Contact supprimé')
                          } else {
                            // Fallback to local delete if Bouba unavailable
                            deleteContact(contact.id)
                            toast.success('Contact supprimé')
                          }
                        }}
                        className="p-2 hover:bg-background rounded-xl text-muted hover:text-danger"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <button className="p-2 hover:bg-background rounded-xl text-muted">
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Contact Detail Panel */}
      <AnimatePresence>
        {selectedContactId && selectedContact && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="w-[420px] lg:w-[460px] border-l border-border bg-white shadow-2xl z-20 flex flex-col"
          >
            {/* Header */}
            <div className="p-5 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button onClick={() => selectContact(null)} className="p-1.5 hover:bg-background rounded-lg text-muted transition-colors">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <h3 className="font-display font-bold text-secondary">Détails du contact</h3>
              </div>
              <button onClick={() => selectContact(null)} className="p-2 hover:bg-background rounded-xl text-muted">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-border">
              {([
                { id: 'info', label: 'Informations', icon: User },
                { id: 'activity', label: 'Activité', icon: Clock },
                { id: 'history', label: 'Historique', icon: History },
              ] as { id: DetailTab; label: string; icon: any }[]).map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setDetailTab(tab.id)}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-bold transition-all border-b-2",
                    detailTab === tab.id
                      ? "border-primary text-primary"
                      : "border-transparent text-muted hover:text-secondary"
                  )}
                >
                  <tab.icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto">
              {/* INFO TAB */}
              {detailTab === 'info' && (
                <div className="p-6 space-y-6">
                  {/* Avatar + name */}
                  <div className="flex flex-col items-center text-center space-y-3">
                    <div className="w-20 h-20 rounded-3xl overflow-hidden bg-primary/10 shadow-xl">
                      {selectedContact.avatar ? (
                        <img src={selectedContact.avatar} alt={selectedContact.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-primary font-bold text-2xl">
                          {selectedContact.firstName?.[0]}{selectedContact.lastName?.[0]}
                        </div>
                      )}
                    </div>
                    <div>
                      <h2 className="text-xl font-display font-bold text-secondary">{selectedContact.name}</h2>
                      <p className="text-sm text-muted">{selectedContact.position} {selectedContact.company && `@ ${selectedContact.company}`}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setIsComposingEmail(true) }}
                        disabled={!selectedContact.email}
                        className="btn-primary px-4 py-2 flex items-center gap-2 text-sm disabled:opacity-40"
                      >
                        <Mail className="w-4 h-4" />
                        Email
                      </button>
                      <button disabled={!selectedContact.phone} className="p-2 border border-border rounded-xl hover:bg-background transition-colors text-muted disabled:opacity-40">
                        <Phone className="w-4 h-4" />
                      </button>
                      <button className="p-2 border border-border rounded-xl hover:bg-background transition-colors text-muted">
                        <Star className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Contact info */}
                  <div className="bg-background rounded-2xl p-4 border border-border space-y-3">
                    {selectedContact.email && (
                      <div className="flex items-center gap-3 text-sm">
                        <Mail className="w-4 h-4 text-primary shrink-0" />
                        <span className="text-secondary font-medium truncate">{selectedContact.email}</span>
                      </div>
                    )}
                    {selectedContact.phone && (
                      <div className="flex items-center gap-3 text-sm">
                        <Phone className="w-4 h-4 text-primary shrink-0" />
                        <span className="text-secondary font-medium">{selectedContact.phone}</span>
                      </div>
                    )}
                    {selectedContact.company && (
                      <div className="flex items-center gap-3 text-sm">
                        <Building2 className="w-4 h-4 text-primary shrink-0" />
                        <span className="text-secondary font-medium">{selectedContact.company}</span>
                      </div>
                    )}
                    {selectedContact.position && (
                      <div className="flex items-center gap-3 text-sm">
                        <Briefcase className="w-4 h-4 text-primary shrink-0" />
                        <span className="text-secondary font-medium">{selectedContact.position}</span>
                      </div>
                    )}
                  </div>

                  {/* Tags */}
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-bold text-muted uppercase tracking-widest px-1 flex items-center gap-2">
                      <Hash className="w-3 h-3" />
                      Tags
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedContact.tags.map(tag => (
                        <div key={tag} className="flex items-center gap-1.5 bg-primary/5 text-primary px-3 py-1 rounded-full text-xs font-bold border border-primary/10">
                          {tag}
                          <button
                            onClick={() => removeTag(selectedContact.id, tag)}
                            className="hover:text-danger transition-colors"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                      {showTagInput ? (
                        <div className="flex items-center gap-1">
                          <input
                            autoFocus
                            value={newTagInput}
                            onChange={(e) => setNewTagInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleAddTag()
                              if (e.key === 'Escape') { setShowTagInput(false); setNewTagInput('') }
                            }}
                            placeholder="Nouveau tag..."
                            className="text-xs bg-background border border-primary/30 rounded-full px-3 py-1 outline-none focus:border-primary w-28"
                          />
                          <button onClick={handleAddTag} className="p-0.5 text-green-500 hover:text-green-600">
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => { setShowTagInput(false); setNewTagInput('') }} className="p-0.5 text-muted hover:text-secondary">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setShowTagInput(true)}
                          className="p-1.5 border border-dashed border-border rounded-full text-muted hover:text-primary hover:border-primary transition-all"
                          title="Ajouter un tag"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Groups */}
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-bold text-muted uppercase tracking-widest px-1 flex items-center gap-2">
                      <Users className="w-3 h-3" />
                      Groupes
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {['Clients', 'Partenaires', 'VIP', 'Équipe'].map(group => {
                        const isIn = selectedContact.groups.includes(group)
                        return (
                          <button
                            key={group}
                            onClick={() => {
                              const newGroups = isIn
                                ? selectedContact.groups.filter(g => g !== group)
                                : [...selectedContact.groups, group]
                              updateContact(selectedContact.id, { groups: newGroups })
                            }}
                            className={cn(
                              "text-xs font-bold px-3 py-1 rounded-full border transition-all",
                              isIn
                                ? "bg-primary text-white border-primary"
                                : "bg-background border-border text-muted hover:border-primary hover:text-primary"
                            )}
                          >
                            {group}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-bold text-muted uppercase tracking-widest px-1 flex items-center gap-2">
                      <FileText className="w-3 h-3" />
                      Notes
                    </h4>
                    <textarea
                      value={selectedContact.notes}
                      onChange={(e) => updateContact(selectedContact.id, { notes: e.target.value })}
                      className="w-full bg-background border border-border rounded-2xl p-4 text-sm text-secondary min-h-[100px] focus:ring-2 focus:ring-primary/50 outline-none transition-all resize-none"
                      placeholder="Ajouter une note..."
                    />
                  </div>

                  {/* Compose email inline */}
                  <AnimatePresence>
                    {isComposingEmail && (
                      <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        className="bg-background rounded-2xl p-4 border border-border space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-bold text-secondary">Email à {selectedContact.name}</p>
                          <button onClick={() => setIsComposingEmail(false)} className="text-muted hover:text-secondary">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <input
                          value={emailSubject}
                          onChange={(e) => setEmailSubject(e.target.value)}
                          placeholder="Sujet..."
                          className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/50"
                        />
                        <textarea
                          value={emailBody}
                          onChange={(e) => setEmailBody(e.target.value)}
                          placeholder="Message..."
                          rows={4}
                          className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                        />
                        <button
                          onClick={handleSendEmail}
                          disabled={isSendingEmail || !emailSubject.trim()}
                          className="w-full btn-primary py-2 text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          <Send className="w-4 h-4" />
                          {isSendingEmail ? 'Envoi...' : 'Envoyer'}
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* ACTIVITY TAB */}
              {detailTab === 'activity' && (
                <div className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-muted uppercase tracking-widest">Activité récente</p>
                    <span className="text-[10px] text-muted">{timelineEvents.length} événement(s)</span>
                  </div>

                  {timelineEvents.length === 0 ? (
                    <div className="text-center py-8 text-muted">
                      <Clock className="w-10 h-10 opacity-20 mx-auto mb-3" />
                      <p className="text-sm font-semibold">Aucune activité avec {selectedContact.name}</p>
                      <p className="text-xs mt-1">Les emails et documents liés à ce contact apparaîtront ici</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {timelineEvents.slice(0, 6).map((ev, i) => (
                        <div key={i} className="flex gap-3 items-start">
                          <div className={cn(
                            'w-8 h-8 rounded-full flex items-center justify-center shrink-0',
                            ev.type === 'email'
                              ? ev.sent ? 'bg-blue-500/10 text-blue-500' : 'bg-indigo-500/10 text-indigo-500'
                              : 'bg-primary/10 text-primary'
                          )}>
                            {ev.type === 'email' ? <MessageSquare className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-secondary">{ev.sub}</p>
                            <p className="text-[10px] text-muted truncate">{ev.label}</p>
                            {ev.date && <p className="text-[10px] text-muted mt-0.5">{formatRelativeDate(ev.date)}</p>}
                          </div>
                        </div>
                      ))}

                      {selectedContact.lastInteraction && (
                        <div className="flex gap-3 items-start">
                          <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                            <Calendar className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-secondary">Dernière interaction</p>
                            <p className="text-[10px] text-muted">{formatRelativeDate(selectedContact.lastInteraction)}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {timelineEvents.length > 6 && (
                    <button
                      onClick={() => setDetailTab('history')}
                      className="w-full text-xs text-primary font-bold flex items-center justify-center gap-1.5 py-2 hover:underline"
                    >
                      Voir les {timelineEvents.length} événements
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              )}

              {/* HISTORY TAB */}
              {detailTab === 'history' && (
                <div className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-muted uppercase tracking-widest">Historique complet</p>
                    <span className="text-[10px] text-muted">{timelineEvents.length} événement(s)</span>
                  </div>

                  {timelineEvents.length === 0 ? (
                    <div className="text-center py-8 text-muted">
                      <History className="w-10 h-10 opacity-20 mx-auto mb-3" />
                      <p className="text-sm font-semibold">Aucun historique pour {selectedContact.name}</p>
                      <p className="text-xs mt-1">Les emails et documents liés à ce contact apparaîtront ici</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {timelineEvents.map((ev, i) => (
                        <div key={i} className="bg-background rounded-2xl p-3 border border-border hover:border-primary/30 transition-all space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            {ev.type === 'email' ? (
                              <span className={cn('text-[9px] font-black uppercase px-2 py-0.5 rounded-full', ev.sent ? 'bg-blue-100 text-blue-600' : 'bg-indigo-100 text-indigo-600')}>
                                {ev.sent ? 'Email envoyé' : 'Email reçu'}
                              </span>
                            ) : (
                              <span className={cn('text-[9px] font-black uppercase px-2 py-0.5 rounded-full',
                                ev.status === 'paid' ? 'bg-green-100 text-green-700' :
                                ev.status === 'sent' ? 'bg-blue-100 text-blue-700' :
                                ev.status === 'cancelled' ? 'bg-red-100 text-red-600' :
                                'bg-gray-100 text-gray-600'
                              )}>
                                Document · {ev.status === 'paid' ? 'Payé' : ev.status === 'sent' ? 'Envoyé' : ev.status === 'cancelled' ? 'Annulé' : 'Brouillon'}
                              </span>
                            )}
                            {ev.date && <span className="text-[10px] text-muted shrink-0">{formatRelativeDate(ev.date)}</span>}
                          </div>
                          <p className="text-xs font-bold text-secondary truncate">{ev.label}</p>
                          <p className="text-[10px] text-muted">{ev.sub}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Docs summary */}
                  {contactDocs.length > 0 && (
                    <div className="border-t border-border pt-4 space-y-2">
                      <p className="text-[10px] font-bold text-muted uppercase tracking-widest">{contactDocs.length} document(s) associé(s)</p>
                      <div className="grid grid-cols-2 gap-2">
                        {contactDocs.slice(0, 4).map(d => (
                          <div key={d.id} className="bg-background border border-border rounded-xl p-2.5 space-y-0.5">
                            <p className="text-[10px] font-bold text-secondary truncate">{d.number}</p>
                            <p className="text-[10px] text-muted">{d.totalTTC.toLocaleString('fr-FR')} — {d.status === 'paid' ? '✓ Payé' : d.status === 'sent' ? 'Envoyé' : 'Brouillon'}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Manual Add Modal */}
      <AnimatePresence>
        {isAddingManually && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-secondary/20 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-8 space-y-6"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-display font-bold text-secondary">Nouveau contact</h3>
                <button onClick={() => { setIsAddingManually(false); setEditForm({}) }} className="text-muted hover:text-secondary">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted uppercase px-1">Prénom *</label>
                    <input className="input-bouba py-2 text-sm" placeholder="Alice" value={editForm.firstName || ''} onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted uppercase px-1">Nom *</label>
                    <input className="input-bouba py-2 text-sm" placeholder="Martin" value={editForm.lastName || ''} onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted uppercase px-1">Email</label>
                  <input className="input-bouba py-2 text-sm" placeholder="alice@techcorp.com" value={editForm.email || ''} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted uppercase px-1">Téléphone</label>
                  <input className="input-bouba py-2 text-sm" placeholder="+33 6 12 34 56 78" value={editForm.phone || ''} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted uppercase px-1">Entreprise</label>
                    <input className="input-bouba py-2 text-sm" placeholder="TechCorp" value={editForm.company || ''} onChange={(e) => setEditForm({ ...editForm, company: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted uppercase px-1">Poste</label>
                    <input className="input-bouba py-2 text-sm" placeholder="Directeur" value={editForm.position || ''} onChange={(e) => setEditForm({ ...editForm, position: e.target.value })} />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => { setIsAddingManually(false); setEditForm({}) }}
                  className="flex-1 px-6 py-3 border border-border rounded-2xl font-bold text-muted hover:bg-background transition-all"
                >
                  Annuler
                </button>
                <button
                  onClick={() => {
                    if (editForm.firstName && editForm.lastName) {
                      addContact({
                        name: `${editForm.firstName} ${editForm.lastName}`,
                        firstName: editForm.firstName,
                        lastName: editForm.lastName,
                        email: editForm.email || '',
                        phone: editForm.phone || '',
                        company: editForm.company || '',
                        position: editForm.position || '',
                        tags: [],
                        notes: '',
                        groups: [],
                        avatar: `https://picsum.photos/seed/${editForm.firstName}${editForm.lastName}/200`
                      })
                      setIsAddingManually(false)
                      setEditForm({})
                      toast.success("Contact créé")
                    } else {
                      toast.error("Prénom et nom requis")
                    }
                  }}
                  className="flex-1 btn-primary py-3"
                >
                  Créer
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CSV Import Result Modal */}
      <AnimatePresence>
        {importResult && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setImportResult(null)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 16 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 16 }}
              className="bg-surface rounded-3xl shadow-2xl p-6 w-full max-w-sm space-y-4"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-secondary">Résultat import</h3>
                <button onClick={() => setImportResult(null)} className="p-1.5 hover:bg-background rounded-xl transition-colors">
                  <X className="w-4 h-4 text-muted" />
                </button>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-success/10 rounded-2xl">
                  <Check className="w-5 h-5 text-success shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-secondary">{importResult.imported} contact(s) importé(s)</p>
                  </div>
                </div>
                {importResult.skipped > 0 && (
                  <div className="flex items-center gap-3 p-3 bg-warning/10 rounded-2xl">
                    <AlertCircle className="w-5 h-5 text-warning shrink-0" />
                    <p className="text-sm font-medium text-secondary">{importResult.skipped} ligne(s) ignorée(s)</p>
                  </div>
                )}
                {importResult.errors.length > 0 && (
                  <div className="bg-background rounded-2xl p-3 max-h-32 overflow-y-auto space-y-1">
                    {importResult.errors.map((e, i) => (
                      <p key={i} className="text-[10px] text-muted font-mono">{e}</p>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={() => setImportResult(null)}
                className="btn-primary w-full py-2.5"
              >
                Fermer
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      </div>
    </div>
  )
}
