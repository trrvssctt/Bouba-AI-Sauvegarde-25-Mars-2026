import { useState, useEffect, useCallback } from 'react';
import { CheckCircle, DollarSign, Search, RefreshCw, Clock, XCircle, Download, Loader2, Ban, X, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface Payment {
  id: string;
  origin: 'payment' | 'upgrade_request';
  userId: string;
  amount: number;
  currency: string;
  status: string;
  method: string;
  plan?: string;
  reference?: string;
  proofName?: string;
  kind: string;
  date: string;
  email: string;
  firstName?: string;
  lastName?: string;
}

const STATUS_STYLES: Record<string, string> = {
  succeeded: 'bg-green-100 text-green-800',
  pending: 'bg-yellow-100 text-yellow-800',
  failed: 'bg-red-100 text-red-800',
};
const STATUS_LABELS: Record<string, string> = {
  succeeded: 'Validé',
  pending: 'En attente',
  failed: 'Échoué / Rejeté',
};

const KIND_LABELS: Record<string, { label: string; class: string }> = {
  subscription: { label: 'Abonnement', class: 'bg-violet-100 text-violet-700' },
  renewal: { label: 'Réabonnement', class: 'bg-blue-100 text-blue-700' },
  upgrade: { label: 'Upgrade', class: 'bg-emerald-100 text-emerald-700' },
  manual: { label: 'Création admin', class: 'bg-gray-100 text-gray-600' },
};

const METHOD_LABELS: Record<string, { label: string; hint: string; class: string }> = {
  wave: { label: 'Wave', hint: 'validation manuelle', class: 'bg-sky-100 text-sky-700' },
  stripe: { label: 'Stripe', hint: 'validation automatique', class: 'bg-indigo-100 text-indigo-700' },
  card: { label: 'Carte', hint: 'validation automatique', class: 'bg-indigo-100 text-indigo-700' },
  manual: { label: 'Manuel', hint: 'enregistré par admin', class: 'bg-gray-100 text-gray-600' },
};

const REJECTION_REASONS = [
  'Référence de paiement introuvable',
  'Montant incorrect',
  'Paiement non reçu sur le compte Wave',
  'Référence déjà utilisée',
  'Autre raison',
];

const fmtAmount = (amount: number, currency: string) => {
  const value = currency === 'EUR' && amount > 200 ? amount / 100 : amount;
  const symbol = currency === 'EUR' ? '€' : currency === 'XOF' ? 'FCFA' : currency;
  return `${value.toLocaleString('fr-FR')} ${symbol}`;
};

const fmtDate = (d: string) =>
  d ? new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

const PaymentsPage = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [kindFilter, setKindFilter] = useState('all');
  const [validatingId, setValidatingId] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<Payment | null>(null);
  const [rejectReason, setRejectReason] = useState(REJECTION_REASONS[0]);
  const [rejectOther, setRejectOther] = useState('');

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/payments/all', { credentials: 'include' });
      const json = await res.json();
      if (json.success) setPayments(json.data ?? []);
      else toast.error('Erreur lors du chargement des paiements');
    } catch {
      toast.error('Impossible de contacter le serveur');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPayments(); }, [fetchPayments]);

  // Paiements Wave en attente de validation manuelle (hors upgrades — traités dans Facturation)
  const pendingWave = payments.filter(p => p.status === 'pending' && p.method !== 'stripe' && p.origin === 'payment');

  const handleValidate = async (payment: Payment, action: 'approve' | 'reject', reason?: string) => {
    setValidatingId(payment.id);
    try {
      const res = await fetch(`/api/admin/payments/${payment.id}/validate`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reason }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      toast.success(json.message);
      setRejectTarget(null);
      fetchPayments();
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la validation');
    } finally {
      setValidatingId(null);
    }
  };

  const handleDownloadInvoice = (p: Payment) => {
    const params = new URLSearchParams({ userId: p.userId });
    if (p.origin === 'upgrade_request') params.set('upgradeRequestId', p.id);
    else params.set('paymentId', p.id);
    window.open(`/api/admin/billing/invoice-pdf?${params}`, '_blank');
  };

  const filtered = payments.filter(p => {
    if (kindFilter !== 'all' && p.kind !== kindFilter) return false;
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    const name = `${p.firstName ?? ''} ${p.lastName ?? ''}`.toLowerCase();
    return name.includes(q) || p.email?.toLowerCase().includes(q) || p.id?.toLowerCase().includes(q) || (p.reference ?? '').toLowerCase().includes(q);
  });

  const succeeded = payments.filter(p => p.status === 'succeeded');
  const totalMonth = succeeded
    .filter(p => p.date?.startsWith(new Date().toISOString().slice(0, 7)))
    .length;
  const successRate = payments.length > 0
    ? Math.round((succeeded.length / payments.length) * 1000) / 10
    : 0;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion des Paiements</h1>
          <p className="text-gray-500 text-sm">Historique complet des transactions · Wave à valider manuellement, Stripe validé automatiquement.</p>
        </div>
        <button
          onClick={fetchPayments}
          disabled={loading}
          className="p-2 border border-gray-300 rounded-lg text-gray-500 hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* ── Paiements Wave en attente de validation ── */}
      {pendingWave.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-amber-200">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <div className="flex-1">
              <h3 className="font-bold text-amber-800 text-sm">
                {pendingWave.length} paiement{pendingWave.length > 1 ? 's' : ''} Wave en attente de validation
              </h3>
              <p className="text-xs text-amber-600">Vérifiez la référence Wave reçue sur le compte marchand avant de valider.</p>
            </div>
          </div>
          <div className="divide-y divide-amber-100 bg-white">
            {pendingWave.map(p => {
              const name = [p.firstName, p.lastName].filter(Boolean).join(' ') || p.email;
              return (
                <div key={p.id} className="px-5 py-3.5 flex items-center gap-4 flex-wrap">
                  <div className="min-w-[180px]">
                    <p className="text-sm font-bold text-gray-900">{name}</p>
                    <p className="text-xs text-gray-500">{p.email}</p>
                  </div>
                  <div className="text-sm font-bold text-gray-900">{fmtAmount(p.amount, p.currency)}</div>
                  {p.plan && <span className="text-[10px] font-bold bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full uppercase">{p.plan}</span>}
                  {p.reference && (
                    <span className="font-mono text-xs bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1 text-gray-700">
                      Réf : {p.reference}
                    </span>
                  )}
                  <span className="text-xs text-gray-400">{fmtDate(p.date)}</span>
                  <div className="flex items-center gap-2 ml-auto">
                    <button
                      onClick={() => handleValidate(p, 'approve')}
                      disabled={validatingId === p.id}
                      className="flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-xl bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-50"
                    >
                      {validatingId === p.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                      Valider
                    </button>
                    <button
                      onClick={() => { setRejectTarget(p); setRejectReason(REJECTION_REASONS[0]); setRejectOther(''); }}
                      disabled={validatingId === p.id}
                      className="flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                    >
                      <Ban className="w-3.5 h-3.5" /> Rejeter
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 border border-gray-200">
          <div className="flex items-center justify-between mb-1">
            <h4 className="text-sm font-medium text-gray-600">Total transactions</h4>
            <DollarSign className="w-5 h-5 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{payments.length}</p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-gray-200">
          <div className="flex items-center justify-between mb-1">
            <h4 className="text-sm font-medium text-gray-600">Validés ce mois</h4>
            <CheckCircle className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{totalMonth}</p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-gray-200">
          <div className="flex items-center justify-between mb-1">
            <h4 className="text-sm font-medium text-gray-600">En attente (Wave)</h4>
            <Clock className="w-5 h-5 text-yellow-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{pendingWave.length}</p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-gray-200">
          <div className="flex items-center justify-between mb-1">
            <h4 className="text-sm font-medium text-gray-600">Taux de succès</h4>
            <CheckCircle className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-2xl font-bold text-green-600">{successRate}%</p>
        </div>
      </div>

      {/* Recherche + filtre type */}
      <div className="bg-white rounded-xl p-5 border border-gray-200 flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher par client, email, ID ou référence…"
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={kindFilter}
          onChange={(e) => setKindFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">Tous les types</option>
          <option value="subscription">Abonnements</option>
          <option value="renewal">Réabonnements</option>
          <option value="upgrade">Upgrades</option>
          <option value="manual">Créations admin</option>
        </select>
      </div>

      {/* Table historique complet */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">Chargement…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <DollarSign className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">
              {searchTerm || kindFilter !== 'all' ? 'Aucun paiement correspondant' : 'Aucun paiement enregistré'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {['Client', 'Type', 'Méthode', 'Montant', 'Référence', 'Date', 'Statut', 'Facture'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((p) => {
                  const name = [p.firstName, p.lastName].filter(Boolean).join(' ') || '—';
                  const statusStyle = STATUS_STYLES[p.status] ?? 'bg-gray-100 text-gray-700';
                  const kind = KIND_LABELS[p.kind] ?? { label: p.kind, class: 'bg-gray-100 text-gray-600' };
                  const method = METHOD_LABELS[p.method] ?? { label: p.method || '—', hint: '', class: 'bg-gray-100 text-gray-600' };
                  return (
                    <tr key={`${p.origin}-${p.id}`} className="hover:bg-gray-50">
                      <td className="px-5 py-3">
                        <p className="text-sm font-medium text-gray-900">{name}</p>
                        <p className="text-xs text-gray-400">{p.email}</p>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${kind.class}`}>
                          {kind.label}
                        </span>
                        {p.plan && <p className="text-[10px] text-gray-400 mt-1 uppercase font-bold">{p.plan}</p>}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${method.class}`}>
                          {method.label}
                        </span>
                        {method.hint && <p className="text-[10px] text-gray-400 mt-1">{method.hint}</p>}
                      </td>
                      <td className="px-5 py-3 text-sm font-bold text-gray-900">{fmtAmount(p.amount, p.currency)}</td>
                      <td className="px-5 py-3 text-xs font-mono text-gray-500 max-w-[140px] truncate">{p.reference || '—'}</td>
                      <td className="px-5 py-3 text-sm text-gray-600 whitespace-nowrap">{fmtDate(p.date)}</td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${statusStyle}`}>
                          {p.status === 'succeeded' ? <CheckCircle className="w-3 h-3" /> :
                           p.status === 'failed' ? <XCircle className="w-3 h-3" /> :
                           <Clock className="w-3 h-3" />}
                          {STATUS_LABELS[p.status] ?? p.status}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <button
                          onClick={() => handleDownloadInvoice(p)}
                          title={p.status === 'succeeded' ? 'Télécharger le reçu (tampon PAYÉE)' : 'Télécharger la facture'}
                          className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          <Download className="w-3.5 h-3.5" /> PDF
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {filtered.length > 0 && (
        <p className="text-sm text-gray-500 text-right">{filtered.length} transaction(s) affichée(s)</p>
      )}

      {/* Modal rejet paiement Wave */}
      {rejectTarget && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md">
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center shrink-0">
                <Ban className="w-5 h-5 text-red-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-gray-900">Rejeter le paiement Wave</h3>
                <p className="text-sm text-gray-600 mt-1">
                  {rejectTarget.email} — {fmtAmount(rejectTarget.amount, rejectTarget.currency)}
                </p>
              </div>
              <button onClick={() => setRejectTarget(null)} className="p-1.5 hover:bg-gray-100 rounded-lg shrink-0">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <div className="mt-4 space-y-3">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Motif du rejet</label>
              <select
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
              >
                {REJECTION_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
              {rejectReason === 'Autre raison' && (
                <input
                  value={rejectOther}
                  onChange={(e) => setRejectOther(e.target.value)}
                  placeholder="Précisez le motif…"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                />
              )}
              <p className="text-xs text-gray-400">Le client sera notifié par email et dans l'application avec ce motif.</p>
            </div>
            <div className="flex items-center justify-end gap-3 mt-6">
              <button onClick={() => setRejectTarget(null)} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-xl text-sm hover:bg-gray-50">
                Annuler
              </button>
              <button
                onClick={() => {
                  const reason = rejectReason === 'Autre raison' ? rejectOther : rejectReason;
                  if (!reason.trim()) { toast.error('Précisez le motif du rejet'); return; }
                  handleValidate(rejectTarget, 'reject', reason);
                }}
                disabled={validatingId === rejectTarget.id}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 disabled:opacity-50"
              >
                {validatingId === rejectTarget.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ban className="w-4 h-4" />}
                Confirmer le rejet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentsPage;
