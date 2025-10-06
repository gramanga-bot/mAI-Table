import { createPool } from '@vercel/postgres';

export const config = {
  runtime: 'edge',
};

// Create a new pool configured to use the STORAGE_URL from environment variables,
// as the user is setting a custom prefix in the Vercel integration.
const pool = createPool({
    connectionString: process.env.STORAGE_URL,
});

export default async function handler(request: Request) {
  try {
    const { rows } = await pool.sql`SELECT NOW();`;
    return new Response(JSON.stringify({ status: 'success', time: rows[0].now }), {
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