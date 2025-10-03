import React, { useState, useEffect, useRef } from 'react';
import { AdminSettings as AdminSettingsType, DigitalMenu, MenuCategory, MenuItem, Allergen, DietaryProfile } from '../types';
import Icon from './Icon';
import { generateMenuFromText, generateMenuFromImage, analyzeIngredientsForTags } from '../services/geminiService';
import MenuPreview from './MenuPreview';
import MenuCreationHub from './MenuCreationHub';

interface MenuManagerProps {
    settings: AdminSettingsType;
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

const TagIcon: React.FC<{ tag: Allergen | DietaryProfile, size?: 'sm' | 'md' }> = ({ tag, size = 'sm' }) => {
    const styles: Record<Allergen | DietaryProfile, { icon: React.ComponentProps<typeof Icon>['name'], color: string }> = {
        [Allergen.Gluten]: { icon: 'gluten', color: 'text-orange-400' },
        [Allergen.Crustaceans]: { icon: 'crustaceans', color: 'text-red-400' },
        [Allergen.Eggs]: { icon: 'eggs', color: 'text-yellow-300' },
        [Allergen.Fish]: { icon: 'fish', color: 'text-blue-400' },
        [Allergen.Peanuts]: { icon: 'peanuts', color: 'text-amber-600' },
        [Allergen.Soy]: { icon: 'soy', color: 'text-green-600' },
        [Allergen.Milk]: { icon: 'milk', color: 'text-gray-300' },
        [Allergen.Nuts]: { icon: 'nuts', color: 'text-yellow-700' },
        [Allergen.Celery]: { icon: 'celery', color: 'text-lime-400' },
        [Allergen.Mustard]: { icon: 'mustard', color: 'text-yellow-500' },
        [Allergen.Sesame]: { icon: 'sesame', color: 'text-stone-400' },
        [Allergen.Sulphites]: { icon: 'sulphites', color: 'text-purple-400' },
        [Allergen.Lupin]: { icon: 'lupin', color: 'text-fuchsia-400' },
        [Allergen.Molluscs]: { icon: 'molluscs', color: 'text-cyan-400' },
        [DietaryProfile.Vegetarian]: { icon: 'vegetarian', color: 'text-green-400' },
        [DietaryProfile.Vegan]: { icon: 'vegan', color: 'text-teal-400' },
        [DietaryProfile.GlutenFree]: { icon: 'gluten-free', color: 'text-sky-400' },
    };
    const { icon, color } = styles[tag] || {};
    if (!icon) return null;
    
    const sizeClass = size === 'sm' ? 'w-5 h-5' : 'w-6 h-6';

    return (
        <div className="group relative">
            <Icon name={icon} className={`${sizeClass} ${color}`} />
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-auto whitespace-nowrap bg-gray-900 text-gray-300 text-xs font-bold rounded-lg px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg border border-gray-600 z-10">
                {tag}
            </div>
        </div>
    );
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

    const [editingTagsItem, setEditingTagsItem] = useState<{ catId: string; item: MenuItem; } | null>(null);
    const [showAiTip, setShowAiTip] = useState(false);

    useEffect(() => {
        // Check if the user has dismissed the tip before
        if (localStorage.getItem('aiMenuTipDismissed') !== 'true') {
            setShowAiTip(true);
        }
    }, []);

    const handleDismissAiTip = () => {
        localStorage.setItem('aiMenuTipDismissed', 'true');
        setShowAiTip(false);
    };

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
                    items: cat.items.map(item => {
                        if (item.id === itemId) {
                            const updatedItem = { ...item, [field]: value };
                            // Auto-update tags when name or ingredients change
                            if (field === 'name' || field === 'ingredients') {
                                const combinedTextForAnalysis = `${updatedItem.name} ${updatedItem.ingredients}`;
                                const tags = analyzeIngredientsForTags(combinedTextForAnalysis);
                                updatedItem.allergens = tags.allergens;
                                updatedItem.dietaryProfiles = tags.dietaryProfiles;
                            }
                            return updatedItem;
                        }
                        return item;
                    })
                };
            }
            return cat;
        });
        setLocalMenu({ ...localMenu, categories: newCategories });
    };
    
    const handleTagModalChange = (type: 'profile' | 'allergen', value: DietaryProfile | Allergen) => {
        if (!editingTagsItem) return;

        const { item } = editingTagsItem;
        let newProfiles = [...item.dietaryProfiles];
        let newAllergens = [...item.allergens];

        if (type === 'profile') {
            const profile = value as DietaryProfile;
            if (newProfiles.includes(profile)) {
                newProfiles = newProfiles.filter(p => p !== profile);
            } else {
                newProfiles.push(profile);
                if (profile === DietaryProfile.GlutenFree) {
                    newAllergens = newAllergens.filter(a => a !== Allergen.Gluten);
                }
            }
        } else { // type === 'allergen'
            const allergen = value as Allergen;
            if (newAllergens.includes(allergen)) {
                newAllergens = newAllergens.filter(a => a !== allergen);
            } else {
                newAllergens.push(allergen);
                if (allergen === Allergen.Gluten) {
                    newProfiles = newProfiles.filter(p => p !== DietaryProfile.GlutenFree);
                }
            }
        }
        
        setEditingTagsItem(prev => prev ? {
            ...prev,
            item: {
                ...prev.item,
                dietaryProfiles: newProfiles.sort(),
                allergens: newAllergens.sort()
            }
        } : null);
    };

    const handleItemTagsChange = (catId: string, itemId: string, newAllergens: Allergen[], newProfiles: DietaryProfile[]) => {
        if (!localMenu) return;
        const newCategories = localMenu.categories.map(cat => {
            if (cat.id === catId) {
                return {
                    ...cat,
                    items: cat.items.map(item => 
                        item.id === itemId 
                        ? { ...item, allergens: newAllergens, dietaryProfiles: newProfiles } 
                        : item
                    )
                };
            }
            return cat;
        });
        setLocalMenu({ ...localMenu, categories: newCategories });
        setEditingTagsItem(null);
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
            allergens: [],
            dietaryProfiles: [],
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

    if (!localMenu) {
        return <MenuCreationHub onUpdateSettings={onUpdateSettings} />;
    }

    const hasItems = localMenu.categories.some(cat => cat.items.length > 0);
    
    return (
        <>
        <div className="space-y-8 max-w-6xl mx-auto">
             {showAiTip && hasItems && (
                <div className="bg-blue-900/50 border border-blue-700 text-blue-300 p-4 rounded-lg flex items-start gap-4 transition-all duration-300">
                    <Icon name="info-circle" className="w-8 h-8 text-blue-400 flex-shrink-0 mt-1" />
                    <div className="flex-grow">
                        <h4 className="font-bold text-white">Un consiglio dal tuo assistente AI</h4>
                        <p className="text-sm mt-1">
                            L'IA ha analizzato il tuo menù per assegnare automaticamente etichette (es. Vegetariano, Allergeni). A volte, termini specifici o dialettali (es. 'Paccheri', 'Pici') potrebbero sfuggire.
                        </p>
                        <p className="text-sm mt-2 font-semibold">
                            Per un menù perfetto, ti consigliamo di verificare rapidamente le etichette di ogni piatto e correggerle se necessario con l'icona a matita (✏️). È un piccolo controllo che garantisce la massima precisione per i tuoi clienti.
                        </p>
                    </div>
                    <button onClick={handleDismissAiTip} className="text-blue-400 hover:text-white p-1">
                        <Icon name="x-circle" className="w-6 h-6" />
                    </button>
                </div>
            )}

            <div className="flex justify-between items-center flex-wrap gap-4">
                <div className="flex items-center gap-4">
                    <h2 className="text-3xl font-bold text-[var(--text-primary)]">Gestione Menù</h2>
                    {!hasItems && (
                        <button 
                            onClick={() => onUpdateSettings({ digitalMenu: null })} 
                            className="bg-[var(--background-tertiary)] text-[var(--text-secondary)] font-bold py-2 px-4 rounded-lg hover:bg-[var(--background-interactive)] hover:text-[var(--text-primary)] transition-colors flex items-center gap-2 text-sm"
                        >
                            <Icon name="refresh" className="w-4 h-4" />
                            Cambia Metodo
                        </button>
                    )}
                </div>
                <div className="flex items-center gap-3">
                     <button onClick={() => addPhotoInputRef.current?.click()} disabled={isAddingFromPhoto} className="bg-[var(--background-tertiary)] text-[var(--text-primary)] font-bold py-2 px-6 rounded-lg hover:bg-[var(--background-interactive)] transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-wait">
                       <Icon name="camera" className="w-5 h-5" />
                       Aggiungi da Foto
                    </button>
                    <button onClick={() => setIsAddFromTextModalOpen(true)} className="bg-[var(--background-tertiary)] text-[var(--text-primary)] font-bold py-2 px-6 rounded-lg hover:bg-[var(--background-interactive)] transition-colors flex items-center gap-2">
                       <Icon name="sparkles" className="w-5 h-5" />
                       Aggiungi con IA
                    </button>
                    <button onClick={() => setIsPreviewOpen(true)} className="bg-[var(--background-tertiary)] text-[var(--text-primary)] font-bold py-2 px-6 rounded-lg hover:bg-[var(--background-interactive)] transition-colors flex items-center gap-2">
                       <Icon name="eye" className="w-5 h-5" />
                       Anteprima
                    </button>
                    <button onClick={handleSaveChanges} className="bg-[var(--accent-primary)] text-[var(--accent-text)] font-bold py-2 px-6 rounded-lg hover:bg-[var(--accent-primary-hover)] transition-colors">
                        Salva Modifiche
                    </button>
                </div>
            </div>
             {addPhotoError && <p className="text-[var(--negative-text)] text-sm mt-2 text-center">{addPhotoError}</p>}
            
            <div className="space-y-6">
                {localMenu.categories.map((category, catIndex) => (
                    <div key={category.id} className="bg-[var(--background-secondary)] p-4 rounded-xl border border-[var(--border-primary)]">
                        <div className="flex justify-between items-center mb-4">
                            <div className="flex items-center gap-3 w-full">
                                <div className="flex flex-col">
                                    <button onClick={() => handleMoveCategory(catIndex, 'up')} disabled={catIndex === 0} className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-30 disabled:cursor-not-allowed"><Icon name="chevron-up" className="w-5 h-5"/></button>
                                    <button onClick={() => handleMoveCategory(catIndex, 'down')} disabled={catIndex === localMenu.categories.length - 1} className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-30 disabled:cursor-not-allowed"><Icon name="chevron-down" className="w-5 h-5"/></button>
                                </div>
                                <input type="text" value={category.name} onChange={(e) => handleCategoryNameChange(category.id, e.target.value)} className="text-2xl font-bold text-[var(--text-accent)] bg-transparent w-full border-b-2 border-[var(--border-primary)] focus:border-[var(--accent-primary)] outline-none pb-2 uppercase" />
                                <Icon name="pencil" className="w-5 h-5 text-[var(--text-secondary)]/50 ml-2" />
                            </div>
                            <button onClick={() => handleDeleteCategory(category.id)} className="ml-4 text-[var(--text-secondary)] hover:text-[var(--negative)] p-2 transition-colors flex-shrink-0"><Icon name="trash" className="w-6 h-6"/></button>
                        </div>

                        <div className="space-y-3 pl-4">
                            {category.items.map((item, itemIndex) => (
                                <div key={item.id} className="grid grid-cols-12 gap-4 items-center bg-[var(--background-primary)] p-3 rounded-lg">
                                    <div className="col-span-1 flex flex-col items-center justify-center">
                                        <button onClick={() => handleMoveItem(category.id, itemIndex, 'up')} disabled={itemIndex === 0} className="p-0.5 text-[var(--text-secondary)]/80 hover:text-[var(--text-primary)] disabled:opacity-30 disabled:cursor-not-allowed"><Icon name="chevron-up" className="w-4 h-4" /></button>
                                        <button onClick={() => handleMoveItem(category.id, itemIndex, 'down')} disabled={itemIndex === category.items.length - 1} className="p-0.5 text-[var(--text-secondary)]/80 hover:text-[var(--text-primary)] disabled:opacity-30 disabled:cursor-not-allowed"><Icon name="chevron-down" className="w-4 h-4" /></button>
                                    </div>
                                    <div className="col-span-11 md:col-span-4">
                                        <input type="text" value={item.name} onChange={e => handleItemChange(category.id, item.id, 'name', e.target.value)} className="w-full bg-[var(--background-tertiary)]/50 rounded p-2 font-bold text-[var(--text-primary)] border border-[var(--border-secondary)] focus:ring-2 focus:ring-[var(--accent-primary)] outline-none capitalize"/>
                                        <div className="flex items-center gap-2 mt-2">
                                            {item.dietaryProfiles.map(p => <TagIcon key={p} tag={p} />)}
                                            {item.allergens.map(a => <TagIcon key={a} tag={a} />)}
                                        </div>
                                    </div>
                                    <div className="col-span-12 md:col-span-5">
                                        <input type="text" placeholder="Ingredienti..." value={item.ingredients} onChange={e => handleItemChange(category.id, item.id, 'ingredients', e.target.value)} className="w-full bg-[var(--background-tertiary)]/50 rounded p-2 text-sm text-[var(--text-secondary)] border border-[var(--border-secondary)] focus:ring-2 focus:ring-[var(--accent-primary)] outline-none"/>
                                    </div>
                                    <div className="col-span-12 md:col-span-2 flex items-center justify-end gap-2">
                                        <div className="relative"><input type="number" value={item.price || 0} onChange={e => handleItemChange(category.id, item.id, 'price', parseFloat(e.target.value) || 0)} className="w-20 bg-[var(--background-tertiary)]/50 rounded p-2 text-[var(--text-primary)] pl-6 border border-[var(--border-secondary)] focus:ring-2 focus:ring-[var(--accent-primary)] outline-none"/><span className="absolute left-2 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]">€</span></div>
                                        <button onClick={() => setEditingTagsItem({ catId: category.id, item })} className="text-[var(--text-secondary)] hover:text-[var(--text-accent)]"><Icon name="pencil" className="w-5 h-5" /></button>
                                        <button onClick={() => handleDeleteDish(category.id, item.id)} className="text-[var(--text-secondary)] hover:text-[var(--negative)]"><Icon name="trash" className="w-5 h-5"/></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="mt-4"><button onClick={() => handleAddDish(category.id)} className="w-full bg-[var(--background-tertiary)] hover:bg-[var(--background-interactive)] text-[var(--text-accent)] font-semibold py-2 px-3 rounded-md transition-colors duration-200 flex items-center justify-center gap-2 text-sm"><Icon name="plus" className="w-5 h-5" />Aggiungi Piatto</button></div>
                    </div>
                ))}
            </div>
            
            <div className="mt-8 pt-6 border-t border-[var(--border-primary)] text-center"><button onClick={handleAddNewCategory} className="bg-[var(--background-tertiary)] text-[var(--text-primary)] font-bold py-2 px-6 rounded-lg hover:bg-[var(--background-interactive)] transition-colors flex items-center gap-2 mx-auto"><Icon name="plus" className="w-5 h-5" />Aggiungi Nuova Categoria</button></div>
        </div>
        
        <input type="file" ref={addPhotoInputRef} onChange={handleAddFromPhoto} accept="image/*" capture="environment" className="hidden" multiple />

        {isPreviewOpen && <MenuPreview menu={localMenu} onClose={() => setIsPreviewOpen(false)} restaurantName={settings.restaurantName} restaurantAddress={settings.restaurantAddress} />}
        
        {editingTagsItem && (
             <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                <div className="bg-[var(--background-secondary)] rounded-2xl shadow-2xl border border-[var(--border-primary)] w-full max-w-3xl">
                    <div className="p-6">
                        <h3 className="text-xl font-bold text-[var(--text-primary)] mb-1">Modifica Dettagli: <span className="text-[var(--text-accent)]">{editingTagsItem.item.name}</span></h3>
                        <p className="text-sm text-[var(--text-secondary)] mb-6">Perfeziona le etichette alimentari rilevate dall'IA.</p>
                        
                        <div className="space-y-4">
                            <div>
                                <h4 className="font-semibold text-[var(--text-secondary)] mb-2">Profili Alimentari</h4>
                                <div className="grid grid-cols-3 gap-2">
                                    {Object.values(DietaryProfile).map(profile => {
                                        const isGlutenAllergenPresent = editingTagsItem.item.allergens.includes(Allergen.Gluten);
                                        const isDisabled = profile === DietaryProfile.GlutenFree && isGlutenAllergenPresent;
                                        const isChecked = !isDisabled && editingTagsItem.item.dietaryProfiles.includes(profile);

                                        return (
                                            <label key={profile} className={`flex items-center gap-2 p-2 rounded-lg border-2 transition-colors ${isChecked ? 'bg-green-500/10 border-green-500' : 'bg-[var(--background-primary)] border-[var(--border-primary)]'} ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-[var(--border-secondary)]'}`}>
                                                <input
                                                    type="checkbox"
                                                    disabled={isDisabled}
                                                    checked={isChecked}
                                                    onChange={() => handleTagModalChange('profile', profile)}
                                                    className="custom-checkbox h-4 w-4 rounded focus:ring-2 focus:ring-offset-2 focus:ring-offset-[var(--background-secondary)] focus:ring-[var(--accent-primary)]"
                                                />
                                                <span className="text-sm font-medium text-[var(--text-secondary)]">{profile}</span>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>
                             <div>
                                <h4 className="font-semibold text-[var(--text-secondary)] mb-2">Allergeni</h4>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                     {Object.values(Allergen).map(allergen => {
                                        const isGlutenFreeProfilePresent = editingTagsItem.item.dietaryProfiles.includes(DietaryProfile.GlutenFree);
                                        const isDisabled = allergen === Allergen.Gluten && isGlutenFreeProfilePresent;
                                        const isChecked = !isDisabled && editingTagsItem.item.allergens.includes(allergen);

                                        return (
                                            <label key={allergen} className={`flex items-center gap-2 p-2 rounded-lg border-2 transition-colors ${isChecked ? 'bg-red-500/10 border-red-500' : 'bg-[var(--background-primary)] border-[var(--border-primary)]'} ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-[var(--border-secondary)]'}`}>
                                                <input
                                                    type="checkbox"
                                                    disabled={isDisabled}
                                                    checked={isChecked}
                                                    onChange={() => handleTagModalChange('allergen', allergen)}
                                                    className="custom-checkbox h-4 w-4 rounded focus:ring-2 focus:ring-offset-2 focus:ring-offset-[var(--background-secondary)] focus:ring-[var(--accent-primary)]"
                                                />
                                                <span className="text-sm font-medium text-[var(--text-secondary)]">{allergen}</span>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="bg-[var(--background-secondary)]/50 p-4 border-t border-[var(--border-primary)] flex justify-end gap-3">
                        <button onClick={() => setEditingTagsItem(null)} className="bg-[var(--background-tertiary)] text-[var(--text-primary)] font-bold py-2 px-4 rounded-lg hover:bg-[var(--background-interactive)] transition-colors">Annulla</button>
                        <button onClick={() => handleItemTagsChange(editingTagsItem.catId, editingTagsItem.item.id, editingTagsItem.item.allergens, editingTagsItem.item.dietaryProfiles)} className="bg-[var(--accent-primary)] text-[var(--accent-text)] font-bold py-2 px-4 rounded-lg hover:bg-[var(--accent-primary-hover)] transition-colors">Salva Dettagli</button>
                    </div>
                </div>
            </div>
        )}
        
        {isAddFromTextModalOpen && (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                <div className="bg-[var(--background-secondary)] rounded-2xl shadow-2xl border border-[var(--border-primary)] w-full max-w-2xl"><div className="p-6"><div className="flex justify-between items-center mb-4"><h3 className="text-xl font-bold text-[var(--text-primary)]">Aggiungi Piatti al Menù con IA</h3><button onClick={() => setIsAddFromTextModalOpen(false)} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"><Icon name="x-circle" className="w-6 h-6" /></button></div><p className="text-[var(--text-secondary)] mb-4 text-sm">Incolla qui il testo di un'altra sezione del tuo menù (es. Primi Piatti). L'IA la analizzerà e la aggiungerà a quello esistente.</p><textarea value={addMenuText} onChange={e => setAddMenuText(e.target.value)} placeholder="Es: PRIMI PIATTI - Carbonara 12€ - Amatriciana 11€..." className="w-full h-40 bg-[var(--background-primary)] border border-[var(--border-secondary)] rounded-md p-3 focus:ring-2 focus:ring-[var(--accent-primary)] outline-none transition" aria-label="Incolla qui il testo da aggiungere"/>{addError && <p className="text-[var(--negative-text)] text-sm mt-2">{addError}</p>}{isAddingWithAI && (<div className="mt-4 space-y-2"><div className="w-full bg-[var(--background-tertiary)] rounded-full h-4 relative overflow-hidden border border-[var(--border-secondary)]"><div className="bg-gradient-to-r from-[var(--text-accent)] to-[var(--accent-primary)] h-full rounded-full transition-all duration-300 ease-linear" style={{ width: `${progress}%` }}></div><span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white mix-blend-difference px-2">{`Analisi in corso... ${Math.floor(progress)}%`}</span></div></div>)}</div><div className="bg-[var(--background-secondary)]/50 p-4 border-t border-[var(--border-primary)] flex justify-end"><button onClick={handleAddToMenu} disabled={isAddingWithAI} className="w-full flex items-center justify-center gap-2 bg-[var(--accent-primary)] text-[var(--accent-text)] font-bold py-2 px-4 rounded-lg hover:bg-[var(--accent-primary-hover)] transition-all disabled:opacity-50 disabled:cursor-not-allowed">{isAddingWithAI ? 'Aggiungendo...' : (<><Icon name="sparkles" className="w-5 h-5" />Aggiungi al Menù</>)}</button></div></div>
            </div>
        )}

        {isAddingFromPhoto && (
            <div className="fixed inset-0 bg-black/80 flex flex-col items-center justify-center z-50 p-4 backdrop-blur-sm"><Icon name="camera" className="w-16 h-16 text-[var(--text-accent)] mx-auto mb-4 animate-pulse" /><h2 className="text-3xl font-bold text-white mb-4">Un attimo di pazienza...</h2><div className="w-full max-w-md space-y-2"><div className="w-full bg-[var(--background-tertiary)] rounded-full h-4 relative overflow-hidden border border-[var(--border-secondary)]"><div className="bg-gradient-to-r from-[var(--text-accent)] to-[var(--accent-primary)] h-full rounded-full transition-all duration-300 ease-linear" style={{ width: `${addPhotoProgress}%` }}></div><span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white mix-blend-difference px-2">{`${addPhotoProgressMessage} ${Math.floor(addPhotoProgress)}%`}</span></div></div>{addPhotoError && <p className="text-[var(--negative-text)] text-sm mt-4">{addPhotoError}</p>}</div>
        )}
        </>
    );
};

export default MenuManager;