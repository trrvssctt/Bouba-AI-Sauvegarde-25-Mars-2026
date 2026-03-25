import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  ChevronLeft,
  Shield,
  Lock,
  Eye,
  FileText,
  Cookie,
  Scale,
  ChevronRight,
  ExternalLink,
  Mail,
  Building2,
  MapPin,
  Phone,
  Globe,
  AlertCircle,
  CheckCircle2,
  Info,
} from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'

type Tab = 'mentions' | 'confidentialite' | 'cgu' | 'cookies'

const TABS: { id: Tab; label: string; icon: typeof FileText; shortLabel: string }[] = [
  { id: 'mentions',       label: 'Mentions Légales',           icon: Building2,  shortLabel: 'Mentions' },
  { id: 'confidentialite', label: 'Politique de Confidentialité', icon: Shield,   shortLabel: 'Confidentialité' },
  { id: 'cgu',            label: 'CGU',                        icon: Scale,      shortLabel: 'CGU' },
  { id: 'cookies',        label: 'Politique de Cookies',       icon: Cookie,     shortLabel: 'Cookies' },
]

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="text-xl font-bold text-gray-900 border-l-4 border-blue-600 pl-4">{title}</h2>
      <div className="space-y-3 text-gray-700 leading-relaxed">{children}</div>
    </section>
  )
}

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h3 className="font-semibold text-gray-800">{title}</h3>
      <div className="text-gray-600 leading-relaxed">{children}</div>
    </div>
  )
}

