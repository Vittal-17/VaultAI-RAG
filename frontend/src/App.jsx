import React from 'react';
import FileUpload from './components/FileUpload';
import ChatBox from './components/ChatBox';

function App() {
  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden font-sans">
      <div className="w-1/3 bg-white border-r border-gray-200 p-6 flex flex-col">
        <h1 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
          <span className="bg-blue-600 text-white p-2 rounded-lg mr-3">VA</span>
          VaultAI
        </h1>
        <div className="flex-grow flex flex-col">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">Knowledge Base</h2>
          <FileUpload />
        </div>
      </div>
      <div className="w-2/3 flex flex-col bg-gray-50">
        <ChatBox />
      </div>
    </div>
  );
}

export default App;
