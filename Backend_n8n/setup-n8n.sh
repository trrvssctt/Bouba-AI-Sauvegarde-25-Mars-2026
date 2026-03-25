#!/bin/bash

# Script de vérification et configuration N8N pour Bouba'ia
# Usage: ./setup-n8n.sh

set -e

echo "🚀 Configuration N8N pour Bouba'ia - Vérification des Prérequis"
echo "================================================================"

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'  
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Variables
N8N_URL=${N8N_URL:-"http://localhost:5678"}
API_TEST_TIMEOUT=30

# Fonction de vérification URL
check_url() {
    local url=$1
    local name=$2
    
    if curl -sSf "$url" > /dev/null 2>&1; then
        echo -e "✅ ${GREEN}$name accessible${NC}"
        return 0
    else
        echo -e "❌ ${RED}$name non accessible: $url${NC}"
        return 1
    fi
}

# Fonction de test API
test_api() {
    local url=$1
    local data=$2
    local expected=$3
    local name=$4
    
    echo -n "🧪 Test $name... "
    
    response=$(curl -s -X POST "$url" \
        -H "Content-Type: application/json" \
        -d "$data" \
        --connect-timeout $API_TEST_TIMEOUT || echo "ERROR")
        
    if [[ "$response" == *"$expected"* ]]; then
        echo -e "${GREEN}OK${NC}"
        return 0
    else
        echo -e "${RED}FAILED${NC}"
        echo "Response: $response"
        return 1
    fi
}

echo ""
echo "📋 ÉTAPE 1: Vérification de l'environnement"
echo "=============================================="

# Vérifier les outils requis
tools=("curl" "jq" "node" "npm")
for tool in "${tools[@]}"; do
    if command -v "$tool" >/dev/null 2>&1; then
        echo -e "✅ ${GREEN}$tool installé${NC}"
    else
        echo -e "❌ ${RED}$tool manquant${NC}"
        exit 1
    fi
done

echo ""
echo "🔗 ÉTAPE 2: Vérification des URLs et services"
echo "============================================="

# Vérifier N8N
check_url "$N8N_URL" "N8N Interface" || {
    echo -e "${YELLOW}⚠️  N8N non accessible. Vérifiez que N8N est démarré sur $N8N_URL${NC}"
    echo "Pour démarrer N8N:"
    echo "  docker-compose up -d  # ou"
    echo "  n8n start"
    exit 1
}

# Vérifier les APIs externes
apis=(
    "https://api.openai.com/v1/models:OpenAI API"
    "https://api.airtable.com/v0/meta/bases:Airtable API"  
    "https://www.googleapis.com/calendar/v3/users/me/calendarList:Google Calendar API"
    "https://api.tavily.com/search:Tavily API"
)

for api_info in "${apis[@]}"; do
    IFS=':' read -r url name <<< "$api_info"
    check_url "$url" "$name" || echo -e "${YELLOW}⚠️  $name pourrait ne pas être accessible (normal si pas configuré)${NC}"
done

echo ""
echo "🔐 ÉTAPE 3: Vérification des Variables d'Environnement"
echo "====================================================="

required_vars=(
    "OPENAI_API_KEY"
    "SUPABASE_URL" 
    "SUPABASE_ANON_KEY"
    "STRIPE_PUBLISHABLE_KEY"
)

optional_vars=(
    "AIRTABLE_API_KEY"
    "GOOGLE_CLIENT_ID"
    "GOOGLE_CLIENT_SECRET"  
    "TAVILY_API_KEY"
    "N8N_ENCRYPTION_KEY"
)

missing_required=0
for var in "${required_vars[@]}"; do
    if [[ -z "${!var}" ]]; then
        echo -e "❌ ${RED}$var manquant (OBLIGATOIRE)${NC}"
        missing_required=$((missing_required + 1))
    else
        echo -e "✅ ${GREEN}$var configuré${NC}"
    fi
done

for var in "${optional_vars[@]}"; do
    if [[ -z "${!var}" ]]; then
        echo -e "⚠️  ${YELLOW}$var manquant (optionnel)${NC}"
    else
        echo -e "✅ ${GREEN}$var configuré${NC}"
    fi
done

if [[ $missing_required -gt 0 ]]; then
    echo -e "${RED}❌ Variables obligatoires manquantes. Consultez .env.example${NC}"
    exit 1
fi

echo ""
echo "🧪 ÉTAPE 4: Tests des Workflows N8N"
echo "====================================="

