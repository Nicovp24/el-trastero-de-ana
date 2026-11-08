// Almacenamiento: Vercel Blob en producción, carpeta .data/ en local.
// Cada producto guarda sus datos en items/<id>/<timestamp>.json. Al editar se
// escribe un archivo nuevo (URL única, sin caché obsoleta) y se borran los viejos.
import { promises as fs } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const useBlob = !!process.env.BLOB_READ_WRITE_TOKEN;
const LOCAL_DIR = path.resolve('.data');

let blobMod;
async function blob() {
  if (!blobMod) blobMod = await import('@vercel/blob');
  return blobMod;
}

export function newId() {
  return Date.now().toString(36) + crypto.randomBytes(3).toString('hex');
}

async function listAll(prefix) {
  const { list } = await blob();
  const out = [];
  let cursor;
  do {
    const page = await list({ prefix, cursor, limit: 1000 });
    out.push(...page.blobs);
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  return out;
}

async function fetchJson(url) {
  const r = await fetch(url, { cache: 'no-store' });
  if (!r.ok) throw new Error('No se pudo leer ' + url);
  return r.json();
}

// Agrupa blobs "<prefix><key>/<ts>.json" y devuelve { key: [blobs ordenados, más nuevo primero] }
function groupVersions(blobs, prefix) {
  const groups = {};
  for (const b of blobs) {
    const rest = b.pathname.slice(prefix.length);
    const key = rest.split('/')[0];
    (groups[key] ||= []).push(b);
  }
  for (const k in groups) {
    groups[k].sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
  }
  return groups;
}

async function writeVersionedJson(dir, data) {
  const { put, list, del } = await blob();
  const prefix = dir + '/';
  const previous = (await list({ prefix })).blobs;
  await put(`${prefix}${Date.now()}.json`, JSON.stringify(data), {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: true,
    cacheControlMaxAge: 31536000,
  });
  if (previous.length) await del(previous.map((b) => b.url));
}

/* ---------- Productos ---------- */

export async function listItems() {
  if (!useBlob) {
    const dir = path.join(LOCAL_DIR, 'items');
    const files = await fs.readdir(dir).catch(() => []);
    const items = await Promise.all(
      files.filter((f) => f.endsWith('.json')).map(async (f) => JSON.parse(await fs.readFile(path.join(dir, f), 'utf8')))
    );
    return sortItems(items);
  }
  const prefix = 'items/';
  const groups = groupVersions(await listAll(prefix), prefix);
  const items = await Promise.all(
    Object.values(groups).map((versions) => fetchJson(versions[0].url).catch(() => null))
  );
  return sortItems(items.filter(Boolean));
}

function sortItems(items) {
  return items.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

export async function getItem(id) {
  const items = await listItems();
  return items.find((i) => i.id === id) || null;
}

export async function saveItem(item) {
  if (!useBlob) {
    const dir = path.join(LOCAL_DIR, 'items');
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, item.id + '.json'), JSON.stringify(item, null, 2));
    return item;
  }
  await writeVersionedJson('items/' + item.id, item);
  return item;
}

export async function deleteItem(item) {
  if (!useBlob) {
    await fs.rm(path.join(LOCAL_DIR, 'items', item.id + '.json'), { force: true });
    await fs.rm(path.join(LOCAL_DIR, 'img', item.id), { recursive: true, force: true });
    return;
  }
  const { del } = await blob();
  const metas = await listAll('items/' + item.id + '/');
  const imgs = await listAll('img/' + item.id + '/');
  const urls = [...metas, ...imgs].map((b) => b.url);
  if (urls.length) await del(urls);
}

/* ---------- Imágenes ---------- */

export async function putImage(folder, buffer, contentType) {
  const ext = contentType === 'image/webp' ? 'webp' : contentType === 'image/png' ? 'png' : 'jpg';
  const name = `${Date.now()}-${crypto.randomBytes(3).toString('hex')}.${ext}`;
  if (!useBlob) {
    const dir = path.join(LOCAL_DIR, 'img', folder);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, name), buffer);
    return `/local-img/${folder}/${name}`;
  }
  const { put } = await blob();
  const res = await put(`img/${folder}/${name}`, buffer, {
    access: 'public',
    contentType,
    addRandomSuffix: true,
    cacheControlMaxAge: 31536000,
  });
  return res.url;
}

export async function deleteImages(urls) {
  if (!urls.length) return;
  if (!useBlob) {
    for (const u of urls) {
      if (u.startsWith('/local-img/')) {
        await fs.rm(path.join(LOCAL_DIR, 'img', u.slice('/local-img/'.length)), { force: true });
      }
    }
    return;
  }
  const { del } = await blob();
  await del(urls);
}

/* ---------- Ajustes ---------- */

export const DEFAULT_SETTINGS = {
  shopName: 'El trastero de Ana',
  ownerName: 'Ana',
  intro: 'Cosas que ya no necesito. Si algo te interesa, escríbeme y te lo reservo.',
  whatsapp: '',
};

export async function getSettings() {
  if (!useBlob) {
    try {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(await fs.readFile(path.join(LOCAL_DIR, 'settings.json'), 'utf8')) };
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  }
  const versions = (await listAll('settings/')).sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
  if (!versions.length) return { ...DEFAULT_SETTINGS };
  return { ...DEFAULT_SETTINGS, ...(await fetchJson(versions[0].url).catch(() => ({}))) };
}

export async function saveSettings(settings) {
  if (!useBlob) {
    await fs.mkdir(LOCAL_DIR, { recursive: true });
    await fs.writeFile(path.join(LOCAL_DIR, 'settings.json'), JSON.stringify(settings, null, 2));
    return settings;
  }
  await writeVersionedJson('settings', settings);
  return settings;
}
