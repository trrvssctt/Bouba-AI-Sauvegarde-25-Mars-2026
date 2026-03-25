import { forwardRef } from 'react'
import type { SavedDocument } from '@/src/stores/documentStore'
import { DOC_TYPE_LABELS } from '@/src/stores/documentStore'

interface Props {
  doc: SavedDocument
  /** If true, renders a compact thumbnail for list cards */
  thumbnail?: boolean
}

const STATUS_LABELS: Record<SavedDocument['status'], { label: string; color: string }> = {
  draft:     { label: 'Brouillon',  color: '#6b7280' },
  sent:      { label: 'Envoyé',     color: '#2563eb' },
  paid:      { label: 'Payé',       color: '#16a34a' },
  cancelled: { label: 'Annulé',     color: '#dc2626' },
}

// ── Reusable inline styles (no Tailwind — used for print too) ─────────────────
const S = {
  root: {
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif",
    color: '#111827',
    fontSize: '13px',
    lineHeight: '1.6',
    padding: '40px',
    maxWidth: '800px',
    margin: '0 auto',
    backgroundColor: '#fff',
  } as React.CSSProperties,

  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '32px',
    paddingBottom: '24px',
    borderBottom: '2px solid #e5e7eb',
  } as React.CSSProperties,

  logo: {
    maxWidth: '120px',
    maxHeight: '60px',
    objectFit: 'contain',
    marginBottom: '8px',
  } as React.CSSProperties,

  companyName: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#111827',
    margin: '0 0 4px',
  } as React.CSSProperties,

  companyMeta: {
    color: '#6b7280',
    fontSize: '12px',
    lineHeight: '1.5',
  } as React.CSSProperties,

  docMeta: {
    textAlign: 'right' as const,
    flexShrink: 0,
  },

  docType: {
    fontSize: '22px',
    fontWeight: '800',
    color: '#4f46e5',
    margin: '0 0 4px',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  } as React.CSSProperties,

  docNumber: {
    fontSize: '13px',
    color: '#374151',
    fontWeight: '600',
  } as React.CSSProperties,

  badge: (color: string) => ({
    display: 'inline-block',
    padding: '2px 10px',
    borderRadius: '9999px',
    fontSize: '11px',
    fontWeight: '600',
    color: '#fff',
    backgroundColor: color,
    marginTop: '6px',
  } as React.CSSProperties),

  clientBox: {
    backgroundColor: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '16px 20px',
    marginBottom: '28px',
  } as React.CSSProperties,

  clientTitle: {
    fontSize: '10px',
    fontWeight: '700',
    color: '#9ca3af',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.1em',
    marginBottom: '8px',
  } as React.CSSProperties,

  clientName: {
    fontSize: '15px',
    fontWeight: '700',
    color: '#111827',
    margin: '0 0 2px',
  } as React.CSSProperties,

  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    marginBottom: '20px',
    fontSize: '12.5px',
  } as React.CSSProperties,

  thead: {
    backgroundColor: '#f3f4f6',
  } as React.CSSProperties,

  th: {
    padding: '10px 12px',
    textAlign: 'left' as const,
    fontWeight: '700',
    color: '#374151',
    fontSize: '11px',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  } as React.CSSProperties,

  thRight: {
    padding: '10px 12px',
    textAlign: 'right' as const,
    fontWeight: '700',
    color: '#374151',
    fontSize: '11px',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  } as React.CSSProperties,

  td: {
    padding: '10px 12px',
    borderBottom: '1px solid #f3f4f6',
    color: '#374151',
  } as React.CSSProperties,

  tdRight: {
    padding: '10px 12px',
    borderBottom: '1px solid #f3f4f6',
    textAlign: 'right' as const,
    color: '#374151',
  } as React.CSSProperties,

  totalsBox: {
    display: 'flex',
    justifyContent: 'flex-end',
    marginBottom: '28px',
  } as React.CSSProperties,

  totalsTable: {
    minWidth: '240px',
    fontSize: '13px',
  } as React.CSSProperties,

  totalsRow: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '32px',
    padding: '5px 0',
    color: '#6b7280',
  } as React.CSSProperties,

  totalsRowTotal: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '32px',
    padding: '10px 0',
    borderTop: '2px solid #111827',
    marginTop: '4px',
    fontWeight: '800',
    fontSize: '15px',
    color: '#111827',
  } as React.CSSProperties,

  notes: {
    backgroundColor: '#fffbeb',
    border: '1px solid #fde68a',
    borderRadius: '8px',
    padding: '12px 16px',
    marginBottom: '28px',
    fontSize: '12px',
    color: '#92400e',
  } as React.CSSProperties,

  signaturesBox: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '24px',
    marginTop: '40px',
    paddingTop: '24px',
    borderTop: '1px solid #e5e7eb',
  } as React.CSSProperties,

  sigBox: {
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '12px 16px',
    minHeight: '80px',
  } as React.CSSProperties,

  sigLabel: {
    fontSize: '10px',
    fontWeight: '700',
    color: '#9ca3af',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.1em',
    display: 'block',
    marginBottom: '4px',
  } as React.CSSProperties,

  footer: {
    marginTop: '32px',
    paddingTop: '16px',
    borderTop: '1px solid #f3f4f6',
    fontSize: '10px',
    color: '#9ca3af',
    textAlign: 'center' as const,
    lineHeight: '1.7',
  } as React.CSSProperties,
}

