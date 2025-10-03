import React from 'react';

interface TimeSlotPickerProps {
    selectedTime: string;
    onSelectTime: (time: string) => void;
    timeSlots: string[];
}

const TimeSlotPicker: React.FC<TimeSlotPickerProps> = ({ selectedTime, onSelectTime, timeSlots }) => {
    return (
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
            {timeSlots.map(slot => (
                <button
                    type="button"
                    key={slot}
                    onClick={() => onSelectTime(slot)}
                    className={`p-3 rounded-lg border-2 text-center font-semibold transition-all duration-200 ${
                        selectedTime === slot
                            ? 'bg-[var(--accent-secondary)] border-[var(--accent-secondary-border)] text-[var(--text-accent)]'
                            : 'bg-[var(--background-tertiary)]/50 border-[var(--border-secondary)] hover:border-[var(--border-primary)]'
                    }`}
                >
                    {slot}
                </button>
            ))}
        </div>
    );
};

export default TimeSlotPicker;