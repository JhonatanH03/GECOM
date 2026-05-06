# GECOM
Diseño de una plataforma web prototipo para la gestión municipal de denuncias a través de juntas de vecinos.

## Cómo ejecutar el programa

### Requisitos previos
- **Node.js** (v14 o superior) para ejecutar el backend
- **Firebase CLI** (opcional, si necesitas gestionar la base de datos)
- Acceso a **internet** para Firebase (autenticación y base de datos en la nube)
- **Navegador moderno** (Chrome, Firefox, Edge, Safari)

### Pasos para ejecutar

#### 1. **Iniciar el backend (reset de contraseñas)**
```bash
cd backend
npm install         # Solo la primera vez
node server.js      # Inicia en http://localhost:4000
```
El backend debe estar corriendo para que el reseteo de contraseñas funcione.

#### 2. **Acceder a la aplicación frontend**
Abre tu navegador en uno de estos lugares según dónde tengas el código:

- **Servidor local (Live Server)**
  ```
  http://127.0.0.1:5500
  ```
  O presiona `Alt+L Alt+O` en VS Code con la extensión Live Server

- **Firebase Hosting** (si está desplegado)
  ```
  https://gecom-a721e.web.app
  ```

#### 3. **Credenciales de prueba**
Usa un usuario registrado en el sistema. Los primeros usuarios se registran desde el admin en el modal de login.

---

## Instrucciones para desarrolladores

1. **Estructura del proyecto**
   - `index.html`: Pantalla de login.
   - `dashboard.html`: Panel principal, muestra opciones según el rol.
   - `usuarios.html`: Gestión de Juntas de Vecinos (solo Ayuntamientos).
   - `js/`: Lógica de frontend (auth, dashboard, usuarios, etc).
   - `css/`: Estilos personalizados.
   - `js/provincias.json`: Provincias y municipios para formularios.

2. **Roles y colecciones**
   - Los usuarios se dividen en tres colecciones de Firestore: `Ayuntamientos`, `JuntasDeVecinos`, `Administradores`.
   - El campo `rol` debe estar presente en cada documento de usuario.

3. **Registro y login**
   - El registro solo lo puede hacer un administrador desde el panel.
   - El login busca el usuario en las tres colecciones y guarda el rol en localStorage.

4. **Protección de rutas**
   - Usa `js/guard.js` para evitar acceso no autorizado a páginas protegidas.
   - El dashboard muestra solo las opciones permitidas según el rol.

5. **Desarrollo y pruebas**
   - Usa el emulador de Firebase para pruebas locales si es posible.
   - Prueba todos los flujos con cada tipo de usuario.
   - Verifica que los formularios y validaciones funcionen correctamente.

6. **Estilo y UX**
   - El CSS oculta todas las tarjetas del dashboard por defecto; solo se muestran por JS según el rol.
   - Los mensajes de éxito/error se muestran como alertas en pantalla.

7. **Cierre de sesión**
   - El botón "Cerrar sesión" limpia localStorage y redirige a login.

## Instrucciones para usuarios

- Ingresa con tu correo y contraseña.
- Según tu rol, verás diferentes opciones en el panel principal.
- Si eres Ayuntamiento, puedes gestionar juntas de vecinos.
- Si eres Administrador, puedes gestionar ayuntamientos y usuarios.
- Si eres Junta de Vecinos, puedes registrar y ver denuncias.
- Usa el botón "Cerrar sesión" para salir de forma segura.

## Configuración del Backend

### Archivo `.env` requerido
El backend necesita un archivo `backend/.env` con:
```env
PORT=4000
FIREBASE_SERVICE_ACCOUNT_PATH=./serviceAccountKey.json
DEFAULT_RESET_PASSWORD=Temporal123A
ALLOWED_ORIGINS=http://127.0.0.1:5500,http://localhost:5500,https://gecom-a721e.web.app,https://gecom-a721e.firebaseapp.com
RECENT_AUTH_MAX_AGE_SECONDS=300
```

### Archivo `serviceAccountKey.json`
Debe estar en `backend/serviceAccountKey.json`. Este archivo contiene las credenciales de Firebase Admin SDK y es necesario para:
- Reautenticar usuarios
- Cambiar contraseñas
- Validar tokens ID

**Nota:** Este archivo es sensible. No versionar en Git.

### Endpoints disponibles
- `GET /health` — Verificar que el backend esté corriendo
- `POST /api/password-resets/generic` — Restablecer contraseña de un usuario
  - Body: `{ callerIdToken, targetUid, targetRole }`
  - Response: `{ temporaryPassword, primerLogin: true }`

---

## Traducciones (i18n)

La aplicación soporta español (ES) e inglés (EN):
- El idioma se guarda en `localStorage` bajo la clave `idioma`
- El selector está en todas las páginas (esquina superior derecha)
- El diccionario está en `js/i18n.js` — agregar nuevas traducciones allí

---

