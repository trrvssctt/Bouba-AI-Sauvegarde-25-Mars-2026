"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pool = void 0;
exports.query = query;
exports.queryOne = queryOne;
exports.transaction = transaction;
exports.testConnection = testConnection;
const pg_1 = require("pg");
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
// Charger le fichier .env depuis la racine du projet
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../../.env') });
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
};
console.log('Database config:', {
    user: dbConfig.user,
    host: dbConfig.host,
    database: dbConfig.database,
    port: dbConfig.port,
    ssl: dbConfig.ssl ? 'enabled' : 'disabled'
});
// Pool de connexions PostgreSQL
exports.pool = new pg_1.Pool(dbConfig);
// Fonction utilitaire pour exécuter des requêtes
async function query(text, params) {
    const client = await exports.pool.connect();
    try {
        const result = await client.query(text, params);
        return result.rows;
    }
    catch (error) {
        console.error('Database query error:', error);
        throw error;
    }
    finally {
        client.release();
    }
}
// Fonction pour exécuter des requêtes avec une seule ligne de résultat attendu
async function queryOne(text, params) {
    const results = await query(text, params);
    return results.length > 0 ? results[0] : null;
}
// Fonction pour exécuter des requêtes avec transaction
async function transaction(callback) {
    const client = await exports.pool.connect();
    try {
        await client.query('BEGIN');
        const result = await callback(client);
        await client.query('COMMIT');
        return result;
    }
    catch (error) {
        await client.query('ROLLBACK');
        console.error('Transaction error:', error);
        throw error;
    }
    finally {
        client.release();
    }
}
// Fonction pour tester la connexion
async function testConnection() {
    try {
        const result = await query('SELECT NOW() as current_time');
        console.log('✅ Database connected successfully at:', result[0]?.current_time);
        return true;
    }
    catch (error) {
        console.error('❌ Database connection failed:', error);
        return false;
    }
}
// Fermeture propre du pool de connexions
process.on('SIGINT', async () => {
    console.log('🔌 Closing database connections...');
    await exports.pool.end();
    process.exit(0);
});
process.on('SIGTERM', async () => {
    console.log('🔌 Closing database connections...');
    await exports.pool.end();
    process.exit(0);
});
//# sourceMappingURL=db.js.map