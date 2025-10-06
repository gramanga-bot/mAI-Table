import React, { useState, FormEvent, useEffect, useRef, useCallback } from 'react';
import { BookingDetails, NotificationPlatform, DayOfWeek, VoiceBookingState, WeeklySchedule, Plan, GroupedTimeSlot } from '../types';
import { MAX_ADULTS, MAX_CHILDREN } from '../constants';
import Icon from './Icon';
import NumberInput from './NumberInput';
import TimeSlotPicker from './TimeSlotPicker';
import VoiceBookingOverlay from './VoiceBookingOverlay';
import PhoneInput from './PhoneInput';
import { GoogleGenAI, Modality, LiveServerMessage } from '@google/genai';
import { 
    updateBookingDetailsFunctionDeclaration, 
    finalizeBookingFunctionDeclaration,
    createBlob, 
    decode, 
    decodeAudioData 
} from '../services/geminiService';

interface BookingFormProps {
    onBook: (details: Omit<BookingDetails, 'id' | 'status'>) => void;
    initialDetails: BookingDetails | null;
    error: string | null;
    t: (key: string) => string;
    weeklySchedule: WeeklySchedule;
    getGroupedSlotsForDate: (date: string) => GroupedTimeSlot[];
    activePlan: Plan;
    restaurantName: string;
    restaurantAddress: string;
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

// A new global variable for the AI client, as it's needed for the live session
// Support both Vite's `import.meta.env` and AI Studio's `process.env` for the API key.
const apiKey = (import.meta as any).env?.VITE_API_KEY || (window as any).process?.env?.API_KEY;
if (!apiKey) {
    throw new Error("API key not found. Please set VITE_API_KEY for Vite environments or ensure API_KEY is available in the AI Studio environment.");
}
const ai = new GoogleGenAI({ apiKey });

const BookingForm: React.FC<BookingFormProps> = ({ 
    onBook, initialDetails, error, t, 
    weeklySchedule, getGroupedSlotsForDate, activePlan,
    restaurantName, restaurantAddress
}) => {
    const [name, setName] = useState(initialDetails?.name || '');
    const [email, setEmail] = useState(initialDetails?.email || '');
    const [phone, setPhone] = useState(initialDetails?.phone || '');
    const [date, setDate] = useState(initialDetails?.date || new Date().toISOString().split('T')[0]);
    const [time, setTime] = useState(initialDetails?.time || '');
    const [adults, setAdults] = useState(initialDetails?.adults || 2);
    const [children, setChildren] = useState(initialDetails?.children || 0);
    const [platforms, setPlatforms] = useState<Set<NotificationPlatform>>(
        new Set(initialDetails?.platforms || [NotificationPlatform.EMAIL])
    );
    const [formError, setFormError] = useState('');
    const [voiceState, setVoiceState] = useState<VoiceBookingState>({ status: 'idle', transcript: '' });
    
    const [availableTimeSlots, setAvailableTimeSlots] = useState<GroupedTimeSlot[]>([]);
    
    // Refs for audio and session management
    const formRef = useRef<HTMLFormElement>(null);
    const sessionRef = useRef<any | null>(null);
    const inputAudioContextRef = useRef<AudioContext | null>(null);
    const outputAudioContextRef = useRef<AudioContext | null>(null);
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const audioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
    const nextStartTimeRef = useRef<number>(0);

    const isVoiceBookingActive = voiceState.status !== 'idle';
    
    useEffect(() => {
        const groupedSlots = getGroupedSlotsForDate(date);
        setAvailableTimeSlots(groupedSlots);
        
        // Flatten slots for checking if selected time is still valid
        const allSlots = groupedSlots.flatMap(group => group.slots);
        if (!allSlots.includes(time)) {
            setTime('');
        }
    }, [date, getGroupedSlotsForDate, time]);


    useEffect(() => {
        if(error) {
            setFormError(error);
            const timer = setTimeout(() => setFormError(''), 5000);
            return () => clearTimeout(timer);
        }
    }, [error])

    const handlePlatformChange = (platform: NotificationPlatform) => {
        setPlatforms(prev => {
            const newSet = new Set(prev);
            if (newSet.has(platform)) {
                newSet.delete(platform);
            } else {
                newSet.add(platform);
            }
            return newSet;
        });
    };

    const isDayClosed = (checkDate: string): boolean => {
        const day = new Date(checkDate).getUTCDay().toString() as DayOfWeek;
        const activeWindows = weeklySchedule[day];
        return !activeWindows || activeWindows.length === 0;
    };

    const handleDateChange = (newDate: string) => {
        setDate(newDate);
        if (isDayClosed(newDate)) {
             const day = new Date(newDate).getUTCDay().toString() as DayOfWeek;
            setFormError(`Il ristorante è chiuso di ${dayLabels[day]}. Scegli un'altra data.`);
        } else if (formError.includes('chiuso di')) {
            setFormError('');
        }
    };

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        
        if (isDayClosed(date)) {
            const day = new Date(date).getUTCDay().toString() as DayOfWeek;
            setFormError(`Il ristorante è chiuso di ${dayLabels[day]}. Scegli un'altra data.`);
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!name.trim()) {
            setFormError(t('error.name'));
            return;
        }
         if (!email.trim() || !emailRegex.test(email)) {
            setFormError(t('error.email'));
            return;
        }
        if (!phone.trim() || phone.length < 8) { // Basic phone validation
            setFormError(t('error.phone'));
            return;
        }
        if (!time) {
            setFormError(t('error.time'));
            return;
        }
        if (adults < 1) {
            setFormError(t('error.adults'));
            return;
        }
        if (platforms.size === 0) {
            setFormError(t('error.notification'));
            return;
        }
        setFormError('');
        onBook({ name, email, phone, date, time, adults, children, platforms: Array.from(platforms) });
    };

