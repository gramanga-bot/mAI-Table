
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
            <div className="bg-gray-800/70 rounded-xl flex flex-col">
                <div className={`flex items-center gap-3 p-4 border-b-2 border-amber-500/50`}>
                   <Icon name="dots-horizontal" className={`w-6 h-6 text-amber-400`} />
                   <h2 className={`text-xl font-bold text-white`}>Richieste in Attesa</h2>
                   <span className={`ml-2 bg-amber-500/20 text-amber-300 text-sm font-semibold px-2.5 py-0.5 rounded-full`}>
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
                            <p className="text-gray-500">Nessuna prenotazione in attesa.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BookingKanban;