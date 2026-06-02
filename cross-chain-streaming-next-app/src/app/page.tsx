'use client';

import { useState } from 'react';
import StreamingQuote from '../components/StreamingQuote';

export default function Home() {
  const [formData, setFormData] = useState({
    originChain: '8453',
    destinationChain: '42161',
    sellToken: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
    buyToken: '0xaf88d065e77c8cc2239327c5edb3a432268e5831', 
    sellAmount: '1000000',
    originAddress: '0xaeC1B7813F4274586659f67701c255E1b54803Cb',
    apiKey: '',
  }); 

  const [showStreaming, setShowStreaming] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.apiKey.trim()) {
      alert('Please enter your 0x API key');
      return;
    }
    setShowStreaming(true);
  };

  const resetDemo = () => {
    setShowStreaming(false);
  };

  const chainOptions = [
    { value: '1', label: 'Ethereum' },
    { value: '8453', label: 'Base' },
    { value: '137', label: 'Polygon' },
    { value: '42161', label: 'Arbitrum' },
    { value: '10', label: 'Optimism' },
  ];

  if (showStreaming) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto px-4">
          <div className="mb-6">
            <button
              onClick={resetDemo}
              className="px-4 py-2 text-blue-600 hover:text-blue-800 underline"
            >
              ← Back to Configuration
            </button>
          </div>
          <StreamingQuote {...formData} autoStart />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-2xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            0x Cross-Chain Streaming Quote Demo
          </h1>
          <p className="text-gray-600">
            Real-time cross-chain quote streaming using Server-Sent Events
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="originChain" className="block text-sm font-medium text-gray-700 mb-1">
                Origin Chain
              </label>
              <select
                id="originChain"
                name="originChain"
                value={formData.originChain}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {chainOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="destinationChain" className="block text-sm font-medium text-gray-700 mb-1">
                Destination Chain
              </label>
              <select
                id="destinationChain"
                name="destinationChain"
                value={formData.destinationChain}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {chainOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="sellToken" className="block text-sm font-medium text-gray-700 mb-1">
              Sell Token Address
            </label>
            <input
              type="text"
              id="sellToken"
              name="sellToken"
              value={formData.sellToken}
              onChange={handleInputChange}
              placeholder="0xA0b86a33E6441e6fd88fe2EC14D57399b1e1e94b"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label htmlFor="buyToken" className="block text-sm font-medium text-gray-700 mb-1">
              Buy Token Address
            </label>
            <input
              type="text"
              id="buyToken"
              name="buyToken"
              value={formData.buyToken}
              onChange={handleInputChange}
              placeholder="0xA0b86a33E6441e6fd88fe2EC14D57399b1e1e94b"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label htmlFor="sellAmount" className="block text-sm font-medium text-gray-700 mb-1">
              Sell Amount (in token units)
            </label>
            <input
              type="text"
              id="sellAmount"
              name="sellAmount"
              value={formData.sellAmount}
              onChange={handleInputChange}
              placeholder="1000000"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label htmlFor="originAddress" className="block text-sm font-medium text-gray-700 mb-1">
              Origin Address
            </label>
            <input
              type="text"
              id="originAddress"
              name="originAddress"
              value={formData.originAddress}
              onChange={handleInputChange}
              placeholder="0x742d35Cc6634C0532925a3b8d657d7a6e1a3b4e3"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700 mb-1">
              0x API Key
            </label>
            <input
              type="password"
              id="apiKey"
              name="apiKey"
              value={formData.apiKey}
              onChange={handleInputChange}
              placeholder="Enter your 0x API key"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>


          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
          >
            Start Streaming Demo
          </button>
        </form>

        <div className="mt-8 text-center text-sm text-gray-500">
          <p>
            Need a 0x API key?{' '}
            <a
              href="https://0x.org/docs/introduction/getting-started"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              Get one here
            </a>
          </p>
          <p className="mt-2 text-xs">
            Uses production 0x API endpoint
          </p>
        </div>
      </div>
    </div>
  );
}
