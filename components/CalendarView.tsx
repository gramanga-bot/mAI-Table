
import React, { useState, useMemo } from 'react';
import { BookingDetails, BookingStatus } from '../types';
import Icon from './Icon';

interface CalendarViewProps {
    bookings: BookingDetails[];
}

const CalendarView: React.FC<CalendarViewProps> = ({ bookings }) => {
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

    const selectedDateBookings = useMemo(() => {
        return bookings
            .filter(b => b.date === selectedDate && b.status === BookingStatus.CONFIRMED)
            .sort((a, b) => a.time.localeCompare(b.time));
    }, [bookings, selectedDate]);
    
    const aggregatedBookings = useMemo(() => {
        const today = new Date(new Date().toISOString().split('T')[0]);
        const futureBookings = bookings.filter(b => new Date(b.date) >= today && b.status === BookingStatus.CONFIRMED);

        const grouped = futureBookings.reduce((acc, booking) => {
            if (!acc[booking.date]) {
                acc[booking.date] = { count: 0, guests: 0 };
            }
            acc[booking.date].count++;
            acc[booking.date].guests += booking.adults + booking.children;
            return acc;
        }, {} as Record<string, { count: number; guests: number }>);

        return Object.entries(grouped).sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime());
    }, [bookings]);

    const formattedSelectedDate = new Date(selectedDate).toLocaleDateString('it-IT', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full">
            <div className="space-y-6">
                 <div>
                    <label htmlFor="date" className="block text-sm font-medium text-gray-400 mb-1">Seleziona una data</label>
                    <input type="date" id="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} required className="w-full bg-gray-800/70 border-gray-700 rounded-md p-3 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition" />
                </div>
                <div className="bg-gray-800/70 rounded-xl p-4">
                    <h3 className="font-bold text-lg text-white mb-3">Riepilogo Prenotazioni Confermate</h3>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                        {aggregatedBookings.length > 0 ? aggregatedBookings.map(([date, data]) => (
                            <div key={date} className="bg-gray-900/50 p-3 rounded-lg flex justify-between items-center">
                                <div>
                                    <p className="font-semibold text-white">{new Date(date).toLocaleDateString('it-IT', { weekday: 'short', month: 'long', day: 'numeric' })}</p>
                                    <p className="text-xs text-gray-400">{data.count} prenotazioni</p>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-amber-400 text-lg">{data.guests}</p>
                                    <p className="text-xs text-gray-400">coperti</p>
                                </div>
                            </div>
                        )) : (
                            <p className="text-gray-500 text-center py-4">Nessuna prenotazione futura confermata.</p>
                        )}
                    </div>
                </div>
            </div>

            <div className="bg-gray-800/70 rounded-xl p-4">
                <h3 className="font-bold text-lg text-white mb-3">Prenotazioni Confermate per il {formattedSelectedDate}</h3>
                 <div className="space-y-3 max-h-[500px] overflow-y-auto">
                    {selectedDateBookings.length > 0 ? selectedDateBookings.map(b => (
                        <div key={b.id} className="bg-gray-900/50 p-3 rounded-lg flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <span className="font-bold text-amber-400">{b.time}</span>
                                <div>
                                    <p className="font-semibold text-white">{b.name}</p>
                                    <p className="text-xs text-gray-400">{b.status}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 text-gray-400">
                                <Icon name="users" className="w-5 h-5"/>
                                <span className="font-bold text-lg text-white">{b.adults + b.children}</span>
                            </div>
                        </div>
                    )) : (
                        <p className="text-gray-500 text-center py-8">Nessuna prenotazione confermata per questa data.</p>
                    )}
                 </div>
            </div>
        </div>
    );
};

export default CalendarView;
