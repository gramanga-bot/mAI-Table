
import React from 'react';

type AdminTab = 'pending' | 'calendar';

interface AdminTabsProps {
    activeTab: AdminTab;
    onTabChange: (tab: AdminTab) => void;
}

const AdminTabs: React.FC<AdminTabsProps> = ({ activeTab, onTabChange }) => {
    return (
        <div className="flex items-center gap-2 bg-gray-800/80 p-1 rounded-xl border border-gray-700 max-w-md mx-auto">
            <button
                onClick={() => onTabChange('pending')}
                className={`w-full px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
                    activeTab === 'pending' ? 'bg-amber-500 text-gray-900' : 'text-gray-300 hover:bg-gray-700'
                }`}
            >
                Richieste in Attesa
            </button>
            <button
                onClick={() => onTabChange('calendar')}
                className={`w-full px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
                    activeTab === 'calendar' ? 'bg-amber-500 text-gray-900' : 'text-gray-300 hover:bg-gray-700'
                }`}
            >
                Calendario
            </button>
        </div>
    );
};

export default AdminTabs;
