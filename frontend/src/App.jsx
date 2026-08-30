import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Toaster, toast } from 'react-hot-toast';
import ChatBox from './components/ChatBox';
import AuthScreen from './components/AuthScreen';
import Sidebar from './components/Sidebar';
import KnowledgeBaseModal from './components/KnowledgeBaseModal';
import { Loader, PanelLeftClose, PanelLeft } from 'lucide-react';
import AuthLoadingOverlay from './components/AuthLoadingOverlay';
import { withAuthDelay } from './utils/authDelay';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isKBOpen, setIsKBOpen] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const loadUserData = async () => {
    try {
      const chatsRes = await axios.get('/api/chats');
      setChats(chatsRes.data);
      if (chatsRes.data.length > 0) setActiveChatId(chatsRes.data[0].chat_id);
      
      const docsRes = await axios.get('/api/documents');
      setUploadedFiles(docsRes.data);
    } catch (error) {
      console.error("Failed to load user data:", error);
    }
  };

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await axios.get('/api/me');
        setUser(res.data.user);
        await loadUserData();
      } catch (err) {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  const handleAuthSuccess = async (userData) => {
    setUser(userData);
    await loadUserData();
  };

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await withAuthDelay(() => axios.post('/api/logout'));
      setUser(null);
      setChats([]);
      setActiveChatId(null);
      setUploadedFiles([]);
      toast.success("Logged out successfully");
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Logout failed');
    } finally {
      setIsLoggingOut(false);
    }
  };

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gradient-to-br from-[#d4f0f0] via-[#e0f6f8] to-[#cbf0f8]">
        <Loader className="w-8 h-8 animate-spin text-cyan-500" />
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <Toaster position="top-right" toastOptions={{
          style: { background: '#ffffff', color: '#0e3b43', border: '1px solid rgba(6, 182, 212, 0.4)' }
        }}/>
        <AuthScreen onAuthSuccess={handleAuthSuccess} />
      </>
    );
  }

  return (
    <>
      <Toaster position="top-right" toastOptions={{
        style: { background: '#ffffff', color: '#0e3b43', border: '1px solid rgba(6, 182, 212, 0.4)' }
      }}/>
      
      <div className="h-screen w-screen overflow-hidden flex bg-gradient-to-br from-[#d4f0f0] via-[#e0f6f8] to-[#cbf0f8] text-[#0e3b43] selection:bg-cyan-500/30 font-sans">
        
        <Sidebar 
          sidebarOpen={sidebarOpen}
          user={user}
          handleLogout={handleLogout}
          chats={chats}
          setChats={setChats}
          activeChatId={activeChatId}
          setActiveChatId={setActiveChatId}
          openKB={() => setIsKBOpen(true)}
        />

        <div className="flex-1 flex flex-col relative min-w-0 bg-transparent">
          
          <div className="h-14 flex items-center px-4 border-b border-cyan-300/40 bg-[#bce6ee]/60 backdrop-blur-xl absolute top-0 w-full z-10 pointer-events-auto shadow-sm shadow-cyan-950/5">
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 text-teal-800/70 hover:text-[#0e3b43] hover:bg-[#a5dfec]/80 rounded-lg transition-colors"
            >
              {sidebarOpen ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeft className="w-5 h-5" />}
            </button>
            <span className="ml-4 font-bold text-[#0e3b43]">{sidebarOpen ? '' : 'CYPHR'}</span>
          </div>

          <div className="flex-1 flex flex-col pt-14 min-h-0">
            <ChatBox 
              activeChatId={activeChatId} 
              setActiveChatId={setActiveChatId} 
              setChats={setChats}
            />
          </div>

        </div>
      </div>

      <KnowledgeBaseModal 
        isOpen={isKBOpen}
        onClose={() => setIsKBOpen(false)}
        uploadedFiles={uploadedFiles}
        setUploadedFiles={setUploadedFiles}
      />
      <AuthLoadingOverlay isVisible={isLoggingOut} />
    </>
  );
}

export default App;
