const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const database = require('./services/database');
const ProductionMonitor = require('./monitor');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: [
      "http://localhost:3000",
      "https://word-rush.up.railway.app",
      process.env.CLIENT_URL
    ].filter(Boolean),
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Middleware
app.use(cors({
  origin: [
    "http://localhost:3000",
    "https://word-rush.up.railway.app",
    process.env.CLIENT_URL
  ].filter(Boolean),
  credentials: true
}));
app.use(express.json());

// Utility functions
function generateRoomId() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const roomCount = await database.redisClient.keys('room:*').then(keys => keys.length);
    res.json({ 
      status: 'OK', 
      timestamp: new Date().toISOString(),
      rooms: roomCount,
      database: database.isConnected ? 'Connected' : 'Disconnected'
    });
  } catch (error) {
    res.status(500).json({ status: 'Error', error: error.message });
  }
});

// Initialize database connections
async function initializeServer() {
  try {
    await database.connect();
    console.log('Database services initialized');
    
    // Start cleanup interval
    setInterval(() => {
      database.cleanupInactiveRooms();
    }, 5 * 60 * 1000); // Every 5 minutes
    
  } catch (error) {
    console.error('Failed to initialize server:', error);
    process.exit(1);
  }
}

// In-memory cache for active rooms (for Socket.IO operations)
let activeRooms = new Map(); // roomId -> { players: Map, socketRooms: Set }
let players = new Map(); // socketId -> { id, username, score, roomId, roundAnswers }

// Game themes and requirements
const themes = ['Hewan', 'Buah', 'Negara'];
const requirements = [
  { type: 'awalan', description: 'Dimulai huruf' },
  { type: 'akhiran', description: 'Diakhiri huruf' },
  { type: 'jumlah', description: 'Jumlah huruf' }
];
const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

// Word dictionary (simplified - in production, use proper database)
const wordDictionary = {
  'Hewan': ['Ayam', 'Bebek', 'Cicak', 'Domba', 'Elang', 'Flamingo', 'Gajah', 'Harimau', 'Ikan', 'Jerapah', 'Kucing', 'Lumba', 'Monyet', 'Naga', 'Orang', 'Panda'],
  'Buah': ['Apel', 'Belimbing', 'Ceri', 'Durian', 'Elderberry', 'Fig', 'Grape', 'Honeydew', 'Jambu', 'Kiwi', 'Lemon', 'Mangga', 'Nanas', 'Orange', 'Pepaya'],
  'Negara': ['Amerika', 'Brasil', 'China', 'Denmark', 'Estonia', 'Finlandia', 'Georgia', 'Honduras', 'India', 'Jepang', 'Korea', 'Laos', 'Malaysia', 'Nepal', 'Oman']
};

// Room management functions
async function createRoom() {
  const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
  
  try {
    // Create room in database
    await database.createRoom(roomId);
    
    // Create in-memory cache for Socket.IO operations
    activeRooms.set(roomId, {
      players: new Map(),
      socketRooms: new Set(),
      roundTimer: null,
      isActive: false
    });
    
    return roomId;
  } catch (error) {
    console.error('Error creating room:', error);
    return null;
  }
}

async function joinRoom(socketId, roomId, playerData) {
  try {
    const room = await database.getRoom(roomId);
    if (!room) return false;
    
    // Update database
    const existingPlayer = room.players.find(p => p.socketId === socketId);
    if (!existingPlayer) {
      room.players.push({
        socketId,
        username: playerData.username,
        score: 0,
        roundAnswers: 0,
        lastActivity: new Date()
      });
      
      await database.updateRoom(roomId, { players: room.players });
    }
    
    // Update in-memory cache
    let activeRoom = activeRooms.get(roomId);
    if (!activeRoom) {
      activeRoom = {
        players: new Map(),
        socketRooms: new Set(),
        roundTimer: null,
        isActive: room.isActive
      };
      activeRooms.set(roomId, activeRoom);
    }
    
    activeRoom.players.set(socketId, {
      ...playerData,
      id: socketId,
      score: existingPlayer ? existingPlayer.score : 0,
      roundAnswers: 0
    });
    
    players.set(socketId, {
      ...playerData,
      id: socketId,
      roomId,
      score: existingPlayer ? existingPlayer.score : 0,
      roundAnswers: 0
    });
    
    return true;
  } catch (error) {
    console.error('Error joining room:', error);
    return false;
  }
}

