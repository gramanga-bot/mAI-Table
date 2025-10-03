export enum NotificationPlatform {
    WHATSAPP = 'WhatsApp',
    TELEGRAM = 'Telegram',
    EMAIL = 'Email',
}

export enum BookingStatus {
    PENDING = 'Pending',
    CONFIRMED = 'Confirmed',
    DECLINED = 'Declined',
}

export interface BookingDetails {
    id: string;
    name: string;
    contact: string;
    date: string;
    time: string;
    adults: number;
    children: number;
    platforms: NotificationPlatform[];
    status: BookingStatus;
    assignedTableIds?: string[]; // Store which tables are assigned
}

export interface EmailMessage {
    subject: string;
    body: string;
}

export interface ConfirmationMessages {
    whatsapp: string;
    telegram: string;
    email: EmailMessage;
}

export enum AppStep {
    FORM = 'FORM',
    CONFIRMING = 'CONFIRMING',
    CONFIRMED = 'CONFIRMED',
}

export enum DayOfWeek {
    SUNDAY = '0',
    MONDAY = '1',
    TUESDAY = '2',
    WEDNESDAY = '3',
    THURSDAY = '4',
    FRIDAY = '5',
    SATURDAY = '6',
}

export enum Plan {
    BASIC = 'BASIC',
    PRO = 'PRO',
}

// New interfaces for table management
export interface Table {
    id: string;
    name: string;
    capacity: number;
    isCombinable: boolean;
}

export interface TableCombinationRule {
    id:string;
    // The capacity of the tables being combined (e.g., 4)
    tableCapacity: number; 
    // How many of them are combined (e.g., 2)
    count: number;         
    // The resulting capacity (e.g., 6)
    newCapacity: number;   
}

// New interface for booking duration rules
export interface BookingDurationRule {
    id: string;
    minGuests: number;
    maxGuests: number;
    durationMinutes: number;
}

// New interfaces for dynamic opening hours
export interface ServiceWindow {
    id: string;
    name: string; // e.g., "Pranzo", "Cena"
    startTime: string; // "HH:MM"
    endTime: string;   // "HH:MM"
    slotInterval: number; // in minutes
}

export type WeeklySchedule = Record<DayOfWeek, string[]>; // Maps DayOfWeek to an array of ServiceWindow IDs

// New Allergen and Dietary Types
export enum Allergen {
    Gluten = "Glutine",
    Crustaceans = "Crostacei",
    Eggs = "Uova",
    Fish = "Pesce",
    Peanuts = "Arachidi",
    Soy = "Soia",
    Milk = "Latte",
    Nuts = "Frutta a guscio",
    Celery = "Sedano",
    Mustard = "Senape",
    Sesame = "Sesamo",
    Sulphites = "Anidride solforosa e solfiti",
    Lupin = "Lupini",
    Molluscs = "Molluschi",
}

export enum DietaryProfile {
    Vegetarian = "Vegetariano",
    Vegan = "Vegano",
    GlutenFree = "Senza Glutine",
}

// Digital Menu Types
export interface MenuItem {
    id: string;
    name: string;
    description: string;
    price?: number;
    ingredients: string; // comma-separated for simplicity
    isAvailable: boolean;
    allergens: Allergen[];
    dietaryProfiles: DietaryProfile[];
}

export interface MenuCategory {
    id: string;
    name: string;
    items: MenuItem[];
}

export interface DishOfTheDay extends MenuItem {}

export interface DigitalMenu {
    categories: MenuCategory[];
    dishesOfTheDay: DishOfTheDay[];
    showPrices: boolean;
}

// Unified AdminSettings interface for both plans
export interface AdminSettings {
    activePlan: Plan;

    // Shared Settings for opening hours
    serviceWindows: ServiceWindow[];
    weeklySchedule: WeeklySchedule;
    
    // Digital Menu Settings
    digitalMenu: DigitalMenu | null;

    // PRO Plan Specific Settings
    tables: Table[];
    combinationRules: TableCombinationRule[];
    bookingDurationRules: BookingDurationRule[];
    
    // BASIC Plan Specific Settings
    maxGuestsPerSlot: number;
}


export interface VoiceBookingState {
    status: 'idle' | 'listening' | 'speaking' | 'processing' | 'error';
    transcript: string;
}