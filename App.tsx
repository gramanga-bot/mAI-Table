import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { BookingDetails, ConfirmationMessages, AppStep, BookingStatus, DayOfWeek, Table, TableCombinationRule, BookingDurationRule, ServiceWindow, WeeklySchedule, Plan, AdminSettings as AdminSettingsType, Theme, GroupedTimeSlot } from './types';
import BookingForm from './components/BookingForm';
import ConfirmationModal from './components/ConfirmationModal';
import AdminDashboard from './components/AdminDashboard';
import NotificationModal from './components/NotificationModal';
import { generateBookingRequestMessages, generateBookingConfirmationMessages } from './services/geminiService';
import Icon from './components/Icon';
import LanguageSwitcher from './components/LanguageSwitcher';
import AdminSettings from './components/AdminSettings';

import it from './locales/it.js';
import en from './locales/en.js';

type View = 'customer' | 'admin';
type Language = 'it' | 'en';
type AdminView = 'dashboard' | 'settings';


// Helper to convert HH:MM string to minutes from midnight
const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
};

const isCapacityAvailableBasic = (
    partySize: number,
    date: string,
    time: string,
    allBookings: BookingDetails[],
    maxGuests: number
): boolean => {
    const confirmedGuestsOnSlot = allBookings
        .filter(b => b.date === date && b.time === time && b.status === BookingStatus.CONFIRMED)
        .reduce((sum, b) => sum + b.adults + b.children, 0);

    return (confirmedGuestsOnSlot + partySize) <= maxGuests;
};


/**
 * Finds an available table or combination based on party size and required duration.
 * It checks for overlaps in time windows, not just a single time slot.
 */
const findAvailableTablesPro = (
    partySize: number,
    date: string,
    time: string,
    allBookings: BookingDetails[],
    allTables: Table[],
    combinationRules: TableCombinationRule[],
    durationRules: BookingDurationRule[]
): string[] | null => {
    
    // 1. Calculate the duration and time window for the NEW booking
    const newBookingRule = durationRules.find(r => partySize >= r.minGuests && partySize <= r.maxGuests);
    const newBookingDuration = newBookingRule ? newBookingRule.durationMinutes : 90; // Default 90 mins
    const newBookingStart = timeToMinutes(time);
    const newBookingEnd = newBookingStart + newBookingDuration;

    // 2. Find all tables occupied during this time window
    const occupiedTableIds = new Set<string>();
    
    // Filter for confirmed bookings on the same day
    const bookingsOnSameDay = allBookings.filter(b => b.date === date && b.status === BookingStatus.CONFIRMED && b.assignedTableIds);

    for (const existingBooking of bookingsOnSameDay) {
        // Calculate the duration and time window for the EXISTING booking
        const existingPartySize = existingBooking.adults + existingBooking.children;
        const existingBookingRule = durationRules.find(r => existingPartySize >= r.minGuests && existingPartySize <= r.maxGuests);
        const existingBookingDuration = existingBookingRule ? existingBookingRule.durationMinutes : 90;
        const existingBookingStart = timeToMinutes(existingBooking.time);
        const existingBookingEnd = existingBookingStart + existingBookingDuration;

        // Check for overlap: (StartA < EndB) and (EndA > StartB)
        const overlaps = newBookingStart < existingBookingEnd && newBookingEnd > existingBookingStart;

        if (overlaps) {
            existingBooking.assignedTableIds!.forEach(id => occupiedTableIds.add(id));
        }
    }

    // 3. Get the list of available tables for the entire duration
    const availableTables = allTables.filter(t => !occupiedTableIds.has(t.id));

    // 4. --- STRATEGY 1: Find a single perfect-fit or larger table ---
    const suitableSingleTables = availableTables
        .filter(t => t.capacity >= partySize)
        .sort((a, b) => a.capacity - b.capacity); // Sort by capacity, smallest first

    if (suitableSingleTables.length > 0) {
        return [suitableSingleTables[0].id]; // Return the smallest suitable table
    }

    // 5. --- STRATEGY 2: Find a combination of tables based on rules ---
    const availableCombinableTables = availableTables.filter(t => t.isCombinable);
    const sortedRules = [...combinationRules].sort((a, b) => a.count - b.count);

    for (const rule of sortedRules) {
        if (rule.newCapacity >= partySize) {
            const requiredTables = availableCombinableTables
                .filter(t => t.capacity === rule.tableCapacity);

            if (requiredTables.length >= rule.count) {
                return requiredTables.slice(0, rule.count).map(t => t.id);
            }
        }
    }

    // 6. If no solution is found
    return null;
};


