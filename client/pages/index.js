import { useState, useEffect } from 'react';
import io from 'socket.io-client';
import GameBoard from '../components/GameBoard';
import RoomLobby from '../components/RoomLobby';

export default function Home() {
  const [socket, setSocket] = useState(null);
  const [gameStatus, setGameStatus] = useState('menu'); // 'menu', 'lobby', 'playing', 'finished', 'ended'
  const [playerData, setPlayerData] = useState({ username: '', roomId: '', inviteCode: '' });
  const [currentRound, setCurrentRound] = useState(null);
  const [players, setPlayers] = useState([]);
  const [language, setLanguage] = useState('ID'); // Default to Indonesian
  const [roomInfo, setRoomInfo] = useState(null);
  const [isOwner, setIsOwner] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [finalRanking, setFinalRanking] = useState(null);

  useEffect(() => {
    // Check for invite code in URL
    const urlParams = new URLSearchParams(window.location.search);
    const inviteCode = urlParams.get('invite');
    
    // Store invite code if present
    if (inviteCode) {
      setPlayerData(prev => ({ ...prev, inviteCode }));
    }
    
    // Initialize socket connection
    const newSocket = io(process.env.NODE_ENV === 'production' ? 'http://localhost:5000' : 'http://localhost:5000');
    setSocket(newSocket);

    // Connection status listeners
    newSocket.on('connect', () => {
      console.log('Connected to server');
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from server');
      setIsConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      setIsConnected(false);
    });

    // Socket event listeners
    newSocket.on('room-created', (data) => {
      console.log('Room created:', data);
      setPlayerData(prev => ({ ...prev, roomId: data.roomId }));
      setIsOwner(data.isOwner);
      setRoomInfo({
        inviteCode: data.inviteCode,
        gameSettings: data.gameSettings,
        ownerId: newSocket.id,
        ownerUsername: playerData.username
      });
      setGameStatus('lobby');
    });

    newSocket.on('room-joined', (data) => {
      console.log('Room joined:', data);
      setPlayerData(prev => ({ ...prev, roomId: data.roomId }));
      setIsOwner(data.isOwner);
      setRoomInfo({
        inviteCode: data.inviteCode,
        gameSettings: data.gameSettings
      });
      setGameStatus('lobby');
    });

    newSocket.on('room-info-update', (data) => {
      console.log('Room info updated:', data);
      setRoomInfo(data);
      setIsOwner(data.ownerId === newSocket.id);
    });

    newSocket.on('ownership-transferred', (data) => {
      console.log('Ownership transferred:', data);
      setIsOwner(data.newOwnerId === newSocket.id);
      addNotification(data.message, 'info');
    });

    newSocket.on('round-start', (data) => {
      console.log('Round started:', data);
      console.log('Round data received:', {
        currentRound: data.currentRound,
        totalRounds: data.totalRounds,
        theme: data.theme
      });
      console.log('Requirements received:', data.requirements?.map(r => `${r.type}:${r.value} (${r.points}pts)`));
      setCurrentRound(data);
      setGameStatus('playing');
    });

    newSocket.on('game-end', (data) => {
      console.log('Game ended:', data);
      setCurrentRound(null);
      setGameStatus('finished');
      setFinalRanking(data);
    });

    newSocket.on('players-update', (playersData) => {
      console.log('Players updated:', playersData);
      setPlayers(playersData);
    });

    newSocket.on('room-error', (data) => {
      addNotification(data.message, 'error');
    });

    return () => newSocket.close();
  }, []);

  const addNotification = (message, type = 'info') => {
    const notification = {
      id: Date.now(),
      message,
      type
    };
    setNotifications(prev => [...prev, notification]);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== notification.id));
    }, 5000);
  };

  const handleCreateRoom = (playerUsername) => {
    if (socket && playerUsername.trim()) {
      setPlayerData(prev => ({ ...prev, username: playerUsername }));
      socket.emit('create-room', { playerData: { username: playerUsername } });
    }
  };

  const handleJoinRoom = (playerUsername, code) => {
    if (socket && playerUsername.trim() && code.trim()) {
      setPlayerData(prev => ({ ...prev, username: playerUsername }));
      socket.emit('join-room', { 
        roomId: code, 
        playerData: { username: playerUsername } 
      });
    }
  };

  const handleJoinByInvite = (inviteCode) => {
    if (socket && playerData.username && inviteCode) {
      socket.emit('join-by-invite', {
        inviteCode: inviteCode,
        playerData: { username: playerData.username }
      });
    }
  };

  const handleStartGame = () => {
    if (socket && playerData.roomId) {
      socket.emit('start-game', { roomId: playerData.roomId });
    }
  };

  const handleUpdateSettings = (newSettings) => {
    if (socket && playerData.roomId) {
      socket.emit('update-settings', { 
        roomId: playerData.roomId, 
        settings: newSettings 
      });
    }
  };

  const handleBackToMenu = () => {
    setGameStatus('menu');
    setPlayerData({ username: '', roomId: '' });
    setRoomInfo(null);
    setIsOwner(false);
    setCurrentRound(null);
    setPlayers([]);
  };

  // Menu/Home Screen
  if (gameStatus === 'menu') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md">
          <h1 className="text-3xl font-bold text-center mb-8 text-gray-800">WordRush</h1>
          
          {playerData.inviteCode && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-blue-800 text-sm font-medium mb-2">🎮 You've been invited to join a room!</p>
              <p className="text-blue-600 text-sm">Invite Code: <span className="font-mono font-bold">{playerData.inviteCode}</span></p>
              <p className="text-blue-600 text-xs mt-1">Enter your name below to join automatically.</p>
            </div>
          )}
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Your Name</label>
              <input
                type="text"
                value={playerData.username}
                onChange={(e) => {
                  const username = e.target.value;
                  setPlayerData(prev => ({ ...prev, username }));
                }}
                className="w-full border rounded px-3 py-2"
                placeholder="Enter your username"
                autoFocus={!!playerData.inviteCode}
              />
            </div>

            {playerData.inviteCode ? (
              <button
                onClick={() => {
                  if (playerData.username.trim() && socket) {
                    handleJoinByInvite(playerData.inviteCode);
                  }
                }}
                disabled={!playerData.username.trim()}
                className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white py-2 rounded transition-colors"
              >
                Join Room
              </button>
            ) : (
              <>
                <button
                  onClick={() => handleCreateRoom(playerData.username)}
                  disabled={!playerData.username.trim()}
                  className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white py-2 rounded transition-colors"
                >
                  Create Room
                </button>

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Room code"
                    className="flex-1 border rounded px-3 py-2"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && e.target.value.trim() && playerData.username.trim()) {
                        handleJoinRoom(playerData.username, e.target.value);
                      }
                    }}
                  />
                  <button
                    onClick={(e) => {
                      const input = e.target.previousElementSibling;
                      if (input.value.trim() && playerData.username.trim()) {
                        handleJoinRoom(playerData.username, input.value);
                      }
                    }}
                    disabled={!playerData.username.trim()}
                    className="bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white px-4 py-2 rounded transition-colors"
                  >
                    Join
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Notifications */}
        {notifications.length > 0 && (
          <div className="fixed top-4 right-4 space-y-2 z-50">
            {notifications.map(notification => (
              <div
                key={notification.id}
                className={`p-3 rounded-lg shadow-lg ${
                  notification.type === 'error' 
                    ? 'bg-red-500 text-white' 
                    : 'bg-blue-500 text-white'
                }`}
              >
                {notification.message}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Room Lobby
  if (gameStatus === 'lobby') {
    const currentPlayer = players.find(p => p.socketId === socket?.id);
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-6xl mx-auto">
          <div className="mb-4">
            <button
              onClick={handleBackToMenu}
              className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded transition-colors"
            >
              ← Back to Menu
            </button>
          </div>

          <RoomLobby
            socket={socket}
            roomId={playerData.roomId}
            players={players}
            roomInfo={roomInfo}
            isOwner={isOwner}
            currentPlayer={currentPlayer}
            currentSocketId={socket?.id}
            onStartGame={handleStartGame}
            onUpdateSettings={handleUpdateSettings}
          />
        </div>

        {/* Notifications */}
        {notifications.length > 0 && (
          <div className="fixed top-4 right-4 space-y-2 z-50">
            {notifications.map(notification => (
              <div
                key={notification.id}
                className={`p-3 rounded-lg shadow-lg ${
                  notification.type === 'error' 
                    ? 'bg-red-500 text-white' 
                    : 'bg-blue-500 text-white'
                }`}
              >
                {notification.message}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Game Playing
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <GameBoard 
        socket={socket} 
        username={playerData.username} 
        roomId={playerData.roomId}
        onBackToHome={handleBackToMenu}
        initialRound={currentRound}
        initialPlayers={players}
        isConnected={isConnected}
        gameStatus={gameStatus}
        finalRanking={finalRanking}
      />

      {/* Notifications */}
      {notifications.length > 0 && (
        <div className="fixed top-4 right-4 space-y-2 z-50">
          {notifications.map(notification => (
            <div
              key={notification.id}
              className={`p-3 rounded-lg shadow-lg ${
                notification.type === 'error' 
                  ? 'bg-red-500 text-white' 
                  : 'bg-blue-500 text-white'
              }`}
            >
              {notification.message}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
