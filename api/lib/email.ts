import { Resend } from 'resend';

// Initialisation paresseuse : on ne crée le client que si la clé est présente
let _resend: Resend | null = null;
function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
}

const FROM = process.env.EMAIL_FROM || 'Bouba\'ia <contact.boubaia@realtechprint.com>';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// Plan labels for display
const PLAN_LABELS: Record<string, string> = {
  free: 'Gratuit',
  starter: 'Starter',
  pro: 'Pro',
  business: 'Business',
  enterprise: 'Enterprise',
};

function planLabel(planId: string): string {
  return PLAN_LABELS[planId] || planId;
}

// ────────────────────────────────────────────────────────
// Shared HTML wrapper
// ────────────────────────────────────────────────────────
function wrapHtml(content: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bouba'ia</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Inter,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:32px 40px;text-align:center;">
            <span style="font-size:28px;font-weight:800;color:#fff;letter-spacing:-0.5px;">Bouba'ia</span>
            <p style="margin:4px 0 0;color:rgba(255,255,255,0.8);font-size:13px;">Votre assistant IA personnel</p>
          </td>
        </tr>
        <!-- Content -->
        <tr><td style="padding:40px;">${content}</td></tr>
        <!-- Footer -->
        <tr>
          <td style="background:#f9f9f9;padding:24px 40px;text-align:center;border-top:1px solid #eee;">
            <p style="margin:0;color:#999;font-size:12px;">© 2026 Bouba'ia · <a href="${FRONTEND_URL}" style="color:#6366f1;text-decoration:none;">boubaia.com</a></p>
            <p style="margin:6px 0 0;color:#bbb;font-size:11px;">Cet email a été envoyé automatiquement, merci de ne pas y répondre.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ────────────────────────────────────────────────────────
// 1. Email de bienvenue (post-inscription)
// ────────────────────────────────────────────────────────
export async function sendWelcomeEmail(email: string, firstName?: string | null): Promise<void> {
  if (!process.env.RESEND_API_KEY) return;
  const name = firstName || 'là';
  const content = `
    <h2 style="margin:0 0 16px;color:#1a1a2e;font-size:22px;">Bienvenue ${name} 🎉</h2>
    <p style="color:#555;line-height:1.6;margin:0 0 20px;">Votre compte Bouba'ia est prêt. Vous pouvez dès maintenant connecter vos outils et laisser votre assistant IA gérer vos emails, votre agenda, vos contacts et vos finances.</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
      <tr>
        <td style="background:#f0f0ff;border-radius:8px;padding:20px;">
          <p style="margin:0 0 12px;font-weight:700;color:#6366f1;font-size:14px;">✦ PAR OÙ COMMENCER</p>
          <ul style="margin:0;padding-left:20px;color:#444;font-size:14px;line-height:2;">
            <li>Connectez votre compte Gmail</li>
            <li>Explorez le chat principal avec Bouba</li>
            <li>Ajoutez vos premières transactions financières</li>
          </ul>
        </td>
      </tr>
    </table>
    <div style="text-align:center;">
      <a href="${FRONTEND_URL}/dashboard" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;text-decoration:none;padding:14px 36px;border-radius:8px;font-weight:700;font-size:15px;">Accéder à mon espace →</a>
    </div>`;

  await getResend()!.emails.send({
    from: FROM,
    to: email,
    subject: 'Bienvenue sur Bouba\'ia ! 🎉',
    html: wrapHtml(content),
  });
}

// ────────────────────────────────────────────────────────
// 2. Email de vérification d'adresse email (post-inscription)
// ────────────────────────────────────────────────────────
export async function sendVerificationEmail(email: string, firstName: string | null | undefined, token: string): Promise<void> {
  if (!process.env.RESEND_API_KEY) return;
  const name = firstName || 'là';
  const verifyLink = `${FRONTEND_URL}/api/auth/verify-email?token=${token}`;
  const content = `
    <h2 style="margin:0 0 16px;color:#1a1a2e;font-size:22px;">Confirmez votre adresse email</h2>
    <p style="color:#555;line-height:1.6;margin:0 0 20px;">Bonjour ${name}, merci de vous être inscrit sur Bouba'ia ! Cliquez sur le bouton ci-dessous pour activer votre compte.</p>
    <div style="text-align:center;margin:0 0 24px;">
      <a href="${verifyLink}" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;text-decoration:none;padding:14px 36px;border-radius:8px;font-weight:700;font-size:15px;">Vérifier mon email →</a>
    </div>
    <p style="color:#999;font-size:13px;text-align:center;margin:0;">Ce lien expire dans <strong>24 heures</strong>. Si vous n'avez pas créé de compte, ignorez cet email.</p>`;

  await getResend()!.emails.send({
    from: FROM,
    to: email,
    subject: 'Activez votre compte Bouba\'ia',
    html: wrapHtml(content),
  });
}

// ────────────────────────────────────────────────────────
// 2. Email de réinitialisation de mot de passe
// ────────────────────────────────────────────────────────
export async function sendPasswordResetEmail(email: string, resetToken: string): Promise<void> {
  if (!process.env.RESEND_API_KEY) return;
  const resetLink = `${FRONTEND_URL}/reset-password?token=${resetToken}`;
  const content = `
    <h2 style="margin:0 0 16px;color:#1a1a2e;font-size:22px;">Réinitialisation de mot de passe</h2>
    <p style="color:#555;line-height:1.6;margin:0 0 20px;">Vous avez demandé à réinitialiser votre mot de passe. Cliquez sur le bouton ci-dessous pour en choisir un nouveau.</p>
    <div style="text-align:center;margin:0 0 24px;">
      <a href="${resetLink}" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;text-decoration:none;padding:14px 36px;border-radius:8px;font-weight:700;font-size:15px;">Réinitialiser mon mot de passe →</a>
    </div>
    <p style="color:#999;font-size:13px;text-align:center;margin:0;">Ce lien expire dans <strong>1 heure</strong>. Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.</p>`;

  await getResend()!.emails.send({
    from: FROM,
    to: email,
    subject: 'Réinitialisation de votre mot de passe Bouba\'ia',
    html: wrapHtml(content),
  });
}

// ────────────────────────────────────────────────────────
// 3. Email de confirmation de paiement / reçu
// ────────────────────────────────────────────────────────
export async function sendPaymentConfirmationEmail(
  email: string,
  firstName: string | null | undefined,
  planId: string,
  amountCents: number,
  currency: string
): Promise<void> {
  if (!process.env.RESEND_API_KEY) return;
  const name = firstName || 'là';
  const amount = (amountCents / 100).toFixed(2).replace('.', ',');
  const curr = currency.toUpperCase();
  const plan = planLabel(planId);
  const content = `
    <h2 style="margin:0 0 16px;color:#1a1a2e;font-size:22px;">Paiement confirmé ✓</h2>
    <p style="color:#555;line-height:1.6;margin:0 0 20px;">Bonjour ${name}, votre paiement a bien été reçu. Voici le récapitulatif :</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px;border:1px solid #e5e5e5;border-radius:8px;overflow:hidden;">
      <tr style="background:#f9f9f9;">
        <td style="padding:14px 20px;font-size:14px;color:#777;border-bottom:1px solid #eee;">Plan souscrit</td>
        <td style="padding:14px 20px;font-size:14px;font-weight:700;color:#1a1a2e;text-align:right;border-bottom:1px solid #eee;">Bouba'ia ${plan}</td>
      </tr>
      <tr>
        <td style="padding:14px 20px;font-size:14px;color:#777;">Montant réglé</td>
        <td style="padding:14px 20px;font-size:16px;font-weight:800;color:#6366f1;text-align:right;">${amount} ${curr}</td>
      </tr>
    </table>
    <div style="text-align:center;">
      <a href="${FRONTEND_URL}/dashboard" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;text-decoration:none;padding:14px 36px;border-radius:8px;font-weight:700;font-size:15px;">Accéder à mon espace →</a>
    </div>`;

  await getResend()!.emails.send({
    from: FROM,
    to: email,
    subject: `Reçu Bouba'ia — Plan ${plan}`,
    html: wrapHtml(content),
  });
}

// ────────────────────────────────────────────────────────
// 4a. Email de bienvenue pour un compte créé par l'admin (avec mot de passe temporaire)
// ────────────────────────────────────────────────────────
export async function sendAdminInviteEmail(
  email: string,
  firstName: string | null | undefined,
  planId: string,
  tempPassword: string
): Promise<void> {
  if (!process.env.RESEND_API_KEY) return;
  const name = firstName || 'là';
  const plan = planLabel(planId);
  const content = `
    <h2 style="margin:0 0 16px;color:#1a1a2e;font-size:22px;">Bienvenue sur Bouba'ia, ${name} !</h2>
    <p style="color:#555;line-height:1.6;margin:0 0 20px;">Votre compte a été créé par l'équipe Bouba'ia. Voici vos identifiants de connexion :</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px;border:1px solid #e5e5e5;border-radius:8px;overflow:hidden;">
      <tr style="background:#f9f9f9;">
        <td style="padding:14px 20px;font-size:14px;color:#777;border-bottom:1px solid #eee;">Email</td>
        <td style="padding:14px 20px;font-size:14px;font-weight:700;color:#1a1a2e;text-align:right;border-bottom:1px solid #eee;">${email}</td>
      </tr>
      <tr style="background:#f9f9f9;">
        <td style="padding:14px 20px;font-size:14px;color:#777;border-bottom:1px solid #eee;">Mot de passe temporaire</td>
        <td style="padding:14px 20px;font-size:16px;font-weight:800;color:#6366f1;text-align:right;border-bottom:1px solid #eee;font-family:monospace;">${tempPassword}</td>
      </tr>
      <tr>
        <td style="padding:14px 20px;font-size:14px;color:#777;">Plan activé</td>
        <td style="padding:14px 20px;font-size:14px;font-weight:700;color:#1a1a2e;text-align:right;">Bouba'ia ${plan}</td>
      </tr>
    </table>
    <div style="background:#fff8e7;border:1px solid #ffd166;border-radius:8px;padding:16px 20px;margin:0 0 28px;">
      <p style="margin:0;font-size:13px;color:#b45309;font-weight:600;">⚠️ Changez votre mot de passe dès votre première connexion dans les paramètres de votre profil.</p>
    </div>
    <div style="text-align:center;">
      <a href="${FRONTEND_URL}/login" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;text-decoration:none;padding:14px 36px;border-radius:8px;font-weight:700;font-size:15px;">Me connecter →</a>
    </div>`;

  await getResend()!.emails.send({
    from: FROM,
    to: email,
    subject: `Votre compte Bouba'ia est prêt — Plan ${plan}`,
    html: wrapHtml(content),
  });
}

// ────────────────────────────────────────────────────────
// 4b. Email de réinitialisation de mot de passe par l'admin (avec mot de passe temporaire)
// ────────────────────────────────────────────────────────
export async function sendTempPasswordEmail(
  email: string,
  firstName: string | null | undefined,
  tempPassword: string
): Promise<void> {
  if (!process.env.RESEND_API_KEY) return;
  const name = firstName || 'là';
  const content = `
    <h2 style="margin:0 0 16px;color:#1a1a2e;font-size:22px;">Nouveau mot de passe temporaire</h2>
    <p style="color:#555;line-height:1.6;margin:0 0 20px;">Bonjour ${name}, votre mot de passe a été réinitialisé par l'équipe Bouba'ia.</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px;border:1px solid #e5e5e5;border-radius:8px;overflow:hidden;">
      <tr>
        <td style="padding:18px 20px;font-size:14px;color:#777;">Mot de passe temporaire</td>
        <td style="padding:18px 20px;font-size:20px;font-weight:800;color:#6366f1;text-align:right;font-family:monospace;letter-spacing:2px;">${tempPassword}</td>
      </tr>
    </table>
    <div style="background:#fff8e7;border:1px solid #ffd166;border-radius:8px;padding:16px 20px;margin:0 0 28px;">
      <p style="margin:0;font-size:13px;color:#b45309;font-weight:600;">⚠️ Ce mot de passe est temporaire. Changez-le immédiatement après connexion dans vos paramètres.</p>
    </div>
    <div style="text-align:center;">
      <a href="${FRONTEND_URL}/login" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;text-decoration:none;padding:14px 36px;border-radius:8px;font-weight:700;font-size:15px;">Me connecter →</a>
    </div>`;

  await getResend()!.emails.send({
    from: FROM,
    to: email,
    subject: `Bouba'ia — Votre nouveau mot de passe temporaire`,
    html: wrapHtml(content),
  });
}

// ────────────────────────────────────────────────────────
// 4. Envoi de facture par l'admin
// ────────────────────────────────────────────────────────
export async function sendInvoiceEmail(
  email: string,
  firstName: string | null | undefined,
  invoice: {
    invoiceNumber: string
    planId: string
    amount: number
    currency: string
    paymentDate?: string
    paymentMethod?: string
    monthsPaid?: number
  },
  /** Facture PDF jointe (générée par api/lib/invoice.ts) */
  pdfAttachment?: { filename: string; content: Buffer }
): Promise<void> {
  if (!process.env.RESEND_API_KEY) return;
  const name = firstName || 'là';
  const amountNum = invoice.amount > 200 ? invoice.amount / 100 : invoice.amount;
  const amountLabel = amountNum.toFixed(2).replace('.', ',');
  const curr = invoice.currency.toUpperCase();
  const plan = planLabel(invoice.planId);
  const date = invoice.paymentDate
    ? new Date(invoice.paymentDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
    : new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
  const methodLabel = invoice.paymentMethod === 'wave' ? 'Wave'
    : invoice.paymentMethod === 'orange_money' ? 'Orange Money'
    : invoice.paymentMethod === 'stripe' || invoice.paymentMethod === 'card' ? 'Carte bancaire'
    : invoice.paymentMethod || 'Paiement';

  const monthsRow = (invoice.monthsPaid || 1) > 1 ? `
      <tr style="background:#f9f9f9;">
        <td style="padding:14px 20px;font-size:14px;color:#777;border-bottom:1px solid #eee;">Durée</td>
        <td style="padding:14px 20px;font-size:14px;color:#555;text-align:right;border-bottom:1px solid #eee;">${invoice.monthsPaid} mois</td>
      </tr>` : '';

  const content = `
    <h2 style="margin:0 0 16px;color:#1a1a2e;font-size:22px;">Votre facture Bouba'ia 📄</h2>
    <p style="color:#555;line-height:1.6;margin:0 0 20px;">Bonjour ${name}, veuillez trouver ci-dessous votre facture pour votre abonnement Bouba'ia.</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px;border:1px solid #e5e5e5;border-radius:8px;overflow:hidden;">
      <tr style="background:#f9f9f9;">
        <td style="padding:14px 20px;font-size:14px;color:#777;border-bottom:1px solid #eee;">N° Facture</td>
        <td style="padding:14px 20px;font-size:13px;font-weight:700;color:#1a1a2e;text-align:right;border-bottom:1px solid #eee;font-family:monospace;">${invoice.invoiceNumber}</td>
      </tr>
      <tr>
        <td style="padding:14px 20px;font-size:14px;color:#777;border-bottom:1px solid #eee;">Plan</td>
        <td style="padding:14px 20px;font-size:14px;font-weight:700;color:#1a1a2e;text-align:right;border-bottom:1px solid #eee;">Bouba'ia ${plan}</td>
      </tr>
      <tr style="background:#f9f9f9;">
        <td style="padding:14px 20px;font-size:14px;color:#777;border-bottom:1px solid #eee;">Date</td>
        <td style="padding:14px 20px;font-size:14px;color:#555;text-align:right;border-bottom:1px solid #eee;">${date}</td>
      </tr>
      <tr>
        <td style="padding:14px 20px;font-size:14px;color:#777;border-bottom:1px solid #eee;">Méthode</td>
        <td style="padding:14px 20px;font-size:14px;color:#555;text-align:right;border-bottom:1px solid #eee;">${methodLabel}</td>
      </tr>
      ${monthsRow}
      <tr style="background:#f9f9f9;">
        <td style="padding:18px 20px;font-size:15px;font-weight:700;color:#333;">Total réglé</td>
        <td style="padding:18px 20px;font-size:18px;font-weight:800;color:#6366f1;text-align:right;">${amountLabel} ${curr}</td>
      </tr>
    </table>
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:14px 18px;margin:0 0 24px;">
      <p style="margin:0;font-size:13px;color:#15803d;font-weight:600;">✓ Paiement validé et enregistré par notre équipe.</p>
    </div>
    <div style="text-align:center;">
      <a href="${FRONTEND_URL}/settings/plan" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;text-decoration:none;padding:14px 36px;border-radius:8px;font-weight:700;font-size:15px;">Voir mon abonnement →</a>
    </div>`;

  await getResend()!.emails.send({
    from: FROM,
    to: email,
    subject: `Facture Bouba'ia — ${invoice.invoiceNumber}`,
    html: wrapHtml(content),
    ...(pdfAttachment ? {
      attachments: [{ filename: pdfAttachment.filename, content: pdfAttachment.content.toString('base64') }],
    } : {}),
  });
}

// ────────────────────────────────────────────────────────
// 4bis. Email de relance de paiement (impayé / échéance)
// ────────────────────────────────────────────────────────
export async function sendPaymentReminderEmail(
  email: string,
  firstName: string | null | undefined,
  reminder: {
    planId: string
    amount: number
    currency: string
    dueDate?: string | null
    daysOverdue?: number | null
  }
): Promise<void> {
  if (!process.env.RESEND_API_KEY) return;
  const name = firstName || 'là';
  const plan = planLabel(reminder.planId);
  const cur = (reminder.currency || 'EUR').toUpperCase();
  const symbol = cur === 'EUR' ? '€' : cur === 'XOF' ? 'FCFA' : cur;
  const amountLabel = `${Number(reminder.amount).toLocaleString('fr-FR')} ${symbol}`;
  const overdue = reminder.daysOverdue && reminder.daysOverdue > 0;
  const dueLabel = reminder.dueDate
    ? new Date(reminder.dueDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
    : null;

  const content = `
    <h2 style="margin:0 0 16px;color:#1a1a2e;font-size:22px;">${overdue ? 'Paiement en retard ⏰' : 'Votre abonnement arrive à échéance 📅'}</h2>
    <p style="color:#555;line-height:1.6;margin:0 0 20px;">
      Bonjour ${name},
      ${overdue
        ? `nous n'avons pas encore reçu le règlement de votre abonnement <strong>Bouba'ia ${plan}</strong>${reminder.daysOverdue ? ` (en retard de ${reminder.daysOverdue} jour${reminder.daysOverdue > 1 ? 's' : ''})` : ''}.`
        : `votre abonnement <strong>Bouba'ia ${plan}</strong> arrive à échéance${dueLabel ? ` le <strong>${dueLabel}</strong>` : ' prochainement'}.`}
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;border:1px solid ${overdue ? '#fecaca' : '#fde68a'};border-radius:8px;overflow:hidden;">
      <tr style="background:${overdue ? '#fef2f2' : '#fffbeb'};">
        <td style="padding:16px 20px;font-size:14px;color:#777;">Montant à régler</td>
        <td style="padding:16px 20px;font-size:18px;font-weight:800;color:${overdue ? '#dc2626' : '#d97706'};text-align:right;">${amountLabel}</td>
      </tr>
    </table>
    <p style="color:#555;line-height:1.6;margin:0 0 20px;">
      Pour éviter toute interruption de votre accès à Bouba'ia, merci de régulariser votre situation :
      paiement par <strong>Wave</strong> (QR code sur la page de renouvellement) ou par carte bancaire.
    </p>
    <div style="text-align:center;margin:0 0 8px;">
      <a href="${FRONTEND_URL}/payment/renew" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;text-decoration:none;padding:14px 36px;border-radius:8px;font-weight:700;font-size:15px;">Renouveler mon abonnement →</a>
    </div>
    <p style="color:#999;font-size:12px;text-align:center;margin:16px 0 0;">Déjà réglé ? Envoyez votre preuve de paiement à contact.boubaia@realtechprint.com et ignorez ce message.</p>`;

  await getResend()!.emails.send({
    from: FROM,
    to: email,
    subject: overdue
      ? `⏰ Rappel : paiement en attente — Bouba'ia ${plan}`
      : `📅 Votre abonnement Bouba'ia ${plan} arrive à échéance`,
    html: wrapHtml(content),
  });
}

// ────────────────────────────────────────────────────────
// 5. Email de changement de plan
// ────────────────────────────────────────────────────────
export async function sendPlanChangeEmail(
  email: string,
  firstName: string | null | undefined,
  oldPlanId: string,
  newPlanId: string
): Promise<void> {
  if (!process.env.RESEND_API_KEY) return;
  const name = firstName || 'là';
  const oldPlan = planLabel(oldPlanId);
  const newPlan = planLabel(newPlanId);
  const isUpgrade = ['free', 'starter', 'pro', 'business', 'enterprise'].indexOf(newPlanId) >
                    ['free', 'starter', 'pro', 'business', 'enterprise'].indexOf(oldPlanId);
  const emoji = isUpgrade ? '🚀' : '📦';
  const action = isUpgrade ? 'passé au niveau supérieur' : 'modifié votre abonnement';
  const content = `
    <h2 style="margin:0 0 16px;color:#1a1a2e;font-size:22px;">Plan mis à jour ${emoji}</h2>
    <p style="color:#555;line-height:1.6;margin:0 0 20px;">Bonjour ${name}, vous avez ${action} avec succès.</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px;border:1px solid #e5e5e5;border-radius:8px;overflow:hidden;">
      <tr style="background:#f9f9f9;">
        <td style="padding:14px 20px;font-size:14px;color:#777;border-bottom:1px solid #eee;">Ancien plan</td>
        <td style="padding:14px 20px;font-size:14px;color:#999;text-align:right;border-bottom:1px solid #eee;text-decoration:line-through;">Bouba'ia ${oldPlan}</td>
      </tr>
      <tr>
        <td style="padding:14px 20px;font-size:14px;color:#777;">Nouveau plan</td>
        <td style="padding:14px 20px;font-size:14px;font-weight:800;color:#6366f1;text-align:right;">Bouba'ia ${newPlan}</td>
      </tr>
    </table>
    <div style="text-align:center;">
      <a href="${FRONTEND_URL}/settings/plan" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;text-decoration:none;padding:14px 36px;border-radius:8px;font-weight:700;font-size:15px;">Voir mon abonnement →</a>
    </div>`;

  await getResend()!.emails.send({
    from: FROM,
    to: email,
    subject: `Votre plan Bouba'ia a été mis à jour → ${newPlan}`,
    html: wrapHtml(content),
  });
}

// ────────────────────────────────────────────────────────
// 6. Message personnalisé de l'équipe admin → client
// ────────────────────────────────────────────────────────
export async function sendAdminMessageEmail(
  email: string,
  firstName: string | null | undefined,
  subject: string,
  message: string
): Promise<void> {
  if (!process.env.RESEND_API_KEY) return;
  const name = firstName || 'là';
  // Texte brut → paragraphes HTML (échappé pour éviter toute injection)
  const escaped = message
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const paragraphs = escaped
    .split(/\n{2,}/)
    .map(p => `<p style="color:#555;line-height:1.7;margin:0 0 16px;">${p.replace(/\n/g, '<br>')}</p>`)
    .join('');
  const content = `
    <h2 style="margin:0 0 16px;color:#1a1a2e;font-size:22px;">Bonjour ${name},</h2>
    ${paragraphs}
    <p style="color:#999;font-size:13px;margin:24px 0 0;">— L'équipe Bouba'ia</p>`;

  await getResend()!.emails.send({
    from: FROM,
    to: email,
    subject,
    html: wrapHtml(content),
  });
}

// ────────────────────────────────────────────────────────
// 7. Facture de renouvellement (envoi automatique de fin de mois)
// ────────────────────────────────────────────────────────
export async function sendRenewalInvoiceEmail(
  email: string,
  firstName: string | null | undefined,
  invoice: {
    invoiceNumber: string
    planId: string
    amount: number
    currency: string
    dueDate: Date
  },
  pdfAttachment: { filename: string; content: Buffer }
): Promise<void> {
  if (!process.env.RESEND_API_KEY) return;
  const name = firstName || 'là';
  const plan = planLabel(invoice.planId);
  const cur = invoice.currency.toUpperCase();
  const symbol = cur === 'EUR' ? '€' : cur === 'XOF' ? 'FCFA' : cur;
  const amountLabel = `${Number(invoice.amount).toLocaleString('fr-FR')} ${symbol}`;
  const dueLabel = invoice.dueDate.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });

  const content = `
    <h2 style="margin:0 0 16px;color:#1a1a2e;font-size:22px;">Votre facture de renouvellement 📄</h2>
    <p style="color:#555;line-height:1.6;margin:0 0 20px;">
      Bonjour ${name}, votre abonnement <strong>Bouba'ia ${plan}</strong> arrive à échéance
      le <strong>${dueLabel}</strong>. Vous trouverez votre facture de renouvellement en pièce jointe.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;border:1px solid #e5e5e5;border-radius:8px;overflow:hidden;">
      <tr style="background:#f9f9f9;">
        <td style="padding:14px 20px;font-size:14px;color:#777;border-bottom:1px solid #eee;">N° Facture</td>
        <td style="padding:14px 20px;font-size:13px;font-weight:700;color:#1a1a2e;text-align:right;border-bottom:1px solid #eee;font-family:monospace;">${invoice.invoiceNumber}</td>
      </tr>
      <tr>
        <td style="padding:14px 20px;font-size:14px;color:#777;border-bottom:1px solid #eee;">Échéance</td>
        <td style="padding:14px 20px;font-size:14px;color:#555;text-align:right;border-bottom:1px solid #eee;">${dueLabel}</td>
      </tr>
      <tr style="background:#f9f9f9;">
        <td style="padding:18px 20px;font-size:15px;font-weight:700;color:#333;">Montant à régler</td>
        <td style="padding:18px 20px;font-size:18px;font-weight:800;color:#6366f1;text-align:right;">${amountLabel}</td>
      </tr>
    </table>
    <p style="color:#555;line-height:1.6;margin:0 0 20px;">
      Réglez votre facture par <strong>Wave</strong> (QR code marchand) ou carte bancaire
      pour conserver l'accès à votre assistant sans interruption.
    </p>
    <div style="text-align:center;margin:0 0 8px;">
      <a href="${FRONTEND_URL}/payment/renew" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;text-decoration:none;padding:14px 36px;border-radius:8px;font-weight:700;font-size:15px;">Payer mon renouvellement →</a>
    </div>
    <p style="color:#999;font-size:12px;text-align:center;margin:16px 0 0;">Après paiement Wave, envoyez votre reçu à contact.boubaia@realtechprint.com pour validation.</p>`;

  await getResend()!.emails.send({
    from: FROM,
    to: email,
    subject: `📄 Facture de renouvellement ${invoice.invoiceNumber} — Bouba'ia ${plan}`,
    html: wrapHtml(content),
    attachments: [{ filename: pdfAttachment.filename, content: pdfAttachment.content.toString('base64') }],
  });
}

