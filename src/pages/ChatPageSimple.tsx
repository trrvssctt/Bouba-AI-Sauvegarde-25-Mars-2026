import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, MessageCircle } from 'lucide-react';

const ChatPageSimple = () => {
  const [messages, setMessages] = useState([
    { id: 1, text: 'Bonjour ! Je suis Bouba. Comment puis-je vous aider ?', sender: 'bot' },
    { id: 2, text: 'Salut ! Peux-tu m\'aider à rédiger un email ?', sender: 'user' },
    { id: 3, text: 'Bien sûr ! Voici un modèle : "Cher [Nom], je vous écris concernant..."', sender: 'bot' },
  ]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleSend = () => {
    if (!input.trim()) return;
    
    const newMessage = { id: messages.length + 1, text: input, sender: 'user' };
    setMessages([...messages, newMessage]);
    setInput('');
    
    // Réponse automatique après 1 seconde
    setTimeout(() => {
      const responses = [
        "J'ai bien compris votre demande.",
        "Voici ce que je peux vous proposer...",
        "Excellente question !",
        "Je peux vous aider avec ça !"
      ];
      const response = responses[Math.floor(Math.random() * responses.length)];
      const botMessage = { id: messages.length + 2, text: response, sender: 'bot' };
      setMessages(prev => [...prev, botMessage]);
    }, 1000);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="w-full px-4 md:px-6 py-6">
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center">
            <MessageCircle className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-secondary">Chat IA</h1>
            <p className="text-gray-600">Discutez avec votre assistant personnel Bouba</p>
          </div>
        </div>
      </div>

      <div className="bg-surface rounded-2xl border border-border overflow-hidden h-[500px] flex flex-col">
        {/* En-tête */}
        <div className="border-b border-border p-4 bg-primary/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-400 to-cyan-400 rounded-xl flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-semibold text-secondary">Bouba Assistant</div>
              <div className="text-sm text-gray-600">En ligne • Réponse instantanée</div>
            </div>
            <div className="ml-auto">
              <div className="flex items-center gap-2 text-sm">
                <Sparkles className="w-4 h-4 text-blue-500" />
                <span className="text-gray-700">IA Active</span>
              </div>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl p-4 ${msg.sender === 'user' ? 'bg-primary text-white rounded-br-none' : 'bg-gray-100 text-secondary rounded-bl-none'}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  {msg.sender === 'user' ? (
                    <User className="w-4 h-4" />
                  ) : (
                    <Bot className="w-4 h-4" />
                  )}
                  <span className="text-sm font-medium">
                    {msg.sender === 'user' ? 'Vous' : 'Bouba'}
                  </span>
                </div>
                <div>{msg.text}</div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t border-border p-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Écrivez votre message..."
              className="input-bouba flex-1"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 flex items-center gap-2"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatPageSimple;