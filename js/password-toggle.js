/**
 * password-toggle.js
 * Adds a hover-to-reveal eye icon to every password input automatically.
 */
(function () {
  function initPasswordToggles() {
    document.querySelectorAll('input[type="password"]').forEach(function (input) {
      if (input.dataset.pwdToggleInit) return;
      input.dataset.pwdToggleInit = '1';

      var eyeBtn = document.createElement('span');
      eyeBtn.className = 'input-group-text pwd-eye-btn';
      eyeBtn.innerHTML = '<i class="bi bi-eye"></i>';
      eyeBtn.title = 'Mantén el cursor para ver la contraseña';

      eyeBtn.addEventListener('mouseenter', function () {
        input.type = 'text';
        eyeBtn.querySelector('i').className = 'bi bi-eye-slash';
      });

      eyeBtn.addEventListener('mouseleave', function () {
        input.type = 'password';
        eyeBtn.querySelector('i').className = 'bi bi-eye';
      });

      var parent = input.parentElement;
      if (parent && parent.classList.contains('input-group')) {
        parent.appendChild(eyeBtn);
      } else {
        // Wrap standalone input in input-group
        var wrapper = document.createElement('div');
        wrapper.className = 'input-group';
        parent.insertBefore(wrapper, input);
        wrapper.appendChild(input);
        wrapper.appendChild(eyeBtn);
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPasswordToggles);
  } else {
    initPasswordToggles();
  }

  // Expose for dynamic modals / late-rendered inputs
  window.initPasswordToggles = initPasswordToggles;
})();