function InfoBox({ type = 'info', children }: { type?: 'info' | 'warning' | 'success'; children: React.ReactNode }) {
  const styles = {
    info:    { bg: 'bg-blue-50 border-blue-200',   icon: <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" /> },
    warning: { bg: 'bg-amber-50 border-amber-200', icon: <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" /> },
    success: { bg: 'bg-green-50 border-green-200', icon: <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" /> },
  }
  const s = styles[type]
  return (
    <div className={`flex gap-3 p-4 rounded-xl border ${s.bg} text-sm`}>
      {s.icon}
      <div>{children}</div>
    </div>
  )
}

function TableRow({ label, value }: { label: string; value: string }) {
  return (
    <tr className="border-b border-gray-100 last:border-0">
      <td className="py-2 pr-4 font-medium text-gray-700 whitespace-nowrap w-1/3">{label}</td>
      <td className="py-2 text-gray-600">{value}</td>
    </tr>
  )
}

// ─── TAB: Mentions Légales ──────────────────────────────────────────────────

function MentionsLegales() {
  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Mentions Légales</h1>
        <p className="text-gray-500 text-sm">Conformément aux articles 6-III et 19 de la Loi n° 2004-575 du 21 juin 2004 pour la Confiance dans l'Économie Numérique (LCEN)</p>
      </div>

      <Section title="1. Éditeur du site">
        <div className="bg-gray-50 rounded-xl overflow-hidden border border-gray-200">
          <table className="w-full text-sm">
            <tbody>
              <TableRow label="Raison sociale"     value="BOUBA'IA SAS" />
              <TableRow label="Forme juridique"    value="Société par Actions Simplifiée (SAS)" />
              <TableRow label="Capital social"     value="10 000 €" />
              <TableRow label="SIRET"              value="XXX XXX XXX 00000 (en cours d'enregistrement)" />
              <TableRow label="RCS"                value="Paris XXX XXX XXX" />
              <TableRow label="N° TVA Intracommunautaire" value="FR XX XXX XXX XXX" />
              <TableRow label="Siège social"       value="75008 Paris, France" />
              <TableRow label="Email"              value="contact@bouba-ia.com" />
              <TableRow label="Téléphone"          value="+33 (0)1 XX XX XX XX" />
            </tbody>
          </table>
        </div>
        <div className="flex items-start gap-3 text-sm text-gray-600">
          <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
          <span>Siège social : 75008 Paris, France</span>
        </div>
      </Section>

      <Section title="2. Directeur de la publication">
        <p>Le directeur de la publication est le Président de BOUBA'IA SAS.</p>
        <p>Contact : <a href="mailto:direction@bouba-ia.com" className="text-blue-600 hover:underline">direction@bouba-ia.com</a></p>
      </Section>

      <Section title="3. Hébergement">
        <div className="bg-gray-50 rounded-xl overflow-hidden border border-gray-200">
          <table className="w-full text-sm">
            <tbody>
              <TableRow label="Hébergeur"       value="Supabase Inc." />
              <TableRow label="Adresse"         value="970 Toa Payoh North, Singapore 318992" />
              <TableRow label="Site web"        value="supabase.com" />
              <TableRow label="Région des données" value="Europe de l'Ouest (Frankfurt, DE)" />
            </tbody>
          </table>
        </div>
        <div className="bg-gray-50 rounded-xl overflow-hidden border border-gray-200 mt-4">
          <table className="w-full text-sm">
            <tbody>
              <TableRow label="Serveur API"     value="Render Inc. / Railway App" />
              <TableRow label="CDN & Frontend"  value="Vercel Inc. — 340 S Lemon Ave #4133, Walnut, CA 91789, USA" />
              <TableRow label="IA (LLM)"        value="Anthropic PBC — 548 Market St, PMB 90375, San Francisco, CA 94104, USA" />
              <TableRow label="Automatisation"  value="n8n GmbH — Urbanstr. 71, 10967 Berlin, Germany" />
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="4. Propriété intellectuelle">
        <p>
          L'ensemble du contenu du site <strong>bouba-ia.com</strong> (textes, graphismes, logotypes, icônes, sons, logiciels…) est la propriété exclusive de BOUBA'IA SAS ou de ses partenaires et est protégé par les lois françaises et internationales relatives à la propriété intellectuelle.
        </p>
        <p>
          Toute reproduction, représentation, modification, publication ou adaptation de tout ou partie des éléments du site, quel que soit le moyen ou le procédé utilisé, est interdite sauf autorisation écrite préalable de BOUBA'IA SAS.
        </p>
        <InfoBox type="warning">
          Toute exploitation non autorisée du site ou de l'un quelconque des éléments qu'il contient sera considérée comme constitutive d'une contrefaçon et poursuivie conformément aux dispositions des articles L.335-2 et suivants du Code de Propriété Intellectuelle.
        </InfoBox>
      </Section>

      <Section title="5. Marques">
        <p>
          <strong>Bouba'ia</strong>, le logo Bouba'ia et les autres marques figurant sur le site sont des marques déposées ou en cours de dépôt de BOUBA'IA SAS. Toute utilisation sans autorisation préalable écrite est interdite.
        </p>
      </Section>

      <Section title="6. Liens hypertextes">
        <p>
          Le site peut contenir des liens vers des sites tiers. BOUBA'IA SAS n'exerce aucun contrôle sur ces sites et décline toute responsabilité quant à leur contenu, leurs pratiques en matière de données personnelles ou leur disponibilité.
        </p>
        <p>
          La création de liens hypertextes vers le site est autorisée sans accord préalable, sous réserve que les pages ne soient pas présentées dans un cadre (frame) et que la source soit clairement indiquée.
        </p>
      </Section>

      <Section title="7. Droit applicable et juridiction compétente">
        <p>
          Les présentes mentions légales sont régies par le droit français. En cas de litige, les tribunaux compétents sont ceux du ressort du siège social de BOUBA'IA SAS, sous réserve des règles d'ordre public ou impératives contraires.
        </p>
      </Section>

      <Section title="8. Contact">
        <div className="flex flex-col gap-3">
          <a href="mailto:legal@bouba-ia.com" className="flex items-center gap-2 text-blue-600 hover:underline">
            <Mail className="w-4 h-4" /> legal@bouba-ia.com
          </a>
          <a href="https://bouba-ia.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-blue-600 hover:underline">
            <Globe className="w-4 h-4" /> bouba-ia.com
          </a>
        </div>
      </Section>
    </div>
  )
}

// ─── TAB: Politique de Confidentialité ─────────────────────────────────────

function Confidentialite() {
  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Politique de Confidentialité</h1>
        <p className="text-gray-500 text-sm">Dernière mise à jour : 18 mars 2026 — Conforme au RGPD (Règlement UE 2016/679)</p>
      </div>

      <InfoBox type="success">
        <strong>Engagement BOUBA'IA</strong> : Nous ne vendons jamais vos données personnelles à des tiers. Vos données vous appartiennent et sont utilisées uniquement pour vous fournir le service.
      </InfoBox>

      <Section title="1. Responsable du traitement">
        <p>
          Le responsable du traitement de vos données personnelles est :<br />
          <strong>BOUBA'IA SAS</strong>, société par actions simplifiée au capital de 10 000 €<br />
          Siège social : 75008 Paris, France<br />
          Email DPO : <a href="mailto:dpo@bouba-ia.com" className="text-blue-600 hover:underline">dpo@bouba-ia.com</a>
        </p>
      </Section>

      <Section title="2. Données collectées et finalités">
        <SubSection title="2.1 Données d'inscription et de compte">
          <ul className="list-disc pl-5 space-y-1 text-sm">
            <li><strong>Prénom, nom</strong> — personnalisation de l'interface</li>
            <li><strong>Adresse e-mail</strong> — authentification, communications de service</li>
            <li><strong>Mot de passe haché (bcrypt)</strong> — sécurité du compte</li>
            <li><strong>Plan d'abonnement</strong> — gestion des accès et facturation</li>
            <li><strong>Date d'inscription</strong> — gestion du compte</li>
          </ul>
          <p className="text-sm mt-2"><strong>Base légale :</strong> Exécution du contrat (art. 6.1.b RGPD)</p>
        </SubSection>

        <SubSection title="2.2 Données de connexion tierce (OAuth)">
          <ul className="list-disc pl-5 space-y-1 text-sm">
            <li><strong>Token OAuth Google</strong> — accès Gmail et Google Calendar avec votre consentement explicite</li>
            <li><strong>Adresse e-mail Google</strong> — vérification de l'identité</li>
            <li><strong>Périmètre d'accès accordé</strong> — journalisé pour audit</li>
          </ul>
          <p className="text-sm mt-2"><strong>Base légale :</strong> Consentement (art. 6.1.a RGPD) — révocable à tout moment</p>
        </SubSection>

        <SubSection title="2.3 Données de contenu (générées par vous)">
          <ul className="list-disc pl-5 space-y-1 text-sm">
            <li><strong>Historique de conversations</strong> — amélioration de la continuité de l'assistant</li>
            <li><strong>Contacts CRM</strong> — gestion de vos relations</li>
            <li><strong>Documents financiers</strong> — facturation, devis, rapports</li>
            <li><strong>Événements agenda</strong> — synchronisation Google Calendar</li>
          </ul>
          <p className="text-sm mt-2"><strong>Base légale :</strong> Exécution du contrat (art. 6.1.b RGPD)</p>
        </SubSection>

        <SubSection title="2.4 Données de navigation">
          <ul className="list-disc pl-5 space-y-1 text-sm">
            <li><strong>Adresse IP</strong> — sécurité, lutte contre la fraude</li>
            <li><strong>Logs d'accès serveur</strong> — conservation 30 jours, débogage</li>
            <li><strong>Type de navigateur / OS</strong> — optimisation UX</li>
          </ul>
          <p className="text-sm mt-2"><strong>Base légale :</strong> Intérêt légitime (art. 6.1.f RGPD)</p>
        </SubSection>
      </Section>

      <Section title="3. Durée de conservation">
        <div className="bg-gray-50 rounded-xl overflow-hidden border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="text-left py-2 px-4 font-semibold text-gray-700">Catégorie</th>
                <th className="text-left py-2 px-4 font-semibold text-gray-700">Durée</th>
                <th className="text-left py-2 px-4 font-semibold text-gray-700">Motif</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <tr><td className="py-2 px-4">Données de compte actif</td><td className="py-2 px-4">Durée du contrat</td><td className="py-2 px-4">Exécution du service</td></tr>
              <tr><td className="py-2 px-4">Données après résiliation</td><td className="py-2 px-4">30 jours</td><td className="py-2 px-4">Réactivation possible</td></tr>
              <tr><td className="py-2 px-4">Données de facturation</td><td className="py-2 px-4">10 ans</td><td className="py-2 px-4">Obligation légale comptable</td></tr>
              <tr><td className="py-2 px-4">Logs serveur</td><td className="py-2 px-4">30 jours</td><td className="py-2 px-4">Sécurité</td></tr>
              <tr><td className="py-2 px-4">Tokens OAuth</td><td className="py-2 px-4">Jusqu'à révocation</td><td className="py-2 px-4">Fonctionnement du service</td></tr>
              <tr><td className="py-2 px-4">Historique conversations</td><td className="py-2 px-4">2 ans ou suppression utilisateur</td><td className="py-2 px-4">Continuité de l'assistant</td></tr>
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="4. Partage avec des tiers">
        <p>Vos données peuvent être transmises aux sous-traitants suivants, dans le strict cadre de la fourniture du service :</p>
        <div className="bg-gray-50 rounded-xl overflow-hidden border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="text-left py-2 px-4 font-semibold text-gray-700">Sous-traitant</th>
                <th className="text-left py-2 px-4 font-semibold text-gray-700">Finalité</th>
                <th className="text-left py-2 px-4 font-semibold text-gray-700">Localisation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <tr><td className="py-2 px-4 font-medium">Supabase</td><td className="py-2 px-4">Base de données, authentification</td><td className="py-2 px-4">🇩🇪 Europe (Frankfurt)</td></tr>
              <tr><td className="py-2 px-4 font-medium">Anthropic (Claude)</td><td className="py-2 px-4">Traitement IA des requêtes</td><td className="py-2 px-4">🇺🇸 USA (DPA signé)</td></tr>
              <tr><td className="py-2 px-4 font-medium">Google LLC</td><td className="py-2 px-4">OAuth, Gmail, Calendar (si activé)</td><td className="py-2 px-4">🇺🇸 USA (clauses SCC)</td></tr>
              <tr><td className="py-2 px-4 font-medium">n8n GmbH</td><td className="py-2 px-4">Automatisation des workflows</td><td className="py-2 px-4">🇩🇪 Berlin, Allemagne</td></tr>
              <tr><td className="py-2 px-4 font-medium">Stripe</td><td className="py-2 px-4">Paiement (données bancaires non stockées)</td><td className="py-2 px-4">🇺🇸 USA (certifié PCI DSS)</td></tr>
            </tbody>
          </table>
        </div>
        <InfoBox type="info">
          Aucune donnée n'est vendue à des annonceurs ou des partenaires commerciaux. Tous nos sous-traitants sont liés par un accord de traitement des données (DPA) conforme au RGPD.
        </InfoBox>
      </Section>

      <Section title="5. Transferts internationaux">
        <p>
          Certains sous-traitants (Anthropic, Google, Stripe) sont établis aux États-Unis. Ces transferts sont encadrés par :
        </p>
        <ul className="list-disc pl-5 space-y-1 text-sm">
          <li>Les <strong>Clauses Contractuelles Types (SCCs)</strong> approuvées par la Commission européenne</li>
          <li>Le <strong>Data Privacy Framework UE-USA</strong> pour les entités certifiées</li>
          <li>Des <strong>garanties contractuelles supplémentaires</strong> selon les cas</li>
        </ul>
      </Section>

      <Section title="6. Vos droits (RGPD)">
        <p>Conformément au RGPD, vous disposez des droits suivants :</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { title: '📋 Droit d\'accès', desc: 'Obtenir une copie de toutes vos données personnelles.' },
            { title: '✏️ Droit de rectification', desc: 'Corriger toute donnée inexacte ou incomplète.' },
            { title: '🗑️ Droit à l\'effacement', desc: 'Demander la suppression de vos données (droit à l\'oubli).' },
            { title: '⏸️ Droit à la limitation', desc: 'Restreindre le traitement dans certaines conditions.' },
            { title: '📦 Droit à la portabilité', desc: 'Recevoir vos données dans un format structuré et lisible par machine.' },
            { title: '🚫 Droit d\'opposition', desc: 'Vous opposer au traitement basé sur l\'intérêt légitime.' },
            { title: '↩️ Retrait du consentement', desc: 'Révoquer à tout moment un consentement donné, sans effet rétroactif.' },
            { title: '⚖️ Droit de réclamation', desc: 'Introduire une réclamation auprès de la CNIL (cnil.fr).' },
          ].map((r) => (
            <div key={r.title} className="bg-gray-50 border border-gray-200 rounded-xl p-3">
              <p className="font-semibold text-sm text-gray-800 mb-1">{r.title}</p>
              <p className="text-xs text-gray-600">{r.desc}</p>
            </div>
          ))}
        </div>
        <InfoBox type="info">
          Pour exercer vos droits, contactez notre DPO à <a href="mailto:dpo@bouba-ia.com" className="text-blue-600 font-medium hover:underline">dpo@bouba-ia.com</a>. Nous répondons sous 30 jours. Une pièce d'identité peut être demandée pour les demandes sensibles.
        </InfoBox>
      </Section>

      <Section title="7. Sécurité des données">
        <p>Nous mettons en œuvre des mesures techniques et organisationnelles adaptées :</p>
        <ul className="list-disc pl-5 space-y-1 text-sm">
          <li><strong>Chiffrement en transit :</strong> TLS 1.3 sur toutes les communications</li>
          <li><strong>Chiffrement au repos :</strong> AES-256 pour les données sensibles (tokens, mots de passe)</li>
          <li><strong>Authentification :</strong> Mots de passe hachés avec bcrypt (coût ≥ 12), 2FA disponible</li>
          <li><strong>Contrôle d'accès :</strong> Principe du moindre privilège, Row-Level Security (RLS) Supabase</li>
          <li><strong>Audits :</strong> Logs d'accès, détection d'anomalies, revue trimestrielle</li>
          <li><strong>Notification de violation :</strong> Notification CNIL sous 72h, utilisateurs concernés notifiés sans délai</li>
        </ul>
      </Section>

      <Section title="8. Mineurs">
        <p>
          Le service BOUBA'IA est destiné exclusivement aux personnes âgées de <strong>18 ans ou plus</strong>. Nous ne collectons pas sciemment de données concernant des mineurs. Si vous avez connaissance qu'un mineur nous a fourni des données personnelles, contactez-nous immédiatement à <a href="mailto:dpo@bouba-ia.com" className="text-blue-600 hover:underline">dpo@bouba-ia.com</a>.
        </p>
      </Section>

      <Section title="9. Modifications de la politique">
        <p>
          Nous nous réservons le droit de modifier la présente politique. Toute modification substantielle vous sera notifiée par e-mail ou par une bannière visible dans l'application au moins <strong>14 jours avant</strong> son entrée en vigueur. L'utilisation continue du service après cette date vaut acceptation.
        </p>
      </Section>

      <Section title="10. Contact DPO">
        <p>Pour toute question relative à vos données personnelles :</p>
        <div className="flex flex-col gap-2 text-sm">
          <a href="mailto:dpo@bouba-ia.com" className="flex items-center gap-2 text-blue-600 hover:underline"><Mail className="w-4 h-4" /> dpo@bouba-ia.com</a>
          <span className="flex items-center gap-2 text-gray-600"><Building2 className="w-4 h-4" /> DPO — BOUBA'IA SAS, 75008 Paris, France</span>
        </div>
        <p className="text-sm text-gray-500 mt-2">
          Autorité de contrôle compétente : <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-1">CNIL — Commission Nationale de l'Informatique et des Libertés <ExternalLink className="w-3 h-3" /></a>
        </p>
      </Section>
    </div>
  )
}

