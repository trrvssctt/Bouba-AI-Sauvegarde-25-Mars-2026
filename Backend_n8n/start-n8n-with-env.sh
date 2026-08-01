#!/bin/bash
# Script pour démarrer n8n avec les variables d'environnement Bouba'IA

echo "🚀 Démarrage de n8n pour Bouba'IA..."
echo "======================================"

# Charger les variables d'environnement
if [ -f .env ]; then
    echo "📋 Chargement des variables depuis .env"
    export $(grep -v '^#' .env | xargs)
else
    echo "⚠️  Fichier .env non trouvé. Utilisation des variables système."
    echo "   Créez un fichier .env basé sur .env-n8n-example"
fi

# Variables requises
REQUIRED_VARS=("OPENAI_API_KEY" "SUPABASE_URL" "SUPABASE_ANON_KEY")

for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        echo "❌ Variable requise manquante: $var"
        echo "   Ajoutez-la dans le fichier .env"
        exit 1
    fi
done

echo "✅ Toutes les variables requises sont présentes"
echo "🔗 n8n sera accessible sur: http://144.91.96.142:5678"
echo "🔗 Interface web: http://144.91.96.142:5678"
echo ""

# Démarrer n8n
echo "🔄 Démarrage de n8n..."
n8n start