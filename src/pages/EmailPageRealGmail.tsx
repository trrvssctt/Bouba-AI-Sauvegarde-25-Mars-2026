import { useState, useEffect } from 'react';
import { 
  Mail, Search, Filter, Star, Archive, Trash2, Send, Paperclip, 
  RefreshCw, Settings, LogIn, LogOut, AlertCircle, CheckCircle,
  Inbox, Send as SendIcon, FileText, Folder
} from 'lucide-react';

const EmailPageRealGmail = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [emails, setEmails] = useState<any[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [folder, setFolder] = useState('inbox');

  // Simuler la connexion OAuth à Gmail
  const handleConnectGmail = () => {
    setIsConnecting(true);
    setError(null);
    
    // Simuler le processus OAuth
    setTimeout(() => {
      const success = Math.random() > 0.2; // 80% de succès
      
      if (success) {
        setIsConnected(true);
        setIsConnecting(false);
        
        // Charger des emails mockés (en attendant la vraie API)
        loadMockEmails();
      } else {
        setError('Échec de la connexion à Gmail. Veuillez réessayer.');
        setIsConnecting(false);
      }
    }, 2000);
  };

  const handleDisconnect = () => {
    setIsConnected(false);
    setEmails([]);
    setSelectedEmail(null);
  };

  const loadMockEmails = () => {
    setLoading(true);
    
    // Emails mockés réalistes
    const mockEmails = [
      {
        id: '1',
        from: 'support@bouba.ai',
        fromName: 'Support Bouba',
        to: 'vous@gmail.com',
        subject: 'Bienvenue sur Bouba ! Votre compte est activé',
        body: 'Bonjour,\n\nNous sommes ravis de vous accueillir sur Bouba. Votre compte a été activé avec succès.\n\nPour commencer, connectez votre Gmail pour gérer vos emails directement depuis Bouba.\n\nCordialement,\nL\'équipe Bouba',
        date: new Date().toISOString(),
        unread: true,
        starred: false,
        hasAttachments: false,
        folder: 'inbox'
      },
      {
        id: '2',
        from: 'notifications@github.com',
        fromName: 'GitHub',
        to: 'vous@gmail.com',
        subject: 'Nouveau commit sur votre repository',
        body: 'Un nouveau commit a été poussé sur le repository "bouba-ai".\n\nCommit: "feat: add real Gmail integration"\nAuteur: Dev Team\n\nVoir les détails sur GitHub.',
        date: new Date(Date.now() - 3600000).toISOString(),
        unread: true,
        starred: true,
        hasAttachments: true,
        folder: 'inbox'
      },
      {
        id: '3',
        from: 'facturation@stripe.com',
        fromName: 'Stripe',
        to: 'vous@gmail.com',
        subject: 'Reçu de paiement #INV-2024-001',
        body: 'Votre paiement de 29.99€ a été traité avec succès.\n\nDétails de la transaction:\n- Montant: 29.99€\n- Date: Aujourd\'hui\n- Référence: INV-2024-001\n\nMerci pour votre confiance.',
        date: new Date(Date.now() - 7200000).toISOString(),
        unread: false,
        starred: false,
        hasAttachments: true,
        folder: 'inbox'
      },
      {
        id: '4',
        from: 'contact@calendly.com',
        fromName: 'Calendly',
        to: 'vous@gmail.com',
        subject: 'Nouveau rendez-vous confirmé',
        body: 'Votre rendez-vous avec "Jean Dupont" a été confirmé pour demain à 14h.\n\nSujet: Réunion projet Bouba\nDurée: 1 heure\n\nUn rappel vous sera envoyé 30 minutes avant.',
        date: new Date(Date.now() - 86400000).toISOString(),
        unread: false,
        starred: true,
        hasAttachments: false,
        folder: 'inbox'
      },
      {
        id: '5',
        from: 'news@medium.com',
        fromName: 'Medium',
        to: 'vous@gmail.com',
        subject: 'Vos recommandations du jour',
        body: 'Découvrez les articles les plus populaires sur l\'IA et le développement web:\n\n1. "Les 10 tendances IA en 2024"\n2. "Comment construire une SaaS profitable"\n3. "React vs Vue: lequel choisir?"\n\nBonne lecture!',
        date: new Date(Date.now() - 172800000).toISOString(),
        unread: false,
        starred: false,
        hasAttachments: false,
        folder: 'inbox'
      }
    ];

    setTimeout(() => {
      setEmails(mockEmails);
      setLoading(false);
    }, 1000);
  };

  const handleRefresh = () => {
    if (isConnected) {
      setLoading(true);
      setTimeout(() => {
        // Simuler un refresh avec potentiellement de nouveaux emails
        const newEmail = {
          id: (emails.length + 1).toString(),
          from: 'noreply@google.com',
          fromName: 'Google',
          to: 'vous@gmail.com',
          subject: 'Mise à jour de sécurité recommandée',
          body: 'Nous recommandons de vérifier vos paramètres de sécurité.\n\nConnectez-vous à votre compte Google pour plus de détails.',
          date: new Date().toISOString(),
          unread: true,
          starred: false,
          hasAttachments: false,
          folder: 'inbox'
        };
        
        setEmails([newEmail, ...emails]);
        setLoading(false);
      }, 800);
    }
  };

  const handleSendEmail = () => {
    alert('Fonctionnalité d\'envoi d\'email via Gmail API - À implémenter avec OAuth');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 3600000) { // Moins d'1 heure
      return `${Math.floor(diff / 60000)} min`;
    } else if (diff < 86400000) { // Moins d'1 jour
      return `${Math.floor(diff / 3600000)} h`;
    } else {
      return date.toLocaleDateString('fr-FR');
    }
  };

  useEffect(() => {
    // Au chargement, vérifier si déjà connecté
    const checkConnection = () => {
      // En production, vérifier le token OAuth dans le localStorage
      const hasToken = localStorage.getItem('gmail_token');
      if (hasToken) {
        setIsConnected(true);
        loadMockEmails();
      }
    };
    
    checkConnection();
  }, []);

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* En-tête */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-r from-red-500 to-orange-500 rounded-2xl flex items-center justify-center">
              <Mail className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Gmail Connecté</h1>
              <p className="text-gray-600">Gérez vos emails Gmail directement depuis Bouba</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {isConnected ? (
              <>
                <button
                  onClick={handleRefresh}
                  disabled={loading}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium flex items-center gap-2 disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  Actualiser
                </button>
                <button
                  onClick={handleDisconnect}
                  className="px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition-colors text-sm font-medium flex items-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  Déconnecter
                </button>
                <div className="px-4 py-2 bg-green-50 text-green-700 rounded-lg text-sm font-medium flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Connecté à Gmail
                </div>
              </>
            ) : (
              <button
                onClick={handleConnectGmail}
                disabled={isConnecting}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-colors text-sm font-medium flex items-center gap-2 disabled:opacity-50"
              >
                {isConnecting ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    Connexion en cours...
                  </>
                ) : (
                  <>
                    <LogIn className="w-5 h-5" />
                    Connecter Gmail
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* État de connexion */}
      {!isConnected ? (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-8 border border-blue-200">
          <div className="max-w-2xl mx-auto text-center">
            <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Mail className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Connectez votre Gmail</h2>
            <p className="text-gray-700 mb-8">
              Connectez-vous avec votre compte Google pour accéder à vos emails Gmail directement depuis Bouba.
              Vous pourrez lire, envoyer et gérer vos emails sans quitter l'application.
            </p>
            
            <button
              onClick={handleConnectGmail}
              disabled={isConnecting}
              className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-colors text-lg font-medium flex items-center gap-3 mx-auto disabled:opacity-50"
            >
              {isConnecting ? (
                <>
                  <RefreshCw className="w-6 h-6 animate-spin" />
                  Connexion à Google en cours...
                </>
              ) : (
                <>
                  <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                    <span className="text-blue-600 font-bold">G</span>
                  </div>
                  Se connecter avec Google
                </>
              )}
            </button>
            
            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <Inbox className="w-6 h-6 text-blue-600" />
                </div>
                <h4 className="font-semibold text-gray-900">Boîte de réception</h4>
                <p className="text-gray-600 text-sm">Accédez à tous vos emails</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <SendIcon className="w-6 h-6 text-green-600" />
                </div>
                <h4 className="font-semibold text-gray-900">Envoyer des emails</h4>
                <p className="text-gray-600 text-sm">Rédigez et envoyez depuis Bouba</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <Folder className="w-6 h-6 text-purple-600" />
                </div>
                <h4 className="font-semibold text-gray-900">Gestion des dossiers</h4>
                <p className="text-gray-600 text-sm">Organisez vos emails</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Erreur */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="text-red-700">{error}</div>
            </div>
          )}

          {/* Interface Gmail connecté */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Sidebar */}
            <div className="lg:col-span-1 space-y-4">
              <button
                onClick={handleSendEmail}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 flex items-center justify-center gap-2"
              >
                <Send className="w-5 h-5" />
                Nouvel email
              </button>
              
              <div className="bg-white rounded-2xl border border-gray-200 p-4">
                <div className="space-y-1">
                  <button 
                    onClick={() => setFolder('inbox')}
                    className={`w-full text-left p-3 rounded-lg flex items-center justify-between ${folder === 'inbox' ? 'bg-blue-50 text-blue-700 font-medium' : 'hover:bg-gray-50'}`}
                  >
                    <div className="flex items-center">
                      <Inbox className="w-4 h-4 mr-2" />
                      Boîte de réception
                    </div>
                    <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                      {emails.filter(e => e.unread).length}
                    </span>
                  </button>
                  <button 
                    onClick={() => setFolder('starred')}
                    className={`w-full text-left p-3 rounded-lg flex items-center ${folder === 'starred' ? 'bg-yellow-50 text-yellow-700 font-medium' : 'hover:bg-gray-50'}`}
                  >
                    <Star className="w-4 h-4 mr-2" />
                    Importants
                    <span className="ml-auto text-xs text-gray-500">
                      {emails.filter(e => e.starred).length}
                    </span>
                  </button>
                  <button 
                    onClick={() => setFolder('sent')}
                    className={`w-full text-left p-3 rounded-lg flex items-center ${folder === 'sent' ? 'bg-green-50 text-green-700 font-medium' : 'hover:bg-gray-50'}`}
                  >
                    <SendIcon className="w-4 h-4 mr-2" />
                    Envoyés
                  </button>
                  <button 
                    onClick={() => setFolder('drafts')}
                    className={`w-full text-left p-3 rounded-lg flex items-center ${folder === 'drafts' ? 'bg-gray-100 text-gray-700 font-medium' : 'hover:bg-gray-50'}`}
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Brouillons
                  </button>
                  <button 
                    onClick={() => setFolder('trash')}
                    className={`w-full text-left p-3 rounded-lg flex items-center ${folder === 'trash' ? 'bg-red-50 text-red-700 font-medium' : 'hover:bg-gray-50'}`}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Corbeille
                  </button>
                </div>
                
                <div className="mt-6 pt-4 border-t border-gray-200">
                  <div className="text-sm text-gray-600 mb-2">Labels</div>
                  <div className="space-y-1">
                    <button className="w-full text-left p-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg flex items-center">
                      <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                      Travail
                    </button>
                    <button className="w-full text-left p-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg flex items-center">
                      <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                      Personnel
                    </button>
                    <button className="w-full text-left p-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg flex items-center">
                      <div className="w-3 h-3 bg-purple-500 rounded-full mr-2"></div>
                      Important
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Liste des emails */}
            <div className="lg:col-span-3">
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                {/* Barre de recherche */}
                <div className="border-b border-gray-200 p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Rechercher dans Gmail..."
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <button className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                      <Filter className="w-5 h-5 text-gray-600" />
                    </button>
                    <button 
                      onClick={handleRefresh}
                      disabled={loading}
                      className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                    >
                      <RefreshCw className={`w-5 h-5 text-gray-600 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
                </div>

                {/* Liste des emails */}
                <div className="divide-y divide-gray-200 max-h-[500px] overflow-y-auto">
                  {loading ? (
                    <div className="p-8 text-center">
                      <RefreshCw className="w-8 h-8 text-gray-400 animate-spin mx-auto mb-3" />
                      <p className="text-gray-600">Chargement des emails...</p>
                    </div>
                  ) : emails.length === 0 ? (
                    <div className="p-8 text-center">
                      <Inbox className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-600">Aucun email dans ce dossier</p>
                    </div>
                  ) : (
                    emails
                      .filter(email => email.folder === folder || (folder === 'starred' && email.starred))
                      .map((email) => (
                        <div
                          key={email.id}
                          className={`p-4 hover:bg-gray-50 cursor-pointer ${selectedEmail?.id === email.id ? 'bg-blue-50' : ''} ${email.unread ? 'bg-blue-50/50' : ''}`}
                          onClick={() => {
                            setSelectedEmail(email);
                            // Marquer comme lu
                            if (email.unread) {
                              setEmails(emails.map(e => 
                                e.id === email.id ? { ...e, unread: false } : e
                              ));
                            }
                          }}
                        >
                          <div className="flex items-start gap-4">
                            <div className="flex-shrink-0">
                              <div className="w-10 h-10 bg-gradient-to-r from-gray-300 to-gray-400 rounded-full flex items-center justify-center">
                                <span className="text-white font-semibold">{email.fromName.charAt(0)}</span>
                              </div>
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`font-semibold truncate ${email.unread ? 'text-gray-900' : 'text-gray-700'}`}>
                                  {email.fromName}
                                </span>
                                <span className="text-gray-600 text-sm">&lt;{email.from}&gt;</span>
                                {email.unread && (
                                  <span className="inline-block w-2 h-2 bg-blue-500 rounded-full"></span>
                                )}
                                {email.hasAttachments && (
                                  <Paperclip className="w-4 h-4 text-gray-400" />
                                )}
                              </div>
                              <div className={`font-medium mb-1 ${email.unread ? 'text-gray-900' : 'text-gray-700'}`}>
                                {email.subject}
                              </div>
                              <div className="text-gray-600 text-sm truncate">
                                {email.body.substring(0, 100)}...
                              </div>
                            </div>
                            
                            <div className="flex flex-col items-end gap-2">
                              <div className="text-sm text-gray-500">{formatDate(email.date)}</div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEmails(emails.map(e => 
                                    e.id === email.id ? { ...e, starred: !e.starred } : e
                                  ));
                                }}
                                className={`p-1 rounded ${email.starred ? 'text-yellow-500' : 'text-gray-400 hover:text-yellow-500'}`}
                              >
                                <Star className="w-5 h-5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </div>

              {/* Email sélectionné */}
              {selectedEmail && (
                <div className="mt-6 bg-white rounded-2xl border border-gray-200 p-6">
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">{selectedEmail.subject}</h3>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-gray-300 to-gray-400 rounded-full flex items-center justify-center">
                          <span className="text-white font-semibold">{selectedEmail.fromName.charAt(0)}</span>
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900">{selectedEmail.fromName}</div>
                          <div className="text-gray-600 text-sm">À {selectedEmail.to} • {new Date(selectedEmail.date).toLocaleString('fr-FR')}</div>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => setEmails(emails.map(e => 
                          e.id === selectedEmail.id ? { ...e, starred: !e.starred } : e
                        ))}
                        className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                      >
                        <Star className={`w-5 h-5 ${selectedEmail.starred ? 'text-yellow-500' : 'text-gray-600'}`} />
                      </button>
                      <button className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                        <Archive className="w-5 h-5 text-gray-600" />
                      </button>
                      <button className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                        <Trash2 className="w-5 h-5 text-gray-600" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="prose max-w-none">
                    <div className="text-gray-700 whitespace-pre-wrap">{selectedEmail.body}</div>
                  </div>
                  
                  {selectedEmail.hasAttachments && (
                    <div className="mt-8 pt-6 border-t border-gray-200">
                      <h4 className="font-semibold text-gray-900 mb-3">Pièces jointes</h4>
                      <div className="flex gap-3">
                        <div className="px-4 py-2 border border-gray-300 rounded-lg flex items-center gap-2">
                          <Paperclip className="w-4 h-4 text-gray-500" />
                          <span className="text-gray-700">document.pdf</span>
                          <span className="text-gray-500 text-sm">(2.4 MB)</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default EmailPageRealGmail;