// Generate random points that total 100
function generateRandomPoints() {
  // Generate 2 random numbers between 10-60
  const point1 = Math.floor(Math.random() * 51) + 10; // 10-60
  const point2 = Math.floor(Math.random() * (90 - point1 - 10)) + 10; // 10 to (90-point1)
  const point3 = 100 - point1 - point2; // Remaining points
  
  return [point1, point2, point3];
}

// End game and calculate final ranking
async function endGame(roomId) {
  try {
    const dbRoom = await database.getRoom(roomId);
    if (!dbRoom) return;

    const activeRoom = activeRooms.get(roomId);
    if (!activeRoom) return;

    // Calculate final ranking based on total scores
    const finalRanking = Array.from(activeRoom.players.values())
      .map(player => ({
        playerId: player.id,
        username: player.username,
        totalScore: player.score || 0
      }))
      .sort((a, b) => b.totalScore - a.totalScore) // Sort by score descending
      .map((player, index) => ({
        ...player,
        rank: index + 1
      }));

    // Update database with final ranking and game status
    await database.updateRoom(roomId, {
      finalRanking: finalRanking,
      gameStatus: 'finished',
      isActive: false
    });

    // Broadcast game end with championship ranking
    io.to(roomId).emit('game-end', {
      finalRanking: finalRanking,
      topThree: finalRanking.slice(0, 3), // Top 3 champions
      totalRounds: dbRoom.gameSettings?.totalRounds || 10
    });

    console.log('Game ended for room:', roomId, 'Final ranking:', finalRanking);
    
    // Clean up active room after 30 seconds
    setTimeout(() => {
      activeRooms.delete(roomId);
      console.log('Cleaned up active room:', roomId);
    }, 30000);

  } catch (error) {
    console.error('Error ending game for room:', roomId, error);
  }
}

// Generate random round with all 3 requirements
function generateRound() {
  const theme = themes[Math.floor(Math.random() * themes.length)];
  const awalanLetter = letters[Math.floor(Math.random() * letters.length)];
  const akhiranLetter = letters[Math.floor(Math.random() * letters.length)];
  const targetNumber = Math.floor(Math.random() * 8) + 3; // 3-10 letters

  // Generate random points that total 100
  const points = generateRandomPoints();

  const requirements = [
    {
      type: 'awalan',
      description: 'Dimulai huruf',
      value: awalanLetter,
      points: points[0]
    },
    {
      type: 'akhiran', 
      description: 'Diakhiri huruf',
      value: akhiranLetter,
      points: points[1]
    },
    {
      type: 'jumlah',
      description: 'Jumlah huruf',
      value: targetNumber,
      points: points[2]
    }
  ];

  // Sort requirements by points (highest first)
  requirements.sort((a, b) => b.points - a.points);

  const round = {
    id: Date.now(),
    theme,
    requirements,
    startTime: Date.now(),
    duration: 60000, // 60 seconds
    answers: new Map()
  };

  console.log(`🎮 Generated round:`, {
    theme: round.theme,
    requirements: round.requirements.map(r => `${r.type}:${r.value} (${r.points}pts)`)
  });

  return round;
}

