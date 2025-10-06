import { GoogleGenAI, Type, FunctionDeclaration } from "@google/genai";
import { BookingDetails, ConfirmationMessages, MenuCategory, Allergen, DietaryProfile, MenuItem } from '../types';

// Support both Vite's `import.meta.env` and AI Studio's `process.env` for the API key.
const apiKey = (import.meta as any).env?.VITE_API_KEY || (typeof process !== 'undefined' && process.env?.API_KEY);
if (!apiKey) {
    throw new Error("API key not found. Please set VITE_API_KEY for Vite environments or ensure API_KEY is available in the AI Studio environment.");
}

const ai = new GoogleGenAI({ apiKey });

const responseSchema = {
    type: Type.OBJECT,
    properties: {
        whatsapp: {
            type: Type.STRING,
            description: "A casual, friendly WhatsApp confirmation message. Use emojis."
        },
        telegram: {
            type: Type.STRING,
            description: "A slightly more formal but still friendly Telegram confirmation message."
        },
        email: {
            type: Type.OBJECT,
            properties: {
                subject: {
                    type: Type.STRING,
                    description: "A professional email subject line for the booking confirmation."
                },
                body: {
                    type: Type.STRING,
                    description: "A comprehensive and professional email body for the confirmation."
                },
            },
            required: ['subject', 'body'],
        },
    },
    required: ['whatsapp', 'telegram', 'email'],
};


export const generateBookingRequestMessages = async (details: BookingDetails, restaurantName: string, restaurantAddress: string, language: string, locale: string): Promise<ConfirmationMessages> => {
    const { name, date, time, adults, children } = details;
    const totalGuests = adults + children;
    const outputLanguage = language === 'it' ? 'Italian' : 'English';
    
    const prompt = `
A customer has requested a restaurant reservation. This is a pending request, not yet confirmed.
- Name: ${name}
- Date: ${new Date(date).toLocaleDateString(locale, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
- Time: ${time}
- Party Size: ${totalGuests} (${adults} adults${children > 0 ? `, ${children} children` : ''})

Generate messages acknowledging that their booking *request* has been received and is pending confirmation.
For the email, also include the restaurant's address: ${restaurantAddress}. Add a Google Maps link for directions using this format: 'https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(restaurantAddress)}'.
`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                systemInstruction: `You are a helpful and creative booking assistant for the restaurant '${restaurantName}' located at '${restaurantAddress}'. Your task is to generate messages that are friendly, clear, and tailored to different communication platforms. The user's booking is a REQUEST and is PENDING, so do not confirm it yet. All output must be in ${outputLanguage}.`,
                responseMimeType: "application/json",
                responseSchema,
            },
        });
        
        const jsonStr = response.text?.trim();
        if (!jsonStr) {
            console.error("Gemini API call failed: The response text is empty. This could be due to safety filters or a model issue.");
            throw new Error("Failed to generate messages: AI returned an empty response.");
        }
        try {
            const parsedResponse = JSON.parse(jsonStr);
            return parsedResponse as ConfirmationMessages;
        } catch (e) {
            console.error("Gemini API call failed: Could not parse the JSON response.", { json: jsonStr, error: e });
            throw new Error("Failed to generate messages: AI returned an invalid format.");
        }

    } catch (error) {
        console.error("Gemini API call failed:", error);
        // Re-throw the specific error if we created one, otherwise a generic one.
        if (error instanceof Error && (error.message.includes("empty response") || error.message.includes("invalid format"))) {
            throw error;
        }
        throw new Error("Failed to generate booking request messages from AI.");
    }
};

