import React, { useState, useRef } from 'react';
import { DayOfWeek, AdminSettings as AdminSettingsType, Table, TableCombinationRule, BookingDurationRule, ServiceWindow, Plan, Theme } from '../types';
import Icon from './Icon';
import ThemeSelector from './ThemeSelector';

interface AdminSettingsProps {
    settings: AdminSettingsType;
    onUpdateSettings: (settings: Partial<AdminSettingsType>) => void;
    onBack: () => void;
}

const dayLabels: Record<DayOfWeek, string> = {
    [DayOfWeek.SUNDAY]: 'Domenica',
    [DayOfWeek.MONDAY]: 'Lunedì',
    [DayOfWeek.TUESDAY]: 'Martedì',
    [DayOfWeek.WEDNESDAY]: 'Mercoledì',
    [DayOfWeek.THURSDAY]: 'Giovedì',
    [DayOfWeek.FRIDAY]: 'Venerdì',
    [DayOfWeek.SATURDAY]: 'Sabato',
};
const dayOrder: DayOfWeek[] = [DayOfWeek.MONDAY, DayOfWeek.TUESDAY, DayOfWeek.WEDNESDAY, DayOfWeek.THURSDAY, DayOfWeek.FRIDAY, DayOfWeek.SATURDAY, DayOfWeek.SUNDAY];

const PlanSelector: React.FC<{ activePlan: Plan; onSelect: (plan: Plan) => void }> = ({ activePlan, onSelect }) => (
    <div className="bg-[var(--background-primary)] p-4 rounded-lg border border-[var(--border-primary)]">
        <h3 className="text-xl font-bold text-[var(--text-primary)] mb-3">Seleziona il tuo piano</h3>
        <div className="flex items-center gap-2 bg-[var(--background-secondary)] p-1 rounded-lg">
            <button onClick={() => onSelect(Plan.BASIC)} className={`w-full py-2 text-sm font-semibold rounded-md transition-colors ${activePlan === Plan.BASIC ? 'bg-[var(--accent-primary)] text-[var(--accent-text)]' : 'text-[var(--text-secondary)] hover:bg-[var(--background-interactive)]'}`}>
                BASIC
            </button>
            <button onClick={() => onSelect(Plan.PRO)} className={`w-full py-2 text-sm font-semibold rounded-md transition-colors ${activePlan === Plan.PRO ? 'bg-[var(--accent-primary)] text-[var(--accent-text)]' : 'text-[var(--text-secondary)] hover:bg-[var(--background-interactive)]'}`}>
                PRO
            </button>
        </div>
        <p className="text-xs text-[var(--text-secondary)]/80 mt-2">
            {activePlan === Plan.BASIC
                ? 'Ideale per una gestione semplice basata sul numero totale di coperti.'
                : 'Gestione avanzata con tavoli, combinazioni e regole di durata.'
            }
        </p>
    </div>
);

const InfoIconWithTooltip: React.FC<{ text: string }> = ({ text }) => (
    <div className="group relative flex items-center">
        <Icon name="info-circle" className="w-5 h-5 text-[var(--text-secondary)]/80 cursor-pointer" />
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 bg-[var(--background-tertiary)] text-[var(--text-primary)] text-xs font-normal rounded-lg p-3 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-lg border border-[var(--border-secondary)]">
            {text.split('**').map((part, index) => 
                index % 2 === 1 ? <strong key={index} className="font-bold text-[var(--text-accent)]">{part}</strong> : part
            )}
        </div>
    </div>
);

