#!/bin/bash

# Script de test automatisé pour tous les agents Bouba'ia N8N
# Usage: ./test-agents.sh [webhook_url]

set -e

# Configuration
WEBHOOK_URL=${1:-"http://localhost:5678/webhook/7f338448-11b5-458c-ada3-f009feccc184"}
TEST_USER_ID="test-$(date +%s)"
TIMEOUT=30
RESULTS_FILE="test_results_$(date +%Y%m%d_%H%M%S).json"

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "🧪 Test Automatisé des Agents Bouba'ia"
echo "======================================"
echo "Webhook URL: $WEBHOOK_URL"
echo "Test User ID: $TEST_USER_ID"
echo "Timeout: ${TIMEOUT}s"
echo ""

# Initialiser le fichier de résultats
echo "{" > "$RESULTS_FILE"
echo "  \"test_session\": {" >> "$RESULTS_FILE"
echo "    \"timestamp\": \"$(date -Iseconds)\"," >> "$RESULTS_FILE"
echo "    \"webhook_url\": \"$WEBHOOK_URL\"," >> "$RESULTS_FILE"  
echo "    \"test_user_id\": \"$TEST_USER_ID\"" >> "$RESULTS_FILE"
echo "  }," >> "$RESULTS_FILE"
echo "  \"results\": {" >> "$RESULTS_FILE"

# Fonction de test d'agent
test_agent() {
    local agent_name=$1
    local test_message=$2
    local expected_keywords=$3
    local test_id=$4
    
    echo -n "🎯 Test $agent_name... "
    
    # Préparer les données de test
    test_data=$(cat <<EOF
{
    "message": "$test_message",
    "user_id": "$TEST_USER_ID",
    "source": "automated-test",
    "test_id": "$test_id"
}
EOF
)
    
    # Exécuter la requête
    start_time=$(date +%s.%N)  
    response=$(curl -s -X POST "$WEBHOOK_URL" \
        -H "Content-Type: application/json" \
        -d "$test_data" \
        --connect-timeout $TIMEOUT \
        --max-time $TIMEOUT || echo '{"error": "timeout_or_connection_error"}')
    end_time=$(date +%s.%N)
    
    # Calculer le temps de réponse
    response_time=$(echo "$end_time - $start_time" | bc)
    
    # Analyser la réponse
    local success=false
    local error_msg=""
    
    if [[ "$response" == *"error"* ]] || [[ -z "$response" ]]; then
        error_msg="API Error or Timeout"
    else
        # Vérifier si la réponse contient les mots-clés attendus
        for keyword in $expected_keywords; do
            if [[ "$response" == *"$keyword"* ]]; then
                success=true
                break
            fi
        done
        
        if [[ "$success" == false ]]; then
            error_msg="Response doesn't contain expected keywords: $expected_keywords"
        fi
    fi
    
    # Afficher le résultat
    if [[ "$success" == true ]]; then
        echo -e "${GREEN}✅ OK${NC} (${response_time}s)"
    else  
        echo -e "${RED}❌ FAILED${NC} - $error_msg"
    fi
    
    # Écrire dans le fichier de résultats (sans virgule finale pour le moment)
    cat >> "$RESULTS_FILE" <<EOF
    "$test_id": {
      "agent": "$agent_name",
      "message": "$test_message", 
      "success": $success,
      "response_time": $response_time,
      "error": "$error_msg",
      "response": $(echo "$response" | jq -c . 2>/dev/null || echo "\"$response\"")
    }
EOF
    
    # Pause entre les tests pour éviter le rate limiting
    sleep 2
}

# Fonction pour ajouter une virgule au résultat précédent
add_comma() {
    sed -i '$s/$/,/' "$RESULTS_FILE"
}

echo "🚀 DÉBUT DES TESTS"
echo "=================="

# TEST 1: Agent Email
add_comma 2>/dev/null || true
test_agent "Email Agent" \
    "Envoie un email de test à test@example.com avec le sujet 'Test automatisé'" \
    "email sent success envoyé" \
    "test_email_001"

# TEST 2: Agent Calendar  
add_comma
test_agent "Calendar Agent" \
    "Crée un événement de test demain à 14h30 intitulé 'Réunion test'" \
    "event created événement créé calendar" \
    "test_calendar_001"

# TEST 3: Agent Contact
add_comma  
test_agent "Contact Agent" \
    "Ajoute un contact test avec le nom Jean Dupont, email jean.test@example.com" \
    "contact added ajouté created créé" \
    "test_contact_001"

