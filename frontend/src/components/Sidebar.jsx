import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Trash2, LogOut, Plus, Database, Pencil } from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';

const Sidebar = ({ sidebarOpen, user, handleLogout, chats, activeChatId, setActiveChatId, setChats, openKB }) => {
  const [editingChatId, setEditingChatId] = useState(null);
  const [editTitleText, setEditTitleText] = useState("");
  const inputRef = useRef(null);

  if (!sidebarOpen) return null;

  useEffect(() => {
    if (editingChatId && inputRef.current) {
      inputRef.current.focus();
    }
  }, [editingChatId]);

  const handleNewChat = async () => {
    try {
      const res = await axios.post('/api/chats/new');
      setChats(prev => [res.data, ...prev]);
      setActiveChatId(res.data.chat_id);
    } catch (err) {
      toast.error("Failed to create new chat");
    }
  };

  const handleDeleteChat = async (e, chatId) => {
    e.stopPropagation();
    try {
      await axios.delete(`/api/chats/${chatId}`);
      setChats(prev => prev.filter(c => c.chat_id !== chatId));
      if (activeChatId === chatId) setActiveChatId(null);
      toast.success("Chat removed");
    } catch (err) {
      toast.error("Failed to delete chat");
    }
  };

  const startEditing = (e, chat) => {
    e.stopPropagation();
    setEditingChatId(chat.chat_id);
    setEditTitleText(chat.title);
  };

  const saveTitle = async (chatId) => {
    if (!editTitleText.trim()) {
      setEditingChatId(null);
      return;
    }
    try {
      await axios.patch(`/api/chats/${chatId}/title`, { title: editTitleText });
      setChats(prev => prev.map(c => c.chat_id === chatId ? { ...c, title: editTitleText } : c));
      toast.success("Title updated");
    } catch (err) {
      toast.error("Failed to update title");
    }
    setEditingChatId(null);
  };

  const handleKeyDown = (e, chatId) => {
    if (e.key === 'Enter') {
      saveTitle(chatId);
    } else if (e.key === 'Escape') {
      setEditingChatId(null);
    }
  };

  return (
    <div className="w-64 bg-[#bce6ee]/60 backdrop-blur-xl border-r border-cyan-300/40 flex flex-col h-full flex-shrink-0 text-[#0e3b43]">
      {/* Header */}
      <div className="p-4 flex items-center mb-2">
        <div className="w-8 h-8 bg-gradient-to-r from-cyan-500 to-teal-500 rounded-lg flex items-center justify-center font-bold text-white shadow-lg shadow-cyan-500/25 mr-3">
          VA
        </div>
        <h1 className="text-xl font-bold text-[#0e3b43] tracking-tight">VaultAI</h1>
      </div>
      
      {/* Top Actions Header */}
      <div className="px-4 mb-4 space-y-2">
        <button 
          onClick={handleNewChat}
          className="w-full flex items-center justify-center space-x-2 py-2.5 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-white font-bold rounded-xl shadow-lg shadow-cyan-500/25 transition-all duration-300 active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" />
          <span>New Chat</span>
        </button>
        <button 
          onClick={openKB}
          className="w-full flex items-center justify-center space-x-2 py-2.5 bg-[#ffffff]/60 hover:bg-[#ffffff]/90 text-[#0e3b43] border border-cyan-300/50 rounded-xl transition-all duration-300 active:scale-[0.98] shadow-sm"
        >
          <Database className="w-4 h-4 text-cyan-600" />
          <span>Knowledge Base</span>
        </button>
      </div>

      {/* Recent Chats */}
      <div className="flex-1 overflow-y-auto px-4 space-y-1 custom-scrollbar">
        <h2 className="text-xs font-bold text-teal-800/70 uppercase tracking-wider mb-3 px-1 mt-2">Recent Chats</h2>
        {chats.length === 0 ? (
          <p className="text-sm text-teal-800/70 py-2 px-1">No chats yet.</p>
        ) : (
          chats.map((chat) => {
            const isActive = chat.chat_id === activeChatId;
            const isEditing = editingChatId === chat.chat_id;
            
            return (
              <div 
                key={chat.chat_id}
                onClick={() => { if (!isEditing) setActiveChatId(chat.chat_id); }}
                className={`flex items-center px-3 py-2.5 rounded-xl cursor-pointer group transition-all duration-200 justify-between
                  ${isActive 
                    ? 'bg-[#ffffff]/80 border border-cyan-300/50 text-[#0e3b43] shadow-sm shadow-cyan-500/10' 
                    : 'text-teal-800/70 hover:bg-[#ffffff]/50 hover:text-[#0e3b43] border border-transparent'
                  }`}
              >
                <div className="flex items-center overflow-hidden flex-1 mr-2">
                  <MessageSquare className={`w-4 h-4 mr-3 flex-shrink-0 ${isActive ? 'text-cyan-600' : 'opacity-70 group-hover:opacity-100 group-hover:text-cyan-600'}`} />
                  
                  {isEditing ? (
                    <input 
                      ref={inputRef}
                      type="text"
                      value={editTitleText}
                      onChange={(e) => setEditTitleText(e.target.value)}
                      onBlur={() => saveTitle(chat.chat_id)}
                      onKeyDown={(e) => handleKeyDown(e, chat.chat_id)}
                      onClick={(e) => e.stopPropagation()}
                      className="bg-transparent border-b border-cyan-500 text-cyan-900 outline-none px-1 text-sm w-full"
                    />
                  ) : (
                    <span className="truncate text-sm font-medium">{chat.title}</span>
                  )}
                </div>
                
                {!isEditing && (
                  <div className="opacity-0 group-hover:opacity-100 flex items-center space-x-1 flex-shrink-0">
                    <button 
                      className="p-1 text-teal-800/70 hover:text-cyan-600 transition-all"
                      title="Rename chat"
                      onClick={(e) => startEditing(e, chat)}
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button 
                      className="p-1 text-teal-800/70 hover:text-red-500 transition-all"
                      title="Delete chat"
                      onClick={(e) => handleDeleteChat(e, chat.chat_id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* User Profile */}
      <div className="p-4 border-t border-cyan-300/40 bg-[#cbf0f8]/50 mt-auto">
        <div className="flex items-center justify-between p-2 rounded-xl hover:bg-[#ffffff]/60 transition-colors cursor-pointer group">
          <div className="flex items-center space-x-3 overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-cyan-500 to-teal-500 flex items-center justify-center text-sm font-bold text-white flex-shrink-0 shadow-md">
              {user.fullname.charAt(0).toUpperCase()}
            </div>
            <div className="truncate">
              <p className="text-sm font-bold text-[#0e3b43] truncate">{user.fullname}</p>
              <p className="text-xs text-teal-800/70 truncate">{user.email}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="p-1.5 text-teal-800/70 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors" title="Log out">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
