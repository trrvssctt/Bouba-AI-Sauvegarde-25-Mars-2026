export interface User {
  id: string
  email: string
  firstName?: string
  lastName?: string
  avatarUrl?: string
  plan: 'starter' | 'pro' | 'enterprise'
  messagesUsed: number
  messagesLimit: number
}

export interface Email {
  id: string
  from: string
  fromEmail: string
  to: string
  subject: string
  body: string
  date: string
  fullDate: string
  read: boolean
  labels: string[]
  starred?: boolean
}

export interface CalendarEvent {
  id: string
  title: string
  start: string
  end: string
  location?: string
  description?: string
  category: 'work' | 'personal' | 'meeting' | 'urgent'
}

export interface Contact {
  id: string
  firstName: string
  lastName: string
  email: string
  phone?: string
  company?: string
  title?: string
  tags: string[]
}

export interface Transaction {
  id: string
  date: string
  amount: number
  type: 'income' | 'expense'
  category: string
  description: string
}

// ─── Admin types ────────────────────────────────────────────────────────────

export interface AdminUser {
  id: string
  email: string
  firstName?: string
  lastName?: string
  plan: 'starter' | 'pro' | 'enterprise'
  status: 'active' | 'suspended' | 'pending'
  messagesUsed: number
  messagesLimit: number
  tokensUsed: number
  estimatedCost: number
  createdAt: string
  lastLogin?: string
  stripeCustomerId?: string
  role?: string
}

export interface AdminFeatureFlag {
  id: string
  key: string
  name: string
  description: string
  enabled: boolean
  enabledForPlans: ('starter' | 'pro' | 'enterprise')[]
  createdAt: string
}

export interface AdminSupportTicket {
  id: string
  userId: string
  userName: string
  userEmail: string
  subject: string
  body: string
  status: 'open' | 'in_progress' | 'resolved'
  createdAt: string
}

export interface AdminFeedback {
  id: string
  userId: string
  userName: string
  originalMessage: string
  boubaResponse: string
  rating: 'negative' | 'positive'
  note?: string
  createdAt: string
}

export interface AdminBillingRecord {
  id: string
  userId: string
  userName: string
  userEmail: string
  plan: 'starter' | 'pro' | 'enterprise'
  amount: number
  status: 'paid' | 'failed' | 'pending'
  failedAttempts?: number
  date: string
}

export interface AdminLog {
  id: string
  userId: string
  agent: 'email' | 'calendar' | 'contacts' | 'finance' | 'general' | 'admin'
  status: 'success' | 'error'
  duration: number
  createdAt: string
  error?: string
}