// ── Component ─────────────────────────────────────────────────────────────────
const DocumentTemplate = forwardRef<HTMLDivElement, Props>(({ doc, thumbnail = false }, ref) => {
  const statusInfo = STATUS_LABELS[doc.status]
  const docLabel = DOC_TYPE_LABELS[doc.type] || doc.type

  const formattedDate = (() => {
    try {
      return new Date(doc.date).toLocaleDateString('fr-FR', {
        day: '2-digit', month: 'long', year: 'numeric',
      })
    } catch {
      return doc.date
    }
  })()

  const fmt = (n: number) =>
    n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'

  const scale = thumbnail ? { transform: 'scale(0.4)', transformOrigin: 'top left', pointerEvents: 'none' as const } : {}

  return (
    <div ref={ref} style={{ ...S.root, ...scale }}>
      {/* ── Header ── */}
      <div style={S.header}>
        {/* Left: company */}
        <div>
          {doc.companyLogo && (
            <img src={doc.companyLogo} alt="Logo" style={S.logo} />
          )}
          <p style={S.companyName}>{doc.companyName || 'Mon Entreprise'}</p>
          <div style={S.companyMeta}>
            {doc.companyLegalForm && <div>{doc.companyLegalForm}</div>}
            {doc.companyAddress && <div>{doc.companyAddress}</div>}
            {(doc.companyPostalCode || doc.companyCity) && (
              <div>{[doc.companyPostalCode, doc.companyCity].filter(Boolean).join(' ')}</div>
            )}
            {doc.companyCountry && <div>{doc.companyCountry}</div>}
            {doc.companyPhone && <div>Tél. {doc.companyPhone}</div>}
            {doc.companyEmail && <div>{doc.companyEmail}</div>}
            {doc.companyWebsite && <div>{doc.companyWebsite}</div>}
            {doc.companySiret && <div>SIRET : {doc.companySiret}</div>}
            {doc.companyVat && <div>N° TVA : {doc.companyVat}</div>}
          </div>
        </div>

        {/* Right: doc meta */}
        <div style={S.docMeta}>
          <p style={S.docType}>{docLabel}</p>
          <p style={S.docNumber}>N° {doc.number}</p>
          <p style={{ color: '#6b7280', fontSize: '12px', marginTop: '4px' }}>
            Date : {formattedDate}
          </p>
          <span style={S.badge(statusInfo.color)}>{statusInfo.label}</span>
        </div>
      </div>

      {/* ── Client box ── */}
      <div style={S.clientBox}>
        <p style={S.clientTitle}>Facturé à / Destinataire</p>
        <p style={S.clientName}>{doc.clientName || '—'}</p>
        {doc.clientAddress && (
          <p style={{ color: '#6b7280', fontSize: '12px', margin: '2px 0' }}>{doc.clientAddress}</p>
        )}
        {doc.clientEmail && (
          <p style={{ color: '#6b7280', fontSize: '12px', margin: '2px 0' }}>{doc.clientEmail}</p>
        )}
      </div>

      {/* ── Items table ── */}
      <table style={S.table}>
        <thead style={S.thead}>
          <tr>
            <th style={{ ...S.th, width: '50%' }}>Description</th>
            <th style={{ ...S.thRight, width: '10%' }}>Qté</th>
            <th style={{ ...S.thRight, width: '20%' }}>Prix unit. HT</th>
            <th style={{ ...S.thRight, width: '20%' }}>Total HT</th>
          </tr>
        </thead>
        <tbody>
          {doc.items.map((item, i) => (
            <tr key={i}>
              <td style={S.td}>{item.description || '—'}</td>
              <td style={S.tdRight}>{item.qty}</td>
              <td style={S.tdRight}>{fmt(item.unitPrice)}</td>
              <td style={{ ...S.tdRight, fontWeight: '600' }}>{fmt(item.qty * item.unitPrice)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ── Totals ── */}
      <div style={S.totalsBox}>
        <div style={S.totalsTable}>
          <div style={S.totalsRow}>
            <span>Sous-total HT</span>
            <span>{fmt(doc.totalHT)}</span>
          </div>
          <div style={S.totalsRow}>
            <span>TVA ({doc.vatRate}%)</span>
            <span>{fmt(doc.totalTVA)}</span>
          </div>
          <div style={S.totalsRowTotal}>
            <span>Total TTC</span>
            <span>{fmt(doc.totalTTC)}</span>
          </div>
        </div>
      </div>

      {/* ── Notes ── */}
      {doc.notes && (
        <div style={S.notes}>
          <strong>Notes / Conditions :</strong> {doc.notes}
        </div>
      )}

      {/* ── Signatures ── */}
      <div style={S.signaturesBox}>
        <div style={S.sigBox}>
          <span style={S.sigLabel}>Signature de l'émetteur</span>
          <div style={{ height: '50px' }} />
          <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '6px', fontSize: '11px', color: '#9ca3af' }}>
            {doc.companyName}
          </div>
        </div>
        <div style={S.sigBox}>
          <span style={S.sigLabel}>Bon pour accord — client</span>
          <div style={{ height: '50px' }} />
          <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '6px', fontSize: '11px', color: '#9ca3af' }}>
            {doc.clientName || 'Nom du client'}
          </div>
        </div>
      </div>

      {/* ── Footer ── */}
      <div style={S.footer}>
        {[
          doc.companyName,
          doc.companyLegalForm,
          doc.companySiret && `SIRET ${doc.companySiret}`,
          doc.companyVat && `N° TVA ${doc.companyVat}`,
        ].filter(Boolean).join(' — ')}
      </div>
      <div style={{ fontSize: '9px', color: '#c4b5fd', textAlign: 'center', marginTop: '6px' }}>
        Bouba&apos;ia — Votre assistant exécutif IA | Document généré via Bouba IA
      </div>
    </div>
  )
})

