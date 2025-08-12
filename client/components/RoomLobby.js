import React, { useState, useEffect } from 'react';

const RoomLobby = ({ 
  socket, 
  roomId, 
  players, 
  roomInfo, 
  isOwner, 
  currentPlayer,
  currentSocketId,
  onStartGame,
  onUpdateSettings 
}) => {
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState(roomInfo?.gameSettings || {});
  const [copySuccess, setCopySuccess] = useState('');

  useEffect(() => {
    if (roomInfo?.gameSettings) {
      setSettings(roomInfo.gameSettings);
    }
  }, [roomInfo]);

  const copyInviteLink = () => {
    const inviteLink = `${window.location.origin}/?invite=${roomInfo.inviteCode}`;
    navigator.clipboard.writeText(inviteLink).then(() => {
      setCopySuccess('Copied!');
      setTimeout(() => setCopySuccess(''), 2000);
    });
  };

  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomInfo.inviteCode).then(() => {
      setCopySuccess('Code copied!');
      setTimeout(() => setCopySuccess(''), 2000);
    });
  };

  const handleStartGame = () => {
    if (players.length < settings.minPlayers) {
      alert(`Need at least ${settings.minPlayers} players to start the game`);
      return;
    }
    onStartGame();
  };

  const handleSettingsUpdate = () => {
    onUpdateSettings(settings);
    setShowSettings(false);
  };

  const canStartGame = isOwner && players.length >= settings.minPlayers;

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-4xl mx-auto">
      {/* Room Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            👥 Room Lobby
          </h2>
          <p className="text-gray-600">Room ID: {roomId}</p>
        </div>
        
        {isOwner && (
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            ⚙️ Settings
          </button>
        )}
      </div>

      {/* Room Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Invite Code Card */}
        <div className="bg-blue-50 rounded-lg p-4">
          <h3 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
            🔗 Invite Others
          </h3>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Room Code:</span>
              <code className="bg-white px-2 py-1 rounded text-lg font-mono font-bold text-blue-600">
                {roomInfo?.inviteCode}
              </code>
              <button
                onClick={copyRoomCode}
                className="p-1 hover:bg-blue-100 rounded transition-colors"
                title="Copy room code"
              >
                📋
              </button>
            </div>
            <button
              onClick={copyInviteLink}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded text-sm transition-colors"
            >
              Copy Invite Link
            </button>
            {copySuccess && (
              <p className="text-green-600 text-sm">{copySuccess}</p>
            )}
          </div>
        </div>

        {/* Game Info Card */}
        <div className="bg-green-50 rounded-lg p-4">
          <h3 className="font-semibold text-green-800 mb-2">Game Settings</h3>
          <div className="space-y-1 text-sm">
            <p><span className="font-medium">Round Duration:</span> {settings.roundDuration}s</p>
            <p><span className="font-medium">Max Answers:</span> {settings.maxAnswersPerRound}</p>
            <p><span className="font-medium">Min Players:</span> {settings.minPlayers}</p>
            <p><span className="font-medium">Max Players:</span> {settings.maxPlayers}</p>
            <p><span className="font-medium">Total Rounds:</span> {settings.totalRounds || 10}</p>
            <p><span className="font-medium">Themes:</span> {settings.themes?.join(', ')}</p>
          </div>
        </div>
      </div>

      {/* Players List */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
          👥 Players ({players.length}/{settings.maxPlayers})
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {players.map((player) => (
            <div
              key={player.socketId || player.username}
              className={`p-3 rounded-lg border-2 ${
                player.socketId === roomInfo?.ownerId
                  ? 'border-yellow-400 bg-yellow-50'
                  : 'border-gray-200 bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-2">
                {player.socketId === roomInfo?.ownerId && (
                  <span className="text-yellow-500" title="Room Owner">👑</span>
                )}
                <span className="font-medium">{player.username}</span>
                {(player.socketId === currentSocketId || player.socketId === socket?.id) && (
                  <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded">You</span>
                )}
              </div>
              <p className="text-sm text-gray-600">Score: {player.score}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Start Game Button */}
      <div className="flex justify-center">
        {isOwner ? (
          <button
            onClick={handleStartGame}
            disabled={!canStartGame}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-colors ${
              canStartGame
                ? 'bg-green-500 hover:bg-green-600 text-white'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            ▶️ Start Game
          </button>
        ) : (
          <div className="text-center">
            <p className="text-gray-600 mb-2">Waiting for room owner to start the game...</p>
            <p className="text-sm text-gray-500">
              Owner: <span className="font-medium">{roomInfo?.ownerUsername}</span>
            </p>
          </div>
        )}
      </div>

      {/* Settings Modal */}
      {showSettings && isOwner && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">Game Settings</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Round Duration (seconds)</label>
                <input
                  type="number"
                  min="30"
                  max="300"
                  value={settings.roundDuration || 60}
                  onChange={(e) => setSettings({...settings, roundDuration: parseInt(e.target.value)})}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Max Answers per Round</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={settings.maxAnswersPerRound || 3}
                  onChange={(e) => setSettings({...settings, maxAnswersPerRound: parseInt(e.target.value)})}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Minimum Players</label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={settings.minPlayers || 2}
                  onChange={(e) => setSettings({...settings, minPlayers: parseInt(e.target.value)})}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Maximum Players</label>
                <input
                  type="number"
                  min="2"
                  max="50"
                  value={settings.maxPlayers || 10}
                  onChange={(e) => setSettings({...settings, maxPlayers: parseInt(e.target.value)})}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Total Rounds</label>
                <input
                  type="number"
                  min="5"
                  max="20"
                  value={settings.totalRounds || 10}
                  onChange={(e) => setSettings({...settings, totalRounds: parseInt(e.target.value)})}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleSettingsUpdate}
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 rounded transition-colors"
              >
                Save Changes
              </button>
              <button
                onClick={() => setShowSettings(false)}
                className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 py-2 rounded transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoomLobby;
