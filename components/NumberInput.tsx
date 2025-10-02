
import React from 'react';
import Icon from './Icon';

interface NumberInputProps {
    label: string;
    value: number;
    onChange: (value: number) => void;
    min: number;
    max: number;
}

const NumberInput: React.FC<NumberInputProps> = ({ label, value, onChange, min, max }) => {
    const handleIncrement = () => {
        if (value < max) {
            onChange(value + 1);
        }
    };

    const handleDecrement = () => {
        if (value > min) {
            onChange(value - 1);
        }
    };

    return (
        <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">{label}</label>
            <div className="flex items-center justify-between bg-gray-900/50 border-gray-600 rounded-md p-2">
                <button
                    type="button"
                    onClick={handleDecrement}
                    disabled={value <= min}
                    className="p-2 rounded-md bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    <Icon name="minus" className="w-5 h-5 text-white" />
                </button>
                <span className="text-xl font-bold text-white w-8 text-center">{value}</span>
                <button
                    type="button"
                    onClick={handleIncrement}
                    disabled={value >= max}
                    className="p-2 rounded-md bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    <Icon name="plus" className="w-5 h-5 text-white" />
                </button>
            </div>
        </div>
    );
};

export default NumberInput;
