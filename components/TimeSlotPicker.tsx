
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
                            ? 'bg-amber-500/10 border-amber-500 text-amber-400'
                            : 'bg-gray-700/50 border-gray-600 hover:border-gray-500'
                    }`}
                >
                    {slot}
                </button>
            ))}
        </div>
    );
};

export default TimeSlotPicker;
