import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, Zap, Clock, ThumbsUp, ThumbsDown, Copy, Trash2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
  liked?: boolean;
}

const ChatPageReal = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: 'Bonjour ! Je suis Bouba, votre assistant IA. Comment puis-je vous aider aujourd\'hui ?',
      sender: 'assistant',
      timestamp: new Date(Date.now() - 3600000),
    },
    {
      id: '2',
      content: 'Salut Bouba ! Peux-tu m\'aider à rédiger un email professionnel ?',
      sender: 'user',
      timestamp: new Date(Date.now() - 1800000),
    },
    {
      id: '3',
      content: 'Bien sûr ! Voici un modèle d\'email professionnel :\n\n"Objet : Suivi de notre réunion\n\nCher [Nom],\n\nJe vous remercie pour notre échange de ce matin. Comme convenu, je vous envoie les documents discutés.\n\nCordialement,\n[Votre nom]"',
      sender: 'assistant',
      timestamp: new Date(Date.now() - 900000),
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: input,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    // Simuler une réponse de l'IA
    setTimeout(() => {
      const responses = [
        "J'ai bien compris votre demande. Voici ce que je peux vous proposer...",
        "Excellente question ! Voici quelques suggestions :",
        "D'accord, analysons cela ensemble. Voici ma réponse :",
        "Je peux vous aider avec ça ! Voici ce que je recommande :",
        "Très bonne idée ! Voici comment procéder :"
      ];
      
      const randomResponse = responses[Math.floor(Math.random() * responses.length)];
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: `${randomResponse}\n\n${input.includes('email') ? 'Pour les emails, je recommande de garder un ton professionnel et concis.' : ''}\n${input.includes('calendrier') ? 'Pour la gestion de calendrier, je peux vous aider à organiser vos rendez-vous.' : ''}\n${input.includes('contact') ? 'Pour les contacts, assurez-vous de bien catégoriser vos relations professionnelles.' : ''}`,
        sender: 'assistant',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
      setIsTyping(false);
    }, 1500);
  };

  const handleLike = (messageId: string) => {
    setMessages(prev =>
      prev.map(msg =>
        msg.id === messageId ? { ...msg, liked: msg.liked === undefined ? true : !msg.liked } : msg
      )
    );
  };

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
    // Tu pourrais ajouter une notification ici
  };

  const handleClearChat = () => {
    if (window.confirm('Voulez-vous vraiment effacer toute la conversation ?')) {
      setMessages([]);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* En-tête du chat */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Chat avec Bouba</h1>
              <p className="text-gray-600">
                Votre assistant IA personnel • {messages.length} messages
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={handleClearChat}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Effacer
            </button>
            <div className="px-4 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium">
              <Sparkles className="inline w-4 h-4 mr-2" />
              IA Active
            </div>
          </div>
        </div>
      </div>

      {/* Zone de chat principale */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Historique des conversations (sidebar) */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl border border-gray-200 p-4">
            <h3 className="font-semibold text-gray-900 mb-4">Conversations récentes</h3>
            <div className="space-y-3">
              {[
                { id: '1', title: 'Rédaction email', time: '10:30', unread: false },
                { id: '2', title: 'Planification projet', time: 'Hier', unread: true },
                { id: '3', title: 'Analyse financière', time: '12/04', unread: false },
                { id: '4', title: 'Organisation calendrier', time: '11/04', unread: false },
              ].map(conv => (
                <div
                  key={conv.id}
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${conv.unread ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50'}`}
                >
                  <div className="flex justify-between items-center">
                    <div className="font-medium text-gray-900 truncate">{conv.title}</div>
                    <div className="text-xs text-gray-500">{conv.time}</div>
                  </div>
                  {conv.unread && (
                    <div className="mt-1">
                      <span className="inline-block w-2 h-2 bg-blue-500 rounded-full"></span>
                      <span className="text-xs text-blue-600 ml-2">Nouveau</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            <div className="mt-6 pt-4 border-t border-gray-200">
              <h4 className="font-semibold text-gray-900 mb-3">Suggestions rapides</h4>
              <div className="space-y-2">
                {[
                  'Rédiger un email professionnel',
                  'Planifier ma semaine',
                  'Analyser un document',
                  'Rechercher des informations'
                ].map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => setInput(suggestion)}
                    className="w-full text-left p-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Zone de messages */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden flex flex-col h-[600px]">
            {/* En-tête de conversation */}
            <div className="border-b border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-400 to-cyan-400 rounded-xl flex items-center justify-center">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">Bouba Assistant</div>
                    <div className="text-sm text-gray-600">En ligne • Réponse en 1-2 secondes</div>
                  </div>
                </div>
                <div className="text-sm text-gray-500">
                  {user?.name || 'Utilisateur'} • Plan {user?.plan_id === 'free' ? 'Free' : user?.plan_id === 'starter' ? 'Starter' : 'Business'}
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8">
                  <div className="w-20 h-20 bg-gradient-to-r from-blue-100 to-purple-100 rounded-2xl flex items-center justify-center mb-6">
                    <Sparkles className="w-10 h-10 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">Commencez à discuter avec Bouba</h3>
                  <p className="text-gray-600 max-w-md mb-8">
                    Posez vos questions, demandez de l'aide pour rédiger des emails, organiser votre calendrier, ou analyser des documents.
                  </p>
                  <div className="grid grid-cols-2 gap-3 max-w-md">
                    {[
                      'Rédige un email professionnel',
                      'Planifie ma journée',
                      'Analyse ce document',
                      'Recherche des informations'
                    ].map((prompt, idx) => (
                      <button
                        key={idx}
                        onClick={() => setInput(prompt)}
                        className="p-3 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors text-left"
                      >
                        <div className="font-medium text-gray-900 text-sm">{prompt}</div>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl p-4 ${message.sender === 'user' ? 'bg-blue-500 text-white rounded-br-none' : 'bg-gray-100 text-gray-900 rounded-bl-none'}`}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          {message.sender === 'user' ? (
                            <User className="w-4 h-4" />
                          ) : (
                            <Bot className="w-4 h-4" />
                          )}
                          <span className="text-sm font-medium">
                            {message.sender === 'user' ? user?.name || 'Vous' : 'Bouba'}
                          </span>
                          <span className="text-xs opacity-75 ml-auto">
                            {formatTime(message.timestamp)}
                          </span>
                        </div>
                        <div className="whitespace-pre-wrap">{message.content}</div>
                        
                        {/* Actions sur le message */}
                        <div className={`flex gap-3 mt-3 ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                          {message.sender === 'assistant' && (
                            <>
                              <button
                                onClick={() => handleLike(message.id)}
                                className={`p-1 rounded ${message.liked ? 'text-green-600 bg-green-50' : 'text-gray-500 hover:text-green-600 hover:bg-green-50'}`}
                                title="J'aime cette réponse"
                              >
                                <ThumbsUp className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleLike(message.id)}
                                className="p-1 rounded text-gray-500 hover:text-red-600 hover:bg-red-50"
                                title="Je n'aime pas cette réponse"
                              >
                                <ThumbsDown className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => handleCopy(message.content)}
                            className="p-1 rounded text-gray-500 hover:text-blue-600 hover:bg-blue-50"
                            title="Copier le message"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {isTyping && (
                    <div className="flex justify-start">
                      <div className="bg-gray-100 rounded-2xl rounded-bl-none p-4">
                        <div className="flex items-center gap-2">
                          <Bot className="w-4 h-4" />
                          <span className="text-sm font-medium">Bouba</span>
                        </div>
                        <div className="flex items-center gap-1 mt-2">
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                          <span className="text-sm text-gray-600 ml-2">Bouba réfléchit...</span>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Zone de saisie */}
            <div className="border-t border-gray-200 p-4">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Posez votre question à Bouba..."
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isTyping}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Send className="w-5 h-5" />
                  Envoyer
                </button>
              </div>
              
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="text-xs text-gray-500">Suggestions :</span>
                {[
                  'Rédige un email',
                  'Planifie un rendez-vous',
                  'Analyse un document',
                  'Recherche des infos'
                ].map((suggestion, idx) => (
                  <button
                    key={idx}
                    onClick={() => setInput(suggestion)}
                    className="text-xs px-3 py-1 border border-gray-300 rounded-full hover:border-blue-300 hover:text-blue-600 transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Statistiques d'utilisation */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Utilisation des messages</h3>
            <Zap className="w-5 h-5 text-blue-500" />
          </div>
          <div className="mb-2">
            <