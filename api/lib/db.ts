import { Pool, PoolClient } from 'pg'
import dotenv from 'dotenv'
import path from 'path'

// Charger le fichier .env depuis la racine du projet
dotenv.config({ path: path.resolve(__dirname, '../../.env') })

// Configuration de la base de données PostgreSQL
const dbConfig = {
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'boubaia',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  max: 20, // Nombre max de clients dans le pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 30000, // Augmenté à 30s
  query_timeout: 60000, // 60s pour les queries
  statement_timeout: 60000 // 60s pour les statements
}

console.log('Database config:', {
  user: dbConfig.user,
  host: dbConfig.host,
  database: dbConfig.database,
  port: dbConfig.port,
  ssl: dbConfig.ssl ? 'enabled' : 'disabled'
})

// Pool de connexions PostgreSQL
export const pool = new Pool(dbConfig)

// Fonction utilitaire pour exécuter des requêtes
export async function query<T = any>(text: string, params?: any[]): Promise<T[]> {
  const client = await pool.connect()
  try {
    const result = await client.query(text, params)
    return result.rows
  } catch (error) {
    console.error('Database query error:', error)
    throw error
  } finally {
    client.release()
  }
}

// Fonction pour exécuter des requêtes avec une seule ligne de résultat attendu
export async function queryOne<T = any>(text: string, params?: any[]): Promise<T | null> {
  const results = await query<T>(text, params)
  return results.length > 0 ? results[0] : null
}

// Fonction pour exécuter des requêtes avec transaction
export async function transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const result = await callback(client)
    await client.query('COMMIT')
    return result
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('Transaction error:', error)
    throw error
  } finally {
    client.release()
  }
}

// Fonction pour tester la connexion
export async function testConnection(): Promise<boolean> {
  try {
    const result = await query('SELECT NOW() as current_time')
    console.log('✅ Database connected successfully at:', result[0]?.current_time)
    return true
  } catch (error) {
    console.error('❌ Database connection failed:', error)
    return false
  }
}

// Types utilitaires pour correspondre aux tables
export interface Role {
  id: string
  name: 'user' | 'admin' | 'superadmin'
  description?: string
  permissions: string[]
  created_at: Date
}

export interface User {
  id: string
  email: string
  email_verified: boolean
  name?: string
  image?: string
  provider: 'google' | 'email' | 'magic_link'
  provider_id?: string
  password_hash?: string
  role_id: string           // FK → public.roles.id
  role_name?: 'user' | 'admin' | 'superadmin'  // résolu par JOIN
  created_at: Date
  updated_at: Date
}

export interface Profile {
  id: string
  first_name?: string
  last_name?: string
  avatar_url?: string
  role: 'user' | 'admin' | 'superadmin'
  plan_id: string
  messages_used: number
  messages_limit: number
  subscription_status: 'active' | 'inactive' | 'cancelled' | 'past_due' | 'suspended' | 'pending'
  stripe_customer_id?: string
  google_access_token?: string
  google_refresh_token?: string
  google_token_expiry?: Date
  google_scopes: string[]
  preferences: Record<string, any>
  onboarding_complete: boolean
  onboarding_step: number
  last_active_at?: Date
  created_at: Date
  updated_at: Date
}

export interface Plan {
  id: string
  name: string
  description?: string
  price: number
  currency: string
  billing_interval: 'monthly' | 'yearly'
  trial_days: number
  agents_limit: number
  messages_limit: number
  features: any[]
  limits: Record<string, any>
  stripe_price_id?: string
  popular: boolean
  active: boolean
  created_at: Date
}

// Fermeture propre du pool de connexions
process.on('SIGINT', async () => {
  console.log('🔌 Closing database connections...')
  await pool.end()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  console.log('🔌 Closing database connections...')
  await pool.end()
  process.exit(0)
})