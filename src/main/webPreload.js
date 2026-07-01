const { ipcRenderer } = require('electron');

let currentCredentials = [];
let activeDropdown = null;
let lastInputValues = {
  username: '',
  password: ''
};

function trackInputs() {
  document.addEventListener('input', (e) => {
    if (!e.target || e.target.tagName !== 'INPUT') return;
    
    const input = e.target;
    if (input.type === 'password') {
      lastInputValues.password = input.value;
      const userEl = findUsernameInput(input);
      if (userEl) {
        lastInputValues.username = userEl.value;
      }
    }

    else if (input.type === 'text' || input.type === 'email') {
      
      const pwdEl = document.querySelector('input[type="password"]');
      
      if (pwdEl && findUsernameInput(pwdEl) === input) {
        lastInputValues.username = input.value;
      }
      
    }
  }, true);
}

function findUsernameInput(passwordInput) {
  
  const form = passwordInput.form;
  if (form) {
    const inputs = Array.from(form.querySelectorAll('input'));
    const pwdIndex = inputs.indexOf(passwordInput);
    for (let i = pwdIndex - 1; i >= 0; i--) {
      const type = inputs[i].type;
      if (type === 'text' || type === 'email' || type === 'tel' || type === 'url') {
        return inputs[i];
      }
    }
  }
  
  const inputs = Array.from(document.querySelectorAll('input'));
  const pwdIndex = inputs.indexOf(passwordInput);
  
  for (let i = pwdIndex - 1; i >= 0; i--) {
    const type = inputs[i].type;
    if (type === 'text' || type === 'email' || type === 'tel' || type === 'url') {
      return inputs[i];
    }
  }
  return null;
}

