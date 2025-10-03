import React, { useMemo, useState } from 'react';
import { DigitalMenu, Allergen, DietaryProfile } from '../types';
import Icon from './Icon';

interface MenuPreviewProps {
    menu: DigitalMenu | null;
    onClose: () => void;
}

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

    return <Icon name={icon} className={`${sizeClass} ${color}`} />;
};


const MenuPreview: React.FC<MenuPreviewProps> = ({ menu, onClose }) => {
    const [activeDietaryFilters, setActiveDietaryFilters] = useState<Set<DietaryProfile>>(new Set());
    const [isLegendOpen, setIsLegendOpen] = useState(false);
    const [isFilterOpen, setIsFilterOpen] = useState(true);

    if (!menu) return null;
    
    const allTags = useMemo(() => {
        const tags = new Set<Allergen | DietaryProfile>();
        menu.categories.forEach(cat => {
            cat.items.forEach(item => {
                item.allergens.forEach(a => tags.add(a));
                item.dietaryProfiles.forEach(p => tags.add(p));
            });
        });
        const sortedTags = Array.from(tags).sort((a,b) => a.localeCompare(b));
        // Put dietary profiles first
        return sortedTags.sort((a,b) => {
            const aIsDiet = Object.values(DietaryProfile).includes(a as DietaryProfile);
            const bIsDiet = Object.values(DietaryProfile).includes(b as DietaryProfile);
            if (aIsDiet && !bIsDiet) return -1;
            if (!aIsDiet && bIsDiet) return 1;
            return 0;
        });
    }, [menu]);

    const hasGlutenFreeOption = allTags.includes(DietaryProfile.GlutenFree);

    const handleFilterToggle = (profile: DietaryProfile) => {
        setActiveDietaryFilters(prev => {
            const newSet = new Set(prev);
            if (newSet.has(profile)) {
                newSet.delete(profile);
            } else {
                newSet.add(profile);
            }
            return newSet;
        });
    };

    const availableDietaryProfiles = useMemo(() => 
        allTags.filter(tag => Object.values(DietaryProfile).includes(tag as DietaryProfile)) as DietaryProfile[]
    , [allTags]);
    
    const filteredCategories = useMemo(() => {
        if (activeDietaryFilters.size === 0) {
            return menu.categories;
        }

        return menu.categories
            .map(category => {
                const filteredItems = category.items.filter(item => {
                    const itemProfiles = new Set(item.dietaryProfiles);
                    return Array.from(activeDietaryFilters).every(filter => itemProfiles.has(filter));
                });
                return { ...category, items: filteredItems };
            })
            .filter(category => category.items.length > 0);
    }, [menu.categories, activeDietaryFilters]);

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm animate-fade-in">
            <div className="bg-gray-900 text-gray-200 w-full h-full flex flex-col">
                <header className="p-4 flex justify-between items-center border-b border-gray-700 flex-shrink-0">
                    <h2 className="text-xl font-bold text-white">Anteprima Menù</h2>
                    <button onClick={onClose} className="p-2 rounded-full bg-gray-800 hover:bg-gray-700 transition-colors">
                        <Icon name="x-circle" className="w-6 h-6 text-gray-400" />
                    </button>
                </header>

                {availableDietaryProfiles.length > 0 && (
                    <div className="flex-shrink-0 p-4 bg-gray-900/80 backdrop-blur-sm border-b border-gray-700 z-10">
                        <button
                            onClick={() => setIsFilterOpen(!isFilterOpen)}
                            className="w-full flex justify-between items-center"
                            aria-expanded={isFilterOpen}
                            aria-controls="filter-content"
                        >
                            <div className="flex items-center gap-2">
                                <Icon name="filter" className="w-5 h-5 text-amber-400" />
                                <h4 className="font-bold text-white">Filtra per Esigenze</h4>
                            </div>
                            <Icon
                                name={isFilterOpen ? 'chevron-up' : 'chevron-down'}
                                className="w-6 h-6 text-gray-400 transition-transform"
                            />
                        </button>
                        <div
                            id="filter-content"
                            className={`overflow-hidden transition-all duration-300 ease-in-out ${isFilterOpen ? 'max-h-48 pt-3' : 'max-h-0'}`}
                        >
                            <div className="flex flex-wrap gap-2">
                                {availableDietaryProfiles.map(profile => (
                                    <button
                                        key={profile}
                                        onClick={() => handleFilterToggle(profile)}
                                        className={`px-3 py-1 text-sm font-semibold rounded-full border-2 transition-colors ${
                                            activeDietaryFilters.has(profile) 
                                                ? 'bg-amber-500/20 border-amber-500 text-amber-300' 
                                                : 'bg-gray-700/50 border-gray-600 hover:border-gray-500 text-gray-300'
                                        }`}
                                    >
                                        {profile}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                <main className="flex-grow overflow-y-auto p-6 md:p-8">
                    <div className="text-center mb-8">
                        <h1 className="text-4xl font-bold text-amber-400 tracking-tight">The Golden Spoon</h1>
                        <p className="text-gray-400 mt-2 text-lg">Il Nostro Menù</p>
                    </div>

                    <div className="space-y-10">
                        {filteredCategories.length > 0 ? filteredCategories.map(category => (
                            <section key={category.id}>
                                <h3 className="text-3xl font-bold text-white border-b-2 border-amber-500/50 pb-2 mb-6 uppercase">{category.name}</h3>
                                <div className="space-y-6">
                                    {category.items.map(item => (
                                        <div key={item.id} className={`transition-opacity ${!item.isAvailable ? 'opacity-40' : ''}`}>
                                            <div className="flex justify-between items-start gap-4">
                                                <div className="flex-grow">
                                                    <div className="flex items-center gap-3">
                                                        <h4 className="text-xl font-bold text-gray-100">{item.name}</h4>
                                                        {(item.allergens.length > 0 || item.dietaryProfiles.length > 0) &&
                                                            <div className="group relative flex items-center">
                                                                <Icon name="info-circle" className="w-5 h-5 text-gray-500 cursor-pointer" />
                                                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-xs bg-gray-800 border border-gray-600 text-gray-300 text-xs rounded-lg p-3 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-lg">
                                                                    <div className="space-y-2">
                                                                        {item.dietaryProfiles.length > 0 && (
                                                                            <div>
                                                                                <p className="font-bold text-white text-sm">Profili Alimentari:</p>
                                                                                <div className="grid grid-cols-1 gap-x-3 gap-y-1 mt-1">
                                                                                    {item.dietaryProfiles.map(p => (
                                                                                        <div key={p} className="flex items-center gap-1.5">
                                                                                            <TagIcon tag={p} size="sm" /> <span>{p}</span>
                                                                                        </div>
                                                                                    ))}
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                        {item.allergens.length > 0 && (
                                                                            <div>
                                                                                <p className="font-bold text-white text-sm mt-1">Allergeni Presenti:</p>
                                                                                 <div className="grid grid-cols-1 gap-x-3 gap-y-1 mt-1">
                                                                                    {item.allergens.map(a => (
                                                                                        <div key={a} className="flex items-center gap-1.5">
                                                                                            <TagIcon tag={a} size="sm" /> <span>{a}</span>
                                                                                        </div>
                                                                                    ))}
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        }
                                                    </div>
                                                    <p className="text-sm text-gray-400 mt-1">{item.ingredients}</p>
                                                </div>
                                                {menu.showPrices && item.price != null && (
                                                    <p className="text-xl font-bold text-amber-400 whitespace-nowrap">
                                                        € {item.price.toFixed(2)}
                                                    </p>
                                                )}
                                            </div>
                                             {!item.isAvailable && (
                                                <p className="text-xs font-bold text-red-400 bg-red-900/50 px-2 py-0.5 rounded-full inline-block mt-2">
                                                    Esaurito
                                                </p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )) : (
                            <div className="text-center py-10">
                                <p className="text-gray-500">Nessun piatto corrisponde ai filtri selezionati.</p>
                            </div>
                        )}
                    </div>
                </main>

                {allTags.length > 0 && (
                    <footer className="p-4 border-t border-gray-700 flex-shrink-0 bg-gray-900/50">
                        <button
                            onClick={() => setIsLegendOpen(!isLegendOpen)}
                            className="w-full flex justify-between items-center py-2 text-left"
                            aria-expanded={isLegendOpen}
                            aria-controls="legend-content"
                        >
                            <h4 className="font-bold text-white text-lg">Legenda</h4>
                            <Icon
                                name={isLegendOpen ? 'chevron-up' : 'chevron-down'}
                                className="w-6 h-6 text-gray-400 transition-transform duration-300"
                            />
                        </button>
                        <div
                            id="legend-content"
                            className={`overflow-hidden transition-all duration-500 ease-in-out ${isLegendOpen ? 'max-h-96 pt-4' : 'max-h-0'}`}
                        >
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-4 gap-y-2 mb-4">
                               {allTags.map(tag => (
                                   <div key={tag} className="flex items-center gap-2">
                                       <TagIcon tag={tag} size="sm" />
                                       <span className="text-xs text-gray-300">{tag}</span>
                                   </div>
                               ))}
                            </div>
                            <p className="text-xs text-gray-500 border-t border-gray-700 pt-3 mt-3">
                                I gentili clienti sono pregati di comunicare al personale di sala eventuali allergie o intolleranze alimentari.
                                {hasGlutenFreeOption && <span className="font-semibold"> I nostri piatti 'Senza Glutine' sono preparati con ingredienti privi di glutine, ma non possiamo garantire l'assenza di contaminazione crociata in cucina.</span>}
                            </p>
                        </div>
                    </footer>
                )}
            </div>
             <style>{`
                @keyframes fade-in {
                    0% { opacity: 0; }
                    100% { opacity: 1; }
                }
                .animate-fade-in {
                    animation: fade-in 0.3s ease-out forwards;
                }
            `}</style>
        </div>
    );
};

export default MenuPreview;