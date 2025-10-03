import React from 'react';
import { Theme } from '../types';
import Icon from './Icon';

interface ThemeSelectorProps {
    currentTheme: Theme;
    onThemeChange: (theme: Theme) => void;
}

const themes: { id: Theme; name: string; colors: string[] }[] = [
    { id: Theme.GOLDEN_SPOON, name: 'Golden Spoon', colors: ['#111827', '#FBBF24', '#F9FAFB'] },
    { id: Theme.MIDNIGHT_SLATE, name: 'Midnight Slate', colors: ['#0D1117', '#58A6FF', '#E6EDF3'] },
    { id: Theme.CLASSIC_IVORY, name: 'Classic Ivory', colors: ['#FDFDFB', '#D97706', '#111827'] },
    { id: Theme.TUSCAN_CREAM, name: 'Tuscan Cream', colors: ['#FBF9F4', '#991B1B', '#422006'] },
];

const ThemeSelector: React.FC<ThemeSelectorProps> = ({ currentTheme, onThemeChange }) => {
    return (
        <div className="bg-[var(--background-primary)] p-4 rounded-lg border border-[var(--border-primary)]">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {themes.map(theme => {
                    const isSelected = currentTheme === theme.id;
                    return (
                        <button
                            key={theme.id}
                            onClick={() => onThemeChange(theme.id)}
                            className={`p-4 rounded-lg border-2 transition-all duration-200 text-left ${
                                isSelected ? 'border-[var(--accent-primary)]' : 'border-[var(--border-secondary)] hover:border-[var(--border-primary)]'
                            }`}
                        >
                            <div className="flex items-center justify-between mb-3">
                                <h4 className="font-bold text-sm text-[var(--text-primary)]">{theme.name}</h4>
                                {isSelected && <Icon name="check-circle" className="w-5 h-5 text-[var(--accent-primary)]" />}
                            </div>
                            <div className="flex items-center h-8 rounded-full overflow-hidden">
                                {theme.colors.map((color, index) => (
                                    <div
                                        key={index}
                                        className="h-full flex-1"
                                        style={{ backgroundColor: color }}
                                    ></div>
                                ))}
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default ThemeSelector;