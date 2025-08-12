import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { 
  usePerformanceMonitor, 
  useOptimizedState, 
  useSocketHandlers,
  useConnectionQuality,
  useBatchedUpdates,
  useThrottle
} from '../utils/performance';
import InfoPanel from './InfoPanel';
import Leaderboard from './Leaderboard';
import RequirementPanel from './RequirementPanel';
import ChatPanel from './ChatPanel';

// Memoized sub-components for better performance
const MemoizedInfoPanel = memo(InfoPanel);
const MemoizedLeaderboard = memo(Leaderboard);
const MemoizedRequirementPanel = memo(RequirementPanel);
const MemoizedChatPanel = memo(ChatPanel);

// Connection quality indicator component
const ConnectionIndicator = memo(({ quality, latency }) => {
  const getColor = () => {
    switch (quality) {
      case 'excellent': return '#28a745';
      case 'good': return '#17a2b8';
      case 'fair': return '#ffc107';
      case 'poor': return '#dc3545';
      default: return '#6c757d';
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: '10px',
      right: '10px',
      background: 'rgba(0,0,0,0.8)',
      color: 'white',
      padding: '5px 10px',
      borderRadius: '15px',
      fontSize: '12px',
      zIndex: 1000
    }}>
      <span style={{ color: getColor() }}>●</span> {latency}ms ({quality})
    </div>
  );
});

