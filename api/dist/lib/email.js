"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendWelcomeEmail = sendWelcomeEmail;
exports.sendPasswordResetEmail = sendPasswordResetEmail;
exports.sendPaymentConfirmationEmail = sendPaymentConfirmationEmail;
exports.sendPlanChangeEmail = sendPlanChangeEmail;
const resend_1 = require("resend");
// Initialisation paresseuse : on ne crée le client que si la clé est présente
let _resend = null;
function getResend() {
    if (!process.env.RESEND_API_KEY)
        return null;
    if (!_resend)
        _resend = new resend_1.Resend(process.env.RESEND_API_KEY);
    return _resend;
}
const FROM = process.env.EMAIL_FROM || 'Bouba\'ia <contact.boubaia@realtechprint.com>';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
// Plan labels for display
const PLAN_LABELS = {
    free: 'Gratuit',
    starter: 'Starter',
    pro: 'Pro',
    business: 'Business',
    enterprise: 'Enterprise',
};
function planLabel(planId) {
    return PLAN_LABELS[planId] || planId;
}
// ────────────────────────────────────────────────────────
// Shared HTML wrapper
// ────────────────────────────────────────────────────────
function wrapHtml(content) {
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
async function sendWelcomeEmail(email, firstName) {
    if (!process.env.RESEND_API_KEY)
        return;
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
    await getResend().emails.send({
        from: FROM,
        to: email,
        subject: 'Bienvenue sur Bouba\'ia ! 🎉',
        html: wrapHtml(content),
    });
}
// ────────────────────────────────────────────────────────
// 2. Email de réinitialisation de mot de passe
// ────────────────────────────────────────────────────────
async function sendPasswordResetEmail(email, resetToken) {
    if (!process.env.RESEND_API_KEY)
        return;
    const resetLink = `${FRONTEND_URL}/reset-password?token=${resetToken}`;
    const content = `
    <h2 style="margin:0 0 16px;color:#1a1a2e;font-size:22px;">Réinitialisation de mot de passe</h2>
    <p style="color:#555;line-height:1.6;margin:0 0 20px;">Vous avez demandé à réinitialiser votre mot de passe. Cliquez sur le bouton ci-dessous pour en choisir un nouveau.</p>
    <div style="text-align:center;margin:0 0 24px;">
      <a href="${resetLink}" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;text-decoration:none;padding:14px 36px;border-radius:8px;font-weight:700;font-size:15px;">Réinitialiser mon mot de passe →</a>
    </div>
    <p style="color:#999;font-size:13px;text-align:center;margin:0;">Ce lien expire dans <strong>1 heure</strong>. Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.</p>`;
    await getResend().emails.send({
        from: FROM,
        to: email,
        subject: 'Réinitialisation de votre mot de passe Bouba\'ia',
        html: wrapHtml(content),
    });
}
// ────────────────────────────────────────────────────────
// 3. Email de confirmation de paiement / reçu
// ────────────────────────────────────────────────────────
async function sendPaymentConfirmationEmail(email, firstName, planId, amountCents, currency) {
    if (!process.env.RESEND_API_KEY)
        return;
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
    await getResend().emails.send({
        from: FROM,
        to: email,
        subject: `Reçu Bouba'ia — Plan ${plan}`,
        html: wrapHtml(content),
    });
}
// ────────────────────────────────────────────────────────
// 4. Email de changement de plan
// ────────────────────────────────────────────────────────
async function sendPlanChangeEmail(email, firstName, oldPlanId, newPlanId) {
    if (!process.env.RESEND_API_KEY)
        return;
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
    await getResend().emails.send({
        from: FROM,
        to: email,
        subject: `Votre plan Bouba'ia a été mis à jour → ${newPlan}`,
        html: wrapHtml(content),
    });
}
//# sourceMappingURL=email.js.map