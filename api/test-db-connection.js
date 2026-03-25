const { Client } = require('pg')
require('dotenv').config({ path: '../.env' })

const client = new Client({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  connectionTimeoutMillis: 10000
})

console.log('Testing connection with config:')
console.log({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  ssl: process.env.DB_SSL === 'true'
})

client.connect()
  .then(() => {
    console.log('✅ Connected to PostgreSQL successfully!')
    return client.query('SELECT version()')
  })
  .then(result => {
    console.log('✅ Database version:', result.rows[0].version)
    return client.query('SELECT COUNT(*) FROM plans')
  })
  .then(result => {
    console.log('✅ Plans table contains', result.rows[0].count, 'rows')
    client.end()
  })
  .catch(err => {
    console.error('❌ Connection failed:', err.message)
    console.error('Error details:', err)
    client.end()
  })