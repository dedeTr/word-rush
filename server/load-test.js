const io = require('socket.io-client');
const { performance } = require('perf_hooks');

class LoadTester {
  constructor(options = {}) {
    this.serverUrl = options.serverUrl || 'http://localhost:5000';
    this.maxUsers = options.maxUsers || 300;
    this.rampUpTime = options.rampUpTime || 30000; // 30 seconds
    this.testDuration = options.testDuration || 120000; // 2 minutes
    
    this.clients = [];
    this.metrics = {
      connections: 0,
      connectionErrors: 0,
      roomJoins: 0,
      roomJoinErrors: 0,
      answersSubmitted: 0,
      answerErrors: 0,
      roundsReceived: 0,
      avgResponseTime: 0,
      responseTimes: []
    };
    
    this.isRunning = false;
    this.startTime = null;
  }

  // Create a simulated user client
  createClient(userId) {
    return new Promise((resolve, reject) => {
      const client = io(this.serverUrl, {
        transports: ['websocket'],
        timeout: 5000
      });

      const userData = {
        id: userId,
        username: `TestUser${userId}`,
        roomId: `LOAD_TEST_${Math.floor(userId / 10)}`, // 10 users per room
        socket: client,
        connected: false,
        roomJoined: false,
        answersSubmitted: 0,
        lastRoundReceived: null
      };

      // Connection handlers
      client.on('connect', () => {
        userData.connected = true;
        this.metrics.connections++;
        console.log(`✅ User ${userId} connected`);
        
        // Join room after connection
        setTimeout(() => {
          this.joinRoom(userData);
        }, Math.random() * 1000); // Stagger room joins
        
        resolve(userData);
      });

      client.on('connect_error', (error) => {
        this.metrics.connectionErrors++;
        console.error(`❌ User ${userId} connection failed:`, error.message);
        reject(error);
      });

      // Game event handlers
      client.on('room-joined', () => {
        userData.roomJoined = true;
        this.metrics.roomJoins++;
        console.log(`🏠 User ${userId} joined room ${userData.roomId}`);
      });

      client.on('room-error', (error) => {
        this.metrics.roomJoinErrors++;
        console.error(`❌ User ${userId} room join failed:`, error.message);
      });

      client.on('round-start', (roundData) => {
        userData.lastRoundReceived = Date.now();
        this.metrics.roundsReceived++;
        
        // Simulate answer submission with realistic delay
        setTimeout(() => {
          this.submitRandomAnswer(userData, roundData);
        }, Math.random() * 10000 + 2000); // 2-12 seconds delay
      });

      client.on('answer-accepted', () => {
        userData.answersSubmitted++;
        this.metrics.answersSubmitted++;
      });

      client.on('answer-rejected', () => {
        this.metrics.answerErrors++;
      });

      client.on('disconnect', () => {
        userData.connected = false;
        console.log(`🔌 User ${userId} disconnected`);
      });

      this.clients.push(userData);
    });
  }

  // Join a room
  joinRoom(userData) {
    const startTime = performance.now();
    
    userData.socket.emit('create-room', {
      playerData: {
        username: userData.username,
        score: 0
      }
    });

    // Measure response time
    userData.socket.once('room-joined', () => {
      const responseTime = performance.now() - startTime;
      this.metrics.responseTimes.push(responseTime);
      this.updateAvgResponseTime();
    });
  }

  // Submit random answer
  submitRandomAnswer(userData, roundData) {
    if (!userData.roomJoined || userData.answersSubmitted >= 3) return;

    const testAnswers = {
      'Hewan': ['Singa', 'Ayam', 'Gajah', 'Kucing', 'Bebek'],
      'Buah': ['Apel', 'Mangga', 'Jeruk', 'Pisang', 'Durian'],
      'Negara': ['Indonesia', 'Malaysia', 'Singapura', 'Thailand', 'Vietnam']
    };

    const answers = testAnswers[roundData.theme] || ['TestAnswer'];
    const randomAnswer = answers[Math.floor(Math.random() * answers.length)];

    const startTime = performance.now();
    
    userData.socket.emit('submit-answer', {
      answer: randomAnswer
    });

    // Measure response time
    const responseHandler = () => {
      const responseTime = performance.now() - startTime;
      this.metrics.responseTimes.push(responseTime);
      this.updateAvgResponseTime();
    };

    userData.socket.once('answer-accepted', responseHandler);
    userData.socket.once('answer-rejected', responseHandler);
  }

  // Update average response time
  updateAvgResponseTime() {
    if (this.metrics.responseTimes.length > 0) {
      const sum = this.metrics.responseTimes.reduce((a, b) => a + b, 0);
      this.metrics.avgResponseTime = sum / this.metrics.responseTimes.length;
    }
  }

  // Ramp up users gradually
  async rampUpUsers() {
    console.log(`🚀 Starting ramp-up: ${this.maxUsers} users over ${this.rampUpTime/1000}s`);
    
    const interval = this.rampUpTime / this.maxUsers;
    
    for (let i = 1; i <= this.maxUsers; i++) {
      try {
        await this.createClient(i);
        
        // Progress indicator
        if (i % 50 === 0) {
          console.log(`📊 Progress: ${i}/${this.maxUsers} users connected`);
        }
        
        // Wait before next user
        if (i < this.maxUsers) {
          await new Promise(resolve => setTimeout(resolve, interval));
        }
      } catch (error) {
        console.error(`Failed to create user ${i}:`, error.message);
      }
    }
    
    console.log(`✅ Ramp-up complete: ${this.metrics.connections} users connected`);
  }