const App: React.FC = () => {
    const [step, setStep] = useState<AppStep>(AppStep.FORM);
    const [currentBookingDetails, setCurrentBookingDetails] = useState<BookingDetails | null>(null);
    const [confirmationMessages, setConfirmationMessages] = useState<ConfirmationMessages | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [bookings, setBookings] = useState<BookingDetails[]>([]);
    const [view, setView] = useState<View>('customer');
    const [adminView, setAdminView] = useState<AdminView>('dashboard');
    const [language, setLanguage] = useState<Language>('it');
    
    // Unified Settings State
    const [settings, setSettings] = useState<AdminSettingsType>(() => {
        const savedSettings = localStorage.getItem('restaurantSettings');
        const defaultSettings: AdminSettingsType = {
            restaurantName: 'The Golden Spoon',
            restaurantAddress: 'Via Roma, 1, 10121 Torino TO, Italia',
            reviewLink: '',
            activePlan: Plan.PRO,
            theme: Theme.GOLDEN_SPOON,
            // Shared settings
            serviceWindows: [
                { id: 'sw-lunch', name: 'Pranzo', startTime: '12:00', endTime: '14:30', slotInterval: 30 },
                { id: 'sw-dinner', name: 'Cena', startTime: '19:00', endTime: '22:00', slotInterval: 30 },
            ],
            weeklySchedule: {
                [DayOfWeek.SUNDAY]: ['sw-lunch', 'sw-dinner'], [DayOfWeek.MONDAY]: [], [DayOfWeek.TUESDAY]: ['sw-dinner'],
                [DayOfWeek.WEDNESDAY]: ['sw-lunch', 'sw-dinner'], [DayOfWeek.THURSDAY]: ['sw-lunch', 'sw-dinner'],
                [DayOfWeek.FRIDAY]: ['sw-lunch', 'sw-dinner'], [DayOfWeek.SATURDAY]: ['sw-lunch', 'sw-dinner'],
            },
            // Digital Menu
            digitalMenu: null,
            // PRO settings
            tables: Array.from({ length: 10 }, (_, i) => ({
                id: `t4-${i + 1}`, name: `Tavolo ${i + 1}`, capacity: 4, isCombinable: true,
            })),
            combinationRules: [
                { id: 'rule-1', count: 2, tableCapacity: 4, newCapacity: 6 },
                { id: 'rule-2', count: 3, tableCapacity: 4, newCapacity: 8 },
            ],
            bookingDurationRules: [
                { id: 'dur-1', minGuests: 1, maxGuests: 2, durationMinutes: 90 },
                { id: 'dur-2', minGuests: 3, maxGuests: 4, durationMinutes: 120 },
                { id: 'dur-3', minGuests: 5, maxGuests: 100, durationMinutes: 150 },
            ],
            // BASIC settings
            maxGuestsPerSlot: 30,
        };
        return savedSettings ? { ...defaultSettings, ...JSON.parse(savedSettings) } : defaultSettings;
    });

    useEffect(() => {
        document.body.dataset.theme = settings.theme;
        localStorage.setItem('restaurantSettings', JSON.stringify(settings));
    }, [settings]);
    
    useEffect(() => {
        const fetchBookings = async () => {
            try {
                const response = await fetch('/api/bookings');
                if (!response.ok) {
                    throw new Error('Failed to fetch bookings');
                }
                const data = await response.json();
                setBookings(data);
            } catch (err) {
                console.error(err);
                setError("Impossibile caricare le prenotazioni dal database.");
            }
        };

        if (view === 'admin') {
            fetchBookings();
        }
    }, [view]);

    const handleSettingsUpdate = useCallback((newSettings: Partial<AdminSettingsType>) => {
        setSettings(prev => ({ ...prev, ...newSettings }));
    }, []);

    const translations = useMemo(() => (language === 'it' ? it : en), [language]);
    
    const t = useCallback((key: string): string => {
        const typedTranslations = translations as Record<string, string>;
        return typedTranslations[key] || key;
    }, [translations]);

    const [isNotificationModalOpen, setIsNotificationModalOpen] = useState<boolean>(false);
    const [notificationContent, setNotificationContent] = useState<{ details: BookingDetails; messages: ConfirmationMessages } | null>(null);

    const handleBookingRequest = useCallback(async (details: Omit<BookingDetails, 'id' | 'status'>) => {
        const totalGuests = details.adults + details.children;
        let isAvailable = false;
        let assignedTableIds: string[] = [];

        if (settings.activePlan === Plan.PRO) {
            const availableTableIds = findAvailableTablesPro(
                totalGuests, details.date, details.time, bookings,
                settings.tables, settings.combinationRules, settings.bookingDurationRules
            );
            if (availableTableIds) {
                isAvailable = true;
                assignedTableIds = availableTableIds;
            }
        } else { // BASIC plan logic
            isAvailable = isCapacityAvailableBasic(
                totalGuests, details.date, details.time, bookings, settings.maxGuestsPerSlot
            );
        }

        if (!isAvailable) {
            setError(settings.activePlan === Plan.PRO
                ? "Siamo spiacenti, non ci sono tavoli disponibili per la data, l'orario e la durata richiesti. Prova a modificare la richiesta."
                : "Siamo spiacenti, la fascia oraria richiesta è al completo. Prova un altro orario."
            );
            return;
        }

        setIsLoading(true);
        setError(null);
        setStep(AppStep.CONFIRMING);

        const bookingDataForApi = {
            ...details,
            status: BookingStatus.PENDING,
            assignedTableIds: assignedTableIds,
        };
        
        let createdBooking: BookingDetails | null = null;

        try {
            const response = await fetch('/api/bookings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bookingDataForApi),
            });

            if (!response.ok) {
                let errorMessage = `Errore di rete: ${response.status} ${response.statusText}`;
                try {
                    const contentType = response.headers.get('content-type');
                    if (contentType && contentType.includes('application/json')) {
                        const errData = await response.json();
                        errorMessage = errData.error || errData.message || errorMessage;
                    }
                } catch (jsonError) {
                    console.error("Could not parse error response as JSON", jsonError);
                }
                throw new Error(errorMessage);
            }
            
            createdBooking = await response.json();
            
            setCurrentBookingDetails(createdBooking);
            setBookings(prev => [createdBooking!, ...prev]);

            const messages = await generateBookingRequestMessages(createdBooking, settings.restaurantName, settings.restaurantAddress, language, t('locale'));
            setConfirmationMessages(messages);
            setStep(AppStep.CONFIRMED);
        } catch (err) {
            console.error("Error during booking request:", err);
            let userError = "Siamo spiacenti, si è verificato un errore imprevisto. Riprova tra qualche istante.";
            
            if (err instanceof Error) {
                const lowerCaseMessage = err.message.toLowerCase();
                if (lowerCaseMessage.includes("failed to fetch") || lowerCaseMessage.includes("network") || lowerCaseMessage.includes("errore di rete")) {
                    userError = "Errore di connessione. L'ambiente AI Studio non può salvare le prenotazioni, quindi questo errore è normale durante i test qui.";
                } else if (lowerCaseMessage.includes("empty response") || lowerCaseMessage.includes("invalid format")) {
                    userError = "L'assistente AI ha restituito una risposta inaspettata. Riprova, il problema potrebbe essere temporaneo.";
                } else if (lowerCaseMessage.includes("database")) {
                    userError = "Si è verificato un problema nel salvataggio della prenotazione. Controlla la configurazione del database e riprova.";
                }
            }
            
            setError(userError);
            setStep(AppStep.FORM);

            if (createdBooking) {
                setBookings(prev => prev.filter(b => b.id !== createdBooking!.id));
            }
        } finally {
            setIsLoading(false);
        }
    }, [bookings, settings, language, t]);

    const handleUpdateBookingStatus = useCallback(async (bookingId: string, status: BookingStatus) => {
        const bookingToUpdate = bookings.find(b => b.id === bookingId);
        if (!bookingToUpdate) return;
        
        const originalStatus = bookingToUpdate.status;
        
        // Optimistic UI update
        setBookings(prev => prev.map(b => (b.id === bookingId ? { ...b, status } : b)));
        
        try {
            // API call to persist change
            const response = await fetch(`/api/bookings?id=${bookingId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status }),
            });

            if (!response.ok) {
                throw new Error('Failed to update booking status');
            }

            // If confirmed, generate final messages
            if (status === BookingStatus.CONFIRMED) {
                setIsLoading(true);
                setError(null);
                try {
                    const finalMessages = await generateBookingConfirmationMessages(bookingToUpdate, settings.restaurantName, settings.restaurantAddress, settings.reviewLink, language, t('locale'));
                    setNotificationContent({ details: { ...bookingToUpdate, status: BookingStatus.CONFIRMED }, messages: finalMessages });
                    setIsNotificationModalOpen(true);
                } catch (err) {
                     console.error("Error generating final confirmation messages:", err);
                     alert("Impossibile generare il messaggio di conferma. Controlla la console e riprova.");
                } finally {
                    setIsLoading(false);
                }
            }
        } catch (err) {
            console.error(err);
            // Revert UI on failure
            setBookings(prev => prev.map(b => (b.id === bookingId ? { ...b, status: originalStatus } : b)));
            alert("Failed to update booking status in the database.");
        }
    }, [bookings, settings, language, t]);

    const handleNewBooking = useCallback(() => {
        setStep(AppStep.FORM);
        setCurrentBookingDetails(null);
        setConfirmationMessages(null);
        setError(null);
    }, []);

    const handleViewChange = (targetView: View) => {
        if (view === 'admin' && targetView === 'customer') {
            setAdminView('dashboard'); // Reset when leaving admin panel
        }
        setView(targetView);
    };
    
    const getGroupedSlotsForDate = useCallback((date: string): GroupedTimeSlot[] => {
        const dayOfWeek = new Date(date).getUTCDay().toString() as DayOfWeek;
        const activeWindowIds = settings.weeklySchedule[dayOfWeek] || [];
        
        if (activeWindowIds.length === 0) return [];

        const activeWindows = activeWindowIds
            .map(id => settings.serviceWindows.find(sw => sw.id === id))
            .filter((sw): sw is ServiceWindow => !!sw)
            .sort((a,b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));

        return activeWindows.map(window => {
            const slots: string[] = [];
            const start = timeToMinutes(window.startTime);
            const end = timeToMinutes(window.endTime);
            for (let t = start; t <= end; t += window.slotInterval) {
                const hours = Math.floor(t / 60).toString().padStart(2, '0');
                const minutes = (t % 60).toString().padStart(2, '0');
                slots.push(`${hours}:${minutes}`);
            }
            return { name: window.name, slots };
        });
    }, [settings.weeklySchedule, settings.serviceWindows]);

    const renderCustomerView = () => (
        <>
            <header className="text-center mb-8">
                <h1 className="text-4xl md:text-5xl font-bold text-[var(--text-accent)] tracking-tight">
                    {settings.restaurantName}
                </h1>
                <p className="text-[var(--text-secondary)] mt-2 text-lg">{t('header.subtitle')}</p>
            </header>
            <main className="w-full max-w-lg">
                <BookingForm 
                    onBook={handleBookingRequest} 
                    initialDetails={currentBookingDetails} 
                    error={error} 
                    t={t}
                    weeklySchedule={settings.weeklySchedule}
                    getGroupedSlotsForDate={getGroupedSlotsForDate}
                    activePlan={settings.activePlan}
                    restaurantName={settings.restaurantName}
                    restaurantAddress={settings.restaurantAddress}
                />
            </main>
        </>
    );

    const renderAdminView = () => {
        if (adminView === 'settings') {
            return (
                <div className="w-full max-w-4xl mx-auto">
                    <header className="text-center mb-8">
                        <h1 className="text-4xl md:text-5xl font-bold text-[var(--text-accent)] tracking-tight">
                            <span className="text-[var(--text-primary)]">Impostazioni</span> Ristorante
                        </h1>
                        <p className="text-[var(--text-secondary)] mt-2 text-lg">Modifica le impostazioni e le disponibilità del tuo locale.</p>
                    </header>
                    <AdminSettings 
                        settings={settings}
                        onUpdateSettings={handleSettingsUpdate}
                        onBack={() => setAdminView('dashboard')}
                    />
                </div>
            );
        }

        return (
            <div className="w-full max-w-7xl mx-auto">
                <header className="flex justify-center items-center text-center mb-8 relative">
                    <div>
                        <h1 className="text-4xl md:text-5xl font-bold text-[var(--text-accent)] tracking-tight">
                            <span className="text-[var(--text-primary)]">Pannello</span> Ristorante
                        </h1>
                        <p className="text-[var(--text-secondary)] mt-2 text-lg">Gestisci le tue prenotazioni.</p>
                    </div>
                    <button 
                        onClick={() => setAdminView('settings')}
                        className="absolute right-0 top-1/2 -translate-y-1/2 p-3 bg-[var(--background-secondary)] rounded-full border border-[var(--border-primary)] text-[var(--text-secondary)] hover:text-[var(--text-accent)] hover:border-[var(--border-secondary)] transition-all"
                        aria-label="Vai alle impostazioni"
                    >
                        <Icon name="cog" className="w-6 h-6"/>
                    </button>
                </header>
                <AdminDashboard 
                    bookings={bookings} 
                    onUpdateStatus={handleUpdateBookingStatus}
                    settings={settings}
                    onUpdateSettings={handleSettingsUpdate}
                />
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-[var(--background-primary)] flex flex-col items-center p-4 font-sans antialiased">
            <nav className="w-full max-w-7xl mx-auto p-4 mb-4 bg-[var(--background-secondary)]/80 rounded-xl border border-[var(--border-primary)]">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    {/* Logo and Name */}
                    <div className="flex items-center justify-center gap-3">
                       <Icon name="logo" className="w-8 h-8 text-[var(--text-accent)]" />
                       <span className="text-xl font-bold text-[var(--text-primary)]">{settings.restaurantName}</span>
                    </div>
                    
                    {/* Actions container */}
                    <div className="flex items-center justify-between md:justify-end md:gap-4">
                        <LanguageSwitcher currentLang={language} onLanguageChange={setLanguage} />
                        <div className="flex items-center gap-2 bg-[var(--background-tertiary)] p-1 rounded-lg">
                            <button onClick={() => handleViewChange('customer')} className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors ${view === 'customer' ? 'bg-[var(--accent-primary)] text-[var(--accent-text)]' : 'text-[var(--text-secondary)] hover:bg-[var(--background-interactive)]'}`}>
                                {t('nav.book')}
                            </button>
                            <button onClick={() => handleViewChange('admin')} className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors ${view === 'admin' ? 'bg-[var(--accent-primary)] text-[var(--accent-text)]' : 'text-[var(--text-secondary)] hover:bg-[var(--background-interactive)]'}`}>
                                Admin
                            </button>
                        </div>
                    </div>
                </div>
            </nav>
            
            <div className="w-full flex-1 flex flex-col items-center justify-center">
                {view === 'customer' ? renderCustomerView() : renderAdminView()}
            </div>
            
            {step === AppStep.CONFIRMED && currentBookingDetails && confirmationMessages && (
                <ConfirmationModal
                    details={currentBookingDetails}
                    messages={confirmationMessages}
                    onNewBooking={handleNewBooking}
                    t={t}
                />
            )}

            {isNotificationModalOpen && notificationContent && (
                <NotificationModal
                    details={notificationContent.details}
                    messages={notificationContent.messages}
                    onClose={() => setIsNotificationModalOpen(false)}
                />
            )}

            {isLoading && (
              <div className="fixed inset-0 bg-black bg-opacity-70 flex flex-col items-center justify-center z-50">
                  <div className="w-16 h-16 border-4 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-white mt-4 text-lg">{step === AppStep.CONFIRMING ? t('loader.booking') : 'Conferma in corso...'}</p>
              </div>
            )}
        </div>
    );
};

export default App;