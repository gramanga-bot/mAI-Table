
import React from 'react';

type Language = 'it' | 'en';

interface LanguageSwitcherProps {
    currentLang: Language;
    onLanguageChange: (lang: Language) => void;
}

const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({ currentLang, onLanguageChange }) => {
    return (
        <div className="flex items-center gap-1 bg-gray-900/50 p-1 rounded-md">
            <button
                onClick={() => onLanguageChange('it')}
                className={`px-3 py-1 text-sm font-bold rounded transition-colors ${currentLang === 'it' ? 'bg-amber-500 text-gray-900' : 'text-gray-400 hover:bg-gray-700'}`}
            >
                IT
            </button>
            <button
                onClick={() => onLanguageChange('en')}
                className={`px-3 py-1 text-sm font-bold rounded transition-colors ${currentLang === 'en' ? 'bg-amber-500 text-gray-900' : 'text-gray-400 hover:bg-gray-700'}`}
            >
                EN
            </button>
        </div>
    );
};

export default LanguageSwitcher;