// Validate answer using database service - optimized for 300+ users
async function validateAnswer(answer, round) {
  const theme = round.theme;
  const requirements = round.requirements;
  
  console.log(`🔍 Validating "${answer}" for theme: ${theme}`);
  console.log(`📋 Requirements:`, requirements.map(r => `${r.type}:${r.value} (${r.points}pts)`));
  
  try {
    // Use database service with Redis caching for fast validation
    const isValid = await database.validateAnswer(answer, requirements, theme);
    console.log(`📊 Database validation result for "${answer}": ${isValid}`);
    
    if (!isValid) {
      console.log(`❌ "${answer}" rejected by database validation`);
      return { isValid: false, points: 0, metRequirements: [] };
    }
    
    // Calculate points based on which requirements are met
    const metRequirements = [];
    let totalPoints = 0;
    
    for (const req of requirements) {
      let requirementMet = false;
      
      switch (req.type) {
        case 'awalan':
          requirementMet = answer.toLowerCase().startsWith(req.value.toLowerCase());
          break;
        case 'akhiran':
          requirementMet = answer.toLowerCase().endsWith(req.value.toLowerCase());
          break;
        case 'jumlah':
          requirementMet = answer.length === req.value;
          break;
      }
      
      if (requirementMet) {
        metRequirements.push(req.type);
        // Ensure req.points is a valid number to avoid NaN
        const points = typeof req.points === 'number' && !isNaN(req.points) ? req.points : 0;
        totalPoints += points;
      }
    }
    
    return {
      isValid: true,
      points: isNaN(totalPoints) ? 0 : totalPoints,
      metRequirements
    };
  } catch (error) {
    console.error('Error validating answer:', error);
    return { isValid: false, points: 0, metRequirements: [] };
  }
}

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Create new room
  socket.on('create-room', async (data) => {
    const { playerData } = data;
    const roomId = generateRoomId();
    console.log('Creating room:', roomId, 'for player:', playerData.username);
    
    try {
      // Create room in database with owner information
      const ownerData = {
        socketId: socket.id,
        username: playerData.username
      };
      
      const room = await database.createRoom(roomId, ownerData);
      
      // Join the room
      const success = await joinRoom(socket.id, roomId, playerData);
      
      if (success) {
        socket.join(roomId);
        socket.emit('room-created', { 
          roomId,
          inviteCode: room.inviteCode,
          isOwner: true,
          gameSettings: room.gameSettings
        });
        
        const activeRoom = activeRooms.get(roomId);
        if (activeRoom) {
          io.to(roomId).emit('players-update', Array.from(activeRoom.players.values()));
          io.to(roomId).emit('room-info-update', {
            ownerId: room.ownerId,
            ownerUsername: room.ownerUsername,
            inviteCode: room.inviteCode,
            gameSettings: room.gameSettings
          });
        }
        
        console.log('Room created and joined:', roomId, 'Invite code:', room.inviteCode);
      } else {
        socket.emit('room-error', { message: 'Failed to create room' });
      }
    } catch (error) {
      console.error('Error creating room:', error);
      socket.emit('room-error', { message: 'Failed to create room' });
    }
  });

  // Join existing room
  socket.on('join-room', async (data) => {
    const { roomId, playerData } = data;
    console.log('Player', playerData.username, 'trying to join room:', roomId);
    const success = await joinRoom(socket.id, roomId, playerData);
    
    if (success) {
      socket.join(roomId);
      const activeRoom = activeRooms.get(roomId);
      const dbRoom = await database.getRoom(roomId);
      
      console.log('Player joined room:', roomId, 'Total players:', activeRoom.players.size);
      
      // Send room-joined with ownership info
      socket.emit('room-joined', { 
        roomId,
        isOwner: dbRoom.ownerId === socket.id,
        inviteCode: dbRoom.inviteCode,
        gameSettings: dbRoom.gameSettings
      });
      
      // Broadcast updates to all players
      io.to(roomId).emit('players-update', Array.from(activeRoom.players.values()));
      io.to(roomId).emit('room-info-update', {
        ownerId: dbRoom.ownerId,
        ownerUsername: dbRoom.ownerUsername,
        inviteCode: dbRoom.inviteCode,
        gameSettings: dbRoom.gameSettings
      });
      
      // Then send current round info if exists (this will trigger state change to playing)
      if (dbRoom && dbRoom.currentRound) {
        console.log('Sending existing round to new player');
        socket.emit('round-start', {
          theme: dbRoom.currentRound.theme,
          requirements: dbRoom.currentRound.requirements,
          timeLeft: Math.max(0, dbRoom.currentRound.duration - (Date.now() - dbRoom.currentRound.startTime))
        });
      }
    } else {
      console.log('Failed to join room:', roomId);
      socket.emit('room-error', { message: 'Room not found' });
    }
  });

  // Join room by invite code
  socket.on('join-by-invite', async (data) => {
    const { inviteCode, playerData } = data;
    console.log('Player', playerData.username, 'trying to join by invite code:', inviteCode);
    
    try {
      const room = await database.getRoomByInviteCode(inviteCode);
      if (!room) {
        socket.emit('room-error', { message: 'Invalid invite code' });
        return;
      }

      // Check if room is full
      if (room.players.length >= room.gameSettings.maxPlayers) {
        socket.emit('room-error', { message: 'Room is full' });
        return;
      }

      const success = await joinRoom(socket.id, room._id, playerData);
      
      if (success) {
        socket.join(room._id);
        const activeRoom = activeRooms.get(room._id);
        
        console.log('Player joined room by invite:', room._id, 'Total players:', activeRoom.players.size);
        
        // Send room-joined with ownership info
        socket.emit('room-joined', { 
          roomId: room._id,
          isOwner: room.ownerId === socket.id,
          inviteCode: room.inviteCode,
          gameSettings: room.gameSettings
        });
        
        // If game is active, send current round info to the joining player
        if (room.isActive && room.currentRound) {
          socket.emit('round-start', {
            theme: room.currentRound.theme,
            requirements: room.currentRound.requirements,
            timeLeft: Math.max(0, room.currentRound.endTime - Date.now()),
            currentRound: room.currentRoundNumber || 1,
            totalRounds: room.gameSettings.totalRounds || 10
          });
          console.log('Sent current round info to joining player:', room.currentRoundNumber || 1, '/', room.gameSettings.totalRounds || 10);
        }
        
        // Broadcast updates to all players
        io.to(room._id).emit('players-update', Array.from(activeRoom.players.values()));
        io.to(room._id).emit('room-info-update', {
          ownerId: room.ownerId,
          ownerUsername: room.ownerUsername,
          inviteCode: room.inviteCode,
          gameSettings: room.gameSettings
        });
      } else {
        socket.emit('room-error', { message: 'Failed to join room' });
      }
    } catch (error) {
      console.error('Error joining by invite code:', error);
      socket.emit('room-error', { message: 'Server error' });
    }
  });

  // Owner starts game manually
  socket.on('start-game', async (data) => {
    const { roomId } = data;
    const player = players.get(socket.id);
    
    if (!player || player.roomId !== roomId) {
      socket.emit('room-error', { message: 'Not in room' });
      return;
    }

    try {
      const dbRoom = await database.getRoom(roomId);
      if (!dbRoom) {
        socket.emit('room-error', { message: 'Room not found' });
        return;
      }

      // Check if player is owner
      if (dbRoom.ownerId !== socket.id) {
        socket.emit('room-error', { message: 'Only room owner can start the game' });
        return;
      }

      // Check minimum players
      const activeRoom = activeRooms.get(roomId);
      if (!activeRoom || activeRoom.players.size < dbRoom.gameSettings.minPlayers) {
        socket.emit('room-error', { 
          message: `Need at least ${dbRoom.gameSettings.minPlayers} players to start` 
        });
        return;
      }

      console.log('Owner manually starting game for room:', roomId);
      
      // Initialize game state - ensure round number starts at 1
      await database.updateRoom(roomId, {
        currentRoundNumber: 1,
        gameStatus: 'playing'
      });
      
      await startNewRound(roomId);
      
    } catch (error) {
      console.error('Error starting game:', error);
      socket.emit('room-error', { message: 'Failed to start game' });
    }
  });

  // Update game settings (owner only)
  socket.on('update-settings', async (data) => {
    const { roomId, settings } = data;
    const player = players.get(socket.id);
    
    if (!player || player.roomId !== roomId) {
      socket.emit('room-error', { message: 'Not in room' });
      return;
    }

    try {
      const dbRoom = await database.getRoom(roomId);
      if (!dbRoom) {
        socket.emit('room-error', { message: 'Room not found' });
        return;
      }

      // Check if player is owner
      if (dbRoom.ownerId !== socket.id) {
        socket.emit('room-error', { message: 'Only room owner can change settings' });
        return;
      }

      const updatedRoom = await database.updateGameSettings(roomId, settings);
      
      // Broadcast updated settings to all players
      io.to(roomId).emit('room-info-update', {
        ownerId: updatedRoom.ownerId,
        ownerUsername: updatedRoom.ownerUsername,
        inviteCode: updatedRoom.inviteCode,
        gameSettings: updatedRoom.gameSettings
      });
      
      console.log('Game settings updated for room:', roomId);
      
    } catch (error) {
      console.error('Error updating settings:', error);
      socket.emit('room-error', { message: 'Failed to update settings' });
    }
  });

  // Legacy join-game for backward compatibility
  socket.on('join-game', async (playerData) => {
    try {
      const defaultRoomId = 'DEFAULT';
      
      // Create or get default room using database
      let defaultRoom = await database.getRoom(defaultRoomId);
      if (!defaultRoom) {
        defaultRoom = await database.createRoom(defaultRoomId);
      }
      
      // Join the default room
      const success = await joinRoom(socket.id, defaultRoomId, playerData);
      
      if (success) {
        socket.join(defaultRoomId);
        const activeRoom = activeRooms.get(defaultRoomId);

        // Send current round info if exists
        if (defaultRoom.currentRound) {
          socket.emit('round-start', {
            theme: defaultRoom.currentRound.theme,
            requirements: defaultRoom.currentRound.requirements,
            timeLeft: Math.max(0, defaultRoom.currentRound.duration - (Date.now() - defaultRoom.currentRound.startTime)),
            currentRound: defaultRoom.currentRoundNumber || 1,
            totalRounds: defaultRoom.gameSettings.totalRounds || 10
          });
          console.log('Sent current round info to joining player (legacy):', defaultRoom.currentRoundNumber || 1, '/', defaultRoom.gameSettings.totalRounds || 10);
        }

        // Send updated player list
        if (activeRoom) {
          io.to(defaultRoomId).emit('players-update', Array.from(activeRoom.players.values()));
        }
        
        // Start the default room
        await checkAndStartRoom(defaultRoomId);
      } else {
        socket.emit('room-error', { message: 'Failed to join default room' });
      }
    } catch (error) {
      console.error('Error in legacy join-game:', error);
      socket.emit('room-error', { message: 'Server error' });
    }
  });

  // Player submits answer
  socket.on('submit-answer', async (answerData) => {
    const player = players.get(socket.id);
    if (!player) return;

    const dbRoom = await database.getRoom(player.roomId);
    if (!dbRoom || !dbRoom.currentRound) return;

    const { answer } = answerData;

    // Check if player has already submitted 3 answers
    if (player.roundAnswers >= 3) {
      socket.emit('answer-rejected', { reason: 'Maksimal 3 jawaban per round' });
      return;
    }

    // Check if answer is duplicate in this room
    const existingAnswers = dbRoom.currentRound.answers || [];
    const isDuplicate = existingAnswers.some(a => 
      a && a.answer && a.answer.toLowerCase() === answer.toLowerCase() && a.isValid
    );

    if (isDuplicate) {
      socket.emit('answer-rejected', { reason: 'Jawaban sudah ada' });
      return;
    }

    // Validate answer using database service
    console.log(`🎯 Validating "${answer}" against round:`, {
      theme: dbRoom.currentRound.theme,
      roundId: dbRoom.currentRound.id,
      requirements: dbRoom.currentRound.requirements?.map(r => `${r.type}:${r.value}`)
    });
    const validationResult = await validateAnswer(answer, dbRoom.currentRound);
    const { isValid, points, metRequirements } = validationResult;

    // Store answer
    const answerRecord = {
      playerId: socket.id,
      username: player.username,
      answer,
      isValid,
      points,
      metRequirements,
      timestamp: new Date()
    };

    // Update database
    if (!dbRoom.currentRound.answers) {
      dbRoom.currentRound.answers = [];
    }
    dbRoom.currentRound.answers.push(answerRecord);
    
    // Update player score in database
    const playerIndex = dbRoom.players.findIndex(p => p.socketId === socket.id);
    if (playerIndex !== -1) {
      dbRoom.players[playerIndex].roundAnswers++;
      if (isValid) {
        dbRoom.players[playerIndex].score += points;
      }
    }
    
    await database.updateRoom(player.roomId, {
      currentRound: dbRoom.currentRound,
      players: dbRoom.players
    });

    // Update in-memory cache
    player.roundAnswers++;
    if (isValid) {
      player.score += points;
    }

    const activeRoom = activeRooms.get(player.roomId);
    if (activeRoom) {
      activeRoom.players.set(socket.id, player);
    }

    // Broadcast answer to all players in the room
    io.to(player.roomId).emit('new-answer', answerRecord);

    // Update player scores in the room
    if (activeRoom) {
      io.to(player.roomId).emit('players-update', Array.from(activeRoom.players.values()));
    }
  });

  // Player disconnects
  socket.on('disconnect', async () => {
    console.log('User disconnected:', socket.id);
    const player = players.get(socket.id);
    
    if (player && player.roomId) {
      const activeRoom = activeRooms.get(player.roomId);
      const dbRoom = await database.getRoom(player.roomId);
      
      if (activeRoom && dbRoom) {
        // Remove player from active room
        activeRoom.players.delete(socket.id);
        
        // Check if disconnected player was the owner
        if (dbRoom.ownerId === socket.id && activeRoom.players.size > 0) {
          // Transfer ownership to the next earliest joined player
          const nextOwner = Array.from(activeRoom.players.values())[0];
          
          try {
            await database.transferRoomOwnership(
              player.roomId, 
              nextOwner.socketId, 
              nextOwner.username
            );
            
            console.log(`Ownership transferred from ${player.username} to ${nextOwner.username} in room ${player.roomId}`);
            
            // Notify all players about ownership change
            io.to(player.roomId).emit('ownership-transferred', {
              newOwnerId: nextOwner.socketId,
              newOwnerUsername: nextOwner.username,
              message: `${nextOwner.username} is now the room owner`
            });
            
            // Update room info
            const updatedRoom = await database.getRoom(player.roomId);
            io.to(player.roomId).emit('room-info-update', {
              ownerId: updatedRoom.ownerId,
              ownerUsername: updatedRoom.ownerUsername,
              inviteCode: updatedRoom.inviteCode,
              gameSettings: updatedRoom.gameSettings
            });
            
          } catch (error) {
            console.error('Error transferring ownership:', error);
          }
        }
        
        // Update remaining players in the room
        io.to(player.roomId).emit('players-update', Array.from(activeRoom.players.values()));
        
        // If room is empty, clean it up (except DEFAULT room)
        if (activeRoom.players.size === 0 && player.roomId !== 'DEFAULT') {
          if (activeRoom.roundTimer) {
            clearTimeout(activeRoom.roundTimer);
          }
          activeRooms.delete(player.roomId);
          
          // Delete room from database
          try {
            await database.deleteRoom(player.roomId);
            console.log('Empty room deleted:', player.roomId);
          } catch (error) {
            console.error('Error deleting empty room:', error);
          }
        }
      }
    }
    
    players.delete(socket.id);
  });
});

