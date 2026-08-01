import React, { useState, useEffect } from 'react';
import { 
  Users, CreditCard, TrendingUp, Shield, CheckCircle, XCircle, 
  RefreshCw, AlertCircle, DollarSign, BarChart3, UserCheck, Clock,
  Search, Filter, Download, Eye, Check, X, MoreVertical
} from 'lucide-react';
import { toast } from 'sonner';

const AdminDashboardPage: React.FC = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    pendingPayments: 0,
    revenue: { today: 0, month: 0, total: 0 }
  });
  
  const [pendingPayments, setPendingPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'payments' | 'users'>('overview');

  // Données simulées
  const mockStats = {
    totalUsers: 156,
    activeUsers: 142,
    pendingPayments: 8,
    revenue: { today: 12500, month: 189500, total: 1250000 }
  };

  const mockPayments = [
    { id: 1, user: 'test@example.com', amount: 6500, currency: 'XOF', status: 'pending', date: '2026-04-15', plan: 'Starter' },
    { id: 2, user: 'demo@example.com', amount: 19900, currency: 'XOF', status: 'pending', date: '2026-04-14', plan: 'Business' },
    { id: 3, user: 'new@example.com', amount: 6500, currency: 'XOF', status: 'pending', date: '2026-04-13', plan: 'Starter' },
    { id: 4, user: 'entreprise@example.com', amount: 19900, currency: 'XOF', status: 'pending', date: '2026-04-12', plan: 'Business' },
    { id: 5, user: 'startup@example.com', amount: 6500, currency: 'XOF', status: 'pending', date: '2026-04-11', plan: 'Starter' }
  ];

  useEffect(() => {
    // Simuler chargement des données
    setTimeout(() => {
      setStats(mockStats);
      setPendingPayments(mockPayments);
      setLoading(false);
    }, 1000);
  }, []);

  const handleApprovePayment = (paymentId: number) => {
    toast.success(`Paiement #${paymentId} approuvé`);
    setPendingPayments(prev => prev.filter(p => p.id !== paymentId));
    setStats(prev => ({ ...prev, pendingPayments: prev.pendingPayments - 1 }));
  };

  const handleRejectPayment = (paymentId: number) => {
    toast.error(`Paiement #${paymentId} rejeté`);
    setPendingPayments(prev => prev.filter(p => p.id !== paymentId));
    setStats(prev => ({ ...prev, pendingPayments: prev.pendingPayments - 1 }));
  };

  const handleRefresh = () => {
    setLoading(true);
    toast.info('Actualisation des données...');
    setTimeout(() => {
      setStats(mockStats);
      setPendingPayments(mockPayments);
      setLoading(false);
      toast.success('Données actualisées');
    }, 800);
  };

  const StatCard = ({ title, value, icon: Icon, color }: any) => (
    <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-lg ${color} bg-opacity-10`}>
          <Icon className={`w-6 h-6 ${color}`} />
        </div>
      </div>
      <h3 className="text-2xl font-bold text-gray-900 mb-1">{value}</h3>
      <p className="text-gray-600 text-sm">{title}</p>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Chargement du tableau de bord admin...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Tableau de bord Admin</h1>
                <p className="text-gray-600 text-sm">Gestion de la plateforme Bouba'IA</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleRefresh}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
              >
                <RefreshCw className="w-4 h-4" />
                Actualiser
              </button>
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 font-bold">A</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition ${
              activeTab === 'overview' 
                ? 'bg-white text-blue-600 shadow-sm' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <BarChart3 className="w-4 h-4 inline mr-2" />
            Vue d'ensemble
          </button>
          <button
            onClick={() => setActiveTab('payments')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition ${
              activeTab === 'payments' 
                ? 'bg-white text-blue-600 shadow-sm' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <CreditCard className="w-4 h-4 inline mr-2" />
            Paiements ({stats.pendingPayments})
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition ${
              activeTab === 'users' 
                ? 'bg-white text-blue-600 shadow-sm' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Users className="w-4 h-4 inline mr-2" />
            Utilisateurs
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'overview' && (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <StatCard
                title="Utilisateurs totaux"
                value={stats.totalUsers}
                icon={Users}
                color="text-blue-600"
              />
              <StatCard
                title="Utilisateurs actifs"
                value={stats.activeUsers}
                icon={UserCheck}
                color="text-green-600"
              />
              <StatCard
                title="Paiements en attente"
                value={stats.pendingPayments}
                icon={AlertCircle}
                color="text-yellow-600"
              />
              <StatCard
                title="Revenu mensuel"
                value={`${stats.revenue.month.toLocaleString()} XOF`}
                icon={DollarSign}
                color="text-purple-600"
              />
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenu aujourd'hui</h3>
                <div className="text-3xl font-bold text-gray-900">
                  {stats.revenue.today.toLocaleString()} XOF
                </div>
              </div>
              
              <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenu total</h3>
                <div className="text-3xl font-bold text-gray-900">
                  {stats.revenue.total.toLocaleString()} XOF
                </div>
              </div>
              
              <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Distribution des plans</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Free</span>
                    <span className="font-semibold">45%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Starter</span>
                    <span className="font-semibold">35%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Business</span>
                    <span className="font-semibold">20%</span>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'payments' && (
          <div className="bg-white rounded-xl shadow-md border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Paiements en attente</h3>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Rechercher..."
                      className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                  <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
                    <Filter className="w-4 h-4" />
                    Filtrer
                  </button>
                </div>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                    <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Utilisateur</th>
                    <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Montant</th>
                    <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Plan</th>
                    <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {pendingPayments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-gray-50">
                      <td className="py-4 px-6 text-sm font-medium text-gray-900">#{payment.id}</td>
                      <td className="py-4 px-6 text-sm text-gray-900">{payment.user}</td>
                      <td className="py-4 px-6 text-sm text-gray-900">
                        <span className="font-semibold">{payment.amount.toLocaleString()} {payment.currency}</span>
                      </td>
                      <td className="py-4 px-6 text-sm text-gray-900">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          payment.plan === 'Business' ? 'bg-purple-100 text-purple-800' :
                          payment.plan === 'Starter' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {payment.plan}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-sm text-gray-500">{payment.date}</td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleApprovePayment(payment.id)}
                            className="p-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition"
                            title="Approuver"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleRejectPayment(payment.id)}
                            className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition"
                            title="Rejeter"
                          >
                            <X className="w-4 h-4" />
                          </button>
                          <button
                            className="p-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                            title="Voir détails"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {pendingPayments.length === 0 && (
              <div className="p-12 text-center">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                <h4 className="text-lg font-medium text-gray-900 mb-2">Aucun paiement en attente</h4>
                <p className="text-gray-600">Tous les paiements ont été traités.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'users' && (
          <div className="bg-white rounded-xl shadow-md border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Utilisateurs (156)</h3>
                <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                  <Download className="w-4 h-4" />
                  Exporter
                </button>
              </div>
            </div>
            
            <div className="p-6">
              <div className="text-center text-gray-600">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p>Page utilisateurs en développement</p>
                <p className="text-sm mt-2">Disponible dans la prochaine mise à jour</p>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center text-gray-500 text-sm">
          <p>© 2026 Bouba'IA - Tableau de bord administratif</p>
          <p className="mt-1">Connecté en tant qu'administrateur</p>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardPage;