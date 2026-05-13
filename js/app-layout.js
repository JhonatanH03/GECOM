async function initAppLayout() {
  try {
    const paginasConLayout = [
      'crear.html',
      'ver.html',
      'usuarios.html',
      'juntas.html',
      'ayuntamientos.html',
      'estadisticas.html',
      'historial.html'
    ];
    
    const paginaActual = window.location.pathname.split('/').pop() || 'index.html';
    
    if (!paginasConLayout.some(p => paginaActual.includes(p))) {
      window.__appLayoutReady = true;
      window.dispatchEvent(new CustomEvent('appLayoutReady'));
      return;
    }

    // Esperar a que el DOM esté listo
    if (document.readyState === 'loading') {
      await new Promise(resolve => document.addEventListener('DOMContentLoaded', resolve, { once: true }));
    }

    const response = await fetch('components/app-layout.html', { cache: 'no-store' });
    const html = await response.text();
    
    const container = document.getElementById('appLayoutContainer');
    if (container) {
      container.innerHTML = html;

      initLayoutFunctionality();

      const pageName = paginaActual.split('.')[0];
      setActivePage(pageName);
    }

    // Señalar que el layout está listo
    window.__appLayoutReady = true;
    window.dispatchEvent(new CustomEvent('appLayoutReady'));
  } catch (error) {
    console.warn('Layout no se pudo cargar:', error);
    // Señalar que el layout falló pero el resto debe continuar
    window.__appLayoutReady = true;
    window.dispatchEvent(new CustomEvent('appLayoutReady'));
  }
}

// Ejecutar la inicialización
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAppLayout, { once: true });
} else {
  initAppLayout();
}

function initLayoutFunctionality() {
  const ROLES = {
    es: { admin: 'Administrador', ayuntamiento: 'Ayuntamiento', junta: 'Junta de Vecinos' },
    en: { admin: 'Administrator', ayuntamiento: 'City Hall', junta: 'Neighborhood Board' }
  };

  const I18N = {
    es: {
      perfil: 'Perfil',
      diseno: 'Diseño',
      idioma: 'Idioma',
      cerrarSesion: 'Cerrar Sesión',
      claro: 'Claro',
      oscuro: 'Oscuro',
      sistema: 'Sistema'
    },
    en: {
      perfil: 'Profile',
      diseno: 'Theme',
      idioma: 'Language',
      cerrarSesion: 'Sign Out',
      claro: 'Light',
      oscuro: 'Dark',
      sistema: 'System'
    }
  };

  const getLang = () => localStorage.getItem('idioma') || 'es';
  const t = (key) => (I18N[getLang()] || I18N.es)[key] || key;
  const getRolLabel = (rol, lang) => {
    const byLang = ROLES[lang] || ROLES.es;
    return byLang[rol] || rol || '—';
  };

  const profileWrap = document.getElementById('perfilMenuWrap');
  const profileToggle = document.getElementById('perfilAvatarBtn');
  const profileMenu = document.getElementById('perfilDropdown');
  const btnCerrarSesionProfile = document.getElementById('btnCerrarSesion');
  const profileName = document.getElementById('profileName');
  const profileRole = document.getElementById('profileRole');
  const profileInitial = document.getElementById('profileInitial');
  const profileInitialLg = document.getElementById('profileInitialLg');

  const usuario = localStorage.getItem('nombre') || localStorage.getItem('usuario') || 'Usuario';
  const rol = localStorage.getItem('rol') || '';

  const refreshText = () => {
    document.querySelectorAll('[data-pm-i18n]').forEach((el) => {
      const key = el.getAttribute('data-pm-i18n');
      if (key) el.textContent = t(key);
    });

    if (profileRole) {
      profileRole.textContent = getRolLabel(rol, getLang());
    }
  };

  const markActiveTheme = () => {
    const tema = localStorage.getItem('tema') || 'sistema';
    document.querySelectorAll('.pm-sub-opt[data-tema]').forEach((btn) => {
      btn.classList.toggle('pm-sub-opt--active', btn.dataset.tema === tema);
    });
  };

  const markActiveLanguage = () => {
    const lang = getLang();
    document.querySelectorAll('.pm-sub-opt[data-lang]').forEach((btn) => {
      btn.classList.toggle('pm-sub-opt--active', btn.dataset.lang === lang);
    });
  };

  const aplicarTemaLocal = () => {
    const html = document.getElementById('htmlRoot');
    const body = document.getElementById('bodyRoot');
    if (!html || !body) return;

    const tema = localStorage.getItem('tema') || 'sistema';
    let temaFinal = tema;
    if (tema === 'sistema') {
      temaFinal = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'oscuro' : 'claro';
    }

    if (temaFinal === 'oscuro') {
      html.setAttribute('data-bs-theme', 'dark');
      body.classList.remove('bg-light');
      body.classList.add('bg-dark');
    } else {
      html.setAttribute('data-bs-theme', 'light');
      body.classList.remove('bg-dark');
      body.classList.add('bg-light');
    }
  };

  const closeProfileMenu = () => {
    if (!profileMenu || !profileToggle) return;
    profileMenu.style.display = 'none';
    profileToggle.setAttribute('aria-expanded', 'false');
  };

  if (profileName) {
    profileName.textContent = usuario;
  }
  if (profileInitial) {
    profileInitial.textContent = (usuario || 'U').charAt(0).toUpperCase();
    profileToggle?.setAttribute('title', usuario);
  }
  if (profileInitialLg && profileInitial) {
    profileInitialLg.textContent = profileInitial.textContent;
  }

  refreshText();
  aplicarTemaLocal();
  markActiveTheme();
  markActiveLanguage();

  if (profileToggle && profileMenu) {
    profileToggle.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      const isOpen = profileMenu.style.display !== 'none';
      profileMenu.style.display = isOpen ? 'none' : 'block';
      profileToggle.setAttribute('aria-expanded', String(!isOpen));
    };
  }

  if (!window.__gecomProfileDocCloseBound) {
    window.__gecomProfileDocCloseBound = true;
    document.addEventListener('click', (e) => {
      const wrap = document.getElementById('perfilMenuWrap');
      const menu = document.getElementById('perfilDropdown');
      const toggle = document.getElementById('perfilAvatarBtn');
      if (!wrap || !menu || !toggle) return;
      if (!wrap.contains(e.target)) {
        menu.style.display = 'none';
        toggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  document.querySelectorAll('.pm-sub-opt[data-tema]').forEach((item) => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      localStorage.setItem('tema', item.dataset.tema);
      if (typeof window.initThemeSelector === 'function') {
        window.initThemeSelector();
      } else {
        aplicarTemaLocal();
      }
      markActiveTheme();
      closeProfileMenu();
    });
  });

  document.querySelectorAll('.pm-sub-opt[data-lang]').forEach((item) => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      localStorage.setItem('idioma', item.dataset.lang);
      if (typeof window.applyI18n === 'function') {
        window.applyI18n(item.dataset.lang);
      }
      window.dispatchEvent(new CustomEvent('gecom:language-changed', { detail: { lang: item.dataset.lang } }));
      refreshText();
      markActiveLanguage();
      closeProfileMenu();
    });
  });

  if (btnCerrarSesionProfile) {
    btnCerrarSesionProfile.addEventListener('click', (e) => {
      e.preventDefault();
      closeProfileMenu();
      cerrarSesion();
    });
  }
}

