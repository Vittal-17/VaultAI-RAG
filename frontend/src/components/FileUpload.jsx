import React, { useState, useRef } from 'react';
import { UploadCloud, File, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import axios from 'axios';

const FileUpload = () => {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState('idle'); // idle, uploading, success, error
  const [message, setMessage] = useState('');
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setStatus('idle');
      setMessage('');
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
      setStatus('idle');
      setMessage('');
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setStatus('uploading');
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post('http://localhost:8000/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setStatus('success');
      setMessage(response.data.message);
      setFile(null);
      if(fileInputRef.current) fileInputRef.current.value = '';
    } catch (error) {
      setStatus('error');
      setMessage(error.response?.data?.detail || 'An error occurred during upload.');
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div 
        className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center transition-colors
          ${status === 'uploading' ? 'border-blue-400 bg-blue-50' : 'border-gray-300 bg-gray-50 hover:bg-gray-100 cursor-pointer'}`}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <UploadCloud className="w-12 h-12 text-gray-400 mb-4" />
        <p className="text-sm text-gray-600 mb-2">
          <span className="font-semibold text-blue-600">Click to upload</span> or drag and drop
        </p>
        <p className="text-xs text-gray-500">PDF documents only</p>
        <input 
          type="file" 
          accept=".pdf" 
          className="hidden" 
          ref={fileInputRef}
          onChange={handleFileChange}
        />
      </div>

      {file && status === 'idle' && (
        <div className="mt-4 flex items-center justify-between p-3 bg-white border rounded-lg shadow-sm">
          <div className="flex items-center space-x-3 overflow-hidden">
            <File className="w-5 h-5 text-blue-500 flex-shrink-0" />
            <span className="text-sm font-medium text-gray-700 truncate">{file.name}</span>
          </div>
          <button 
            onClick={handleUpload}
            className="ml-4 px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
          >
            Upload
          </button>
        </div>
      )}

      {status === 'uploading' && (
        <div className="mt-4 flex items-center space-x-2 text-blue-600 p-3 bg-blue-50 rounded-lg">
          <Loader className="w-5 h-5 animate-spin" />
          <span className="text-sm font-medium">Processing document & generating embeddings...</span>
        </div>
      )}

      {status === 'success' && (
        <div className="mt-4 flex items-center space-x-2 text-green-700 p-3 bg-green-50 rounded-lg">
          <CheckCircle className="w-5 h-5" />
          <span className="text-sm font-medium">{message}</span>
        </div>
      )}

      {status === 'error' && (
        <div className="mt-4 flex items-start space-x-2 text-red-700 p-3 bg-red-50 rounded-lg">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <span className="text-sm font-medium">{message}</span>
        </div>
      )}
    </div>
  );
};

export default FileUpload;
