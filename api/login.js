import { checkPassword, createToken, isAdmin, json } from '../lib/http.js';

export async function POST(request) {
  const { password } = await request.json().catch(() => ({}));
  if (!checkPassword(password)) {
    await new Promise((r) => setTimeout(r, 800));
    return json({ error: 'Contraseña incorrecta' }, 401);
  }
  return json({ token: createToken() });
}

// Comprueba si el token guardado sigue siendo válido
export async function GET(request) {
  return json({ ok: isAdmin(request) });
}
