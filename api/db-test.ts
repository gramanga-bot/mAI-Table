import { createPool } from '@vercel/postgres';

export const config = {
  runtime: 'edge',
};

const pool = createPool({
    connectionString: process.env.STORAGE_URL,
});

export default async function handler(request: Request) {
  try {
    // Ensure tables exist
    await pool.sql`
      CREATE TABLE IF NOT EXISTS bookings (
        id UUID PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        phone VARCHAR(30) NOT NULL,
        date DATE NOT NULL,
        "time" VARCHAR(5) NOT NULL,
        adults INTEGER NOT NULL,
        children INTEGER NOT NULL,
        platforms TEXT[] NOT NULL,
        status VARCHAR(20) NOT NULL,
        assigned_table_ids TEXT[]
      );
    `;

    await pool.sql`
      CREATE TABLE IF NOT EXISTS restaurant_settings (
        id INTEGER PRIMARY KEY,
        settings JSONB NOT NULL
      );
    `;
    
    // Test connection by getting current time
    const { rows } = await pool.sql`SELECT NOW();`;
    
    return new Response(JSON.stringify({ 
      status: 'success', 
      message: 'Tabelle del database verificate e connessione riuscita.',
      time: rows[0].now 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Database connection test failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ status: 'error', message: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}