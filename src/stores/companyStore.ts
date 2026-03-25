import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface CompanyInfo {
  name: string
  logo: string        // base64 data URL or empty
  address: string
  city: string
  postalCode: string
  country: string
  phone: string
  email: string
  website: string
  siret: string
  vat: string         // N° TVA intracommunautaire
  legalForm: string   // SAS, SARL, Auto-entrepreneur, etc.
  iban: string
  bankName: string
}

const DEFAULT_COMPANY: CompanyInfo = {
  name: '',
  logo: '',
  address: '',
  city: '',
  postalCode: '',
  country: 'France',
  phone: '',
  email: '',
  website: '',
  siret: '',
  vat: '',
  legalForm: '',
  iban: '',
  bankName: '',
}

interface CompanyStore {
  company: CompanyInfo
  setCompany: (info: Partial<CompanyInfo>) => void
  resetCompany: () => void
}

export const useCompanyStore = create<CompanyStore>()(
  persist(
    (set) => ({
      company: DEFAULT_COMPANY,
      setCompany: (info) =>
        set((state) => ({ company: { ...state.company, ...info } })),
      resetCompany: () => set({ company: DEFAULT_COMPANY }),
    }),
    { name: 'bouba-company-storage-v1' }
  )
)
