import React from 'react';
import Icon from './Icon';

type AdminTab = 'pending' | 'calendar' | 'menu';

interface AdminTabsProps {
    activeTab: AdminTab;
    onTabChange: (tab: AdminTab) => void;
}

const tabs: { id: AdminTab, label: string, icon: React.ComponentProps<typeof Icon>['name']}[] = [
    { id: 'pending', label: 'Richieste', icon: 'bell' },
    { id: 'calendar', label: 'Calendario', icon: 'calendar' },
    { id: 'menu', label: 'Menù Digitale', icon: 'book-open' }
]

const AdminTabs: React.FC<AdminTabsProps> = ({ activeTab, onTabChange }) => {
    return (
        <div className="flex items-center gap-2 bg-[var(--background-secondary)] p-1 rounded-xl border border-[var(--border-primary)] max-w-lg mx-auto overflow-x-auto no-scrollbar">
            {tabs.map(tab => (
                 <button
                    key={tab.id}
                    onClick={() => onTabChange(tab.id)}
                    className={`flex-shrink-0 px-4 py-2 text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 ${
                        activeTab === tab.id ? 'bg-[var(--accent-primary)] text-[var(--accent-text)]' : 'text-[var(--text-secondary)] hover:bg-[var(--background-interactive)]'
                    }`}
                >
                    <Icon name={tab.icon} className="w-5 h-5" />
                    {tab.label}
                </button>
            ))}
        </div>
    );
};

export default AdminTabs;