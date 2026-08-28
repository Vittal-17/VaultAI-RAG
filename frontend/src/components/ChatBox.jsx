import React, { useState, useRef, useEffect } from 'react';
import { Send, User, Bot, Loader } from 'lucide-react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';

const ChatBox = () => {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hello! I am VaultAI. Upload your documents on the left and ask me anything about them.' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await axios.post('http://localhost:8000/chat', {
        message: userMessage.content
      });

      const assistantMessage = { role: 'assistant', content: response.data.response };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error during chat:', error);
      const errorMessage = { role: 'assistant', content: 'Sorry, I encountered an error while processing your request.' };
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

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex max-w-3xl ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center
                ${msg.role === 'user' ? 'bg-blue-600 ml-3' : 'bg-green-600 mr-3'}`}>
                {msg.role === 'user' ? <User className="w-5 h-5 text-white" /> : <Bot className="w-5 h-5 text-white" />}
              </div>

              <div className={`px-4 py-3 rounded-2xl ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white rounded-tr-none'
                  : 'bg-gray-100 text-gray-800 rounded-tl-none shadow-sm'
              }`}>
                {msg.role === 'user' ? (
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                ) : (
                  <div className="text-sm leading-relaxed markdown-body">
                    <ReactMarkdown
                      components={{
                        p: ({ node, ...props }) => <p className="mb-2 last:mb-0" {...props} />,
                        ul: ({ node, ...props }) => <ul className="list-disc list-inside space-y-1 my-2" {...props} />,
                        ol: ({ node, ...props }) => <ol className="list-decimal list-inside space-y-1 my-2" {...props} />,
                        li: ({ node, ...props }) => <li className="ml-1" {...props} />,
                        strong: ({ node, ...props }) => <strong className="font-semibold text-gray-900" {...props} />,
                        em: ({ node, ...props }) => <em className="italic text-gray-700" {...props} />
                      }}
                    >
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex justify-start">
            <div className="flex max-w-3xl flex-row">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-600 mr-3 flex items-center justify-center">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div className="px-4 py-3 rounded-2xl bg-gray-100 text-gray-800 rounded-tl-none flex items-center shadow-sm">
                <Loader className="w-5 h-5 animate-spin text-gray-500" />
                <span className="ml-2 text-sm text-gray-500">Searching knowledge base...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Footer */}
      <div className="p-4 border-t border-gray-200 bg-white">
        <div className="relative flex items-center">
          <textarea
            className="w-full pl-4 pr-12 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none bg-gray-50 text-sm"
            rows="1"
            placeholder="Ask a question about your documents..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="absolute right-2 p-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-center text-gray-400 mt-2">VaultAI uses Gemini 3.6 Flash and Atlas Vector Search</p>
      </div>
    </div>
  );
};

export default ChatBox;
