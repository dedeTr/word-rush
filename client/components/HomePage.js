import { useState } from 'react';

const translations = {
  en: {
    title: 'WordRush',
    subtitle: 'Fast-Paced Word Game',
    playerName: 'Player Name',
    enterName: 'Enter your name',
    createRoom: 'Create Room',
    joinRoom: 'Join Room',
    roomCode: 'Room Code',
    enterCode: 'Enter room code',
    join: 'Join',
    quickPlay: 'Quick Play',
    language: 'Language',
    howToPlay: 'How to Play',
    rules: [
      '• Maximum 3 answers per round',
      '• Duplicate answers don\'t count',
      '• Score based on correct answers',
      '• Answer must match theme and requirements'
    ],
    connecting: 'Connecting...',
    connected: 'Connected',
    notConnected: 'Not Connected'
  },
  id: {
    title: 'WordRush',
    subtitle: 'Game Kata Cepat',
    playerName: 'Nama Pemain',
    enterName: 'Masukkan nama Anda',
    createRoom: 'Buat Ruangan',
    joinRoom: 'Gabung Ruangan',
    roomCode: 'Kode Ruangan',
    enterCode: 'Masukkan kode ruangan',
    join: 'Gabung',
    quickPlay: 'Main Cepat',
    language: 'Bahasa',
    howToPlay: 'Cara Bermain',
    rules: [
      '• Maksimal 3 jawaban per round',
      '• Jawaban duplikat tidak dihitung',
      '• Skor berdasarkan jawaban benar',
      '• Jawaban harus sesuai tema dan syarat'
    ],
    connecting: 'Menghubungkan...',
    connected: 'Terhubung',
    notConnected: 'Tidak terhubung'
  }
};

export default function HomePage({ onCreateRoom, onJoinRoom, onQuickPlay, isConnected }) {
  const [username, setUsername] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [language, setLanguage] = useState('id');
  const [showJoinRoom, setShowJoinRoom] = useState(false);

  const t = translations[language];

  const handleCreateRoom = (e) => {
    e.preventDefault();
    if (username.trim() && isConnected) {
      onCreateRoom(username.trim());
    }
  };

  const handleJoinRoom = (e) => {
    e.preventDefault();
    if (username.trim() && roomCode.trim() && isConnected) {
      onJoinRoom(username.trim(), roomCode.trim().toUpperCase());
    }
  };

  const handleQuickPlay = (e) => {
    e.preventDefault();
    if (username.trim() && isConnected) {
      onQuickPlay(username.trim());
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="game-card w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">{t.title}</h1>
          <p className="text-gray-600">{t.subtitle}</p>
        </div>

        {/* Language Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t.language}
          </label>
          <div className="flex space-x-2">
            <button
              onClick={() => setLanguage('id')}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors duration-200 ${
                language === 'id'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              🇮🇩 Indonesia
            </button>
            <button
              onClick={() => setLanguage('en')}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors duration-200 ${
                language === 'en'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              🇺🇸 English
            </button>
          </div>
        </div>

        {/* Player Name Input */}
        <div className="mb-6">
          <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
            {t.playerName}
          </label>
          <input
            type="text"
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="input-field"
            placeholder={t.enterName}
            maxLength={20}
            required
          />
        </div>

        {/* Game Mode Selection */}
        <div className="space-y-3 mb-6">
          {/* Quick Play */}
          <button
            onClick={handleQuickPlay}
            disabled={!isConnected || !username.trim()}
            className={`w-full py-3 px-4 rounded-lg font-medium transition-colors duration-200 ${
              isConnected && username.trim()
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            🚀 {t.quickPlay}
          </button>

          {/* Create Room */}
          <button
            onClick={handleCreateRoom}
            disabled={!isConnected || !username.trim()}
            className={`w-full py-3 px-4 rounded-lg font-medium transition-colors duration-200 ${
              isConnected && username.trim()
                ? 'bg-primary-600 hover:bg-primary-700 text-white'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            🏠 {t.createRoom}
          </button>

          {/* Join Room Toggle */}
          <button
            onClick={() => setShowJoinRoom(!showJoinRoom)}
            disabled={!isConnected || !username.trim()}
            className={`w-full py-3 px-4 rounded-lg font-medium transition-colors duration-200 ${
              isConnected && username.trim()
                ? 'bg-purple-600 hover:bg-purple-700 text-white'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            🔗 {t.joinRoom}
          </button>
        </div>

        {/* Join Room Form */}
        {showJoinRoom && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <form onSubmit={handleJoinRoom} className="space-y-3">
              <div>
                <label htmlFor="roomCode" className="block text-sm font-medium text-gray-700 mb-2">
                  {t.roomCode}
                </label>
                <input
                  type="text"
                  id="roomCode"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  className="input-field"
                  placeholder={t.enterCode}
                  maxLength={6}
                  required
                />
              </div>
              <button
                type="submit"
                disabled={!roomCode.trim()}
                className={`w-full py-2 px-4 rounded-lg font-medium transition-colors duration-200 ${
                  roomCode.trim()
                    ? 'bg-purple-600 hover:bg-purple-700 text-white'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {t.join}
              </button>
            </form>
          </div>
        )}

        {/* Connection Status */}
        <div className="mb-6 text-center">
          <div className={`inline-flex items-center text-sm ${
            isConnected ? 'text-green-600' : 'text-red-600'
          }`}>
            <div className={`w-2 h-2 rounded-full mr-2 ${
              isConnected ? 'bg-green-500' : 'bg-red-500'
            }`}></div>
            {isConnected ? t.connected : t.notConnected}
          </div>
        </div>

        {/* How to Play */}
        <div className="text-xs text-gray-500">
          <p className="font-semibold mb-2">{t.howToPlay}:</p>
          <ul className="space-y-1">
            {t.rules.map((rule, index) => (
              <li key={index}>{rule}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
