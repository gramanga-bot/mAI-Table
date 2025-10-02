
import React, { useState } from 'react';
import { BookingDetails, BookingStatus } from '../types';
import AdminTabs from './AdminTabs';
import BookingKanban from './BookingKanban';
import CalendarView from './CalendarView';

interface AdminDashboardProps {
    bookings: BookingDetails[];
    onUpdateStatus: (bookingId: string, status: BookingStatus) => void;
}

type AdminTab = 'pending' | 'calendar';

const AdminDashboard: React.FC<AdminDashboardProps> = ({ bookings, onUpdateStatus }) => {
    const [activeTab, setActiveTab] = useState<AdminTab>('pending');

    return (
        <div className="w-full h-full">
            <AdminTabs activeTab={activeTab} onTabChange={setActiveTab} />
            <div className="mt-6">
                {activeTab === 'pending' ? (
                    <BookingKanban bookings={bookings} onUpdateStatus={onUpdateStatus} />
                ) : (
                    <CalendarView 
                        bookings={bookings}
                    />
                )}
            </div>
        </div>
    );
};

export default AdminDashboard;
