export default function RequirementPanel({ currentRound, gameStatus, timeLeft }) {
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getRequirementText = (requirement) => {
    if (!requirement) return '';
    
    switch (requirement.type) {
      case 'awalan':
        return `Dimulai huruf "${requirement.value.toUpperCase()}"`;
      case 'akhiran':
        return `Diakhiri huruf "${requirement.value.toUpperCase()}"`;
      case 'jumlah':
        return `${requirement.value} huruf`;
      default:
        return '';
    }
  };

  const getRequirementIcon = (type) => {
    switch (type) {
      case 'awalan': return '🔤';
      case 'akhiran': return '🔚';
      case 'jumlah': return '🔢';
      default: return '📝';
    }
  };

  if (gameStatus === 'waiting') {
    return (
      <div className="game-card text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Syarat</h2>
        <div className="py-12">
          <div className="text-6xl mb-4">⏳</div>
          <p className="text-xl text-gray-600">Menunggu round baru...</p>
          <div className="mt-4 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
          </div>
        </div>
      </div>
    );
  }

  if (gameStatus === 'ended') {
    return (
      <div className="game-card text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Round Selesai!</h2>
        <div className="py-12">
          <div className="text-6xl mb-4">🏁</div>
          <p className="text-xl text-gray-600">Round berakhir</p>
          <p className="text-gray-500 mt-2">Round baru akan segera dimulai...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="game-card">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Syarat</h2>
        <div className={`text-2xl font-mono font-bold ${
          timeLeft <= 10 ? 'text-red-600 animate-pulse' : 'text-blue-600'
        }`}>
          {formatTime(timeLeft)}
        </div>
      </div>

      {currentRound && (
        <div className="space-y-6">
          {/* Theme */}
          <div className="text-center">
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg p-6">
              <div className="text-sm font-medium opacity-90 mb-2">TEMA</div>
              <div className="text-3xl font-bold">{currentRound.theme}</div>
            </div>
          </div>

          {/* All 3 Requirements */}
          <div className="space-y-3">
            <div className="text-center mb-4">
              <h3 className="text-lg font-bold text-gray-800">SYARAT</h3>
            </div>
            {currentRound.requirements && currentRound.requirements.map((req, index) => (
              <div key={index} className="bg-gradient-to-r from-green-500 to-teal-600 text-white rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl">{getRequirementIcon(req.type)}</span>
                    <div className="text-lg font-bold">
                      {getRequirementText(req)}
                    </div>
                  </div>
                  <div className="bg-white bg-opacity-20 rounded-full px-3 py-1">
                    <span className="text-lg font-bold">{req.points || 0} poin</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-1000 ${
                timeLeft <= 10 ? 'bg-red-500' : 'bg-blue-500'
              }`}
              style={{ 
                width: `${Math.max(0, (timeLeft / (currentRound?.duration ? currentRound.duration / 1000 : 60)) * 100)}%` 
              }}
            ></div>
          </div>
        </div>
      )}
    </div>
  );
}
