// PWA utilities for service worker registration and updates

// PWA Install utilities
let deferredPrompt: any = null;
let installPromptShown = false;

export const setupInstallPrompt = (): void => {
  // Listen for the beforeinstallprompt event
  window.addEventListener('beforeinstallprompt', (e) => {
    console.log('beforeinstallprompt event fired');
    // Prevent the mini-infobar from appearing on mobile
    e.preventDefault();
    // Stash the event so it can be triggered later
    deferredPrompt = e;
    
    // Show install banner immediately and on every page visit
    showInstallBanner(true);
  });

  // Listen for the app being installed
  window.addEventListener('appinstalled', () => {
    console.log('PWA was installed');
    deferredPrompt = null;
    installPromptShown = false;
    hideInstallBanner();
  });

  // Force show install prompt on every page load if conditions are met
  setTimeout(() => {
    checkAndShowInstallPrompt();
  }, 1000); // Delay to ensure page is loaded
};

  // Don't show if already installed or running standalone
  if (isStandalone()) return;
  
  // Always show the install banner on every page visit
  // regardless of whether we have the beforeinstallprompt event
  showInstallBanner(false);
};

export const triggerInstallPrompt = async (): Promise<boolean> => {
  if (!deferredPrompt) {
    console.log('No native install prompt available, showing manual instructions');
    showManualInstallInstructions();
    return false;
  }

  // Show the install prompt
  deferredPrompt.prompt();
  
  // Wait for the user to respond to the prompt
  const { outcome } = await deferredPrompt.userChoice;
  console.log(`User response to the install prompt: ${outcome}`);
  
  // Clear the deferredPrompt variable
  deferredPrompt = null;
  
  return outcome === 'accepted';
};

const showManualInstallInstructions = (): void => {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isAndroid = /Android/.test(navigator.userAgent);
  
  let instructions = '';
  if (isIOS) {
    instructions = 'Tap the Share button and select "Add to Home Screen"';
  } else if (isAndroid) {
    instructions = 'Tap the menu (⋮) and select "Add to Home screen" or "Install app"';
  } else {
    instructions = 'Look for the install icon in your browser\'s address bar or menu';
  }

  alert(`To install Kachuful:\n\n${instructions}`);
};
export const isInstallable = (): boolean => {
  // Always return true if not standalone to show install options
  return !isStandalone();
};

export const isStandalone = (): boolean => {
  return window.matchMedia('(display-mode: standalone)').matches || 
         (window.navigator as any).standalone === true;
};

const showInstallBanner = (hasNativePrompt: boolean = false): void => {
  // Don't show if already installed
  if (isStandalone()) return;

  const banner = document.createElement('div');
  banner.id = 'pwa-install-banner';
  banner.style.cssText = `
    position: fixed;
    top: 70px;
    left: 20px;
    right: 20px;
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    color: white;
    padding: 1rem;
    border-radius: 12px;
    box-shadow: 0 10px 25px rgba(16, 185, 129, 0.3);
    z-index: 9999;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    animation: slideDown 0.3s ease-out;
    max-width: 400px;
    margin: 0 auto;
  `;

  banner.innerHTML = `
    <style>
      @keyframes slideDown {
        from {
          transform: translateY(-100%);
          opacity: 0;
        }
        to {
          transform: translateY(0);
          opacity: 1;
        }
      }
      @keyframes slideUp {
        from {
          transform: translateY(0);
          opacity: 1;
        }
        to {
          transform: translateY(-100%);
          opacity: 0;
        }
      }
    </style>
    <div style="display: flex; align-items: center; gap: 1rem;">
      <div style="font-size: 2rem;">🃏</div>
      <div style="flex: 1;">
        <div style="font-weight: 600; margin-bottom: 0.25rem;">Install Kachuful</div>
        <div style="font-size: 0.875rem; opacity: 0.9;">
          ${hasNativePrompt ? 'Add to your home screen for quick access' : 'Get the full app experience - install now!'}
        </div>
      </div>
      <div style="display: flex; gap: 0.5rem;">
        <button id="install-btn" style="
          background: rgba(255, 255, 255, 0.2);
          color: white;
          border: none;
          padding: 0.5rem 1rem;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 600;
          font-size: 0.875rem;
          backdrop-filter: blur(10px);
        ">Install</button>
        <button id="dismiss-install-btn" style="
          background: transparent;
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.3);
          padding: 0.5rem 1rem;
          border-radius: 6px;
          cursor: pointer;
          font-size: 0.875rem;
        ">Dismiss</button>
      </div>
    </div>
  `;

  document.body.appendChild(banner);

  // Handle install button click
  const installBtn = document.getElementById('install-btn');
  const dismissBtn = document.getElementById('dismiss-install-btn');

  installBtn?.addEventListener('click', async () => {
    await triggerInstallPrompt();
    hideInstallBanner();
  });

  dismissBtn?.addEventListener('click', () => {
    hideInstallBanner();
    // Remember user dismissed for 5 minutes
    sessionStorage.setItem('pwa-install-dismissed', Date.now().toString());
  });

  // Auto-hide after 15 seconds
  setTimeout(() => {
    if (document.getElementById('pwa-install-banner')) {
      hideInstallBanner();
    }
  }, 15000);
};

