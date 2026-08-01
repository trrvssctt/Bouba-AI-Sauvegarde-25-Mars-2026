/**
 * Templates de réponses clients pour Bouba
 *
 * Ces templates sont utilisés pour générer des réponses professionnelles
 * et cohérentes dans les interactions clients (relances, onboarding, etc.)
 */

// ============================================================================
// EMAIL TEMPLATES
// ============================================================================

export const EMAIL_TEMPLATES = {
  // Relance client
  FOLLOW_UP: {
    subject: (context: string) => `Suivi : ${context}`,
    body: (prénom: string, contexte: string) => `
<p>Bonjour ${prénom},</p>

<p>J'espère que tu vas bien.</p>

<p>Je me permets de te relancer concernant ${contexte}. As-tu eu l'occasion d'y réfléchir ou d'avancer dessus ?</p>

<p>Je reste à ta disposition pour en discuter ou pour toute question.</p>

<p>Bien à toi,</p>
<p>[Signature]</p>
`.trim(),
  },

  // Relance douce (premier rappel)
  GENTLE_FOLLOW_UP: {
    subject: (context: string) => `Petit rappel : ${context}`,
    body: (prénom: string, contexte: string) => `
<p>Bonjour ${prénom},</p>

<p>Un petit mot pour revenir vers toi au sujet de ${contexte}.</p>

<p>N'hésite pas à me dire si tu as besoin de plus d'informations ou si un échange serait utile.</p>

<p>À bientôt,</p>
<p>[Signature]</p>
`.trim(),
  },

  // Relance ferme (après plusieurs tentatives)
  FIRM_FOLLOW_UP: {
    subject: (context: string) => `Important : ${context}`,
    body: (prénom: string, contexte: string) => `
<p>Bonjour ${prénom},</p>

<p>Sauf erreur de ma part, je n'ai pas encore eu de retour concernant ${contexte}.</p>

<p>Pourrais-tu me faire un retour d'ici [date] afin que nous puissions avancer ?</p>

<p>Je te remercie par avance.</p>

<p>Cordialement,</p>
<p>[Signature]</p>
`.trim(),
  },

  // Remerciement
  THANK_YOU: {
    subject: (raison: string) => `Merci ${raison}`,
    body: (prénom: string, raison: string, détail: string) => `
<p>Bonjour ${prénom},</p>

<p>Je tenais à te remercier sincèrement pour ${raison}.</p>

<p>${détail}</p>

<p>C'est un plaisir de collaborer avec toi.</p>

<p>Bien cordialement,</p>
<p>[Signature]</p>
`.trim(),
  },

  // Bienvenue / Onboarding client
  WELCOME: {
    subject: () => `Bienvenue chez Bouba'ia !`,
    body: (prénom: string, entreprise: string) => `
<p>Bonjour ${prénom},</p>

<p>Bienvenue chez <strong>Bouba'ia</strong> ! 🎉</p>

<p>Nous sommes ravis de t'accueillir et de t'accompagner dans la gestion de ${entreprise || 'ton entreprise'}.</p>

<p><strong>Voici comment Bouba peut t'aider :</strong></p>
<ul>
  <li>📧 <strong>Emails</strong> : Rédige, envoie et organise tes emails professionnels</li>
  <li>📅 <strong>Agenda</strong> : Planifie tes rendez-vous et réunions en un instant</li>
  <li>💰 <strong>Finance</strong> : Suivi des dépenses, revenus et génération de documents</li>
  <li>👤 <strong>Contacts</strong> : Gestion complète de ton carnet d'adresses</li>
</ul>

<p><strong>Pour commencer :</strong></p>
<ol>
  <li>Explore le dashboard pour découvrir les différentes fonctionnalités</li>
  <li>Pose une question à Bouba dans le chat (ex: "Montre-moi mes emails non lus")</li>
  <li>Configure tes connexions (Google Calendar, Gmail) dans les Paramètres</li>
</ol>

<p>Une question ? Besoin d'aide ? Bouba est là pour toi 24/7 !</p>

<p>À très vite,</p>
<p><strong>L'équipe Bouba'ia</strong></p>
`.trim(),
  },

  // Confirmation de rendez-vous
  MEETING_CONFIRMATION: {
    subject: (titre: string, date: string) => `Confirmation : ${titre} le ${date}`,
    body: (prénom: string, titre: string, date: string, heure: string, lieu: string) => `
<p>Bonjour ${prénom},</p>

<p>Je te confirme notre rendez-vous :</p>

<p><strong>📅 ${titre}</strong><br>
🕐 ${date} à ${heure}<br>
📍 ${lieu || 'À définir'}</p>

<p>Ordre du jour :</p>
<ul>
  <li>[Point 1]</li>
  <li>[Point 2]</li>
</ul>

<p>N'hésite pas à me faire savoir si tu as des questions avant notre échange.</p>

<p>À très bientôt,</p>
<p>[Signature]</p>
`.trim(),
  },

  // Proposition commerciale / Devis
  QUOTE_PROPOSAL: {
    subject: (projet: string) => `Proposition commerciale : ${projet}`,
    body: (prénom: string, projet: string) => `
<p>Bonjour ${prénom},</p>

<p>Suite à nos échanges, je suis ravi de te proposer mon accompagnement pour <strong>${projet}</strong>.</p>

<p><strong>Ce que je te propose :</strong></p>
<ul>
  <li>[Prestation 1]</li>
  <li>[Prestation 2]</li>
  <li>[Prestation 3]</li>
</ul>

<p><strong>Investissement :</strong> [Montant] FCFA HT</p>
<p><strong>Délai :</strong> [Durée]</p>

<p>Tu trouveras le devis détaillé en pièce jointe.</p>

<p>Je reste à ta disposition pour toute question ou pour ajuster cette proposition selon tes besoins.</p>

<p>À bientôt,</p>
<p>[Signature]</p>
`.trim(),
  },
}

