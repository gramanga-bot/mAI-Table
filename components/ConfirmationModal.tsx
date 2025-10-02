
import React, { useState } from 'react';
import { BookingDetails, ConfirmationMessages } from '../types';
import Icon from './Icon';

interface ConfirmationModalProps {
    details: BookingDetails;
    messages: ConfirmationMessages;
    onNewBooking: () => void;
    t: (key: string) => string;
}

type ActiveTab = 'whatsapp' | 'telegram' | 'email';

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ details, messages, onNewBooking, t }) => {
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
    const bookingSummary = t('modal.summary')
        .replace('{name}', details.name)
        .replace('{count}', totalGuests.toString())
        .replace('{date}', new Date(details.date).toLocaleDateString(t('locale'), { month: 'long', day: 'numeric' }))
        .replace('{time}', details.time);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-40">
            <div className="bg-gray-800 rounded-2xl shadow-2xl shadow-black/50 border border-gray-700 w-full max-w-2xl animate-fade-in-up overflow-hidden">
                <div className="p-8">
                    <div className="text-center mb-6">
                        <Icon name="check-circle" className="w-16 h-16 bg-blue-500/20 text-blue-400 rounded-full p-3 mx-auto mb-4" />
                        <h2 className="text-3xl font-bold text-white">{t('modal.title')}</h2>
                        <p className="text-gray-400">{t('modal.subtitle')}</p>
                    </div>

                    <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700 mb-6 text-center">
                        <p className="text-lg text-white" dangerouslySetInnerHTML={{ __html: bookingSummary }} />
                    </div>

                    <p className="text-center text-gray-500 text-sm mb-4">{t('modal.aiPrompt')}</p>

                    <div className="mb-4">
                        <div className="flex border-b border-gray-700">
                            {Object.keys(messages).map(key => (
                                <button key={key} onClick={() => setActiveTab(key as ActiveTab)} className={`flex-1 capitalize py-3 text-sm font-medium transition-colors duration-200 outline-none ${activeTab === key ? 'text-amber-400 border-b-2 border-amber-400' : 'text-gray-400 hover:text-white'}`}>
                                    {key}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="relative bg-gray-900 p-4 rounded-b-lg min-h-[150px]">
                        <p className="text-gray-300 whitespace-pre-wrap">{getMessageContent()}</p>
                        <button onClick={() => handleCopy(getMessageContent(), activeTab)} className="absolute top-2 right-2 bg-gray-700 hover:bg-gray-600 text-gray-300 p-2 rounded-md transition-colors">
                            {copiedStates[activeTab] ? <Icon name="check" className="w-5 h-5 text-green-400" /> : <Icon name="copy" className="w-5 h-5" />}
                        </button>
                    </div>
                </div>

                <div className="bg-gray-800/50 p-4 border-t border-gray-700">
                     <button onClick={onNewBooking} className="w-full bg-amber-500 text-gray-900 font-bold py-3 px-4 rounded-lg hover:bg-amber-400 transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-amber-500 text-lg">
                        {t('modal.newRequestButton')}
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

export default ConfirmationModal;
