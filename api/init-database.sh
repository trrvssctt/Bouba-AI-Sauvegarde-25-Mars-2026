#!/bin/bash

echo "🔧 Initialisation de la base de données Bouba'IA"

# Variables (à modifier selon ta configuration)
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}
DB_NAME=${DB_NAME:-boubaia}
DB_USER=${DB_USER:-postgres}
DB_PASSWORD=${DB_PASSWORD:-ton_mot_de_passe}

echo "📊 Configuration:"
echo "  Host: $DB_HOST"
echo "  Port: $DB_PORT"
echo "  Database: $DB_NAME"
echo "  User: $DB_USER"

# Vérifier si psql est installé
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL client (psql) n'est pas installé"
    echo "📦 Installation:"
    echo "  Ubuntu/Debian: sudo apt-get install postgresql-client"
    echo "  macOS: brew install postgresql"
    echo "  Windows: télécharger depuis https://www.postgresql.org/download/"
    exit 1
fi

# Tester la connexion
echo "🔍 Test de connexion à PostgreSQL..."
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d postgres -c "SELECT version();" > /dev/null 2>&1

if [ $? -ne 0 ]; then
    echo "❌ Impossible de se connecter à PostgreSQL"
    echo "🔧 Vérifie:"
    echo "  1. PostgreSQL est-il en cours d'exécution ?"
    echo "  2. Les credentials sont-ils corrects ?"
    echo "  3. L'utilisateur a-t-il les permissions ?"
    exit 1
fi

echo "✅ Connecté à PostgreSQL"

# Créer la base de données si elle n'existe pas
echo "📁 Création de la base de données '$DB_NAME'..."
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d postgres -c "CREATE DATABASE $DB_NAME;" 2>/dev/null
if [ $? -eq 0 ]; then
    echo "✅ Base de données créée"
else
    echo "ℹ️  Base de données existe déjà"
fi

# Exécuter le schéma SQL
echo "📋 Exécution du schéma SQL..."
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f database-schema.sql

if [ $? -eq 0 ]; then
    echo "✅ Schéma SQL exécuté avec succès"
    
    # Vérifier les tables créées
    echo "📊 Tables créées:"
    PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    "
    
    # Compter les enregistrements
    echo "\n📈 Données initiales:"
    PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "
      SELECT 'plans' as table, COUNT(*) as count FROM plans
      UNION ALL
      SELECT 'users' as table, COUNT(*) as count FROM users
      UNION ALL
      SELECT 'profiles' as table, COUNT(*) as count FROM profiles
      UNION ALL
      SELECT 'admin_settings' as table, COUNT(*) as count FROM admin_settings;
    "
    
    echo "\n🎉 Base de données initialisée avec succès !"
    echo "🔗 URL admin: http://144.91.96.142:5173/admin"
    echo "👤 Admin: admin@bouba.ai / admin"
    
else
    echo "❌ Erreur lors de l'exécution du schéma SQL"
    exit 1
fi

# Créer un fichier .env d'exemple
echo "\n📄 Création du fichier .env.example..."
cat > .env.example << EOF
# Configuration PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_NAME=boubaia
DB_USER=postgres
DB_PASSWORD=ton_mot_de_passe
DB_SSL=false

# Configuration admin
ADMIN_EMAIL=admin@bouba.ai
ADMIN_PASSWORD=admin

# Configuration Wave (optionnel)
WAVE_API_KEY=ton_api_key_wave
WAVE_API_SECRET=ton_api_secret_wave

# Configuration email (optionnel)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=contact@bouba.ai
EMAIL_PASSWORD=ton_mot_de_passe_email
EOF

echo "✅ Fichier .env.example créé"
echo "\n📝 Étapes suivantes:"
echo "  1. Modifie les credentials dans server-admin-postgres.js"
echo "  2. Démarre le backend: node server-admin-postgres.js"
echo "  3. Accède à l'admin: http://144.91.96.142:5173/admin"
echo "  4. Connecte-toi avec: admin@bouba.ai / admin"