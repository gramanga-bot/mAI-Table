import React, { useState } from 'react';
import { BookingDetails, ConfirmationMessages } from '../types';
import Icon from './Icon';

interface NotificationModalProps {
    details: BookingDetails;
    messages: ConfirmationMessages;
    onClose: () => void;
}

type ActiveTab = 'whatsapp' | 'telegram' | 'email';

const NotificationModal: React.FC<NotificationModalProps> = ({ details, messages, onClose }) => {
    const [activeTab, setActiveTab] = useState<ActiveTab>('whatsapp');
    const [copiedStates, setCopiedStates] = useState<Record<string, boolean>>({});

    const handleCopy = (textToCopy: string, id: string) => {
        navigator.clipboard.writeText(textToCopy);
        setCopiedStates({ [id]: true });
        setTimeout(() => setCopiedStates(prev => ({ ...prev, [id]: false })), 2000);
    };

    const getMessageContent = () => {
        switch (activeTab) {
            case 'whatsapp':
                return messages.whatsapp;
            case 'telegram':
                return messages.telegram;
            case 'email':
                return `Subject: ${messages.email.subject}\n\n${messages.email.body}`;
        }
    };

    const totalGuests = details.adults + details.children;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-40">
            <div className="bg-[var(--background-secondary)] rounded-2xl shadow-2xl shadow-black/50 border border-[var(--border-primary)] w-full max-w-2xl animate-fade-in-up overflow-hidden">
                <div className="p-8">
                    <div className="text-center mb-6">
                        <Icon name="bell" className="w-16 h-16 bg-[var(--positive-background)] text-[var(--positive)] rounded-full p-3 mx-auto mb-4" />
                        <h2 className="text-3xl font-bold text-[var(--text-primary)]">Notifica Inviata!</h2>
                        <p className="text-[var(--text-secondary)]">Il cliente è stato avvisato della conferma della sua prenotazione.</p>
                    </div>

                     <div className="bg-[var(--background-primary)] p-4 rounded-lg border border-[var(--border-primary)] mb-6 text-center">
                        <p className="text-lg text-[var(--text-primary)]">
                            Conferma per <strong className="font-semibold text-[var(--text-accent)]">{details.name}</strong>, per <strong className="font-semibold text-[var(--text-accent)]">{totalGuests}</strong> persone il <strong className="font-semibold text-[var(--text-accent)]">{new Date(details.date).toLocaleDateString('it-IT', { month: 'long', day: 'numeric' })}</strong> alle <strong className="font-semibold text-[var(--text-accent)]">{details.time}</strong>.
                        </p>
                    </div>

                    <p className="text-center text-[var(--text-secondary)]/80 text-sm mb-4">È stato inviato il seguente messaggio di conferma:</p>

                    <div className="mb-4">
                        <div className="flex border-b border-[var(--border-primary)]">
                            {Object.keys(messages).map(key => (
                                <button key={key} onClick={() => setActiveTab(key as ActiveTab)} className={`flex-1 capitalize py-3 text-sm font-medium transition-colors duration-200 outline-none ${activeTab === key ? 'text-[var(--text-accent)] border-b-2 border-[var(--text-accent)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}>
                                    {key}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="relative bg-[var(--background-primary)] p-4 rounded-b-lg min-h-[150px]">
                        <p className="text-[var(--text-secondary)] whitespace-pre-wrap">{getMessageContent()}</p>
                        <button onClick={() => handleCopy(getMessageContent(), activeTab)} className="absolute top-2 right-2 bg-[var(--background-tertiary)] hover:bg-[var(--background-interactive)] text-[var(--text-secondary)] p-2 rounded-md transition-colors">
                            {copiedStates[activeTab] ? <Icon name="check" className="w-5 h-5 text-[var(--positive)]" /> : <Icon name="copy" className="w-5 h-5" />}
                        </button>
                    </div>
                </div>

                <div className="bg-[var(--background-secondary)]/50 p-4 border-t border-[var(--border-primary)]">
                     <button onClick={onClose} className="w-full bg-[var(--accent-primary)] text-[var(--accent-text)] font-bold py-3 px-4 rounded-lg hover:bg-[var(--accent-primary-hover)] transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[var(--background-secondary)] focus:ring-[var(--accent-primary)] text-lg">
                        Fatto
                    </button>
                </div>
            </div>
             <style>{`
                @keyframes fade-in-up {
                    0% { opacity: 0; transform: translateY(20px); }
                    100% { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in-up {
                    animation: fade-in-up 0.5s ease-out forwards;
                }
            `}</style>
        </div>
    );
};

export default NotificationModal;