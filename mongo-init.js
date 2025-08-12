// MongoDB initialization script
db = db.getSiblingDB('wordrush');

// Create collections
db.createCollection('players');
db.createCollection('rounds');
db.createCollection('answers');

// Create indexes for better performance
db.players.createIndex({ "username": 1 }, { unique: true });
db.rounds.createIndex({ "startTime": 1 });
db.answers.createIndex({ "roundId": 1, "playerId": 1 });
db.answers.createIndex({ "timestamp": 1 });

// Insert sample data for testing
db.players.insertMany([
  {
    username: "TestPlayer1",
    totalScore: 50,
    createdAt: new Date()
  },
  {
    username: "TestPlayer2", 
    totalScore: 30,
    createdAt: new Date()
  }
]);

print('Database initialized successfully!');
