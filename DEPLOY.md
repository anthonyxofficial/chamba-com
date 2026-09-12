# Cómo subir Chamba.com a Netlify (GRATIS)

## Paso 1: Crear cuenta en Netlify
1. Ve a [netlify.com](https://netlify.com)
2. Haz click en "Sign up"
3. Regístrate con tu email o GitHub

## Paso 2: Subir código a GitHub
1. Crea una cuenta en [github.com](https://github.com) (si no tienes)
2. Crea un repositorio nuevo llamado "chamba-com"
3. Sube todo el código de la carpeta `chamba/`

## Paso 3: Conectar Netlify con GitHub
1. En Netlify, haz click en "Add new site" → "Import an existing project"
2. Selecciona "GitHub"
3. Busca tu repositorio "chamba-com"
4. Haz click en "Deploy site"

## Paso 4: ¡Listo!
Netlify te dará una URL como: `https://tu-sitio-random.netlify.app`

---

## Estructura del proyecto

```
chamba/
├── server.js               ← API backend (único backend, corre en Render)
├── public/                 ← Archivos estáticos
│   ├── index.html
│   ├── css/
│   ├── js/
│   └── ...
├── data/                   ← Base de datos JSON
├── netlify.toml            ← Configuración (solo estático)
└── package.json
```

## Notas importantes

- El backend oficial es `server.js` en Render (ver `RENDER.md`).
  Las antiguas `netlify/functions` fueron eliminadas porque no tenían
  autenticación (passwords en texto plano, CRUD sin JWT) y exponían
  datos de postulantes.
- Si sirves el frontend en Netlify, la API debe apuntar a tu URL de
  Render y esa URL debe estar en `ALLOWED_ORIGINS` del backend.
- Los datos se guardan en `data/empleos.json`
- En Netlify, los datos NO se persisten entre deploys
- Para producción, usar una base de datos real (MongoDB, PostgreSQL)