// ─── TAB: CGU ───────────────────────────────────────────────────────────────

function CGU() {
  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Conditions Générales d'Utilisation</h1>
        <p className="text-gray-500 text-sm">En vigueur au 18 mars 2026 — Version 1.0</p>
      </div>

      <InfoBox type="info">
        En créant un compte ou en utilisant BOUBA'IA, vous acceptez sans réserve les présentes CGU. Si vous n'acceptez pas ces conditions, n'utilisez pas le service.
      </InfoBox>

      <Section title="1. Objet et champ d'application">
        <p>
          Les présentes Conditions Générales d'Utilisation (CGU) régissent l'accès et l'utilisation de la plateforme <strong>BOUBA'IA</strong>, accessible à l'adresse <strong>bouba-ia.com</strong>, éditée par BOUBA'IA SAS.
        </p>
        <p>
          BOUBA'IA est un assistant IA exécutif qui permet à ses utilisateurs de gérer leurs emails, calendrier, contacts et finances via une interface conversationnelle basée sur l'intelligence artificielle.
        </p>
      </Section>

      <Section title="2. Inscription et compte utilisateur">
        <SubSection title="2.1 Conditions d'inscription">
          <ul className="list-disc pl-5 space-y-1 text-sm">
            <li>Être une personne physique âgée d'au moins <strong>18 ans</strong> ou une personne morale légalement constituée</li>
            <li>Fournir des informations exactes, complètes et à jour lors de l'inscription</li>
            <li>Disposer d'une adresse e-mail valide</li>
            <li>Accepter les présentes CGU et la Politique de Confidentialité</li>
          </ul>
        </SubSection>
        <SubSection title="2.2 Sécurité du compte">
          <p className="text-sm">
            Vous êtes seul responsable de la confidentialité de vos identifiants de connexion. Toute utilisation du service via votre compte est présumée effectuée par vous. En cas de suspicion d'accès non autorisé, contactez immédiatement <a href="mailto:security@bouba-ia.com" className="text-blue-600 hover:underline">security@bouba-ia.com</a>.
          </p>
        </SubSection>
        <SubSection title="2.3 Compte unique">
          <p className="text-sm">Chaque utilisateur ne peut détenir qu'un seul compte personnel. La création de comptes multiples pour contourner les limitations est interdite et peut entraîner la suppression de tous les comptes concernés.</p>
        </SubSection>
      </Section>

      <Section title="3. Description du service">
        <p>BOUBA'IA propose les fonctionnalités suivantes, selon le plan souscrit :</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          {[
            { icon: '💬', title: 'Chat IA', desc: 'Conversations en langage naturel avec l\'assistant Bouba.' },
            { icon: '📧', title: 'Gestion Email', desc: 'Lecture, rédaction et envoi d\'emails via Gmail OAuth.' },
            { icon: '📅', title: 'Agenda', desc: 'Synchronisation et gestion Google Calendar.' },
            { icon: '👥', title: 'CRM Contacts', desc: 'Gestion de carnet d\'adresses et relations clients.' },
            { icon: '💰', title: 'Finance', desc: 'Factures, devis, bons de commande, rapports.' },
            { icon: '🔗', title: 'Intégrations', desc: 'Connexion à Google Workspace et services tiers.' },
          ].map((f) => (
            <div key={f.title} className="flex gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
              <span className="text-xl">{f.icon}</span>
              <div>
                <p className="font-semibold text-gray-800">{f.title}</p>
                <p className="text-gray-600 text-xs">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
        <InfoBox type="warning">
          BOUBA'IA est un assistant IA. Ses réponses peuvent contenir des erreurs. Ne prenez pas de décisions financières, juridiques ou médicales importantes en vous basant uniquement sur les réponses de l'assistant sans vérification préalable.
        </InfoBox>
      </Section>

      <Section title="4. Abonnements et tarification">
        <SubSection title="4.1 Plans disponibles">
          <div className="bg-gray-50 rounded-xl overflow-hidden border border-gray-200">
            <table className="w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="text-left py-2 px-4 font-semibold text-gray-700">Plan</th>
                  <th className="text-left py-2 px-4 font-semibold text-gray-700">Messages/mois</th>
                  <th className="text-left py-2 px-4 font-semibold text-gray-700">Fonctionnalités</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr><td className="py-2 px-4 font-medium">Starter</td><td className="py-2 px-4">100</td><td className="py-2 px-4">Chat, Email basique</td></tr>
                <tr><td className="py-2 px-4 font-medium">Pro</td><td className="py-2 px-4">1 000</td><td className="py-2 px-4">Toutes fonctionnalités</td></tr>
                <tr><td className="py-2 px-4 font-medium">Enterprise</td><td className="py-2 px-4">Illimité</td><td className="py-2 px-4">Toutes fonctionnalités + API + support dédié</td></tr>
              </tbody>
            </table>
          </div>
        </SubSection>
        <SubSection title="4.2 Facturation">
          <ul className="list-disc pl-5 space-y-1 text-sm">
            <li>Les abonnements sont facturés <strong>mensuellement ou annuellement</strong> selon votre choix, en euros TTC</li>
            <li>Le paiement est traité de manière sécurisée par <strong>Stripe</strong></li>
            <li>En cas d'échec de paiement, le compte est suspendu après un délai de grâce de <strong>7 jours</strong></li>
            <li>Les prix peuvent être modifiés avec un préavis de <strong>30 jours</strong></li>
          </ul>
        </SubSection>
        <SubSection title="4.3 Rétractation et remboursement">
          <p className="text-sm">
            Conformément à l'article L.221-18 du Code de la Consommation, vous bénéficiez d'un droit de rétractation de <strong>14 jours</strong> à compter de la souscription, sauf si vous avez commencé à utiliser le service (accès immédiat). Aucun remboursement prorata temporis n'est accordé en cas de résiliation en cours de période.
          </p>
        </SubSection>
      </Section>

      <Section title="5. Obligations et responsabilités de l'utilisateur">
        <p>Vous vous engagez à :</p>
        <ul className="list-disc pl-5 space-y-1 text-sm">
          <li>Utiliser le service conformément aux lois applicables et aux présentes CGU</li>
          <li>Ne pas tenter de contourner les mesures de sécurité ou d'accéder à des ressources non autorisées</li>
          <li>Ne pas utiliser le service pour des activités illégales, frauduleuses, diffamatoires ou portant atteinte aux droits de tiers</li>
          <li>Ne pas transmettre de virus, malware ou contenu nuisible</li>
          <li>Ne pas utiliser le service pour du spam, phishing ou harcèlement</li>
          <li>Ne pas scraper, indexer ou aspirer le contenu de la plateforme par des moyens automatisés</li>
          <li>Ne pas sous-louer, revendre ou exploiter commercialement le service sans accord écrit</li>
          <li>Signaler toute vulnérabilité de sécurité découverte via <a href="mailto:security@bouba-ia.com" className="text-blue-600 hover:underline">security@bouba-ia.com</a></li>
        </ul>
        <InfoBox type="warning">
          Toute violation des présentes CGU peut entraîner la suspension ou la résiliation immédiate du compte, sans remboursement, et des poursuites judiciaires si nécessaire.
        </InfoBox>
      </Section>

      <Section title="6. Propriété intellectuelle et licence">
        <SubSection title="6.1 Droits de BOUBA'IA SAS">
          <p className="text-sm">L'ensemble des éléments de la plateforme (code, design, algorithmes, documentation, marques) sont la propriété exclusive de BOUBA'IA SAS et sont protégés par le droit de la propriété intellectuelle.</p>
        </SubSection>
        <SubSection title="6.2 Licence accordée à l'utilisateur">
          <p className="text-sm">BOUBA'IA SAS vous accorde une licence personnelle, non exclusive, non transférable et révocable pour utiliser la plateforme dans le cadre de votre abonnement.</p>
        </SubSection>
        <SubSection title="6.3 Contenu utilisateur">
          <p className="text-sm">Vous conservez l'intégralité de vos droits sur le contenu que vous soumettez (messages, documents, contacts). Vous accordez à BOUBA'IA SAS une licence limitée, non exclusive, pour traiter ce contenu dans le seul but de vous fournir le service.</p>
        </SubSection>
      </Section>

      <Section title="7. Disponibilité et niveau de service (SLA)">
        <div className="bg-gray-50 rounded-xl overflow-hidden border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="text-left py-2 px-4 font-semibold text-gray-700">Plan</th>
                <th className="text-left py-2 px-4 font-semibold text-gray-700">Disponibilité cible</th>
                <th className="text-left py-2 px-4 font-semibold text-gray-700">Support</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <tr><td className="py-2 px-4">Starter</td><td className="py-2 px-4">99 %</td><td className="py-2 px-4">Email, 5 jours ouvrés</td></tr>
              <tr><td className="py-2 px-4">Pro</td><td className="py-2 px-4">99,5 %</td><td className="py-2 px-4">Email, 2 jours ouvrés</td></tr>
              <tr><td className="py-2 px-4">Enterprise</td><td className="py-2 px-4">99,9 %</td><td className="py-2 px-4">Dédié, 4h ouvrées</td></tr>
            </tbody>
          </table>
        </div>
        <p className="text-sm text-gray-500">Les maintenances planifiées sont annoncées 48h à l'avance. BOUBA'IA SAS ne peut être tenu responsable des interruptions dues à des tiers (AWS, Google, Anthropic).</p>
      </Section>

      <Section title="8. Limitation de responsabilité">
        <p className="text-sm">
          Dans les limites autorisées par la loi applicable, BOUBA'IA SAS ne pourra être tenu responsable des dommages indirects, consécutifs, spéciaux ou punitifs, y compris la perte de profits, de données ou de revenus, résultant de l'utilisation ou de l'impossibilité d'utiliser le service.
        </p>
        <p className="text-sm">
          La responsabilité totale de BOUBA'IA SAS pour tout préjudice direct est limitée aux sommes effectivement payées par l'utilisateur au cours des <strong>3 derniers mois</strong> précédant l'événement générateur du dommage.
        </p>
        <InfoBox type="warning">
          BOUBA'IA utilise des modèles d'IA générative. Les réponses peuvent contenir des inexactitudes. L'utilisateur reste seul responsable des décisions prises sur la base des réponses de l'assistant.
        </InfoBox>
      </Section>

      <Section title="9. Résiliation">
        <SubSection title="9.1 Par l'utilisateur">
          <p className="text-sm">Vous pouvez résilier votre abonnement à tout moment depuis les Paramètres de votre compte. La résiliation prend effet à la fin de la période de facturation en cours. Vos données sont conservées 30 jours puis définitivement supprimées.</p>
        </SubSection>
        <SubSection title="9.2 Par BOUBA'IA SAS">
          <p className="text-sm">BOUBA'IA SAS peut suspendre ou résilier votre compte en cas de violation des CGU, de non-paiement (après 7 jours de grâce), de comportement frauduleux ou sur décision judiciaire. En cas de résiliation pour cause légitime non imputable à l'utilisateur, un remboursement prorata peut être accordé.</p>
        </SubSection>
      </Section>

      <Section title="10. Modifications des CGU">
        <p>
          BOUBA'IA SAS se réserve le droit de modifier les présentes CGU. Les modifications substantielles vous seront notifiées par e-mail au moins <strong>30 jours avant</strong> leur entrée en vigueur. L'utilisation continue du service vaut acceptation des nouvelles conditions.
        </p>
      </Section>

      <Section title="11. Droit applicable et résolution des litiges">
        <p>
          Les présentes CGU sont régies par le <strong>droit français</strong>. En cas de litige, les parties s'engagent à rechercher une solution amiable dans un délai de 30 jours.
        </p>
        <p>
          À défaut d'accord amiable, et conformément à l'article L.616-1 du Code de la Consommation, vous pouvez recourir à un médiateur de la consommation. Les tribunaux compétents sont ceux du ressort du siège social de BOUBA'IA SAS, sauf règles impératives contraires pour les consommateurs.
        </p>
        <p className="text-sm text-gray-500">
          Plateforme de résolution en ligne : <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-1">Commission Européenne — ODR <ExternalLink className="w-3 h-3" /></a>
        </p>
      </Section>
    </div>
  )
}

