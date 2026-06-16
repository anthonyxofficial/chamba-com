# Cómo configurar un dominio personalizado en Render

## Opción 1: Dominio GRATIS (sin pagar)

### Dominios gratuitos disponibles:
- `.netlify.app` (Netlify te da uno gratis)
- `.onrender.com` (Render te da uno gratis)
- `.vercel.app` (Vercel te da uno gratis)

**Ejemplo:** `chamba-com.onrender.com`

Ya lo tienes gratis con Render.

---

## Opción 2: Dominio propio (chamba.com) - De pago

### Paso 1: Comprar un dominio

| Precio aproximado | Dónde comprar |
|-------------------|---------------|
| $10-15/año | [Namecheap.com](https://namecheap.com) |
| $10-15/año | [Google Domains](https://domains.google) |
| $12-15/año | [GoDaddy.com](https://godaddy.com) |

**Dominios recomendados:**
- `chamba.com` (~$12/año)
- `chamba.hn` (~$15/año) - más profesional para Honduras
- `chambahn.com` (~$12/año)

### Paso 2: Configurar el dominio en Render

1. En Render, ve a tu sitio → **Settings**
2. Busca **Custom Domains**
3. Escribe tu dominio: `www.chamba.com`
4. Haz click en **Save**

### Paso 3: Configurar DNS (donde compraste el dominio)

En tu proveedor de dominio (Namecheap, GoDaddy, etc.):

```
Tipo    Nombre    Valor
CNAME   www       chamba-com.onrender.com
A       @         76.76.21.21
```

### Paso 4: Esperar
- La propagación DNS toma **24-48 horas**
- Después de eso, `www.chamba.com` funcionará

---

## Resumen de costos:

| Concepto | Costo |
|----------|-------|
| Hosting Render | $0 (gratis) |
| Dominio propio | ~$12-15/año |
| **Total primer año** | **~$12-15** |
| **Total años siguientes** | **~$12-15/año** |

---

## Mi recomendación:

**Para empezar:** Usa el dominio gratis `chamba-com.onrender.com`

**Cuando crezcas:** Compra `chamba.com` o `chamba.hn`
