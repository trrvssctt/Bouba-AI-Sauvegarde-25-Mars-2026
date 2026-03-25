import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface FinancialReport {
  id: string
  month: number        // 0–11
  year: number
  content: string      // AI narrative
  stats: {
    income: number
    expenses: number
    profit: number
    transactionCount: number
  }
  createdAt: string
  sentAt?: string
}

interface ReportStore {
  reports: FinancialReport[]
  addReport: (r: Omit<FinancialReport, 'id' | 'createdAt'>) => FinancialReport
  markSent: (id: string, sentAt: string) => void
  deleteReport: (id: string) => void
}

export const useReportStore = create<ReportStore>()(
  persist(
    (set) => ({
      reports: [],

      addReport: (r) => {
        const report: FinancialReport = {
          ...r,
          id: `report-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          createdAt: new Date().toISOString(),
        }
        set((state) => ({ reports: [report, ...state.reports] }))
        return report
      },

      markSent: (id, sentAt) =>
        set((state) => ({
          reports: state.reports.map((r) => (r.id === id ? { ...r, sentAt } : r)),
        })),

      deleteReport: (id) =>
        set((state) => ({ reports: state.reports.filter((r) => r.id !== id) })),
    }),
    { name: 'bouba-reports-v1' }
  )
)
