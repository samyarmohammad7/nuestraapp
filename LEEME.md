# Nuestra App · Sam y Sofy

## Qué hay en esta carpeta

```
public/                 la app (todo lo que se ve)
  index.html            la app y su configuración (fechas, canciones, historia)
  preguntas.js          las preguntas y los planes (se pueden editar)
  reglas.js             reglas de UNO y Cuarenta
  sw.js                 recibe las notificaciones
  img/ icons/ manifest.webmanifest
netlify/functions/
  push.mjs              envía las notificaciones al celular del otro
netlify.toml            configuración de Netlify
package.json
```

## Opción rápida, sin notificaciones

Arrastra solo la carpeta `public` a la pestaña **Deploys** de tu sitio en Netlify, como siempre.
Todo funciona menos las notificaciones al celular.

## Con notificaciones (una sola vez, unos 10 minutos)

Netlify solo puede enviar notificaciones si publica desde GitHub. Es gratis.

### 1. Subir a GitHub
1. Entra en https://github.com y crea un repositorio **privado** llamado `nuestra-app` (botón **New**).
2. En el repositorio vacío toca **uploading an existing file**.
3. Arrastra **todo lo que está dentro** de la carpeta `nuestra-app` (la carpeta `public`, la carpeta `netlify`, `netlify.toml`, `package.json` y este archivo).
4. Toca **Commit changes**.

### 2. Conectar tu sitio de Netlify a GitHub (mantiene el mismo link)
1. En https://app.netlify.com abre tu sitio.
2. **Project configuration › Build & deploy › Continuous deployment › Link repository**.
3. Elige GitHub y el repositorio `nuestra-app`. No cambies nada de la compilación: Netlify lee `netlify.toml` solo.

### 3. Poner las claves
1. **Project configuration › Environment variables › Add a variable**.
2. Agrega las 5 variables del archivo `CLAVES-NOTIFICACIONES.txt` (ese archivo NO va a GitHub).
3. Ve a **Deploys › Trigger deploy › Deploy site**.

### 4. Activarlas en cada celular
* **iPhone (iOS 16.4 o más nuevo):** abre el link en Safari, Compartir › **Añadir a pantalla de inicio**, abre la app desde ese ícono y toca **🔔 Activa las notificaciones**.
* **Android:** abre el link en Chrome, ⋮ › **Instalar app**, ábrela y toca **🔔 Activa las notificaciones**.
* Abajo del inicio, en **🔔 avisos**, hay un botón para mandarte una de prueba.

Si el otro tiene la app abierta, no le llega notificación: ya lo ve en vivo.

### Para actualizar después
En GitHub entra a la carpeta `public`, toca **Add file › Upload files** y arrastra los archivos nuevos.
Netlify publica solo en un minuto.

## Firebase
No hay que cambiar nada. Todo se guarda dentro de `rooms/samysofy_200029`, igual que antes.
Las fotos del álbum se guardan comprimidas en la misma base de datos.
