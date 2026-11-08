import { getSettings, saveSettings } from '../lib/store.js';
import { isAdmin, json, unauthorized, clean } from '../lib/http.js';

export async function GET() {
  return json(await getSettings());
}

export async function PUT(request) {
  if (!isAdmin(request)) return unauthorized();
  const body = await request.json().catch(() => ({}));
  const settings = {
    ownerName: clean(body.ownerName, 30) || 'Ana',
    shopName: clean(body.shopName, 60) || 'El trastero de Ana',
    intro: clean(body.intro, 400),
    whatsapp: clean(body.whatsapp, 20).replace(/[^\d]/g, ''),
  };
  return json(await saveSettings(settings));
}