  // Run load test
  async runLoadTest() {
    console.log('🎯 WORDRUSH LOAD TEST STARTING');
    console.log('================================');
    console.log(`Target: ${this.maxUsers} concurrent users`);
    console.log(`Server: ${this.serverUrl}`);
    console.log(`Duration: ${this.testDuration/1000}s\n`);

    this.isRunning = true;
    this.startTime = Date.now();

    try {
      // Phase 1: Ramp up users
      await this.rampUpUsers();
      
      // Phase 2: Sustain load
      console.log(`\n⏱️  Sustaining load for ${this.testDuration/1000}s...`);
      
      // Print metrics every 10 seconds
      const metricsInterval = setInterval(() => {
        this.printRealTimeMetrics();
      }, 10000);

      // Wait for test duration
      await new Promise(resolve => setTimeout(resolve, this.testDuration));
      
      clearInterval(metricsInterval);
      
      // Phase 3: Generate final report
      this.generateFinalReport();
      
    } catch (error) {
      console.error('Load test failed:', error);
    } finally {
      await this.cleanup();
    }
  }

  // Print real-time metrics
  printRealTimeMetrics() {
    const elapsed = (Date.now() - this.startTime) / 1000;
    const activeConnections = this.clients.filter(c => c.connected).length;
    
    console.log(`\n📊 REAL-TIME METRICS (${elapsed.toFixed(0)}s elapsed)`);
    console.log(`Active Connections: ${activeConnections}/${this.maxUsers}`);
    console.log(`Rooms Joined: ${this.metrics.roomJoins}`);
    console.log(`Answers Submitted: ${this.metrics.answersSubmitted}`);
    console.log(`Rounds Received: ${this.metrics.roundsReceived}`);
    console.log(`Avg Response Time: ${this.metrics.avgResponseTime.toFixed(2)}ms`);
    console.log(`Connection Errors: ${this.metrics.connectionErrors}`);
  }

  // Generate final report
  generateFinalReport() {
    const totalTime = (Date.now() - this.startTime) / 1000;
    const activeConnections = this.clients.filter(c => c.connected).length;
    const successRate = (this.metrics.connections / this.maxUsers) * 100;
    
    console.log('\n🎯 LOAD TEST FINAL REPORT');
    console.log('==========================');
    console.log(`Test Duration: ${totalTime.toFixed(2)}s`);
    console.log(`Target Users: ${this.maxUsers}`);
    console.log(`Successful Connections: ${this.metrics.connections}`);
    console.log(`Active Connections: ${activeConnections}`);
    console.log(`Connection Success Rate: ${successRate.toFixed(2)}%`);
    console.log(`Connection Errors: ${this.metrics.connectionErrors}`);
    console.log('');
    console.log('GAME METRICS:');
    console.log(`Rooms Joined: ${this.metrics.roomJoins}`);
    console.log(`Room Join Errors: ${this.metrics.roomJoinErrors}`);
    console.log(`Rounds Received: ${this.metrics.roundsReceived}`);
    console.log(`Answers Submitted: ${this.metrics.answersSubmitted}`);
    console.log(`Answer Errors: ${this.metrics.answerErrors}`);
    console.log('');
    console.log('PERFORMANCE METRICS:');
    console.log(`Average Response Time: ${this.metrics.avgResponseTime.toFixed(2)}ms`);
    
    if (this.metrics.responseTimes.length > 0) {
      const sorted = this.metrics.responseTimes.sort((a, b) => a - b);
      const p50 = sorted[Math.floor(sorted.length * 0.5)];
      const p95 = sorted[Math.floor(sorted.length * 0.95)];
      const p99 = sorted[Math.floor(sorted.length * 0.99)];
      
      console.log(`P50 Response Time: ${p50.toFixed(2)}ms`);
      console.log(`P95 Response Time: ${p95.toFixed(2)}ms`);
      console.log(`P99 Response Time: ${p99.toFixed(2)}ms`);
    }
    
    console.log('');
    console.log('VERDICT:');
    if (successRate >= 95 && this.metrics.avgResponseTime < 100) {
      console.log('✅ LOAD TEST PASSED - System ready for 300+ users!');
    } else if (successRate >= 90) {
      console.log('⚠️  LOAD TEST PARTIAL - System needs optimization');
    } else {
      console.log('❌ LOAD TEST FAILED - System requires fixes');
    }
  }

  // Cleanup connections
  async cleanup() {
    console.log('\n🧹 Cleaning up connections...');
    
    for (const client of this.clients) {
      if (client.socket && client.connected) {
        client.socket.disconnect();
      }
    }
    
    this.clients = [];
    this.isRunning = false;
    
    console.log('✅ Cleanup complete');
  }
}

// CLI interface
async function runLoadTest() {
  const args = process.argv.slice(2);
  const options = {};
  
  // Parse command line arguments
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i].replace('--', '');
    const value = args[i + 1];
    
    switch (key) {
      case 'users':
        options.maxUsers = parseInt(value);
        break;
      case 'url':
        options.serverUrl = value;
        break;
      case 'rampup':
        options.rampUpTime = parseInt(value) * 1000;
        break;
      case 'duration':
        options.testDuration = parseInt(value) * 1000;
        break;
    }
  }
  
  const loadTester = new LoadTester(options);
  await loadTester.runLoadTest();
}

// Run if called directly
if (require.main === module) {
  runLoadTest().catch(console.error);
}

module.exports = LoadTester;