// ============================================================================
// SMS / MESSAGE COURT TEMPLATES
// ============================================================================

export const SMS_TEMPLATES = {
  // Relance SMS
  FOLLOW_UP: (prénom: string, contexte: string) =>
    `Bonjour ${prénom}, petit rappel concernant ${contexte}. Dis-moi si tu as avancé !`,

  // Confirmation RDV (la veille)
  MEETING_REMINDER: (titre: string, date: string, heure: string) =>
    `Rappel : ${titre} demain ${date} à ${heure}. À bientôt !`,

  // Bienvenue
  WELCOME: (prénom: string) =>
    `Bienvenue ${prénom} ! 🎉 Bouba est maintenant connecté à ton espace. Pose-lui une question pour commencer !`,
}

// ============================================================================
// RESPONSE TEMPLATES (in-chat)
// ============================================================================

export const CHAT_RESPONSE_TEMPLATES = {
  // Transaction enregistrée
  TRANSACTION_SUCCESS: (type: 'income' | 'expense', montant: string, catégorie: string) =>
    `✅ **${type === 'income' ? 'Revenu' : 'Dépense'} enregistré(e) !**\n\n` +
    `**Montant :** ${montant}\n` +
    `**Catégorie :** ${catégorie}\n\n` +
    `Retrouve cette transaction dans **Finance → Transactions**.`,

  // Contact créé
  CONTACT_SUCCESS: (nom: string, email?: string, téléphone?: string, entreprise?: string) =>
    `✅ Contact **${nom}** enregistré !\n\n` +
    (email ? `📧 ${email}\n` : '') +
    (téléphone ? `📱 ${téléphone}\n` : '') +
    (entreprise ? `🏢 ${entreprise}\n` : '') +
    `\nRetrouve ce contact dans **Contacts → Mes contacts**.`,

  // Email envoyé
  EMAIL_SENT: (destinataire: string, objet: string) =>
    `✅ Email envoyé avec succès !\n\n` +
    `**Destinataire :** ${destinataire}\n` +
    `**Objet :** ${objet}\n\n` +
    `Retrouve cet email dans **Emails → Envoyés**.`,

  // Événement créé
  EVENT_CREATED: (titre: string, date: string, heure: string, lieu?: string) =>
    `✅ Événement créé !\n\n` +
    `📅 **${titre}**\n` +
    `🕐 ${date} à ${heure}\n` +
    (lieu ? `📍 ${lieu}\n` : '') +
    `\nRetrouve cet événement dans **Agenda → Calendrier**.`,

  // Document généré
  DOCUMENT_GENERATED: (type: string, numéro: string, client: string, total: string) =>
    `✅ ${type} générée avec succès !\n\n` +
    `**N° :** ${numéro}\n` +
    `**Client :** ${client}\n` +
    `**Total TTC :** ${total}\n\n` +
    `Clique sur "Sauvegarder" pour l'ajouter à **Finance → Documents**.`,

  // Rapport financier
  FINANCE_REPORT: (mois: string, revenus: string, dépenses: string, bénéfice: string) =>
    `📊 **Rapport financier — ${mois}**\n\n` +
    `**Revenus :** ${revenus}\n` +
    `**Dépenses :** ${dépenses}\n` +
    `**Bénéfice net :** ${bénéfice}\n\n` +
    `💡 **Conseil :** [Recommandation personnalisée selon les données]`,

  //Erreur
  ERROR: (message: string, suggestion: string) =>
    `⚠️ **Une erreur est survenue**\n\n` +
    `${message}\n\n` +
    `💡 **Suggestion :** ${suggestion}`,

  // Limite atteinte
  QUOTA_REACHED: () =>
    `⚠️ **Limite de messages atteinte**\n\n` +
    `Tu as utilisé tous tes messages pour ce mois.\n\n` +
    `[Mettre à niveau votre plan](/settings/plan) pour continuer à utiliser Bouba sans limite.`,
}

