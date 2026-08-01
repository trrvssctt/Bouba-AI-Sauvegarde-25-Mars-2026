# TODO — Partie Admin Boubaia

> Dernière mise à jour : 26 avril 2026.
> État global : la partie admin est **majoritairement fonctionnelle** — toutes les pages de données majeures sont branchées sur des endpoints réels.

---

## ✅ COMPLÉTÉ — Session 26 avril 2026

- Routing en double supprimé (App.tsx — un seul ensemble de routes `/admin`)
- AdminLayout sidebar complète (toutes les pages listées)
- Page `/admin/customers/:id` existe (`CustomerDetailPage.tsx`)
- `DashboardPage` branchée sur `GET /api/admin/dashboard/stats`
- `AnnouncementsPage` branchée sur `GET/POST/DELETE /api/admin/announcements`
- `InvoicesPage` branchée sur `GET /api/admin/invoices`
- `PaymentsPage` branchée sur `GET /api/admin/billing/transactions`
- Colonnes manquantes ajoutées à `public.payments` (`payment_method`, `plan_id`, `description`, `approved_at`)
- Colonnes manquantes ajoutées à `public.subscriptions` (`payment_method`)
- Table `public.app_settings` créée en base
- `AdminSettingsPage` — Quotas : chargement depuis `GET /api/admin/settings/quotas` + sauvegarde via `PUT /api/admin/settings/quotas`
- `AdminSettingsPage` — Broadcast : appel réel sur `POST /api/admin/announcements` (cible tous les utilisateurs)
- `src/pages/admin/SettingsPage.tsx` (ancienne version) supprimée
- `GET /api/admin/support/nps` créé — calcule depuis `notification_feedback` (rating 5=promoteur, 4=passif, ≤3=détracteur)
- `AdminSupportPage` NPS : données réelles depuis l'API (plus de constantes hardcodées)
- `AdminSupportPage` "Générer avec Bouba" : appel réel à `/api/bouba/action` avec contexte du ticket
- `AdminMonitoringPage` "Analyser avec Bouba" : analyse les logs via Bouba + affichage dans un modal
- `AdminBillingPage` "Relancer via Bouba" : génère et envoie des notifications de relance aux impayés
- `AdminUserDetailPage` "Envoyer un email" : modal complet (objet + corps) → `/api/admin/notifications`

---

## 🟠 HAUTE PRIORITÉ

*(toutes les pages majeures sont désormais branchées)*

---

## 🟡 PRIORITÉ MOYENNE — Fonctionnalités incomplètes


### AdminMonitoringPage — Latence
- [ ] Créer `GET /api/admin/monitoring/latency` (P50/P95 réels depuis les logs n8n)
- [ ] Remplacer les valeurs hardcodées (DeepSeek P50=320ms, n8n P95=1200ms…) par données réelles


### CustomersPage — Actions
- [ ] Implémenter le bouton "Envoyer email" (actuellement `alert()`)
- [ ] Implémenter le bouton "Nouveau client" (aucun handler)
- [ ] Implémenter la pagination réelle (Previous/1/Next non fonctionnels)

---

## 🔵 FAIBLE PRIORITÉ — Améliorations & polish

### Exports CSV/PDF
- [ ] **DashboardPage** : Export du rapport mensuel (bouton Exporter CSV ✅ déjà implémenté)
- [ ] **AdminUsersPage** : Export de la liste des utilisateurs
- [ ] **AdminBillingPage** : Export des demandes d'upgrade / transactions

### AdminSettingsPage — Bouba Broadcast
- [ ] Implémenter le bouton "Rédiger avec Bouba" (actuellement `toast.info()`)
  - Modèle : `POST /api/bouba/action` avec contexte "rédige une annonce pour..."

### AdminAnalyticsPage — Cohortes de rétention
- [ ] Créer `GET /api/admin/analytics/cohorts` avec calcul réel de rétention J+7, J+30, J+90
- [ ] Remplacer les données fictives (note "Illustration — nécessite event tracking")
- [ ] Mettre en place l'event tracking nécessaire (`user_events` table ou similaire)

### Pagination server-side
- [ ] `AdminUsersPage` : Pagination server-side (actuellement limite à 500 rows)
- [ ] `AdminBillingPage` (transactions) : Pagination server-side (limite 200)
- [ ] `AdminConversationsPage` (historique) : Pagination

### Gestion des rôles Admin vs Superadmin
- [ ] Définir les permissions : Admin (lecture + approbations) vs Superadmin (tout + suppression + flags)
- [ ] Masquer/désactiver les actions destructives pour le rôle Admin

### Journal d'audit (Audit Log)
- [ ] Créer une table `admin_audit_log` en base
- [ ] Logger automatiquement : suspension compte, approbation upgrade, modification flags, broadcast envoyé
- [ ] Créer une page ou section "Journal d'audit" dans l'admin

### Alertes temps réel
- [ ] `AdminMonitoringPage` : Rafraîchissement automatique des logs (polling ou WebSocket)
- [ ] Notification dans la sidebar admin si quota d'un utilisateur > 90%

---

## 🛠️ CORRECTIONS TECHNIQUES

### Backend API — Bugs résiduels
- [ ] `GET /api/admin/monitoring/logs` : retourne `status='success'` pour toutes les lignes — brancher sur un vrai statut
- [ ] `GET /api/admin/support/feedbacks` : le champ `boubaResponse` est absent de la DB — l'UI affiche une section vide, à supprimer ou implémenter

---

## 📊 ÉTAT ACTUEL PAR PAGE

| Page | Complétude | API branchée | Bouba intégré | Priorité |
|------|:---------:|:------------:|:-------------:|----------|
| `AdminLayout` | ✅ 100% | — | ✅ | — |
| `AdminBillingPage` | ✅ 95% | ✅ | ⚠️ partiel | Moyenne |
| `AdminConversationsPage` | ✅ 95% | ✅ | ✅ | — |
| `AdminUsersPage` | ✅ 90% | ✅ | — | Basse |
| `AdminSettingsPage` | ✅ 90% | ✅ | ⚠️ partiel | Basse |
| `AdminAnalyticsPage` | 🟡 75% | ✅ | — | Basse |
| `AdminUserDetailPage` | ✅ 90% | ✅ | ⚠️ partiel | Basse |
| `AdminMonitoringPage` | ✅ 85% | ✅ | ✅ | Basse |
| `DashboardPage` | ✅ 90% | ✅ | — | — |
| `AnnouncementsPage` | ✅ 90% | ✅ | — | — |
| `InvoicesPage` | ✅ 90% | ✅ | — | — |
| `PaymentsPage` | ✅ 90% | ✅ | — | — |
| `CustomersPage` | ✅ 85% | ✅ | ❌ | Basse |
| `AdminSupportPage` | ✅ 90% | ✅ | ✅ | Basse |
