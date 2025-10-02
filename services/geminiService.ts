import { GoogleGenAI, Type, FunctionDeclaration } from "@google/genai";
import { BookingDetails, ConfirmationMessages } from '../types';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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


export const generateBookingRequestMessages = async (details: BookingDetails): Promise<ConfirmationMessages> => {
    const { name, date, time, adults, children } = details;
    const totalGuests = adults + children;
    
    const prompt = `
A customer has requested a restaurant reservation. This is a pending request, not yet confirmed.
- Name: ${name}
- Date: ${new Date(date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
- Time: ${time}
- Party Size: ${totalGuests} (${adults} adults${children > 0 ? `, ${children} children` : ''})

Generate messages acknowledging that their booking *request* has been received and is pending confirmation.
`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                systemInstruction: "You are a helpful and creative booking assistant for the restaurant 'The Golden Spoon'. Your task is to generate messages that are friendly, clear, and tailored to different communication platforms. The user's booking is a REQUEST and is PENDING, so do not confirm it yet.",
                responseMimeType: "application/json",
                responseSchema,
            },
        });
        
        const jsonStr = response.text.trim();
        const parsedResponse = JSON.parse(jsonStr);

        return parsedResponse as ConfirmationMessages;

    } catch (error) {
        console.error("Gemini API call failed:", error);
        throw new Error("Failed to generate booking request messages from AI.");
    }
};

export const generateBookingConfirmationMessages = async (details: BookingDetails): Promise<ConfirmationMessages> => {
    const { name, date, time, adults, children } = details;
    const totalGuests = adults + children;
    
    const prompt = `
A restaurant reservation has just been CONFIRMED by the restaurant staff.
Please generate notification messages to send to the customer informing them of the good news.

Reservation Details:
- Name: ${name}
- Date: ${new Date(date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
- Time: ${time}
- Party Size: ${totalGuests} (${adults} adults${children > 0 ? `, ${children} children` : ''})

The messages should be celebratory and clear.
For the email, include a concluding sentence like "We look forward to welcoming you."
`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                systemInstruction: "You are an efficient restaurant assistant for 'The Golden Spoon'. Your task is to generate final booking CONFIRMATION messages. The tone should be positive, celebratory, clear, and professional.",
                responseMimeType: "application/json",
                responseSchema,
            },
        });
        
        const jsonStr = response.text.trim();
        const parsedResponse = JSON.parse(jsonStr);

        return parsedResponse as ConfirmationMessages;

    } catch (error) {
        console.error("Gemini API call for confirmation failed:", error);
        throw new Error("Failed to generate final confirmation messages from AI.");
    }
};


export const updateBookingDetailsFunctionDeclaration: FunctionDeclaration = {
  name: 'updateBookingDetails',
  parameters: {
    type: Type.OBJECT,
    description: 'Updates one or more details for the restaurant booking form based on user input.',
    properties: {
      name: { type: Type.STRING, description: "The full name for the reservation, e.g., 'Mario Rossi'." },
      contact: { 
          type: Type.STRING, 
          description: "The contact detail for confirmation. If it's a phone number, it must be a string of digits with no spaces or symbols. If it's an email, it must be a valid email format, e.g., 'mario.rossi@example.com'." 
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