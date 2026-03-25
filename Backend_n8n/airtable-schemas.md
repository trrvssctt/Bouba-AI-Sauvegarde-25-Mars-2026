# Configuration Airtable pour Agents Bouba'ia

## 📋 Vue d'Ensemble

Votre workflow N8N nécessite 2 bases Airtable distinctes :
- **Base Finance** : `appbPZA132gTrGjty` (Gestion financière)
- **Base Contacts** : `appUgfSiGIPdCo3a7` (CRM)

## 💰 Base Finance (appbPZA132gTrGjty)

### Table 1: Revenus (tblG3A1btJqIeofQC)

```javascript
Champs obligatoires :
├── 📅 Date (Date) - Date de la transaction
├── 👤 Client (Single line text) - Nom du client
├── 💰 Montant (Currency - EUR) - Montant HT
├── 📊 Statut (Single select) - [Facturé, Payé, En attente, Annulé]
├── 🏷️ Catégorie (Single select) - [Consulting, Produit, Service, Formation, Autre]
├── 📝 Description (Long text) - Détails de la prestation
├── 🧾 TVA (Currency - EUR) - Montant de la TVA
├── 💳 Total TTC (Formula) - Montant + TVA
└── 🔗 Facture_ID (Single line text) - Référence facture
```

**Formule Total TTC :**
```javascript
{Montant} + {TVA}
```

### Table 2: Dépenses (tblinm2MCclT0BKPL)

```javascript  
Champs obligatoires :
├── 📅 Date (Date) - Date de la dépense
├── 🏪 Fournisseur (Single line text) - Nom du fournisseur
├── 💸 Montant (Currency - EUR) - Montant HT
├── 🏷️ Catégorie (Single select) - [Bureautique, Marketing, Transport, Formation, Logiciel, Autre]
├── 🧾 TVA (Currency - EUR) - TVA récupérable
├── 📄 Déductible (Checkbox) - Dépense déductible fiscalement
├── 📝 Description (Long text) - Détails de la dépense
├── 📎 Reçu (Attachment) - Justificatif
└── 💳 Total TTC (Formula) - Montant + TVA
```

**Formule Total TTC :**
```javascript
{Montant} + {TVA}
```

### Table 3: Rapports (tblQ5c8XAwokoL4kr)

```javascript
Champs obligatoires :
├── 📅 Période_Début (Date) - Date de début
├── 📅 Période_Fin (Date) - Date de fin  
├── 📊 Type_Rapport (Single select) - [Mensuel, Trimestriel, Annuel, Personnalisé]
├── 💰 Revenus_Total (Lookup/Formula) - Total des revenus sur la période
├── 💸 Dépenses_Total (Lookup/Formula) - Total des dépenses sur la période
├── 📈 Bénéfice_Net (Formula) - Revenus - Dépenses
├── 📊 Marge (Formula) - (Bénéfice/Revenus) * 100
├── 🔄 Statut (Single select) - [Brouillon, Finalisé, Envoyé]  
└── 📝 Notes (Long text) - Commentaires
```

**Formules Rapports :**
```javascript
// Bénéfice Net
{Revenus_Total} - {Dépenses_Total}

// Marge (%)  
IF({Revenus_Total} > 0, ROUND(({Bénéfice_Net} / {Revenus_Total}) * 100, 2), 0)
```

## 👥 Base Contacts (appUgfSiGIPdCo3a7)

### Table: Contacts (tblIbQegC18u6FI7i)

```javascript
Champs obligatoires :
├── 👤 Prénom (Single line text) - Prénom du contact
├── 👤 Nom (Single line text) - Nom de famille
├── 📧 Email (Email) - Adresse email principale  
├── 📱 Téléphone (Phone number) - Numéro de téléphone
├── 🏢 Entreprise (Single line text) - Nom de l'entreprise
├── 💼 Poste (Single line text) - Fonction/titre
├── 📍 Ville (Single line text) - Ville
├── 🌍 Pays (Single select) - [France, Belgique, Suisse, Canada, Autre]
├── 📊 Statut (Single select) - [Prospect, Client, Partenaire, Fournisseur, Ancien]
├── 🏷️ Tags (Multiple select) - [VIP, Newsletter, Formation, Consulting, Technique]
├── 📅 Première_Interaction (Date) - Date du premier contact
├── 📅 Dernière_Interaction (Date) - Date de dernière activité  
├── 💰 Valeur_Potentielle (Currency - EUR) - CA potentiel estimé
├── 🔗 LinkedIn (URL) - Profil LinkedIn
├── 🌐 Site_Web (URL) - Site de l'entreprise
└── 📝 Notes (Long text) - Notes diverses
```

### Vues Recommandées (Contacts)

```javascript
Vue "Clients Actifs" :
├── Filtre : Statut = "Client"
├── Tri : Dernière_Interaction (desc)
└── Couleur : Vert

Vue "Prospects Chauds" :  
├── Filtre : Statut = "Prospect" ET Valeur_Potentielle > 1000
├── Tri : Valeur_Potentielle (desc)  
└── Couleur : Orange

Vue "À Relancer" :
├── Filtre : Dernière_Interaction < (Aujourd'hui - 30 jours)
├── Tri : Dernière_Interaction (asc)
└── Couleur : Rouge
```

