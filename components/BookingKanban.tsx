import React, { useMemo } from 'react';
import { BookingDetails, BookingStatus } from '../types';
import BookingCard from './BookingCard';
import Icon from './Icon';

interface BookingKanbanProps {
    bookings: BookingDetails[];
    onUpdateStatus: (bookingId: string, status: BookingStatus) => void;
}

const BookingKanban: React.FC<BookingKanbanProps> = ({ bookings, onUpdateStatus }) => {
    
    const pendingBookings = useMemo(() => {
        return bookings
            .filter(b => b.status === BookingStatus.PENDING)
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, [bookings]);

    return (
        <div className="w-full max-w-4xl mx-auto h-full">
            <div className="bg-[var(--background-secondary)] rounded-xl flex flex-col">
                <div className={`flex items-center gap-3 p-4 border-b-2 border-[var(--accent-secondary-border)]/50`}>
                   <Icon name="dots-horizontal" className={`w-6 h-6 text-[var(--text-accent)]`} />
                   <h2 className={`text-xl font-bold text-[var(--text-primary)]`}>Richieste in Attesa</h2>
                   <span className={`ml-2 bg-[var(--accent-secondary)] text-[var(--text-accent)] text-sm font-semibold px-2.5 py-0.5 rounded-full`}>
                       {pendingBookings.length}
                   </span>
                </div>
                <div className="p-4 space-y-4 overflow-y-auto" style={{maxHeight: 'calc(100vh - 350px)'}}>
                    {pendingBookings.length > 0 ? (
                        pendingBookings.map(booking => (
                            <BookingCard key={booking.id} booking={booking} onUpdateStatus={onUpdateStatus} />
                        ))
                    ) : (
                        <div className="text-center py-10">
                            <p className="text-[var(--text-secondary)]">Nessuna prenotazione in attesa.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BookingKanban;