import React, { useState } from 'react';
import { DayOfWeek, AdminSettings as AdminSettingsType, Table, TableCombinationRule, BookingDurationRule, ServiceWindow, Plan } from '../types';
import Icon from './Icon';

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
    <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700">
        <h3 className="text-xl font-bold text-white mb-3">Seleziona il tuo piano</h3>
        <div className="flex items-center gap-2 bg-gray-800 p-1 rounded-lg">
            <button onClick={() => onSelect(Plan.BASIC)} className={`w-full py-2 text-sm font-semibold rounded-md transition-colors ${activePlan === Plan.BASIC ? 'bg-amber-500 text-gray-900' : 'text-gray-300 hover:bg-gray-700'}`}>
                BASIC
            </button>
            <button onClick={() => onSelect(Plan.PRO)} className={`w-full py-2 text-sm font-semibold rounded-md transition-colors ${activePlan === Plan.PRO ? 'bg-amber-500 text-gray-900' : 'text-gray-300 hover:bg-gray-700'}`}>
                PRO
            </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
            {activePlan === Plan.BASIC
                ? 'Ideale per una gestione semplice basata sul numero totale di coperti.'
                : 'Gestione avanzata con tavoli, combinazioni e regole di durata.'
            }
        </p>
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
            <h3 className="text-xl font-bold text-white flex items-center gap-2"><Icon name="clock" className="w-6 h-6 text-amber-400"/>Orari di Apertura e Fasce di Servizio</h3>
            <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700">
                <h4 className="font-semibold text-gray-300 mb-3">1. Definisci le Fasce di Servizio</h4>
                 <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
                    <input type="text" placeholder="Nome (es. Pranzo)" value={swName} onChange={e => setSwName(e.target.value)} className="md:col-span-2 bg-gray-800 border-gray-600 rounded-md p-2 focus:ring-1 focus:ring-amber-500" />
                    <input type="time" title="Orario Inizio" value={swStartTime} onChange={e => setSwStartTime(e.target.value)} className="bg-gray-800 border-gray-600 rounded-md p-2 focus:ring-1 focus:ring-amber-500" />
                    <input type="time" title="Orario Fine" value={swEndTime} onChange={e => setSwEndTime(e.target.value)} className="bg-gray-800 border-gray-600 rounded-md p-2 focus:ring-1 focus:ring-amber-500" />
                    <input type="number" title="Intervallo Slot (min)" value={swInterval} onChange={e => setSwInterval(parseInt(e.target.value, 10))} min="15" step="15" className="bg-gray-800 border-gray-600 rounded-md p-2 focus:ring-1 focus:ring-amber-500" />
                </div>
                <button onClick={handleAddServiceWindow} className="mt-3 w-full md:w-auto bg-amber-500/80 text-gray-900 font-bold py-2 px-4 rounded-lg hover:bg-amber-500 text-sm">Aggiungi Fascia</button>
                <div className="mt-4 flex flex-wrap gap-2">
                    {settings.serviceWindows.map(sw => (
                        <div key={sw.id} className="flex items-center gap-2 bg-gray-700 rounded-full px-3 py-1 text-sm font-semibold text-white">
                            {sw.name} ({sw.startTime}-{sw.endTime})
                            <button onClick={() => handleRemoveServiceWindow(sw.id)} className="text-red-400 hover:text-red-300"><Icon name="x-circle" className="w-4 h-4" /></button>
                        </div>
                    ))}
                </div>
            </div>
            <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700">
                <h4 className="font-semibold text-gray-300 mb-3">2. Applica le Fasce all'Orario Settimanale</h4>
                <div className="space-y-3">
                    {dayOrder.map(day => (
                        <div key={day} className="flex items-center justify-between p-2 rounded-md bg-gray-800/50">
                            <span className="font-semibold text-white w-28">{dayLabels[day]}</span>
                            <div className="flex items-center gap-4">
                                {settings.serviceWindows.length > 0 ? settings.serviceWindows.map(sw => (
                                    <label key={sw.id} className="flex items-center gap-2 text-gray-300 cursor-pointer">
                                        <input type="checkbox" checked={settings.weeklySchedule[day]?.includes(sw.id)} onChange={() => handleScheduleChange(day, sw.id)} className="h-4 w-4 rounded bg-gray-700 border-gray-600 text-amber-500 focus:ring-amber-600"/>
                                        {sw.name}
                                    </label>
                                )) : <p className="text-xs text-gray-500">Nessuna fascia definita</p>}
                            </div>
                            {settings.weeklySchedule[day]?.length === 0 || !settings.weeklySchedule[day] ? (
                                <span className="text-xs font-bold text-red-400 bg-red-500/10 px-2 py-1 rounded-full">CHIUSO</span>
                            ) : (
                                <span className="text-xs font-bold text-green-400 bg-green-500/10 px-2 py-1 rounded-full">APERTO</span>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};


const AdminSettingsPro: React.FC<AdminSettingsProps> = ({ settings, onUpdateSettings }) => {
     // Form state for adding a new table
    const [newTableName, setNewTableName] = useState('');
    const [newTableCapacity, setNewTableCapacity] = useState(2);
    const [isCombinable, setIsCombinable] = useState(true);
    // Form state for adding a new combination rule
    const [ruleCount, setRuleCount] = useState(2);
    const [ruleTableCapacity, setRuleTableCapacity] = useState(4);
    const [ruleNewCapacity, setRuleNewCapacity] = useState(6);
    // Form state for adding a new duration rule
    const [durationMinGuests, setDurationMinGuests] = useState(1);
    const [durationMaxGuests, setDurationMaxGuests] = useState(2);
    const [durationMinutes, setDurationMinutes] = useState(90);
    
    const handleAddTable = () => {
        if (!newTableName.trim() || newTableCapacity < 1) return;
        const newTable: Table = {
            id: `table-${Date.now()}`, name: newTableName, capacity: newTableCapacity, isCombinable: isCombinable
        };
        onUpdateSettings({ tables: [...settings.tables, newTable].sort((a,b) => a.name.localeCompare(b.name)) });
        setNewTableName(''); setNewTableCapacity(2); setIsCombinable(true);
    };
    const handleRemoveTable = (id: string) => onUpdateSettings({ tables: settings.tables.filter(t => t.id !== id) });
    const handleAddRule = () => {
        if (ruleCount < 2 || ruleTableCapacity < 1 || ruleNewCapacity < 1) return;
        onUpdateSettings({ combinationRules: [...settings.combinationRules, { id: `rule-${Date.now()}`, count: ruleCount, tableCapacity: ruleTableCapacity, newCapacity: ruleNewCapacity }] });
    };
    const handleRemoveRule = (id: string) => onUpdateSettings({ combinationRules: settings.combinationRules.filter(r => r.id !== id) });
    const handleAddDurationRule = () => {
        if (durationMinGuests < 1 || durationMaxGuests < durationMinGuests || durationMinutes < 30) return;
        onUpdateSettings({ bookingDurationRules: [...settings.bookingDurationRules, { id: `duration-${Date.now()}`, minGuests: durationMinGuests, maxGuests: durationMaxGuests, durationMinutes: durationMinutes }] });
    };
    const handleRemoveDurationRule = (id: string) => onUpdateSettings({ bookingDurationRules: settings.bookingDurationRules.filter(r => r.id !== id) });
    
    return (
        <div className="space-y-8">
            <OpeningHoursManager settings={settings} onUpdateSettings={onUpdateSettings} />

            {/* Table Management */}
            <div className="space-y-4">
                <h3 className="text-xl font-bold text-white flex items-center gap-2"><Icon name="users" className="w-6 h-6 text-amber-400"/>Gestione Sala e Tavoli</h3>
                <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700">
                    <h4 className="font-semibold text-gray-300 mb-3">Aggiungi un nuovo tavolo</h4>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                        <input type="text" placeholder="Nome (es. T1)" value={newTableName} onChange={e => setNewTableName(e.target.value)} className="md:col-span-2 bg-gray-800 border-gray-600 rounded-md p-2 focus:ring-1 focus:ring-amber-500"/>
                        <input type="number" placeholder="Capienza" value={newTableCapacity} onChange={e => setNewTableCapacity(parseInt(e.target.value, 10))} min="1" className="bg-gray-800 border-gray-600 rounded-md p-2 focus:ring-1 focus:ring-amber-500" />
                        <div className="flex items-center gap-2 h-full">
                           <input id="isCombinable" type="checkbox" checked={isCombinable} onChange={e => setIsCombinable(e.target.checked)} className="h-4 w-4 rounded bg-gray-700 border-gray-600 text-amber-500 focus:ring-amber-600"/>
                           <label htmlFor="isCombinable" className="text-sm text-gray-400">Combinabile</label>
                        </div>
                    </div>
                     <button onClick={handleAddTable} className="mt-3 w-full md:w-auto bg-amber-500/80 text-gray-900 font-bold py-2 px-4 rounded-lg hover:bg-amber-500 text-sm">Aggiungi Tavolo</button>
                </div>
                <div className="max-h-48 overflow-y-auto space-y-2 pr-2">
                   {settings.tables.map(table => (
                        <div key={table.id} className="flex items-center justify-between bg-gray-700/50 p-2 rounded-md">
                            <p className="text-white font-semibold">{table.name} - <span className="text-amber-400">{table.capacity}p</span> <span className="text-gray-400 text-xs">{table.isCombinable ? '(Combinabile)' : ''}</span></p>
                            <button onClick={() => handleRemoveTable(table.id)} className="text-red-400 hover:text-red-300 p-1"><Icon name="x-circle" className="w-5 h-5"/></button>
                        </div>
                   ))}
                </div>
            </div>

            {/* Combination Rules */}
            <div className="space-y-4">
                <h3 className="text-xl font-bold text-white flex items-center gap-2"><Icon name="cog" className="w-6 h-6 text-amber-400"/>Regole di Combinazione</h3>
                <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700">
                    <h4 className="font-semibold text-gray-300 mb-3">Aggiungi regola</h4>
                    <div className="flex items-center gap-2 text-gray-300 flex-wrap">
                        <span>Unendo</span>
                        <input type="number" value={ruleCount} onChange={e => setRuleCount(parseInt(e.target.value, 10))} min="2" className="w-16 bg-gray-800 border-gray-600 rounded-md p-2 focus:ring-1 focus:ring-amber-500" />
                        <span>tavoli da</span>
                        <input type="number" value={ruleTableCapacity} onChange={e => setRuleTableCapacity(parseInt(e.target.value, 10))} min="1" className="w-16 bg-gray-800 border-gray-600 rounded-md p-2 focus:ring-1 focus:ring-amber-500" />
                        <span>persone, la capienza è</span>
                         <input type="number" value={ruleNewCapacity} onChange={e => setRuleNewCapacity(parseInt(e.target.value, 10))} min="1" className="w-16 bg-gray-800 border-gray-600 rounded-md p-2 focus:ring-1 focus:ring-amber-500" />
                        <button onClick={handleAddRule} className="ml-auto bg-amber-500/80 text-gray-900 font-bold py-2 px-4 rounded-lg hover:bg-amber-500 text-sm">Aggiungi Regola</button>
                    </div>
                </div>
                 <div className="max-h-32 overflow-y-auto space-y-2 pr-2">
                   {settings.combinationRules.map(rule => (
                        <div key={rule.id} className="flex items-center justify-between bg-gray-700/50 p-2 rounded-md">
                            <p className="text-white text-sm">Unendo {rule.count} tavoli da {rule.tableCapacity}p, si ottengono {rule.newCapacity} posti.</p>
                            <button onClick={() => handleRemoveRule(rule.id)} className="text-red-400 hover:text-red-300 p-1"><Icon name="x-circle" className="w-5 h-5"/></button>
                        </div>
                   ))}
                </div>
            </div>

             {/* Duration Rules */}
            <div className="space-y-4">
                <h3 className="text-xl font-bold text-white flex items-center gap-2"><Icon name="clock" className="w-6 h-6 text-amber-400"/>Gestione Turnover e Durata</h3>
                <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700">
                    <h4 className="font-semibold text-gray-300 mb-3">Aggiungi regola di durata</h4>
                    <div className="flex items-center gap-2 text-gray-300 flex-wrap">
                        <span>Da</span>
                        <input type="number" value={durationMinGuests} onChange={e => setDurationMinGuests(parseInt(e.target.value, 10))} min="1" className="w-16 bg-gray-800 border-gray-600 rounded-md p-2 focus:ring-1 focus:ring-amber-500" />
                        <span>a</span>
                        <input type="number" value={durationMaxGuests} onChange={e => setDurationMaxGuests(parseInt(e.target.value, 10))} min={durationMinGuests} className="w-16 bg-gray-800 border-gray-600 rounded-md p-2 focus:ring-1 focus:ring-amber-500" />
                        <span>persone, durata</span>
                         <input type="number" value={durationMinutes} onChange={e => setDurationMinutes(parseInt(e.target.value, 10))} min="30" step="15" className="w-20 bg-gray-800 border-gray-600 rounded-md p-2 focus:ring-1 focus:ring-amber-500" />
                        <span>minuti.</span>
                        <button onClick={handleAddDurationRule} className="ml-auto bg-amber-500/80 text-gray-900 font-bold py-2 px-4 rounded-lg hover:bg-amber-500 text-sm">Aggiungi</button>
                    </div>
                </div>
                 <div className="max-h-32 overflow-y-auto space-y-2 pr-2">
                   {settings.bookingDurationRules.sort((a, b) => a.minGuests - b.minGuests).map(rule => (
                        <div key={rule.id} className="flex items-center justify-between bg-gray-700/50 p-2 rounded-md">
                            <p className="text-white text-sm">Da {rule.minGuests} a {rule.maxGuests} persone: {rule.durationMinutes} minuti</p>
                            <button onClick={() => handleRemoveDurationRule(rule.id)} className="text-red-400 hover:text-red-300 p-1"><Icon name="x-circle" className="w-5 h-5"/></button>
                        </div>
                   ))}
                </div>
            </div>
        </div>
    );
};

const AdminSettingsBasic: React.FC<AdminSettingsProps> = ({ settings, onUpdateSettings }) => {
    
    const handleMaxGuestsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onUpdateSettings({ maxGuestsPerSlot: parseInt(e.target.value, 10) || 0 });
    };

    return (
        <div className="space-y-8">
            <OpeningHoursManager settings={settings} onUpdateSettings={onUpdateSettings} />
            
            {/* Max Guests */}
            <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700">
                <h3 className="text-xl font-bold text-white mb-3 flex items-center gap-2"><Icon name="users" className="w-6 h-6 text-amber-400"/>Capienza Massima</h3>
                <label htmlFor="maxGuests" className="block text-sm font-medium text-gray-400 mb-1">Numero massimo di coperti totali per ogni fascia oraria</label>
                <input id="maxGuests" type="number" value={settings.maxGuestsPerSlot} onChange={handleMaxGuestsChange} min="1" className="w-full bg-gray-800 border-gray-600 rounded-md p-2 focus:ring-1 focus:ring-amber-500" />
            </div>
        </div>
    );
};

const AdminSettings: React.FC<AdminSettingsProps> = ({ settings, onUpdateSettings, onBack }) => {
    return (
        <div className="bg-gray-800/70 p-6 rounded-xl border border-gray-700 space-y-8">
            <PlanSelector activePlan={settings.activePlan} onSelect={plan => onUpdateSettings({ activePlan: plan })} />
            
            {settings.activePlan === Plan.PRO
                ? <AdminSettingsPro settings={settings} onUpdateSettings={onUpdateSettings} onBack={onBack} />
                : <AdminSettingsBasic settings={settings} onUpdateSettings={onUpdateSettings} onBack={onBack} />
            }
            
            <div className="pt-4 border-t border-gray-700/50">
                <button onClick={onBack} className="w-full bg-amber-500 text-gray-900 font-bold py-3 px-4 rounded-lg hover:bg-amber-400 transition-colors duration-300">
                    Torna alla Dashboard
                </button>
            </div>
        </div>
    );
};

export default AdminSettings;