// ────────────────────────────────────────────────────────
// 8. Paiement Wave reçu — en attente de validation
// ────────────────────────────────────────────────────────
export async function sendPaymentPendingEmail(
  email: string,
  firstName: string | null | undefined,
  info: { planId: string; amount: number; currency: string; months: number; reference?: string | null }
): Promise<void> {
  if (!process.env.RESEND_API_KEY) return;
  const name = firstName || 'là';
  const plan = planLabel(info.planId);
  const cur = (info.currency || 'EUR').toUpperCase();
  const symbol = cur === 'EUR' ? '€' : cur === 'XOF' ? 'FCFA' : cur;
  const amountLabel = `${Number(info.amount).toLocaleString('fr-FR')} ${symbol}`;

  const content = `
    <h2 style="margin:0 0 16px;color:#1a1a2e;font-size:22px;">Paiement bien reçu ✅</h2>
    <p style="color:#555;line-height:1.6;margin:0 0 20px;">
      Bonjour ${name}, nous avons bien reçu votre demande de paiement Wave pour le plan
      <strong>Bouba'ia ${plan}</strong>. Notre équipe vérifie votre paiement :
      <strong>votre plan sera activé très prochainement</strong> (sous 24 h ouvrées).
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;border:1px solid #e5e5e5;border-radius:8px;overflow:hidden;">
      <tr style="background:#f9f9f9;">
        <td style="padding:14px 20px;font-size:14px;color:#777;border-bottom:1px solid #eee;">Plan demandé</td>
        <td style="padding:14px 20px;font-size:14px;font-weight:700;color:#1a1a2e;text-align:right;border-bottom:1px solid #eee;">Bouba'ia ${plan} — ${info.months} mois</td>
      </tr>
      ${info.reference ? `<tr>
        <td style="padding:14px 20px;font-size:14px;color:#777;border-bottom:1px solid #eee;">Référence Wave</td>
        <td style="padding:14px 20px;font-size:13px;color:#555;text-align:right;border-bottom:1px solid #eee;font-family:monospace;">${info.reference}</td>
      </tr>` : ''}
      <tr style="background:#f9f9f9;">
        <td style="padding:16px 20px;font-size:15px;font-weight:700;color:#333;">Montant</td>
        <td style="padding:16px 20px;font-size:18px;font-weight:800;color:#6366f1;text-align:right;">${amountLabel}</td>
      </tr>
    </table>
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:14px 18px;margin:0 0 24px;">
      <p style="margin:0;font-size:13px;color:#15803d;font-weight:600;">
        ✓ En attendant la validation, votre plan actuel reste pleinement actif — aucune interruption de service.
      </p>
    </div>
    <p style="color:#999;font-size:12px;text-align:center;margin:0;">Vous recevrez un email de confirmation dès l'activation de votre nouveau plan.</p>`;

  await getResend()!.emails.send({
    from: FROM,
    to: email,
    subject: `✅ Paiement reçu — votre plan ${plan} sera bientôt actif`,
    html: wrapHtml(content),
  });
}
