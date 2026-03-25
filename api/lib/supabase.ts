// Migration de Supabase vers PostgreSQL standalone
// Ce fichier maintient la compatibilité avec l'ancien code
// mais utilise maintenant PostgreSQL directement via api/lib/db.ts

import { query, queryOne, transaction, pool } from './db';

// Helper pour simuler les réponses Supabase avec PostgreSQL
export const db = {
  // Équivalent de supabase.from(table).select().eq(column, value).single()
  async from(table: string) {
    return {
      select: (columns = '*') => ({
        eq: (column: string, value: any) => ({
          single: async () => {
            try {
              const result = await queryOne(`SELECT ${columns} FROM ${table} WHERE ${column} = $1`, [value]);
              return { data: result, error: null };
            } catch (error: any) {
              return { data: null, error: { message: error.message } };
            }
          },
          // Pour les requêtes multiples
          async execute() {
            try {
              const result = await query(`SELECT ${columns} FROM ${table} WHERE ${column} = $1`, [value]);
              return { data: result, error: null };
            } catch (error: any) {
              return { data: null, error: { message: error.message } };
            }
          }
        }),
        // Méthodes de base sans condition
        async execute() {
          try {
            const result = await query(`SELECT ${columns} FROM ${table}`);
            return { data: result, error: null };
          } catch (error: any) {
            return { data: null, error: { message: error.message } };
          }
        }
      }),
      
      // Équivalent de supabase.from(table).insert(data)
      insert: (data: any | any[]) => ({
        select: (columns = '*') => ({
          async execute() {
            try {
              if (Array.isArray(data)) {
                // Insert multiple
                const keys = Object.keys(data[0]);
                const placeholders = data.map((_, rowIndex) => 
                  `(${keys.map((_, colIndex) => `$${rowIndex * keys.length + colIndex + 1}`).join(', ')})`
                ).join(', ');
                const values = data.flatMap(row => keys.map(key => row[key]));
                const result = await query(
                  `INSERT INTO ${table} (${keys.join(', ')}) VALUES ${placeholders} RETURNING ${columns}`,
                  values
                );
                return { data: result, error: null };
              } else {
                // Insert single
                const keys = Object.keys(data);
                const values = Object.values(data);
                const placeholders = keys.map((_, index) => `$${index + 1}`).join(', ');
                const result = await query(
                  `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders}) RETURNING ${columns}`,
                  values
                );
                return { data: result, error: null };
              }
            } catch (error: any) {
              return { data: null, error: { message: error.message } };
            }
          }
        }),
        async execute() {
          return this.select('*').execute();
        }
      }),

      // Équivalent de supabase.from(table).update(data).eq(column, value)
      update: (data: any) => ({
        eq: (column: string, value: any) => ({
          select: (columns = '*') => ({
            async execute() {
              try {
                const keys = Object.keys(data);
                const setClause = keys.map((key, index) => `${key} = $${index + 1}`).join(', ');
                const values = [...Object.values(data), value];
                const result = await query(
                  `UPDATE ${table} SET ${setClause} WHERE ${column} = $${keys.length + 1} RETURNING ${columns}`,
                  values
                );
                return { data: result, error: null };
              } catch (error: any) {
                return { data: null, error: { message: error.message } };
              }
            }
          })
        })
      }),

      // Équivalent de supabase.from(table).delete().eq(column, value)
      delete: () => ({
        eq: (column: string, value: any) => ({
          async execute() {
            try {
              const result = await query(`DELETE FROM ${table} WHERE ${column} = $1 RETURNING *`, [value]);
              return { data: result, error: null };
            } catch (error: any) {
              return { data: null, error: { message: error.message } };
            }
          }
        })
      })
    };
  }
};

// Maintien la compatibilité pour l'ancien code qui importe { supabase }
export const supabase = db;
export default db;