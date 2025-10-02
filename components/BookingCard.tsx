
import React from 'react';
import { BookingDetails, BookingStatus } from '../types';
import Icon from './Icon';

interface BookingCardProps {
    booking: BookingDetails;
    onUpdateStatus: (bookingId: string, status: BookingStatus) => void;
}

const statusStyles: Record<BookingStatus, { bg: string; text: string; icon: 'check-circle' | 'x-circle' | 'dots-horizontal' }> = {
    [BookingStatus.CONFIRMED]: { bg: 'bg-green-500/20', text: 'text-green-300', icon: 'check-circle' },
    [BookingStatus.DECLINED]: { bg: 'bg-red-500/20', text: 'text-red-300', icon: 'x-circle' },
    [BookingStatus.PENDING]: { bg: 'bg-amber-500/20', text: 'text-amber-300', icon: 'dots-horizontal' },
};


const BookingCard: React.FC<BookingCardProps> = ({ booking, onUpdateStatus }) => {
    const { name, contact, date, time, adults, children, status, id } = booking;
    const style = statusStyles[status];
    const totalGuests = adults + children;

    const formattedDate = new Date(date).toLocaleDateString('it-IT', {
        weekday: 'short',
        month: 'long',
        day: 'numeric',
    });

    return (
        <div className="bg-gray-900/80 rounded-lg p-5 border border-gray-700 shadow-lg transition-all hover:border-gray-600 hover:shadow-amber-500/5">
            {/* Header: Name, Contact, and Status */}
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h3 className="font-bold text-lg text-white">{name}</h3>
                    <p className="text-sm text-gray-400">{contact}</p>
                </div>
                <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
                    <Icon name={style.icon} className="w-3 h-3" />
                    {status}
                </div>
            </div>

            {/* Key Details Section */}
            <div className="grid grid-cols-3 gap-3 text-center bg-gray-950/40 p-3 rounded-lg border border-gray-700/60">
                <div className="flex flex-col items-center justify-center">
                    <p className="text-xs text-gray-400 uppercase tracking-wider">Data</p>
                    <p className="text-xl font-bold text-amber-400 mt-1">{formattedDate}</p>
                </div>
                <div className="flex flex-col items-center justify-center">
                    <p className="text-xs text-gray-400 uppercase tracking-wider">Orario</p>
                    <p className="text-xl font-bold text-amber-400 mt-1">{time}</p>
                </div>
                <div className="flex flex-col items-center justify-center">
                    <p className="text-xs text-gray-400 uppercase tracking-wider">Persone</p>
                    <p className="text-xl font-bold text-amber-400 mt-1">{totalGuests}</p>
                </div>
            </div>

            {/* Actions */}
            {status === BookingStatus.PENDING && (
                <div className="mt-4 flex gap-3">
                    <button 
                        onClick={() => onUpdateStatus(id, BookingStatus.DECLINED)}
                        className="w-full bg-red-500/20 hover:bg-red-500/40 text-red-300 font-semibold py-2 px-3 rounded-md transition-colors duration-200 flex items-center justify-center gap-2"
                    >
                        <Icon name="x-circle" className="w-5 h-5" />
                        Rifiuta
                    </button>
                    <button 
                        onClick={() => onUpdateStatus(id, BookingStatus.CONFIRMED)}
                        className="w-full bg-green-500/20 hover:bg-green-500/40 text-green-300 font-semibold py-2 px-3 rounded-md transition-colors duration-200 flex items-center justify-center gap-2"
                    >
                        <Icon name="check-circle" className="w-5 h-5" />
                        Conferma
                    </button>
                </div>
            )}
        </div>
    );
};

export default BookingCard;