## 🔗 Configuration API Airtable

### 1. Obtenir les IDs requis

```bash
# Base Finance
Base ID: appbPZA132gTrGjty
├── Table Revenus: tblG3A1btJqIeofQC  
├── Table Dépenses: tblinm2MCclT0BKPL
└── Table Rapports: tblQ5c8XAwokoL4kr

# Base Contacts  
Base ID: appUgfSiGIPdCo3a7
└── Table Contacts: tblIbQegC18u6FI7i
```

### 2. Configuration des Permissions

```javascript
// Permissions requises pour l'API :
- data.records:read (lecture des données)
- data.records:write (création/modification)  
- schema.bases:read (lecture de la structure)

// Scopes par agent :
Finance Agent : appbPZA132gTrGjty (toutes tables)
Contact Agent : appUgfSiGIPdCo3a7 (table Contacts)  
```

## 🧪 Scripts de Test Airtable

### Test Connexion API

```bash
#!/bin/bash

AIRTABLE_API_KEY="your-api-key"
BASE_FINANCE="appbPZA132gTrGjty"  
BASE_CONTACTS="appUgfSiGIPdCo3a7"

# Test Finance
echo "Test Base Finance..."
curl -H "Authorization: Bearer $AIRTABLE_API_KEY" \
     "https://api.airtable.com/v0/$BASE_FINANCE/Revenus?maxRecords=1"

# Test Contacts
echo "Test Base Contacts..."  
curl -H "Authorization: Bearer $AIRTABLE_API_KEY" \
     "https://api.airtable.com/v0/$BASE_CONTACTS/Contacts?maxRecords=1"
```

### Test Insertion Données

```javascript
// Test Finance Agent - Ajout Revenu
{
  "fields": {
    "Date": "2024-02-27",
    "Client": "Client Test",  
    "Montant": 1500,
    "Statut": "Facturé",
    "Catégorie": "Consulting",
    "Description": "Test d'intégration API",
    "TVA": 300,  
    "Facture_ID": "F-2024-001"
  }
}

// Test Contact Agent - Ajout Contact
{
  "fields": {
    "Prénom": "Jean",
    "Nom": "Dupont",
    "Email": "jean.dupont@example.com",
    "Téléphone": "+33 1 23 45 67 89",
    "Entreprise": "Entreprise Test",
    "Poste": "Directeur",
    "Statut": "Prospect",
    "Tags": ["Newsletter", "Consulting"],
    "Première_Interaction": "2024-02-27",
    "Valeur_Potentielle": 5000
  }
}
```

## 📊 Automatisations Airtable Recommandées

### 1. Finance - Calcul TVA Automatique

```javascript
// Automation: Quand un montant est saisi
// Action: Calculer TVA (20% par défaut)
IF({TVA} = BLANK(), {Montant} * 0.20, {TVA})
```

### 2. Contacts - Mise à jour Dernière Interaction

```javascript  
// Automation: Quand un contact est modifié
// Action: Mettre à jour "Dernière_Interaction" = TODAY()
```

### 3. Rapports - Génération Automatique

```javascript
// Automation: Premier jour du mois
// Action: Créer rapport mensuel précédent
// Données: Somme revenus/dépenses du mois écoulé
```

## 🔧 Configuration N8N Airtable Nodes

### Finance Agent Configuration

```json
{
  "base": "appbPZA132gTrGjty",
  "tables": {
    "revenus": "tblG3A1btJqIeofQC",
    "dépenses": "tblinm2MCclT0BKPL", 
    "rapports": "tblQ5c8XAwokoL4kr"
  },
  "operations": ["search", "create", "update", "list"],
  "rateLimit": "5 req/sec"
}
```

### Contact Agent Configuration  

```json
{
  "base": "appUgfSiGIPdCo3a7",
  "tables": {
    "contacts": "tblIbQegC18u6FI7i"  
  },
  "operations": ["search", "create", "update", "list"],
  "defaultView": "Grid view",
  "maxRecords": 100
}
```

## 📋 Checklist Configuration

### Base Finance
- [ ] Base créée avec ID `appbPZA132gTrGjty`
- [ ] Table Revenus avec tous les champs
- [ ] Table Dépenses avec tous les champs  
- [ ] Table Rapports avec formules
- [ ] API Key configurée avec bonnes permissions
- [ ] Test insertion depuis N8N réussi

### Base Contacts  
- [ ] Base créée avec ID `appUgfSiGIPdCo3a7`
- [ ] Table Contacts avec tous les champs
- [ ] Vues filtrées créées
- [ ] Automatisations configurées
- [ ] Test recherche depuis N8N réussi

### Intégration N8N
- [ ] Credentials Airtable configurés dans N8N
- [ ] IDs de bases et tables vérifiés dans workflows
- [ ] Tous les agents testés individuellement
- [ ] Rate limiting respecté (5 req/sec)

Une fois ces configurations terminées, vos agents Finance et Contact seront pleinement fonctionnels ! 🚀