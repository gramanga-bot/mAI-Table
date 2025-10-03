import React, { useState } from 'react';
import { BookingDetails, BookingStatus, AdminSettings as AdminSettingsType } from '../types';
import AdminTabs from './AdminTabs';
import BookingKanban from './BookingKanban';
import CalendarView from './CalendarView';
import MenuManager from './MenuManager';

interface AdminDashboardProps {
    bookings: BookingDetails[];
    onUpdateStatus: (bookingId: string, status: BookingStatus) => void;
    settings: AdminSettingsType;
    onUpdateSettings: (settings: Partial<AdminSettingsType>) => void;
}

type AdminTab = 'pending' | 'calendar' | 'menu';

const AdminDashboard: React.FC<AdminDashboardProps> = ({ bookings, onUpdateStatus, settings, onUpdateSettings }) => {
    const [activeTab, setActiveTab] = useState<AdminTab>('pending');

    return (
        <div className="w-full h-full">
            <AdminTabs activeTab={activeTab} onTabChange={setActiveTab} />
            <div className="mt-6">
                {activeTab === 'pending' ? (
                    <BookingKanban bookings={bookings} onUpdateStatus={onUpdateStatus} />
                ) : activeTab === 'calendar' ? (
                    <CalendarView 
                        bookings={bookings}
                    />
                ) : (
                    <MenuManager
                        settings={settings}
                        onUpdateSettings={onUpdateSettings}
                    />
                )}
            </div>
        </div>
    );
};

export default AdminDashboard;