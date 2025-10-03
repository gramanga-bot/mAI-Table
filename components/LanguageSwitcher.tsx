import React from 'react';

type Language = 'it' | 'en';

interface LanguageSwitcherProps {
    currentLang: Language;
    onLanguageChange: (lang: Language) => void;
}

const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({ currentLang, onLanguageChange }) => {
    return (
        <div className="flex items-center gap-1 bg-[var(--background-primary)] p-1 rounded-md">
            <button
                onClick={() => onLanguageChange('it')}
                className={`px-3 py-1 text-sm font-bold rounded transition-colors ${currentLang === 'it' ? 'bg-[var(--accent-primary)] text-[var(--accent-text)]' : 'text-[var(--text-secondary)] hover:bg-[var(--background-interactive)]'}`}
            >
                IT
            </button>
            <button
                onClick={() => onLanguageChange('en')}
                className={`px-3 py-1 text-sm font-bold rounded transition-colors ${currentLang === 'en' ? 'bg-[var(--accent-primary)] text-[var(--accent-text)]' : 'text-[var(--text-secondary)] hover:bg-[var(--background-interactive)]'}`}
            >
                EN
            </button>
        </div>
    );
};

export default LanguageSwitcher;