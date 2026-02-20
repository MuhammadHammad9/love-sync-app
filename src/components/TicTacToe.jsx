import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { X, Circle, RotateCw, Trophy } from 'lucide-react';
import confetti from 'canvas-confetti';

const WINNING_COMBINATIONS = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // Cols
    [0, 4, 8], [2, 4, 6]             // Diagonals
];

export default function TicTacToe({ onClose, onGameEnd }) {
    const { user, couple, profile, partnerProfile } = useAuth();
    const [board, setBoard] = useState(Array(9).fill(null));
    const [isXNext, setIsXNext] = useState(true); // X always starts
    const [winner, setWinner] = useState(null);
    const [status, setStatus] = useState('Waiting for opponent...');



    // Player IDs
    // Logic: Sort IDs to determine who is X and who is O consistently
    const sortedIds = (user && couple) ? [user.id, couple.partner_id || (couple.partner_b === user.id ? couple.partner_a : couple.partner_b)].sort() : [];
    const mySymbol = (sortedIds.length > 0 && user?.id === sortedIds[0]) ? 'X' : 'O';
    const isMyTurn = (isXNext && mySymbol === 'X') || (!isXNext && mySymbol === 'O');

    useEffect(() => {
        if (!couple?.id) return;

        const channel = supabase.channel(`game:${couple.id}`)
            .on('broadcast', { event: 'move' }, ({ payload }) => {
                // Receive move
                setBoard(payload.board);
                setIsXNext(payload.isXNext);
            })
            .on('broadcast', { event: 'reset' }, () => {
                setBoard(Array(9).fill(null));
                setIsXNext(true);
                setWinner(null);
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    setStatus(isMyTurn ? "Your Turn!" : "Thinking...");
                }
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [couple?.id]);

    useEffect(() => {
        checkWinner(board);
        if (!winner) {
            setStatus(isMyTurn ? "Your Turn!" : "Partner's Turn...");
        }
    }, [board, isXNext]);

    // Safety check
    if (!couple || !user) return <div className="p-4 text-white">Loading game...</div>;

    const checkWinner = async (currentBoard) => {
        for (let combo of WINNING_COMBINATIONS) {
            const [a, b, c] = combo;
            if (currentBoard[a] && currentBoard[a] === currentBoard[b] && currentBoard[a] === currentBoard[c]) {
                const winnerSymbol = currentBoard[a];
                setWinner(winnerSymbol);

                if (winnerSymbol === mySymbol) {
                    confetti();
                    setStatus("You Won! 🎉");

                    // Save Game Result (Only Winner needs to save to avoid duplicate inserts)
                    await saveGameResult(user.id);
                } else {
                    setStatus(`${partnerProfile?.username || 'Partner'} Won! 👏`);
                }
                return;
            }
        }
        if (!currentBoard.includes(null)) {
            setWinner('Draw');
            setStatus("It's a Draw! 🤝");
            // Save Draw (Anyone can save, but let's say 'X' player saves to be safe, or just random)
            // Simpler: Only current turn player saves if draw? No, let's make the "Host" (Partner A) save draws.
            if (isPartnerA) await saveGameResult(null);
        }
    };

    const saveGameResult = async (winnerId) => {
        try {
            await supabase.from('game_history').insert([{
                couple_id: couple.id,
                winner_id: winnerId, // null for draw
                game_type: 'tictactoe'
            }]);
            // Refresh dashboard history via broadcast or let App.jsx poll/subscribe
            if (onGameEnd) onGameEnd();
        } catch (err) {
            console.error("Error saving game:", err);
        }
    };

    const handleTileClick = async (index) => {
        if (board[index] || winner || !isMyTurn) return;

        const newBoard = [...board];
        newBoard[index] = mySymbol;
        setBoard(newBoard);
        setIsXNext(!isXNext);

        // Broadcast move
        await supabase.channel(`game:${couple.id}`).send({
            type: 'broadcast',
            event: 'move',
            payload: { board: newBoard, isXNext: !isXNext }
        });
    };

    const resetGame = async () => {
        setBoard(Array(9).fill(null));
        setIsXNext(true);
        setWinner(null);

        await supabase.channel(`game:${couple.id}`).send({
            type: 'broadcast',
            event: 'reset',
            payload: {}
        });
    };

    // Identify Partner A (Host logic for draws/resets if needed)
    const isPartnerA = couple?.partner_a === user.id;

    return (
        <div className="flex flex-col items-center gap-6 p-6 rounded-[2rem] bg-black/60 backdrop-blur-xl border border-white/10 w-full max-w-sm mx-auto shadow-2xl relative overflow-hidden">
            {/* Background Glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-40 bg-love-500/20 blur-[60px] rounded-full pointer-events-none" />

            <div className="flex justify-between w-full items-center relative z-10">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    {winner ? <Trophy className="text-yellow-400 w-5 h-5" /> : "Tic-Tac-Toe"}
                </h2>
                <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-white/50 transition-colors">
                    <X size={20} />
                </button>
            </div>

            {/* Status & Turn Indicator */}
            <div className={`px-5 py-2 rounded-full text-sm font-bold border flex items-center gap-2 transition-all ${isMyTurn && !winner ? 'bg-love-500 text-white border-love-400 shadow-lg shadow-love-500/20 scale-105' : 'bg-white/5 text-white/50 border-white/5'
                }`}>
                {status}
            </div>

            {/* Board */}
            <div className="grid grid-cols-3 gap-3 w-full aspect-square p-3 bg-white/5 rounded-2xl border border-white/10 shadow-inner">
                {board.map((cell, index) => (
                    <button
                        key={index}
                        onClick={() => handleTileClick(index)}
                        className={`
              w-full h-full rounded-xl flex items-center justify-center text-4xl font-bold transition-all relative shadow-sm
              ${cell ? 'bg-white/10 border border-white/5' : 'bg-white/5 border border-white/5 hover:bg-white/15 cursor-pointer'}
              ${cell === 'X' ? 'text-love-400' : 'text-blue-400'}
              ${!cell && !winner && isMyTurn ? 'hover:scale-95' : ''}
              ${winner ? 'opacity-50' : ''}
              ${!cell && !winner && isMyTurn ? 'after:content-[""] after:absolute after:inset-2 after:border-2 after:border-dashed after:border-white/10 after:rounded-lg' : ''}
            `}
                        disabled={!!cell || !!winner}
                    >
                        {cell === 'X' && <X size={40} strokeWidth={2.5} />}
                        {cell === 'O' && <Circle size={32} strokeWidth={3} />}
                    </button>
                ))}
            </div>

            {winner && (
                <button
                    onClick={resetGame}
                    className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-love-600 to-love-500 hover:from-love-500 hover:to-love-400 text-white rounded-xl font-bold transition-all hover:scale-105 shadow-xl shadow-love-500/30"
                >
                    <RotateCw size={18} />
                    Play Again
                </button>
            )}

            {/* Players Legend */}
            <div className="flex justify-between w-full px-4 pt-2 border-t border-white/5">
                <div className={`flex flex-col items-center gap-1 ${mySymbol === 'X' ? 'text-love-400' : 'text-blue-400'} ${isXNext && !winner ? 'opacity-100 scale-110 font-bold' : 'opacity-50'}`}>
                    <span className="text-[10px] uppercase tracking-wider">You</span>
                    <div className="flex items-center gap-1 bg-white/5 px-2 py-1 rounded-lg">
                        {mySymbol === 'X' ? <X size={14} /> : <Circle size={14} />}
                        <span className="text-xs">{profile?.username || 'Me'}</span>
                    </div>
                </div>

                <div className="w-px bg-white/10 h-8 self-center" />

                <div className={`flex flex-col items-center gap-1 ${mySymbol !== 'X' ? 'text-love-400' : 'text-blue-400'} ${!isXNext && !winner ? 'opacity-100 scale-110 font-bold' : 'opacity-50'}`}>
                    <span className="text-[10px] uppercase tracking-wider">Partner</span>
                    <div className="flex items-center gap-1 bg-white/5 px-2 py-1 rounded-lg">
                        {mySymbol !== 'X' ? <X size={14} /> : <Circle size={14} />}
                        <span className="text-xs">{partnerProfile?.username || 'Partner'}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
