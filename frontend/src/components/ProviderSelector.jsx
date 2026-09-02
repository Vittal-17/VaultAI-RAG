import React from 'react';
import { Settings2 } from 'lucide-react';

const ProviderSelector = ({ providers, selectedProvider, setSelectedProvider, selectedModel, setSelectedModel }) => {
  if (!providers || providers.length === 0) return null;

  const handleProviderChange = (e) => {
    const pId = e.target.value;
    setSelectedProvider(pId);
    const p = providers.find(p => p.id === pId);
    if (p && p.models.length > 0) {
      setSelectedModel(p.models[0].id);
    } else {
      setSelectedModel('');
    }
  };

  const currentProvider = providers.find(p => p.id === selectedProvider);
  const models = currentProvider ? currentProvider.models : [];

  return (
    <div className="flex items-center space-x-3 bg-[#ffffff]/60 backdrop-blur-md border border-cyan-300/40 px-4 py-2 rounded-xl shadow-sm text-sm">
      <Settings2 className="w-4 h-4 text-teal-800/70" />
      <div className="flex items-center space-x-2">
        <label className="text-teal-800/70 font-semibold text-xs uppercase tracking-wider">Model:</label>
        <select
          value={selectedProvider}
          onChange={handleProviderChange}
          className="bg-transparent text-[#0e3b43] font-bold focus:outline-none cursor-pointer appearance-none"
        >
          {providers.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <span className="text-teal-800/30">/</span>
        <select
          value={selectedModel}
          onChange={(e) => setSelectedModel(e.target.value)}
          className="bg-transparent text-[#0e3b43] font-medium focus:outline-none cursor-pointer appearance-none"
        >
          {models.map(m => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default ProviderSelector;
