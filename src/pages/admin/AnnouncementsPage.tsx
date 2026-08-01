import React, { useState, useEffect, useCallback } from 'react';
import { Bell, Send, Plus, Trash2, Eye, Calendar, Search, RefreshCw, X } from 'lucide-react';
import { toast } from 'sonner';

interface Announcement {
  id: string;
  title: string;
  content?: string;
  type: string;
  target?: string;
  status: 'sent' | 'draft';
  sent_date: string | null;
  recipients: number;
  opened: number;
}

interface UserOption { id: string; email: string; firstName?: string; lastName?: string }

const TARGET_LABELS: Record<string, string> = {
  all: 'Tous les utilisateurs',
  user: 'Utilisateur spécifique',
  free_users: 'Plan Free',
  starter_users: 'Plan Starter',
  business_users: 'Plan Business',
  enterprise_users: 'Plan Enterprise',
};

interface Stats {
  total: number;
  sent: number;
  opened: number;
  clicked: number;
}

const TYPE_LABELS: Record<string, string> = {
  feature: 'Nouveauté',
  promotion: 'Promotion',
  maintenance: 'Maintenance',
  info: 'Info',
};

const TYPE_COLORS: Record<string, string> = {
  feature: 'bg-blue-100 text-blue-800',
  promotion: 'bg-green-100 text-green-800',
  maintenance: 'bg-yellow-100 text-yellow-800',
  info: 'bg-gray-100 text-gray-700',
};