// ─── TAB: Politique de Cookies ──────────────────────────────────────────────

function PolitiqueCookies() {
  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Politique de Cookies</h1>
        <p className="text-gray-500 text-sm">Dernière mise à jour : 18 mars 2026 — Conforme à la directive ePrivacy et aux recommandations CNIL</p>
      </div>

      <Section title="1. Qu'est-ce qu'un cookie ?">
        <p>
          Un cookie est un petit fichier texte déposé sur votre terminal (ordinateur, tablette, smartphone) lors de la visite d'un site web. Il permet au site de mémoriser des informations sur votre visite, comme votre langue préférée et d'autres paramètres.
        </p>
        <p>
          Les cookies ne peuvent pas exécuter de programmes ni livrer des virus sur votre ordinateur. Ils ne collectent pas de données personnelles sans votre consentement.
        </p>
      </Section>

      <Section title="2. Cookies utilisés par BOUBA'IA">
        <SubSection title="2.1 Cookies strictement nécessaires (toujours actifs)">
          <p className="text-sm mb-3">Ces cookies sont indispensables au fonctionnement du service. Ils ne peuvent pas être désactivés.</p>
          <div className="bg-gray-50 rounded-xl overflow-hidden border border-gray-200">
            <table className="w-full text-xs">
              <thead className="bg-gray-100">
                <tr>
                  <th className="text-left py-2 px-3 font-semibold">Nom</th>
                  <th className="text-left py-2 px-3 font-semibold">Finalité</th>
                  <th className="text-left py-2 px-3 font-semibold">Durée</th>
                  <th className="text-left py-2 px-3 font-semibold">Type</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr><td className="py-2 px-3 font-mono">sb-token</td><td className="py-2 px-3">Session d'authentification Supabase</td><td className="py-2 px-3">Session</td><td className="py-2 px-3">1ère partie</td></tr>
                <tr><td className="py-2 px-3 font-mono">sb-refresh-token</td><td className="py-2 px-3">Renouvellement automatique de session</td><td className="py-2 px-3">7 jours</td><td className="py-2 px-3">1ère partie</td></tr>
                <tr><td className="py-2 px-3 font-mono">bouba-theme</td><td className="py-2 px-3">Préférence de thème (clair/sombre)</td><td className="py-2 px-3">1 an</td><td className="py-2 px-3">1ère partie</td></tr>
                <tr><td className="py-2 px-3 font-mono">cookie-consent</td><td className="py-2 px-3">Mémorisation de vos préférences cookies</td><td className="py-2 px-3">1 an</td><td className="py-2 px-3">1ère partie</td></tr>
                <tr><td className="py-2 px-3 font-mono">csrf-token</td><td className="py-2 px-3">Protection CSRF (sécurité formulaires)</td><td className="py-2 px-3">Session</td><td className="py-2 px-3">1ère partie</td></tr>
              </tbody>
            </table>
          </div>
        </SubSection>

        <SubSection title="2.2 Cookies de performance et d'analyse (avec consentement)">
          <p className="text-sm mb-3">Ces cookies nous aident à comprendre comment les utilisateurs utilisent le service, afin de l'améliorer.</p>
          <div className="bg-gray-50 rounded-xl overflow-hidden border border-gray-200">
            <table className="w-full text-xs">
              <thead className="bg-gray-100">
                <tr>
                  <th className="text-left py-2 px-3 font-semibold">Nom</th>
                  <th className="text-left py-2 px-3 font-semibold">Finalité</th>
                  <th className="text-left py-2 px-3 font-semibold">Durée</th>
                  <th className="text-left py-2 px-3 font-semibold">Émetteur</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr><td className="py-2 px-3 font-mono">_posthog</td><td className="py-2 px-3">Analyse d'usage anonymisée (PostHog)</td><td className="py-2 px-3">1 an</td><td className="py-2 px-3">posthog.com</td></tr>
                <tr><td className="py-2 px-3 font-mono">ph_*</td><td className="py-2 px-3">Identification session PostHog</td><td className="py-2 px-3">1 an</td><td className="py-2 px-3">posthog.com</td></tr>
              </tbody>
            </table>
          </div>
        </SubSection>

        <SubSection title="2.3 Stockage local (localStorage)">
          <p className="text-sm mb-3">En plus des cookies, nous utilisons le stockage local du navigateur pour améliorer les performances :</p>
          <div className="bg-gray-50 rounded-xl overflow-hidden border border-gray-200">
            <table className="w-full text-xs">
              <thead className="bg-gray-100">
                <tr>
                  <th className="text-left py-2 px-3 font-semibold">Clé</th>
                  <th className="text-left py-2 px-3 font-semibold">Contenu</th>
                  <th className="text-left py-2 px-3 font-semibold">Finalité</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr><td className="py-2 px-3 font-mono">auth_token</td><td className="py-2 px-3">JWT d'authentification</td><td className="py-2 px-3">Maintien de session</td></tr>
                <tr><td className="py-2 px-3 font-mono">bouba-chat-storage-v2</td><td className="py-2 px-3">Historique conversations (local)</td><td className="py-2 px-3">Continuité de l'interface</td></tr>
                <tr><td className="py-2 px-3 font-mono">bouba-email-storage-v2</td><td className="py-2 px-3">Cache emails</td><td className="py-2 px-3">Chargement rapide</td></tr>
                <tr><td className="py-2 px-3 font-mono">bouba-notifications-v1</td><td className="py-2 px-3">Préférences notifications</td><td className="py-2 px-3">Personnalisation</td></tr>
              </tbody>
            </table>
          </div>
          <InfoBox type="info">
            Ces données ne quittent jamais votre navigateur, sauf pour les opérations de synchronisation avec nos serveurs.
          </InfoBox>
        </SubSection>
      </Section>

      <Section title="3. Cookies tiers">
        <p>Certains cookies sont déposés par des tiers dans le cadre de fonctionnalités intégrées :</p>
        <div className="bg-gray-50 rounded-xl overflow-hidden border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="text-left py-2 px-4 font-semibold text-gray-700">Tiers</th>
                <th className="text-left py-2 px-4 font-semibold text-gray-700">Usage</th>
                <th className="text-left py-2 px-4 font-semibold text-gray-700">Politique</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <tr>
                <td className="py-2 px-4 font-medium">Google</td>
                <td className="py-2 px-4">OAuth (connexion Gmail/Calendar)</td>
                <td className="py-2 px-4"><a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-1 text-xs">Google Privacy <ExternalLink className="w-3 h-3" /></a></td>
              </tr>
              <tr>
                <td className="py-2 px-4 font-medium">Stripe</td>
                <td className="py-2 px-4">Paiement sécurisé</td>
                <td className="py-2 px-4"><a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-1 text-xs">Stripe Privacy <ExternalLink className="w-3 h-3" /></a></td>
              </tr>
            </tbody>
          </table>
        </div>
        <InfoBox type="info">
          BOUBA'IA n'utilise <strong>aucun cookie publicitaire ou de ciblage comportemental</strong>. Aucune régie publicitaire tierce n'a accès à votre activité sur la plateforme.
        </InfoBox>
      </Section>

      <Section title="4. Gestion de vos préférences">
        <SubSection title="4.1 Via la bannière de consentement">
          <p className="text-sm">Lors de votre première visite, une bannière vous permet d'accepter ou de refuser les cookies non essentiels. Vous pouvez modifier vos choix à tout moment depuis les Paramètres → Notifications → Préférences cookies.</p>
        </SubSection>
        <SubSection title="4.2 Via les paramètres de votre navigateur">
          <p className="text-sm mb-2">Vous pouvez configurer votre navigateur pour refuser tout ou partie des cookies. Voici les liens vers les paramètres des principaux navigateurs :</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {[
              { name: 'Chrome', url: 'https://support.google.com/chrome/answer/95647' },
              { name: 'Firefox', url: 'https://support.mozilla.org/fr/kb/cookies' },
              { name: 'Safari', url: 'https://support.apple.com/fr-fr/guide/safari/sfri11471/mac' },
              { name: 'Edge', url: 'https://support.microsoft.com/fr-fr/windows/supprimer-et-gérer-les-cookies' },
              { name: 'Opera', url: 'https://help.opera.com/en/latest/web-preferences/#cookies' },
            ].map((b) => (
              <a key={b.name} href={b.url} target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-between gap-2 p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-blue-600 hover:bg-blue-50 hover:border-blue-200 transition-colors">
                <span>{b.name}</span>
                <ExternalLink className="w-3 h-3 flex-shrink-0" />
              </a>
            ))}
          </div>
          <InfoBox type="warning">
            Le refus des cookies strictement nécessaires empêche la connexion à la plateforme. Les autres cookies peuvent être refusés sans impact sur les fonctionnalités principales.
          </InfoBox>
        </SubSection>
        <SubSection title="4.3 Opt-out spécifique">
          <ul className="list-disc pl-5 space-y-1 text-sm">
            <li>Opt-out analytique (PostHog) : <a href="https://posthog.com/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">posthog.com/privacy</a></li>
            <li>Révoquer l'accès Google : <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">myaccount.google.com/permissions</a></li>
          </ul>
        </SubSection>
      </Section>

      <Section title="5. Durée de conservation des cookies">
        <p>
          Les cookies de session sont supprimés à la fermeture du navigateur. Les cookies persistants ont une durée de vie maximale de <strong>13 mois</strong> conformément aux recommandations de la CNIL. Passé ce délai, votre consentement est de nouveau sollicité.
        </p>
      </Section>

      <Section title="6. Contact">
        <p>Pour toute question relative aux cookies :</p>
        <a href="mailto:privacy@bouba-ia.com" className="flex items-center gap-2 text-blue-600 hover:underline text-sm">
          <Mail className="w-4 h-4" /> privacy@bouba-ia.com
        </a>
      </Section>
    </div>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function LegalPage() {
  const location = useLocation()
  const navigate = useNavigate()

  const getInitialTab = (): Tab => {
    const hash = location.hash.replace('#', '') as Tab
    return TABS.find(t => t.id === hash) ? hash : 'mentions'
  }

  const [activeTab, setActiveTab] = useState<Tab>(getInitialTab)

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab)
    navigate(`/legal#${tab}`, { replace: true })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  useEffect(() => {
    const hash = location.hash.replace('#', '') as Tab
    if (TABS.find(t => t.id === hash)) {
      setActiveTab(hash)
    }
  }, [location.hash])

  const renderContent = () => {
    switch (activeTab) {
      case 'mentions':        return <MentionsLegales />
      case 'confidentialite': return <Confidentialite />
      case 'cgu':             return <CGU />
      case 'cookies':         return <PolitiqueCookies />
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link
            to="/"
            className="p-2 hover:bg-gray-100 rounded-xl text-gray-500 hover:text-gray-900 transition-colors flex-shrink-0"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center flex-shrink-0">
              <Scale className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="font-bold text-gray-900 leading-tight">Documents Légaux</h1>
              <p className="text-xs text-gray-500 hidden sm:block">BOUBA'IA SAS — Mis à jour le 18 mars 2026</p>
            </div>
          </div>
        </div>

        {/* Tab navigation */}
        <div className="max-w-5xl mx-auto px-4 border-t border-gray-100">
          <div className="flex overflow-x-auto scrollbar-hide -mb-px gap-0">
            {TABS.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`flex items-center gap-1.5 px-3 sm:px-5 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors flex-shrink-0 ${
                    isActive
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 hidden sm:block" />
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="sm:hidden">{tab.shortLabel}</span>
                  {isActive && (
                    <motion.div layoutId="tab-indicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 py-8 px-4">
        <div className="max-w-5xl mx-auto">
          {/* Security badges */}
          <div className="grid grid-cols-3 gap-3 mb-8">
            {[
              { icon: Shield,   color: 'blue',  title: 'RGPD Conforme',      desc: 'Protection des données selon le règlement européen' },
              { icon: Lock,     color: 'green', title: 'Données Sécurisées', desc: 'Chiffrement TLS 1.3 et AES-256' },
              { icon: Eye,      color: 'purple', title: 'Transparence',      desc: 'Aucune vente de données à des tiers' },
            ].map(({ icon: Icon, color, title, desc }) => (
              <div key={title} className="bg-white border border-gray-200 rounded-2xl p-3 sm:p-4 text-center shadow-sm">
                <div className={`w-9 h-9 sm:w-10 sm:h-10 bg-${color}-50 rounded-xl flex items-center justify-center mx-auto mb-2`}>
                  <Icon className={`w-4 h-4 sm:w-5 sm:h-5 text-${color}-600`} />
                </div>
                <p className="font-semibold text-gray-900 text-xs sm:text-sm">{title}</p>
                <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5 hidden sm:block">{desc}</p>
              </div>
            ))}
          </div>

          {/* Main content card */}
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            {/* Table of contents sidebar on large screens */}
            <div className="flex">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  className="flex-1 p-6 sm:p-10"
                >
                  {renderContent()}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* Bottom links */}
          <div className="mt-6 flex flex-wrap gap-3 justify-center text-sm">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`px-4 py-2 rounded-xl border transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:text-blue-600'
                }`}
              >
                {tab.shortLabel}
              </button>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 px-4 text-center text-xs text-gray-400 border-t border-gray-200 bg-white">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>© 2026 BOUBA'IA SAS — Tous droits réservés</span>
          <div className="flex items-center gap-4">
            <a href="mailto:legal@bouba-ia.com" className="text-gray-400 hover:text-blue-600 transition-colors flex items-center gap-1">
              <Mail className="w-3 h-3" /> legal@bouba-ia.com
            </a>
            <span className="flex items-center gap-1">
              <Phone className="w-3 h-3" /> +33 1 XX XX XX XX
            </span>
          </div>
        </div>
      </footer>
    </div>
  )
}
