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
├── netlify/
│   └── functions/        ← API serverless
│       ├── empleos.js
│       ├── auth.js
│       └── postulaciones.js
├── public/               ← Archivos estáticos
│   ├── index.html
│   ├── css/
│   ├── js/
│   └── ...
├── data/                 ← Base de datos JSON
├── netlify.toml          ← Configuración
└── package.json
```

## Notas importantes

- Los datos se guardan en `data/empleos.json`
- En Netlify, los datos NO se persisten entre deploys
- Para producción, usar una base de datos real (MongoDB, PostgreSQL)
