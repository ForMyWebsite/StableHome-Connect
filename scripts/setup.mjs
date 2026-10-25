import { existsSync, copyFileSync, writeFileSync } from 'node:fs';
if (!existsSync('.env.local')) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (url && key)
    writeFileSync(
      '.env.local',
      `NEXT_PUBLIC_SUPABASE_URL=${url}\nNEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=${key}\n`,
      { mode: 0o600 },
    );
  else copyFileSync('.env.example', '.env.local');
  console.log(
    'Created .env.local. Real accounts require the database migrations and provider setup. The fictional demo works immediately.',
  );
} else console.log('Keeping your existing .env.local.');
