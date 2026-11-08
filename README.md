# El trastero de Ana

Web móvil sencilla para vender cosas del trastero. La administradora sube fotos, título,
precio y descripción. Quien recibe el enlace ve el catálogo y reserva con un botón de WhatsApp
que ya lleva el mensaje escrito.

- **Público:** `/` catálogo · `/#/p/<id>` ficha con galería, favoritos y botón «Escribir a Ana» por WhatsApp
- **Admin:** `/#/admin` (contraseña) · añadir/editar/borrar · cambiar estado (Disponible / Reservado / Vendido) con un toque · ajustes (su nombre, nombre de la tienda, presentación, WhatsApp)

Sin framework: HTML/CSS/JS en `public/`, funciones serverless en `api/`, fotos y datos en Vercel Blob.
Las fotos se reducen en el móvil (máx. 1600 px) antes de subirse.

## Probar en local

```bash
npm install
echo "ADMIN_PASSWORD=la-que-quieras" > .env
npm run dev        # http://localhost:3000
```

En local los datos se guardan en `.data/` (no hace falta cuenta de Vercel). El archivo `.env` no se sube a git.

## Publicar en Vercel (gratis)

1. Sube este repo a GitHub e impórtalo en Vercel (preset «Other», sin build).
2. En el proyecto: **Storage → Create → Blob** y conéctalo. Esto añade `BLOB_READ_WRITE_TOKEN`.
3. En **Settings → Environment Variables** añade `ADMIN_PASSWORD` con la contraseña de tu madre.
4. Redeploy. Entra en `https://<tu-proyecto>.vercel.app/#/admin`, ve a **Ajustes** y pon el WhatsApp.

Opcional: `AUTH_SECRET` (cadena aleatoria larga) para firmar las sesiones de forma independiente de la contraseña.
Cambiar `ADMIN_PASSWORD` o `AUTH_SECRET` cierra todas las sesiones abiertas.