const OpeningHoursManager: React.FC<Pick<AdminSettingsProps, 'settings' | 'onUpdateSettings'>> = ({ settings, onUpdateSettings }) => {
    // Form state for service windows
    const [swName, setSwName] = useState('');
    const [swStartTime, setSwStartTime] = useState('19:00');
    const [swEndTime, setSwEndTime] = useState('22:00');
    const [swInterval, setSwInterval] = useState(30);

    const handleAddServiceWindow = () => {
        if (!swName.trim() || !swStartTime || !swEndTime || swInterval < 15) return;
        onUpdateSettings({ serviceWindows: [...settings.serviceWindows, { id: `sw-${Date.now()}`, name: swName, startTime: swStartTime, endTime: swEndTime, slotInterval: swInterval }] });
        setSwName('');
    };
    const handleRemoveServiceWindow = (idToRemove: string) => {
        const newWeeklySchedule = { ...settings.weeklySchedule };
        for (const day in newWeeklySchedule) {
            newWeeklySchedule[day as DayOfWeek] = newWeeklySchedule[day as DayOfWeek].filter(id => id !== idToRemove);
        }
        onUpdateSettings({ serviceWindows: settings.serviceWindows.filter(sw => sw.id !== idToRemove), weeklySchedule: newWeeklySchedule });
    };
    const handleScheduleChange = (day: DayOfWeek, windowId: string) => {
        const currentWindows = settings.weeklySchedule[day] || [];
        const newWindows = currentWindows.includes(windowId) ? currentWindows.filter(id => id !== windowId) : [...currentWindows, windowId];
        onUpdateSettings({ weeklySchedule: { ...settings.weeklySchedule, [day]: newWindows } });
    };
    
    return (
        <div className="space-y-4">
            <h3 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
                <Icon name="clock" className="w-6 h-6 text-[var(--text-accent)]"/>
                Orari di Apertura e Fasce di Servizio
                <InfoIconWithTooltip text="Qui definisci quando il tuo ristorante è aperto. **Prima crea le fasce di servizio** (es. 'Pranzo' dalle 12:00 alle 15:00), **poi applicale ai giorni della settimana**. Questo permette al sistema di sapere esattamente quali orari proporre per le prenotazioni." />
            </h3>
            <div className="bg-[var(--background-primary)] p-4 rounded-lg border border-[var(--border-primary)]">
                <h4 className="font-semibold text-[var(--text-secondary)] mb-3">1. Definisci le Fasce di Servizio</h4>
                 <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
                    <input type="text" placeholder="Nome (es. Pranzo)" value={swName} onChange={e => setSwName(e.target.value)} className="md:col-span-2 bg-[var(--input-background)] text-[var(--input-text)] placeholder:text-[var(--input-placeholder)] border border-[var(--border-secondary)] rounded-md p-2 focus:ring-2 focus:border-[var(--accent-primary)] focus:ring-[var(--accent-primary)] outline-none" />
                    <input type="time" title="Orario Inizio" value={swStartTime} onChange={e => setSwStartTime(e.target.value)} className="bg-[var(--input-background)] text-[var(--input-text)] border border-[var(--border-secondary)] rounded-md p-2 focus:ring-2 focus:border-[var(--accent-primary)] focus:ring-[var(--accent-primary)] outline-none" />
                    <input type="time" title="Orario Fine" value={swEndTime} onChange={e => setSwEndTime(e.target.value)} className="bg-[var(--input-background)] text-[var(--input-text)] border border-[var(--border-secondary)] rounded-md p-2 focus:ring-2 focus:border-[var(--accent-primary)] focus:ring-[var(--accent-primary)] outline-none" />
                    <input type="number" title="Intervallo Slot (min)" value={swInterval} onChange={e => setSwInterval(parseInt(e.target.value, 10))} min="15" step="15" className="bg-[var(--input-background)] text-[var(--input-text)] border border-[var(--border-secondary)] rounded-md p-2 focus:ring-2 focus:border-[var(--accent-primary)] focus:ring-[var(--accent-primary)] outline-none" />
                </div>
                <button onClick={handleAddServiceWindow} className="mt-3 w-full md:w-auto bg-[var(--accent-primary)]/80 text-[var(--accent-text)] font-bold py-2 px-4 rounded-lg hover:bg-[var(--accent-primary)] text-sm">Aggiungi Fascia</button>
                <div className="mt-4 flex flex-wrap gap-2">
                    {settings.serviceWindows.map(sw => (
                        <div key={sw.id} className="flex items-center gap-2 bg-[var(--background-tertiary)] rounded-full px-3 py-1 text-sm font-semibold text-[var(--text-primary)]">
                            {sw.name} ({sw.startTime}-{sw.endTime})
                            <button onClick={() => handleRemoveServiceWindow(sw.id)} className="text-[var(--negative)] hover:text-[var(--negative-text)]"><Icon name="x-circle" className="w-4 h-4" /></button>
                        </div>
                    ))}
                </div>
            </div>
            <div className="bg-[var(--background-primary)] p-4 rounded-lg border border-[var(--border-primary)]">
                <h4 className="font-semibold text-[var(--text-secondary)] mb-3">2. Applica le Fasce all'Orario Settimanale</h4>
                <div className="space-y-3">
                    {dayOrder.map(day => (
                        <div key={day} className="flex items-center justify-between p-2 rounded-md bg-[var(--background-secondary)]/50">
                            <span className="font-semibold text-[var(--text-primary)] w-28">{dayLabels[day]}</span>
                            <div className="flex items-center gap-4">
                                {settings.serviceWindows.length > 0 ? settings.serviceWindows.map(sw => (
                                    <label key={sw.id} className="flex items-center gap-2 text-[var(--text-secondary)] cursor-pointer">
                                        <input type="checkbox" checked={settings.weeklySchedule[day]?.includes(sw.id)} onChange={() => handleScheduleChange(day, sw.id)} className="custom-checkbox h-4 w-4 rounded focus:ring-2 focus:ring-offset-2 focus:ring-offset-[var(--background-secondary)] focus:ring-[var(--accent-primary)]"/>
                                        {sw.name}
                                    </label>
                                )) : <p className="text-xs text-[var(--text-secondary)]/80">Nessuna fascia definita</p>}
                            </div>
                            {settings.weeklySchedule[day]?.length === 0 || !settings.weeklySchedule[day] ? (
                                <span className="text-xs font-bold text-[var(--negative)] bg-[var(--negative-background)] px-2 py-1 rounded-full">CHIUSO</span>
                            ) : (
                                <span className="text-xs font-bold text-[var(--positive)] bg-[var(--positive-background)] px-2 py-1 rounded-full">APERTO</span>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const AdminSettings: React.FC<AdminSettingsProps> = ({ settings, onUpdateSettings, onBack }) => {
    const [saveMessage, setSaveMessage] = useState('');
    const saveTimeoutRef = useRef<number | null>(null);

    const [dbTestStatus, setDbTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
    const [dbTestMessage, setDbTestMessage] = useState('');

    // This wrapper function shows the save confirmation message
    const handleSettingChange = (update: Partial<AdminSettingsType>) => {
        onUpdateSettings(update);
        setSaveMessage('Impostazioni salvate!');
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }
        saveTimeoutRef.current = window.setTimeout(() => setSaveMessage(''), 2500);
    };

    // PRO settings state and handlers
    const [newTableName, setNewTableName] = useState('');
    const [newTableCapacity, setNewTableCapacity] = useState(2);
    const [isCombinable, setIsCombinable] = useState(true);
    const [ruleCount, setRuleCount] = useState(2);
    const [ruleTableCapacity, setRuleTableCapacity] = useState(4);
    const [ruleNewCapacity, setRuleNewCapacity] = useState(6);
    const [durationMinGuests, setDurationMinGuests] = useState(1);
    const [durationMaxGuests, setDurationMaxGuests] = useState(2);
    const [durationMinutes, setDurationMinutes] = useState(90);
    
    const handleAddTable = () => {
        if (!newTableName.trim() || newTableCapacity < 1) return;
        const newTable: Table = { id: `table-${Date.now()}`, name: newTableName, capacity: newTableCapacity, isCombinable: isCombinable };
        handleSettingChange({ tables: [...settings.tables, newTable].sort((a, b) => a.name.localeCompare(b.name)) });
        setNewTableName(''); setNewTableCapacity(2); setIsCombinable(true);
    };
    const handleRemoveTable = (id: string) => handleSettingChange({ tables: settings.tables.filter(t => t.id !== id) });
    const handleAddRule = () => {
        if (ruleCount < 2 || ruleTableCapacity < 1 || ruleNewCapacity < 1) return;
        handleSettingChange({ combinationRules: [...settings.combinationRules, { id: `rule-${Date.now()}`, count: ruleCount, tableCapacity: ruleTableCapacity, newCapacity: ruleNewCapacity }] });
    };
    const handleRemoveRule = (id: string) => handleSettingChange({ combinationRules: settings.combinationRules.filter(r => r.id !== id) });
    const handleAddDurationRule = () => {
        if (durationMinGuests < 1 || durationMaxGuests < durationMinGuests || durationMinutes < 30) return;
        handleSettingChange({ bookingDurationRules: [...settings.bookingDurationRules, { id: `duration-${Date.now()}`, minGuests: durationMinGuests, maxGuests: durationMaxGuests, durationMinutes: durationMinutes }] });
    };
    const handleRemoveDurationRule = (id: string) => handleSettingChange({ bookingDurationRules: settings.bookingDurationRules.filter(r => r.id !== id) });

    // BASIC settings handler
    const handleMaxGuestsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        handleSettingChange({ maxGuestsPerSlot: parseInt(e.target.value, 10) || 0 });
    };

     const handleTestDbConnection = async () => {
        setDbTestStatus('testing');
        setDbTestMessage('');
        try {
            const response = await fetch('/api/db-test');
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || 'Errore sconosciuto');
            }
            setDbTestStatus('success');
            setDbTestMessage(`Connessione riuscita! Ora del server: ${new Date(data.time).toLocaleString('it-IT')}`);
        } catch (err) {
            setDbTestStatus('error');
            const errorMessage = err instanceof Error ? err.message : 'Si è verificato un errore.';
            setDbTestMessage(`Connessione fallita: ${errorMessage}. Controlla le variabili d'ambiente del database in Vercel.`);
        }
    };

    const DisabledSectionWrapper: React.FC<{ isDisabled: boolean; children: React.ReactNode; planName: 'PRO' | 'BASIC' }> = ({ isDisabled, children, planName }) => {
        if (!isDisabled) {
            return <>{children}</>;
        }
    
        const message = planName === 'PRO'
            ? "Passa al piano PRO per sbloccare la gestione avanzata di tavoli, combinazioni e turnover."
            : "Questa è una funzionalità del piano BASIC per una gestione semplificata. Attiva il piano BASIC per usarla.";
    
        return (
            <div className="relative my-8">
                {/* Content is now readable underneath */}
                <div className="pointer-events-none select-none" aria-hidden="true">
                    {children}
                </div>

                {/* A semi-transparent overlay instead of blur + opacity on content */}
                <div className="absolute inset-0 bg-[var(--background-secondary)] opacity-80 rounded-xl"></div>
                
                {/* The message on top */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4 z-10">
                    <div className="bg-[var(--background-tertiary)]/80 backdrop-blur-sm p-6 rounded-lg border border-[var(--border-primary)] shadow-lg max-w-sm">
                        <Icon name="lock" className="w-8 h-8 text-[var(--text-accent)] mx-auto mb-3" />
                        <h4 className="font-bold text-lg text-[var(--text-primary)]">
                            Funzionalità {planName} Bloccata
                        </h4>
                        <p className="text-sm text-[var(--text-secondary)] mt-1 mb-4">
                            {message}
                        </p>
                        {planName === 'PRO' && (
                            <button
                              onClick={() => handleSettingChange({ activePlan: Plan.PRO })}
                              className="w-full bg-[var(--accent-primary)] text-[var(--accent-text)] font-bold py-2 px-4 rounded-lg hover:bg-[var(--accent-primary-hover)] transition-colors text-sm">
                                Fai l'Upgrade al Piano PRO
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    const renderBasicSettings = () => (
        <>
            <OpeningHoursManager settings={settings} onUpdateSettings={handleSettingChange} />
            <div className="bg-[var(--background-primary)] p-4 rounded-lg border border-[var(--border-primary)]">
                <h3 className="text-xl font-bold text-[var(--text-primary)] mb-3 flex items-center gap-2"><Icon name="users" className="w-6 h-6 text-[var(--text-accent)]"/>Capienza Massima</h3>
                <label htmlFor="maxGuests" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Numero massimo di coperti totali per ogni fascia oraria</label>
                <input id="maxGuests" type="number" value={settings.maxGuestsPerSlot} onChange={handleMaxGuestsChange} min="1" className="w-full bg-[var(--input-background)] text-[var(--input-text)] border border-[var(--border-secondary)] rounded-md p-2 focus:ring-2 focus:border-[var(--accent-primary)] focus:ring-[var(--accent-primary)] outline-none" />
            </div>
            <DisabledSectionWrapper isDisabled={true} planName="PRO">
                 {renderProFeatures()}
            </DisabledSectionWrapper>
        </>
    );

    const renderProFeatures = () => (
         <div className="space-y-8">
            {/* Table Management */}
            <div className="space-y-4">
                <h3 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
                    <Icon name="users" className="w-6 h-6 text-[var(--text-accent)]"/>
                    Gestione Sala e Tavoli
                    <InfoIconWithTooltip text="In questa sezione puoi mappare la tua sala. **Aggiungi ogni tavolo** specificando il nome (es. T1, T2) e la sua capienza. Se più tavoli possono essere uniti per gruppi più grandi, **spunta 'Combinabile'**. Questo è fondamentale per il piano PRO." />
                </h3>
                <div className="bg-[var(--background-primary)] p-4 rounded-lg border border-[var(--border-primary)]">
                    <h4 className="font-semibold text-[var(--text-secondary)] mb-3">Aggiungi un nuovo tavolo</h4>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                        <input type="text" placeholder="Nome (es. T1)" value={newTableName} onChange={e => setNewTableName(e.target.value)} className="md:col-span-2 bg-[var(--input-background)] text-[var(--input-text)] placeholder:text-[var(--input-placeholder)] border border-[var(--border-secondary)] rounded-md p-2 focus:ring-2 focus:border-[var(--accent-primary)] focus:ring-[var(--accent-primary)] outline-none"/>
                        <input type="number" placeholder="Capienza" value={newTableCapacity} onChange={e => setNewTableCapacity(parseInt(e.target.value, 10))} min="1" className="bg-[var(--input-background)] text-[var(--input-text)] border border-[var(--border-secondary)] rounded-md p-2 focus:ring-2 focus:border-[var(--accent-primary)] focus:ring-[var(--accent-primary)] outline-none" />
                        <div className="flex items-center gap-2 h-full">
                           <input id="isCombinable" type="checkbox" checked={isCombinable} onChange={e => setIsCombinable(e.target.checked)} className="custom-checkbox h-4 w-4 rounded focus:ring-2 focus:ring-offset-2 focus:ring-offset-[var(--background-secondary)] focus:ring-[var(--accent-primary)]"/>
                           <label htmlFor="isCombinable" className="text-sm text-[var(--text-secondary)]">Combinabile</label>
                        </div>
                    </div>
                     <button onClick={handleAddTable} className="mt-3 w-full md:w-auto bg-[var(--accent-primary)]/80 text-[var(--accent-text)] font-bold py-2 px-4 rounded-lg hover:bg-[var(--accent-primary)] text-sm">Aggiungi Tavolo</button>
                </div>
                <div className="max-h-48 overflow-y-auto space-y-2 pr-2">
                   {settings.tables.map(table => (
                        <div key={table.id} className="flex items-center justify-between bg-[var(--background-tertiary)]/50 p-2 rounded-md">
                            <p className="text-[var(--text-primary)] font-semibold">{table.name} - <span className="text-[var(--text-accent)]">{table.capacity}p</span> <span className="text-[var(--text-secondary)] text-xs">{table.isCombinable ? '(Combinabile)' : ''}</span></p>
                            <button onClick={() => handleRemoveTable(table.id)} className="text-[var(--negative)] hover:text-[var(--negative-text)] p-1"><Icon name="x-circle" className="w-5 h-5"/></button>
                        </div>
                   ))}
                </div>
            </div>

            {/* Combination Rules */}
            <div className="space-y-4">
                <h3 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
                    <Icon name="cog" className="w-6 h-6 text-[var(--text-accent)]"/>
                    Regole di Combinazione
                    <InfoIconWithTooltip text="Qui definisci come i tavoli 'Combinabili' possono essere uniti. **Esempio**: se unendo 2 tavoli da 4 persone si ottiene un tavolo per 6 (e non 8, per motivi di spazio), puoi creare una regola qui. Questo permette al sistema di accettare prenotazioni per gruppi più grandi in modo intelligente." />
                </h3>
                <div className="bg-[var(--background-primary)] p-4 rounded-lg border border-[var(--border-primary)]">
                    <h4 className="font-semibold text-[var(--text-secondary)] mb-3">Aggiungi regola</h4>
                    <div className="flex items-center gap-2 text-[var(--text-secondary)] flex-wrap">
                        <span>Unendo</span>
                        <input type="number" value={ruleCount} onChange={e => setRuleCount(parseInt(e.target.value, 10))} min="2" className="w-16 bg-[var(--input-background)] text-[var(--input-text)] border border-[var(--border-secondary)] rounded-md p-2 focus:ring-2 focus:border-[var(--accent-primary)] focus:ring-[var(--accent-primary)] outline-none" />
                        <span>tavoli da</span>
                        <input type="number" value={ruleTableCapacity} onChange={e => setRuleTableCapacity(parseInt(e.target.value, 10))} min="1" className="w-16 bg-[var(--input-background)] text-[var(--input-text)] border border-[var(--border-secondary)] rounded-md p-2 focus:ring-2 focus:border-[var(--accent-primary)] focus:ring-[var(--accent-primary)] outline-none" />
                        <span>persone, la capienza è</span>
                         <input type="number" value={ruleNewCapacity} onChange={e => setRuleNewCapacity(parseInt(e.target.value, 10))} min="1" className="w-16 bg-[var(--input-background)] text-[var(--input-text)] border border-[var(--border-secondary)] rounded-md p-2 focus:ring-2 focus:border-[var(--accent-primary)] focus:ring-[var(--accent-primary)] outline-none" />
                        <button onClick={handleAddRule} className="ml-auto bg-[var(--accent-primary)]/80 text-[var(--accent-text)] font-bold py-2 px-4 rounded-lg hover:bg-[var(--accent-primary)] text-sm">Aggiungi Regola</button>
                    </div>
                </div>
                 <div className="max-h-32 overflow-y-auto space-y-2 pr-2">
                   {settings.combinationRules.map(rule => (
                        <div key={rule.id} className="flex items-center justify-between bg-[var(--background-tertiary)]/50 p-2 rounded-md">
                            <p className="text-[var(--text-primary)] text-sm">Unendo {rule.count} tavoli da {rule.tableCapacity}p, si ottengono {rule.newCapacity} posti.</p>
                            <button onClick={() => handleRemoveRule(rule.id)} className="text-[var(--negative)] hover:text-[var(--negative-text)] p-1"><Icon name="x-circle" className="w-5 h-5"/></button>
                        </div>
                   ))}
                </div>
            </div>

             {/* Duration Rules */}
            <div className="space-y-4">
                <h3 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
                    <Icon name="clock" className="w-6 h-6 text-[var(--text-accent)]"/>
                    Gestione Turnover e Durata
                    <InfoIconWithTooltip text="Definisci quanto tempo un tavolo rimane occupato in base al numero di persone. **Esempio**: una coppia (1-2 persone) potrebbe occupare il tavolo per 90 minuti, mentre un gruppo più grande (5+ persone) per 150 minuti. Questo ottimizza la disponibilità." />
                </h3>
                <div className="bg-[var(--background-primary)] p-4 rounded-lg border border-[var(--border-primary)]">
                    <h4 className="font-semibold text-[var(--text-secondary)] mb-3">Aggiungi regola di durata</h4>
                    <div className="flex items-center gap-2 text-[var(--text-secondary)] flex-wrap">
                        <span>Da</span>
                        <input type="number" value={durationMinGuests} onChange={e => setDurationMinGuests(parseInt(e.target.value, 10))} min="1" className="w-16 bg-[var(--input-background)] text-[var(--input-text)] border border-[var(--border-secondary)] rounded-md p-2 focus:ring-2 focus:border-[var(--accent-primary)] focus:ring-[var(--accent-primary)] outline-none" />
                        <span>a</span>
                        <input type="number" value={durationMaxGuests} onChange={e => setDurationMaxGuests(parseInt(e.target.value, 10))} min={durationMinGuests} className="w-16 bg-[var(--input-background)] text-[var(--input-text)] border border-[var(--border-secondary)] rounded-md p-2 focus:ring-2 focus:border-[var(--accent-primary)] focus:ring-[var(--accent-primary)] outline-none" />
                        <span>persone, durata</span>
                         <input type="number" value={durationMinutes} onChange={e => setDurationMinutes(parseInt(e.target.value, 10))} min="30" step="15" className="w-20 bg-[var(--input-background)] text-[var(--input-text)] border border-[var(--border-secondary)] rounded-md p-2 focus:ring-2 focus:border-[var(--accent-primary)] focus:ring-[var(--accent-primary)] outline-none" />
                        <span>minuti.</span>
                        <button onClick={handleAddDurationRule} className="ml-auto bg-[var(--accent-primary)]/80 text-[var(--accent-text)] font-bold py-2 px-4 rounded-lg hover:bg-[var(--accent-primary)] text-sm">Aggiungi</button>
                    </div>
                </div>
                 <div className="max-h-32 overflow-y-auto space-y-2 pr-2">
                   {settings.bookingDurationRules.sort((a, b) => a.minGuests - b.minGuests).map(rule => (
                        <div key={rule.id} className="flex items-center justify-between bg-[var(--background-tertiary)]/50 p-2 rounded-md">
                            <p className="text-[var(--text-primary)] text-sm">Da {rule.minGuests} a {rule.maxGuests} persone: {rule.durationMinutes} minuti</p>
                            <button onClick={() => handleRemoveDurationRule(rule.id)} className="text-[var(--negative)] hover:text-[var(--negative-text)] p-1"><Icon name="x-circle" className="w-5 h-5"/></button>
                        </div>
                   ))}
                </div>
            </div>
        </div>
    );

    const renderProSettings = () => (
        <>
            <OpeningHoursManager settings={settings} onUpdateSettings={handleSettingChange} />
            {renderProFeatures()}
        </>
    );

    return (
        <div className="bg-[var(--background-secondary)] p-6 rounded-xl border border-[var(--border-primary)] space-y-8">
            {saveMessage && (
                <div className="fixed top-28 left-1/2 -translate-x-1/2 z-20 p-3 mb-4 bg-[var(--positive-background)] text-[var(--positive-text)] text-sm font-semibold rounded-lg text-center transition-all duration-300 shadow-lg animate-fade-in-down">
                    {saveMessage}
                    <style>{`@keyframes fade-in-down { 0% { opacity: 0; transform: translate(-50%, -20px); } 100% { opacity: 1; transform: translate(-50%, 0); } } .animate-fade-in-down { animation: fade-in-down 0.3s ease-out forwards; }`}</style>
                </div>
            )}

            <PlanSelector activePlan={settings.activePlan} onSelect={plan => handleSettingChange({ activePlan: plan })} />

            <div className="space-y-4">
                <h3 className="text-xl font-bold text-[var(--text-primary)]">Informazioni Generali</h3>
                 <div className="bg-[var(--background-primary)] p-4 rounded-lg border border-[var(--border-primary)]">
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="restaurantName" className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Nome Ristorante</label>
                            <input id="restaurantName" type="text" value={settings.restaurantName} onChange={(e) => handleSettingChange({ restaurantName: e.target.value })}
                                className="w-full bg-[var(--input-background)] text-[var(--input-text)] placeholder:text-[var(--input-placeholder)] border border-[var(--border-secondary)] rounded-md p-2 focus:ring-2 focus:border-[var(--accent-primary)] focus:ring-[var(--accent-primary)] outline-none" />
                        </div>
                        <div>
                            <label htmlFor="restaurantAddress" className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Indirizzo Ristorante</label>
                            <input id="restaurantAddress" type="text" value={settings.restaurantAddress} onChange={(e) => handleSettingChange({ restaurantAddress: e.target.value })}
                                placeholder="Es. Via Roma, 1, 10121 Torino TO"
                                className="w-full bg-[var(--input-background)] text-[var(--input-text)] placeholder:text-[var(--input-placeholder)] border border-[var(--border-secondary)] rounded-md p-2 focus:ring-2 focus:border-[var(--accent-primary)] focus:ring-[var(--accent-primary)] outline-none" />
                        </div>
                        <div>
                            <label htmlFor="reviewLink" className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Easystar Review Link</label>
                            <input id="reviewLink" type="url" value={settings.reviewLink} onChange={(e) => handleSettingChange({ reviewLink: e.target.value })}
                                placeholder="https://..."
                                className="w-full bg-[var(--input-background)] text-[var(--input-text)] placeholder:text-[var(--input-placeholder)] border border-[var(--border-secondary)] rounded-md p-2 focus:ring-2 focus:border-[var(--accent-primary)] focus:ring-[var(--accent-primary)] outline-none" />
                        </div>
                    </div>
                </div>
            </div>
            
            <div className="space-y-4">
                <h3 className="text-xl font-bold text-[var(--text-primary)]">Aspetto</h3>
                <ThemeSelector
                    currentTheme={settings.theme}
                    onThemeChange={theme => handleSettingChange({ theme })}
                />
            </div>

             <div className="space-y-4">
                <h3 className="text-xl font-bold text-[var(--text-primary)]">Diagnostica</h3>
                 <div className="bg-[var(--background-primary)] p-4 rounded-lg border border-[var(--border-primary)]">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Test Connessione Database</label>
                            <p className="text-xs text-[var(--text-secondary)]/80 mb-3">Verifica che l'applicazione sia in grado di connettersi correttamente al database Postgres configurato su Vercel.</p>
                            <button 
                                onClick={handleTestDbConnection}
                                disabled={dbTestStatus === 'testing'}
                                className="w-full md:w-auto bg-[var(--accent-primary)]/80 text-[var(--accent-text)] font-bold py-2 px-4 rounded-lg hover:bg-[var(--accent-primary)] text-sm disabled:opacity-50 disabled:cursor-wait"
                            >
                                {dbTestStatus === 'testing' ? 'Test in corso...' : 'Esegui Test'}
                            </button>
                            {dbTestMessage && (
                                <div className={`mt-4 p-3 rounded-lg text-sm ${
                                    dbTestStatus === 'success' ? 'bg-[var(--positive-background)] text-[var(--positive-text)]' : 
                                    dbTestStatus === 'error' ? 'bg-[var(--negative-background)] text-[var(--negative-text)]' : ''
                                }`}>
                                    {dbTestMessage}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            
            {settings.activePlan === Plan.BASIC ? renderBasicSettings() : renderProSettings()}

            <div className="pt-4 border-t border-[var(--border-primary)]/50">
                <button onClick={onBack} className="w-full bg-[var(--accent-primary)] text-[var(--accent-text)] font-bold py-3 px-4 rounded-lg hover:bg-[var(--accent-primary-hover)] transition-colors duration-300">
                    Torna alla Dashboard
                </button>
            </div>
        </div>
    );
};

export default AdminSettings;