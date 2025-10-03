import React, { useState, useEffect } from 'react';
import { GroupedTimeSlot } from '../types';
import Icon from './Icon';

interface TimeSlotPickerProps {
    selectedTime: string;
    onSelectTime: (time: string) => void;
    groupedTimeSlots: GroupedTimeSlot[];
}

const TimeSlotPicker: React.FC<TimeSlotPickerProps> = ({ selectedTime, onSelectTime, groupedTimeSlots }) => {
    const [activeGroup, setActiveGroup] = useState<string | null>(null);

    useEffect(() => {
        if (groupedTimeSlots && groupedTimeSlots.length > 0) {
            const selectedGroup = groupedTimeSlots.find(g => g.slots.includes(selectedTime));
            if (selectedGroup) {
                setActiveGroup(selectedGroup.name);
            } else {
                setActiveGroup(groupedTimeSlots[0].name);
            }
        } else {
            setActiveGroup(null);
        }
    }, [groupedTimeSlots]);

    const handleToggleGroup = (groupName: string) => {
        setActiveGroup(groupName);
    };

    if (!groupedTimeSlots || groupedTimeSlots.length === 0) {
        return <p className="text-sm text-[var(--text-secondary)]">Nessun orario disponibile per la data selezionata.</p>;
    }

    return (
        <div className="space-y-2">
            {groupedTimeSlots.map(group => {
                const isActive = activeGroup === group.name;
                return (
                    <div key={group.name} className="bg-[var(--background-tertiary)]/30 rounded-lg border border-[var(--border-primary)] transition-all duration-300 overflow-hidden">
                        <button
                            type="button"
                            onClick={() => handleToggleGroup(group.name)}
                            aria-expanded={isActive}
                            className={`w-full flex justify-between items-center p-3 text-left transition-colors ${isActive ? 'bg-[var(--background-tertiary)]/50' : 'hover:bg-[var(--background-tertiary)]/40'}`}
                        >
                            <h3 className="text-lg font-semibold text-[var(--text-secondary)] uppercase tracking-wider">{group.name}</h3>
                            <Icon name="chevron-down" className={`w-6 h-6 text-[var(--text-secondary)] transition-transform duration-300 ${isActive ? 'rotate-180' : ''}`} />
                        </button>
                        <div
                            className={`grid transition-all duration-500 ease-in-out ${isActive ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
                        >
                            <div className="overflow-hidden">
                                <div className="p-4 grid grid-cols-3 sm:grid-cols-5 gap-3 border-t border-[var(--border-primary)]/50">
                                    {group.slots.map(slot => (
                                        <button
                                            type="button"
                                            key={slot}
                                            onClick={() => onSelectTime(slot)}
                                            className={`p-3 rounded-lg border-2 text-center font-semibold transition-all duration-200 ${
                                                selectedTime === slot
                                                    ? 'bg-[var(--accent-secondary)] border-[var(--accent-secondary-border)] text-[var(--text-accent)]'
                                                    : 'bg-[var(--background-tertiary)]/80 border-[var(--border-secondary)] hover:border-[var(--border-primary)]'
                                            }`}
                                        >
                                            {slot}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default TimeSlotPicker;