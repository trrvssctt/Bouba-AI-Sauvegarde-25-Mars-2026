import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type TransactionType = 'income' | 'expense'

export interface Transaction {
  id: string
  type: TransactionType
  amount: number
  category: string
  description: string
  date: string
  status: 'completed' | 'pending'
}

export interface FinancialGoal {
  type: 'revenue'
  target: number
  period: 'monthly'
}

const authHeaders = () => ({
  'Content-Type': 'application/json',
  ...(localStorage.getItem('auth_token')
    ? { Authorization: `Bearer ${localStorage.getItem('auth_token')}` }
    : {})
})

interface FinanceState {
  transactions: Transaction[]
  categories: string[]
  goal: FinancialGoal
  isLoading: boolean

  loadFromDB: () => Promise<void>
  addTransaction: (transaction: Omit<Transaction, 'id'>) => Promise<void>
  updateTransaction: (id: string, updates: Partial<Transaction>) => void
  deleteTransaction: (id: string) => Promise<void>
  setGoal: (goal: FinancialGoal) => Promise<void>
  addCategory: (category: string) => void

  getMonthlyStats: (month: number, year: number) => {
    income: number
    expenses: number
    profit: number
  }
}

export const useFinanceStore = create<FinanceState>()(
  persist(
    (set, get) => ({
      transactions: [],
      categories: ['Prestation Web', 'Consulting', 'Logiciels', 'Marketing', 'Services', 'Loyer', 'Déplacement'],
      goal: { type: 'revenue', target: 6000, period: 'monthly' },
      isLoading: false,

      loadFromDB: async () => {
        set({ isLoading: true })
        try {
          const [txRes, catRes, goalRes] = await Promise.all([
            fetch('/api/finance/transactions', { headers: authHeaders() }),
            fetch('/api/finance/categories', { headers: authHeaders() }),
            fetch('/api/finance/goals', { headers: authHeaders() }),
          ])

          if (txRes.ok) {
            const txData = await txRes.json()
            if (txData.success) {
              const transactions: Transaction[] = (txData.data || []).map((t: any) => ({
                id: t.id,
                type: t.type as TransactionType,
                amount: parseFloat(t.amount),
                category: t.category || 'Autre',
                description: t.description || '',
                date: t.date,
                status: t.status as 'completed' | 'pending',
              }))
              set({ transactions })
            }
          }

          if (catRes.ok) {
            const catData = await catRes.json()
            if (catData.success && catData.data?.length > 0) {
              const categories = catData.data.map((c: any) => c.name)
              set((state) => ({ categories: [...new Set([...state.categories, ...categories])] }))
            }
          }

          if (goalRes.ok) {
            const goalData = await goalRes.json()
            if (goalData.success && goalData.data?.length > 0) {
              const g = goalData.data[0]
              set({ goal: { type: 'revenue', target: parseFloat(g.target), period: 'monthly' } })
            }
          }
        } catch (err) {
          console.error('[FINANCE] loadFromDB error:', err)
        } finally {
          set({ isLoading: false })
        }
      },

      addTransaction: async (transaction) => {
        const tempId = 'temp-' + Date.now()
        // Optimistic
        set((state) => ({
          transactions: [{ ...transaction, id: tempId }, ...state.transactions]
        }))
        try {
          const res = await fetch('/api/finance/transactions', {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({
              type: transaction.type,
              amount: transaction.amount,
              category: transaction.category,
              description: transaction.description,
              date: transaction.date,
              status: transaction.status,
            })
          })
          const data = await res.json()
          if (data.success && data.data?.id) {
            set((state) => ({
              transactions: state.transactions.map(t =>
                t.id === tempId ? { ...transaction, id: data.data.id } : t
              )
            }))
          }
        } catch (err) {
          console.error('[FINANCE] addTransaction API error:', err)
        }
      },

      updateTransaction: (id, updates) => set((state) => ({
        transactions: state.transactions.map(t => t.id === id ? { ...t, ...updates } : t)
      })),

      deleteTransaction: async (id) => {
        set((state) => ({ transactions: state.transactions.filter(t => t.id !== id) }))
        try {
          await fetch(`/api/finance/transactions/${id}`, { method: 'DELETE', headers: authHeaders() })
        } catch (err) {
          console.error('[FINANCE] deleteTransaction API error:', err)
        }
      },

      setGoal: async (goal) => {
        set({ goal })
        try {
          await fetch('/api/finance/goals', {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({ type: goal.type, target: goal.target, period: goal.period })
          })
        } catch (err) {
          console.error('[FINANCE] setGoal API error:', err)
        }
      },

      addCategory: (category) => set((state) => ({
        categories: [...new Set([...state.categories, category])]
      })),

      getMonthlyStats: (month, year) => {
        const filtered = get().transactions.filter(t => {
          const d = new Date(t.date)
          return d.getMonth() === month && d.getFullYear() === year
        })
        const income = filtered.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0)
        const expenses = filtered.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0)
        return { income, expenses, profit: income - expenses }
      }
    }),
    { name: 'bouba-finance-storage-v2' }
  )
)
