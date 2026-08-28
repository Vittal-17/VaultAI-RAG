import React, { useState, useRef } from 'react';
import { UploadCloud, File, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

const FileUpload = ({ onUploadSuccess }) => {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState('idle'); // idle, uploading, success, error
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setStatus('idle');
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setStatus('uploading');
    const formData = new FormData();
    formData.append('file', file);

    const toastId = toast.loading('Uploading and processing document...');

    try {
      const response = await axios.post('http://localhost:8000/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setStatus('success');
      toast.success(response.data.message || 'Document ready!', { id: toastId });
      if (onUploadSuccess) onUploadSuccess(file.name);
      setTimeout(() => {
        setFile(null);
        setStatus('idle');
        if (fileInputRef.current) fileInputRef.current.value = '';
      }, 2000);
    } catch (error) {
      setStatus('error');
      toast.error(error.response?.data?.detail || 'Upload failed.', { id: toastId });
    }
  };

  return (
    <div className="flex flex-col space-y-3">
      {!file ? (
        <button 
          onClick={() => fileInputRef.current?.click()}
          className="w-full flex items-center justify-center space-x-2 py-4 px-4 rounded-xl border-2 border-dashed border-cyan-300 bg-[#ffffff]/60 hover:bg-[#ffffff]/90 hover:border-cyan-400 text-teal-800/70 hover:text-[#0e3b43] transition-all duration-300 text-sm font-bold shadow-sm"
        >
          <UploadCloud className="w-5 h-5" />
          <span>Click to upload PDF</span>
        </button>
      ) : (
        <div className="flex flex-col space-y-2 p-3 bg-[#ffffff]/80 rounded-xl border border-cyan-300/60 shadow-sm">
          <div className="flex items-center space-x-3 overflow-hidden">
            <File className="w-4 h-4 text-cyan-600 flex-shrink-0" />
            <span className="text-xs font-bold text-[#0e3b43] truncate">{file.name}</span>
          </div>
          
          {status === 'idle' && (
            <div className="flex space-x-2 mt-2">
              <button onClick={() => setFile(null)} className="flex-1 py-1.5 text-xs font-bold text-teal-800/70 hover:text-[#0e3b43] hover:bg-[#ffffff] rounded-lg transition-colors border border-transparent hover:border-cyan-300/50 shadow-sm">Cancel</button>
              <button onClick={handleUpload} className="flex-1 py-1.5 text-xs bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-white font-bold rounded-lg shadow-md shadow-cyan-500/20 transition-all">Upload</button>
            </div>
          )}

          {status === 'uploading' && (
            <div className="flex items-center space-x-2 text-cyan-600 font-bold py-1.5">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-xs">Processing...</span>
            </div>
          )}

          {status === 'success' && (
            <div className="flex items-center space-x-2 text-emerald-600 font-bold py-1.5">
              <CheckCircle2 className="w-4 h-4" />
              <span className="text-xs">Done</span>
            </div>
          )}

          {status === 'error' && (
            <div className="flex items-center space-x-2 text-red-500 font-bold py-1.5">
              <AlertCircle className="w-4 h-4" />
              <span className="text-xs">Failed</span>
            </div>
          )}
        </div>
      )}
      
      <input 
        type="file" 
        accept=".pdf" 
        className="hidden" 
        ref={fileInputRef}
        onChange={handleFileChange}
      />
    </div>
  );
};

export default FileUpload;