DocumentTemplate.displayName = 'DocumentTemplate'
export default DocumentTemplate

// ── Print helper (pure HTML string — no React) ────────────────────────────────
export function buildPrintHTML(doc: SavedDocument): string {
  const statusInfo = STATUS_LABELS[doc.status]
  const docLabel = DOC_TYPE_LABELS[doc.type] || doc.type
  const fmt = (n: number) =>
    n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
  const formattedDate = (() => {
    try {
      return new Date(doc.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
    } catch { return doc.date }
  })()

  const itemRows = doc.items.map(item => `
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;">${item.description || '—'}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;text-align:right;">${item.qty}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;text-align:right;">${fmt(item.unitPrice)}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;text-align:right;font-weight:600;">${fmt(item.qty * item.unitPrice)}</td>
    </tr>`).join('')

  return `<!DOCTYPE html><html lang="fr"><head>
<meta charset="UTF-8">
<title>${docLabel} N° ${doc.number}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; color: #111827; font-size: 13px; line-height: 1.6; padding: 40px; max-width: 800px; margin: 0 auto; }
  @media print { body { padding: 20px; } @page { margin: 20mm; } }
</style>
</head><body>
<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px;padding-bottom:24px;border-bottom:2px solid #e5e7eb;">
  <div>
    ${doc.companyLogo ? `<img src="${doc.companyLogo}" style="max-width:120px;max-height:60px;object-fit:contain;margin-bottom:8px;display:block;" />` : ''}
    <p style="font-size:18px;font-weight:700;margin-bottom:4px;">${doc.companyName || 'Mon Entreprise'}</p>
    <div style="color:#6b7280;font-size:12px;line-height:1.5;">
      ${[doc.companyLegalForm, doc.companyAddress, [doc.companyPostalCode, doc.companyCity].filter(Boolean).join(' '), doc.companyCountry, doc.companyPhone && 'Tél. ' + doc.companyPhone, doc.companyEmail, doc.companyWebsite, doc.companySiret && 'SIRET : ' + doc.companySiret, doc.companyVat && 'N° TVA : ' + doc.companyVat].filter(Boolean).map(l => `<div>${l}</div>`).join('')}
    </div>
  </div>
  <div style="text-align:right;">
    <p style="font-size:22px;font-weight:800;color:#4f46e5;text-transform:uppercase;letter-spacing:0.05em;">${docLabel}</p>
    <p style="font-size:13px;font-weight:600;color:#374151;">N° ${doc.number}</p>
    <p style="font-size:12px;color:#6b7280;margin-top:4px;">Date : ${formattedDate}</p>
    <span style="display:inline-block;padding:2px 10px;border-radius:9999px;font-size:11px;font-weight:600;color:#fff;background-color:${statusInfo.color};margin-top:6px;">${statusInfo.label}</span>
  </div>
</div>

<div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px 20px;margin-bottom:28px;">
  <p style="font-size:10px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:8px;">Facturé à / Destinataire</p>
  <p style="font-size:15px;font-weight:700;">${doc.clientName || '—'}</p>
  ${doc.clientAddress ? `<p style="color:#6b7280;font-size:12px;">${doc.clientAddress}</p>` : ''}
  ${doc.clientEmail ? `<p style="color:#6b7280;font-size:12px;">${doc.clientEmail}</p>` : ''}
</div>

<table style="width:100%;border-collapse:collapse;margin-bottom:20px;font-size:12.5px;">
  <thead style="background:#f3f4f6;">
    <tr>
      <th style="padding:10px 12px;text-align:left;font-weight:700;color:#374151;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;width:50%;">Description</th>
      <th style="padding:10px 12px;text-align:right;font-weight:700;color:#374151;font-size:11px;text-transform:uppercase;width:10%;">Qté</th>
      <th style="padding:10px 12px;text-align:right;font-weight:700;color:#374151;font-size:11px;text-transform:uppercase;width:20%;">Prix HT</th>
      <th style="padding:10px 12px;text-align:right;font-weight:700;color:#374151;font-size:11px;text-transform:uppercase;width:20%;">Total HT</th>
    </tr>
  </thead>
  <tbody>${itemRows}</tbody>
</table>

<div style="display:flex;justify-content:flex-end;margin-bottom:28px;">
  <div style="min-width:240px;font-size:13px;">
    <div style="display:flex;justify-content:space-between;gap:32px;padding:5px 0;color:#6b7280;"><span>Sous-total HT</span><span>${fmt(doc.totalHT)}</span></div>
    <div style="display:flex;justify-content:space-between;gap:32px;padding:5px 0;color:#6b7280;"><span>TVA (${doc.vatRate}%)</span><span>${fmt(doc.totalTVA)}</span></div>
    <div style="display:flex;justify-content:space-between;gap:32px;padding:10px 0;border-top:2px solid #111827;margin-top:4px;font-weight:800;font-size:15px;"><span>Total TTC</span><span>${fmt(doc.totalTTC)}</span></div>
  </div>
</div>

${doc.notes ? `<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:12px 16px;margin-bottom:28px;font-size:12px;color:#92400e;"><strong>Notes / Conditions :</strong> ${doc.notes}</div>` : ''}

<div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-top:40px;padding-top:24px;border-top:1px solid #e5e7eb;">
  <div style="border:1px solid #e5e7eb;border-radius:8px;padding:12px 16px;min-height:80px;">
    <span style="font-size:10px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.1em;display:block;margin-bottom:4px;">Signature de l'émetteur</span>
    <div style="height:50px;"></div>
    <div style="border-top:1px solid #e5e7eb;padding-top:6px;font-size:11px;color:#9ca3af;">${doc.companyName}</div>
  </div>
  <div style="border:1px solid #e5e7eb;border-radius:8px;padding:12px 16px;min-height:80px;">
    <span style="font-size:10px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.1em;display:block;margin-bottom:4px;">Bon pour accord — client</span>
    <div style="height:50px;"></div>
    <div style="border-top:1px solid #e5e7eb;padding-top:6px;font-size:11px;color:#9ca3af;">${doc.clientName || 'Nom du client'}</div>
  </div>
</div>

<div style="margin-top:32px;padding-top:16px;border-top:1px solid #f3f4f6;font-size:10px;color:#9ca3af;text-align:center;line-height:1.7;">
  ${[doc.companyName, doc.companyLegalForm, doc.companySiret && `SIRET ${doc.companySiret}`, doc.companyVat && `N° TVA ${doc.companyVat}`].filter(Boolean).join(' — ')}
</div>
<div style="font-size:9px;color:#c4b5fd;text-align:center;margin-top:6px;">
  Bouba'ia — Votre assistant exécutif IA | Document généré via Bouba IA
</div>
</body></html>`
}

// ── Email helper (body content only, no <html><head> wrappers) ─────────────────
export function buildEmailBody(doc: SavedDocument, introHtml?: string): string {
  const full = buildPrintHTML(doc)
  const bodyContent = full.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1]?.trim() ?? ''
  const intro = introHtml
    ? `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;max-width:800px;margin:0 auto;padding:20px 40px 16px;">${introHtml}</div><hr style="margin:0;border:none;border-top:2px solid #e5e7eb;">`
    : ''
  return `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;background:#f5f5f5;padding:24px 0;">${intro}<div style="max-width:800px;margin:0 auto;background:#fff;padding:40px;">${bodyContent}</div></div>`
}