function setActivePage(page) {
  document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.remove('active');
    if (link.dataset.page === page) {
      link.classList.add('active');
    }
  });

  const breadcrumb = document.getElementById('breadcrumbCurrent');
  if (breadcrumb) {
    const pageTitles = {
      'crear': 'Crear Denuncia',
      'ver': 'Denuncias',
      'usuarios': 'Usuarios',
      'juntas': 'Juntas de Vecinos',
      'ayuntamientos': 'Ayuntamientos',
      'estadisticas': 'Estadísticas',
      'historial': 'Historial'
    };
    breadcrumb.textContent = pageTitles[page] || 'Página';
  }
}

async function cerrarSesion() {
  const ok = typeof window.gecomConfirm === 'function'
    ? await window.gecomConfirm({
      title: 'Cerrar sesión',
      message: '¿Estás seguro de que deseas cerrar la sesión actual?',
      confirmText: 'Cerrar sesión',
      cancelText: 'Cancelar',
      type: 'warning'
    })
    : true;

  if (!ok) return;

  const clearLocalSession = () => {
    localStorage.removeItem('uid');
    localStorage.removeItem('rol');
    localStorage.removeItem('usuario');
    localStorage.removeItem('primerLogin');
  };

  const signOutFirebase = async () => {
    // 1) Intentar primero la API compat si existe y esta inicializada
    try {
      if (window.firebase && typeof window.firebase.auth === 'function') {
        await window.firebase.auth().signOut();
        return true;
      }
    } catch (error) {
      console.warn('Logout compat fallido, intentando modular:', error);
    }

    // 2) Fallback a SDK modular para pantallas que no usan compat
    try {
      const [{ default: app }, authMod] = await Promise.all([
        import('./firebase.js'),
        import('https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js')
      ]);

      const auth = authMod.getAuth(app);
      await authMod.signOut(auth);
      return true;
    } catch (error) {
      console.warn('Logout modular fallido:', error);
      return false;
    }
  };

  try {
    await signOutFirebase();
  } catch (error) {
    console.error('Error al cerrar sesión en Firebase:', error);
  } finally {
    clearLocalSession();
    window.location.href = 'index.html';
  }
}

window.AppLayout = {
  setActivePage,
  cerrarSesion
};
