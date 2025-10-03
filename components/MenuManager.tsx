import React, { useState, useMemo, useCallback, useEffect, DragEvent, useRef } from 'react';
import { AdminSettings as AdminSettingsType, DigitalMenu, MenuCategory, MenuItem } from '../types';
import Icon from './Icon';
import { generateMenuFromText, generateMenuFromImage } from '../services/geminiService';
import MenuPreview from './MenuPreview';
import MenuCreationHub from './MenuCreationHub';

interface MenuManagerProps {
    settings: AdminSettingsType;
    onUpdateSettings: (settings: Partial<AdminSettingsType>) => void;
}

const allergenMap: Record<string, string[]> = {
    "Glutine": ["grano", "farina", "pane", "pasta", "orzo", "farro", "kamut", "segale", "couscous", "pangrattato", "semola"],
    "Crostacei": ["gambero", "gamberi", "scampo", "scampi", "aragosta", "granchio", "mazzancolle"],
    "Uova": ["uovo", "uova", "maionese", "zabaione", "albumina", "ovomucoide", "lisozima"],
    "Pesce": ["pesce", "acciuga", "acciughe", "tonno", "salmone", "merluzzo", "sarda", "sarde", "trota", "sogliola", "spada"],
    "Arachidi": ["arachidi", "burro di arachidi", "olio di arachidi"],
    "Soia": ["soia", "edamame", "tofu", "miso", "salsa di soia"],
    "Latte": ["latte", "lattosio", "formaggio", "yogurt", "burro", "panna", "caseina", "ricotta", "mozzarella"],
    "Frutta a guscio": ["mandorle", "nocciole", "noci", "anacardi", "pistacchi", "noci di macadamia", "noci pecan"],
    "Sedano": ["sedano"],
    "Senape": ["senape"],
    "Sesamo": ["sesamo", "tahina"],
    "Anidride solforosa e solfiti": ["solfiti", "anidride solforosa", "vino"],
    "Lupini": ["lupini"],
    "Molluschi": ["vongole", "cozze", "ostriche", "calamari", "seppie", "polpo"],
};

// Helper to convert file to base64
const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve((reader.result as string).split(',')[1]); // remove prefix
        reader.onerror = error => reject(error);
    });
};

const CATEGORY_ORDER = ['ANTIPASTI', 'PRIMI', 'SECONDI', 'PIZZE', 'CONTORNI', 'DESSERT', 'DOLCI', 'BEVANDE'];

const sortCategories = (categories: MenuCategory[]): MenuCategory[] => {
    return [...categories].sort((a, b) => {
        const aIndex = CATEGORY_ORDER.indexOf(a.name.toUpperCase());
        const bIndex = CATEGORY_ORDER.indexOf(b.name.toUpperCase());

        const aScore = aIndex === -1 ? CATEGORY_ORDER.length : aIndex;
        const bScore = bIndex === -1 ? CATEGORY_ORDER.length : bIndex;
        
        return aScore - bScore;
    });
};

