import React, { useState, useRef, useEffect } from 'react';
import { Send, User, Bot, Loader2, Copy, Check, Paperclip } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const ChatBox = ({ activeChatId, setActiveChatId, setChats }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const fetchChat = async () => {
      if (!activeChatId) {
        setMessages([]);
        return;
      }
      try {
        const res = await axios.get(`http://localhost:8000/api/chats/${activeChatId}`);
        setMessages(res.data.messages || []);
      } catch (err) {
        toast.error("Failed to load chat history");
        setMessages([]);
      }
    };
    fetchChat();
  }, [activeChatId]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'inherit';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    
    const userContent = input.trim();
    const userMessage = { role: 'user', content: userContent };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'inherit';
    }

    try {
      const response = await axios.post('http://localhost:8000/chat', {
        message: userContent,
        chat_id: activeChatId
      });
      
      const assistantMessage = { role: 'assistant', content: response.data.response };
      setMessages(prev => [...prev, assistantMessage]);
      
      // Update the chat title dynamically if returned
      if (response.data.title) {
        setChats(prevChats => 
          prevChats.map(chat => 
            chat.chat_id === response.data.chat_id 
              ? { ...chat, title: response.data.title } 
              : chat
          )
        );
      }

      // If it was a new chat without activeChatId, update and refresh
      if (!activeChatId && response.data.chat_id) {
        setActiveChatId(response.data.chat_id);
        // Refresh to ensure we have the chat in the list if it wasn't there
        const chatsRes = await axios.get('http://localhost:8000/api/chats');
        setChats(chatsRes.data);
      }
    } catch (error) {
      console.error('Error during chat:', error);
      toast.error("Failed to fetch response");
      const errorMessage = { role: 'assistant', content: 'Sorry, I encountered an error while processing your request. Please try again.' };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCopy = (content, index) => {
    navigator.clipboard.writeText(content);
    setCopiedIndex(index);
    toast.success("Copied to clipboard", { id: 'copy', icon: '📋' });
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="flex flex-col h-full w-full min-h-0 bg-transparent relative overflow-hidden">
      
      {/* Messages Area */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 md:px-8 lg:px-24 py-8 pb-36 space-y-8 custom-scrollbar">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center max-w-lg mx-auto mt-[-10vh] animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="w-16 h-16 bg-[#ffffff]/60 rounded-2xl flex items-center justify-center mb-6 shadow-xl shadow-cyan-950/5 border border-cyan-300/60">
              <div className="w-8 h-8 bg-gradient-to-r from-cyan-500 to-teal-500 rounded-xl animate-pulse shadow-md" />
            </div>
            <h2 className="text-2xl font-bold text-[#0e3b43] mb-3">Welcome to VaultAI</h2>
            <p className="text-teal-800/70 text-sm leading-relaxed">
              Upload your PDF documents in the sidebar and ask questions about them. I'll search your knowledge base and provide precise answers.
            </p>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
              <div className={`flex max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                
                {/* Avatar */}
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center shadow-md
                  ${msg.role === 'user' 
                    ? 'bg-gradient-to-r from-cyan-500 to-teal-500 ml-4' 
                    : 'bg-[#ffffff]/80 border border-cyan-300/60 mr-4'}`}>
                  {msg.role === 'user' ? <User className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-[#0e3b43]" />}
                </div>
                
                {/* Bubble */}
                <div className={`relative group ${
                  msg.role === 'user' 
                    ? 'bg-gradient-to-r from-cyan-500 to-teal-500 text-white font-semibold rounded-2xl rounded-tr-sm px-5 py-3 shadow-lg shadow-cyan-500/20' 
                    : 'bg-[#ffffff]/80 backdrop-blur-xl border border-cyan-300/50 text-[#0e3b43] rounded-2xl rounded-tl-sm px-6 py-4 shadow-md shadow-cyan-950/5'
                }`}>
                  {msg.role === 'user' ? (
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                  ) : (
                    <div className="markdown-body text-sm leading-relaxed">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                  )}

                  {/* Actions for Assistant */}
                  {msg.role === 'assistant' && (
                    <div className="absolute -bottom-8 left-0 opacity-0 group-hover:opacity-100 transition-opacity flex space-x-2">
                      <button 
                        onClick={() => handleCopy(msg.content, idx)}
                        className="flex items-center space-x-1.5 text-xs text-teal-800/70 hover:text-[#0e3b43] bg-[#ffffff]/80 px-2 py-1 rounded-md border border-cyan-300/50 transition-colors shadow-sm pointer-events-auto font-semibold"
                      >
                        {copiedIndex === idx ? <Check className="w-3 h-3 text-cyan-600" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedIndex === idx ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
        
        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex justify-start animate-in fade-in">
            <div className="flex flex-row">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#ffffff]/80 border border-cyan-300/60 mr-4 flex items-center justify-center shadow-md">
                <Bot className="w-4 h-4 text-[#0e3b43]" />
              </div>
              <div className="px-5 py-4 rounded-2xl bg-[#ffffff]/80 backdrop-blur-xl border border-cyan-300/50 text-[#0e3b43] rounded-tl-sm flex items-center space-x-3 shadow-md shadow-cyan-950/5">
                <div className="flex space-x-1">
                  <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                  <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                  <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-bounce"></div>
                </div>
                <span className="text-sm text-teal-800/70 font-bold tracking-wide">Searching knowledge base...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} className="h-10" />
      </div>

      {/* Input Area */}
      <div className="absolute bottom-0 w-full pointer-events-none z-20 pb-8 pt-12 bg-gradient-to-t from-[#cbf0f8] via-[#e0f6f8]/90 to-transparent">
        <div className="relative flex items-end max-w-4xl mx-auto bg-[#ffffff]/80 backdrop-blur-xl border border-cyan-300 shadow-xl shadow-cyan-950/5 rounded-2xl p-2 pointer-events-auto transition-all focus-within:border-cyan-500 focus-within:ring-2 focus-within:ring-cyan-400/30">
          
          <button className="p-3 text-teal-800/70 hover:text-cyan-600 transition-colors flex-shrink-0">
            <Paperclip className="w-5 h-5" />
          </button>
          
          <textarea
            ref={textareaRef}
            className="w-full max-h-48 py-3 px-2 bg-transparent text-[#0e3b43] placeholder-teal-800/40 focus:outline-none resize-none text-sm leading-relaxed custom-scrollbar pointer-events-auto font-medium"
            rows="1"
            placeholder="Ask anything about your documents..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            disabled={isLoading}
          />
          
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className={`p-2.5 m-1 rounded-xl flex-shrink-0 transition-all duration-300 pointer-events-auto ${
              input.trim() && !isLoading
                ? 'bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-white font-bold shadow-md shadow-cyan-500/25 scale-100 hover:scale-105' 
                : 'bg-[#ffffff]/50 text-teal-800/40 cursor-not-allowed scale-95 border border-cyan-300/40'
            }`}
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5 ml-0.5" />}
          </button>
        </div>
        <p className="text-[10px] text-center text-teal-800/60 mt-3 font-bold tracking-wide pointer-events-auto">
          AI can make mistakes. Consider verifying important information.
        </p>
      </div>
    </div>
  );
};

export default ChatBox;