export const generateBookingConfirmationMessages = async (details: BookingDetails, restaurantName: string, restaurantAddress: string, reviewLink: string, language: string, locale: string): Promise<ConfirmationMessages> => {
    const { name, date, time, adults, children } = details;
    const totalGuests = adults + children;
    const outputLanguage = language === 'it' ? 'Italian' : 'English';
    
    let prompt = `
A restaurant reservation has just been CONFIRMED by the restaurant staff.
Please generate notification messages to send to the customer informing them of the good news.

Reservation Details:
- Name: ${name}
- Date: ${new Date(date).toLocaleDateString(locale, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
- Time: ${time}
- Party Size: ${totalGuests} (${adults} adults${children > 0 ? `, ${children} children` : ''})

The messages should be celebratory and clear.
For the email, include the restaurant's address ('${restaurantAddress}') and add a call-to-action link like 'Get Directions: https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(restaurantAddress)}'. Also include a concluding sentence like "We look forward to welcoming you."
`;

    if (reviewLink) {
        prompt += `
For the email, please add a P.S. section. In this section, invite the user to leave a review *after their visit*. Phrase it for the future (e.g., 'After your dinner, we'd love to hear your thoughts!'). The link for the review is: ${reviewLink}`;
    }

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                systemInstruction: `You are an efficient restaurant assistant for '${restaurantName}' located at '${restaurantAddress}'. Your task is to generate final booking CONFIRMATION messages. The tone should be positive, celebratory, clear, and professional. All output must be in ${outputLanguage}.`,
                responseMimeType: "application/json",
                responseSchema,
            },
        });
        
        const jsonStr = response.text?.trim();
        if (!jsonStr) {
            console.error("Gemini API call failed: The response text is empty. This could be due to safety filters or a model issue.");
            throw new Error("Failed to generate messages: AI returned an empty response.");
        }
        try {
            const parsedResponse = JSON.parse(jsonStr);
            return parsedResponse as ConfirmationMessages;
        } catch (e) {
            console.error("Gemini API call failed: Could not parse the JSON response.", { json: jsonStr, error: e });
            throw new Error("Failed to generate messages: AI returned an invalid format.");
        }

    } catch (error) {
        console.error("Gemini API call for confirmation failed:", error);
        if (error instanceof Error && (error.message.includes("empty response") || error.message.includes("invalid format"))) {
            throw error;
        }
        throw new Error("Failed to generate final confirmation messages from AI.");
    }
};

const menuSchema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        name: {
          type: Type.STRING,
          description: 'The name of the menu category (e.g., "Antipasti", "Pizze Rosse").',
        },
        items: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: {
                type: Type.STRING,
                description: 'The name of the dish.',
              },
              description: {
                type: Type.STRING,
                description: 'A brief description of the dish. If ingredients are listed, include them here. If no description is provided, leave it as an empty string.',
              },
              price: {
                type: Type.NUMBER,
                description: 'The price of the dish as a number, extracting it even if it contains symbols like € or commas.',
              },
            },
            required: ['name', 'description'],
          },
        },
      },
      required: ['name', 'items'],
    },
};

const allergenMap: Record<Allergen, string[]> = {
    [Allergen.Gluten]: ["grano", "farina", "pane", "pasta", "orzo", "farro", "kamut", "segale", "couscous", "pangrattato", "semola", "semolino", "seitan", "triticum", "glutine"],
    [Allergen.Crustaceans]: ["gambero", "gamberi", "scampo", "scampi", "aragosta", "granchio", "mazzancolle", "canocchie"],
    [Allergen.Eggs]: ["uovo", "uova", "maionese", "zabaione", "albumina", "ovomucoide", "lisozima", "frittata"],
    [Allergen.Fish]: ["pesce", "acciuga", "acciughe", "tonno", "salmone", "merluzzo", "sarda", "sarde", "trota", "sogliola", "spada", "branzino", "orata", "cernia"],
    [Allergen.Peanuts]: ["arachidi", "burro di arachidi", "olio di arachidi"],
    [Allergen.Soy]: ["soia", "edamame", "tofu", "miso", "salsa di soia", "tempeh"],
    [Allergen.Milk]: ["latte", "lattosio", "formaggio", "yogurt", "burro", "panna", "caseina", "ricotta", "mozzarella", "parmigiano", "grana", "pecorino", "caciocavallo"],
    [Allergen.Nuts]: ["mandorla", "mandorle", "nocciola", "nocciole", "noce", "noci", "anacardi", "pistacchio", "pistacchi", "noci di macadamia", "noci pecan"],
    [Allergen.Celery]: ["sedano"],
    [Allergen.Mustard]: ["senape"],
    [Allergen.Sesame]: ["sesamo", "tahina", "tahin"],
    [Allergen.Sulphites]: ["solfiti", "anidride solforosa", "vino"],
    [Allergen.Lupin]: ["lupini"],
    [Allergen.Molluscs]: ["vongola", "vongole", "cozza", "cozze", "ostrica", "ostriche", "calamaro", "calamari", "seppia", "seppie", "polpo"],
};

const nonVegetarianKeywords = [
    ...allergenMap[Allergen.Fish], ...allergenMap[Allergen.Crustaceans], ...allergenMap[Allergen.Molluscs],
    'carne', 'pollo', 'manzo', 'prosciutto', 'salsiccia', 'maiale', 'agnello', 'vitello', 'bistecca', 'speck', 'pancetta', 'guanciale', 'bresaola', 'salame'
];

const nonVeganKeywords = [
    ...nonVegetarianKeywords, ...allergenMap[Allergen.Eggs], ...allergenMap[Allergen.Milk],
    'miele'
];

export const analyzeIngredientsForTags = (ingredients: string): { allergens: Allergen[], dietaryProfiles: DietaryProfile[] } => {
    const text = ingredients.toLowerCase();
    const detectedAllergens = new Set<Allergen>();
    const dietaryProfiles = new Set<DietaryProfile>();

    for (const [allergen, keywords] of Object.entries(allergenMap)) {
        for (const keyword of keywords) {
            if (text.includes(keyword)) {
                detectedAllergens.add(allergen as Allergen);
                break;
            }
        }
    }

    let isVegetarian = true;
    for (const keyword of nonVegetarianKeywords) {
        if (text.includes(keyword)) {
            isVegetarian = false;
            break;
        }
    }

    if (isVegetarian) {
        dietaryProfiles.add(DietaryProfile.Vegetarian);
        let isVegan = true;
        for (const keyword of nonVeganKeywords) {
            if (text.includes(keyword)) {
                isVegan = false;
                break;
            }
        }
        if (isVegan) {
            dietaryProfiles.add(DietaryProfile.Vegan);
        }
    }

    if (!detectedAllergens.has(Allergen.Gluten)) {
        dietaryProfiles.add(DietaryProfile.GlutenFree);
    }

    return {
        allergens: Array.from(detectedAllergens).sort(),
        dietaryProfiles: Array.from(dietaryProfiles).sort(),
    };
};

// FIX: Wrapped the type in parentheses to correctly define it as an array of objects, fixing type inference issues.
const enrichMenuWithTags = (categories: (Omit<MenuCategory, 'id' | 'items'> & { items: Omit<MenuItem, 'id' | 'isAvailable' | 'ingredients' | 'allergens' | 'dietaryProfiles'>[] })[]) => {
    return categories.map(cat => ({
        ...cat,
        items: cat.items.map(item => {
            const combinedTextForAnalysis = `${item.name} ${item.description}`;
            const tags = analyzeIngredientsForTags(combinedTextForAnalysis);
            return {
                ...item,
                ingredients: item.description,
                allergens: tags.allergens,
                dietaryProfiles: tags.dietaryProfiles,
            };
        }),
    }));
};


export const generateMenuFromText = async (menuText: string): Promise<ReturnType<typeof enrichMenuWithTags>> => {
    const prompt = `
Parse the following restaurant menu text and structure it into a JSON format.
Identify categories, and for each category, list the dishes with their name, price, and description.
If a description is not available, provide an empty string. Prices should be numbers.

Menu Text:
---
${menuText}
---
`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                systemInstruction: "You are an expert data extraction and formatting AI. Your task is to accurately parse raw text from a restaurant menu and convert it into a structured JSON object according to the provided schema. You must strictly adhere to the following formatting rules: 1. Category Names: The `name` field for each category object must be converted to ALL UPPERCASE (e.g., 'ANTIPASTI', 'LE CARNI'). 2. Dish Names: The `name` field for each dish inside the `items` array must be converted to Title Case, where the first letter of each important word is capitalized (e.g., 'Spaghetti alla Carbonara', 'Filetto di Manzo alla Rossini'). 3. Category Sorting: You MUST sort the categories in the final JSON array according to a logical Italian menu structure (e.g., ANTIPASTI, PRIMI, SECONDI, PIZZE, CONTORNI, DESSERT/DOLCI, BEVANDE). Place any other categories at the end. Be precise with all other data like prices and descriptions.",
                responseMimeType: "application/json",
                responseSchema: menuSchema,
            },
        });
        
        const jsonStr = response.text.trim();
        const parsedResponse = JSON.parse(jsonStr);
        return enrichMenuWithTags(parsedResponse);

    } catch (error) {
        console.error("Gemini API call for menu generation failed:", error);
        throw new Error("Failed to generate menu from text.");
    }
};