const hideInstallBanner = (): void => {
  const banner = document.getElementById('pwa-install-banner');
  if (banner) {
    banner.style.animation = 'slideUp 0.3s ease-in forwards';
    setTimeout(() => {
      banner.remove();
    }, 300);
  }
};

export const registerServiceWorker = async (): Promise<void> => {
  // Check if we're in an environment that supports Service Workers
  if (!('serviceWorker' in navigator)) {
    console.log('Service Workers are not supported in this environment');
    return;
  }

  // Check if we're in StackBlitz or other environments that don't support SW
  if (window.location.hostname === 'localhost' && window.location.port === '5173') {
    console.log('Service Worker registration skipped in development environment');
    return;
  }

  try {
    // Setup install prompt before registering service worker
    setupInstallPrompt();
    
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/'
    });

    console.log('Service Worker registered successfully:', registration);

    // Handle service worker updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New service worker is available
            showUpdateAvailable(registration);
          }
        });
      }
    });

    // Handle controller change (new service worker activated)
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload();
    });

  } catch (error) {
    console.log('Service Worker registration failed:', error);
  }
};

const showUpdateAvailable = (registration: ServiceWorkerRegistration): void => {
  // Create update notification
  const updateBanner = document.createElement('div');
  updateBanner.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    background: #10b981;
    color: white;
    padding: 1rem;
    text-align: center;
    z-index: 9999;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  `;

  updateBanner.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: center; gap: 1rem;">
      <span>🔄 New version available!</span>
      <button id="update-btn" style="
        background: white;
        color: #10b981;
        border: none;
        padding: 0.5rem 1rem;
        border-radius: 0.25rem;
        cursor: pointer;
        font-weight: 600;
      ">Update Now</button>
      <button id="dismiss-btn" style="
        background: transparent;
        color: white;
        border: 1px solid white;
        padding: 0.5rem 1rem;
        border-radius: 0.25rem;
        cursor: pointer;
      ">Later</button>
    </div>
  `;

  document.body.appendChild(updateBanner);

  // Handle update button click
  const updateBtn = document.getElementById('update-btn');
  const dismissBtn = document.getElementById('dismiss-btn');

  updateBtn?.addEventListener('click', () => {
    if (registration.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
  });

  dismissBtn?.addEventListener('click', () => {
    document.body.removeChild(updateBanner);
  });
};

export const checkOnlineStatus = (): boolean => {
  return navigator.onLine;
};

export const setupOnlineStatusListener = (callback: (isOnline: boolean) => void): void => {
  window.addEventListener('online', () => callback(true));
  window.addEventListener('offline', () => callback(false));
};