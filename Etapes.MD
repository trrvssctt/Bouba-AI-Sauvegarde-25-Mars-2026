# Bouba'ia — Feuille de Route Complète

> **Date de référence :** 22 avril 2026  
> **Statut global :** ~70% du produit développé — MVP fonctionnel, agents AI partiellement connectés, paiements en place

---

## Où en sommes-nous ?

### Ce qui est fait ✅
- Authentification complète (JWT, inscription, connexion, RBAC 3 niveaux)
- Dashboard utilisateur + variante plan gratuit
- Panel admin complet (utilisateurs, facturation, monitoring)
- Système de paiement Stripe (plans Free/Starter/Pro/Business/Enterprise)
- Interface des 4 agents : Email, Calendrier, Contacts, Finance
- Chat principal avec N8N webhook
- Paramètres utilisateur (profil, connexions, plan, notifications)
- Base de données Supabase/PostgreSQL avec 14+ tables
- Interface mobile responsive

### Ce qui est en cours ⚠️
- OAuth Google (frontend prêt, backend incomplet)
- Intégration Gmail réelle (structure en place, sync non testée)
- N8N workflows (webhook chat OK, agents non-chat en attente)
- Synchronisation temps réel données externes

### Ce qui manque ❌
- Connexion AI réelle des agents (Email, Calendrier, Contacts, Finance)
- Fichiers `.env` de production documentés
- Tests de bout-en-bout
- SEO + landing page optimisée pour conversion
- Onboarding utilisateur guidé (post-inscription)
- Emails transactionnels (confirmation, mot de passe oublié, bienvenue)
- Documentation utilisateur / FAQ

---

## MISSION — Adaptation au workflow n8n SOPHIA v3.0 (16 juillet 2026)

> Réf. `Mission.txt`. Workflow refondu : un seul agent avec tous les outils, plus de routeur JSON, plus d'inserts Postgres côté n8n. Contrat webhook inchangé.

### Fait ✅

