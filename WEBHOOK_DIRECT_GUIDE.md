# 🤖 Configuration du Webhook Direct pour le Chat Bot

## 📋 Résumé des Modifications

Le système de chat a été modifié pour envoyer les messages **directement depuis le frontend vers le webhook du bot** au lieu de passer par l'API intermédiaire. Cela simplifie l'architecture et améliore les performances.

## 🔧 Configuration

### 1. Variables d'environnement

Le fichier `.env.local` a été créé avec :

```env
# Configuration pour l'envoi direct vers le webhook du bot
VITE_BOT_WEBHOOK_URL=https://n8n.realtechprint.com/webhook-test/7f338448-11b5-458c-ada3-f009feccc184

# API Backend URL (utilisé comme fallback si le webhook direct n'est pas configuré)
VITE_API_URL=http://localhost:3001
```

### 2. Logique de fonctionnement

- **Mode prioritaire** : Envoi direct vers le webhook (`VITE_BOT_WEBHOOK_URL`)
- **Mode fallback** : Si le webhook n'est pas configuré, utilise l'API existante (`VITE_API_URL`)

## 🚀 Comment tester

### 1. Activer le webhook N8N

⚠️ **Important** : Le webhook est en mode test et doit être activé manuellement :

1. Connectez-vous à votre interface N8N
2. Ouvrez le workflow contenant le webhook
3. Cliquez sur **"Execute workflow"** pour activer le webhook
4. Le webhook sera alors disponible pour recevoir des requêtes

### 2. Tester avec le script fourni

```bash
# Rendre le script exécutable et le lancer
chmod +x test_webhook_direct.sh
./test_webhook_direct.sh
```

### 3. Tester avec l'interface web

1. Démarrez le serveur de développement :
```bash
npm run dev
```

2. Ouvrez http://localhost:5173 dans votre navigateur
3. Envoyez un message dans l'interface de chat
4. Le message sera envoyé directement au webhook N8N

## 🔄 Format des données envoyées

Le webhook reçoit les données dans ce format :

```json
{
  "body": {
    "message": "Message de l'utilisateur",
    "userId": "id-utilisateur",
    "sessionId": "id-session",
    "history": [
      {"role": "user", "content": "message précédent"},
      {"role": "assistant", "content": "réponse précédente"}
    ],
    "timestamp": "2026-03-09T10:30:00Z"
  }
}
```

## 🛠 Personnalisation

### Changer l'URL du webhook

Pour utiliser un autre webhook, modifiez la variable `VITE_BOT_WEBHOOK_URL` dans `.env.local` :

```env
VITE_BOT_WEBHOOK_URL=https://votre-nouveau-webhook.com/endpoint
```

### Revenir à l'ancien système

Pour désactiver l'envoi direct et revenir à l'API, commentez ou supprimez la ligne :

```env
# VITE_BOT_WEBHOOK_URL=https://n8n.realtechprint.com/webhook-test/...
```

## 📝 Format de réponse attendu

Le webhook doit répondre dans l'un de ces formats :

**Format simple (string) :**
```json
"Voici ma réponse"
```

**Format structuré :**
```json
{
  "output": "Voici ma réponse",
  "suggestions": ["Action 1", "Action 2"],
  "agent": "ASSISTANT"
}
```

## 🎯 Avantages de cette approche

- ✅ **Plus rapide** : Élimination de l'étape intermédiaire API
- ✅ **Plus simple** : Communication directe frontend ↔ webhook
- ✅ **Compatible** : Garde la compatibilité avec l'ancien système
- ✅ **Flexible** : Facile de changer l'URL du webhook

## 🐛 Dépannage

### Le webhook n'est pas joignable
- Vérifiez que le workflow N8N est activé
- Testez l'URL avec le script `test_webhook_direct.sh`
- Vérifiez les CORS si nécessaire

### Messages d'erreur dans la console
- Ouvrez les DevTools (F12) pour voir les détails
- Vérifiez que `VITE_BOT_WEBHOOK_URL` est correctement configuré

### Fallback vers l'API
- Si le webhook direct ne fonctionne pas, le système utilisera automatiquement l'API existante
- Aucune intervention requise de votre part