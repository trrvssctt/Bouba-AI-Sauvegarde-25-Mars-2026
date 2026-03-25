#!/bin/bash

# Script de test pour vérifier l'envoi direct vers le webhook

WEBHOOK_URL="https://n8n.realtechprint.com/webhook-test/7f338448-11b5-458c-ada3-f009feccc184"

echo "🧪 Test d'envoi vers le webhook du bot..."
echo "URL: $WEBHOOK_URL"
echo

# Test avec un message simple
TEST_MESSAGE="Bonjour, ceci est un test du webhook direct"
USER_ID="test-user-123"
SESSION_ID="test-session-456"

echo "📤 Envoi du message test: '$TEST_MESSAGE'"

RESPONSE=$(curl -s -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "body": {
      "message": "'$TEST_MESSAGE'",
      "userId": "'$USER_ID'",
      "sessionId": "'$SESSION_ID'",
      "history": [],
      "timestamp": "'$(date -Iseconds)'"
    }
  }')

echo "📥 Réponse du webhook:"
echo "$RESPONSE" | jq . 2>/dev/null || echo "$RESPONSE"

if [[ $? -eq 0 ]]; then
    echo
    echo "✅ Webhook accessible et répond correctement"
else
    echo
    echo "❌ Erreur lors du test du webhook"
fi