- [x] Parseur n8n unique `parseN8nResponse()` + `callN8nWebhook()` (timeout 50 s, latence loggée `[n8n] <agent> <ms>`, warn > 15 s) dans `api/lib/n8n.ts` — utilisé par `/api/chat` ET `/api/bouba/action`
- [x] Le `success: false` renvoyé par n8n est désormais honoré (fini les faux succès) : réponse plate `{ success, output, agent, ... }` vers le frontend
- [x] `/api/chat` répond au client AVANT les écritures non critiques (message assistant, quota, usage_tracking en fire-and-forget + compteur d'échecs loggé) ; quota consommé uniquement si `success === true`
- [x] Payload n8n plafonné : history 6 messages × 600 car., memories 15 × 300 car., knowledge 3 passages × 800 car., context de page 4000 car. (backend + frontend)
- [x] Mode démo : même format que le parseur + préfixe « 🧪 (Mode démo — n8n indisponible) » ; déclenché uniquement si webhook injoignable (un timeout → erreur propre)
- [x] Parseur miroir frontend `src/lib/boubaResponse.ts` ; refonte `useBouba` (bulle d'erreur rouge distincte `isError`, suggestions/[ACTION:...] tolérants) et `useBoubaAction` (états `isLoading`/`error`/`lastAgent`)
- [x] Chat : historique envoyé réduit à 6 messages ; badge agent depuis la réponse
- [x] Email : `sendEmailViaBouba` compose les balises exactes `[EMAIL_TO]/[EMAIL_SUBJECT]/[EMAIL_BODY_HTML]` dans `context` ; le composer envoie via Bouba (pièces jointes → Gmail direct) ; confirmation uniquement si `success === true` ; repli sans clé Gemini marqué « suggestion générique »
- [x] Calendrier : contexte limité à la fenêtre −7 j → +30 j (max 30 événements, champs id/titre/début/fin) ; refresh de la vue après action réussie
- [x] Contacts : chemin primaire via Bouba (v3.0 route seul), repli local durci quand Gemini absent ; reload du store après ajout/suppression
- [x] Finance : parsing `[TRANSACTION]` tolérant + validation stricte (type ∈ {income, expense}, montant > 0, date parseable) — transaction invalide → erreur explicite, jamais d'insertion silencieuse ; rapport = mois courant max 50 transactions ; analyse = agrégats par catégorie si > 50
- [x] Migration `api/migrations/dedupe_messages.sql` écrite (doublons v2.0 : même conversation/role/content à < 10 s → garder le plus ancien)
- [x] Docs mises à jour : `N8N_PAGES_INTEGRATION.md` (schéma v3.0), `CLAUDE.md`, `test_chat_api.sh`
- [x] Grep repo : aucune référence active aux anciens types de réponse par agent, aucune fuite de template `$('Parse Input')` côté app

### Correctifs plans & quota (16 juillet 2026) ✅

- [x] **Détection du plan utilisateur** : 3 comptes pointaient encore vers les plans désactivés (`pro`, `enterprise`) absents de `/api/data/plans` → migrés vers les équivalents actifs (pro→starter 10 000 msgs, enterprise→business illimité), table `subscriptions` alignée. Repli ajouté dans `usePlans.hasFeatureAccess` (liste API → défauts → free) pour qu'un plan_id inconnu ne casse plus jamais la détection.
- [x] **Quota mensuel épuisé → connexion refusée** : contrôle ajouté dans `/api/auth/signin` ET `/api/auth/login` (legacy, qui n'avait aucun contrôle) — 403 `QUOTA_EXHAUSTED`, non-admins uniquement, bandeau d'erreur affiché sur LoginPage.
- [x] **Reset mensuel du quota** (prérequis du blocage — n'existait pas) : colonne `profiles.quota_reset_at` (migration `add_quota_reset_at.sql`, exécutée) + reset paresseux dans `api/lib/quota.ts`, branché au login et dans les contrôles de quota de `/api/chat` et `/api/bouba/action`. Testé e2e : quota épuisé → 403 ; nouveau mois → compteur remis à 0 et connexion OK.

### Administration — Utilisateurs (16 juillet 2026) ✅

- [x] **Page Utilisateurs** : liste avec plan, usage messages IA, prochain paiement, date d'inscription, rôle + actions par ligne : suspendre/réactiver (bloque la connexion), réinitialiser le mot de passe (email automatique), supprimer définitivement (garde-fous : pas soi-même, pas un admin sauf superadmin)
- [x] **Création de client par l'admin** : choix du plan (Free/Starter/Business), preuve de paiement obligatoire **uniquement pour les plans payants** (référence Stripe/virement OU fichier justificatif JPEG/PNG/WebP/PDF ≤ 5 Mo, stocké dans `payments.metadata`), limite de messages synchronisée depuis le plan, email de bienvenue avec mot de passe temporaire
- [x] **Page détail client** : prénom/nom éditables, rôle, prochain paiement, changement de plan (limite resynchronisée), suppression du compte, téléchargement des justificatifs de paiement dans l'historique de facturation
- [x] **Email aux clients** : `POST /api/admin/users/:id/send-email` — vrai email Resend (template Bouba'ia) + notification in-app ; la modale « Envoyer un email » du détail client l'utilise désormais (avant : notification in-app seulement)
- [x] **Bug corrigé** : l'enregistrement des preuves de paiement échouait silencieusement depuis toujours (`status='manual'` violait la contrainte CHECK de `payments`) → `'succeeded'` + `metadata.source='admin_manual'`
- [x] Testé e2e : refus sans preuve, création avec fichier, intégrité du justificatif téléchargé, sync des limites au changement de plan, suppression + garde-fous
- [x] **Colonnes corrigées** : « Prochain paiement » et « Usage messages » étaient interverties dans la liste
- [x] **Page Clients supprimée** (doublon d'Utilisateurs) — `/admin/customers` redirige vers `/admin/users`
- [x] **Modal de confirmation** pour la réinitialisation de mot de passe (remplace le confirm() natif du navigateur)
- [x] **Blocage automatique des abonnements expirés** : au login, si le plan est payant et que `subscriptions.current_period_end` est dépassé → 403 `PLAN_EXPIRED` et redirection vers **`/payment/renew`** (nouvelle page publique avec le **QR code marchand Wave**, les étapes de renouvellement et le contact support). Testé e2e : abonnement échu → bloqué + redirigé ; période prolongée → connexion OK.

### Administration — Facturation (17 juillet 2026) ✅

- [x] **Revenus encaissés** : nouvelle section (et endpoint `GET /api/admin/billing/revenue`) montrant les montants réellement perçus par source — nouveaux abonnements, réabonnements (2e paiement et suivants d'un même client), upgrades validés — avec total, part du mois en cours et série mensuelle sur 12 mois, agrégés par devise (EUR/XOF)
- [x] **Factures PDF** : template `api/lib/invoice.ts` (pdfkit) — bandeau violet Bouba'ia, bloc client, tableau, total, pied de page. Un paiement réglé produit un **REÇU avec tampon vert « PAYÉE »**, sinon une FACTURE « À RÉGLER ». Téléchargement via `GET /billing/invoice-pdf` (paiements et upgrades), boutons « PDF » dans l'historique des transactions et sur les upgrades approuvés
- [x] **Envoi de factures par email** : `POST /billing/send-invoice` joint désormais le **PDF en pièce jointe** (Resend)
- [x] **Relances de paiement par email** (individuelles et groupées) : `POST /billing/send-reminders` — template Resend dédié (retard vs échéance proche, montant, lien `/payment/renew`) + notification in-app. Boutons : « Relancer » par ligne (prochains paiements, impayés), « Relancer les urgents » (échus + critiques), « Relancer tous par email » (impayés). Remplace l'ancienne relance qui ne créait que des notifications in-app
- [x] **Demandes d'upgrade** : déjà opérationnelles (validation/refus avec motif, notification + email) — conservées telles quelles, enrichies du téléchargement de reçu
- [x] Testé e2e : revenus (2 sources détectées), PDF valide vérifié visuellement (montants centimes→euros corrigés, glyphes Helvetica), relance individuelle, garde-fou liste vide
- ⚠️ Rappel : sans `RESEND_API_KEY` en production, les relances ne créent que des notifications in-app (le backend le signale clairement)

### Facturation — Échéances de fin de mois automatiques (18 juillet 2026) ✅

- [x] **Template de facture refait** sur le modèle de référence (`assets/Facture_SN69992.pdf`) : encadré référence/type/date d'émission, bloc client, bandeau « Facture n°X du … » avec Total HT / TVA 18 % / Total, encadré « Information de paiement », rubrique détaillée avec période (« Du X au Y », « Sans engagement »), sous-total, bloc de totaux, pied de page société. TVA configurable (`INVOICE_VAT_RATE`, défaut 18). Le tampon « PAYÉE » reste sur les reçus
- [x] **Section « Échéances du mois »** dans Facturation : liste des clients (plans payants) dont l'abonnement se termine le mois courant — plan, date d'échéance, montant, **statut d'envoi** (auto/manuel + n° de facture) ; boutons **« Voir »** (PDF de la facture de renouvellement) et **« Envoyer / Renvoyer »**
- [x] **Envoi automatique sans intervention** : planificateur backend (au démarrage + toutes les 12 h) qui envoie par email la facture de renouvellement (**PDF en pièce jointe** + notification in-app) à chaque client concerné, **une seule fois par période** (table `renewal_invoice_log`, migration exécutée). Désactivable via `AUTO_RENEWAL_INVOICES=false`
- [x] Testé e2e : détection des échéances de juillet, PDF conforme vérifié visuellement (2 itérations), passe automatique déclenchée et journalisée (`auto=true`), renvoi manuel, idempotence (1 seule ligne de journal par période), journal purgé après test pour que l'envoi réel se fasse en production
- ⚠️ En production : renseigner `RESEND_API_KEY` sinon les envois sont journalisés avec `email_sent=false` (visible dans l'interface « email non parti »)

### Administration — Gestion des Paiements (18 juillet 2026) ✅

- [x] **Historique complet unifié** (`GET /api/admin/payments/all`) : paiements + demandes d'upgrade, chaque transaction **typée** — Abonnement (1er paiement), Réabonnement (suivants), Upgrade, Création admin — avec méthode (Wave = validation manuelle · Stripe = validation automatique), référence, plan, filtre par type et recherche
- [x] **Validation manuelle des paiements Wave** : bandeau « en attente » en haut de page avec référence Wave à vérifier, **Valider** (paiement `succeeded`, abonnement activé/prolongé selon `months_paid`, limite du plan synchronisée, **reçu PDF tampon PAYÉE envoyé par email** + notification) ou **Rejeter avec motif** (email + notification au client). Garde-fous : paiement déjà traité → 409, paiement Stripe → refus (validation auto par webhook)
- [x] **Lien facture** : bouton PDF sur chaque ligne — reçu « PAYÉE » si validé, facture « À RÉGLER » sinon (même template que Facturation)
- [x] **Menu épuré** : entrée « Factures » retirée de la sidebar (géré par Facturation), `/admin/invoices` redirige vers `/admin/billing`, `InvoicesPage.tsx` supprimée
- [x] Testé e2e : historique typé, validation Wave (abonnement prolongé d'un mois, reçu téléchargeable), rejet avec motif, double validation bloquée (409), état de test restauré

### Administration — Analytics & Croissance (18 juillet 2026) ✅

- [x] **Temps réel** : rafraîchissement silencieux automatique toutes les 20 s + badge « Temps réel · HH:MM:SS » + bouton Actualiser manuel
- [x] **Revenus** : cartes MRR/ARR/nouveau/churn/net (existant conservé) + **encaissé réel** par devise avec ventilation Abonnements/Réabonnements/Upgrades + **graphique des encaissements mensuels sur 12 mois** (un graphique par devise, jamais de double axe)
- [x] **Funnels multiples** (`GET /analytics/funnels`) : funnel **Abonnement** (inscription → onboarding → 1er message → abonné actif → plan payant), funnel **Upgrade** (actifs → demandes → approuvées), funnel **Paiements** (initiés → validés)
- [x] **Rétention réelle** (`GET /analytics/retention`) : taux de rétention abonnés, actifs 7 j / 30 j (≥ 1 message), et **cohortes mensuelles réelles sur 6 mois** (J+7/J+30/J+90 mesurés depuis la table messages) — remplace le tableau de cohortes factice « illustration »
- [x] **Usage des agents** (`GET /analytics/agents`) : carte par agent avec **état** (Opérationnel si activité < 48 h / Inactif), appels aujourd'hui / 7 j / 30 j, part d'usage, **tendance vs 30 j précédents**, dernière activité ; badges « le plus utilisé » / « le moins utilisé » ; **santé du moteur n8n** vérifiée en direct (ping de l'instance, badge opérationnel/injoignable)
- [x] Testé e2e : 3 funnels avec données réelles, cohortes mensuelles (mars 17 %, avril 0 %), agents (email 60 %, general 40 %), n8n détecté up

### Administration — Gestion des annonces (18 juillet 2026) ✅

- [x] **Ciblage individuel** : la cible « Utilisateur spécifique » avec recherche par nom/email s'ajoute aux cibles existantes (tous, par plan) — `POST /admin/announcements` accepte `userId`
- [x] **Bannière visible partout** : `AnnouncementBanner` déplacée dans le layout du dashboard (`/dashboard/*`) — les annonces apparaissent sur TOUTES les pages utilisateur (dashboard, chat, email, agenda…), plus seulement la page d'accueil, jusqu'à fermeture par l'utilisateur
- [x] **Style visuel réparé** : le type choisi par l'admin (Nouveauté violet / Promotion vert / Maintenance orange / Info bleu) était perdu (pas de colonne metadata) — toutes les bannières s'affichaient en bleu. Migration `add_notifications_metadata.sql` (exécutée) + type/cible stockés dans `notifications.metadata` et restitués à la bannière et à la liste admin
- [x] **Liste admin enrichie** : badge de cible (Tous / Plan X / Utilisateur spécifique) + type visuel corrigé + taux d'ouverture réel (le dismiss compte comme ouverture)
- [x] Testé e2e : broadcast à 8 utilisateurs, ciblage individuel (1 destinataire), bannière stylée côté utilisateur (promotion vert + maintenance orange), dismiss, statistiques d'ouverture 1/1, purge des données de test

### Administration — Support & Feedback (18 juillet 2026) ✅

- [x] **Traitement des tickets complet** : la route `POST /support/tickets/:id/reply` **manquait** (l'envoi de réponse échouait en 404 silencieux) — créée : la réponse est enregistrée (`admin_reply`), envoyée au client par **email + notification in-app**, et le ticket passe « En cours »
- [x] **Notification résolu / non résolu** : marquer un ticket « Résolu » notifie automatiquement le client (« ✓ votre demande est résolue », email + in-app) ; « Fermé » (non résolu) notifie avec un **motif optionnel** demandé à l'admin
- [x] **Retours & satisfaction réels** : les 👍/👎 laissés sur les réponses de Bouba n'étaient **jamais persistés** (état local uniquement) — table `user_feedback` (migration exécutée) + `POST /api/feedback` + câblage de `chatStore.setFeedback`. L'onglet « Feedbacks négatifs » devient **« Retours & satisfaction »** : taux de satisfaction global, bons/mauvais retours, 30 derniers jours, **satisfaction par agent** (barres 👍/👎), et liste des derniers retours classés Bon/Mauvais avec extrait de la réponse concernée
- [x] Bug corrigé : le brouillon Bouba des réponses support lisait `json.reply` (ancien format) → `json.output`
- [x] Testé e2e : ticket créé → réponse admin (enregistrée + notification) → résolution (notification « ✓ résolue ») → 3 feedbacks (2👍/1👎) → satisfaction 67 %, par agent (email 100 %, calendar 0 %) — données de test purgées

### Administration — Monitoring IA (18 juillet 2026) ✅

- [x] **Instrumentation réelle des requêtes IA** : table `ai_request_logs` (migration exécutée) alimentée par `/api/chat` et `/api/bouba/action` — durée n8n, succès/échec, extrait d'erreur, agent, source (y compris les timeouts > 50 s). Remplace les anciens « logs » qui étaient des agrégats toujours marqués success et les latences codées en dur
- [x] **Quotas** (`GET /monitoring/quotas`) : tableau par utilisateur — plan, utilisé/limite, **restant**, messages du jour, barre de consommation avec alerte « Épuisé », recherche
- [x] **Performances** (`GET /monitoring/performance`) : requêtes 7 j / 24 h, **temps de réponse moyen, P95, max**, erreurs et taux d'erreur, ventilation **par agent**, et liste des **dernières erreurs agents** (quand l'IA n'a pas su faire ce que l'utilisateur demandait — message exact renvoyé, utilisateur, horodatage)
- [x] **Logs n8n** (`GET /monitoring/n8n-logs`) : chaque requête vers le moteur — horodatage, utilisateur, agent, source, **durée colorée** (vert < 8 s, orange < 20 s, rouge au-delà), statut OK/Erreur, message d'erreur ; filtres par agent et par statut
- [x] **Temps réel** : rafraîchissement silencieux toutes les 15 s + badge horodaté
- [x] Testé e2e : 3 requêtes générées (2 succès email, 1 erreur calendar) → quotas (2/10000, 3 aujourd'hui), perfs (moy 458 ms, 33 % erreurs, ventilation par agent), logs filtrables — données de test purgées

### Administration — Tableau de bord (18 juillet 2026) ✅

- [x] **KPIs cliquables** liés aux pages : Utilisateurs (total/actifs/churn) → Utilisateurs, MRR/ARR → Facturation, Paiements Wave en attente → Paiements, Erreurs IA 24 h → Monitoring
- [x] **Actions rapides** : 8 tuiles avec **badges de compteurs en attente** (demandes d'upgrade, paiements Wave, tickets support, factures d'échéance, quotas épuisés — surlignées en orange quand une action est requise) + raccourcis Créer un client / Nouvelle annonce / Analytics. Le sous-titre du dashboard totalise les actions en attente
- [x] **Stats plans poussées** : répartition des utilisateurs par plan (barres, couleur fixe par plan), **abonnements payants actifs** (total + barre segmentée + détail par plan), **MRR par plan**
- [x] **Graphiques** : encaissements des 6 derniers mois (barres avec valeur au pic, lien vers Facturation) + derniers inscrits cliquables (→ fiche client)
- [x] **Temps réel** : rafraîchissement silencieux toutes les 30 s + badge horodaté
- [x] Backend : `/dashboard/stats` étendu (`pendingActions`, `subsByPlan`, répartition sur le total des utilisateurs) ; **raffinement renouvellements** : une facture d'échéance journalisée avec `email_sent=false` (clé Resend absente) reste comptée « à envoyer » et est **automatiquement retentée** dès que la clé est configurée
- [x] Testé e2e : 8 users (63 % starter / 25 % business / 13 % free), 3 abonnements actifs, MRR 39,60 €, 1 échéance en attente correctement détectée

### Administration — Paramètres (18 juillet 2026) ✅

- [x] **Quotas globaux** : édition du quota de messages de chaque plan avec **application automatique à tous les utilisateurs du plan** (`profiles.messages_limit` propagé — avant, seul le plan était modifié et les utilisateurs gardaient l'ancienne limite !) + **notification email et in-app de chaque utilisateur concerné**
- [x] **Gestion des plans en cartes** : jolies cartes pricing (nom, prix/mois, badge ★ Populaire, statut, nb d'abonnés, limite messages, liste des fonctionnalités avec ✓) — actions **Modifier** (nom, description, prix €, fonctionnalités ligne par ligne, limite, populaire unique), **Activer/Désactiver**, **Supprimer**. La suppression est **refusée (409) si des abonnés existent** ; suppression forcée = choix du **plan de migration** par l'admin → abonnés basculés (profil + abonnement + limite) et **notifiés par email**
- [x] **Gestion des applications** : nouveau catalogue `app_integrations` (migration exécutée, 8 apps seedées avec logos) — cartes avec logo, description, catégorie, **taux d'association** (x/y utilisateurs + %), **Activer/Désactiver** (une app désactivée disparaît de la page Connexions des utilisateurs via `GET /api/apps`), **Supprimer** avec refus si des utilisateurs sont connectés ; suppression forcée = **déconnexion des comptes + email informatif à chacun**
- [x] ~~Feature flags~~ **retirés de la page** (18/07) — Paramètres = 3 onglets : Quotas / Plans / Applications
- [x] **Catalogue autoritaire** (18/07) : le catalogue passe à 16 applications (toutes celles du frontend, id `drive`→`googledrive` corrigé). Une app **désactivée OU supprimée** disparaît de la page Connexions **et des menus de l'utilisateur** (sidebar desktop, sidebar mobile, barre du bas) via le hook partagé `useActiveApps` — Email masqué si Gmail ET Microsoft 365 indisponibles, Agenda↔calendar, Contacts↔contacts, Projets↔trello. Repli permissif si le catalogue est injoignable
- [x] Testé e2e : quota free 500→600 propagé au profil + 1 notifié puis restauré ; plan temporaire avec abonné → 409 puis migration forcée vers starter (limite resynchronisée) + notification ; taux Gmail 3/9 (33 %) ; toggle notion répercuté côté public ; suppression gmail refusée (3 connectés) ; suppression forcée d'une app de test → connexion supprimée + email — état intégralement restauré

### Administration — Bouba admin & Conversations (18 juillet 2026) ✅

- [x] **Bouba admin avec contexte business en direct** : quand un admin parle au widget Bouba, le backend injecte `admin_context` dans le payload n8n (utilisateurs total/actifs/nouveaux, MRR/ARR, actions en attente — upgrades/Wave/tickets/quotas épuisés —, santé IA 24 h, usage des agents 7 j ; cache 60 s). Bouba peut désormais réellement répondre aux questions de pilotage. **Sécurité vérifiée** : un utilisateur non-admin forçant `source=admin` ne reçoit rien (rôle vérifié côté serveur). Prompts rapides du widget admin alignés sur ces capacités
- [x] **Conversations — faux succès corrigé** : « Email individuel » et « Email broadcast » n'envoyaient **aucun email** (simple insertion de notifications in-app avec toast « Email envoyé » mensonger). Les deux envoient maintenant de **vrais emails Resend** (template Bouba'ia) + notification in-app, avec réponse honnête (`emailSent`, message explicite si la clé Resend manque)
- [x] **Bug corrigé** : le sélecteur de destinataire lisait `first_name`/`last_name` alors que l'API renvoie `firstName`/`lastName` → les noms étaient vides dans la liste déroulante
- [x] « Générer avec Bouba » (rédaction d'emails/notifications par IA) déjà fonctionnel — conservé
- [x] Testé e2e : contexte admin transmis à n8n (9 users, MRR 39,60 €, santé IA), refus pour un non-admin, email individuel avec réponse honnête, broadcast à 5 actifs — données de test purgées

### Paramètres utilisateur (18 juillet 2026) ✅

- [x] **Mon profil** : la route `POST /api/user/avatar` **manquait** (l'upload de photo échouait toujours) — créée (JPEG/PNG/WebP ≤ 2 Mo, stockée en data URL, photo rafraîchie immédiatement). Nouvelle section **« Mes transactions »** (historique des paiements avec statut Payé/En attente/Échoué). Les sections plan actuel + quota + infos perso + entreprise (logo, coordonnées) existaient et sont conservées
- [x] **Plan & Facturation — flux Wave complet** : QR code (chemin corrigé, il pointait vers `/assets/` non servi → image cassée), référence Wave obligatoire, **upload de la preuve de paiement obligatoire** (capture/reçu ≤ 5 Mo, colonne `upgrade_requests.proof`, migration exécutée), envoi en FormData. Après soumission : **email « paiement reçu, plan bientôt actif »** + notification in-app. **Non bloquant vérifié e2e** : le plan actuel et le statut d'abonnement restent strictement intacts pendant la validation
- [x] **Preuve consultable par l'admin** : `GET /admin/billing/upgrade-proof/:id`
- [x] **Support & Aide** : la réponse de l'admin (`admin_reply`) n'était **jamais renvoyée à l'utilisateur** — ajoutée au GET + encart « 💬 Réponse de l'équipe Bouba'ia » dans le détail du ticket
- [x] **Connexions** : filtrage apps actives (admin) + plan déjà en place (section précédente) — état associé/non associé déjà affiché
- [x] **Notifications** : liste des messages + préférences déjà branchées sur `/api/notifications` — conservées
- [x] Testé e2e : avatar en base, demande Wave avec preuve (pending, plan starter **intact**), preuve téléchargée intègre par l'admin, réponse support visible par l'utilisateur — état restauré

### À faire ⚠️

- [ ] **Exécuter manuellement** `api/migrations/dedupe_messages.sql` (dry-run SELECT inclus dans le fichier, transaction avec ROLLBACK possible)
- [ ] `n8nac pull` pour resynchroniser `workflows/` avec la v3.0 déployée (le fichier versionné reflète encore la v2.0)
- [ ] Dérouler la checklist manuelle ci-dessous sur l'environnement réel
- [ ] Outils admin n8n : non connectés en v3.0 (Bouba le dit) — chantier futur
- [ ] Multi-tenant Google : les credentials Gmail/Calendar du workflow sont ceux du compte n8n, pas ceux de l'utilisateur connecté — chantier futur

### Checklist manuelle (à cocher après test réel)

- [ ] Salutation (« salut ») → réponse < 8 s, sans template brut
- [ ] Question générale
- [ ] Recherche web (Tavily)
- [ ] Calcul
- [ ] Envoi email depuis le chat → visible dans Gmail Envoyés, confirmation seulement si succès
- [ ] Envoi email depuis la page Email (balises) → visible dans Gmail Envoyés
- [ ] Brouillon email (« rédige un mail... ») → affiché dans le composer, PAS envoyé
- [ ] Résumé des emails
- [ ] Création RDV (« réunion demain 15h avec Marc ») → visible Google Calendar + vue rafraîchie
- [ ] RDV récurrent (« standup chaque lundi 9h »)
- [ ] Modification RDV
- [ ] Disponibilités (« quand suis-je libre ? »)
- [ ] Ajout contact (« ajoute Alice Martin, alice@techcorp.com ») → visible sans refresh manuel
- [ ] Recherche contact
- [ ] Ajout dépense → transaction visible dans le tableau
- [ ] Ajout revenu (« j'ai reçu 500€ pour une presta le 10 juillet »)
- [ ] Rapport mensuel < 20 s
- [ ] Question finance (« est-ce que je dépense trop ? »)
- [ ] Quota dépassé → message 429 propre
- [ ] n8n éteint → mode démo clairement préfixé
- [ ] Timeout (> 50 s) → message d'erreur dédié, pas de faux succès

---

## PHASE 1 — Finalisation Technique (2–3 semaines)

### 1.1 Corrections critiques bloquantes

- [x] **Supprimer les fichiers cassés** : tous supprimés (corrupted, broken, -old, .bak, -fixed, doublons admin)
- [x] **Créer `.env.example`** avec toutes les variables documentées (frontend + backend) + `.gitignore` créé
- [ ] **Vérifier les migrations SQL** : exécuter `add_onboarding_columns.sql`, tester le schéma complet sur l'environnement de staging
- [x] **Routes admin** : TODO obsolète supprimé, routes déjà en place dans App.tsx
- [x] **Sécuriser les cookies** : httpOnly, secure, sameSite:strict — déjà en place dans auth.ts
- [x] **Forcer HTTPS** : header HSTS déjà en production dans server.ts

### 1.2 OAuth Google — finalisation

- [x] Callback frontend GoogleCallback.tsx — opérationnel
- [x] Stocker les tokens en base : useConnections.connect() branchée sur /api/connections/manage
- [x] Tester le flux complet bout-en-bout avec un vrai compte Google
- [x] Implémenter le refresh automatique des tokens expirés côté frontend

### 1.3 Email Agent — connexion réelle

- [x] Finaliser la synchronisation Gmail via l'API Google (lecture des emails)
- [x] Implémenter l'envoi d'email depuis l'interface
- [x] Connecter l'agent AI (via N8N ou Gemini direct) pour : résumé, tri, réponses suggérées
- [x] Tester sur un compte Gmail réel de bout en bout

### 1.4 Agents AI — activation N8N

- [x] Routing par agent dans `server.ts` : détection Email/Calendrier/Contacts/Finance et sélection du bon webhook N8N
- [x] Variables d'environnement par agent documentées dans `.env.example` (`N8N_EMAIL_WEBHOOK_URL`, `N8N_CALENDAR_WEBHOOK_URL`, `N8N_CONTACTS_WEBHOOK_URL`, `N8N_FINANCE_WEBHOOK_URL`)
- [x] Champ `agent` injecté dans chaque requête N8N pour que les workflows puissent filtrer
- [ ] Créer/activer les workflows N8N dans l'interface N8N pour chaque agent :
  - Agent Email : classification, résumé, brouillon de réponse
  - Agent Calendrier : suggestions de créneaux, détection conflits
  - Agent Contacts : enrichissement, regroupement smart
  - Agent Finance : catégorisation automatique, alertes budget
- [ ] Renseigner les 4 URLs webhook N8N dans le fichier `api/.env` en production
- [ ] Documenter chaque webhook N8N dans `WEBHOOK_DIRECT_GUIDE.md`

### 1.5 Emails transactionnels

Mail : contact.boubaia@realtechprint.com
Password : rQ2-J_TzngZr6BE

- [x] Intégrer Resend (`npm install resend` + `api/lib/email.ts` créé)
- [x] Email de bienvenue post-inscription (envoyé depuis `/api/auth/signup`)
- [ ] Email de confirmation d'adresse (nécessite un champ `email_verified` + flux de vérification)
- [x] Email de réinitialisation de mot de passe (endpoints `/forgot-password` + `/reset-password` + pages frontend)
- [x] Email de confirmation de paiement / reçu (envoyé depuis `stripe-webhook.ts` sur `checkout.session.completed`)
- [x] Email de changement de plan (envoyé depuis `stripe-webhook.ts` sur `customer.subscription.updated`)
- **À faire** : renseigner `RESEND_API_KEY=re_...` et `EMAIL_FROM=...` dans `api/.env`
- **Migration SQL** : exécuter `api/migrations/add_password_reset_tokens.sql` sur la base de données

---

## PHASE 2 — Expérience Utilisateur (1–2 semaines)

### 2.1 Onboarding guidé

- [ ] Écran post-inscription : choix des agents à activer
- [ ] Wizard de connexion Google (étape 1 : autoriser Gmail, Calendrier, Contacts)
- [ ] Tutoriel interactif du chat principal (tooltip + première conversation guidée)
- [ ] Checklist de démarrage visible dans le dashboard ("Complétez votre profil")

### 2.2 Améliorations UX critiques

- [ ] Page d'erreur 404 personnalisée avec navigation
- [ ] États de chargement cohérents (skeletons sur toutes les listes)
- [ ] Messages d'erreur utilisateur compréhensibles (pas de stack traces)
- [ ] Confirmation avant suppression de données (contacts, transactions)
- [ ] Raccourcis clavier pour le chat (Ctrl+Enter pour envoyer)

### 2.3 Notifications

- [ ] Notifications in-app fonctionnelles (le store `notificationStore` existe, brancher l'UI)
- [ ] Badge de notifications dans le header
- [ ] Centre de notifications (historique des alertes des agents)

---

## PHASE 3 — Stabilisation & Tests (1 semaine)

### 3.1 Tests

- [ ] Tester tous les flux de paiement Stripe (upgrade, downgrade, annulation, webhook)
- [ ] Tester les limites de quota par plan (messages/jour, fonctionnalités)
- [ ] Tester l'inscription → onboarding → utilisation premier agent (golden path)
- [ ] Tester sur mobile (iOS Safari, Android Chrome)
- [ ] Vérifier le comportement plan gratuit vs plan payant (feature flags)

### 3.2 Performance & SEO

- [ ] Lazy loading sur toutes les pages non-critiques (React.lazy)
- [ ] Optimiser les images du landing (WebP, compression)
- [ ] Ajouter les balises meta (title, description, OG tags) sur toutes les pages publiques
- [ ] Google Search Console : soumettre le sitemap
- [ ] Vérifier le score Lighthouse (viser >85 Performance, >90 SEO)

### 3.3 Déploiement production

- [ ] Configurer un domaine personnalisé (ex: boubaia.com ou boubaia.ai)
- [ ] SSL/HTTPS via Let's Encrypt ou Cloudflare
- [ ] Variables d'environnement production sécurisées (ne jamais commiter en git)
- [ ] CI/CD simple (GitHub Actions : build + deploy sur push main)
- [ ] Monitoring d'erreurs (Sentry ou équivalent)
- [ ] Backups automatiques base de données

---

## PHASE 4 — Commercialisation & Marketing (en parallèle dès Phase 2)

### 4.1 Positionnement & Offre

- [ ] Définir le persona principal : entrepreneur solo / freelance / TPE ?
- [ ] Rédiger la proposition de valeur en 1 phrase percutante
- [ ] Fixer les prix définitifs avec justification (comparer Notion AI, Zapier, ClickUp AI)
- [ ] Définir le contenu exact du plan gratuit (limite messages/jour, agents disponibles)
- [ ] Créer une page de pricing claire avec tableau comparatif des plans

### 4.2 Landing Page — optimisation conversion

- [ ] Hero section avec démonstration visuelle des agents (GIF ou vidéo 30s)
- [ ] Section "Avant / Après" : sans Bouba'ia vs avec Bouba'ia
- [ ] Témoignages clients (même fictifs au début pour valider le format)
- [ ] FAQ section (questions de pricing, sécurité, données, annulation)
- [ ] CTA clair : "Essayer gratuitement — aucune carte requise"
- [ ] Intégrer un outil de suivi conversions (Google Analytics 4 + Meta Pixel)

### 4.3 Acquisition — canaux organiques (0€)

- [ ] **LinkedIn** : créer une page entreprise Bouba'ia + posts réguliers (2–3/semaine)
  - Format : "J'ai géré ma semaine avec un assistant AI — voilà ce qui s'est passé"
  - Montrer des screenshots réels de l'app en action
- [ ] **Twitter/X** : compte produit + partage de tips IA pour entrepreneurs
- [ ] **Reddit** : partager sur r/entrepreneur, r/productivity, r/SideProject (en anglais), r/ArtificialIntelligence
- [ ] **YouTube Shorts / TikTok** : démonstrations courtes de l'app (30–60s)
- [ ] **Blog SEO** : 4 articles cibles minimum
  - "Comment automatiser ses emails avec l'IA en 2026"
  - "Meilleurs assistants AI pour entrepreneurs"
  - "Bouba'ia vs ChatGPT : lequel choisir pour gérer son business ?"
  - "Productivité IA : les 5 outils indispensables du freelance"

### 4.4 Acquisition — canaux payants (budget à définir)

- [ ] **Google Ads** : cibler "assistant IA email", "automatisation tâches IA", "AI assistant business"
- [ ] **Facebook/Instagram Ads** : cibler entrepreneurs 25–45 ans, freelances, auto-entrepreneurs
- [ ] **Product Hunt** : préparer un lancement (page, assets visuels, description, first comment)
- [ ] **Partenariats** : contacter des influenceurs tech/productivité (micro-influenceurs 5k–50k)

### 4.5 Rétention & Activation

- [ ] Séquence d'emails post-inscription (J+1 : "Avez-vous connecté Gmail ?", J+3 : "Voici ce que Bouba'ia a préparé pour vous", J+7 : "Comment ça se passe ?")
- [ ] Notification push web (demander permission après 2e connexion)
- [ ] Programme de parrainage : "Invitez un ami → 1 mois offert"
- [ ] NPS automatique à J+14 post-inscription

### 4.6 Validation précoce (avant lancement public)

- [ ] **Beta fermée** : recruter 20–50 testeurs via LinkedIn/réseau personnel
  - Critères : entrepreneurs, freelances, chefs de petites équipes
  - Durée : 2–3 semaines
  - Feedback via formulaire Typeform ou Google Form hebdomadaire
- [ ] Identifier les 3 fonctionnalités les plus utilisées → les mettre en avant sur la landing
- [ ] Identifier le principal blocage à l'inscription → le corriger avant lancement
- [ ] Recueillir 5 témoignages utilisateurs réels avec permission d'utilisation

### 4.7 Lancement officiel

- [ ] **Product Hunt** : lancer un lundi ou mardi, préparer 10+ upvoters le Jour J
- [ ] **Hacker News** : poster dans "Show HN" (en anglais)
- [ ] **Newsletter IA** : envoyer à The Rundown AI, TLDR AI, Ben's Bites pour revue
- [ ] **Press kit** : logo PNG/SVG, captures d'écran HD, description courte/longue, stats clés
- [ ] Email à 50+ contacts personnels le Jour J avec lien d'inscription

---

## PHASE 5 — Croissance Post-Lancement

### 5.1 Monétisation avancée

- [ ] Activer les paiements Wave (déjà dans le code, finaliser l'intégration)
- [ ] Offrir un plan annuel avec -20% de réduction
- [ ] Créer des add-ons payants (ex: +100 messages/mois, connexion Slack)
- [ ] Implémenter le tableau de bord de revenus dans l'admin (MRR, churn, LTV)

### 5.2 Fonctionnalités de croissance

- [ ] API développeur (plan Enterprise) avec clés d'API gérées
- [ ] Intégrations supplémentaires : Slack, Microsoft 365, Notion
- [ ] Mode white-label pour revendeurs B2B
- [ ] RAG / Recherche vectorielle (Pinecone) pour base de connaissance personnelle
- [ ] Application mobile native (React Native ou PWA améliorée)

### 5.3 Équipe & Opérations

- [ ] Mettre en place le support client (Crisp, Intercom ou chat Bouba'ia lui-même)
- [ ] Documentation utilisateur publique (Notion, GitBook ou mdBook)
- [ ] Processus de refund clair et automatisé via Stripe
- [ ] Dashboard admin : alertes automatiques si churn > seuil ou erreurs critiques

---

## Résumé des priorités immédiates (cette semaine)

| Priorité | Tâche | Impact |
|----------|-------|--------|
| 🔴 URGENT | Compléter OAuth Google + Gmail sync | Fonctionnalité cœur du produit |
| 🔴 URGENT | Activer les workflows N8N des agents | Sans ça, les agents sont des coquilles vides |
| 🟠 HAUTE | Emails transactionnels (bienvenue, reset password) | Indispensable pour la confiance |
| 🟠 HAUTE | Supprimer les fichiers corrompus et créer `.env.example` | Propreté du code + onboarding dev |
| 🟡 MOYENNE | Onboarding guidé post-inscription | Réduction du churn J+1 |
| 🟡 MOYENNE | Tests paiement Stripe complets | Éviter les bugs critiques en prod |
| 🟢 DÈS QUE POSSIBLE | Recruter 20 bêta-testeurs | Valider le produit avant dépenser en ads |
| 🟢 DÈS QUE POSSIBLE | Créer page LinkedIn + premiers posts | Construire l'audience avant le lancement |

---

## Stack de décision rapide

**Hébergement frontend :** Vercel (gratuit, CI/CD automatique)  
**Hébergement API :** VPS actuel `144.91.96.142` ou Railway/Render  
**Emails transactionnels :** Resend (gratuit jusqu'à 3000 emails/mois)  
**Analytics :** PostHog (open-source, RGPD-friendly)  
**Support client :** Crisp (gratuit jusqu'à 2 agents)  
**Blog SEO :** Ghost ou pages Markdown dans le projet  
**Landing page A/B tests :** Vercel Edge ou PostHog feature flags  

---

*Mise à jour de ce fichier à chaque fin de phase. Chaque case cochée = une fonctionnalité déployée en production, testée, ou une action marketing réalisée.*
