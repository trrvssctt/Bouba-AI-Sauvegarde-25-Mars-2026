#!/bin/bash

# Test de l'enregistrement des conversations
# Ce script teste l'API d'historique des conversations

echo "🧪 Test de l'API d'historique des conversations"
echo "=============================================="

API_URL="http://localhost:3001"
USER_ID="test-user-123"
TEST_MESSAGE="Bonjour Bouba, peux-tu m'aider avec mes emails ?"

echo ""
echo "📝 Test 1: Envoi d'un message via /api/chat"
echo "Message: '$TEST_MESSAGE'"

curl -X POST "$API_URL/api/chat" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test-token" \
  -d "{
    \"message\": \"$TEST_MESSAGE\",
    \"userId\": \"$USER_ID\",
    \"history\": []
  }" \
  -w "\nStatus: %{http_code}\nTime: %{time_total}s\n" | jq '.'

echo ""
echo "📋 Test 2: Récupération des sessions utilisateur"
curl -X GET "$API_URL/api/chat/sessions/$USER_ID" \
  -H "Authorization: Bearer test-token" \
  -w "\nStatus: %{http_code}\nTime: %{time_total}s\n" | jq '.'

echo ""
echo "🏥 Test 3: Health check de l'API"
curl -X GET "$API_URL/health" \
  -w "\nStatus: %{http_code}\nTime: %{time_total}s\n" | jq '.'

echo ""
echo "✅ Tests terminés!"