// ============================================================================
// SUGGESTION GENERATORS
// ============================================================================

export const SUGGESTIONS = {
  // Après une relance client
  FOLLOW_UP: [
    'Envoyer par email',
    'Voir le contact',
    'Autre relance',
    'Créer un rappel',
  ],

  // Après onboarding client
  ONBOARDING: [
    'Configurer Google Calendar',
    'Importer mes contacts',
    'Créer ma première facture',
    'Voir les fonctionnalités',
  ],

  // Après transaction
  TRANSACTION: [
    'Ajouter une autre transaction',
    'Voir mes finances',
    'Générer un rapport',
    'Créer une facture',
  ],

  // Après événement
  EVENT: [
    'Ajouter un autre RDV',
    'Voir mon agenda',
    'Envoyer un récap aux participants',
  ],

  // Après document
  DOCUMENT: [
    'Sauvegarder dans Finance',
    'Envoyer au client',
    'Créer un autre document',
    'Voir mes documents',
  ],

  // Global / récapitulatif
  RECAP: [
    'Voir mon agenda',
    'Voir mes emails',
    'Rapport financier',
    'Mes contacts',
  ],
}

// ============================================================================
// UTILS
// ============================================================================

/**
 * Génère un email structuré à partir d'un template
 */
export function generateEmail(
  template: keyof typeof EMAIL_TEMPLATES,
  ...args: any[]
): { subject: string; body: string } {
  const tpl = EMAIL_TEMPLATES[template]
  const subject = tpl.subject(...args)
  const body = tpl.body(...args)
  return { subject, body }
}

/**
 * Génère un SMS à partir d'un template
 */
export function generateSMS(
  template: keyof typeof SMS_TEMPLATES,
  ...args: any[]
): string {
  const tpl = SMS_TEMPLATES[template]
  return tpl(...args)
}

/**
 * Génère une réponse chat à partir d'un template
 */
export function generateChatResponse(
  template: keyof typeof CHAT_RESPONSE_TEMPLATES,
  ...args: any[]
): string {
  const tpl = CHAT_RESPONSE_TEMPLATES[template]
  return tpl(...args)
}

/**
 * Récupère les suggestions pour un contexte donné
 */
export function getSuggestionsFor(context: keyof typeof SUGGESTIONS): string[] {
  return SUGGESTIONS[context] || []
}