// Start new round for a specific room - database integrated
async function startNewRound(roomId) {
  try {
    // Get fresh room data to ensure we have the latest round number
    const dbRoom = await database.getRoom(roomId);
    const activeRoom = activeRooms.get(roomId);
    
    if (!dbRoom || !activeRoom) {
      console.log('Cannot start round - room not found:', roomId);
      return;
    }

    console.log('Starting new round for room:', roomId);
    const newRound = generateRound();
    
    // Apply room-specific settings to the round
    const roundDuration = (dbRoom.gameSettings?.roundDuration || 60) * 1000; // Convert to milliseconds
    newRound.duration = roundDuration;
    
    // Reset player round answers in database
    const updatedPlayers = dbRoom.players.map(player => ({
      ...player,
      roundAnswers: 0
    }));
    
    // Get current round number - this should be the round we're about to start
    const currentRoundNumber = dbRoom.currentRoundNumber || 1;
    const totalRounds = dbRoom.gameSettings?.totalRounds || 10;
    
    console.log(`Starting round ${currentRoundNumber}/${totalRounds} for room:`, roomId);
    
    // Update database with new round and round progression
    await database.updateRoom(roomId, {
      currentRound: newRound,
      players: updatedPlayers,
      currentRoundNumber: currentRoundNumber,
      gameStatus: 'playing',
      isActive: true
    });
    
    // Reset player round answers in memory
    activeRoom.players.forEach(player => {
      player.roundAnswers = 0;
    });

    console.log('Broadcasting round start to room:', roomId, 'Theme:', newRound.theme);
    
    // Broadcast round start to room with round information
    io.to(roomId).emit('round-start', {
      theme: newRound.theme,
      requirements: newRound.requirements,
      timeLeft: newRound.duration,
      currentRound: currentRoundNumber,
      totalRounds: totalRounds
    });

    // Clear existing timer
    if (activeRoom.roundTimer) {
      clearTimeout(activeRoom.roundTimer);
    }

    // End round after duration
    activeRoom.roundTimer = setTimeout(async () => {
      try {
        const currentDbRoom = await database.getRoom(roomId);
        if (currentDbRoom && currentDbRoom.currentRound) {
          console.log('Round ended for room:', roomId);
          
          io.to(roomId).emit('round-end', {
            answers: currentDbRoom.currentRound.answers || [],
            scores: Array.from(activeRoom.players.values())
          });
          
          // Check if game should end or continue to next round
          setTimeout(async () => {
            const checkRoom = await database.getRoom(roomId);
            if (checkRoom && checkRoom.players.length > 0) {
              const currentRound = checkRoom.currentRoundNumber || 1;
              const totalRounds = checkRoom.gameSettings?.totalRounds || 10;
              
              if (currentRound >= totalRounds) {
                // Game finished - calculate final ranking
                console.log('Game finished for room:', roomId);
                await endGame(roomId);
              } else {
                // Continue to next round - increment round number first
                const nextRoundNumber = currentRound + 1;
                console.log('Starting next round for room:', roomId, `(${nextRoundNumber}/${totalRounds})`);
                await database.updateRoom(roomId, { 
                  currentRoundNumber: nextRoundNumber 
                });
                
                // Small delay to ensure database update is complete
                await new Promise(resolve => setTimeout(resolve, 100));
                
                await startNewRound(roomId);
              }
            } else {
              console.log('Room empty, not starting next round:', roomId);
              // Mark room as inactive
              await database.updateRoom(roomId, { isActive: false });
            }
          }, 5000);
        }
      } catch (error) {
        console.error('Error ending round for room:', roomId, error);
      }
    }, newRound.duration);
    
  } catch (error) {
    console.error('Error starting new round for room:', roomId, error);
  }
}

