export default function Leaderboard({ players, currentUser }) {
  // Sort players by score (descending)
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);

  const getRankIcon = (index) => {
    switch (index) {
      case 0: return '🥇';
      case 1: return '🥈';
      case 2: return '🥉';
      default: return `${index + 1}.`;
    }
  };

  return (
    <div className="game-card">
      <h2 className="text-xl font-bold text-gray-900 mb-4">Player Leaderboard</h2>
      
      {sortedPlayers.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <div className="text-4xl mb-2">👥</div>
          <p>Belum ada pemain lain</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sortedPlayers.map((player, index) => (
            <div
              key={player.id}
              className={`flex items-center justify-between p-3 rounded-lg border ${
                player.username === currentUser
                  ? 'bg-blue-50 border-blue-200'
                  : 'bg-gray-50 border-gray-200'
              }`}
            >
              <div className="flex items-center space-x-3">
                <span className="text-lg font-bold w-8">
                  {getRankIcon(index)}
                </span>
                <div>
                  <div className={`font-medium ${
                    player.username === currentUser ? 'text-blue-700' : 'text-gray-900'
                  }`}>
                    {player.username}
                    {player.username === currentUser && (
                      <span className="text-xs text-blue-600 ml-1">(Anda)</span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500">
                    Jawaban: {player.roundAnswers || 0}/3
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold text-lg text-gray-900">
                  {player.score}
                </div>
                <div className="text-xs text-gray-500">poin</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="text-xs text-gray-500 text-center">
          <p>🏆 Poin per jawaban benar: <strong>10 poin</strong></p>
        </div>
      </div>
    </div>
  );
}
