import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, ArrowLeft, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ChatMobileFirst = () => {
  const [messages, setMessages] = useState([
    { id: 1, text: '👋 Bonjour ! Je suis Bouba, votre assistant IA. Comment puis-je vous aider ?', sender: 'bot', time: '10:30' },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;
    
    const userMessage = { 
      id: messages.length + 1, 
      text: input, 
      sender: 'user', 
      time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    };
    
    setMessages([...messages, userMessage]);
    setInput('');
    setIsTyping(true);

    // Réponse IA après 1 seconde
    setTimeout(() => {
      const responses = [
        "J'ai bien compris ! Voici ce que je peux vous proposer...",
        "Excellente question ! Voici quelques suggestions :",
        "D'accord, analysons cela ensemble.",
        "Je peux vous aider avec ça !",
        "Très bonne idée ! Voici comment procéder :"
      ];
      
      const botMessage = { 
        id: messages.length + 2, 
        text: `${responses[Math.floor(Math.random() * responses.length)]}\n\n${input.includes('email') ? '📧 Pour les emails, je recommande un ton professionnel.' : ''}${input.includes('calendrier') ? '📅 Pour l\'agenda, je peux vous aider à organiser.' : ''}`, 
        sender: 'bot', 
        time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
      };
      
      setMessages(prev => [...prev, botMessage]);
      setIsTyping(false);
    }, 1000);
  };

  const handleClearChat = () => {
    if (window.confirm('Effacer toute la conversation ?')) {
      setMessages([{ id: 1, text: '👋 Bonjour ! Je suis Bouba, votre assistant IA. Comment puis-je vous aider ?', sender: 'bot', time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) }]);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header mobile */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate('/dashboard')}
              className="p-2 rounded-lg hover:bg-gray-100"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-gray-900">Chat IA</h1>
                <p className="text-xs text-gray-500">Bouba Assistant</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={handleClearChat}
              className="p-2 text-gray-600 hover:text-red-600"
              title="Effacer la conversation"
            >
              <Trash2 className="w-5 h-5" />
            </button>
            <div className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
              <Sparkles className="inline w-3 h-3 mr-1" />
              En ligne
            </div>
          </div>
        </div>
      </div>

      {/* Zone de messages */}
      <div className="px-4 py-3 pb-24">
        {messages.length === 1 ? (
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-gradient-to-r from-blue-100 to-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Sparkles className="w-10 h-10 text-blue-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Commencez à discuter</h3>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              Posez vos questions à Bouba. Je peux vous aider avec les emails, l'organisation, la rédaction, et bien plus.
            </p>
            
            <div className="grid grid-cols-1 gap-3 max-w-sm mx-auto">
              {[
                'Rédige un email professionnel',
                'Planifie ma journée',
                'Explique un concept',
                'Aide-moi à organiser'
              ].map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => setInput(prompt)}
                  className="p-3 border border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 text-left"
                >
                  <div className="font-medium text-gray-900">{prompt}</div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl p-4 ${message.sender === 'user' ? 'bg-blue-500 text-white rounded-br-none' : 'bg-white border border-gray-200 text-gray-900 rounded-bl-none shadow-sm'}`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    {message.sender === 'user' ? (
                      <User className="w-4 h-4" />
                    ) : (
                      <Bot className="w-4 h-4" />
                    )}
                    <span className="text-sm font-medium">
                      {message.sender === 'user' ? 'Vous' : 'Bouba'}
                    </span>
                    <span className="text-xs opacity-75 ml-auto">
                      {message.time}
                    </span>
                  </div>
                  <div className="whitespace-pre-wrap">{message.text}</div>
                </div>
              </div>
            ))}
            
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-none p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <Bot className="w-4 h-4" />
                    <span className="text-sm font-medium">Bouba</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                    <span className="text-sm text-gray-600 ml-2">Réflexion en cours...</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Zone de saisie (fixed en bas) */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Écrivez votre message..."
            className="flex-1 px-4 py-3 bg-gray-100 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isTyping}
            className="px-5 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
        
        <div className="mt-3 flex flex-wrap gap-2 justify-center">
          {[
            'Email professionnel',
            'Planifier',
            'Expliquer',
            'Organiser'
          ].map((suggestion, idx) => (
            <button
              key={idx}
              onClick={() => setInput(suggestion)}
              className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-full text-sm hover:bg-gray-200 transition-colors"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ChatMobileFirst;