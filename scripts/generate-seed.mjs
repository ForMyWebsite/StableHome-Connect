import { readFileSync, writeFileSync } from 'node:fs';
const resources = JSON.parse(readFileSync(new URL('../lib/resources.json', import.meta.url)));
const rows = JSON.stringify(resources, null, 2);
const sql = `-- Generated from lib/resources.json. Existing administrator-edited listings are preserved.\ninsert into public.assistance_resources select * from jsonb_populate_recordset(null::public.assistance_resources,$resources$${rows}$resources$::jsonb) on conflict(id) do nothing;\n\ninsert into public.jurisdictions(state,county,notes,source_url) values\n('PA','Delaware','Confirm county manually. No unverified ZIP mapping is seeded.','https://www.lasp.org/'),\n('PA','Philadelphia','Official diversion information is external; confirm current program rules.','https://eviction-diversion.phila.gov/') on conflict(state,county) do nothing;\n\ninsert into public.resource_service_areas(resource_id,jurisdiction_id) select r.id,j.id from public.assistance_resources r join public.jurisdictions j on r.state=j.state and j.county=any(r.counties) on conflict do nothing;\n`;
writeFileSync('supabase/migrations/003_resources.sql', sql);
const migrationNames = ['001_core.sql', '002_private_storage.sql', '003_resources.sql'];
writeFileSync(
  'supabase/bootstrap.sql',
  '-- StableHome Connect: run ONCE in a fresh Supabase project SQL Editor.\n-- Transactional bundle generated from migrations; no demo users or private records are inserted.\nbegin;\n\n' +
    migrationNames
      .map((n) => `-- ${n}\n` + readFileSync('supabase/migrations/' + n, 'utf8'))
      .join('\n') +
    '\ncommit;\n',
);
console.log('Generated the resource seed and transactional Supabase bootstrap bundle.');