# Test webhook principal (si configuré)
WEBHOOK_URL="$N8N_URL/webhook/7f338448-11b5-458c-ada3-f009feccc184"
test_data='{"message":"test de connexion","user_id":"test-setup","source":"setup-script"}'

echo "🎯 Test du webhook principal..."
if test_api "$WEBHOOK_URL" "$test_data" "success" "Webhook Principal"; then
    echo -e "✅ ${GREEN}Workflow principal fonctionnel${NC}"
else
    echo -e "⚠️  ${YELLOW}Workflow principal non configuré ou non fonctionnel${NC}"
    echo "   Vérifiez que le workflow workflows.json est importé dans N8N"
fi

echo ""
echo "📊 ÉTAPE 5: Validation Configuration Supabase"
echo "=============================================="

if [[ -n "$SUPABASE_URL" ]]; then
    # Test connexion Supabase
    supabase_health="$SUPABASE_URL/rest/v1/"
    if check_url "$supabase_health" "Supabase Rest API"; then
        echo -e "✅ ${GREEN}Supabase accessible${NC}"
        
        # Test des tables essentielles
        tables=("profiles" "plans" "subscriptions" "payments")
        for table in "${tables[@]}"; do
            table_url="$SUPABASE_URL/rest/v1/$table?select=*&limit=1"
            if curl -s -H "apikey: $SUPABASE_ANON_KEY" "$table_url" | jq . >/dev/null 2>&1; then
                echo -e "✅ ${GREEN}Table $table accessible${NC}"
            else
                echo -e "❌ ${RED}Table $table inaccessible${NC}"
            fi
        done
    fi
fi

echo ""
echo "🎨 ÉTAPE 6: Vérification Frontend"  
echo "================================="

if [[ -f "package.json" ]]; then
    echo "📦 Vérification des dépendances frontend..."
    
    if npm list --depth=0 >/dev/null 2>&1; then
        echo -e "✅ ${GREEN}Dépendances installées${NC}"
    else
        echo -e "⚠️  ${YELLOW}Certaines dépendances manquent${NC}"
        echo "   Exécuter: npm install"
    fi
    
    # Vérifier si le serveur de dev est démarré
    if check_url "http://localhost:5173" "Frontend Dev Server" 2>/dev/null; then
        echo -e "✅ ${GREEN}Frontend accessible sur http://localhost:5173${NC}"
    else  
        echo -e "ℹ️  Frontend non démarré. Pour démarrer: npm run dev"
    fi
fi

echo ""
echo "📋 RÉSUMÉ DE LA CONFIGURATION"
echo "=============================="

echo "🏗️  Infrastructure:"
echo "   ├── N8N: $(check_url "$N8N_URL" "N8N" >/dev/null 2>&1 && echo "✅ OK" || echo "❌ KO")"
echo "   ├── Supabase: $(check_url "$SUPABASE_URL" "Supabase" >/dev/null 2>&1 && echo "✅ OK" || echo "❌ KO")" 
echo "   └── Frontend: $(check_url "http://localhost:5173" "Frontend" >/dev/null 2>&1 && echo "✅ OK" || echo "ℹ️  Non démarré")"

echo ""
echo "🔑 APIs configurées:"
echo "   ├── OpenAI: $([[ -n "$OPENAI_API_KEY" ]] && echo "✅ OK" || echo "❌ KO")"
echo "   ├── Stripe: $([[ -n "$STRIPE_PUBLISHABLE_KEY" ]] && echo "✅ OK" || echo "❌ KO")"
echo "   ├── Airtable: $([[ -n "$AIRTABLE_API_KEY" ]] && echo "✅ OK" || echo "⚠️  Optionnel")"
echo "   └── Google: $([[ -n "$GOOGLE_CLIENT_ID" ]] && echo "✅ OK" || echo "⚠️  Optionnel")"

echo ""
if [[ $missing_required -eq 0 ]]; then
    echo -e "🎉 ${GREEN}Configuration prête ! Vous pouvez démarrer Bouba'ia${NC}"
    echo ""
    echo "📝 Prochaines étapes:"
    echo "   1. Importer workflows.json dans N8N ($N8N_URL)"
    echo "   2. Configurer les credentials dans N8N"  
    echo "   3. Tester chaque agent individuellement"
    echo "   4. Démarrer le frontend: npm run dev"
    echo ""
    echo "📚 Documentation: Backend_n8n/GUIDE-DEPLOIEMENT-COMPLET.md"
else
    echo -e "⚠️  ${YELLOW}Configuration incomplète. Consultez les erreurs ci-dessus.${NC}"
    exit 1
fi