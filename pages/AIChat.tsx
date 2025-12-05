import React, { useState, useRef, useEffect } from 'react';
import { Send, User, Bot, Loader2, Sparkles, Download } from 'lucide-react';
import { getChatStream } from '../services/geminiService';
import { GenerateContentResponse } from '@google/genai';

interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

const AIChat: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'model',
      text: 'مرحباً بك! أنا مساعدك الذكي في "بوصلة". كيف يمكنني مساعدتك اليوم في إدارة متجرك أو تحليل مبيعاتك؟',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      // Optimistic AI Message container
      const aiMessageId = (Date.now() + 1).toString();
      setMessages(prev => [...prev, {
        id: aiMessageId,
        role: 'model',
        text: '', // Start empty
        timestamp: new Date()
      }]);

      const stream = await getChatStream(
        messages.map(m => ({ role: m.role, text: m.text })), 
        userMessage.text
      );

      let fullText = '';
      
      for await (const chunk of stream) {
        const c = chunk as GenerateContentResponse;
        const newText = c.text || '';
        fullText += newText;
        
        setMessages(prev => prev.map(msg => 
          msg.id === aiMessageId 
            ? { ...msg, text: fullText }
            : msg
        ));
      }

    } catch (error) {
      console.error("Chat error:", error);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'model',
        text: 'عذراً، حدث خطأ في الاتصال. يرجى المحاولة مرة أخرى.',
        timestamp: new Date()
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden relative">
      {/* Chat Header */}
      <div className="p-4 bg-gradient-to-r from-indigo-900 via-indigo-800 to-indigo-900 text-white flex justify-between items-center shadow-md z-10">
        <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                <Sparkles className="text-yellow-400" size={20} />
            </div>
            <div>
                <h2 className="font-bold text-lg">المساعد الذكي</h2>
                <p className="text-indigo-200 text-xs">متصل الآن - اسألني عن أي شيء</p>
            </div>
        </div>
        <button className="p-2 hover:bg-white/10 rounded-lg transition" title="تصدير المحادثة">
            <Download size={20} />
        </button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-slate-50 relative">
        <div className="absolute inset-0 opacity-5 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
        
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start gap-3 ${
              msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'
            }`}
          >
            <div 
              className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                msg.role === 'user' ? 'bg-emerald-600 text-white' : 'bg-indigo-600 text-white'
              }`}
            >
              {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
            </div>
            
            <div className={`flex flex-col max-w-[80%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div
                className={`px-4 py-3 rounded-2xl shadow-sm text-sm leading-relaxed ${
                    msg.role === 'user'
                    ? 'bg-emerald-600 text-white rounded-tl-none'
                    : 'bg-white text-gray-800 rounded-tr-none border border-gray-200'
                }`}
                >
                {msg.text || (loading && msg.id === messages[messages.length-1].id ? <Loader2 className="animate-spin w-4 h-4" /> : '')}
                </div>
                <span className="text-[10px] text-gray-400 mt-1 px-1">
                    {msg.timestamp.toLocaleTimeString('ar-MR', { hour: '2-digit', minute: '2-digit' })}
                </span>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-gray-100 z-10">
        <div className="relative flex items-center gap-2">
            <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="اكتب رسالتك هنا..."
                className="flex-1 bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 block w-full p-4 pl-12 disabled:opacity-50"
                disabled={loading}
            />
            <button 
                onClick={handleSend}
                disabled={!input.trim() || loading}
                className="absolute left-2 bg-indigo-600 hover:bg-indigo-700 text-white p-2.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {loading ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} className="transform rotate-180" />}
            </button>
        </div>
        <div className="mt-2 flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {['كيف أزيد مبيعاتي؟', 'تحليل أداء الشهر', 'نصيحة للمخزون'].map((suggestion, idx) => (
                <button 
                    key={idx}
                    onClick={() => setInput(suggestion)}
                    className="text-xs px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-full border border-indigo-100 hover:bg-indigo-100 transition whitespace-nowrap"
                >
                    {suggestion}
                </button>
            ))}
        </div>
      </div>
    </div>
  );
};

export default AIChat;