# TEST 4: Agent Finance  
add_comma
test_agent "Finance Agent" \
    "Ajoute une dépense de test de 150€ pour fournitures de bureau" \
    "dépense added ajouté expense created" \
    "test_finance_001"

# TEST 5: Recherche Web (Tavily)
add_comma
test_agent "Web Search Agent" \
    "Recherche les dernières actualités sur l'intelligence artificielle" \
    "search results actualités found trouvé" \
    "test_websearch_001"

# TEST 6: Calculateur
add_comma
test_agent "Calculator Agent" \
    "Calcule 15% de 2500 euros" \
    "375 résultat result" \
    "test_calculator_001"

# TEST 7: Test de routage (orchestrateur)
add_comma
test_agent "Orchestrator Agent" \
    "Bonjour, peux-tu me dire quels agents sont disponibles ?" \
    "agents available disponibles email calendar" \
    "test_orchestrator_001"

# TEST 8: Test d'erreur/gestion
add_comma  
test_agent "Error Handling" \
    "Commande invalide qui ne correspond à aucun agent spécifique xyz123" \
    "sorry désolé help aide error" \
    "test_error_001"

# Finaliser le fichier JSON
echo "" >> "$RESULTS_FILE"
echo "  }," >> "$RESULTS_FILE"
echo "  \"summary\": {" >> "$RESULTS_FILE"

# Calculer les statistiques
total_tests=8
success_count=$(grep '"success": true' "$RESULTS_FILE" | wc -l)
failure_count=$((total_tests - success_count))
success_rate=$(echo "scale=1; $success_count * 100 / $total_tests" | bc)

echo "    \"total_tests\": $total_tests," >> "$RESULTS_FILE"  
echo "    \"successes\": $success_count," >> "$RESULTS_FILE"
echo "    \"failures\": $failure_count," >> "$RESULTS_FILE"
echo "    \"success_rate\": \"$success_rate%\"" >> "$RESULTS_FILE"
echo "  }" >> "$RESULTS_FILE"
echo "}" >> "$RESULTS_FILE"

echo ""
echo "📊 RÉSUMÉ DES TESTS"
echo "==================="
echo -e "Total des tests: ${BLUE}$total_tests${NC}"
echo -e "Succès: ${GREEN}$success_count${NC}"  
echo -e "Échecs: ${RED}$failure_count${NC}"
echo -e "Taux de réussite: ${YELLOW}$success_rate%${NC}"

if [[ $success_count -eq $total_tests ]]; then
    echo -e "\n🎉 ${GREEN}Tous les tests sont passés ! Votre système Bouba'ia est fonctionnel.${NC}"
    exit_code=0
elif [[ $success_count -gt $((total_tests / 2)) ]]; then
    echo -e "\n⚠️  ${YELLOW}Certains tests ont échoué. Vérifiez la configuration des agents défaillants.${NC}"
    exit_code=1
else  
    echo -e "\n❌ ${RED}Plusieurs tests ont échoué. Vérifiez votre configuration N8N.${NC}"
    exit_code=2
fi

echo ""
echo "📄 Résultats détaillés sauvegardés dans: $RESULTS_FILE"
echo ""

# Afficher les erreurs détaillées
if [[ $failure_count -gt 0 ]]; then
    echo "🔍 ANALYSE DES ERREURS"
    echo "====================="
    
    # Extraire et afficher les erreurs
    jq -r '.results | to_entries[] | select(.value.success == false) | "❌ " + .value.agent + ": " + .value.error' "$RESULTS_FILE" 2>/dev/null || {
        echo "Erreur lors de l'analyse du fichier JSON. Consultez $RESULTS_FILE manuellement."
    }
    
    echo ""
    echo "🛠️  RECOMMANDATIONS DE DÉBOGAGE"
    echo "==============================="
    echo "1. Vérifiez que N8N est démarré et accessible"
    echo "2. Confirmez que le workflow principal est importé et activé"  
    echo "3. Vérifiez les credentials (OpenAI, Airtable, Google, etc.)"
    echo "4. Consultez les logs N8N pour plus de détails"
    echo "5. Testez chaque agent individuellement dans N8N"
fi

echo ""
echo "🔗 LIENS UTILES"
echo "================"
echo "• N8N Interface: ${WEBHOOK_URL%/webhook/*}"
echo "• Documentation: Backend_n8n/GUIDE-DEPLOIEMENT-COMPLET.md"
echo "• Configuration Airtable: Backend_n8n/airtable-schemas.md"
echo "• Supabase Functions: Backend_n8n/supabase-functions.sql"

exit $exit_code