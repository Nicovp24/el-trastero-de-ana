import { listItems, getItem, saveItem, deleteItem, deleteImages, newId } from '../lib/store.js';
import { isAdmin, json, unauthorized, clean } from '../lib/http.js';

const STATUSES = ['disponible', 'reservado', 'vendido'];

function sanitize(body, previous = {}) {
  const images = Array.isArray(body.images) ? body.images.filter((u) => typeof u === 'string').slice(0, 12) : previous.images || [];
  return {
    title: clean(body.title ?? previous.title, 120),
    description: clean(body.description ?? previous.description, 3000),
    price: clean(body.price ?? previous.price, 40),
    status: STATUSES.includes(body.status) ? body.status : previous.status || 'disponible',
    reservedFor: clean(body.reservedFor ?? previous.reservedFor, 80),
    images,
  };
}

export async function GET(request) {
  const items = await listItems();
  if (isAdmin(request)) return json(items);
  // a quién está reservado solo lo ve la administradora
  return json(items.map(({ reservedFor, ...pub }) => pub));
}

export async function POST(request) {
  if (!isAdmin(request)) return unauthorized();
  const body = await request.json().catch(() => ({}));
  const data = sanitize(body);
  if (!data.title) return json({ error: 'Ponle un título' }, 400);
  const now = Date.now();
  const item = { id: body.id && /^[a-z0-9]{6,30}$/.test(body.id) ? body.id : newId(), ...data, createdAt: now, updatedAt: now };
  return json(await saveItem(item), 201);
}

export async function PUT(request) {
  if (!isAdmin(request)) return unauthorized();
  const id = new URL(request.url).searchParams.get('id');
  const current = id && (await getItem(id));
  if (!current) return json({ error: 'No existe' }, 404);
  const body = await request.json().catch(() => ({}));
  const data = sanitize(body, current);
  if (!data.title) return json({ error: 'Ponle un título' }, 400);
  const removed = current.images.filter((u) => !data.images.includes(u));
  const item = { ...current, ...data, updatedAt: Date.now() };
  await saveItem(item);
  await deleteImages(removed).catch(() => {});
  return json(item);
}

export async function DELETE(request) {
  if (!isAdmin(request)) return unauthorized();
  const id = new URL(request.url).searchParams.get('id');
  const current = id && (await getItem(id));
  if (!current) return json({ error: 'No existe' }, 404);
  await deleteItem(current);
  return json({ ok: true });
}