    const cleanupVoiceSession = useCallback(() => {
        if (sessionRef.current) {
            sessionRef.current.close();
            sessionRef.current = null;
        }
        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach(track => track.stop());
            mediaStreamRef.current = null;
        }
        if (scriptProcessorRef.current) {
            scriptProcessorRef.current.disconnect();
            scriptProcessorRef.current = null;
        }
        if (inputAudioContextRef.current && inputAudioContextRef.current.state !== 'closed') {
            inputAudioContextRef.current.close();
        }
        if (outputAudioContextRef.current && outputAudioContextRef.current.state !== 'closed') {
            outputAudioContextRef.current.close();
        }
        audioSourcesRef.current.forEach(source => source.stop());
        audioSourcesRef.current.clear();
        nextStartTimeRef.current = 0;
        setVoiceState({ status: 'idle', transcript: '' });
    },[]);

    const handleVoiceBookingToggle = async () => {
        if (isVoiceBookingActive) {
            cleanupVoiceSession();
            return;
        }

        try {
            mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            
            setVoiceState({ status: 'processing', transcript: 'Connessione...' });

            const today = new Date();
            const formattedToday = today.toLocaleDateString('it-IT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
            const currentGroupedSlots = getGroupedSlotsForDate(date);
            const currentSlots = currentGroupedSlots.flatMap(g => g.slots);

            const sessionPromise = ai.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                callbacks: {
                    onopen: () => {
                        if (!inputAudioContextRef.current || !mediaStreamRef.current) return;

                        const source = inputAudioContextRef.current.createMediaStreamSource(mediaStreamRef.current);
                        scriptProcessorRef.current = inputAudioContextRef.current.createScriptProcessor(4096, 1, 1);
                        
                        scriptProcessorRef.current.onaudioprocess = (audioProcessingEvent) => {
                            const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                            const pcmBlob = createBlob(inputData);
                            sessionPromise.then((session) => {
                                session.sendRealtimeInput({ media: pcmBlob });
                            });
                        };
                        
                        source.connect(scriptProcessorRef.current);
                        scriptProcessorRef.current.connect(inputAudioContextRef.current.destination);
                        
                        setVoiceState({ status: 'listening', transcript: '' });
                    },
                    onmessage: async (message: LiveServerMessage) => {
                        if (message.toolCall) {
                            for (const fc of message.toolCall.functionCalls) {
                                if (fc.name === 'updateBookingDetails') {
                                    const args = fc.args as Partial<BookingDetails & { date: string }>;
                                    if (args.name) setName(args.name as string);
                                    if (args.date) {
                                        const newDate = args.date as string;
                                        setDate(newDate);
                                        const newGroupedSlots = getGroupedSlotsForDate(newDate);
                                        const newSlots = newGroupedSlots.flatMap(g => g.slots);
                                        // We can inform the model about the new available slots in the tool response
                                        sessionPromise.then((session) => {
                                            session.sendToolResponse({
                                                functionResponses: {
                                                    id: fc.id,
                                                    name: fc.name,
                                                    response: { result: `ok, date updated. Available slots are now: ${newSlots.join(', ')}` },
                                                }
                                            });
                                        });
                                    }
                                    if (args.time) setTime(args.time as string);
                                    if (args.adults !== undefined) setAdults(args.adults as number);
                                    if (args.children !== undefined) setChildren(args.children as number);
                                    if (args.email) setEmail(args.email as string);
                                    if (args.phone) setPhone(args.phone as string);
                                    if (args.platforms) {
                                        // FIX: Ensure platforms from the model is an array before creating a Set.
                                        // The model might return a single string, and this also makes the code more type-safe,
                                        // preventing potential errors where a property is accessed on an 'unknown' type.
                                        const platformArray = Array.isArray(args.platforms) ? args.platforms : [args.platforms];
                                        setPlatforms(new Set(platformArray as NotificationPlatform[]));
                                    }
                                    
                                    if (!args.date) { // if date was not updated, we just send a simple ok
                                        sessionPromise.then((session) => {
                                            session.sendToolResponse({
                                                functionResponses: {
                                                    id: fc.id,
                                                    name: fc.name,
                                                    response: { result: "ok, details updated" },
                                                }
                                            });
                                        });
                                    }
                                } else if (fc.name === 'finalizeBooking') {
                                    if (formRef.current) {
                                        formRef.current.requestSubmit();
                                    }
                                    cleanupVoiceSession();
                                    return; 
                                }
                            }
                        }

                        const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
                        if (base64Audio && outputAudioContextRef.current) {
                            setVoiceState(prev => ({ ...prev, status: 'speaking' }));
                            
                            const outputCtx = outputAudioContextRef.current;
                            nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
                            
                            const audioBuffer = await decodeAudioData(decode(base64Audio), outputCtx, 24000, 1);
                            const source = outputCtx.createBufferSource();
                            source.buffer = audioBuffer;
                            source.connect(outputCtx.destination);
                            
                            source.addEventListener('ended', () => {
                                audioSourcesRef.current.delete(source);
                                if (audioSourcesRef.current.size === 0) {
                                    setVoiceState(prev => ({ ...prev, status: 'listening' }));
                                }
                            });

                            source.start(nextStartTimeRef.current);
                            nextStartTimeRef.current += audioBuffer.duration;
                            audioSourcesRef.current.add(source);
                        }

                        if (message.serverContent?.interrupted) {
                            audioSourcesRef.current.forEach(source => source.stop());
                            audioSourcesRef.current.clear();
                            nextStartTimeRef.current = 0;
                            setVoiceState(prev => ({ ...prev, status: 'listening' }));
                        }
                    },
                    onerror: (e) => {
                        console.error('Voice session error:', e);
                        setFormError("Errore durante la sessione vocale.");
                        cleanupVoiceSession();
                    },
                    onclose: () => {
                        cleanupVoiceSession();
                    },
                },
                config: {
                    responseModalities: [Modality.AUDIO],
                    tools: [{ functionDeclarations: [updateBookingDetailsFunctionDeclaration, finalizeBookingFunctionDeclaration] }],
                    systemInstruction: `You are a highly precise and efficient voice assistant for booking a table at '${restaurantName}', located at '${restaurantAddress}'. Your goal is to fill the booking form with 100% accuracy. Guide the user by asking for one piece of information at a time. The current date is ${formattedToday}. Use this for relative dates (e.g., 'domani'). Follow these steps meticulously:

1.  **GREET**: Immediately greet the user and start the process. (e.g., "Ciao, benvenuto a ${restaurantName}. La guiderò nella prenotazione.").
2.  **GUESTS**: Ask for the number of adults first, then ask if there are any children. (e.g., "Per quanti adulti desidera prenotare? ... Perfetto, ci sono anche dei bambini?").
3.  **DATE**: Ask for the desired date. You MUST convert it to YYYY-MM-DD format. After updating, you will receive the available slots for that day in the tool response. Use them for the next step.
4.  **TIME**: Ask for the time. Inform the user of the available slots for the date they chose. (e.g., "Per quella data, gli orari disponibili sono: [slots]. Quale preferisce?").
5.  **NAME**: Ask for the reservation name. **CRITICAL**: After hearing the name, repeat it back for confirmation. (e.g., "La prenotazione sarà a nome Mario Rossi. È corretto?"). Do not proceed until confirmed.
6.  **EMAIL**: Ask for their email address. Instruct them to spell it out if necessary. (e.g., "Qual è il suo indirizzo email? Può scandirlo se è complesso."). **CRITICAL**: After hearing the email, repeat it back for confirmation. (e.g., "La sua email è mario.rossi@example.com. Corretto?"). Be prepared for formats like 'mario punto rossi chiocciola example punto com'. Do not proceed until confirmed. Use the 'updateBookingDetails' tool.
7.  **PHONE**: Ask for their phone number. Assume the user will provide a national number; you don't need to ask for a country code. (e.g., "Qual è il suo numero di telefono?"). **CRITICAL**: After hearing the number, repeat it back digit by digit for confirmation. (e.g., "Ho capito, il numero è 3 2 8 1 2 3 4 5 6 7. È esatto?"). Do not proceed until confirmed. Use the 'updateBookingDetails' tool to set the phone field.
8.  **SUMMARY**: Once all details are confirmed, provide a full summary. (e.g., "Riepiloghiamo: una prenotazione per [Nome], per [numero] persone, il [data] alle [ora]. La sua email è [email] e il suo telefono è [telefono]. Conferma?").
9.  **FINALIZE**: Upon final user confirmation, your ONLY action is to call the 'finalizeBooking' function. Do not say anything else.

**General Rules**:
- Speak clear, concise Italian.
- Be patient. If you don't understand, ask the user to repeat.
- Use the 'updateBookingDetails' tool incrementally to fill the form.
- Accuracy is more important than speed. The confirmation steps for name, email and phone are mandatory.
- The available time slots depend on the chosen date. You must get the date first. For today, the available slots are: ${currentSlots.join(', ')}.`,
                },
            });
            
            sessionRef.current = await sessionPromise;
            // Send a simple message to make the AI start the conversation as per system instructions
            sessionRef.current.sendRealtimeInput({ text: "Inizia" });

        } catch (err) {
            console.error("Failed to start voice booking:", err);
            setFormError("Impossibile avviare l'assistente vocale. Controlla i permessi del microfono.");
            cleanupVoiceSession();
        }
    };

    useEffect(() => {
        return () => {
            cleanupVoiceSession();
        };
    }, [cleanupVoiceSession]);
    
    const today = new Date().toISOString().split('T')[0];

    // FIX: Added an Array.isArray type guard to address a TypeScript error where 'windows'
    // is inferred as 'unknown'. This safely allows accessing the 'length' property.
    const closingDaysLabels = Object.entries(weeklySchedule)
        .filter(([, windows]) => !windows || (Array.isArray(windows) && windows.length === 0))
        .map(([day]) => dayLabels[day as DayOfWeek])
        .join(', ');


    return (
        <div className="bg-[var(--background-secondary)] p-8 rounded-2xl shadow-2xl shadow-black/30 border border-[var(--border-primary)] w-full transition-all duration-300">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-[var(--text-primary)] uppercase">PRENOTA ORA</h2>
                {activePlan === Plan.PRO && (
                    <button
                        type="button"
                        onClick={handleVoiceBookingToggle}
                        className={`p-3 rounded-full transition-all duration-300 transform hover:scale-110 ${isVoiceBookingActive ? 'bg-red-500/80 hover:bg-red-600 animate-pulse' : 'bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)]'}`}
                        aria-label={isVoiceBookingActive ? 'Termina prenotazione vocale' : 'Avvia prenotazione vocale'}
                    >
                        <Icon name="microphone" className="w-6 h-6 text-[var(--accent-text)]" />
                    </button>
                )}
            </div>
            <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
                {formError && (
                    <div className="bg-[var(--negative-background)] border border-[var(--negative)] text-[var(--negative-text)] p-3 rounded-lg text-center">
                        {formError}
                    </div>
                )}
                <div className="grid grid-cols-1 gap-6">
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">{t('form.name.label')}</label>
                        <input type="text" id="name" value={name} onChange={e => setName(e.target.value)} required className="w-full bg-[var(--input-background)] text-[var(--input-text)] placeholder:text-[var(--input-placeholder)] border border-[var(--border-secondary)] rounded-md p-3 focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)] outline-none transition" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         <div>
                            <label htmlFor="email" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">{t('form.email.label')}</label>
                            <input type="email" id="email" value={email} onChange={e => setEmail(e.target.value)} required className="w-full bg-[var(--input-background)] text-[var(--input-text)] placeholder:text-[var(--input-placeholder)] border border-[var(--border-secondary)] rounded-md p-3 focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)] outline-none transition" />
                        </div>
                        <div>
                            <label htmlFor="phone" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">{t('form.phone.label')}</label>
                            <PhoneInput value={phone} onChange={setPhone} />
                        </div>
                    </div>
                </div>

                <div>
                    <label htmlFor="date" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">{t('form.date.label')}</label>
                    <input type="date" id="date" value={date} min={today} onChange={e => handleDateChange(e.target.value)} required className="w-full bg-[var(--input-background)] text-[var(--input-text)] placeholder:text-[var(--input-placeholder)] border border-[var(--border-secondary)] rounded-md p-3 focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)] outline-none transition" />
                    {closingDaysLabels && (
                        <p className="text-xs text-[var(--text-secondary)]/80 mt-2">
                            Giorno/i di chiusura: {closingDaysLabels}.
                        </p>
                    )}
                </div>
                
                <div className="grid grid-cols-2 gap-6">
                    <NumberInput label={t('form.adults.label')} value={adults} onChange={setAdults} min={1} max={MAX_ADULTS} />
                    <NumberInput label={t('form.children.label')} value={children} onChange={setChildren} min={0} max={MAX_CHILDREN} />
                </div>

                <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">{t('form.time.label')}</label>
                    <TimeSlotPicker 
                        selectedTime={time} 
                        onSelectTime={setTime} 
                        groupedTimeSlots={availableTimeSlots} 
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">{t('form.notification.label')}</label>
                    <div className="grid grid-cols-3 gap-3">
                        {/* The explicit array provides better type safety than Object.values() for string enums. */}
                        {[NotificationPlatform.WHATSAPP, NotificationPlatform.TELEGRAM, NotificationPlatform.EMAIL].map(platform => (
                            <button type="button" key={platform} onClick={() => handlePlatformChange(platform)} className={`flex items-center justify-center p-3 rounded-lg border-2 transition-all duration-200 ${platforms.has(platform) ? 'bg-[var(--accent-secondary)] border-[var(--accent-secondary-border)] text-[var(--text-accent)]' : 'bg-[var(--background-tertiary)]/50 border-[var(--border-secondary)] hover:border-[var(--border-secondary)]'}`}>
                                <Icon name={platform.toLowerCase() as 'whatsapp' | 'telegram' | 'email'} className="w-5 h-5 mr-2" />
                                <span className="font-semibold">{platform}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <button type="submit" className="w-full bg-[var(--accent-primary)] text-[var(--accent-text)] font-bold py-3 px-4 rounded-lg hover:bg-[var(--accent-primary-hover)] transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[var(--background-secondary)] focus:ring-[var(--accent-primary)] text-lg">
                    {t('form.submit.button')}
                </button>
            </form>
            {isVoiceBookingActive && <VoiceBookingOverlay state={voiceState} onClose={handleVoiceBookingToggle} />}
        </div>
    );
};

export default BookingForm;