function isDarkTheme() {
  try {
    const bgColor = window.getComputedStyle(document.body).backgroundColor;
    const rgb = bgColor.match(/\d+/g);
    
    if (rgb && rgb.length >= 3) {
      const r = parseInt(rgb[0], 10);
      const g = parseInt(rgb[1], 10);
      const b = parseInt(rgb[2], 10);
      const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
      return yiq < 128;
    }
    
  }

  catch (e) { }
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function closeAutofillDropdown() {
  if (activeDropdown && activeDropdown.parentNode) {
    activeDropdown.parentNode.removeChild(activeDropdown);
  }
  activeDropdown = null;
}

function showAutofillDropdown(input, credentials) {
  closeAutofillDropdown();
  if (credentials.length === 0) return;

  const isDark = isDarkTheme();
  const dropdown = document.createElement('div');
  dropdown.id = 'simple-autofill-dropdown';
  
  Object.assign(dropdown.style, {
    position: 'absolute',
    zIndex: '2147483647',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    fontSize: '13px',
    backgroundColor: isDark ? '#1e293b' : '#ffffff',
    color: isDark ? '#f1f5f9' : '#1e293b',
    border: `1px solid ${isDark ? '#475569' : '#cbd5e1'}`,
    borderRadius: '8px',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -2px rgba(0, 0, 0, 0.2)',
    padding: '4px 0',
    minWidth: '220px',
    maxHeight: '200px',
    overflowY: 'auto',
    cursor: 'pointer',
    userSelect: 'none',
    boxSizing: 'border-box'
  });

  credentials.forEach(cred => {
    const row = document.createElement('div');
    
    Object.assign(row.style, {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '8px 12px',
      gap: '8px',
      transition: 'background-color 0.15s ease'
    });

    row.addEventListener('mouseenter', () => {
      row.style.backgroundColor = isDark ? '#334155' : '#f1f5f9';
    });
    
    row.addEventListener('mouseleave', () => {
      row.style.backgroundColor = 'transparent';
    });

    const leftContainer = document.createElement('div');
    Object.assign(leftContainer.style, {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      overflow: 'hidden'
    });

    leftContainer.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width: 14px; height: 14px; opacity: 0.6; flex-shrink: 0;">
        <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1 1 21.75 8.25Z" />
      </svg>
      <span style="font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${cred.username || 'Saved Password'}</span>
    `;

    const hint = document.createElement('span');
    Object.assign(hint.style, {
      fontSize: '10px',
      opacity: '0.5',
      textTransform: 'uppercase',
      letterSpacing: '0.05em'
    });
    hint.textContent = 'Autofill';

    row.appendChild(leftContainer);
    row.appendChild(hint);

    row.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      const pwdEl = input.type === 'password' ? input : document.querySelector('input[type="password"]');
      const userEl = input.type === 'password' ? findUsernameInput(input) : input;
      
      if (userEl) {
        userEl.value = cred.username;
        userEl.dispatchEvent(new Event('input', { bubbles: true }));
        userEl.dispatchEvent(new Event('change', { bubbles: true }));
      }
      
      if (pwdEl) {
        pwdEl.value = cred.password;
        pwdEl.dispatchEvent(new Event('input', { bubbles: true }));
        pwdEl.dispatchEvent(new Event('change', { bubbles: true }));
      }
      
      closeAutofillDropdown();
    });

    dropdown.appendChild(row);
  });

  const rect = input.getBoundingClientRect();
  dropdown.style.left = `${rect.left + window.scrollX}px`;
  dropdown.style.top = `${rect.bottom + window.scrollY + 4}px`;
  dropdown.style.width = `${Math.max(rect.width, 220)}px`;

  document.body.appendChild(dropdown);
  activeDropdown = dropdown;
}

function setupAutofill() {
  
  const handleFocus = async (e) => {
    const input = e.target;
    if (!input || input.tagName !== 'INPUT') return;
    
    if (input.type !== 'password' && input.type !== 'text' && input.type !== 'email') return;

    const origin = window.location.origin;
    try {
      const credentials = await ipcRenderer.invoke('passwords:get-for-origin', origin);
      if (credentials && credentials.length > 0) {
        currentCredentials = credentials;
        
        showAutofillDropdown(input, credentials);
      }
    }

    catch (err) {
      console.error('Autofill preload failed to get credentials:', err);
    }
  };

  document.addEventListener('focusin', handleFocus, true);
  
  document.addEventListener('click', (e) => {
    if (activeDropdown && !activeDropdown.contains(e.target) && e.target.tagName !== 'INPUT') {
      closeAutofillDropdown();
    }
  }, true);

  window.addEventListener('scroll', closeAutofillDropdown, true);
  window.addEventListener('resize', closeAutofillDropdown, true);
}

function setupSubmitHandler() {
  const handleSubmit = (username, password) => {
    if (!password) return;
    ipcRenderer.send('password-submitted', {
      origin: window.location.origin,
      username: username.trim(),
      password: password
    });
  };

  document.addEventListener('submit', (e) => {
    const form = e.target;
    
    if (form && form.tagName === 'FORM') {
      const passwordInputs = form.querySelectorAll('input[type="password"]');
      
      if (passwordInputs.length > 0) {
        const passwordInput = passwordInputs[0];
        const usernameInput = findUsernameInput(passwordInput);
        
        const username = usernameInput ? usernameInput.value : lastInputValues.username;
        const password = passwordInput.value || lastInputValues.password;
        
        handleSubmit(username, password);
      }
      
    }
    
  }, true);

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('button, input[type="submit"], input[type="button"]');
    if (!btn) return;

    const text = (btn.textContent || btn.value || '').toLowerCase().trim();
    const isLoginBtn = text.includes('log') || text.includes('sign') || text.includes('submit') || text.includes('enter') || text.includes('next');

    if (isLoginBtn) {
      const passwordInputs = document.querySelectorAll('input[type="password"]');
      
      for (const passwordInput of passwordInputs) {
        const usernameInput = findUsernameInput(passwordInput);
        const username = usernameInput ? usernameInput.value : lastInputValues.username;
        const password = passwordInput.value || lastInputValues.password;
        
        if (password) {
          handleSubmit(username, password);
          break;
        }
      }
    }
  }, true);
}

document.addEventListener('DOMContentLoaded', () => {
  setupAutofill();
  setupSubmitHandler();
  trackInputs();
});
