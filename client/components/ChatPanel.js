import { useEffect, useRef } from 'react';

export default function ChatPanel({ answers }) {
  const chatEndRef = useRef(null);

  // Auto scroll to bottom when new answers arrive
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [answers]);

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('id-ID', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getMessageClass = (isValid) => {
    return `chat-message ${isValid ? 'valid' : 'invalid'}`;
  };

  return (
    <div className="game-card h-96 flex flex-col">
      <h2 className="text-xl font-bold text-gray-900 mb-4">Chat Jawaban</h2>
      
      <div className="flex-1 overflow-y-auto space-y-2 pr-2">
        {answers.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <div className="text-4xl mb-2">💬</div>
            <p>Belum ada jawaban</p>
            <p className="text-sm mt-1">Jawaban akan muncul di sini</p>
          </div>
        ) : (
          <>
            {answers.map((answer, index) => (
              <div key={index} className={getMessageClass(answer.isValid)}>
                <div className="flex justify-between items-start mb-1">
                  <span className="font-medium text-sm">
                    {answer.username}
                  </span>
                  <span className="text-xs opacity-75">
                    {formatTime(answer.timestamp)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-semibold">
                    {answer.answer}
                  </span>
                  <div className="flex items-center space-x-2">
                    {answer.isValid ? (
                      <>
                        <span className="text-xs font-medium">+{answer.points}</span>
                        <span className="text-lg">✅</span>
                      </>
                    ) : (
                      <span className="text-lg">❌</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </>
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="text-xs text-gray-500">
          <div className="flex justify-between">
            <span>✅ Benar</span>
            <span>❌ Salah</span>
          </div>
          <p className="mt-1 text-center">
            Total jawaban: <strong>{answers.length}</strong>
          </p>
        </div>
      </div>
    </div>
  );
}
