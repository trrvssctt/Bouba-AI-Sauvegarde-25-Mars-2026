"use strict";
// Migration de Supabase vers PostgreSQL standalone
// Ce fichier maintient la compatibilité avec l'ancien code
// mais utilise maintenant PostgreSQL directement via api/lib/db.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.supabase = exports.db = void 0;
const db_1 = require("./db");
// Helper pour simuler les réponses Supabase avec PostgreSQL
exports.db = {
    // Équivalent de supabase.from(table).select().eq(column, value).single()
    async from(table) {
        return {
            select: (columns = '*') => ({
                eq: (column, value) => ({
                    single: async () => {
                        try {
                            const result = await (0, db_1.queryOne)(`SELECT ${columns} FROM ${table} WHERE ${column} = $1`, [value]);
                            return { data: result, error: null };
                        }
                        catch (error) {
                            return { data: null, error: { message: error.message } };
                        }
                    },
                    // Pour les requêtes multiples
                    async execute() {
                        try {
                            const result = await (0, db_1.query)(`SELECT ${columns} FROM ${table} WHERE ${column} = $1`, [value]);
                            return { data: result, error: null };
                        }
                        catch (error) {
                            return { data: null, error: { message: error.message } };
                        }
                    }
                }),
                // Méthodes de base sans condition
                async execute() {
                    try {
                        const result = await (0, db_1.query)(`SELECT ${columns} FROM ${table}`);
                        return { data: result, error: null };
                    }
                    catch (error) {
                        return { data: null, error: { message: error.message } };
                    }
                }
            }),
            // Équivalent de supabase.from(table).insert(data)
            insert: (data) => ({
                select: (columns = '*') => ({
                    async execute() {
                        try {
                            if (Array.isArray(data)) {
                                // Insert multiple
                                const keys = Object.keys(data[0]);
                                const placeholders = data.map((_, rowIndex) => `(${keys.map((_, colIndex) => `$${rowIndex * keys.length + colIndex + 1}`).join(', ')})`).join(', ');
                                const values = data.flatMap(row => keys.map(key => row[key]));
                                const result = await (0, db_1.query)(`INSERT INTO ${table} (${keys.join(', ')}) VALUES ${placeholders} RETURNING ${columns}`, values);
                                return { data: result, error: null };
                            }
                            else {
                                // Insert single
                                const keys = Object.keys(data);
                                const values = Object.values(data);
                                const placeholders = keys.map((_, index) => `$${index + 1}`).join(', ');
                                const result = await (0, db_1.query)(`INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders}) RETURNING ${columns}`, values);
                                return { data: result, error: null };
                            }
                        }
                        catch (error) {
                            return { data: null, error: { message: error.message } };
                        }
                    }
                }),
                async execute() {
                    return this.select('*').execute();
                }
            }),
            // Équivalent de supabase.from(table).update(data).eq(column, value)
            update: (data) => ({
                eq: (column, value) => ({
                    select: (columns = '*') => ({
                        async execute() {
                            try {
                                const keys = Object.keys(data);
                                const setClause = keys.map((key, index) => `${key} = $${index + 1}`).join(', ');
                                const values = [...Object.values(data), value];
                                const result = await (0, db_1.query)(`UPDATE ${table} SET ${setClause} WHERE ${column} = $${keys.length + 1} RETURNING ${columns}`, values);
                                return { data: result, error: null };
                            }
                            catch (error) {
                                return { data: null, error: { message: error.message } };
                            }
                        }
                    })
                })
            }),
            // Équivalent de supabase.from(table).delete().eq(column, value)
            delete: () => ({
                eq: (column, value) => ({
                    async execute() {
                        try {
                            const result = await (0, db_1.query)(`DELETE FROM ${table} WHERE ${column} = $1 RETURNING *`, [value]);
                            return { data: result, error: null };
                        }
                        catch (error) {
                            return { data: null, error: { message: error.message } };
                        }
                    }
                })
            })
        };
    }
};
// Maintien la compatibilité pour l'ancien code qui importe { supabase }
exports.supabase = exports.db;
exports.default = exports.db;
//# sourceMappingURL=supabase.js.map