export default function OptimizedGameBoard({ 
  socket, 
  username, 
  isConnected, 
  roomId, 
  onBackToHome, 
  initialRound, 
  initialPlayers 
}) {
  // Performance monitoring
  const { logPerformance } = usePerformanceMonitor('OptimizedGameBoard');
  
  // Connection quality monitoring
  const { quality, latency } = useConnectionQuality(socket);
  
  // Optimized state management
  const [gameState, setGameState] = useOptimizedState({
    currentRound: null,
    players: [],
    answers: [],
    timeLeft: 0,
    userAnswer: '',
    userAnswerCount: 0,
    gameStatus: 'waiting'
  });

  // Batched updates for better performance
  const batchUpdate = useBatchedUpdates();

  // Throttled timer update to prevent excessive re-renders
  const throttledTimerUpdate = useThrottle((newTime) => {
    setGameState(prev => ({ ...prev, timeLeft: newTime }));
  }, 100); // Update every 100ms instead of every second

  // Initialize with initial data
  useEffect(() => {
    if (initialRound) {
      logPerformance('initializing with round data');
      batchUpdate(() => {
        setGameState(prev => ({
          ...prev,
          currentRound: initialRound,
          timeLeft: Math.floor(initialRound.timeLeft / 1000),
          answers: [],
          userAnswerCount: 0,
          gameStatus: 'playing'
        }));
      });
    }
  }, [initialRound, logPerformance, batchUpdate, setGameState]);

  useEffect(() => {
    if (initialPlayers && initialPlayers.length > 0) {
      logPerformance('initializing with players data');
      batchUpdate(() => {
        setGameState(prev => ({ ...prev, players: initialPlayers }));
      });
    }
  }, [initialPlayers, logPerformance, batchUpdate, setGameState]);

  // Optimized socket event handlers
  const socketHandlers = useMemo(() => ({
    'round-start': (roundData) => {
      logPerformance('round-start received');
      batchUpdate(() => {
        setGameState(prev => ({
          ...prev,
          currentRound: roundData,
          timeLeft: Math.floor(roundData.timeLeft / 1000),
          answers: [],
          userAnswerCount: 0,
          gameStatus: 'playing'
        }));
      });
    },

    'round-end': (data) => {
      logPerformance('round-end received');
      batchUpdate(() => {
        setGameState(prev => ({
          ...prev,
          gameStatus: 'ended',
          timeLeft: 0
        }));
      });
    },

    'new-answer': (answerData) => {
      batchUpdate(() => {
        setGameState(prev => ({
          ...prev,
          answers: [...prev.answers, answerData]
        }));
      });
    },

    'players-update': (playersData) => {
      batchUpdate(() => {
        setGameState(prev => ({
          ...prev,
          players: playersData
        }));
      });
    },

    'answer-accepted': () => {
      batchUpdate(() => {
        setGameState(prev => ({
          ...prev,
          userAnswerCount: prev.userAnswerCount + 1,
          userAnswer: ''
        }));
      });
    },

    'answer-rejected': (data) => {
      alert(data.reason);
      setGameState(prev => ({ ...prev, userAnswer: '' }));
    }
  }), [logPerformance, batchUpdate, setGameState]);

  // Use optimized socket handlers
  useSocketHandlers(socket, socketHandlers);

  // Optimized timer effect
  useEffect(() => {
    if (gameState.gameStatus !== 'playing' || gameState.timeLeft <= 0) return;

    const timer = setInterval(() => {
      setGameState(prev => {
        const newTime = prev.timeLeft - 1;
        throttledTimerUpdate(newTime);
        
        if (newTime <= 0) {
          return { ...prev, gameStatus: 'ended', timeLeft: 0 };
        }
        return { ...prev, timeLeft: newTime };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState.gameStatus, gameState.timeLeft, setGameState, throttledTimerUpdate]);

  // Optimized answer submission
  const handleAnswerSubmit = useCallback((e) => {
    e.preventDefault();
    
    if (!gameState.userAnswer.trim() || gameState.userAnswerCount >= 3) return;
    
    logPerformance('submitting answer');
    socket.emit('submit-answer', { answer: gameState.userAnswer.trim() });
  }, [gameState.userAnswer, gameState.userAnswerCount, socket, logPerformance]);

  // Optimized input change handler
  const handleAnswerChange = useCallback((e) => {
    setGameState(prev => ({ ...prev, userAnswer: e.target.value }));
  }, [setGameState]);

  // Memoized computed values
  const computedValues = useMemo(() => ({
    canSubmitAnswer: gameState.gameStatus === 'playing' && 
                    gameState.userAnswerCount < 3 && 
                    gameState.userAnswer.trim().length > 0,
    
    answersRemaining: 3 - gameState.userAnswerCount,
    
    sortedPlayers: [...gameState.players].sort((a, b) => b.score - a.score),
    
    timeLeftFormatted: `${Math.floor(gameState.timeLeft / 60)}:${(gameState.timeLeft % 60).toString().padStart(2, '0')}`
  }), [gameState]);

  // Loading state
  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-400 to-purple-600 flex items-center justify-center">
        <div className="text-white text-xl">Connecting to server...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-400 to-purple-600 p-4">
      {/* Connection Quality Indicator */}
      <ConnectionIndicator quality={quality} latency={latency} />
      
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="flex justify-between items-center bg-white/10 backdrop-blur-sm rounded-lg p-4">
          <div className="text-white">
            <h1 className="text-2xl font-bold">WordRush - Room: {roomId}</h1>
            <p className="text-sm opacity-80">Player: {username}</p>
          </div>
          <button
            onClick={onBackToHome}
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Leave Game
          </button>
        </div>
      </div>

      {/* Game Content */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          <MemoizedInfoPanel 
            gameStatus={gameState.gameStatus}
            timeLeft={computedValues.timeLeftFormatted}
            currentRound={gameState.currentRound}
          />
          <MemoizedLeaderboard players={computedValues.sortedPlayers} />
        </div>

        {/* Middle Column */}
        <div className="space-y-6">
          <MemoizedRequirementPanel 
            currentRound={gameState.currentRound}
            gameStatus={gameState.gameStatus}
          />
          
          {/* Answer Input - Optimized */}
          {gameState.gameStatus === 'playing' && (
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
              <h3 className="text-white text-lg font-semibold mb-4">
                Submit Answer ({computedValues.answersRemaining} remaining)
              </h3>
              <form onSubmit={handleAnswerSubmit} className="space-y-4">
                <input
                  type="text"
                  value={gameState.userAnswer}
                  onChange={handleAnswerChange}
                  placeholder="Type your answer..."
                  className="w-full px-4 py-2 rounded-lg border-2 border-gray-300 focus:border-blue-500 focus:outline-none"
                  disabled={gameState.userAnswerCount >= 3}
                  autoComplete="off"
                />
                <button
                  type="submit"
                  disabled={!computedValues.canSubmitAnswer}
                  className={`w-full py-2 px-4 rounded-lg font-semibold transition-colors ${
                    computedValues.canSubmitAnswer
                      ? 'bg-green-500 hover:bg-green-600 text-white'
                      : 'bg-gray-400 text-gray-700 cursor-not-allowed'
                  }`}
                >
                  Submit Answer
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Right Column */}
        <div>
          <MemoizedChatPanel 
            answers={gameState.answers}
            gameStatus={gameState.gameStatus}
          />
        </div>
      </div>

      {/* Performance Debug Info (Development only) */}
      {process.env.NODE_ENV === 'development' && (
        <div style={{
          position: 'fixed',
          bottom: '10px',
          left: '10px',
          background: 'rgba(0,0,0,0.8)',
          color: 'white',
          padding: '5px 10px',
          borderRadius: '5px',
          fontSize: '10px',
          zIndex: 1000
        }}>
          Players: {gameState.players.length} | Answers: {gameState.answers.length} | Status: {gameState.gameStatus}
        </div>
      )}
    </div>
  );
}
