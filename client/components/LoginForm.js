import { useState } from 'react';

export default function LoginForm({ onLogin, isConnected }) {
  const [username, setUsername] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (username.trim() && isConnected) {
      onLogin(username.trim());
    }
  };

  return (
    <div className="game-card w-full max-w-md">
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">WordRush</h1>
        <p className="text-gray-600">Fast-Paced Word Game</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
            Nama Pemain
          </label>
          <input
            type="text"
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="input-field"
            placeholder="Masukkan nama Anda"
            maxLength={20}
            required
          />
        </div>

        <button
          type="submit"
          disabled={!isConnected || !username.trim()}
          className={`w-full py-3 px-4 rounded-lg font-medium transition-colors duration-200 ${
            isConnected && username.trim()
              ? 'bg-primary-600 hover:bg-primary-700 text-white'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          {isConnected ? 'Mulai Bermain' : 'Menghubungkan...'}
        </button>
      </form>

      <div className="mt-4 text-center">
        <div className={`inline-flex items-center text-sm ${
          isConnected ? 'text-green-600' : 'text-red-600'
        }`}>
          <div className={`w-2 h-2 rounded-full mr-2 ${
            isConnected ? 'bg-green-500' : 'bg-red-500'
          }`}></div>
          {isConnected ? 'Terhubung ke server' : 'Tidak terhubung'}
        </div>
      </div>

      <div className="mt-6 text-xs text-gray-500 text-center">
        <p><strong>Cara Bermain:</strong></p>
        <ul className="mt-2 space-y-1">
          <li>• Maksimal 3 jawaban per round</li>
          <li>• Jawaban duplikat tidak dihitung</li>
          <li>• Skor berdasarkan jawaban benar</li>
        </ul>
      </div>
    </div>
  );
}
