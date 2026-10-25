export function GET() {
  return Response.json(
    { app: 'stablehome-connect', status: 'ok', database: 'Not checked by this endpoint' },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
