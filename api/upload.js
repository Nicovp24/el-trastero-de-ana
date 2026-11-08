import { putImage } from '../lib/store.js';
import { isAdmin, json, unauthorized } from '../lib/http.js';

const TYPES = ['image/jpeg', 'image/webp', 'image/png'];
const MAX = 4 * 1024 * 1024; // límite de cuerpo de Vercel ≈ 4,5 MB; el navegador ya comprime antes

export async function POST(request) {
  if (!isAdmin(request)) return unauthorized();
  const type = (request.headers.get('content-type') || '').split(';')[0];
  if (!TYPES.includes(type)) return json({ error: 'Formato de imagen no válido' }, 400);
  const folder = new URL(request.url).searchParams.get('item') || '';
  if (!/^[a-z0-9]{6,30}$/.test(folder)) return json({ error: 'Falta el producto' }, 400);
  const buf = Buffer.from(await request.arrayBuffer());
  if (!buf.length || buf.length > MAX) return json({ error: 'La foto es demasiado grande' }, 413);
  const url = await putImage(folder, buf, type);
  return json({ url }, 201);
}
