import React, { useState, useRef } from 'react';
import { AdminSettings as AdminSettingsType, DigitalMenu, MenuCategory, MenuItem } from '../types';
import Icon from './Icon';
import { generateMenuFromText, generateMenuFromImage } from '../services/geminiService';

interface MenuCreationHubProps {
    onUpdateSettings: (settings: Partial<AdminSettingsType>) => void;
}

// Helper to convert file to base64
const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve((reader.result as string).split(',')[1]); // remove prefix
        reader.onerror = error => reject(error);
    });
};

type GeneratedCategory = Omit<MenuCategory, 'id' | 'items'> & {
    items: (Omit<MenuItem, 'id' | 'isAvailable'>)[]
}

const MenuCreationHub: React.FC<MenuCreationHubProps> = ({ onUpdateSettings }) => {
    const [activeMethod, setActiveMethod] = useState<'text' | 'photo' | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [menuText, setMenuText] = useState('');
    const [progress, setProgress] = useState(0);
    const [progressMessage, setProgressMessage] = useState('');

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Progress bar effect
    React.useEffect(() => {
        if (isLoading) {
            setProgress(10);
            const timer = setInterval(() => {
                setProgress(prev => {
                    if (prev >= 95) {
                        clearInterval(timer);
                        return 95;
                    }
                    const increment = prev < 70 ? Math.random() * 10 : Math.random() * 2;
                    return Math.min(prev + increment, 95);
                });
            }, 300);
            return () => clearInterval(timer);
        }
    }, [isLoading]);

    const handleMenuCreationSuccess = (generatedCategories: GeneratedCategory[]) => {
        const newMenu: DigitalMenu = {
            showPrices: true,
            dishesOfTheDay: [],
            categories: generatedCategories.map(cat => ({
                ...cat,
                id: `cat-${Date.now()}-${Math.random()}`,
                items: cat.items.map(item => ({
                    ...item,
                    id: `item-${Date.now()}-${Math.random()}`,
                    isAvailable: true,
                }))
            }))
        };
        onUpdateSettings({ digitalMenu: newMenu });
    };

    const handleGenerateFromText = async () => {
        if (!menuText.trim()) {
            setError('Inserisci il testo del tuo menù.');
            return;
        }
        setIsLoading(true);
        setError('');
        setProgressMessage("L'IA sta analizzando il testo...");
        try {
            const generatedCategories = await generateMenuFromText(menuText);
            handleMenuCreationSuccess(generatedCategories as GeneratedCategory[]);
        } catch (err) {
            console.error(err);
            setError("L'IA non è riuscita a generare il menù. Prova a modificare il testo o riprova più tardi.");
        } finally {
            setIsLoading(false);
        }
    };

    const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files || files.length === 0) return;

        setIsLoading(true);
        setError('');
        setActiveMethod('photo');
        setProgressMessage("Analizzo le foto...");

        try {
            // FIX: Explicitly type 'file' as File to resolve TypeScript inference issue.
            const imagePromises = Array.from(files).map((file: File) => 
                fileToBase64(file).then(data => ({ data, mimeType: file.type }))
            );
            const imagesData = await Promise.all(imagePromises);
            
            setProgressMessage("Estraggo il testo...");
            const generatedCategories = await generateMenuFromImage(imagesData);
            setProgressMessage("Impagino il tuo menù...");
            handleMenuCreationSuccess(generatedCategories as GeneratedCategory[]);
        } catch (err) {
            console.error(err);
            setError("L'IA non è riuscita a leggere il menù dalle foto. Assicurati che le immagini siano chiare e ben illuminate.");
        } finally {
            setIsLoading(false);
             if (event.target) event.target.value = '';
        }
    };

    const handleStartFromScratch = () => {
        const emptyMenu: DigitalMenu = {
            showPrices: true,
            dishesOfTheDay: [],
            categories: [],
        };
        onUpdateSettings({ digitalMenu: emptyMenu });
    };

    const renderCard = (
        icon: React.ComponentProps<typeof Icon>['name'],
        title: string,
        description: string,
        onClick: () => void,
        method: 'photo' | 'text' | 'scratch'
    ) => (
        <button
            onClick={onClick}
            className="bg-gray-800/70 p-6 rounded-xl border border-gray-700 text-left w-full h-full flex flex-col hover:border-amber-500 hover:bg-gray-800 transition-all duration-300 transform hover:-translate-y-1 group"
        >
            <Icon name={icon} className="w-12 h-12 text-amber-400 mb-4" />
            <h3 className="text-xl font-bold text-white flex-grow">{title}</h3>
            <p className="text-gray-400 text-sm mt-2">{description}</p>
        </button>
    );

    if (isLoading) {
        return (
            <div className="max-w-4xl mx-auto bg-gray-800/70 p-8 rounded-xl border border-gray-700 text-center">
                <Icon name={activeMethod === 'photo' ? 'camera' : 'sparkles'} className="w-16 h-16 text-amber-400 mx-auto mb-4 animate-pulse" />
                <h2 className="text-3xl font-bold text-white mb-4">Un attimo di pazienza...</h2>
                <div className="space-y-2">
                    <div className="w-full bg-gray-700 rounded-full h-4 relative overflow-hidden border border-gray-600">
                        <div
                            className="bg-gradient-to-r from-amber-400 to-amber-500 h-full rounded-full transition-all duration-300 ease-linear"
                            style={{ width: `${progress}%` }}
                        ></div>
                        <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white mix-blend-difference px-2">
                            {`${progressMessage} ${Math.floor(progress)}%`}
                        </span>
                    </div>
                </div>
                {error && <p className="text-red-400 text-sm mt-4">{error}</p>}
            </div>
        );
    }
    
    if (activeMethod === 'text') {
        return (
            <div className="max-w-4xl mx-auto bg-gray-800/70 p-8 rounded-xl border border-gray-700">
                 <button onClick={() => setActiveMethod(null)} className="text-gray-400 hover:text-white mb-4 text-sm flex items-center gap-1">
                    <Icon name="x-circle" className="w-4 h-4" /> Indietro
                 </button>
                 <h2 className="text-3xl font-bold text-white mb-2">Incolla il testo del tuo Menù</h2>
                <p className="text-gray-400 mb-6">La nostra IA lo analizzerà e lo strutturerà per te in pochi secondi.</p>
                <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700">
                    <textarea
                        value={menuText}
                        onChange={e => setMenuText(e.target.value)}
                        placeholder="Es: ANTIPASTI - Bruschetta al pomodoro 5€ - Caprese 8€..."
                        className="w-full h-48 bg-gray-800 border-gray-600 rounded-md p-3 focus:ring-2 focus:ring-amber-500 outline-none transition"
                        aria-label="Incolla qui il testo del tuo menù"
                    />
                     {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
                    <button onClick={handleGenerateFromText} disabled={isLoading} className="mt-4 w-full flex items-center justify-center gap-2 bg-amber-500 text-gray-900 font-bold py-3 px-4 rounded-lg hover:bg-amber-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                        <Icon name="sparkles" className="w-5 h-5" />
                        Genera Menù con IA
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="max-w-4xl mx-auto text-center">
            <Icon name="book-open" className="w-16 h-16 text-amber-400 mx-auto mb-4" />
            <h2 className="text-3xl font-bold text-white mb-2">Come vuoi creare il tuo Menù?</h2>
            <p className="text-gray-400 mb-8 max-w-2xl mx-auto">Scegli il metodo più comodo per te. La nostra IA ti assisterà in ogni caso per rendere il processo semplice e veloce.</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {renderCard(
                    'camera',
                    'Crea da Foto',
                    'Scatta una o più foto al tuo menù cartaceo. L\'IA estrarrà testo e prezzi automaticamente.',
                    () => fileInputRef.current?.click(),
                    'photo'
                )}
                {renderCard(
                    'sparkles',
                    'Incolla Testo',
                    'Hai già un menù in formato testo? Incollalo e lascia che l\'IA faccia il lavoro di formattazione.',
                    () => setActiveMethod('text'),
                    'text'
                )}
                {renderCard(
                    'pencil',
                    'Inizia da Zero',
                    'Parti da una tela bianca e costruisci il tuo menù passo dopo passo con il nostro editor.',
                    handleStartFromScratch,
                    'scratch'
                )}
            </div>
            <input
                type="file"
                ref={fileInputRef}
                onChange={handlePhotoUpload}
                accept="image/*"
                capture="environment"
                className="hidden"
                multiple
            />
        </div>
    );
};

export default MenuCreationHub;