# Cómo subir Chamba.com a Render (GRATIS)

## Paso 1: Crear cuenta en GitHub
1. Ve a [github.com](https://github.com)
2. Haz click en "Sign up"
3. Crea una cuenta gratis

## Paso 2: Crear repositorio en GitHub
1. Haz click en el ícono "+" arriba a la derecha → "New repository"
2. Nombre: `chamba-com`
3. Selecciona "Public"
4. Haz click en "Create repository"
5. Copia la URL que te da (algo como `https://github.com/TU-USUARIO/chamba-com.git`)

## Paso 3: Subir el código a GitHub
Abre terminal en la carpeta `chamba` y ejecuta:

```bash
git init
git add .
git commit -m "Primer commit - Chamba.com"
git remote add origin https://github.com/TU-USUARIO/chamba-com.git
git push -u origin main
```

## Paso 4: Crear cuenta en Render
1. Ve a [render.com](https://render.com)
2. Haz click en "Get Started for Free"
3. Regístrate con tu email o GitHub

## Paso 5: Crear sitio web en Render
1. En Render, haz click en "New +" → "Web Service"
2. Conecta tu cuenta de GitHub
3. Selecciona tu repositorio "chamba-com"
4. Configura:
   - **Name**: chamba-com
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Plan**: Free
5. Haz click en "Create Web Service"

## Paso 6: ¡Listo!
Render te dará una URL como: `https://chamba-com.onrender.com`

¡Tu sitio ya está en internet!

---

## Notas importantes

- La primera vez tarda 2-3 minutos en cargar
- Si no lo usas por 15 minutos, se apaga (se enciende solo cuando alguien lo visite)
- Los datos se guardan en archivos JSON (no es una base de datos real)
- Para producción real, usar MongoDB o PostgreSQL