const AnnouncementsPage: React.FC = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, sent: 0, opened: 0, clicked: 0 });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ title: '', content: '', type: 'feature', target: 'all' });
  const [users, setUsers] = useState<UserOption[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserOption | null>(null);

  // Charger la liste des utilisateurs à la 1re sélection de la cible « Utilisateur spécifique »
  useEffect(() => {
    if (form.target === 'user' && users.length === 0) {
      fetch('/api/admin/users', { credentials: 'include' })
        .then(r => r.json())
        .then(j => { if (j.success) setUsers(j.data ?? []); })
        .catch(() => toast.error('Impossible de charger les utilisateurs'));
    }
  }, [form.target, users.length]);

  const matchingUsers = userSearch.trim()
    ? users.filter(u => {
        const q = userSearch.toLowerCase();
        return u.email?.toLowerCase().includes(q)
          || `${u.firstName ?? ''} ${u.lastName ?? ''}`.toLowerCase().includes(q);
      }).slice(0, 6)
    : [];

  const fetchAnnouncements = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/announcements', { credentials: 'include' });
      const json = await res.json();
      if (json.success) {
        setAnnouncements(json.data ?? []);
        if (json.stats) setStats(json.stats);
      } else {
        toast.error('Erreur lors du chargement des annonces');
      }
    } catch {
      toast.error('Impossible de contacter le serveur');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAnnouncements(); }, [fetchAnnouncements]);

  const handleCreate = async () => {
    if (!form.title.trim()) { toast.error('Titre requis'); return; }
    if (!form.content.trim()) { toast.error('Contenu requis'); return; }
    if (form.target === 'user' && !selectedUser) { toast.error('Sélectionnez un utilisateur à notifier'); return; }
    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/announcements', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, userId: form.target === 'user' ? selectedUser?.id : undefined }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(
          form.target === 'user'
            ? `Annonce envoyée à ${selectedUser?.email} — visible sur son dashboard`
            : `Annonce envoyée à ${json.data.recipients} utilisateur(s) — visible sur leur dashboard`
        );
        setAnnouncements(prev => [json.data, ...prev]);
        setStats(prev => ({ ...prev, total: prev.total + 1, sent: prev.sent + 1 }));
        setShowModal(false);
        setForm({ title: '', content: '', type: 'feature', target: 'all' });
        setSelectedUser(null);
        setUserSearch('');
      } else {
        toast.error(json.error || 'Erreur lors de la création');
      }
    } catch {
      toast.error('Erreur réseau');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette annonce et toutes les notifications associées ?')) return;
    try {
      const res = await fetch(`/api/admin/announcements/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const json = await res.json();
      if (json.success) {
        setAnnouncements(prev => prev.filter(a => a.id !== id));
        toast.success('Annonce supprimée');
      } else {
        toast.error('Erreur lors de la suppression');
      }
    } catch {
      toast.error('Erreur réseau');
    }
  };

  const filtered = announcements.filter(a =>
    !searchTerm || a.title?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion des annonces</h1>
          <p className="text-gray-500 text-sm">Communiquez avec vos utilisateurs via les notifications</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchAnnouncements}
            disabled={loading}
            className="p-2 border border-gray-300 rounded-lg text-gray-500 hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Nouvelle annonce
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: Bell, color: 'text-blue-600', label: 'Annonces totales', value: stats.total },
          { icon: Send, color: 'text-green-600', label: 'Envoyées', value: stats.sent },
          { icon: Eye, color: 'text-purple-600', label: 'Ouvertures', value: stats.opened },
          { icon: Bell, color: 'text-orange-600', label: 'Non lues', value: Math.max(0, stats.opened) },
        ].map(({ icon: Icon, color, label, value }) => (
          <div key={label} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <Icon className={`w-6 h-6 ${color}`} />
              <span className="text-2xl font-bold text-gray-900">{value}</span>
            </div>
            <p className="text-gray-500 text-sm">{label}</p>
          </div>
        ))}
      </div>

      {/* List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-semibold text-gray-900">Annonces ({filtered.length})</h3>
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Rechercher…"
              className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm w-56 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <Bell className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">
              {searchTerm ? 'Aucune annonce correspondante' : 'Aucune annonce envoyée pour le moment'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((ann) => (
              <div key={ann.id} className="border border-gray-200 rounded-lg p-5 hover:bg-gray-50">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-gray-900 truncate">{ann.title}</h4>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_COLORS[ann.type] || TYPE_COLORS.info}`}>
                        {TYPE_LABELS[ann.type] || ann.type}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-violet-50 text-violet-700 border border-violet-200">
                        {TARGET_LABELS[ann.target || 'all'] || ann.target}
                      </span>
                      {ann.sent_date && (
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(ann.sent_date).toLocaleDateString('fr-FR')}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="ml-3 flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Envoyé
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-6 text-center">
                    <div>
                      <p className="font-bold text-gray-900">{ann.recipients}</p>
                      <p className="text-xs text-gray-400">Destinataires</p>
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">{ann.opened}</p>
                      <p className="text-xs text-gray-400">Ouvertures</p>
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">
                        {ann.recipients > 0 ? Math.round((ann.opened / ann.recipients) * 100) : 0}%
                      </p>
                      <p className="text-xs text-gray-400">Taux d'ouverture</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(ann.id)}
                    className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-lg">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-gray-900">Nouvelle annonce</h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Titre *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Titre de l'annonce"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contenu *</label>
                <textarea
                  value={form.content}
                  onChange={(e) => setForm(f => ({ ...f, content: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm h-28 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="Message de l'annonce…"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm(f => ({ ...f, type: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="feature">Nouveauté</option>
                    <option value="promotion">Promotion</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="info">Info</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cible</label>
                  <select
                    value={form.target}
                    onChange={(e) => { setForm(f => ({ ...f, target: e.target.value })); setSelectedUser(null); setUserSearch(''); }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">Tous les utilisateurs</option>
                    <option value="user">Utilisateur spécifique</option>
                    <option value="free_users">Utilisateurs Free</option>
                    <option value="starter_users">Utilisateurs Starter</option>
                    <option value="business_users">Utilisateurs Business</option>
                    <option value="enterprise_users">Utilisateurs Enterprise</option>
                  </select>
                </div>
              </div>

              {/* Sélecteur d'utilisateur spécifique */}
              {form.target === 'user' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Utilisateur à notifier <span className="text-red-500">*</span>
                  </label>
                  {selectedUser ? (
                    <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {[selectedUser.firstName, selectedUser.lastName].filter(Boolean).join(' ') || selectedUser.email}
                        </p>
                        <p className="text-xs text-gray-500 truncate">{selectedUser.email}</p>
                      </div>
                      <button onClick={() => setSelectedUser(null)} className="p-1 hover:bg-blue-100 rounded shrink-0">
                        <X className="w-4 h-4 text-gray-500" />
                      </button>
                    </div>
                  ) : (
                    <div className="relative">
                      <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                      <input
                        value={userSearch}
                        onChange={(e) => setUserSearch(e.target.value)}
                        placeholder="Rechercher par nom ou email…"
                        className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      {matchingUsers.length > 0 && (
                        <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                          {matchingUsers.map(u => (
                            <button
                              key={u.id}
                              onClick={() => { setSelectedUser(u); setUserSearch(''); }}
                              className="w-full text-left px-3 py-2 hover:bg-blue-50 border-b border-gray-100 last:border-0"
                            >
                              <p className="text-sm font-medium text-gray-900">
                                {[u.firstName, u.lastName].filter(Boolean).join(' ') || u.email}
                              </p>
                              <p className="text-xs text-gray-500">{u.email}</p>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-4">
              L'annonce apparaîtra en <strong>bannière sur le dashboard</strong> des destinataires jusqu'à ce qu'ils la ferment.
            </p>

            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                onClick={handleCreate}
                disabled={submitting}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                {submitting ? 'Envoi…' : 'Envoyer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnnouncementsPage;
