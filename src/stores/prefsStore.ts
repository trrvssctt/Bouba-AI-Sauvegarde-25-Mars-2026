import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Currency = 'EUR' | 'USD' | 'XOF'

export const CURRENCY_OPTIONS: { value: Currency; label: string; symbol: string }[] = [
  { value: 'EUR', label: 'Euro (€)',       symbol: '€' },
  { value: 'USD', label: 'Dollar US ($)',  symbol: '$' },
  { value: 'XOF', label: 'Franc CFA (FCFA)', symbol: 'FCFA' },
]

interface PrefsState {
  currency: Currency
  setCurrency: (currency: Currency) => void
}

export const usePrefsStore = create<PrefsState>()(
  persist(
    (set) => ({
      currency: 'EUR',
      setCurrency: (currency) => set({ currency }),
    }),
    { name: 'bouba-prefs-v1' }
  )
)
