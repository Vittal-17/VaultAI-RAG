import React from 'react';
import { X, FileText, Trash2 } from 'lucide-react';
import FileUpload from './FileUpload';
import toast from 'react-hot-toast';
import axios from 'axios';

const KnowledgeBaseModal = ({ isOpen, onClose, uploadedFiles, setUploadedFiles }) => {
  if (!isOpen) return null;

  const addFile = (fileName) => {
    setUploadedFiles(prev => {
      if (prev.find(f => f.filename === fileName)) return prev;
      return [...prev, { filename: fileName }];
    });
  };

  const handleDelete = async (filename) => {
    try {
      await axios.delete(`http://localhost:8000/api/documents/${filename}`);
      setUploadedFiles(prev => prev.filter(f => f.filename !== filename));
      toast.success("Document removed");
    } catch (err) {
      toast.error("Failed to delete document");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#e0f6f8]/80 backdrop-blur-sm transition-all duration-300">
      <div className="backdrop-blur-xl bg-[#ffffff]/70 border border-cyan-300/60 rounded-3xl p-6 max-w-lg w-full shadow-xl shadow-cyan-950/5 relative animate-in fade-in zoom-in-95 duration-200">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-teal-800/70 hover:text-[#0e3b43] bg-[#ffffff]/50 hover:bg-[#ffffff]/80 rounded-full transition-colors border border-transparent hover:border-cyan-300/50 shadow-sm"
        >
          <X className="w-5 h-5" />
        </button>
        
        <h2 className="text-xl font-bold text-[#0e3b43] mb-2">Knowledge Base</h2>
        <p className="text-teal-800/70 text-sm mb-6">Upload PDFs to make them searchable by the AI.</p>
        
        <div className="mb-6">
          <FileUpload onUploadSuccess={addFile} />
        </div>

        <div className="flex-1 overflow-y-auto max-h-64 space-y-2 custom-scrollbar">
          <h3 className="text-xs font-bold text-teal-800/70 uppercase tracking-wider mb-3">Indexed Documents</h3>
          {uploadedFiles.length === 0 ? (
            <p className="text-sm text-teal-800/70 py-2">No documents indexed yet.</p>
          ) : (
            uploadedFiles.map((f, i) => (
              <div key={i} className="flex items-center px-3 py-2 rounded-xl bg-[#ffffff]/60 border border-cyan-300/40 hover:border-cyan-400 transition-colors group text-sm text-[#0e3b43] justify-between shadow-sm">
                <div className="flex items-center overflow-hidden">
                  <FileText className="w-4 h-4 mr-3 text-cyan-600 opacity-80 flex-shrink-0" />
                  <span className="truncate font-medium">{f.filename}</span>
                </div>
                <button 
                  className="opacity-0 group-hover:opacity-100 p-1.5 text-teal-800/70 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all flex-shrink-0"
                  title="Delete document"
                  onClick={() => handleDelete(f.filename)}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default KnowledgeBaseModal;
