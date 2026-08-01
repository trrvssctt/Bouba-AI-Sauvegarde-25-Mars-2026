# Fix DeepSeek reasoning_content dans n8n

## Problème
L'erreur "Bad request - please check your parameters. The reasoning_content in the thinking mode must be passed back to the API" se produit quand :
- Vous utilisez un modèle DeepSeek R1 (reasoner)
- L'agent utilise des outils (tools)
- Après l'appel d'un outil, n8n doit renvoyer le `reasoning_content` mais ne le fait pas

## Solution 1 : Changer de modèle (RECOMMANDÉ)

### Dans n8n :
1. Allez dans **Credentials** → **DeepSeek 5 Mars 2026**
2. Changez le modèle :
   - ❌ `deepseek-reasoner` (nécessite reasoning_content)
   - ✅ `deepseek-chat` ou `deepseek-v3` (ne nécessite PAS reasoning_content)
3. Sauvegardez

**Pourquoi c'est mieux :** Le modèle `deepseek-chat` est tout aussi performant pour les tâches d'assistant mais n'a pas la contrainte du champ `reasoning_content`.

## Solution 2 : Patch du workflow pour gérer reasoning_content

Si vous devez garder le modèle reasoner, modifiez le nœud **Memory — 6 messages** pour capturer et stocker le reasoning_content :

### Étape 1 : Ajouter un nœud "Extract Reasoning" après chaque agent

Après chaque nœud agent (CalendarAgentInternal, EmailAgentInternal, AdminAgentInternal), ajoutez un nœud **Code** qui extrait le reasoning_content :

```javascript
// Code node: Extract Reasoning Content
const item = items[0].json;

// Extraire reasoning_content de la réponse DeepSeek
let reasoningContent = '';
let outputContent = '';

if (item.response?.choices?.[0]?.message) {
  const msg = item.response.choices[0].message;
  reasoningContent = msg.reasoning_content || msg.reasoning || '';
  outputContent = msg.content || item.output || '';
}

return [{
  json: {
    ...item,
    reasoning_content: reasoningContent,
    output: outputContent,
    hasReasoning: reasoningContent !== ''
  }
}];
```

### Étape 2 : Modifier le nœud Memory pour inclure le reasoning_content

Dans le nœud **Memory — 6 messages**, assurez-vous que le champ `reasoning_content` est inclus dans les messages assistant :

```javascript
// Dans la construction du message assistant :
{
  role: 'assistant',
  content: outputContent,
  reasoning_content: reasoningContent  // <-- AJOUTER CE CHAMP
}
```

### Étape 3 : Réinjecter le reasoning_content dans l'appel suivant

Dans chaque nœud **DeepSeek** (Calendar, Email, Admin), modifiez les paramètres pour inclure :

```json
{
  "model": "deepseek-reasoner",
  "messages": [
    // ... messages précédents
    {
      "role": "assistant",
      "content": "{{ $json.output }}",
      "reasoning_content": "{{ $json.reasoning_content }}"  // <-- AJOUTER
    }
  ]
}
```

## Solution 3 : Utiliser un wrapper HTTP personnalisé (Avancé)

Créez un nœud **HTTP Request** personnalisé qui appelle directement l'API DeepSeek avec gestion du reasoning_content :

```javascript
// Dans un nœud Code avant l'appel HTTP :
const messages = $('Memory').item.json.messages || [];
const lastReasoning = $('Extract Reasoning').item.json.reasoning_content || '';

// Ajouter le reasoning_content au dernier message assistant
if (lastReasoning && messages.length > 0) {
  const lastMsg = messages[messages.length - 1];
  if (lastMsg.role === 'assistant') {
    lastMsg.reasoning_content = lastReasoning;
  }
}

return [{ json: { messages, reasoning_content: lastReasoning } }];
```

## Vérification

Après avoir appliqué le fix :

1. Testez avec une requête simple : "Quels mails n'ont pas de réponse depuis 3 jours ?"
2. Vérifiez que l'agent Email peut :
   - Appeler GetEmails1
   - Recevoir la réponse
   - Renvoyer le reasoning_content à DeepSeek
   - Générer une réponse cohérente

## Notes importantes

- ⚠️ **Les modèles DeepSeek disponibles dans n8n v1** : 
  - `deepseek-chat` ✅ (recommandé, pas de reasoning_content)
  - `deepseek-coder` ✅ (pas de reasoning_content)
  - `deepseek-reasoner` ❌ (nécessite reasoning_content - problématique)

- 📌 **Dans votre workflow actuel**, les modèles sont configurés sur `deepseek-v4-pro-flash` qui n'est pas un modèle DeepSeek officiel. Vérifiez dans vos credentials n8n quel modèle est réellement utilisé.
