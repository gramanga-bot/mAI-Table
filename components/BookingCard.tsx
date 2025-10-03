import React from 'react';
import { BookingDetails, BookingStatus } from '../types';
import Icon from './Icon';

// FIX: Define the BookingCardProps interface to resolve the TypeScript error.
interface BookingCardProps {
    booking: BookingDetails;
    onUpdateStatus: (bookingId: string, status: BookingStatus) => void;
}

const statusStyles: Record<BookingStatus, { bg: string; text: string; icon: 'check-circle' | 'x-circle' | 'dots-horizontal' }> = {
    [BookingStatus.CONFIRMED]: { bg: 'bg-[var(--positive-background)]', text: 'text-[var(--positive-text)]', icon: 'check-circle' },
    [BookingStatus.DECLINED]: { bg: 'bg-[var(--negative-background)]', text: 'text-[var(--negative-text)]', icon: 'x-circle' },
    [BookingStatus.PENDING]: { bg: 'bg-[var(--accent-secondary)]', text: 'text-[var(--text-accent)]', icon: 'dots-horizontal' },
};


const BookingCard: React.FC<BookingCardProps> = ({ booking, onUpdateStatus }) => {
    const { name, email, phone, date, time, adults, children, status, id } = booking;
    const style = statusStyles[status];
    const totalGuests = adults + children;

    const formattedDate = new Date(date).toLocaleDateString('it-IT', {
        weekday: 'short',
        month: 'long',
        day: 'numeric',
    });

    return (
        <div className="bg-[var(--background-secondary)] rounded-lg p-5 border border-[var(--border-primary)] shadow-lg transition-all hover:border-[var(--border-secondary)] hover:shadow-[var(--shadow-color)]">
            {/* Header: Name, Contact, and Status */}
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h3 className="font-bold text-lg text-[var(--text-primary)]">{name}</h3>
                    <div className="text-sm text-[var(--text-secondary)] mt-1 space-y-0.5">
                       <p>{email}</p>
                       <p>{phone}</p>
                    </div>
                </div>
                <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
                    <Icon name={style.icon} className="w-3 h-3" />
                    {status}
                </div>
            </div>

            {/* Key Details Section */}
            <div className="grid grid-cols-3 gap-3 text-center bg-[var(--background-primary)] p-3 rounded-lg border border-[var(--border-primary)]/60">
                <div className="flex flex-col items-center justify-center">
                    <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wider">Data</p>
                    <p className="text-xl font-bold text-[var(--text-accent)] mt-1">{formattedDate}</p>
                </div>
                <div className="flex flex-col items-center justify-center">
                    <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wider">Orario</p>
                    <p className="text-xl font-bold text-[var(--text-accent)] mt-1">{time}</p>
                </div>
                <div className="flex flex-col items-center justify-center">
                    <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wider">Persone</p>
                    <p className="text-xl font-bold text-[var(--text-accent)] mt-1">{totalGuests}</p>
                </div>
            </div>

            {/* Actions */}
            {status === BookingStatus.PENDING && (
                <div className="mt-4 flex gap-3">
                    <button 
                        onClick={() => onUpdateStatus(id, BookingStatus.DECLINED)}
                        className="w-full bg-[var(--negative-background)] hover:bg-[var(--negative-background)]/80 text-[var(--negative-text)] font-semibold py-2 px-3 rounded-md transition-colors duration-200 flex items-center justify-center gap-2"
                    >
                        <Icon name="x-circle" className="w-5 h-5" />
                        Rifiuta
                    </button>
                    <button 
                        onClick={() => onUpdateStatus(id, BookingStatus.CONFIRMED)}
                        className="w-full bg-[var(--positive-background)] hover:bg-[var(--positive-background)]/80 text-[var(--positive-text)] font-semibold py-2 px-3 rounded-md transition-colors duration-200 flex items-center justify-center gap-2"
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