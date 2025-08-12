export default function ChampionshipDisplay({ finalRanking, currentPlayerUsername, onBackToHome }) {
  if (!finalRanking) return null;

  const { topThree, finalRanking: allPlayers, totalRounds } = finalRanking;
  const currentPlayer = allPlayers.find(p => p.username === currentPlayerUsername);

  const getRankIcon = (rank) => {
    switch (rank) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return '🏅';
    }
  };

  const getRankColor = (rank) => {
    switch (rank) {
      case 1: return 'from-yellow-400 to-yellow-600';
      case 2: return 'from-gray-300 to-gray-500';
      case 3: return 'from-orange-400 to-orange-600';
      default: return 'from-blue-400 to-blue-600';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🏆</div>
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Game Selesai!</h1>
          <p className="text-xl text-gray-600">
            {totalRounds} Round Telah Berakhir
          </p>
        </div>

        {/* Top 3 Champions */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">
            🏆 Juara 1-3 🏆
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {topThree.map((player, index) => (
              <div
                key={player.playerId}
                className={`bg-gradient-to-br ${getRankColor(player.rank)} text-white rounded-lg p-6 text-center transform hover:scale-105 transition-transform`}
              >
                <div className="text-4xl mb-2">{getRankIcon(player.rank)}</div>
                <div className="text-2xl font-bold mb-1">#{player.rank}</div>
                <div className="text-lg font-semibold mb-2">{player.username}</div>
                <div className="text-xl font-bold">{player.totalScore} poin</div>
                {player.username === currentPlayerUsername && (
                  <div className="mt-2 bg-white bg-opacity-20 rounded-full px-3 py-1">
                    <span className="text-sm font-bold">Anda!</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Current Player's Rank (if not in top 3) */}
        {currentPlayer && currentPlayer.rank > 3 && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <h3 className="text-xl font-bold text-center mb-4 text-gray-800">
              Peringkat Anda
            </h3>
            <div className="bg-gradient-to-br from-indigo-400 to-indigo-600 text-white rounded-lg p-4 text-center">
              <div className="text-3xl mb-2">🏅</div>
              <div className="text-xl font-bold mb-1">#{currentPlayer.rank}</div>
              <div className="text-lg font-semibold mb-2">{currentPlayer.username}</div>
              <div className="text-xl font-bold">{currentPlayer.totalScore} poin</div>
            </div>
          </div>
        )}

        {/* Full Leaderboard */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h3 className="text-xl font-bold text-center mb-4 text-gray-800">
            Papan Peringkat Lengkap
          </h3>
          <div className="space-y-2">
            {allPlayers.map((player) => (
              <div
                key={player.playerId}
                className={`flex items-center justify-between p-3 rounded-lg ${
                  player.username === currentPlayerUsername
                    ? 'bg-blue-100 border-2 border-blue-300'
                    : 'bg-gray-50'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{getRankIcon(player.rank)}</span>
                  <div>
                    <div className="font-semibold text-gray-800">
                      #{player.rank} {player.username}
                      {player.username === currentPlayerUsername && (
                        <span className="ml-2 text-blue-600 font-bold">(Anda)</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-lg font-bold text-gray-700">
                  {player.totalScore} poin
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Back to Home Button */}
        <div className="text-center">
          <button
            onClick={onBackToHome}
            className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-8 py-3 rounded-lg font-semibold hover:from-blue-600 hover:to-purple-700 transition-all transform hover:scale-105 shadow-lg"
          >
            🏠 Kembali ke Menu Utama
          </button>
        </div>
      </div>
    </div>
  );
}
