const mongoose = require('mongoose');
const redis = require('redis');
const Word = require('../models/Word');
const Room = require('../models/Room');

class DatabaseService {
  constructor() {
    this.redisClient = null;
    this.isConnected = false;
  }

  async connect() {
    try {
      // Connect to MongoDB
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/wordrush', {
        maxPoolSize: 50
      });
      console.log('Connected to MongoDB');

      // Connect to Redis
      this.redisClient = redis.createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379'
      });
      
      await this.redisClient.connect();
      console.log('Connected to Redis');
      
      this.isConnected = true;
      
      // Clean up any problematic indexes
      await this.cleanupCollections();
      
      // Initialize word data
      await this.initializeWordData();
      
    } catch (error) {
      console.error('Database connection error:', error);
      throw error;
    }
  }

  async cleanupCollections() {
    try {
      // Drop rooms collection to remove conflicting indexes
      await mongoose.connection.db.collection('rooms').drop().catch(() => {
        console.log('Rooms collection does not exist, skipping drop');
      });
      
      console.log('Cleaned up MongoDB collections and indexes');
    } catch (error) {
      console.error('Error cleaning up collections:', error);
      // Don't throw error, just log it
    }
  }

  async initializeWordData() {
    try {
      const wordCount = await Word.countDocuments();
      if (wordCount === 0) {
        console.log('Initializing word database...');
        
        const wordData = {
          'Hewan': [
            // A-Z coverage for animals
            'Ayam', 'Angsa', 'Anjing', 'Bebek', 'Beruang', 'Burung', 'Cicak', 'Cumi', 'Domba', 'Dolfin', 
            'Elang', 'Flamingo', 'Gajah', 'Gorila', 'Harimau', 'Hamster', 'Ikan', 'Iguana', 'Jerapah', 'Jaguar',
            'Kucing', 'Kuda', 'Kambing', 'Lumba', 'Landak', 'Monyet', 'Macan', 'Naga', 'Nyamuk', 'Orang', 'Otter',
            'Panda', 'Pinguin', 'Quail', 'Rusa', 'Sapi', 'Semut', 'Tikus', 'Tupai', 'Ular', 'Udang', 'Viper',
            'Walrus', 'Xenops', 'Yak', 'Zebra'
          ],
          'Buah': [
            // A-Z coverage for fruits
            'Apel', 'Anggur', 'Alpukat', 'Belimbing', 'Buah Naga', 'Ceri', 'Cranberry', 'Durian', 'Delima',
            'Elderberry', 'Fig', 'Grape', 'Gooseberry', 'Honeydew', 'Jambu', 'Jeruk', 'Kiwi', 'Kelapa', 'Kurma',
            'Lemon', 'Leci', 'Mangga', 'Melon', 'Nanas', 'Nangka', 'Orange', 'Pepaya', 'Pisang', 'Pir',
            'Quince', 'Rambutan', 'Strawberry', 'Salak', 'Tomat', 'Ubi', 'Vanilla', 'Watermelon', 'Ximenia',
            'Yuzu', 'Zaitun'
          ],
          'Negara': [
            // A-Z coverage for countries
            'Amerika', 'Australia', 'Argentina', 'Brasil', 'Belanda', 'Belgia', 'China', 'Chili', 'Denmark', 'Dominika',
            'Estonia', 'Ekuador', 'Finlandia', 'Filipina', 'Georgia', 'Ghana', 'Honduras', 'Haiti', 'India', 'Indonesia',
            'Jepang', 'Jerman', 'Korea', 'Kenya', 'Laos', 'Libya', 'Malaysia', 'Mesir', 'Nepal', 'Nigeria',
            'Oman', 'Panama', 'Peru', 'Qatar', 'Rusia', 'Rwanda', 'Spanyol', 'Swiss', 'Thailand', 'Turki',
            'Uruguay', 'Uganda', 'Vietnam', 'Venezuela', 'Wales', 'Yaman', 'Zambia', 'Zimbabwe'
          ]
        };

        const wordsToInsert = [];
        
        for (const [theme, words] of Object.entries(wordData)) {
          for (const word of words) {
            const normalized = word.toLowerCase();
            wordsToInsert.push({
              word,
              theme,
              normalized,
              length: normalized.length,
              firstLetter: normalized[0],
              lastLetter: normalized[normalized.length - 1]
            });
          }
        }

        await Word.insertMany(wordsToInsert);
        console.log(`Inserted ${wordsToInsert.length} words into database`);
      }
    } catch (error) {
      console.error('Error initializing word data:', error);
    }
  }

  async validateAnswer(answer, requirements, theme) {
    const normalized = answer.toLowerCase().trim();
    console.log(`🔍 DB: Validating "${answer}" -> "${normalized}" for theme: ${theme}`);
    
    try {
      // Multi-level caching strategy for high performance
      
      // Level 1: Check exact word cache
      const wordCacheKey = `word:${theme}:${normalized}`;
      const cachedWord = await this.redisClient.get(wordCacheKey);
      
      if (cachedWord !== null) {
        const wordData = JSON.parse(cachedWord);
        if (wordData.exists) {
          return this.checkRequirements(wordData, requirements);
        }
        return false;
      }

      // Level 2: Check requirement-specific cache
      const reqCacheKey = `validation:${theme}:${normalized}:${this.getRequirementsHash(requirements)}`;
      const cachedValidation = await this.redisClient.get(reqCacheKey);
      
      if (cachedValidation !== null) {
        return JSON.parse(cachedValidation);
      }

      // Level 3: Database query with optimized indexes
      const word = await Word.findOne({
        theme: theme,
        normalized: normalized
      }).lean(); // Use lean() for better performance

      let wordData;
      if (word) {
        wordData = {
          exists: true,
          length: word.length,
          firstLetter: word.firstLetter,
          lastLetter: word.lastLetter
        };
        
        // Cache word data for 2 hours (longer TTL for word existence)
        await this.redisClient.setEx(wordCacheKey, 7200, JSON.stringify(wordData));
        
        // Validate against requirements and cache result
        const validationResult = this.checkRequirements(wordData, requirements);
        
        // Cache validation result for 1 hour (shorter TTL for specific requirements)
        await this.redisClient.setEx(reqCacheKey, 3600, JSON.stringify(validationResult));
        
        return validationResult;
      }
      
      // Cache negative result for 30 minutes
      await this.redisClient.setEx(reqCacheKey, 1800, JSON.stringify(false));
      return false;
      
    } catch (error) {
      console.error('Error validating answer:', error);
      return false;
    }
  }

  checkRequirements(wordData, requirements) {
    // wordData now contains: { exists, length, firstLetter, lastLetter }
    if (!wordData.exists) return false;
    
    for (const req of requirements) {
      switch (req.type) {
        case 'awalan':
          if (wordData.firstLetter === req.value.toLowerCase()) {
            return true;
          }
          break;
        case 'akhiran':
          if (wordData.lastLetter === req.value.toLowerCase()) {
            return true;
          }
          break;
        case 'jumlah':
          if (wordData.length === req.value) {
            return true;
          }
          break;
      }
    }
    return false;
  }

  // Helper method to create consistent cache keys for requirements
  getRequirementsHash(requirements) {
    const sorted = requirements
      .map(req => `${req.type}:${req.value}`)
      .sort()
      .join('|');
    return Buffer.from(sorted).toString('base64').slice(0, 16);
  }

  // Performance monitoring methods
  recordCacheHit(type, duration) {
    console.log(`[CACHE HIT] ${type} - ${duration}ms`);
    // Could integrate with monitoring service like DataDog, New Relic, etc.
  }

  recordCacheMiss(type, duration) {
    console.log(`[CACHE MISS] ${type} - ${duration}ms`);
    // Could integrate with monitoring service
  }

  recordCacheError(type, duration) {
    console.error(`[CACHE ERROR] ${type} - ${duration}ms`);
    // Could integrate with error tracking service
  }

  async createRoom(roomId, ownerData) {
    try {
      // Check if room already exists
      const existingRoom = await Room.findById(roomId);
      if (existingRoom) {
        return existingRoom;
      }

      // Generate unique invite code
      const inviteCode = this.generateInviteCode();

      const room = new Room({
        _id: roomId,
        players: [],
        currentRound: null,
        isActive: false,
        ownerId: ownerData.socketId,
        ownerUsername: ownerData.username,
        inviteCode: inviteCode,
        gameSettings: {
          roundDuration: 60,
          maxAnswersPerRound: 3,
          themes: ['Hewan', 'Buah', 'Negara'],
          minPlayers: 2,
          maxPlayers: 10,
          autoStart: false
        }
      });
      
      await room.save();
      
      // Cache room state
      await this.cacheRoomState(roomId, room);
      
      return room;
    } catch (error) {
      console.error('Error creating room:', error);
      throw error;
    }
  }

  // Generate unique 6-character invite code
  generateInviteCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  // Find room by invite code
  async getRoomByInviteCode(inviteCode) {
    try {
      const room = await Room.findOne({ inviteCode: inviteCode }).lean();
      return room;
    } catch (error) {
      console.error('Error finding room by invite code:', error);
      return null;
    }
  }

  // Transfer room ownership
  async transferRoomOwnership(roomId, newOwnerId, newOwnerUsername) {
    try {
      const room = await Room.findByIdAndUpdate(
        roomId,
        {
          ownerId: newOwnerId,
          ownerUsername: newOwnerUsername,
          lastActivity: new Date()
        },
        { new: true }
      );

      if (room) {
        // Update cache
        await this.cacheRoomState(roomId, room);
      }

      return room;
    } catch (error) {
      console.error('Error transferring room ownership:', error);
      throw error;
    }
  }

  // Update game settings (owner only)
  async updateGameSettings(roomId, newSettings) {
    try {
      const room = await Room.findByIdAndUpdate(
        roomId,
        {
          gameSettings: newSettings,
          lastActivity: new Date()
        },
        { new: true }
      );

      if (room) {
        // Update cache
        await this.cacheRoomState(roomId, room);
      }

      return room;
    } catch (error) {
      console.error('Error updating game settings:', error);
      throw error;
    }
  }

  async getRoom(roomId) {
    const startTime = Date.now();
    
    try {
      // Multi-tier caching strategy for rooms
      const cacheKey = `room:${roomId}`;
      const hotCacheKey = `room:hot:${roomId}`;
      
      // Level 1: Hot cache (very active rooms, 1 minute TTL)
      let cached = await this.redisClient.get(hotCacheKey);
      if (cached) {
        this.recordCacheHit('room_hot', Date.now() - startTime);
        return JSON.parse(cached);
      }
      
      // Level 2: Regular cache (5 minute TTL)
      cached = await this.redisClient.get(cacheKey);
      if (cached) {
        const roomData = JSON.parse(cached);
        
        // Promote to hot cache if room is active
        if (roomData.isActive) {
          await this.redisClient.setEx(hotCacheKey, 60, cached);
        }
        
        this.recordCacheHit('room_regular', Date.now() - startTime);
        return roomData;
      }

      // Level 3: Database query with optimized projection
      const room = await Room.findById(roomId)
        .lean() // Better performance
        .select('-__v'); // Exclude version field
      
      if (room) {
        const roomJson = JSON.stringify(room);
        
        // Cache strategy based on room activity
        if (room.isActive) {
          // Active rooms: hot cache (1 min) + regular cache (5 min)
          await Promise.all([
            this.redisClient.setEx(hotCacheKey, 60, roomJson),
            this.redisClient.setEx(cacheKey, 300, roomJson)
          ]);
        } else {
          // Inactive rooms: only regular cache (10 min)
          await this.redisClient.setEx(cacheKey, 600, roomJson);
        }
        
        this.recordCacheMiss('room', Date.now() - startTime);
      }
      
      return room;
    } catch (error) {
      console.error('Error getting room:', error);
      this.recordCacheError('room', Date.now() - startTime);
      return null;
    }
  }

  async updateRoom(roomId, updateData) {
    try {
      const room = await Room.findByIdAndUpdate(
        roomId, 
        { ...updateData, lastActivity: new Date() },
        { new: true }
      );
      
      if (room) {
        await this.cacheRoomState(roomId, room);
      }
      
      return room;
    } catch (error) {
      console.error('Error updating room:', error);
      throw error;
    }
  }

  async cacheRoomState(roomId, roomData) {
    try {
      const cacheKey = `room:${roomId}`;
      const hotCacheKey = `room:hot:${roomId}`;
      const roomJson = JSON.stringify(roomData);
      
      // Update both cache levels to ensure consistency
      await Promise.all([
        this.redisClient.setEx(cacheKey, 300, roomJson),      // Regular cache: 5 minutes
        this.redisClient.setEx(hotCacheKey, 60, roomJson)     // Hot cache: 1 minute
      ]);
    } catch (error) {
      console.error('Error caching room state:', error);
    }
  }

  async deleteRoom(roomId) {
    try {
      await Room.findByIdAndDelete(roomId);
      await this.redisClient.del(`room:${roomId}`);
    } catch (error) {
      console.error('Error deleting room:', error);
    }
  }

  async cleanupInactiveRooms() {
    try {
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
      
      const inactiveRooms = await Room.find({
        $or: [
          { isActive: false, lastActivity: { $lt: thirtyMinutesAgo } },
          { 'players.0': { $exists: false } } // Empty rooms
        ]
      });

      for (const room of inactiveRooms) {
        await this.deleteRoom(room._id);
      }

      if (inactiveRooms.length > 0) {
        console.log(`Cleaned up ${inactiveRooms.length} inactive rooms`);
      }
    } catch (error) {
      console.error('Error cleaning up rooms:', error);
    }
  }

  async disconnect() {
    try {
      if (this.redisClient) {
        await this.redisClient.disconnect();
      }
      await mongoose.disconnect();
      console.log('Disconnected from databases');
    } catch (error) {
      console.error('Error disconnecting from databases:', error);
    }
  }
}

module.exports = new DatabaseService();
