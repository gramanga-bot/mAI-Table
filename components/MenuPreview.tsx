import React from 'react';
import { DigitalMenu } from '../types';
import Icon from './Icon';

interface MenuPreviewProps {
    menu: DigitalMenu | null;
    allergens: string[];
    onClose: () => void;
}

const MenuPreview: React.FC<MenuPreviewProps> = ({ menu, allergens, onClose }) => {
    if (!menu) return null;

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-fade-in">
            <div className="bg-gray-900 text-gray-200 w-full max-w-2xl h-full max-h-[90vh] rounded-2xl shadow-2xl border border-gray-700 flex flex-col">
                <header className="p-4 flex justify-between items-center border-b border-gray-700 flex-shrink-0">
                    <h2 className="text-xl font-bold text-white">Anteprima Menù</h2>
                    <button onClick={onClose} className="p-2 rounded-full bg-gray-800 hover:bg-gray-700 transition-colors">
                        <Icon name="x-circle" className="w-6 h-6 text-gray-400" />
                    </button>
                </header>

                <main className="flex-grow overflow-y-auto p-8">
                    <div className="text-center mb-12">
                        <h1 className="text-4xl font-bold text-amber-400 tracking-tight">The Golden Spoon</h1>
                        <p className="text-gray-400 mt-2 text-lg">Il Nostro Menù</p>
                    </div>

                    <div className="space-y-10">
                        {menu.categories.map(category => (
                            <section key={category.id}>
                                <h3 className="text-3xl font-bold text-white border-b-2 border-amber-500/50 pb-2 mb-6 uppercase">{category.name}</h3>
                                <div className="space-y-5">
                                    {category.items.map(item => (
                                        <div key={item.id} className={`transition-opacity ${!item.isAvailable ? 'opacity-40' : ''}`}>
                                            <div className="flex justify-between items-start gap-4">
                                                <div className="flex-grow">
                                                    <h4 className="text-xl font-bold text-gray-100">{item.name}</h4>
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
                        ))}
                    </div>
                </main>

                {allergens.length > 0 && (
                    <footer className="p-6 border-t border-gray-700 flex-shrink-0 bg-gray-900/50">
                        <h4 className="font-bold text-white mb-3">Informazioni Allergeni</h4>
                        <p className="text-xs text-gray-400">
                            I gentili clienti sono pregati di comunicare al personale di sala eventuali allergie o intolleranze alimentari.
                            Questo menù contiene i seguenti allergeni: <span className="font-semibold text-gray-300">{allergens.join(', ')}.</span>
                        </p>
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