const MenuManager: React.FC<MenuManagerProps> = ({ settings, onUpdateSettings }) => {
    const [localMenu, setLocalMenu] = useState<DigitalMenu | null>(settings.digitalMenu);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    
    const [isAddFromTextModalOpen, setIsAddFromTextModalOpen] = useState(false);
    const [isAddingWithAI, setIsAddingWithAI] = useState(false);
    const [addMenuText, setAddMenuText] = useState('');
    const [addError, setAddError] = useState('');
    
    const [progress, setProgress] = useState(0);

    const addPhotoInputRef = useRef<HTMLInputElement>(null);
    const [isAddingFromPhoto, setIsAddingFromPhoto] = useState(false);
    const [addPhotoError, setAddPhotoError] = useState('');
    const [addPhotoProgress, setAddPhotoProgress] = useState(0);
    const [addPhotoProgressMessage, setAddPhotoProgressMessage] = useState('');
    const [copiedWidget, setCopiedWidget] = useState<string | null>(null);
    const [selectedWidgets, setSelectedWidgets] = useState<Set<string>>(new Set());


    const menuWidgetCode = `<iframe src="https://your-restaurant-url/menu" width="100%" height="800px" style="border:0;" allowfullscreen="" loading="lazy"></iframe>`;
    const bookingWidgetCode = `<iframe src="https://your-restaurant-url/booking" width="100%" height="600px" style="border:0;" allowfullscreen="" loading="lazy"></iframe>`;
    const buttonWidgetCode = `<div id="tsg-booking-button" data-restaurant-id="YOUR_ID"></div>\n<script src="https://your-restaurant-url/widget-button.js" defer></script>`;


    useEffect(() => {
        setLocalMenu(settings.digitalMenu);
    }, [settings.digitalMenu]);

    useEffect(() => {
        if (isAddingWithAI || isAddingFromPhoto) {
            const progressSetter = isAddingWithAI ? setProgress : setAddPhotoProgress;
            progressSetter(10);
            const timer = setInterval(() => {
                progressSetter(prev => {
                    if (prev >= 95) {
                        clearInterval(timer);
                        return 95;
                    }
                    const increment = prev < 70 ? Math.random() * 10 : Math.random() * 2;
                    return Math.min(prev + increment, 95);
                });
            }, 250);
            return () => clearInterval(timer);
        }
    }, [isAddingWithAI, isAddingFromPhoto]);
    
    const handleCopy = (text: string, widgetId: string) => {
        navigator.clipboard.writeText(text);
        setCopiedWidget(widgetId);
        setTimeout(() => setCopiedWidget(null), 2000);
    };

     const handleWidgetSelection = (widgetId: string) => {
        setSelectedWidgets(prev => {
            const newSet = new Set(prev);
            if (newSet.has(widgetId)) {
                newSet.delete(widgetId);
            } else {
                newSet.add(widgetId);
            }
            return newSet;
        });
    };

    const handleSendToWebmaster = () => {
        if (selectedWidgets.size === 0) return;

        const subject = "Codici Widget per il Sito Web del Ristorante";
        let body = "Ciao,\n\nEcco i codici per integrare i widget sul sito web del ristorante:\n\n";

        const widgetData = {
            menu: {
                title: "Widget Menù Completo",
                description: "Incorpora l'intero menù interattivo in una pagina del tuo sito.",
                code: menuWidgetCode,
            },
            booking: {
                title: "Widget Prenotazioni",
                description: "Permetti ai clienti di prenotare direttamente da una pagina del tuo sito.",
                code: bookingWidgetCode,
            },
            button: {
                title: 'Pulsante "Prenota Ora"',
                description: "Aggiungi un semplice pulsante che apre il widget di prenotazione in un popup. Ideale da inserire in più punti del sito.",
                code: buttonWidgetCode,
            }
        };

        const orderedSelection = ['menu', 'booking', 'button'].filter(id => selectedWidgets.has(id));

        for (const widgetId of orderedSelection) {
            const data = widgetData[widgetId as keyof typeof widgetData];
            if (data) {
                body += `----------------------------------------\n\n`;
                body += `WIDGET: ${data.title}\n`;
                body += `DESCRIZIONE: ${data.description}\n\n`;
                body += `CODICE DA INSERIRE:\n${data.code}\n\n`;
            }
        }

        body += "Grazie!";

        const mailtoLink = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        window.location.href = mailtoLink;
    };


    const handleAddToMenu = async () => {
        if (!addMenuText.trim()) {
            setAddError('Inserisci il testo da aggiungere.');
            return;
        }
        setIsAddingWithAI(true);
        setAddError('');

        try {
            const newCategoriesRaw = await generateMenuFromText(addMenuText);

            setLocalMenu(prevMenu => {
                if (!prevMenu) return prevMenu;

                let updatedCategories = [...prevMenu.categories];

                newCategoriesRaw.forEach(newCat => {
                    const existingCatIndex = updatedCategories.findIndex(
                        existingCat => existingCat.name.trim().toLowerCase() === newCat.name.trim().toLowerCase()
                    );

                    const newItems = newCat.items.map(item => ({
                        ...item,
                        id: `item-${Date.now()}-${Math.random()}`,
                        isAvailable: true,
                        ingredients: item.description,
                    }));

                    if (existingCatIndex > -1) {
                        const existingItemNames = new Set(updatedCategories[existingCatIndex].items.map(i => i.name.toLowerCase()));
                        const uniqueNewItems = newItems.filter(newItem => !existingItemNames.has(newItem.name.toLowerCase()));
                        updatedCategories[existingCatIndex].items.push(...uniqueNewItems);
                    } else {
                        updatedCategories.push({
                            ...newCat,
                            id: `cat-${Date.now()}-${Math.random()}`,
                            items: newItems,
                        });
                    }
                });

                return { ...prevMenu, categories: sortCategories(updatedCategories) };
            });
            setIsAddFromTextModalOpen(false);
            setAddMenuText('');
        } catch (err) {
            console.error(err);
            setAddError("L'IA non è riuscita ad analizzare il testo. Riprova.");
        } finally {
            setIsAddingWithAI(false);
        }
    };

     const handleAddFromPhoto = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files || files.length === 0) return;

        setIsAddingFromPhoto(true);
        setAddPhotoProgressMessage("Analizzo le foto...");
        setAddPhotoError('');

        try {
            const imagePromises = Array.from(files).map((file: File) =>
                fileToBase64(file).then(data => ({ data, mimeType: file.type }))
            );
            const imagesData = await Promise.all(imagePromises);
            
            setAddPhotoProgressMessage("Estraggo il testo...");
            const newCategoriesRaw = await generateMenuFromImage(imagesData);

            setAddPhotoProgressMessage("Impagino il tuo menù...");
            setLocalMenu(prevMenu => {
                if (!prevMenu) return prevMenu;

                let updatedCategories = [...prevMenu.categories];

                newCategoriesRaw.forEach(newCat => {
                    const existingCatIndex = updatedCategories.findIndex(
                        existingCat => existingCat.name.trim().toLowerCase() === newCat.name.trim().toLowerCase()
                    );

                    const newItems = newCat.items.map(item => ({
                        ...item,
                        id: `item-${Date.now()}-${Math.random()}`,
                        isAvailable: true,
                        ingredients: item.description,
                    }));

                    if (existingCatIndex > -1) {
                        const existingCategory = updatedCategories[existingCatIndex];
                        const existingItemNames = new Set(existingCategory.items.map(i => i.name.trim().toLowerCase()));
                        const uniqueNewItems = newItems.filter(newItem => !existingItemNames.has(newItem.name.trim().toLowerCase()));
                        const mergedItems = [...existingCategory.items, ...uniqueNewItems];
                        updatedCategories[existingCatIndex] = { ...existingCategory, items: mergedItems };
                    } else {
                        updatedCategories.push({
                            ...newCat,
                            id: `cat-${Date.now()}-${Math.random()}`,
                            items: newItems,
                        });
                    }
                });
                
                return { ...prevMenu, categories: sortCategories(updatedCategories) };
            });

            setAddPhotoProgress(100);

        } catch (err) {
            console.error(err);
            setAddPhotoError("L'IA non è riuscita ad analizzare le foto. Riprova.");
            setTimeout(() => setAddPhotoError(''), 5000);
        } finally {
            setIsAddingFromPhoto(false);
            if (event.target) event.target.value = '';
        }
    };

    const handleSaveChanges = () => {
        onUpdateSettings({ digitalMenu: localMenu });
        alert('Menù salvato con successo!');
    };
    
    const handleItemChange = (catId: string, itemId: string, field: keyof MenuItem, value: any) => {
        if (!localMenu) return;
        const newCategories = localMenu.categories.map(cat => {
            if (cat.id === catId) {
                return {
                    ...cat,
                    items: cat.items.map(item => item.id === itemId ? { ...item, [field]: value } : item)
                };
            }
            return cat;
        });
        setLocalMenu({ ...localMenu, categories: newCategories });
    };

    const handleCategoryNameChange = (catId: string, newName: string) => {
        if (!localMenu) return;
        const newCategories = localMenu.categories.map(cat => {
            if (cat.id === catId) {
                return { ...cat, name: newName };
            }
            return cat;
        });
        setLocalMenu({ ...localMenu, categories: newCategories });
    };

    const handleDeleteCategory = (catId: string) => {
        if (!localMenu) return;
        const newCategories = localMenu.categories.filter(cat => cat.id !== catId);
        setLocalMenu({ ...localMenu, categories: newCategories });
    };

    const handleAddDish = (catId: string) => {
        if (!localMenu) return;
        const newDish: MenuItem = {
            id: `item-${Date.now()}-${Math.random()}`,
            name: 'Nuovo Piatto',
            description: '',
            ingredients: '',
            price: 0,
            isAvailable: true,
        };
        const newCategories = localMenu.categories.map(cat => {
            if (cat.id === catId) {
                return { ...cat, items: [...cat.items, newDish] };
            }
            return cat;
        });
        setLocalMenu({ ...localMenu, categories: newCategories });
    };

    const handleDeleteDish = (catId: string, itemId: string) => {
        if (!localMenu) return;
        const newCategories = localMenu.categories.map(cat => {
            if (cat.id === catId) {
                return { ...cat, items: cat.items.filter(item => item.id !== itemId) };
            }
            return cat;
        });
        setLocalMenu({ ...localMenu, categories: newCategories });
    };

    const handleAddNewCategory = () => {
        if (!localMenu) return;
        const newCategory: MenuCategory = {
            id: `cat-${Date.now()}`,
            name: 'NUOVA CATEGORIA',
            items: [],
        };
        setLocalMenu({
            ...localMenu,
            categories: [...localMenu.categories, newCategory],
        });
    };
    
    const handleMoveCategory = (index: number, direction: 'up' | 'down') => {
        if (!localMenu) return;
        const newCategories = [...localMenu.categories];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;

        if (targetIndex < 0 || targetIndex >= newCategories.length) return;

        [newCategories[index], newCategories[targetIndex]] = [newCategories[targetIndex], newCategories[index]];
        setLocalMenu({ ...localMenu, categories: newCategories });
    };

    const handleMoveItem = (catId: string, itemIndex: number, direction: 'up' | 'down') => {
        if (!localMenu) return;
        const catIndex = localMenu.categories.findIndex(c => c.id === catId);
        if (catIndex === -1) return;

        const category = localMenu.categories[catIndex];
        const newItems = [...category.items];
        const targetIndex = direction === 'up' ? itemIndex - 1 : itemIndex + 1;

        if (targetIndex < 0 || targetIndex >= newItems.length) return;

        [newItems[itemIndex], newItems[targetIndex]] = [newItems[targetIndex], newItems[itemIndex]];
        
        const newCategories = [...localMenu.categories];
        newCategories[catIndex] = { ...category, items: newItems };
        setLocalMenu({ ...localMenu, categories: newCategories });
    };
    
     const detectedAllergens = useMemo((): string[] => {
        if (!localMenu) return [];
        const allIngredientsText = localMenu.categories.flatMap(c => c.items.map(i => i.ingredients.toLowerCase())).join(' ');
        
        const detected = new Set<string>();
        for (const [allergen, keywords] of Object.entries(allergenMap)) {
            for (const keyword of keywords) {
                if (allIngredientsText.includes(keyword)) {
                    detected.add(allergen);
                    break;
                }
            }
        }
        return Array.from(detected).sort();
    }, [localMenu]);


    if (!localMenu) {
        return (
            <MenuCreationHub
                onUpdateSettings={onUpdateSettings}
            />
        );
    }
    
    return (
        <>
        <div className="space-y-8 max-w-6xl mx-auto">
            <div className="flex justify-between items-center flex-wrap gap-4">
                <h2 className="text-3xl font-bold text-white">Gestione Menù</h2>
                <div className="flex items-center gap-3">
                     <button onClick={() => addPhotoInputRef.current?.click()} disabled={isAddingFromPhoto} className="bg-gray-700 text-white font-bold py-2 px-6 rounded-lg hover:bg-gray-600 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-wait">
                       <Icon name="camera" className="w-5 h-5" />
                       Aggiungi da Foto
                    </button>
                    <button onClick={() => setIsAddFromTextModalOpen(true)} className="bg-gray-700 text-white font-bold py-2 px-6 rounded-lg hover:bg-gray-600 transition-colors flex items-center gap-2">
                       <Icon name="sparkles" className="w-5 h-5" />
                       Aggiungi con IA
                    </button>
                    <button onClick={() => setIsPreviewOpen(true)} className="bg-gray-700 text-white font-bold py-2 px-6 rounded-lg hover:bg-gray-600 transition-colors flex items-center gap-2">
                       <Icon name="eye" className="w-5 h-5" />
                       Anteprima
                    </button>
                    <button onClick={handleSaveChanges} className="bg-amber-500 text-gray-900 font-bold py-2 px-6 rounded-lg hover:bg-amber-400 transition-colors">
                        Salva Modifiche
                    </button>
                </div>
            </div>
             {addPhotoError && <p className="text-red-400 text-sm mt-2 text-center">{addPhotoError}</p>}
            
            <div className="space-y-6">
                {localMenu.categories.map((category, catIndex) => (
                    <div 
                        key={category.id} 
                        className="bg-gray-800/70 p-4 rounded-xl border border-gray-700"
                    >
                        <div className="flex justify-between items-center mb-4">
                            <div className="flex items-center gap-3 w-full">
                                <div className="flex flex-col">
                                    <button onClick={() => handleMoveCategory(catIndex, 'up')} disabled={catIndex === 0} className="p-1 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed">
                                        <Icon name="chevron-up" className="w-5 h-5"/>
                                    </button>
                                    <button onClick={() => handleMoveCategory(catIndex, 'down')} disabled={catIndex === localMenu.categories.length - 1} className="p-1 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed">
                                        <Icon name="chevron-down" className="w-5 h-5"/>
                                    </button>
                                </div>
                                <input
                                    type="text"
                                    value={category.name}
                                    onChange={(e) => handleCategoryNameChange(category.id, e.target.value)}
                                    className="text-2xl font-bold text-amber-400 bg-transparent w-full border-b-2 border-gray-700 focus:border-amber-500 outline-none pb-2 uppercase"
                                />
                                <Icon name="pencil" className="w-5 h-5 text-gray-500 ml-2" />
                            </div>
                            <button onClick={() => handleDeleteCategory(category.id)} className="ml-4 text-gray-500 hover:text-red-400 p-2 transition-colors flex-shrink-0">
                                <Icon name="trash" className="w-6 h-6"/>
                            </button>
                        </div>

                        <div className="space-y-3 pl-4">
                            {category.items.map((item, itemIndex) => (
                                <div key={item.id} className="grid grid-cols-12 gap-4 items-center bg-gray-900/50 p-3 rounded-lg">
                                    <div className="col-span-1 flex flex-col items-center justify-center">
                                        <button onClick={() => handleMoveItem(category.id, itemIndex, 'up')} disabled={itemIndex === 0} className="p-0.5 text-gray-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed">
                                            <Icon name="chevron-up" className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => handleMoveItem(category.id, itemIndex, 'down')} disabled={itemIndex === category.items.length - 1} className="p-0.5 text-gray-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed">
                                            <Icon name="chevron-down" className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <div className="col-span-11 md:col-span-3">
                                        <input type="text" value={item.name} onChange={e => handleItemChange(category.id, item.id, 'name', e.target.value)} className="w-full bg-gray-700/50 rounded p-2 font-bold text-white focus:ring-1 focus:ring-amber-500 outline-none capitalize"/>
                                    </div>
                                    <div className="col-span-12 md:col-span-4">
                                        <input type="text" placeholder="Ingredienti..." value={item.ingredients} onChange={e => handleItemChange(category.id, item.id, 'ingredients', e.target.value)} className="w-full bg-gray-700/50 rounded p-2 text-sm text-gray-300 focus:ring-1 focus:ring-amber-500 outline-none"/>
                                    </div>
                                    <div className="col-span-6 md:col-span-2">
                                         <div className="relative">
                                            <input type="number" value={item.price || 0} onChange={e => handleItemChange(category.id, item.id, 'price', parseFloat(e.target.value) || 0)} className="w-full bg-gray-700/50 rounded p-2 text-white pl-6 focus:ring-1 focus:ring-amber-500 outline-none"/>
                                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400">€</span>
                                        </div>
                                    </div>
                                    <div className="col-span-6 md:col-span-2 flex items-center justify-end gap-2">
                                        <button
                                            onClick={() => handleItemChange(category.id, item.id, 'isAvailable', !item.isAvailable)}
                                            className={`px-3 py-2 text-xs font-bold rounded-full transition-colors ${item.isAvailable ? 'bg-green-500/20 text-green-300 hover:bg-green-500/40' : 'bg-red-500/20 text-red-300 hover:bg-red-500/40'}`}
                                        >
                                           {item.isAvailable ? 'Dispon.' : 'Esaurito'}
                                        </button>
                                        <button onClick={() => handleDeleteDish(category.id, item.id)} className="text-gray-500 hover:text-red-400"><Icon name="trash" className="w-5 h-5"/></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="mt-4">
                            <button onClick={() => handleAddDish(category.id)} className="w-full bg-gray-700/50 hover:bg-gray-700 text-amber-400 font-semibold py-2 px-3 rounded-md transition-colors duration-200 flex items-center justify-center gap-2 text-sm">
                                <Icon name="plus" className="w-5 h-5" />
                                Aggiungi Piatto
                            </button>
                        </div>
                    </div>
                ))}
            </div>
            
            <div className="mt-8 pt-6 border-t border-gray-700 text-center">
                <h3 className="text-xl font-bold text-white mb-4">Aggiungi Nuova Categoria</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
                    <button onClick={() => addPhotoInputRef.current?.click()} disabled={isAddingFromPhoto} className="flex flex-col items-center justify-center p-4 bg-gray-800/70 rounded-xl border border-gray-700 hover:border-amber-500 hover:bg-gray-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                        <Icon name="camera" className="w-8 h-8 text-amber-400 mb-2"/>
                        <span className="font-bold text-white">Aggiungi da Foto</span>
                        <span className="text-xs text-gray-400 mt-1">Scatta o carica una foto</span>
                    </button>
                     <button onClick={() => setIsAddFromTextModalOpen(true)} className="flex flex-col items-center justify-center p-4 bg-gray-800/70 rounded-xl border border-gray-700 hover:border-amber-500 hover:bg-gray-800 transition-all">
                        <Icon name="sparkles" className="w-8 h-8 text-amber-400 mb-2"/>
                        <span className="font-bold text-white">Aggiungi con Testo (IA)</span>
                        <span className="text-xs text-gray-400 mt-1">Incolla il testo del menù</span>
                    </button>
                     <button onClick={handleAddNewCategory} className="flex flex-col items-center justify-center p-4 bg-gray-800/70 rounded-xl border border-gray-700 hover:border-amber-500 hover:bg-gray-800 transition-all">
                        <Icon name="pencil" className="w-8 h-8 text-amber-400 mb-2"/>
                        <span className="font-bold text-white">Aggiungi Manualmente</span>
                        <span className="text-xs text-gray-400 mt-1">Inserisci una categoria vuota</span>
                    </button>
                </div>
            </div>


             <div className="bg-gray-800/70 p-4 rounded-xl border border-gray-700">
                <h3 className="text-xl font-bold text-white mb-3">Lista Allergeni (Generata Automaticamente)</h3>
                {detectedAllergens.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                        {detectedAllergens.map(allergen => (
                            <span key={allergen} className="bg-blue-500/20 text-blue-300 text-sm font-semibold px-3 py-1 rounded-full">{allergen}</span>
                        ))}
                    </div>
                ) : (
                    <p className="text-gray-500">Nessun allergene rilevato. Aggiungi ingredienti ai piatti per generare la lista.</p>
                )}
             </div>

            <div className="bg-gray-800/70 p-6 rounded-xl border border-gray-700">
                <h3 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
                    <Icon name="link" className="w-7 h-7 text-amber-400"/>
                    Widget per il tuo Sito Web
                </h3>
                
                <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700 mb-6">
                    <div className="flex items-center justify-between">
                         <label htmlFor="showPrices" className="text-gray-300 font-semibold">Mostra prezzi sul widget del menù</label>
                         <button
                            id="showPrices"
                            onClick={() => setLocalMenu({ ...localMenu, showPrices: !localMenu.showPrices })}
                            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-gray-900 ${localMenu.showPrices ? 'bg-green-500' : 'bg-gray-600'}`}
                         >
                            <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${localMenu.showPrices ? 'translate-x-5' : 'translate-x-0'}`} />
                         </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700 flex flex-col">
                        <div className="flex justify-between items-center mb-2">
                           <h4 className="font-bold text-lg text-amber-400">Widget Menù Completo</h4>
                           <input type="checkbox" checked={selectedWidgets.has('menu')} onChange={() => handleWidgetSelection('menu')} title="Seleziona questo widget" className="h-5 w-5 bg-gray-700 border-gray-600 rounded text-amber-500 focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-amber-500 cursor-pointer"/>
                        </div>
                        <p className="text-gray-400 text-sm mb-4 flex-grow">Incorpora l'intero menù interattivo in una pagina del tuo sito.</p>
                        <div className="bg-gray-950 p-3 rounded-md font-mono text-xs text-gray-400 relative">
                            <pre className="overflow-x-auto"><code>{menuWidgetCode}</code></pre>
                            <button 
                                onClick={() => handleCopy(menuWidgetCode, 'menu')}
                                className="absolute top-2 right-2 flex items-center gap-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 px-2 py-1 rounded-md text-xs transition-colors"
                            >
                                {copiedWidget === 'menu' ? <Icon name="check" className="w-3 h-3 text-green-400" /> : <Icon name="copy" className="w-3 h-3" />}
                                {copiedWidget === 'menu' ? 'Copiato' : 'Copia'}
                            </button>
                        </div>
                    </div>

                    <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700 flex flex-col">
                         <div className="flex justify-between items-center mb-2">
                           <h4 className="font-bold text-lg text-amber-400">Widget Prenotazioni</h4>
                           <input type="checkbox" checked={selectedWidgets.has('booking')} onChange={() => handleWidgetSelection('booking')} title="Seleziona questo widget" className="h-5 w-5 bg-gray-700 border-gray-600 rounded text-amber-500 focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-amber-500 cursor-pointer"/>
                        </div>
                        <p className="text-gray-400 text-sm mb-4 flex-grow">Permetti ai clienti di prenotare direttamente da una pagina del tuo sito.</p>
                        <div className="bg-gray-950 p-3 rounded-md font-mono text-xs text-gray-400 relative">
                            <pre className="overflow-x-auto"><code>{bookingWidgetCode}</code></pre>
                             <button 
                                onClick={() => handleCopy(bookingWidgetCode, 'booking')}
                                className="absolute top-2 right-2 flex items-center gap-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 px-2 py-1 rounded-md text-xs transition-colors"
                            >
                                {copiedWidget === 'booking' ? <Icon name="check" className="w-3 h-3 text-green-400" /> : <Icon name="copy" className="w-3 h-3" />}
                                {copiedWidget === 'booking' ? 'Copiato' : 'Copia'}
                            </button>
                        </div>
                    </div>

                     <div className="lg:col-span-2 bg-gray-900/50 p-4 rounded-lg border border-gray-700 flex flex-col">
                        <div className="flex justify-between items-center mb-2">
                           <h4 className="font-bold text-lg text-amber-400">Pulsante "Prenota Ora"</h4>
                           <input type="checkbox" checked={selectedWidgets.has('button')} onChange={() => handleWidgetSelection('button')} title="Seleziona questo widget" className="h-5 w-5 bg-gray-700 border-gray-600 rounded text-amber-500 focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-amber-500 cursor-pointer"/>
                        </div>
                        <p className="text-gray-400 text-sm mb-4 flex-grow">Aggiungi un semplice pulsante che apre il widget di prenotazione in un popup. Ideale da inserire in più punti del sito.</p>
                        <div className="bg-gray-950 p-3 rounded-md font-mono text-xs text-gray-400 relative">
                            <pre className="overflow-x-auto"><code>{buttonWidgetCode}</code></pre>
                             <button 
                                onClick={() => handleCopy(buttonWidgetCode, 'button')}
                                className="absolute top-2 right-2 flex items-center gap-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 px-2 py-1 rounded-md text-xs transition-colors"
                            >
                                {copiedWidget === 'button' ? <Icon name="check" className="w-3 h-3 text-green-400" /> : <Icon name="copy" className="w-3 h-3" />}
                                {copiedWidget === 'button' ? 'Copiato' : 'Copia'}
                            </button>
                        </div>
                    </div>
                </div>
                {selectedWidgets.size > 0 && (
                    <div className="mt-6 pt-6 border-t border-gray-700">
                        <button
                            onClick={handleSendToWebmaster}
                            className="w-full bg-blue-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-blue-500 transition-colors flex items-center justify-center gap-3 disabled:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Icon name="email" className="w-5 h-5" />
                            Invia al Webmaster ({selectedWidgets.size} selezionati)
                        </button>
                    </div>
                )}
            </div>

        </div>
        
        <input
            type="file"
            ref={addPhotoInputRef}
            onChange={handleAddFromPhoto}
            accept="image/*"
            capture="environment"
            className="hidden"
            multiple
        />

        {isPreviewOpen && (
            <MenuPreview
                menu={localMenu}
                allergens={detectedAllergens}
                onClose={() => setIsPreviewOpen(false)}
            />
        )}
        
        {isAddFromTextModalOpen && (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                <div className="bg-gray-800 rounded-2xl shadow-2xl border border-gray-700 w-full max-w-2xl">
                    <div className="p-6">
                        <div className="flex justify-between items-center mb-4">
                           <h3 className="text-xl font-bold text-white">Aggiungi Piatti al Menù con IA</h3>
                            <button onClick={() => setIsAddFromTextModalOpen(false)} className="text-gray-400 hover:text-white">
                                <Icon name="x-circle" className="w-6 h-6" />
                            </button>
                        </div>
                        <p className="text-gray-400 mb-4 text-sm">Incolla qui il testo di un'altra sezione del tuo menù (es. Primi Piatti). L'IA la analizzerà e la aggiungerà a quello esistente.</p>
                        <textarea
                            value={addMenuText}
                            onChange={e => setAddMenuText(e.target.value)}
                            placeholder="Es: PRIMI PIATTI - Carbonara 12€ - Amatriciana 11€..."
                            className="w-full h-40 bg-gray-900 border-gray-600 rounded-md p-3 focus:ring-2 focus:ring-amber-500 outline-none transition"
                            aria-label="Incolla qui il testo da aggiungere"
                        />
                        {addError && <p className="text-red-400 text-sm mt-2">{addError}</p>}
                        {isAddingWithAI && (
                            <div className="mt-4 space-y-2">
                                <div className="w-full bg-gray-700 rounded-full h-4 relative overflow-hidden border border-gray-600">
                                    <div 
                                        className="bg-gradient-to-r from-amber-400 to-amber-500 h-full rounded-full transition-all duration-300 ease-linear" 
                                        style={{ width: `${progress}%` }}
                                    ></div>
                                    <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white mix-blend-difference px-2">
                                        {`Analisi in corso... ${Math.floor(progress)}%`}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="bg-gray-800/50 p-4 border-t border-gray-700 flex justify-end">
                         <button
                            onClick={handleAddToMenu}
                            disabled={isAddingWithAI}
                            className="w-full flex items-center justify-center gap-2 bg-amber-500 text-gray-900 font-bold py-2 px-4 rounded-lg hover:bg-amber-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                         >
                            {isAddingWithAI ? 'Aggiungendo...' : (
                                <>
                                    <Icon name="sparkles" className="w-5 h-5" />
                                    Aggiungi al Menù
                                </>
                            )}
                         </button>
                    </div>
                </div>
            </div>
        )}

        {isAddingFromPhoto && (
            <div className="fixed inset-0 bg-black/80 flex flex-col items-center justify-center z-50 p-4 backdrop-blur-sm">
                <Icon name="camera" className="w-16 h-16 text-amber-400 mx-auto mb-4 animate-pulse" />
                <h2 className="text-3xl font-bold text-white mb-4">Un attimo di pazienza...</h2>
                <div className="w-full max-w-md space-y-2">
                    <div className="w-full bg-gray-700 rounded-full h-4 relative overflow-hidden border border-gray-600">
                        <div 
                            className="bg-gradient-to-r from-amber-400 to-amber-500 h-full rounded-full transition-all duration-300 ease-linear" 
                            style={{ width: `${addPhotoProgress}%` }}
                        ></div>
                        <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white mix-blend-difference px-2">
                            {`${addPhotoProgressMessage} ${Math.floor(addPhotoProgress)}%`}
                        </span>
                    </div>
                </div>
                {addPhotoError && <p className="text-red-400 text-sm mt-4">{addPhotoError}</p>}
            </div>
        )}
        </>
    );
};

export default MenuManager;