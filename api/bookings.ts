import { sql } from '@vercel/postgres';
import { BookingDetails, BookingStatus } from '../types';

// Vercel Edge Functions use the standard Request and Response objects.
export const config = {
  runtime: 'edge',
};

export default async function handler(request: Request) {
  const { method, url } = request;
  const { searchParams } = new URL(url);
  const id = searchParams.get('id');

  try {
    switch (method) {
      case 'GET': {
        const { rows: bookings } = await sql`SELECT * FROM bookings ORDER BY date DESC NULLS LAST, "time" DESC NULLS LAST;`;
        return new Response(JSON.stringify(bookings), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      case 'POST': {
        const newBooking: Omit<BookingDetails, 'id'> = await request.json();
        const bookingId = crypto.randomUUID();
        
        await sql`
          INSERT INTO bookings (id, name, email, phone, date, "time", adults, children, platforms, status, assigned_table_ids)
          VALUES (
            ${bookingId}, 
            ${newBooking.name}, 
            ${newBooking.email}, 
            ${newBooking.phone}, 
            ${newBooking.date}, 
            ${newBooking.time}, 
            ${newBooking.adults}, 
            ${newBooking.children}, 
            ${newBooking.platforms}, 
            ${newBooking.status}, 
            ${newBooking.assignedTableIds && newBooking.assignedTableIds.length > 0 ? newBooking.assignedTableIds : null}
          );
        `;
        
        const { rows: [createdBooking] } = await sql`SELECT * FROM bookings WHERE id = ${bookingId};`;
        return new Response(JSON.stringify(createdBooking), {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      case 'PATCH': {
        if (!id) {
            return new Response(JSON.stringify({ error: 'Booking ID is required' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }
        const { status }: { status: BookingStatus } = await request.json();
        await sql`UPDATE bookings SET status = ${status} WHERE id = ${id};`;
        return new Response(null, { status: 204 });
      }

      default:
        return new Response(JSON.stringify({ error: `Method ${method} Not Allowed` }), {
          status: 405,
          headers: { 'Content-Type': 'application/json', 'Allow': 'GET, POST, PATCH' },
        });
    }
  } catch (error) {
    console.error('API Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal Server Error';
    return new Response(JSON.stringify({ error: 'Database operation failed', details: errorMessage }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
    });
  }
}
