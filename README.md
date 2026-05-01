# GECOM
Diseño de una plataforma web prototipo para la gestión municipal de denuncias a través de juntas de vecinos.

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

---

