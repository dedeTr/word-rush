import { useState, useEffect } from 'react';
import InfoPanel from './InfoPanel';
import Leaderboard from './Leaderboard';
import RequirementPanel from './RequirementPanel';
import ChatPanel from './ChatPanel';
import ChampionshipDisplay from './ChampionshipDisplay';

export default function GameBoard({ socket, username, isConnected, roomId, onBackToHome, initialRound, initialPlayers, gameStatus, finalRanking }) {
  const [currentRound, setCurrentRound] = useState(null);
  const [players, setPlayers] = useState([]);
  const [answers, setAnswers] = useState([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [userAnswerCount, setUserAnswerCount] = useState(0);
  const [validationMessage, setValidationMessage] = useState('');
  const [validationType, setValidationType] = useState(''); // 'error', 'warning', 'success'
  // gameStatus is now passed as a prop, no need for local state

  // Debug gameStatus changes
  useEffect(() => {
    console.log('GameBoard gameStatus changed to:', gameStatus);
  }, [gameStatus]);

  // Initialize with initial round data if provided
  useEffect(() => {
    if (initialRound) {
      console.log('GameBoard initializing with round:', initialRound.theme);
      setCurrentRound(initialRound);
      setTimeLeft(Math.floor(initialRound.timeLeft / 1000));
      setAnswers([]);
      setUserAnswerCount(0);
      // gameStatus is now managed by parent component
    }
  }, [initialRound]);

  // Initialize with initial players data if provided
  useEffect(() => {
    if (initialPlayers && initialPlayers.length > 0) {
      console.log('GameBoard initializing with players:', initialPlayers.length);
      setPlayers(initialPlayers);
    }
  }, [initialPlayers]);

  useEffect(() => {
    if (!socket) return;

    // Listen for round start
    socket.on('round-start', (roundData) => {
      console.log('GameBoard received round-start:', roundData.theme);
      setCurrentRound(roundData);
      setTimeLeft(Math.floor(roundData.timeLeft / 1000));
      setAnswers([]);
      setUserAnswerCount(0);
      // gameStatus is managed by parent component
    });

    // Listen for new answers
    socket.on('new-answer', (answerData) => {
      setAnswers(prev => [...prev, answerData]);
      if (answerData.playerId === socket.id) {
        setUserAnswerCount(prev => prev + 1);
        setUserAnswer('');
      }
    });

    // Listen for answer rejection
    socket.on('answer-rejected', (data) => {
      // Show server rejection message inline instead of alert
      setValidationMessage(data.reason);
      setValidationType('error');
      console.log('❌ Server rejected answer:', data.reason);
    });

    // Listen for players update
    socket.on('players-update', (playersData) => {
      setPlayers(playersData);
    });

    // Listen for round end
    socket.on('round-end', (endData) => {
      // gameStatus transitions are now managed by parent component
      console.log('Round ended:', endData);
    });

    return () => {
      socket.off('round-start');
      socket.off('new-answer');
      socket.off('answer-rejected');
      socket.off('players-update');
      socket.off('round-end');
    };
  }, [socket]);

  // Timer countdown
  useEffect(() => {
    if (timeLeft > 0 && gameStatus === 'playing') {
      const timer = setTimeout(() => {
        setTimeLeft(timeLeft - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [timeLeft, gameStatus]);

  // Local requirements validation function
  const validateAnswerLocally = (answer, round) => {
    if (!answer || !round || !round.requirements) {
      return { isValid: false, reason: 'Data tidak lengkap', metRequirements: [] };
    }

    const trimmedAnswer = answer.trim();
    if (!trimmedAnswer) {
      return { isValid: false, reason: 'Jawaban tidak boleh kosong', metRequirements: [] };
    }

    const metRequirements = [];
    let hasValidRequirement = false;

    // Check each requirement locally
    for (const req of round.requirements) {
      let requirementMet = false;

      switch (req.type) {
        case 'awalan':
          requirementMet = trimmedAnswer.toLowerCase().startsWith(req.value.toLowerCase());
          break;
        case 'akhiran':
          requirementMet = trimmedAnswer.toLowerCase().endsWith(req.value.toLowerCase());
          break;
        case 'jumlah':
          requirementMet = trimmedAnswer.length === req.value;
          break;
        default:
          console.warn(`Unknown requirement type: ${req.type}`);
      }

      if (requirementMet) {
        metRequirements.push(req.type);
        hasValidRequirement = true;
      }
    }

    // Must meet at least one requirement to be considered valid locally
    if (!hasValidRequirement) {
      return { 
        isValid: false, 
        reason: 'Jawaban tidak memenuhi syarat apapun', 
        metRequirements: [] 
      };
    }

    return { 
      isValid: true, 
      reason: '', 
      metRequirements 
    };
  };

  const handleSubmitAnswer = (e) => {
    e.preventDefault();
    if (!userAnswer.trim() || userAnswerCount >= 3 || gameStatus !== 'playing') return;

    const trimmedAnswer = userAnswer.trim();

    // Clear previous validation messages
    setValidationMessage('');
    setValidationType('');

    // Step 1: Local requirements validation
    const localValidation = validateAnswerLocally(trimmedAnswer, currentRound);
    
    if (!localValidation.isValid) {
      // Show validation message near input instead of alert
      setValidationMessage(localValidation.reason);
      setValidationType('warning');
      console.log('⚠️ Local validation failed:', localValidation.reason);
      
      // Still submit to server as wrong answer (so it gets recorded)
      socket.emit('submit-answer', { 
        answer: trimmedAnswer, 
        clientMetRequirements: [] // Empty since local validation failed
      });
    } else {
      console.log('✅ Local validation passed:', localValidation.reason, 'Met requirements:', localValidation.metRequirements);
      
      // Submit to server with validated requirements
      socket.emit('submit-answer', { 
        answer: trimmedAnswer, 
        clientMetRequirements: localValidation.metRequirements 
      });
    }

    // Clear input after submission
    setUserAnswer('');
    
    // Clear success message after 2 seconds
    if (localValidation.isValid) {
      setTimeout(() => {
        setValidationMessage('');
        setValidationType('');
      }, 2000);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Show championship display if game is finished
  if (gameStatus === 'finished' && finalRanking) {
    return (
      <ChampionshipDisplay 
        finalRanking={finalRanking}
        currentPlayerUsername={username}
        onBackToHome={onBackToHome}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={onBackToHome}
            className="btn-secondary text-sm"
          >
            ← Back to Home
          </button>
          {roomId && roomId !== 'DEFAULT' && (
            <div className="bg-primary-100 text-primary-800 px-3 py-1 rounded-full text-sm font-medium">
              Room: {roomId}
            </div>
          )}
          <div className={`flex items-center text-sm ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
            <div className={`w-2 h-2 rounded-full mr-1 ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            {isConnected ? 'Online' : 'Offline'}
          </div>
        </div>
        <h1 className="text-4xl font-bold text-gray-900 mb-2">WordRush</h1>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Column - Info and Leaderboard */}
        <div className="lg:col-span-1 space-y-6">
          <InfoPanel 
            key={`info-${currentRound?.currentRound || 0}-${currentRound?.totalRounds || 0}`}
            gameStatus={gameStatus} 
            timeLeft={timeLeft} 
            userAnswerCount={userAnswerCount}
            isConnected={isConnected}
            onBackToHome={onBackToHome}
            currentRound={currentRound}
          />
          <Leaderboard players={players} currentUsername={username} />
        </div>

        {/* Middle Column - Requirements */}
        <div className="lg:col-span-2">
          <RequirementPanel 
            currentRound={currentRound}
            gameStatus={gameStatus}
            timeLeft={timeLeft}
          />
          
          {/* Answer Input */}
          {gameStatus === 'playing' && (
            <div className="game-card mt-6">
              <h3 className="text-lg font-semibold mb-4">Jawaban Anda</h3>
              <form onSubmit={handleSubmitAnswer} className="space-y-4">
                <div>
                  <input
                    type="text"
                    value={userAnswer}
                    onChange={(e) => setUserAnswer(e.target.value)}
                    className="input-field"
                    placeholder="Ketik jawaban Anda..."
                    disabled={userAnswerCount >= 3}
                    maxLength={50}
                  />
                  
                  {/* Validation Message */}
                  {validationMessage && (
                    <div className={`mt-2 p-2 rounded-md text-sm ${
                      validationType === 'error' ? 'bg-red-100 text-red-700 border border-red-200' :
                      validationType === 'warning' ? 'bg-yellow-100 text-yellow-700 border border-yellow-200' :
                      validationType === 'success' ? 'bg-green-100 text-green-700 border border-green-200' :
                      'bg-gray-100 text-gray-700 border border-gray-200'
                    }`}>
                      {validationMessage}
                    </div>
                  )}
                  
                  <div className="mt-2 text-sm text-gray-600">
                    Jawaban tersisa: <strong>{3 - userAnswerCount}</strong>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={!userAnswer.trim() || userAnswerCount >= 3}
                  className="btn-primary w-full"
                >
                  Kirim Jawaban
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Right Column - Chat */}
        <div className="lg:col-span-1">
          <ChatPanel answers={answers} />
        </div>
      </div>
    </div>
  );
}
