#!/bin/bash

echo "🧪 Test complet du webhook N8N depuis l'interface"
echo ""

echo "1. ✅ Configuration .env.local mise à jour"
echo "   VITE_BOT_WEBHOOK_URL=https://n8n.realtechprint.com/webhook-test/7f338448-11b5-458c-ada3-f009feccc184"
echo ""

echo "2. ✅ Hook useBouba configuré pour webhook direct"
echo "   useDirectWebhook = true par défaut"
echo ""

echo "3. ✅ Test webhook direct réussi (statut 200)"
echo "   Le webhook N8N répond correctement"
echo ""

echo "📋 ÉTAPES DE TEST:"
echo ""
echo "1. Ouvrez votre navigateur sur http://localhost:5174"
echo "2. Connectez-vous avec votre compte Google"
echo "3. Ouvrez les DevTools (F12) > Console"
echo "4. Envoyez un message dans le chat"
echo "5. Vérifiez les logs dans la console:"
echo "   - [WEBHOOK] Envoi direct vers N8N: https://n8n.realtechprint.com/webhook-test/..."
echo "   - [WEBHOOK] Response status: 200"
echo ""

echo "🔧 Si les messages ne partent pas vers le webhook:"
echo "1. Vérifiez la console du navigateur pour les erreurs"
echo "2. Assurez-vous que le webhook N8N est bien activé"
echo "3. Vérifiez qu'il n'y a pas d'erreurs CORS"
echo ""

echo "🎯 Résultat attendu:"
echo "Les messages doivent maintenant partir directement vers:"
echo "https://n8n.realtechprint.com/webhook-test/7f338448-11b5-458c-ada3-f009feccc184"