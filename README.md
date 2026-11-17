# Progreso — registro de gimnasio (PWA)

App web instalable para registrar entrenamientos y seguir el progreso, pensada para iPhone.
Todos los datos se guardan en el propio dispositivo (IndexedDB): no hay servidor ni cuentas.

## Desarrollo

```bash
npm install
npm run dev        # http://localhost:5173  (añade ?sim para simular notch y barra inferior)
npm run build      # genera dist/
npm run preview    # sirve dist/ en local
```

## Publicar en GitHub Pages

1. Sube este proyecto a un repositorio de GitHub (rama `main`).
2. En el repositorio: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Cada `git push` a `main` compila y publica la app en `https://<tu-usuario>.github.io/<repositorio>/`.

## Instalar en el iPhone

1. Abre la URL en **Safari**.
2. Pulsa **Compartir** → **Añadir a pantalla de inicio** → **Añadir**.
3. Abre la app desde el icono: pantalla completa y funciona sin conexión.

Haz de vez en cuando una copia en **Ajustes → Exportar copia completa** y guárdala en Archivos o iCloud Drive.

## Stack

React + TypeScript + Vite · Dexie (IndexedDB) · vite-plugin-pwa (Workbox) · dnd-kit · fflate · gráficas SVG propias.
