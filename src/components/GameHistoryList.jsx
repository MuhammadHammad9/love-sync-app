import React from 'react';
import { Trophy } from 'lucide-react';

const GameHistoryList = ({ gameHistory, user, partnerProfile }) => {
    return (
        <div className="glass-panel p-6 rounded-3xl">
            <h3 className="text-xs uppercase font-bold text-white/40 mb-4 tracking-widest flex justify-between items-center">
                Recent Games
                <span className="text-[10px] bg-white/5 py-1 px-2 rounded-lg">{gameHistory.length} played</span>
            </h3>
            {gameHistory.length > 0 ? (
                <div className="space-y-2 max-h-60 overflow-y-auto scrollbar-hide">
                    {gameHistory.map((game, index) => {
                        const isWinner = game.winner_id && user?.id && game.winner_id === user.id;
                        const isDraw = !game.winner_id;

                        let dateStr = 'Just now';
                        try {
                            if (game.played_at) {
                                dateStr = new Date(game.played_at).toLocaleDateString([], { month: 'short', day: 'numeric' });
                            }
                        } catch (e) {
                            console.error('Date error', e);
                        }

                        return (
                            <div key={game.id || index} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg ${isDraw ? 'bg-gray-500/20 text-gray-400' : isWinner ? 'bg-yellow-500/20 text-yellow-400' : 'bg-blue-500/20 text-blue-400'}`}>
                                        {isDraw ? <span className="font-bold text-sm leading-none">-</span> : <Trophy className="w-4 h-4" />}
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-white/90">
                                            {isDraw ? 'Draw' : isWinner ? 'You Won' : `${partnerProfile?.username || 'Partner'} Won`}
                                        </p>
                                        <p className="text-[10px] text-white/40">Tic-Tac-Toe</p>
                                    </div>
                                </div>
                                <span className="text-[10px] text-white/30 font-mono">
                                    {dateStr}
                                </span>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="text-center text-xs text-white/30 py-6 italic border border-white/5 rounded-2xl bg-black/20">
                    No games recorded locally yet.
                </div>
            )}
        </div>
    );
};

export default GameHistoryList;
