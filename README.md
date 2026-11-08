# SHON CLUB

Uzbek-language game club dashboard for cash movements, sales, stock, and daily reporting. It supports browser-local storage for development and Supabase-backed shared data with email/password sign-in for deployment.

## Run locally

1. Use Node.js 20.19+ or 22.12+.
2. From this project directory, install dependencies with `npm ci`.
3. Start the app with `npm run dev` and open the local URL printed in the terminal.

In local mode, the app starts with zero transactions and cash, a catalog of common drink sizes, energy drinks, snacks and sweets with zero stock and prices to fill in, and 25 free computers. Add selling prices and unit costs before recording sales or paid purchases. New products accept an opening stock count; later deliveries can be recorded as stock intake without changing cash, or as a purchase that records the cash outflow. Each operation records whether an operator or manager handled it and their name. Sales automatically record the product, quantity, sale price, cost, and stock movement. The computer list shows each machine's current status, active session time, and cumulative runtime. The separate Reports page compares the selected date range with the previous range of equal length and summarizes results by product, staff member, and computer runtime.

The menu separates the home dashboard, reports, computer management, and product/stock management. They are available at `/#`, `/#reports`, `/#computers`, and `/#products`; direct links, refreshes, and browser back/forward navigation stay in sync.

Without Supabase environment variables, data is stored only in the current browser profile. With Supabase configured, signed-in staff share data across devices. Existing browser-local data is not automatically copied to Supabase, and this setup does not include a local-history importer. Keep the existing browser profile and its data until you have separately transferred any records you need.

## Deploy with Supabase and Vercel

1. Create a Supabase project and enable Email authentication. Create staff user accounts from the Supabase dashboard; public sign-up is not required.
2. Apply all SQL migrations in `supabase/migrations` in timestamp order. With the Supabase CLI linked to the project, run `supabase db push`, or run each migration in the Supabase SQL Editor.
3. Give each staff user the trusted `app_metadata` value `{ "club_role": "staff" }` using the Supabase Dashboard's user administration or a trusted server using the Supabase Admin API. Have the user sign in again after changing the role so the refreshed access token contains it. After opening the invitation email, staff can set their password from the signed-in app using **Parol o‘rnatish**, then use email and password for later sign-ins. Do not put a service-role key in the browser or Vercel `VITE_` variables. The app blocks users without this role, and database row-level security and RPC functions enforce it as well.
4. In the project root, copy `.env.example` to `.env.local` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to the project's URL and public anon/publishable key. These two frontend values are public; never use the service-role secret here.
5. Import the repository into Vercel, add those same two environment variables for the required deployment environments, and deploy. Redeploy after changing environment variables.

The migrations add the missing product cost, inventory audit, and computer session schema; secure write operations behind staff-only atomic RPCs; and enable realtime updates. The app seeds missing starter products and computers without replacing existing rows. Keep local mode available by leaving both Supabase variables unset; setting only one displays a configuration error instead of silently switching storage.

## Verify

- `npm run typecheck`
- `npm run lint`
- `npm run build`
