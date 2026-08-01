import { useState } from 'react';
import { Mail, Search, Filter, Star, Archive, Trash2, Send, Paperclip, Eye, EyeOff } from 'lucide-react';

interface Email {
  id: number;
  sender: string;
  subject: string;
  preview: string;
  time: string;
  unread: boolean;
  starred: boolean;
  attachments: boolean;
}

const EmailPageSimple = () => {
  const [emails, setEmails] = useState<Email[]>([
    { id: 1, sender: 'Support Bouba', subject: 'Bienvenue sur Bouba !', preview: 'Merci d\'avoir rejoint notre plateforme...', time: '10:30', unread: true, starred: true, attachments: false },
    { id: 2, sender: 'Équipe Marketing', subject: 'Nouvelles fonctionnalités', preview: 'Découvrez les dernières mises à jour...', time: 'Hier', unread: true, starred: false, attachments: true },
    { id: 3, sender: 'Facturation', subject: 'Votre reçu', preview: 'Votre paiement a été traité...', time: '12/04', unread: false, starred: false, attachments: true },
    { id: 4, sender: 'Jean Dupont', subject: 'Réunion projet', preview: 'Bonjour, concernant notre réunion de demain...', time: '11/04', unread: false, starred: true, attachments: false },
    { id: 5, sender: 'Newsletter Tech', subject: 'Les tendances IA', preview: 'Découvrez les dernières avancées en IA...', time: '10/04', unread: false, starred: false, attachments: false },
  ]);
  
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(emails[0]);
  const [composeOpen, setComposeOpen] = useState(false);
  const [newEmail, setNewEmail] = useState({ to: '', subject: '', body: '' });

  const handleStar = (id: number) => {
    setEmails(emails.map(email => 
      email.id === id ? { ...email, starred: !email.starred } : email
    ));
  };

  const handleMarkRead = (id: number) => {
    setEmails(emails.map(email => 
      email.id === id ? { ...email, unread: false } : email
    ));
  };

  const handleSendEmail = () => {
    if (!newEmail.to || !newEmail.subject) return;
    
    alert(`Email envoyé à ${newEmail.to}`);
    setComposeOpen(false);
    setNewEmail({ to: '', subject: '', body: '' });
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 bg-gradient-to-r from-red-500 to-orange-500 rounded-2xl flex items-center justify-center">
            <Mail className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Boîte Email</h1>
            <p className="text-gray-600">Gérez vos emails avec Bouba</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-4">
          <button
            onClick={() => setComposeOpen(true)}
            className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 flex items-center justify-center gap-2"
          >
            <Send className="w-5 h-5" />
            Nouvel email
          </button>
          
          <div className="bg-white rounded-2xl border border-gray-200 p-4">
            <div className="space-y-1">
              <button className="w-full text-left p-3 rounded-lg bg-blue-50 text-blue-700 font-medium">
                <Mail className="inline w-4 h-4 mr-2" />
                Boîte de réception
                <span className="ml-auto bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                  {emails.filter(e => e.unread).length}
                </span>
              </button>
              <button className="w-full text-left p-3 rounded-lg hover:bg-gray-50">
                <Star className="inline w-4 h-4 mr-2" />
                Importants
              </button>
              <button className="w-full text-left p-3 rounded-lg hover:bg-gray-50">
                <Send className="inline w-4 h-4 mr-2" />
                Envoyés
              </button>
              <button className="w-full text-left p-3 rounded-lg hover:bg-gray-50">
                <Archive className="inline w-4 h-4 mr-2" />
                Archivés
              </button>
              <button className="w-full text-left p-3 rounded-lg hover:bg-gray-50">
                <Trash2 className="inline w-4 h-4 mr-2" />
                Corbeille
              </button>
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
                    placeholder="Rechercher des emails..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <button className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                  <Filter className="w-5 h-5 text-gray-600" />
                </button>
              </div>
            </div>

            {/* Liste */}
            <div className="divide-y divide-gray-200 max-h-[500px] overflow-y-auto">
              {emails.map((email) => (
                <div
                  key={email.id}
                  className={`p-4 hover:bg-gray-50 cursor-pointer ${selectedEmail?.id === email.id ? 'bg-blue-50' : ''} ${email.unread ? 'bg-blue-50/50' : ''}`}
                  onClick={() => {
                    setSelectedEmail(email);
                    handleMarkRead(email.id);
                  }}
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-gradient-to-r from-gray-300 to-gray-400 rounded-full flex items-center justify-center">
                        <span className="text-white font-semibold">{email.sender.charAt(0)}</span>
                      </div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`font-semibold truncate ${email.unread ? 'text-gray-900' : 'text-gray-700'}`}>
                          {email.sender}
                        </span>
                        {email.unread && (
                          <span className="inline-block w-2 h-2 bg-blue-500 rounded-full"></span>
                        )}
                        {email.attachments && (
                          <Paperclip className="w-4 h-4 text-gray-400" />
                        )}
                      </div>
                      <div className={`font-medium mb-1 ${email.unread ? 'text-gray-900' : 'text-gray-700'}`}>
                        {email.subject}
                      </div>
                      <div className="text-gray-600 text-sm truncate">
                        {email.preview}
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end gap-2">
                      <div className="text-sm text-gray-500">{email.time}</div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStar(email.id);
                        }}
                        className={`p-1 rounded ${email.starred ? 'text-yellow-500' : 'text-gray-400 hover:text-yellow-500'}`}
                      >
                        <Star className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
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
                      <span className="text-white font-semibold">{selectedEmail.sender.charAt(0)}</span>
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">{selectedEmail.sender}</div>
                      <div className="text-gray-600 text-sm">À moi • {selectedEmail.time}</div>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                    <Star className="w-5 h-5 text-yellow-500" />
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
                <p className="text-gray-700 mb-4">
                  Cher utilisateur,
                </p>
                <p className="text-gray-700 mb-4">
                  {selectedEmail.preview} Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
                </p>
                <p className="text-gray-700">
                  Cordialement,<br />
                  {selectedEmail.sender}
                </p>
              </div>
              
              {selectedEmail.attachments && (
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

      {/* Modal nouveau email */}
      {composeOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-2xl">
            <div className="border-b border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Nouveau message</h3>
                <button
                  onClick={() => setComposeOpen(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
            </div>
            
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">À</label>
                  <input
                    type="email"
                    value={newEmail.to}
                    onChange={(e) => setNewEmail({...newEmail, to: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="destinataire@example.com"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sujet</label>
                  <input
                    type="text"
                    value={newEmail.subject}
                    onChange={(e) => setNewEmail({...newEmail, subject: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Objet de l'email"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                  <textarea
                    value={newEmail.body}
                    onChange={(e) => setNewEmail({...newEmail, body: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 h-40"
                    placeholder="Écrivez votre message ici..."
                  />
                </div>
              </div>
              
              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => setComposeOpen(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  onClick={handleSendEmail}
                  className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 flex items-center gap-2"
                >
                  <Send className="w-5 h-5" />
                  Envoyer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmailPageSimple;