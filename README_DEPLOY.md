# TOROZÓN · Safari extremeño

Web estilo videojuego 3D para vender safaris en Extremadura. Three.js + Vite.

## Estado actual
- ✅ Escena 3D completa (terreno FBM, cortijo extremeño, 600 encinas, 9 especies)
- ✅ Cámara dual: orbital + WASD a pie + 4×4 con salpicadero
- ✅ HUD videojuego (minimapa, brújula, telemetría, 8 botones de especie)
- ✅ Web Audio (viento, grillos, pájaros, brama)
- ✅ 5 secciones web (especies, experiencias, galería, reserva)
- ✅ Toggle 3D ↔ 3 vídeos hero (A/B/C)
- ✅ SEO completo (meta tags, OG, Twitter, JSON-LD LocalBusiness, sitemap, robots)
- ✅ Seguridad (CSP, HSTS, X-Frame-Options, Referrer-Policy, Permissions-Policy)
- ✅ Accesibilidad (aria-labels, svg aria-hidden, contraste)
- ✅ Performance (preconnect, dns-prefetch, cache headers)

## Estructura del proyecto

```
safari-extremadura/
├── index.html              ← entrada HTML con meta SEO
├── package.json            ← dependencias
├── vite.config.js          ← config vite
├── vercel.json             ← config Vercel (headers seguridad, cache)
├── .gitignore              ← exclusiones
├── public/
│   ├── favicon.svg         ← icono del sitio
│   ├── og-cover.jpg        ← imagen para Open Graph (1200x630)
│   ├── robots.txt          ← para crawlers
│   ├── sitemap.xml         ← sitemap
│   └── security.txt        ← /.well-known/security.txt
├── src/
│   ├── main.js             ← entry point Three.js
│   ├── world.js            ← terreno + cortijo
│   ├── animals.js          ← 9 especies con IA
│   ├── trees.js            ← 600 encinas + arbustos
│   ├── camera.js           ← orbital + WASD + coche
│   ├── vehicle.js          ← 4×4 con salpicadero
│   ├── ui.js               ← HUD, panels
│   ├── sound.js            ← Web Audio
│   ├── noise.js            ← FBM noise
│   └── style.css           ← CSS
└── dist/                     ← build output (vite build → aquí)
```

## Deploy a Vercel — paso a paso

### Opción 1: Vercel CLI (más rápida)

```powershell
# 1. Instalar Vercel CLI (si no está)
npm install -g vercel

# 2. Login (abre navegador)
vercel login

# 3. Dentro de safari-extremadura/, deploy
cd C:\ruta\a\safari-extremadura
vercel --yes          # preview deployment (URL temporal)
vercel --yes --prod   # producción (URL permanente)
```

### Opción 2: Git + Vercel dashboard

1. Crear repo GitHub `Hugo23-4/safari-extremadura`
2. Subir el código (sin node_modules, sin MP4 — ya hay .gitignore)
3. Ir a https://vercel.com/new
4. Importar el repo
5. Vercel detecta vite automáticamente
6. Click Deploy

## Vídeos (importante)

Los vídeos NO están en este proyecto porque son ~75 MB total y Vercel free tier tiene límite de 100 MB por deployment. El proyecto desplegado asumirá que los vídeos están en una URL externa.

**Opciones para los vídeos:**

1. **Cloudinary / Bunny CDN** — subir los 3 masters y usar URLs https
2. **Tu propio server** — configurar Nginx / Caddy con Range support
3. **Quitar el toggle de vídeo** — dejar solo la escena 3D
4. **YouTube/Vimeo embebido** — subir como no-listados y embeber con iframe

Para esta versión, los vídeos se sirven desde `dist/videos/` que se desplegarán también pero contando contra el límite. Si Vercel rechaza, usa opción 1 (CDN).

## URLs locales para desarrollo

```bash
# Servidor con Range support + no-cache headers
python serve_nocache.py
# → http://localhost:4173/
```

## Verificaciones pre-deploy

- [ ] Has testeado localmente en :4173 y todo carga
- [ ] El toggle 3D ↔ vídeos funciona
- [ ] El form de reserva se ve
- [ ] Las secciones (especies, experiencias, galería) se ven
- [ ] El minimapa muestra la fauna

## Personalización pendiente

- Sustituir `+34-927-00-00-00` y `hola@torozon.es` por datos reales en index.html
- Sustituir `https://torozon.es/` por tu dominio real
- Sustituir coordenadas GPS (39.4825, -5.4108) por las reales
- Generar og-cover.jpg definitivo con foto de la finca

## Comandos útiles

```bash
# Desarrollo local
npm run dev          # vite dev server (con HMR)

# Build de producción
npm run build        # genera dist/

# Preview del build
npm run preview      # sirve dist/

# Servidor con Range support (mejor para vídeos)
python serve_nocache.py
```