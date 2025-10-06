import { createPool } from '@vercel/postgres';
import { AdminSettings, Plan, Theme, DayOfWeek } from '../types';

export const config = {
  runtime: 'edge',
};

const pool = createPool({
    connectionString: process.env.POSTGRES_URL,
});

const defaultSettings: AdminSettings = {
    restaurantName: 'The Golden Spoon',
    restaurantAddress: 'Via Roma, 1, 10121 Torino TO, Italia',
    reviewLink: '',
    activePlan: Plan.PRO,
    theme: Theme.GOLDEN_SPOON,
    serviceWindows: [
        { id: 'sw-lunch', name: 'Pranzo', startTime: '12:00', endTime: '14:30', slotInterval: 30 },
        { id: 'sw-dinner', name: 'Cena', startTime: '19:00', endTime: '22:00', slotInterval: 30 },
    ],
    weeklySchedule: {
        [DayOfWeek.SUNDAY]: ['sw-lunch', 'sw-dinner'],
        [DayOfWeek.MONDAY]: [],
        [DayOfWeek.TUESDAY]: ['sw-dinner'],
        [DayOfWeek.WEDNESDAY]: ['sw-lunch', 'sw-dinner'],
        [DayOfWeek.THURSDAY]: ['sw-lunch', 'sw-dinner'],
        [DayOfWeek.FRIDAY]: ['sw-lunch', 'sw-dinner'],
        [DayOfWeek.SATURDAY]: ['sw-lunch', 'sw-dinner'],
    },
    digitalMenu: null,
    tables: Array.from({ length: 10 }, (_, i) => ({
        id: `t4-${i + 1}`, name: `Tavolo ${i + 1}`, capacity: 4, isCombinable: true,
    })),
    combinationRules: [
        { id: 'rule-1', count: 2, tableCapacity: 4, newCapacity: 6 },
        { id: 'rule-2', count: 3, tableCapacity: 4, newCapacity: 8 },
    ],
    bookingDurationRules: [
        { id: 'dur-1', minGuests: 1, maxGuests: 2, durationMinutes: 90 },
        { id: 'dur-2', minGuests: 3, maxGuests: 4, durationMinutes: 120 },
        { id: 'dur-3', minGuests: 5, maxGuests: 100, durationMinutes: 150 },
    ],
    maxGuestsPerSlot: 30,
};

export default async function handler(request: Request) {
  const { method } = request;

  try {
    switch (method) {
      case 'GET': {
        const { rows } = await pool.sql`SELECT settings FROM restaurant_settings WHERE id = 1;`;

        if (rows.length > 0) {
          return new Response(JSON.stringify(rows[0].settings), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        } else {
          // No settings found, insert default and return them
          await pool.sql`
            INSERT INTO restaurant_settings (id, settings)
            VALUES (1, ${JSON.stringify(defaultSettings)});
          `;
          return new Response(JSON.stringify(defaultSettings), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
      }

      case 'POST': {
        const newSettings: AdminSettings = await request.json();
        const settingsJson = JSON.stringify(newSettings);

        // Use INSERT ON CONFLICT to handle both creation and update
        await pool.sql`
          INSERT INTO restaurant_settings (id, settings)
          VALUES (1, ${settingsJson})
          ON CONFLICT (id) DO UPDATE
          SET settings = ${settingsJson};
        `;
        
        return new Response(JSON.stringify({ message: 'Settings updated successfully' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      default:
        return new Response(JSON.stringify({ error: `Method ${method} Not Allowed` }), {
          status: 405,
          headers: { 'Content-Type': 'application/json', 'Allow': 'GET, POST' },
        });
    }
  } catch (error) {
    console.error('API Settings Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal Server Error';
    return new Response(JSON.stringify({ error: 'Database operation failed', details: errorMessage }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
    });
  }
}