export const generateMenuFromImage = async (images: {data: string, mimeType: string}[]): Promise<ReturnType<typeof enrichMenuWithTags>> => {
    const prompt = `
Parse the restaurant menu in the provided images (which could be multiple pages of the same menu) and structure it into a single, unified JSON format.
Identify categories, and for each category, list the dishes with their name, price, and description.
If a description is not available, provide an empty string. Prices should be numbers.
Combine dishes from the same category found across different images into a single category list in the final output.
`;

    const imageParts = images.map(img => ({
        inlineData: {
            mimeType: img.mimeType,
            data: img.data,
        },
    }));

    const textPart = {
        text: prompt,
    };

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: { parts: [textPart, ...imageParts] },
            config: {
                systemInstruction: "You are an expert data extraction and formatting AI. Your task is to accurately parse raw text from a restaurant menu and convert it into a structured JSON object according to the provided schema. You must strictly adhere to the following formatting rules: 1. Category Names: The `name` field for each category object must be converted to ALL UPPERCASE (e.g., 'ANTIPASTI', 'LE CARNI'). 2. Dish Names: The `name` field for each dish inside the `items` array must be converted to Title Case, where the first letter of each important word is capitalized (e.g., 'Spaghetti alla Carbonara', 'Filetto di Manzo alla Rossini'). 3. Category Sorting: You MUST sort the categories in the final JSON array according to a logical Italian menu structure (e.g., ANTIPASTI, PRIMI, SECONDI, PIZZE, CONTORNI, DESSERT/DOLCI, BEVANDE). Place any other categories at the end. Be precise with all other data like prices and descriptions.",
                responseMimeType: "application/json",
                responseSchema: menuSchema,
            },
        });
        
        const jsonStr = response.text.trim();
        const parsedResponse = JSON.parse(jsonStr);
        return enrichMenuWithTags(parsedResponse);

    } catch (error) {
        console.error("Gemini API call for menu generation from image failed:", error);
        throw new Error("Failed to generate menu from image.");
    }
};


export const updateBookingDetailsFunctionDeclaration: FunctionDeclaration = {
  name: 'updateBookingDetails',
  parameters: {
    type: Type.OBJECT,
    description: 'Updates one or more details for the restaurant booking form based on user input.',
    properties: {
      name: { type: Type.STRING, description: "The full name for the reservation, e.g., 'Mario Rossi'." },
      email: {
          type: Type.STRING,
          description: "The guest's email address, e.g., 'mario.rossi@example.com'."
      },
      phone: {
        type: Type.STRING,
        description: "The guest's phone number, including the international prefix if available, e.g., '+393331234567'."
      },
      date: { type: Type.STRING, description: "The reservation date in strict YYYY-MM-DD format." },
      time: { type: Type.STRING, description: "The reservation time in HH:MM format. Must be an available slot." },
      adults: { type: Type.INTEGER, description: "The number of adults (18+)." },
      children: { type: Type.INTEGER, description: "The number of children (under 18)." },
      platforms: {
        type: Type.ARRAY,
        description: "The chosen notification platform. Should contain a single value based on user preference: 'Email', 'WhatsApp', or 'Telegram'.",
        items: {
          type: Type.STRING,
        },
      },
    },
  },
};

export const finalizeBookingFunctionDeclaration: FunctionDeclaration = {
  name: 'finalizeBooking',
  parameters: {
    type: Type.OBJECT,
    description: 'Finalizes the booking process after the user confirms all details. This should be the very last action taken.',
    properties: {},
  },
};


// Audio Utils
export function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  // Fix: Corrected typo from Int116Array to Int16Array.
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

export function createBlob(data: Float32Array): { data: string; mimeType: string } {
    const l = data.length;
    const int16 = new Int16Array(l);
    for (let i = 0; i < l; i++) {
        int16[i] = data[i] * 32768;
    }
    return {
        data: encode(new Uint8Array(int16.buffer)),
        mimeType: 'audio/pcm;rate=16000',
    };
}
