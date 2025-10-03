import React from 'react';
import Icon from './Icon';
import { VoiceBookingState } from '../types';

interface VoiceBookingOverlayProps {
    state: VoiceBookingState;
    onClose: () => void;
}

const statusInfo: Record<VoiceBookingState['status'], { text: string; icon: 'microphone' | 'dots-horizontal' | 'bell' | 'x-circle'; pulse: boolean }> = {
    idle: { text: "Inizializzazione...", icon: 'dots-horizontal', pulse: false },
    listening: { text: "Sto ascoltando...", icon: 'microphone', pulse: true },
    speaking: { text: "L'assistente sta parlando...", icon: 'bell', pulse: true },
    processing: { text: "Elaborazione...", icon: 'dots-horizontal', pulse: true },
    error: { text: "Si è verificato un errore.", icon: 'x-circle', pulse: false },
};

const VoiceBookingOverlay: React.FC<VoiceBookingOverlayProps> = ({ state, onClose }) => {
    const { text, icon, pulse } = statusInfo[state.status];

    return (
        <div className="fixed inset-0 bg-black/80 flex flex-col items-center justify-center z-50 backdrop-blur-sm animate-fade-in">
            <div className="relative w-48 h-48 flex items-center justify-center">
                {pulse && <div className="absolute inset-0 bg-[var(--accent-primary)]/30 rounded-full animate-ping"></div>}
                <div className={`relative w-32 h-32 bg-[var(--background-secondary)] rounded-full flex items-center justify-center border-4 transition-colors ${state.status === 'listening' ? 'border-[var(--accent-primary)]' : 'border-[var(--border-primary)]'}`}>
                    <Icon name={icon} className="w-16 h-16 text-[var(--text-accent)]" />
                </div>
            </div>
            <p className="mt-8 text-xl text-white font-semibold">{text}</p>
            <p className="mt-2 text-gray-400 h-6">{state.transcript}</p>
            <button
                onClick={onClose}
                className="mt-12 bg-red-600 hover:bg-red-500 text-white font-bold py-3 px-6 rounded-full transition-colors"
            >
                Termina Sessione
            </button>
            <style>{`
                @keyframes fade-in {
                    0% { opacity: 0; }
                    100% { opacity: 1; }
                }
                .animate-fade-in {
                    animation: fade-in 0.3s ease-out forwards;
                }
            `}</style>
        </div>
    );
};

export default VoiceBookingOverlay;