// Start round when minimum players join a room - database integrated
async function checkAndStartRoom(roomId) {
  try {
    const dbRoom = await database.getRoom(roomId);
    const activeRoom = activeRooms.get(roomId);
    
    if (!dbRoom || !activeRoom) {
      console.log('Room not found for starting:', roomId);
      return;
    }

    console.log('Checking room start:', roomId, 'Players:', activeRoom.players.size, 'Active:', dbRoom.isActive);
    
    // Start game if room has at least 1 player and isn't already active
    if (activeRoom.players.size >= 1 && !dbRoom.isActive) {
      console.log('Starting room:', roomId, 'in 3 seconds');
      
      // Mark room as active in database
      await database.updateRoom(roomId, { isActive: true });
      activeRoom.isActive = true;
      
      // Start first round after 3 seconds
      setTimeout(async () => {
        console.log('Actually starting round for room:', roomId);
        await startNewRound(roomId);
      }, 3000);
    } else {
      console.log('Room not ready to start:', roomId, 'Players:', activeRoom.players.size, 'Active:', dbRoom.isActive);
    }
  } catch (error) {
    console.error('Error checking room start:', roomId, error);
  }
}

// Initialize server with database connections
const PORT = process.env.PORT || 5000;
const MONITOR_PORT = process.env.MONITOR_PORT || 3001;

async function startServer() {
  try {
    // Initialize database connections first
    await initializeServer();
    
    // Start production monitor
    const monitor = new ProductionMonitor();
    monitor.start(MONITOR_PORT);
    
    // Start HTTP server
    server.listen(PORT, () => {
      console.log(`🚀 WordRush Server running on port ${PORT}`);
      console.log(`📊 Production Monitor: http://localhost:${MONITOR_PORT}/dashboard`);
      console.log(`📊 Database: MongoDB + Redis integrated`);
      console.log(`🎮 Ready for 300+ concurrent users!`);
    });
    
    // Graceful shutdown
    process.on('SIGTERM', async () => {
      console.log('Shutting down server...');
      await database.disconnect();
      process.exit(0);
    });
    
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();
