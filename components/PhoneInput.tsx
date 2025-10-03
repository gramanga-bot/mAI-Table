import React, { useState, useEffect, useRef } from 'react';
import { countries, Country } from '../data/countries';

interface PhoneInputProps {
    value: string;
    onChange: (value: string) => void;
}

const PhoneInput: React.FC<PhoneInputProps> = ({ value, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    
    const getDefaultCountry = (): Country => {
        const initialCode = value.startsWith('+') ? value.split(/(\d+)/).filter(Boolean)[0] : '+39';
        return countries.find(c => c.dial_code === initialCode) || countries.find(c => c.code === 'IT')!;
    };
    
    const [selectedCountry, setSelectedCountry] = useState<Country>(getDefaultCountry());

    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);
    
    const getPhoneNumber = (fullNumber: string, dialCode: string): string => {
        if(fullNumber.startsWith(dialCode)) {
            return fullNumber.substring(dialCode.length);
        }
        return fullNumber;
    }
    
    const [phoneNumber, setPhoneNumber] = useState(getPhoneNumber(value, selectedCountry.dial_code));

    const handleCountrySelect = (country: Country) => {
        setSelectedCountry(country);
        setIsOpen(false);
        onChange(`${country.dial_code}${phoneNumber}`);
    };
    
    const handlePhoneNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const input = e.target.value.replace(/\D/g, ''); // Allow only digits
        setPhoneNumber(input);
        onChange(`${selectedCountry.dial_code}${input}`);
    };

    const filteredCountries = countries.filter(country =>
        country.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        country.dial_code.includes(searchTerm)
    );

    return (
        <div className="relative" ref={dropdownRef}>
            <div className="flex items-center">
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className="flex items-center justify-center bg-[var(--input-background)] border border-r-0 border-[var(--border-secondary)] rounded-l-md px-3 py-3 h-full transition-colors hover:bg-[var(--background-interactive)]"
                >
                    <span className="text-lg">{selectedCountry.flag}</span>
                    <span className="text-sm font-semibold text-[var(--text-secondary)] ml-2">{selectedCountry.dial_code}</span>
                </button>
                <input
                    type="tel"
                    id="phone"
                    value={phoneNumber}
                    onChange={handlePhoneNumberChange}
                    required
                    className="w-full bg-[var(--input-background)] text-[var(--input-text)] placeholder:text-[var(--input-placeholder)] border border-[var(--border-secondary)] rounded-r-md p-3 focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)] outline-none transition"
                />
            </div>

            {isOpen && (
                <div className="absolute z-10 mt-1 w-full bg-[var(--background-secondary)] shadow-lg rounded-md border border-[var(--border-primary)] max-h-60 overflow-hidden flex flex-col">
                    <div className="p-2 border-b border-[var(--border-primary)]">
                         <input
                            type="text"
                            placeholder="Cerca paese..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full bg-[var(--input-background)] text-[var(--input-text)] placeholder:text-[var(--input-placeholder)] border border-[var(--border-secondary)] rounded-md p-2 focus:ring-2 focus:ring-[var(--accent-primary)] outline-none"
                        />
                    </div>
                    <ul className="overflow-y-auto flex-1 no-scrollbar">
                        {filteredCountries.map(country => (
                            <li
                                key={country.code}
                                onClick={() => handleCountrySelect(country)}
                                className="px-4 py-2 hover:bg-[var(--background-interactive)] cursor-pointer flex items-center justify-between"
                            >
                                <div className="flex items-center">
                                    <span className="text-lg mr-3">{country.flag}</span>
                                    <span className="text-sm text-[var(--text-primary)]">{country.name}</span>
                                </div>
                                <span className="text-sm text-[var(--text-secondary)]">{country.dial_code}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};

export default PhoneInput;
