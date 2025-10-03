import React, { useState, useMemo, useCallback, useEffect, DragEvent } from 'react';
import { AdminSettings as AdminSettingsType, DigitalMenu, MenuCategory, MenuItem } from '../types';
import Icon from './Icon';
import { generateMenuFromText } from '../services/geminiService';
import MenuPreview from './MenuPreview';

interface MenuManagerProps {
    settings: AdminSettingsType;
    onUpdateSettings: (settings: Partial<AdminSettingsType>) => void;
}

// Drag item types
type DraggedItem = {
    type: 'category';
    index: number;
} | {
    type: 'item';
    index: number;
    categoryId: string;
};

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

const MenuManager: React.FC<MenuManagerProps> = ({ settings, onUpdateSettings }) => {
    const [localMenu, setLocalMenu] = useState<DigitalMenu | null>(settings.digitalMenu);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [menuText, setMenuText] = useState('');
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isAddingWithAI, setIsAddingWithAI] = useState(false);
    const [addMenuText, setAddMenuText] = useState('');
    const [addError, setAddError] = useState('');
    
    const [progress, setProgress] = useState(0);

    // Drag and Drop state
    const [draggedItem, setDraggedItem] = useState<DraggedItem | null>(null);
    const [dragOverInfo, setDragOverInfo] = useState<{ id: string; position: 'top' | 'bottom' } | null>(null);


    useEffect(() => {
        if (isLoading || isAddingWithAI) {
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
            }, 250);
            return () => clearInterval(timer);
        }
    }, [isLoading, isAddingWithAI]);


    const handleGenerateMenu = async () => {
        if (!menuText.trim()) {
            setError('Inserisci il testo del tuo menù.');
            return;
        }
        setIsLoading(true);
        setError('');
        try {
            const generatedCategories = await generateMenuFromText(menuText);
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
                        ingredients: item.description, // Start with description as ingredients
                    }))
                }))
            };
            setLocalMenu(newMenu);
        } catch (err) {
            console.error(err);
            setError("L'IA non è riuscita a generare il menù. Prova a modificare il testo o riprova più tardi.");
        } finally {
            setIsLoading(false);
        }
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

                const updatedCategories = [...prevMenu.categories];

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

                return { ...prevMenu, categories: updatedCategories };
            });
            setIsAddModalOpen(false);
            setAddMenuText('');
        } catch (err) {
            console.error(err);
            setAddError("L'IA non è riuscita ad analizzare il testo. Riprova.");
        } finally {
            setIsAddingWithAI(false);
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
    
    const onDragStart = (e: DragEvent, item: DraggedItem) => {
        setDraggedItem(item);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', JSON.stringify(item)); // For firefox
    };

    const onDragOver = (e: DragEvent, targetId: string) => {
        e.preventDefault();
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const midpoint = rect.top + rect.height / 2;
        const position = e.clientY < midpoint ? 'top' : 'bottom';
        if (dragOverInfo?.id !== targetId || dragOverInfo?.position !== position) {
            setDragOverInfo({ id: targetId, position });
        }
    };

    const onDrop = (e: DragEvent, dropTargetId: string) => {
        e.preventDefault();
        if (!draggedItem || !localMenu) return;

        // --- Category Drop Logic ---
        if (draggedItem.type === 'category' && dragOverInfo) {
            const draggedCategory = localMenu.categories[draggedItem.index];
            if (draggedCategory.id === dropTargetId) {
                setDragOverInfo(null);
                setDraggedItem(null);
                return;
            };

            const targetIndex = localMenu.categories.findIndex(c => c.id === dropTargetId);
            const categories = [...localMenu.categories];
            categories.splice(draggedItem.index, 1);
            
            const finalIndex = dragOverInfo.position === 'top' ? targetIndex : targetIndex + 1;
            categories.splice(finalIndex, 0, draggedCategory);
            setLocalMenu({ ...localMenu, categories });
        }
        
        // --- Item Drop Logic ---
        if (draggedItem.type === 'item' && dragOverInfo) {
            const dropTargetCategory = localMenu.categories.find(c => c.items.some(i => i.id === dropTargetId));
            if (!dropTargetCategory || draggedItem.categoryId !== dropTargetCategory.id) {
                setDragOverInfo(null);
                setDraggedItem(null);
                return;
            }

            const categoryIndex = localMenu.categories.findIndex(c => c.id === draggedItem.categoryId);
            if (categoryIndex === -1) return;
            
            const category = localMenu.categories[categoryIndex];
            const draggedItemData = category.items[draggedItem.index];
            const targetItemIndex = category.items.findIndex(i => i.id === dropTargetId);

            const items = [...category.items];
            items.splice(draggedItem.index, 1);
            const finalIndex = dragOverInfo.position === 'top' ? targetItemIndex : targetItemIndex + 1;
            items.splice(finalIndex, 0, draggedItemData);
            
            const newCategories = [...localMenu.categories];
            newCategories[categoryIndex] = { ...category, items };
            setLocalMenu({ ...localMenu, categories: newCategories });
        }
        
        setDragOverInfo(null);
        setDraggedItem(null);
    };

    const onDragEnd = () => {
        setDragOverInfo(null);
        setDraggedItem(null);
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
            <div className="max-w-4xl mx-auto bg-gray-800/70 p-8 rounded-xl border border-gray-700 text-center">
                <Icon name="book-open" className="w-16 h-16 text-amber-400 mx-auto mb-4" />
                <h2 className="text-3xl font-bold text-white mb-2">Crea il tuo Menù Digitale</h2>
                <p className="text-gray-400 mb-6">Inizia incollando il testo del tuo menù attuale. La nostra IA lo analizzerà e lo strutturerà per te in pochi secondi.</p>
                <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700">
                    <textarea
                        value={menuText}
                        onChange={e => setMenuText(e.target.value)}
                        placeholder="Es: ANTIPASTI - Bruschetta al pomodoro 5€ - Caprese 8€..."
                        className="w-full h-48 bg-gray-800 border-gray-600 rounded-md p-3 focus:ring-2 focus:ring-amber-500 outline-none transition"
                        aria-label="Incolla qui il testo del tuo menù"
                    />
                     {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
                     
                     {isLoading && (
                        <div className="mt-4 space-y-2">
                            <div className="w-full bg-gray-700 rounded-full h-4 relative overflow-hidden border border-gray-600">
                                <div 
                                    className="bg-gradient-to-r from-amber-400 to-amber-500 h-full rounded-full transition-all duration-300 ease-linear" 
                                    style={{ width: `${progress}%` }}
                                ></div>
                                <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white mix-blend-difference px-2">
                                    {`L'IA sta analizzando il menù... ${Math.floor(progress)}%`}
                                </span>
                            </div>
                        </div>
                     )}

                    <button onClick={handleGenerateMenu} disabled={isLoading} className="mt-4 w-full flex items-center justify-center gap-2 bg-amber-500 text-gray-900 font-bold py-3 px-4 rounded-lg hover:bg-amber-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                        {!isLoading && <Icon name="sparkles" className="w-5 h-5" /> }
                        Genera Menù con IA
                    </button>
                </div>
            </div>
        );
    }

    const getDropIndicator = (id: string) => {
        if (dragOverInfo?.id !== id) return null;
        const baseStyle = "absolute left-0 right-0 h-1 bg-amber-500 rounded-full z-10 transition-all";
        if (dragOverInfo.position === 'top') return <div className={`${baseStyle} -top-2`}></div>;
        if (dragOverInfo.position === 'bottom') return <div className={`${baseStyle} -bottom-2`}></div>;
        return null;
    };


    return (
        <>
        <div className="space-y-8 max-w-6xl mx-auto">
            <div className="flex justify-between items-center flex-wrap gap-4">
                <h2 className="text-3xl font-bold text-white">Gestione Menù</h2>
                <div className="flex items-center gap-3">
                    <button onClick={() => setIsAddModalOpen(true)} className="bg-gray-700 text-white font-bold py-2 px-6 rounded-lg hover:bg-gray-600 transition-colors flex items-center gap-2">
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
            
            <div className="bg-gray-800/70 p-4 rounded-xl border border-gray-700">
                <h3 className="text-xl font-bold text-white mb-3">Impostazioni Menù</h3>
                <div className="flex items-center justify-between">
                     <label htmlFor="showPrices" className="text-gray-300">Mostra prezzi sul sito web</label>
                     <button
                        id="showPrices"
                        onClick={() => setLocalMenu({ ...localMenu, showPrices: !localMenu.showPrices })}
                        className={`w-14 h-8 rounded-full p-1 transition-colors ${localMenu.showPrices ? 'bg-green-500' : 'bg-gray-600'}`}
                     >
                        <span className={`block w-6 h-6 rounded-full bg-white transform transition-transform ${localMenu.showPrices ? 'translate-x-6' : 'translate-x-0'}`} />
                     </button>
                </div>
                 <div className="mt-3">
                     <p className="text-gray-300 mb-2">Codice per incorporare il menù nel tuo sito:</p>
                     <input type="text" readOnly value={`<iframe src="https://your-restaurant-url/menu" width="100%" height="800px"></iframe>`} className="w-full bg-gray-900/50 border-gray-600 rounded-md p-2 text-gray-400 font-mono text-sm"/>
                 </div>
            </div>

            <div className="space-y-6">
                {localMenu.categories.map((category, catIndex) => (
                    <div 
                        key={category.id} 
                        className="bg-gray-800/70 p-4 rounded-xl border border-gray-700 relative"
                        draggable={true}
                        onDragStart={(e) => onDragStart(e, { type: 'category', index: catIndex })}
                        onDragOver={(e) => onDragOver(e, category.id)}
                        onDrop={(e) => onDrop(e, category.id)}
                        onDragEnd={onDragEnd}
                        onDragLeave={() => setDragOverInfo(null)}
                    >
                        {getDropIndicator(category.id)}
                        <div className="flex justify-between items-center mb-4">
                            <div className="flex items-center gap-3 w-full">
                                <Icon name="grip-vertical" className="w-6 h-6 text-gray-500 cursor-move touch-none" />
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

                        <div className="space-y-3">
                            {category.items.map((item, itemIndex) => (
                                <div 
                                    key={item.id} 
                                    className="grid grid-cols-12 gap-4 items-center bg-gray-900/50 p-3 rounded-lg relative"
                                    draggable={true}
                                    onDragStart={(e) => { e.stopPropagation(); onDragStart(e, { type: 'item', index: itemIndex, categoryId: category.id }); }}
                                    onDragOver={(e) => { e.stopPropagation(); onDragOver(e, item.id); }}
                                    onDrop={(e) => { e.stopPropagation(); onDrop(e, item.id); }}
                                    onDragEnd={(e) => { e.stopPropagation(); onDragEnd(); }}
                                    onDragLeave={(e) => { e.stopPropagation(); setDragOverInfo(null); }}
                                >
                                    {getDropIndicator(item.id)}
                                    <div className="col-span-1 flex items-center justify-center">
                                       <Icon name="grip-vertical" className="w-5 h-5 text-gray-600 cursor-move touch-none" />
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
            
            <div className="mt-6">
                <button 
                    onClick={handleAddNewCategory}
                    className="w-full bg-gray-800/70 hover:bg-gray-800 border-2 border-dashed border-gray-700 hover:border-amber-500 text-amber-400 font-semibold py-3 px-3 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
                >
                    <Icon name="plus" className="w-6 h-6" />
                    Aggiungi Nuova Categoria
                </button>
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

        </div>

        {isPreviewOpen && (
            <MenuPreview
                menu={localMenu}
                allergens={detectedAllergens}
                onClose={() => setIsPreviewOpen(false)}
            />
        )}
        
        {isAddModalOpen && (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                <div className="bg-gray-800 rounded-2xl shadow-2xl border border-gray-700 w-full max-w-2xl">
                    <div className="p-6">
                        <div className="flex justify-between items-center mb-4">
                           <h3 className="text-xl font-bold text-white">Aggiungi Piatti al Menù con IA</h3>
                            <button onClick={() => setIsAddModalOpen(false)} className="text-gray-400 hover:text-white">
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
        </>
    );
};

export default MenuManager;