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

const checkAndShowInstallPrompt = (): void => {
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
    