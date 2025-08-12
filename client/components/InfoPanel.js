export default function InfoPanel({ gameStatus, timeLeft, userAnswerCount, isConnected, onBackToHome, currentRound }) {
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusColor = () => {
    switch (gameStatus) {
      case 'playing': return 'text-green-600';
      case 'ended': return 'text-red-600';
      default: return 'text-yellow-600';
    }
  };

  const getStatusText = () => {
    switch (gameStatus) {
      case 'playing': return 'Sedang Bermain';
      case 'ended': return 'Round Selesai';
      default: return 'Menunggu Round';
    }
  };

  return (
    <div className="game-card">
      <h2 className="text-xl font-bold text-gray-900 mb-4">Informasi Umum</h2>
      
      <div className="space-y-3">
        {/* Round Information */}
        {currentRound && (
          <div className="flex justify-between items-center" key={`round-${currentRound.currentRound}-${currentRound.totalRounds}`}>
            <span className="text-gray-600">Round:</span>
            <span className="font-semibold text-purple-600">
              {currentRound.currentRound || 1}/{currentRound.totalRounds || 10}
            </span>
          </div>
        )}
        
        {/* Debug: Log current round data */}
        {currentRound && console.log('InfoPanel currentRound data:', currentRound)}
        {currentRound && console.log('InfoPanel displaying:', `${currentRound.currentRound || 1}/${currentRound.totalRounds || 10}`)}

        <div className="flex justify-between items-center">
          <span className="text-gray-600">Status:</span>
          <span className={`font-semibold ${getStatusColor()}`}>
            {getStatusText()}
          </span>
        </div>

        {gameStatus === 'playing' && (
          <>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Waktu:</span>
              <span className="font-mono text-lg font-bold text-red-600">
                {formatTime(timeLeft)}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-gray-600">Jawaban Anda:</span>
              <span className="font-semibold text-blue-600">
                {userAnswerCount}/3
              </span>
            </div>
          </>
        )}

        {gameStatus === 'waiting' && (
          <div className="text-center py-4">
            <div className="animate-pulse">
              <div className="text-gray-500">Round baru dimulai dalam...</div>
              <div className="text-2xl font-bold text-blue-600 mt-2">3 detik</div>
            </div>
          </div>
        )}

        {gameStatus === 'ended' && (
          <div className="text-center py-4">
            <div className="text-gray-500">Round berakhir!</div>
            <div className="text-sm text-gray-400 mt-2">Round baru segera dimulai...</div>
          </div>
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="text-xs text-gray-500">
          <p><strong>Tips:</strong></p>
          <ul className="mt-1 space-y-1">
            <li>• Jawab sesuai tema dan syarat</li>
            <li>• Jawaban duplikat tidak dihitung</li>
            <li>• Semakin cepat semakin baik</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
