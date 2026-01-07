// === CONFIG Google API === (near the top of your file)
const CLIENT_ID = '209622447692-eev27ais29mr9rn8o1jfjh9tc5budni4.apps.googleusercontent.com';
const FOLDER_ID = '1PoWXuFHe0-AXKLTbQlWu0NmEG3aC-ZxP';
const API_KEY = ''; // Agregue su API_KEY si es necesario
const SCOPES = 'https://www.googleapis.com/auth/drive.file';

// Configuraciones optimizadas para iPhone 11 en horizontal
const IMAGE_FORMAT = 'image/jpeg';
const IMAGE_QUALITY = 1.0;  // Reducido de 1.0 a 0.9 para uploads más rápidos
const TARGET_WIDTH = 4032;
const TARGET_HEIGHT = 3024;
const TARGET_RATIO = TARGET_WIDTH / TARGET_HEIGHT;

// Configuraciones de captura y QR - MODIFICAR ESTOS VALORES
const QR_SCAN_INTERVAL = 200;
const QR_CONFIRMATION_DELAY = 1000;  // Reducido de 2000 a 1000
const PROCESSING_SIZE = 800;
const AUTO_CAPTURE_DELAY = 2000;  // Reducido de 4000 a 2000

// Estado de la aplicación - centralizado para mayor control
window.appState = {
  currentMode: null,
  sessionId: null,
  connectionCode: null,
  isConnected: false,
  isActiveSession: false,
  iphoneWasConnected: false,
  firebaseRefs: {
    sessions: null,
    currentSession: null,
    photos: null,
    status: null,
    devices: null
  },
  photoCount: 0,
  lastQrCode: null,
  mediaStream: null,
  currentVideoSettings: null,
  isProcessingQR: false,
  captureTimer: null,
  qrScanInterval: null,
  lastDetectedQR: null,
  qrDetectionTime: null,
  scanningCanvas: null,
  scanningContext: null,
  isCameraInitialized: false,
  isConnectedToFirebase: false,
  lastProcessedCode: null,

  // Nuevas variables para el sistema de cola
  photoQueue: [],
  isProcessingQueue: false,
  maxQueueSize: 10,
  queueStartTime: null,

  // Autenticación
  tokenClient: null,
  accessToken: null,
  gapiInited: false,
  gisInited: false,
  authStorageKey: 'qrScanAuthToken',

  // NUEVO: Sistema de Versionamiento (Proceso de Migración)
  systemVersion: null, // 'old' o 'new'
  versionStorageKey: 'systemVersionSelection'
};

// Detectar dispositivo - con detección más confiable
const deviceDetection = {
  isIOS: /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream,
  isSafari: false, // Se definirá abajo
  isTablet: /iPad/.test(navigator.userAgent) || (navigator.maxTouchPoints > 0 && window.innerWidth > 768)
};
deviceDetection.isSafari = deviceDetection.isIOS &&
  /AppleWebKit/.test(navigator.userAgent) &&
  !/Chrome/.test(navigator.userAgent);

// Modo debug (desactivado para producción)
const DEBUG_MODE = false;

// Agrupando todos los elementos DOM por contexto
const domElements = {
  // Pantallas
  screens: {
    versionSelection: document.getElementById('version-selection-screen'),
    deviceSelection: document.getElementById('device-selection-screen'),
    tabletCode: document.getElementById('tablet-code-screen'),
    iphoneCode: document.getElementById('iphone-code-screen'),
    tablet: document.getElementById('tablet-screen'),
    login: document.getElementById('login-screen'),
    camera: document.getElementById('camera-screen')
  },

  // Selección de versión
  versionSelection: {
    oldButton: document.getElementById('version-old-btn'),
    newButton: document.getElementById('version-new-btn')
  },

  // Selección de dispositivo
  deviceSelection: {
    tabletButton: document.getElementById('tablet-select-btn'),
    iphoneButton: document.getElementById('iphone-select-btn')
  },

  // Pantalla de código Tablet
  tabletCode: {
    codeDisplay: document.getElementById('connection-code'),
    connectionStatus: document.getElementById('tablet-connection-status'),
    generateNewCodeBtn: document.getElementById('generate-new-code-btn'),
    backBtn: document.getElementById('tablet-code-back-btn')
  },

  // Pantalla de código iPhone
  iphoneCode: {
    codeInput: document.getElementById('connection-code-input'),
    connectBtn: document.getElementById('connect-btn'),
    errorMessage: document.getElementById('code-error-message'),
    backBtn: document.getElementById('iphone-code-back-btn')
  },

  // Modo Tablet
  tablet: {
    qrInput: document.getElementById('tablet-qr-input'),
    clearBtn: document.getElementById('tablet-clear-btn'),
    disconnectBtn: document.getElementById('tablet-disconnect-btn'),
    sessionDisplay: document.getElementById('tablet-session-display'),
    qrMainNumber: document.getElementById('qr-main-number'),
    qrSecondaryInfo: document.getElementById('qr-secondary-info'),
    statusMessage: document.getElementById('tablet-status-message'),
    statusText: document.getElementById('tablet-status-text'),
    iphoneStatus: document.getElementById('tablet-iphone-status'),
    photoCount: document.getElementById('photo-count'),
    lastPhotoCode: document.getElementById('last-photo-code')
  },

  // Indicador de Drive
  driveStatus: {
    container: document.getElementById('drive-status'),
    icon: document.getElementById('drive-icon'),
    text: document.getElementById('drive-status-text')
  },

  // Modo iPhone
  iphone: {
    loginSessionDisplay: document.getElementById('login-session-display'),
    loginBtn: document.getElementById('login-btn'),
    disconnectBtn: document.getElementById('iphone-disconnect-btn'),
    camera: document.getElementById('camera'),
    googleAuthBtn: document.getElementById('google-auth-btn'),
    canvas: document.getElementById('canvas'),
    statusOverlay: document.getElementById('status-overlay'),
    scanOverlay: document.getElementById('scan-overlay'),
    scanFrame: document.getElementById('scan-frame'),
    qrInput: document.getElementById('qr-input'),
    cameraSessionDisplay: document.getElementById('camera-session-display'),
    cameraStatusBadge: document.getElementById('camera-status-badge'),
    simpleStatusMessage: document.getElementById('simple-status-message')
  }
};

// Logs de debug - Mejorado para soportar diferentes niveles
function debugLog(message, data, level = 'info') {
  if (!DEBUG_MODE) return;

  const prefix = `[${level.toUpperCase()}]`;

  switch (level) {
    case 'error':
      console.error(prefix, message, data || '');
      break;
    case 'warn':
      console.warn(prefix, message, data || '');
      break;
    case 'info':
    default:
      console.log(prefix, message, data || '');
  }
}

// === FUNCIONES DE VERSIONAMIENTO ===

// Guardar versión seleccionada (solo en memoria, NO en localStorage)
function saveVersionSelection(version) {
  appState.systemVersion = version;
  debugLog('Versión seleccionada para esta sesión:', version);
}

// Mostrar versión actual en la pantalla de dispositivos
function updateVersionDisplay() {
  const versionDisplay = document.getElementById('current-version-display');
  if (versionDisplay && appState.systemVersion) {
    const versionText = appState.systemVersion === 'old' ? 'Antigua (5 dígitos)' : 'Nueva (IDH completo)';
    versionDisplay.textContent = `Versión: ${versionText}`;
  }
}

// Configurar listeners de selección de versión
function setupVersionSelectionButtons() {
  const { oldButton, newButton } = domElements.versionSelection;

  if (oldButton) {
    oldButton.addEventListener('click', () => {
      saveVersionSelection('old');
      showScreen(domElements.screens.deviceSelection);
      updateVersionDisplay();
    });
  }

  if (newButton) {
    newButton.addEventListener('click', () => {
      saveVersionSelection('new');
      showScreen(domElements.screens.deviceSelection);
      updateVersionDisplay();
    });
  }

  // Botón para cambiar de versión
  const changeVersionBtn = document.getElementById('change-version-btn');
  if (changeVersionBtn) {
    changeVersionBtn.addEventListener('click', () => {
      showScreen(domElements.screens.versionSelection);
    });
  }
}

// Inicialización - Con manejo de errores mejorado
window.addEventListener('DOMContentLoaded', () => {
  try {
    // MODIFICADO: SIEMPRE mostrar pantalla de selección al inicio
    setupVersionSelectionButtons();

    // Siempre mostrar pantalla de selección de versión
    showScreen(domElements.screens.versionSelection);

    // Configuración de los listeners para botones
    setupDeviceSelectionButtons();

    // Configuración Firebase
    try {
      const { database, sessionsRef } = initFirebase();
      appState.firebaseRefs.sessions = sessionsRef;
      debugLog('Firebase inicializado con éxito');
      // NOVO: Verificar se há sessão anterior
    } catch (err) {
      console.error('Error al inicializar Firebase:', err);
      updateDriveStatus('error');
      // Continuar incluso con error en Firebase, solo con funcionalidad limitada
    }

    // Cargar bibliotecas Google
    loadGoogleLibraries();

    // Verificar y configurar orientación
    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);
    // Adicionar evento para atualizar o viewport da câmera quando a tela mudar de tamanho
    window.addEventListener('resize', updateCameraViewport);

    // Configuración para modo tablet
    setupTabletMode();

    // Intentar restaurar sesión anterior
    tryRestoreAuthSession();

    debugLog('Aplicación inicializada con éxito');
  } catch (err) {
    console.error('Error fatal en la inicialización:', err);
    // Mostrar mensaje amigable para el usuario en lugar de fallar silenciosamente
    alert('Ocurrió un error al inicializar la aplicación. Por favor, recargue la página.');
  }
});

// Intentar restaurar sesión de autenticación anterior - con catch mejorado
function tryRestoreAuthSession() {
  try {
    const savedToken = localStorage.getItem(appState.authStorageKey);
    if (savedToken) {
      appState.accessToken = savedToken;
      debugLog('Token de autenticación restaurado del almacenamiento local');
    }
  } catch (err) {
    debugLog('Error al restaurar sesión:', err, 'warn');
    // Limpiar cualquier token posiblemente corrupto
    try {
      localStorage.removeItem(appState.authStorageKey);
    } catch (e) {
      // Falla silenciosa solo para limpieza de token
    }
  }
}

// Generar código de conexión aleatorio - con tamaño predeterminado de 3 dígitos
function generateConnectionCode() {
  return Math.floor(Math.random() * 900 + 100).toString();
}

// Configurar botones de la pantalla de selección de dispositivo
function setupDeviceSelectionButtons() {
  const { tabletButton, iphoneButton } = domElements.deviceSelection;

  // Botón "Tablet"
  if (tabletButton) {
    tabletButton.addEventListener('click', () => {
      appState.currentMode = 'tablet';

      // Generar un nuevo código de conexión
      appState.connectionCode = generateConnectionCode();

      // Mostrar el código
      if (domElements.tabletCode.codeDisplay) {
        domElements.tabletCode.codeDisplay.textContent = appState.connectionCode;
      }

      // Registrar en Firebase como un host
      setupFirebaseForTabletHost(appState.connectionCode);

      // Mostrar la pantalla de código del tablet
      showScreen(domElements.screens.tabletCode);
    });
  }

  // Botón "iPhone"
  if (iphoneButton) {
    iphoneButton.addEventListener('click', () => {
      appState.currentMode = 'iphone';
      showScreen(domElements.screens.iphoneCode);

      // Enfocar en el campo de entrada
      if (domElements.iphoneCode.codeInput) {
        domElements.iphoneCode.codeInput.focus();
      }
    });
  }

  // Botón "Generar Nuevo Código" en la pantalla del tablet
  if (domElements.tabletCode.generateNewCodeBtn) {
    domElements.tabletCode.generateNewCodeBtn.addEventListener('click', () => {
      // Desconectar de la sesión anterior
      if (appState.isConnectedToFirebase) {
        disconnectFromFirebase();
      }

      // Generar nuevo código
      appState.connectionCode = generateConnectionCode();

      // Mostrar el nuevo código
      if (domElements.tabletCode.codeDisplay) {
        domElements.tabletCode.codeDisplay.textContent = appState.connectionCode;
      }

      // Registrar nuevo código en Firebase
      setupFirebaseForTabletHost(appState.connectionCode);

      updateDriveStatus('ready');
    });
  }

  // Botón "Volver" en la pantalla de código del tablet
  if (domElements.tabletCode.backBtn) {
    domElements.tabletCode.backBtn.addEventListener('click', () => {
      disconnectFromFirebase();
      appState.currentMode = null;
      showScreen(domElements.screens.deviceSelection);
    });
  }

  // Botón "Desconectar" en la pantalla principal del tablet
  if (domElements.tablet.disconnectBtn) {
    domElements.tablet.disconnectBtn.addEventListener('click', () => {
      disconnectFromFirebase();
      appState.currentMode = null;
      showScreen(domElements.screens.deviceSelection);
    });
  }

  // Botón "Conectar" en la pantalla de código del iPhone
  if (domElements.iphoneCode.connectBtn) {
    domElements.iphoneCode.connectBtn.addEventListener('click', handleConnectButtonClick);
  }

  // Campo de entrada de código en iPhone - permitir Enter
  if (domElements.iphoneCode.codeInput) {
    domElements.iphoneCode.codeInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        handleConnectButtonClick();
      }
    });
  }

  // Botón "Volver" en la pantalla de código del iPhone
  if (domElements.iphoneCode.backBtn) {
    domElements.iphoneCode.backBtn.addEventListener('click', () => {
      appState.currentMode = null;
      showScreen(domElements.screens.deviceSelection);
    });
  }

  // Botón "Desconectar" en la pantalla de login del iPhone
  if (domElements.iphone.disconnectBtn) {
    domElements.iphone.disconnectBtn.addEventListener('click', () => {
      disconnectFromFirebase();
      appState.currentMode = null;
      showScreen(domElements.screens.deviceSelection);
    });
  }

  // Botones de acción en modo tablet
  if (domElements.tablet.clearBtn) {
    domElements.tablet.clearBtn.addEventListener('click', () => {
      resetTabletDisplay();
      if (domElements.tablet.qrInput) {
        domElements.tablet.qrInput.value = '';
        domElements.tablet.qrInput.focus();
      }
    });
  }
}

// Función para validar y conectar (extraída para mejorar legibilidad)
function handleConnectButtonClick() {
  const enteredCode = domElements.iphoneCode.codeInput.value.trim();

  if (enteredCode.length !== 3) {
    showCodeError('Por favor, ingrese el código de 3 dígitos');
    return;
  }

  if (!/^\d{3}$/.test(enteredCode)) {
    showCodeError('El código debe contener solo 3 dígitos numéricos');
    return;
  }

  // Verificar si el código existe en Firebase
  connectToTablet(enteredCode);
}

// Sistema de status reativado para monitoramento
function updateDriveStatus(state, message) {
  // Log básico para debug
  console.log(`🔍 Drive Status: ${state}${message ? ' - ' + message : ''}`);

  // Manter função ativa para futuras melhorias
  const timestamp = new Date().toLocaleTimeString();
  debugLog(`Status changed to: ${state}`, { message, timestamp });

  return;
}

// Mostrar error en la pantalla de entrada de código
function showCodeError(message) {
  const { errorMessage, codeInput } = domElements.iphoneCode;

  if (errorMessage) {
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';

    // Agitar el campo de entrada
    if (codeInput) {
      codeInput.classList.add('shake');
      setTimeout(() => {
        codeInput.classList.remove('shake');
      }, 500);
    }
  }
}

// Ocultar error en la pantalla de entrada de código
function hideCodeError() {
  const { errorMessage } = domElements.iphoneCode;

  if (errorMessage) {
    errorMessage.style.display = 'none';
  }
}

// Mostrar una determinada pantalla y ocultar las demás
function showScreen(screenElement) {
  // Obtener todas las pantallas del objeto domElements.screens
  const screens = Object.values(domElements.screens);

  // Ocultar todas las pantallas
  screens.forEach(screen => {
    if (screen) screen.style.display = 'none';
  });

  // Mostrar la pantalla solicitada
  if (screenElement) {
    screenElement.style.display = 'flex';

    // Enfocar en el input del tablet automáticamente
    if (screenElement === domElements.screens.tablet && domElements.tablet.qrInput) {
      setTimeout(() => domElements.tablet.qrInput.focus(), 300);
    }
  }
}

// Verificar y ajustar orientación del dispositivo
function checkOrientation() {
  if (window.matchMedia("(orientation: portrait)").matches && appState.currentMode === 'iphone') {
    // Estamos en portrait - solicitar al usuario rotar a landscape
    document.body.classList.add('portrait-warning');
    debugLog('Dispositivo en modo retrato - solicitando rotación');
  } else {
    // Estamos en landscape o en modo tablet
    document.body.classList.remove('portrait-warning');
  }
}

// Configurar Firebase para modo tablet (host) - con mejor manejo de errores
function setupFirebaseForTabletHost(code) {
  if (!firebase || !appState.firebaseRefs.sessions) {
    updateDriveStatus('error');
    debugLog('Firebase no inicializado', null, 'error');
    return;
  }

  try {
    // Desconectar de cualquier sesión anterior
    if (appState.isConnectedToFirebase) {
      disconnectFromFirebase();
    }

    // Configurar referencias Firebase para el código de conexión
    const sessionRef = appState.firebaseRefs.sessions.child(code);
    appState.firebaseRefs.currentSession = sessionRef;
    appState.firebaseRefs.photos = sessionRef.child('photos');
    appState.firebaseRefs.status = sessionRef.child('status');
    appState.firebaseRefs.devices = sessionRef.child('devices');

    // Inicializar los datos de la sesión con timestamp del servidor
    sessionRef.update({
      created: firebase.database.ServerValue.TIMESTAMP,
      lastActivity: firebase.database.ServerValue.TIMESTAMP,
      host: 'tablet'
    });

    // Registrar este dispositivo como tablet
    const tabletRef = appState.firebaseRefs.devices.child('tablet');
    tabletRef.set({
      connected: true,
      lastSeen: firebase.database.ServerValue.TIMESTAMP,
      userAgent: navigator.userAgent
    });

    // Configurar desconexión
    tabletRef.onDisconnect().update({
      connected: false,
      lastSeen: firebase.database.ServerValue.TIMESTAMP
    });

    // Escuchar status del iPhone
    setupIPhoneStatusListener();

    // Escuchar status de las fotos
    setupPhotoStatusListener();

    // Configurar input para lectura del scanner físico
    setupTabletQRInputListener();

    appState.isConnectedToFirebase = true;
    // NOVO: Marcar que sessão está ativa e aguardando iPhone
    appState.isActiveSession = true;
    debugLog('Firebase configurado para host tablet con código:', code);
  } catch (err) {
    debugLog('Error al configurar host tablet en Firebase:', err, 'error');
    updateDriveStatus('error');
    alert('Error al conectar al servicio. Por favor, intente nuevamente.');
  }
}

// Escuchar status del iPhone - com alerta de desconexão
function setupIPhoneStatusListener() {
  const iphoneRef = appState.firebaseRefs.devices.child('iphone');
  iphoneRef.on('value', (snapshot) => {
    const iphoneData = snapshot.val();

    if (iphoneData && iphoneData.connected) {
      handleIPhoneConnected();
    } else {
      handleIPhoneDisconnected();

      // MOSTRAR ALERTA VERMELHO QUANDO IPHONE DESCONECTA
      if (appState.isConnected) { // Só mostrar se estava conectado antes
        showSystemErrorAlert();
      }
    }
  });
}

// Handler para iPhone conectado
function handleIPhoneConnected() {
  appState.isConnected = true;

  // NOVO: Marcar que iPhone já conectou pelo menos uma vez
  appState.iphoneWasConnected = true;

  // Actualizar status de conexión
  if (domElements.tabletCode.connectionStatus) {
    domElements.tabletCode.connectionStatus.innerHTML = `
      <div class="status-indicator connected"></div>
      <span>iPhone conectado! Iniciando...</span>
    `;
  }

  if (domElements.tablet.iphoneStatus) {
    domElements.tablet.iphoneStatus.textContent = 'iPhone conectado';
    domElements.tablet.iphoneStatus.classList.add('connected');

    // Modificar el color del círculo
    const statusDot = document.querySelector('.connection-status-badge .status-dot');
    if (statusDot) {
      statusDot.classList.add('connected');
    }
  }

  // En 2 segundos, si aún estamos en la pantalla de código, ir a la pantalla principal
  setTimeout(() => {
    if (appState.isConnected && domElements.screens.tabletCode.style.display !== 'none') {
      showScreen(domElements.screens.tablet);

      // Mostrar el código de conexión en la pantalla principal también
      if (domElements.tablet.sessionDisplay) {
        domElements.tablet.sessionDisplay.textContent = appState.connectionCode;
      }

      updateDriveStatus('waiting');
    }
  }, 2000);

  // NOVO: ADICIONAR AQUI - Remover alerta de iPhone desconectado se existir
  const iphoneAlert = document.getElementById('iphone-disconnected-alert');
  if (iphoneAlert) {
    iphoneAlert.remove();
  }

  // Reabilitar input do tablet
  const tabletInput = document.getElementById('tablet-qr-input');
  if (tabletInput) {
    tabletInput.disabled = false;
    tabletInput.placeholder = 'Scanner QR';
    tabletInput.style.backgroundColor = ''; // Remover fundo vermelho
  }
}

// Handler para iPhone desconectado
function handleIPhoneDisconnected() {
  appState.isConnected = false;

  if (domElements.tabletCode.connectionStatus) {
    domElements.tabletCode.connectionStatus.innerHTML = `
      <div class="status-indicator waiting"></div>
      <span>Esperando conexión del iPhone...</span>
    `;
  }

  if (domElements.tablet.iphoneStatus) {
    domElements.tablet.iphoneStatus.textContent = 'iPhone desconectado';
    domElements.tablet.iphoneStatus.classList.remove('connected');

    // Revertiendo el color del círculo
    const statusDot = document.querySelector('.connection-status-badge .status-dot');
    if (statusDot) {
      statusDot.classList.remove('connected');
    }
  }

  updateDriveStatus('error');

  // SÓ MOSTRAR ALERTA SE IPHONE JÁ ESTEVE CONECTADO E AGORA DESCONECTOU
  if (appState.iphoneWasConnected && appState.currentMode === 'tablet') {
    showIPhoneDisconnectedAlert();
  }
}

// Escuchar status de las fotos - Extraído para mejorar legibilidad
function setupPhotoStatusListener() {
  appState.firebaseRefs.status.on('value', (snapshot) => {
    const status = snapshot.val();

    if (status && status.photoStatus) {
      handlePhotoStatusChange(status.photoStatus);
    }
  });
}

// Handler para cambio en el status de la foto - Version corregida
function handlePhotoStatusChange(photoStatus) {
  // Add logging to debug the issue
  console.log("Photo status changed to:", photoStatus);

  switch (photoStatus) {
    case 'capturing':
      // Just update status, don't touch counter
      break;
    case 'captured':
      // Increment counter ONLY in this state
      console.log("Incrementing photo count on 'captured' state");
      appState.photoCount++;
      if (domElements.tablet.photoCount) {
        domElements.tablet.photoCount.textContent = appState.photoCount;
      }

      // Resetear inmediatamente
      resetTabletDisplay();
      if (domElements.tablet.qrInput) {
        domElements.tablet.qrInput.value = '';
        domElements.tablet.qrInput.focus();
      }
      break;
    case 'queued':
      // Just reset display, don't touch counter
      resetTabletDisplay();
      if (domElements.tablet.qrInput) {
        domElements.tablet.qrInput.value = '';
        domElements.tablet.qrInput.focus();
      }
      break;
    case 'uploading':
      // No counter changes here
      break;
    case 'completed':
      // DO NOT increment counter here
      console.log("Not incrementing in 'completed' state");
      break;
    case 'error':
      // No counter changes here
      break;
  }
}

// Configurar listener para el input de QR en tablet
function setupTabletQRInputListener() {
  const { qrInput } = domElements.tablet;

  if (qrInput) {
    qrInput.addEventListener('input', handleTabletQrInput);
    qrInput.addEventListener('keydown', (e) => {
      // Capturar Enter del scanner
      if (e.key === 'Enter') {
        const qrText = qrInput.value.trim();
        if (qrText.length > 0) {
          processTabletQrCode(qrText);
        }
      }
    });
  }
}

// Intentar conectar al tablet con el código informado
function connectToTablet(code) {
  if (!firebase || !appState.firebaseRefs.sessions) {
    updateCameraStatus('Error al conectar con el servicio de sincronización', 'error');
    return;
  }

  try {
    // Verificar si el código existe
    const sessionRef = appState.firebaseRefs.sessions.child(code);

    sessionRef.once('value')
      .then((snapshot) => {
        const sessionData = snapshot.val();

        if (!sessionData) {
          showCodeError('Código inválido o expirado');
          return;
        }

        // Código existe, almacenar y conectar
        appState.connectionCode = code;

        // Configurar referencias Firebase
        appState.firebaseRefs.currentSession = sessionRef;
        appState.firebaseRefs.photos = sessionRef.child('photos');
        appState.firebaseRefs.status = sessionRef.child('status');
        appState.firebaseRefs.devices = sessionRef.child('devices');

        // Registrar este dispositivo como iPhone
        const iphoneRef = appState.firebaseRefs.devices.child('iphone');
        iphoneRef.set({
          connected: true,
          lastSeen: firebase.database.ServerValue.TIMESTAMP,
          userAgent: navigator.userAgent
        });

        // Configurar desconexión
        iphoneRef.onDisconnect().update({
          connected: false,
          lastSeen: firebase.database.ServerValue.TIMESTAMP
        });

        appState.isConnectedToFirebase = true;

        // Ocultar error si existe
        hideCodeError();

        // Actualizar timestamp de última actividad
        sessionRef.update({
          lastActivity: firebase.database.ServerValue.TIMESTAMP
        });

        // Ir a la pantalla de login
        showScreen(domElements.screens.login);

        // Mostrar el código en la pantalla de login
        if (domElements.iphone.loginSessionDisplay) {
          domElements.iphone.loginSessionDisplay.textContent = appState.connectionCode;
        }

        // Configurar autenticación Google
        setupGoogleAuth();
        setupLoginButton();
        updateAuthUIState(appState.accessToken ? true : false);

        debugLog('Conectado al tablet con código:', appState.connectionCode);
      })
      .catch((error) => {
        console.error('Error al verificar código:', error);
        showCodeError('Error al verificar código, intente nuevamente');
      });
  } catch (error) {
    console.error('Error fatal al conectar:', error);
    showCodeError('Error de conexión. Por favor, intente nuevamente.');
  }
}

// Procesar código QR leído en tablet - Simplificado y más robusto
function processTabletQrCode(qrText) {
  if (!qrText || appState.isProcessingQR) return;

  appState.isProcessingQR = true;
  debugLog('Procesando QR code en tablet:', qrText);

  try {
    // Extraer IDH completo (ALTERADO: ya no usamos solo los últimos 5 dígitos)
    const { fullNumber, idhCompleto } = extractQRCodeData(qrText);

    if (fullNumber && idhCompleto) {
      // Mostrar los números
      displayQrResult(idhCompleto, fullNumber);
      appState.lastProcessedCode = idhCompleto;
      updateLastPhotoDisplay(idhCompleto);

      // Verificar conexión y notificar iPhone
      if (appState.isConnected) {
        // Dividir el QR en partes para mantener la compatibilidad con el código anterior
        const parts = qrText.split(';');
        // MODIFICADO: Pasar tanto el nombre de archivo como el IDH completo para overlay
        notifyIphoneToCapture(idhCompleto, fullNumber, parts.join(' | '));
      } else {
        updateDriveStatus('error');
        appState.isProcessingQR = false;
      }
    } else {
      throw new Error("No se pudo extraer los datos necesarios del código QR");
    }
  } catch (error) {
    console.error("Error en la extracción del código:", error);
    updateDriveStatus('error');
    appState.isProcessingQR = false;

    // Limpiar y enfocar nuevamente en el input
    if (domElements.tablet.qrInput) {
      domElements.tablet.qrInput.value = '';
      domElements.tablet.qrInput.focus();
    }
  }
}

// Función de extracción de datos del QR code - MODIFICADA para soportar versiones
function extractQRCodeData(qrText) {
  // Verificar si tenemos un QR válido con formato esperado
  if (!qrText || !qrText.includes(';')) {
    throw new Error("Código QR inválido o en formato incorrecto");
  }

  // Dividir el QR en partes
  const parts = qrText.split(';').map(part => part.trim());

  // Verificar si tenemos al menos 4 partes
  if (parts.length < 4) {
    throw new Error("El código QR no tiene el formato esperado");
  }

  // Extraer el campo en la posición 4 (índice 3)
  let fullNumber = parts[3];

  // Verificar si el campo es undefined o null
  if (fullNumber === undefined || fullNumber === null) {
    // Intentar un enfoque alternativo
    const matches = qrText.match(/;([^;]+);/g);
    if (matches && matches.length >= 2) {
      fullNumber = matches[1].replace(/;/g, '').trim();
    } else {
      throw new Error("No se pudo extraer el campo necesario");
    }
  }

  // Verificar si el número existe
  if (!fullNumber) {
    throw new Error("Campo extraído está vacío");
  }

  // Garantizar que estamos trabajando con string y eliminar espacios
  fullNumber = String(fullNumber).trim();

  // Verificar que el IDH tiene contenido válido
  if (fullNumber.length === 0) {
    throw new Error("El IDH extraído está vacío");
  }

  // === SISTEMA DE VERSIONES ===
  // Decidir qué formato usar según la versión seleccionada
  let idhCompleto;

  if (appState.systemVersion === 'old') {
    // VERSIÓN ANTIGUA: Últimos 5 dígitos para nombre de archivo
    // Pero SIEMPRE overlay con IDH completo en imagen
    if (fullNumber.length < 5) {
      throw new Error("El número extraído es muy corto (menos de 5 dígitos)");
    }
    idhCompleto = fullNumber.slice(-5); // Solo últimos 5 para nombre archivo
    console.log(`[Versión Antigua] Nombre archivo: ${idhCompleto}, Overlay imagen: ${fullNumber}`);
  } else {
    // VERSIÓN NUEVA: IDH completo para todo
    idhCompleto = fullNumber;
    console.log(`[Versión Nueva] Nombre archivo: ${idhCompleto}, Overlay imagen: ${fullNumber}`);
  }

  return { fullNumber, idhCompleto };
}

// Mostrar resultado del QR en tablet
function displayQrResult(mainNumber, fullNumber) {
  const { qrMainNumber, qrSecondaryInfo } = domElements.tablet;

  if (qrMainNumber) {
    qrMainNumber.textContent = mainNumber;
  }

  if (qrSecondaryInfo) {
    qrSecondaryInfo.textContent = fullNumber;

    // Eliminar cualquier clase de estado anterior
    qrSecondaryInfo.classList.remove('waiting');
  }

  // Actualizar status de forma más discreta
  updateDriveStatus('waiting');
}

// Notificar iPhone para capturar foto - MODIFICADO para versionamiento
function notifyIphoneToCapture(codeNumber, fullIDH, additionalInfo) {
  if (!appState.isConnectedToFirebase || !appState.firebaseRefs.photos) {
    updateDriveStatus('error');
    appState.isProcessingQR = false;
    return;
  }

  // Verifica nuevamente si el iPhone está conectado
  if (!appState.isConnected) {
    updateDriveStatus('error');
    appState.isProcessingQR = false;
    return;
  }

  // Crear un nuevo nodo para la foto
  const newPhotoRef = appState.firebaseRefs.photos.push();

  // Datos para la foto
  const photoData = {
    code: codeNumber,          // Nombre del archivo (5 dígitos o completo según versión)
    overlayIDH: fullIDH,       // NUEVO: IDH completo SIEMPRE para overlay en imagen
    additionalInfo: additionalInfo || '',
    requestTime: firebase.database.ServerValue.TIMESTAMP,
    status: 'requested'
  };

  // Guardar los datos con timeout y retry
  const maxRetries = 3;
  let currentRetry = 0;

  function attemptSave() {
    newPhotoRef.set(photoData)
      .then(() => {
        debugLog('Solicitud de foto enviada al iPhone:', photoData);
        updateDriveStatus('waiting');

        // Actualizar status
        return appState.firebaseRefs.status.update({
          lastQrCode: codeNumber,
          photoStatus: 'requested',
          requestTime: firebase.database.ServerValue.TIMESTAMP
        });
      })
      .catch(error => {
        currentRetry++;
        console.error(`Error al notificar iPhone (intento ${currentRetry}):`, error);

        if (currentRetry < maxRetries) {
          // Intentar nuevamente después de un breve retraso
          setTimeout(attemptSave, 1000);
        } else {
          updateDriveStatus('error');
          appState.isProcessingQR = false;

          // Mostrar mensaje de error apropiado
          alert('Error al comunicar con el dispositivo de captura. Por favor, intente nuevamente.');
        }
      });
  }

  // Primer intento
  attemptSave();
}

// Resetear pantalla del tablet
function resetTabletDisplay() {
  const { qrMainNumber, qrSecondaryInfo } = domElements.tablet;

  if (qrMainNumber) {
    qrMainNumber.textContent = '-----';
  }

  if (qrSecondaryInfo) {
    qrSecondaryInfo.textContent = '---------';

    // Agregar clase de estado de espera
    qrSecondaryInfo.classList.add('waiting');
  }

  updateDriveStatus('waiting');
  appState.isProcessingQR = false;
}

// Actualizar pantalla de la última foto
function updateLastPhotoDisplay(code) {
  if (domElements.tablet.lastPhotoCode && code) {
    domElements.tablet.lastPhotoCode.textContent = code;
    const parent = domElements.tablet.lastPhotoCode.parentElement;
    if (parent) {
      parent.style.display = 'inline-flex';
    }
  }
}

// Procesar input de QR en tablet
function handleTabletQrInput(event) {
  // Si ya está procesando, ignorar
  if (appState.isProcessingQR) return;

  // Detectar fin de la lectura (normalmente un scanner QR envía un Enter al final)
  if (event.inputType === 'insertText' && event.data === '\n') {
    const qrText = domElements.tablet.qrInput.value.trim();
    if (qrText.length > 0) {
      processTabletQrCode(qrText);
    }
  }
}

// Configurar Firebase para modo iPhone
function setupFirebaseForIphone() {
  if (!appState.connectionCode || !appState.isConnectedToFirebase) {
    updateCameraStatus('Error: No está conectado al tablet', 'error');
    return;
  }

  // Mostrar el código en la pantalla de la cámara
  if (domElements.iphone.cameraSessionDisplay) {
    domElements.iphone.cameraSessionDisplay.textContent = appState.connectionCode;
  }

  // Escuchar solicitudes de fotos nuevas con tratamiento de errores mejorado
  try {
    appState.firebaseRefs.photos
      .orderByChild('status')
      .equalTo('requested')
      .limitToLast(1)
      .on('child_added', handleNewPhotoRequest, handlePhotoRequestError);

    debugLog('Firebase configurado para modo iPhone con código:', appState.connectionCode);
  } catch (error) {
    console.error('Error al configurar escucha de solicitudes de foto:', error);
    updateCameraStatus('Error al configurar conexión con el tablet', 'error');
  }
}

// Handler para nuevas solicitudes de foto
function handleNewPhotoRequest(snapshot) {
  try {
    const photoData = snapshot.val();

    if (photoData && photoData.code) {
      debugLog('Nueva solicitud de foto recibida:', photoData);

      // Mostrar el código en el input
      if (domElements.iphone.qrInput) {
        domElements.iphone.qrInput.value = photoData.code;
      }

      // Actualizar status
      updateCameraStatus(`Capturando: ${photoData.code}`);

      // Mostrar "detectado" en el overlay
      if (domElements.iphone.scanOverlay) {
        domElements.iphone.scanOverlay.classList.remove('hidden');
        domElements.iphone.scanOverlay.classList.add('detected');
      }

      // Actualizar status de la foto
      snapshot.ref.update({
        status: 'processing',
        processingStartTime: firebase.database.ServerValue.TIMESTAMP
      });

      appState.firebaseRefs.status.update({
        photoStatus: 'capturing',
        captureTime: firebase.database.ServerValue.TIMESTAMP
      });

      // Programar captura automática
      setTimeout(() => {
        // MODIFICADO: Capturar con ambos códigos
        // photoData.code = nombre del archivo (5 dígitos o completo)
        // photoData.overlayIDH = IDH completo para overlay en imagen
        const overlayText = photoData.overlayIDH || photoData.code; // Fallback al code si no existe overlayIDH
        captureAndUpload(photoData.code, overlayText, snapshot.key);
      }, AUTO_CAPTURE_DELAY);
    }
  } catch (error) {
    console.error('Error al procesar solicitud de foto:', error);
    updateCameraStatus('Error al procesar solicitud', 'error');
  }
}

// Handler para error en la escucha de solicitudes de foto
function handlePhotoRequestError(error) {
  console.error('Error en la escucha de solicitudes de foto:', error);
  updateCameraStatus('Error de comunicación con el tablet', 'error');
}

// Actualizar status de la cámara en iPhone - Versión modificada para texto más discreto
function updateCameraStatus(message, type = 'success') {
  const { simpleStatusMessage } = domElements.iphone;

  // Actualizar mensaje simple
  if (simpleStatusMessage) {
    simpleStatusMessage.textContent = message;
    simpleStatusMessage.style.display = 'block';

    // Aplicar color basado en el tipo
    simpleStatusMessage.classList.remove('error');
    if (type === 'error') {
      simpleStatusMessage.classList.add('error');
    }

    // Auto-ocultar después de algunos segundos si es un mensaje de éxito
    if (type === 'success') {
      setTimeout(() => {
        simpleStatusMessage.style.display = 'none';
      }, 3000);
    }
  }
}

// Desconectar de Firebase - con mecanismo de retry
function disconnectFromFirebase() {
  // Desconectar observadores
  if (appState.isConnectedToFirebase && appState.firebaseRefs.currentSession) {
    try {
      // Cancelar listeners
      if (appState.firebaseRefs.photos) appState.firebaseRefs.photos.off();
      if (appState.firebaseRefs.status) appState.firebaseRefs.status.off();
      if (appState.firebaseRefs.devices) appState.firebaseRefs.devices.off();

      // Registrar desconexión si estamos en algún modo
      if (appState.currentMode === 'tablet' && appState.firebaseRefs.devices) {
        appState.firebaseRefs.devices.child('tablet').update({
          connected: false,
          lastSeen: firebase.database.ServerValue.TIMESTAMP
        }).catch(err => debugLog('Error al actualizar status tablet:', err, 'warn'));
      } else if (appState.currentMode === 'iphone' && appState.firebaseRefs.devices) {
        appState.firebaseRefs.devices.child('iphone').update({
          connected: false,
          lastSeen: firebase.database.ServerValue.TIMESTAMP
        }).catch(err => debugLog('Error al actualizar status iPhone:', err, 'warn'));
      }

      // Limpiar referencias
      appState.firebaseRefs.currentSession = null;
      appState.firebaseRefs.photos = null;
      appState.firebaseRefs.status = null;
      appState.firebaseRefs.devices = null;
    } catch (error) {
      debugLog('Error al desconectar de Firebase:', error, 'warn');
      // Continuar incluso con error
    }
  }

  appState.isConnectedToFirebase = false;
  appState.connectionCode = null;
  appState.isConnected = false;
  appState.isActiveSession = false;
  appState.iphoneWasConnected = false;  // ← ADICIONAR

  debugLog('Desconectado de Firebase');
}

// Configurar modo tablet - con detección de Enter mejorada
function setupTabletMode() {
  // Agregar listener para tecla Enter (muchos scanners QR envían Enter después de la lectura)
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' &&
      appState.currentMode === 'tablet' &&
      domElements.screens.tablet.style.display !== 'none' &&
      domElements.tablet.qrInput) {

      // Verificar si el foco ya está en el input para evitar duplicar la entrada
      const activeElement = document.activeElement;
      if (activeElement !== domElements.tablet.qrInput) {
        const qrText = domElements.tablet.qrInput.value.trim();
        if (qrText.length > 0) {
          processTabletQrCode(qrText);
        }
      }
    }
  });
}

// Mostrar overlay de status
function showStatusOverlay(state) {
  const { statusOverlay, simpleStatusMessage } = domElements.iphone;

  // Ocultar el overlay de status antiguo
  if (statusOverlay) {
    statusOverlay.classList.add('hidden');
  }

  // En vez de esto, usar nuestro mensaje simple
  if (simpleStatusMessage) {
    if (state === 'uploading') {
      updateCameraStatus('Enviando foto...');
    } else if (state === 'success') {
      updateCameraStatus('¡Foto enviada con éxito!');
    } else if (state === 'error') {
      updateCameraStatus('Error al enviar foto', 'error');
    } else {
      simpleStatusMessage.style.display = 'none';
    }
  }
}

// Cargar bibliotecas Google - con timeout y manejo de error
function loadGoogleLibraries() {
  // Definir un timeout para fallback si la carga falla
  const loadTimeout = setTimeout(() => {
    debugLog('Timeout al cargar bibliotecas Google', null, 'warn');
    handleGoogleLibrariesError();
  }, 10000);

  // Cargar el script GAPI
  const gapiScript = document.createElement('script');
  gapiScript.src = 'https://apis.google.com/js/api.js';
  gapiScript.async = true;
  gapiScript.defer = true;
  gapiScript.onload = () => {
    clearTimeout(loadTimeout); // Limpiar timeout al cargar con éxito
    initializeGapiClient();
  };
  gapiScript.onerror = handleGoogleLibrariesError;
  document.head.appendChild(gapiScript);

  // Cargar el script Google Identity Services
  const gisScript = document.createElement('script');
  gisScript.src = 'https://accounts.google.com/gsi/client';
  gisScript.async = true;
  gisScript.defer = true;
  gisScript.onload = () => {
    clearTimeout(loadTimeout); // Limpiar timeout al cargar con éxito
    initializeGisClient();
  };
  gisScript.onerror = handleGoogleLibrariesError;
  document.head.appendChild(gisScript);

  debugLog('Cargando bibliotecas Google...');
}

// Handler para error en la carga de las bibliotecas Google
function handleGoogleLibrariesError() {
  console.error('Error al cargar bibliotecas Google');
  if (appState.currentMode === 'iphone') {
    updateCameraStatus('Error al cargar herramientas de subida. Verifique su conexión.', 'error');
  } else {
    alert('No fue posible cargar las bibliotecas necesarias. Por favor, verifique su conexión y recargue la página.');
  }
}

// Inicializar GAPI con manejo de error
async function initializeGapiClient() {
  try {
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Timeout al cargar GAPI client')), 5000);
      gapi.load('client', () => {
        clearTimeout(timeout);
        resolve();
      });
    });

    await gapi.client.init({
      apiKey: API_KEY,
      discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest']
    });

    appState.gapiInited = true;
    maybeEnableButtons();

    // Si tiene un token guardado, verificar su validez
    if (appState.accessToken) {
      validateSavedToken();
    }
  } catch (err) {
    console.error('Error al inicializar GAPI client:', err);
    appState.gapiInited = false;
    maybeEnableButtons();

    if (appState.currentMode === 'iphone') {
      updateCameraStatus('Error al conectar con Google Drive. Intente nuevamente.', 'error');
    }
  }
}

// Verificar si el token guardado aún es válido
async function validateSavedToken() {
  try {
    // Intentar hacer una petición a Drive API para verificar si el token es válido
    const response = await gapi.client.request({
      path: 'https://www.googleapis.com/drive/v3/files?fields=files(id,name)&pageSize=1',
      method: 'GET',
      headers: {
        'Authorization': 'Bearer ' + appState.accessToken
      }
    });

    // Si llegó aquí, el token es válido
    console.log('Token de autenticación validado con éxito');

    // Actualizar UI si es necesario
    updateAuthUIState(true);

    // Si estamos en modo iPhone y ya autenticados, mostrar la pantalla de la cámara
    if (appState.currentMode === 'iphone' && domElements.screens.login.style.display !== 'none') {
      showScreen(domElements.screens.camera);
      if (!appState.isCameraInitialized) {
        setupCamera();
        appState.isCameraInitialized = true;
      }

      setupFirebaseForIphone();
    }
  } catch (err) {
    console.error('Error al validar token guardado:', err);

    // Token inválido o expirado, eliminarlo
    try {
      localStorage.removeItem(appState.authStorageKey);
    } catch (e) {
      // Falla silenciosa si no se puede eliminar
    }
    appState.accessToken = null;

    // Actualizar UI
    updateAuthUIState(false);
  }
}

// Inicializar Google Identity Services
function initializeGisClient() {
  try {
    appState.tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPES,
      prompt: '', // Usar '' para no mostrar el prompt cuando sea posible
      callback: handleTokenResponse,
      error_callback: handleAuthError
    });
    appState.gisInited = true;
    maybeEnableButtons();
  } catch (error) {
    console.error('Error al inicializar Google Identity Services:', error);
    appState.gisInited = false;
    maybeEnableButtons();

    if (appState.currentMode === 'iphone') {
      updateCameraStatus('Error al configurar autenticación. Intente nuevamente.', 'error');
    }
  }
}

// Handler para respuesta de token
function handleTokenResponse(tokenResponse) {
  if (tokenResponse && tokenResponse.access_token) {
    appState.accessToken = tokenResponse.access_token;

    // Guardar el token para uso futuro
    try {
      localStorage.setItem(appState.authStorageKey, appState.accessToken);
    } catch (err) {
      console.warn('No fue posible guardar el token:', err);
    }

    updateAuthUIState(true);

    // Iniciar cámara y pantalla principal
    showScreen(domElements.screens.camera);
    if (!appState.isCameraInitialized) {
      setupCamera();
      appState.isCameraInitialized = true;
    }

    // Configurar Firebase para iPhone (ya debe estar configurado en la conexión)
    setupFirebaseForIphone();
  }
}

// Handler para error de autenticación
function handleAuthError(err) {
  console.error('Error en la autenticación:', err);
  updateCameraStatus('Falla en la autenticación', 'error');
  updateAuthUIState(false);
}

// Activar botones cuando las bibliotecas estén cargadas
function maybeEnableButtons() {
  const { googleAuthBtn } = domElements.iphone;
  const { loginBtn } = domElements.iphone;

  const librariesReady = appState.gapiInited && appState.gisInited;

  if (googleAuthBtn) googleAuthBtn.disabled = !librariesReady;
  if (loginBtn) loginBtn.disabled = !librariesReady;
}

// Actualizar estado visual de los botones de autenticación
function updateAuthUIState(isLoggedIn) {
  const { googleAuthBtn, loginBtn } = domElements.iphone;

  if (googleAuthBtn) {
    googleAuthBtn.classList.toggle('logged-in', isLoggedIn);
    googleAuthBtn.setAttribute('title', isLoggedIn ? 'Actualizar Autorización' : 'Iniciar con Google');
    googleAuthBtn.disabled = false;
  }

  if (loginBtn) {
    loginBtn.textContent = isLoggedIn ? 'Continuar como Cámara' : 'Iniciar Sesión con Google';
    loginBtn.classList.toggle('logged-in', isLoggedIn);
    loginBtn.disabled = false;
  }
}

// Configurar el botón de autenticación de Google
function setupGoogleAuth() {
  const { googleAuthBtn } = domElements.iphone;

  if (googleAuthBtn) {
    googleAuthBtn.disabled = true;
    googleAuthBtn.addEventListener('click', handleAuthClick);
  }
}

// Configurar botón de login
function setupLoginButton() {
  const { loginBtn } = domElements.iphone;

  if (loginBtn) {
    loginBtn.addEventListener('click', handleAuthClick);
  }
}

// Manejar el clic en el botón de autenticación
function handleAuthClick() {
  const { googleAuthBtn, loginBtn } = domElements.iphone;

  if (googleAuthBtn) googleAuthBtn.disabled = true;
  if (loginBtn) loginBtn.disabled = true;

  if (appState.accessToken) {
    // Si ya está autenticado, ir a la pantalla de la cámara
    showScreen(domElements.screens.camera);
    if (!appState.isCameraInitialized) {
      setupCamera();
      appState.isCameraInitialized = true;
    }

    // Configurar Firebase para iPhone
    setupFirebaseForIphone();
  } else {
    // Iniciar proceso de autenticación con prompt silencioso primero
    try {
      appState.tokenClient.requestAccessToken({ prompt: '' });
    } catch (err) {
      // Si falla con prompt silencioso, usar el prompt predeterminado
      console.log('Autenticación silenciosa falló, usando prompt explícito');
      appState.tokenClient.requestAccessToken({ prompt: 'consent' });
    }
  }
}

// NOVA FUNÇÃO: Visualização da área de captura
function updateCameraViewport() {
  const { camera } = domElements.iphone;
  if (!camera || !appState.mediaStream) return;

  // Criar ou obter o elemento de guia de visualização
  let viewportGuide = document.getElementById('viewport-guide');
  if (!viewportGuide) {
    viewportGuide = document.createElement('div');
    viewportGuide.id = 'viewport-guide';
    camera.parentElement.appendChild(viewportGuide);
  }

  // Calcular a proporção da tela e da imagem alvo
  const screenRatio = window.innerWidth / window.innerHeight;
  const targetRatio = TARGET_WIDTH / TARGET_HEIGHT; // 4:3

  // Calcular dimensões da guia para manter a proporção 4:3
  let guideWidth, guideHeight;
  if (screenRatio > targetRatio) {
    // Tela mais larga que a proporção alvo: altura máxima, largura proporcional
    guideHeight = window.innerHeight;
    guideWidth = guideHeight * targetRatio;
  } else {
    // Tela mais estreita que a proporção alvo: largura máxima, altura proporcional
    guideWidth = window.innerWidth;
    guideHeight = guideWidth / targetRatio;
  }

  // Posicionar a guia centralizada
  const leftOffset = (window.innerWidth - guideWidth) / 2;
  const topOffset = (window.innerHeight - guideHeight) / 2;

  // Aplicar estilos
  viewportGuide.style.position = 'absolute';
  viewportGuide.style.width = `${guideWidth}px`;
  viewportGuide.style.height = `${guideHeight}px`;
  viewportGuide.style.left = `${leftOffset}px`;
  viewportGuide.style.top = `${topOffset}px`;
  viewportGuide.style.border = '2px solid rgba(255,255,255,0.7)';
  viewportGuide.style.boxShadow = '0 0 0 2000px rgba(0,0,0,0.3)';
  viewportGuide.style.borderRadius = '8px';
  viewportGuide.style.pointerEvents = 'none';
  viewportGuide.style.zIndex = '15';

  // Adicionar texto informativo
  if (!document.getElementById('viewport-guide-text')) {
    const guideText = document.createElement('div');
    guideText.id = 'viewport-guide-text';
    guideText.textContent = "Área de captura";
    guideText.style.position = 'absolute';
    guideText.style.bottom = '10px';
    guideText.style.left = '50%';
    guideText.style.transform = 'translateX(-50%)';
    guideText.style.color = 'white';
    guideText.style.backgroundColor = 'rgba(0,0,0,0.5)';
    guideText.style.padding = '5px 10px';
    guideText.style.borderRadius = '12px';
    guideText.style.fontSize = '12px';
    viewportGuide.appendChild(guideText);
  }

  // Modificar o object-fit do vídeo para contain em vez de cover
  camera.style.objectFit = 'contain';
}

// Inicializar la cámara en modo horizontal con retry y feedback
async function setupCamera() {
  const maxAttempts = 3;
  let attempt = 0;

  while (attempt < maxAttempts) {
    attempt++;

    try {
      updateCameraStatus(`Configurando cámara (intento ${attempt})...`);

      // Primero inicie la cámara con configuraciones básicas
      let initialConstraints = {
        audio: false,
        video: {
          facingMode: "environment"
        }
      };

      // Solicitar acceso a la cámara con configuraciones básicas primero
      const stream = await navigator.mediaDevices.getUserMedia(initialConstraints);

      // Aplicar el stream al elemento de video
      domElements.iphone.camera.srcObject = stream;
      appState.mediaStream = stream;

      // Esperar la carga de los metadatos del video
      await new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error('Timeout al cargar metadatos del video'));
        }, 5000);

        domElements.iphone.camera.onloadedmetadata = () => {
          clearTimeout(timeoutId);
          resolve();
        };
      });

      // Esperar que el video comience a reproducirse
      await new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          // No rechazar, solo intentar continuar
          console.warn('Timeout al esperar que el video comience a reproducirse');
          resolve();
        }, 3000);

        domElements.iphone.camera.oncanplay = () => {
          clearTimeout(timeoutId);
          resolve();
        };
      });

      // Intentar aplicar configuraciones avanzadas
      await optimizeCameraSettings(stream);

      // Actualizar dimensiones del canvas
      updateCanvasDimensions();

      // CHAMADA PARA NOVA FUNÇÃO: Atualizar o viewport da câmera
      updateCameraViewport();

      updateCameraStatus('Cámara lista');
      appState.isCameraInitialized = true;
      return; // Éxito, salir de la función
    } catch (err) {
      console.error(`Error al inicializar cámara (intento ${attempt}):`, err);

      // Limpiar recurso si existe
      if (appState.mediaStream) {
        try {
          appState.mediaStream.getTracks().forEach(track => track.stop());
        } catch (e) {
          // Ignorar errores en la limpieza
        }
        appState.mediaStream = null;
      }

      // Si no es el último intento
      if (attempt < maxAttempts) {
        // Esperar un poco antes de intentar nuevamente
        await new Promise(resolve => setTimeout(resolve, 1000));
        updateCameraStatus('Intentando nuevamente...');
      } else {
        // Último intento falló, mostrar error
        updateCameraStatus('Error al acceder a la cámara: ' + err.message, 'error');

        // Solicitar al usuario verificar permisos
        setTimeout(() => {
          if (confirm('No fue posible acceder a la cámara. Verifique si otorgó permiso para el uso de la cámara e intente nuevamente.')) {
            // Intentar inicializar nuevamente si el usuario está de acuerdo
            setupCamera();
          }
        }, 1000);
      }
    }
  }
}

// Optimizar configuraciones de la cámara
async function optimizeCameraSettings(stream) {
  try {
    const videoTrack = stream.getVideoTracks()[0];

    if (videoTrack) {
      // En dispositivos iOS, esto puede fallar, pero lo intentamos de todos modos
      try {
        await videoTrack.applyConstraints({
          width: { ideal: TARGET_WIDTH },
          height: { ideal: TARGET_HEIGHT },
          frameRate: { ideal: 30 }
        });

        console.log('Aplicadas configuraciones avanzadas a la cámara');
      } catch (constraintErr) {
        console.warn('No fue posible aplicar configuraciones avanzadas:', constraintErr);
        // Continuar incluso con error
      }

      // Obtener configuraciones actuales de la cámara
      appState.currentVideoSettings = videoTrack.getSettings();
      console.log('Configuraciones actuales de la cámara:', appState.currentVideoSettings);

      // Intentar aplicar enfoque continuo y exposición automática
      if (!deviceDetection.isSafari) {
        const capabilities = videoTrack.getCapabilities();
        console.log('Capacidades de la cámara:', capabilities);

        if (capabilities) {
          const constraints = {};

          if (capabilities.focusMode && capabilities.focusMode.includes('continuous')) {
            constraints.focusMode = 'continuous';
          }

          if (capabilities.exposureMode && capabilities.exposureMode.includes('continuous')) {
            constraints.exposureMode = 'continuous';
          }

          if (Object.keys(constraints).length > 0) {
            try {
              await videoTrack.applyConstraints(constraints);
              appState.currentVideoSettings = videoTrack.getSettings();
              console.log('Configuraciones de enfoque y exposición aplicadas');
            } catch (e) {
              console.warn('Error al aplicar configuraciones de enfoque/exposición:', e);
            }
          }
        }
      }
    }
  } catch (err) {
    console.warn('Error al optimizar configuraciones de la cámara:', err);
    // Continuar incluso con error
  }
}

// Actualizar dimensiones del canvas basado en el video actual
function updateCanvasDimensions() {
  const { camera, canvas } = domElements.iphone;

  if (!camera || !camera.videoWidth || !camera.videoHeight || !canvas) return;

  // Asegurar que el canvas tenga las dimensiones objetivo para captura de alta calidad
  canvas.width = TARGET_WIDTH;
  canvas.height = TARGET_HEIGHT;

  // Verificar si las dimensiones del video son menores que el objetivo (posible limitación del dispositivo)
  if (camera.videoWidth < TARGET_WIDTH || camera.videoHeight < TARGET_HEIGHT) {
    console.warn(`Alerta: Dimensiones del video (${camera.videoWidth}x${camera.videoHeight}) son menores que el objetivo (${TARGET_WIDTH}x${TARGET_HEIGHT}). La calidad puede estar limitada por el hardware.`);
  }

  debugLog('Canvas configurado con dimensiones:', {
    width: canvas.width,
    height: canvas.height,
    videoWidth: camera.videoWidth,
    videoHeight: camera.videoHeight
  });
}

// Capturar imagen en alta calidad (4032x3024)
function captureHighQualityImage(sourceElement, codeNumber) {
  return new Promise((resolve, reject) => {
    try {
      const { canvas } = domElements.iphone;
      if (!canvas) {
        throw new Error('Canvas no disponible');
      }

      // Verificar disponibilidad del video y dimensiones
      const videoWidth = sourceElement.videoWidth;
      const videoHeight = sourceElement.videoHeight;

      if (!videoWidth || !videoHeight) {
        throw new Error('Dimensiones de video no disponibles');
      }

      console.log(`Capturando imagen del video con dimensiones: ${videoWidth}x${videoHeight}`);

      // Ajustar dimensiones del canvas para corresponder al objetivo
      canvas.width = TARGET_WIDTH;
      canvas.height = TARGET_HEIGHT;

      // Configurar canvas para máxima calidad
      const ctx = canvas.getContext('2d', {
        alpha: false,
        desynchronized: true,
        willReadFrequently: false
      });

      if (!ctx) {
        throw new Error('No fue posible obtener contexto del canvas');
      }

      // Importantes configuraciones de calidad
      ctx.imageSmoothingEnabled = false;
      ctx.imageSmoothingQuality = 'high';

      // Limpiar canvas antes de dibujar
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Calcular dimensiones preservando al máximo la resolución
      // Usar el máximo de la resolución disponible del video
      const sourceRatio = videoWidth / videoHeight;
      const targetRatio = TARGET_WIDTH / TARGET_HEIGHT;

      // Variables para el recorte
      let sx = 0, sy = 0, sw = videoWidth, sh = videoHeight;

      // Calcular el recorte con mayor precisión
      if (Math.abs(sourceRatio - targetRatio) > 0.001) {
        if (sourceRatio > targetRatio) {
          // Video es más ancho, recortar en los laterales
          sw = videoHeight * targetRatio;
          sx = Math.floor((videoWidth - sw) / 2);
        } else {
          // Video es más alto, recortar arriba/abajo
          sh = videoWidth / targetRatio;
          sy = Math.floor((videoHeight - sh) / 2);
        }
      }

      // Usar números enteros para evitar cálculos subpixel
      sx = Math.floor(sx);
      sy = Math.floor(sy);
      sw = Math.floor(sw);
      sh = Math.floor(sh);

      // Dibujar en el canvas, preservando la calidad máxima
      ctx.drawImage(
        sourceElement,
        sx, sy, sw, sh,
        0, 0, canvas.width, canvas.height
      );

      // === ADICIONAR IDH NO CANTO SUPERIOR ESQUERDO (DUAS LINHAS) ===
      if (codeNumber) {
        // Dividir o IDH em duas partes
        const idhString = String(codeNumber);
        const last5Digits = idhString.slice(-5); // Últimos 5 dígitos
        const firstDigits = idhString.slice(0, -5); // Primeiros dígitos (se existirem)

        // Tamanhos de fonte
        const fontSizeSmall = Math.floor(canvas.height * 0.02); // 2% para primeira linha (menor)
        const fontSizeLarge = Math.floor(canvas.height * 0.04); // 4% para segunda linha (maior - destaque)
        const padding = Math.floor(fontSizeLarge * 0.4);
        const lineSpacing = Math.floor(fontSizeSmall * 0.2); // Espaçamento entre linhas

        ctx.textBaseline = 'top';

        // Medir larguras dos textos
        let maxWidth = 0;
        let line1Width = 0;
        let line2Width = 0;

        // Primeira linha (primeiros dígitos - se existirem)
        if (firstDigits.length > 0) {
          ctx.font = `bold ${fontSizeSmall}px Arial, sans-serif`;
          line1Width = ctx.measureText(firstDigits).width;
          maxWidth = Math.max(maxWidth, line1Width);
        }

        // Segunda linha (últimos 5 dígitos - maior e em destaque)
        ctx.font = `bold ${fontSizeLarge}px Arial, sans-serif`;
        line2Width = ctx.measureText(last5Digits).width;
        maxWidth = Math.max(maxWidth, line2Width);

        // Calcular dimensões do retângulo
        const rectWidth = maxWidth + (padding * 2);
        const rectHeight = (firstDigits.length > 0 ? fontSizeSmall + lineSpacing : 0) + fontSizeLarge + (padding * 2);

        // Desenhar retângulo branco (bem colado no canto - sem margem)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)'; // Branco quase opaco
        ctx.fillRect(0, 0, rectWidth, rectHeight);

        // Desenhar textos pretos sobre o retângulo
        ctx.fillStyle = '#000000'; // Preto puro

        let currentY = padding;

        // Primeira linha (primeiros dígitos - menor e CENTRALIZADA)
        if (firstDigits.length > 0) {
          ctx.font = `bold ${fontSizeSmall}px Arial, sans-serif`;
          // Centralizar primeira linha em relação à largura do retângulo
          const line1X = padding + ((maxWidth - line1Width) / 2);
          ctx.fillText(firstDigits, line1X, currentY);
          currentY += fontSizeSmall + lineSpacing;
        }

        // Segunda linha (últimos 5 dígitos - maior e em destaque, CENTRALIZADA)
        ctx.font = `bold ${fontSizeLarge}px Arial, sans-serif`;
        // Centralizar segunda linha em relação à largura do retângulo
        const line2X = padding + ((maxWidth - line2Width) / 2);
        ctx.fillText(last5Digits, line2X, currentY);
      }
      // === FIM DO OVERLAY COM IDH ===

      // Definir un timeout para caso la conversión demore mucho
      const blobTimeout = setTimeout(() => {
        reject(new Error('Timeout al generar blob de la imagen'));
      }, 5000);

      // Capturar con calidad máxima
      canvas.toBlob(blob => {
        clearTimeout(blobTimeout);

        if (!blob) {
          reject(new Error('Falla al generar blob de la imagen'));
          return;
        }

        console.log(`Imagen capturada: ${blob.size} bytes`);
        resolve(blob);
      }, IMAGE_FORMAT, IMAGE_QUALITY);

    } catch (err) {
      console.error('Error al capturar imagen:', err);
      reject(err);
    }
  });
}

// Función principal de captura y upload con sistema de cola - MODIFICADO para versionamiento
async function captureAndUpload(codeNumber, overlayText, photoKey) {
  // Verificar si está logueado
  if (!appState.accessToken) {
    updateCameraStatus('Inicie sesión antes de capturar fotos', 'error');
    return;
  }

  // Verificar si la cámara está disponible
  if (!appState.mediaStream) {
    updateCameraStatus('Cámara no disponible', 'error');
    return;
  }

  try {
    // Actualizar status Firebase
    if (appState.firebaseRefs.status) {
      appState.firebaseRefs.status.update({
        photoStatus: 'capturing',
        captureTime: firebase.database.ServerValue.TIMESTAMP
      });
    }

    // Actualizar status de la foto específica
    if (appState.firebaseRefs.photos && photoKey) {
      appState.firebaseRefs.photos.child(photoKey).update({
        status: 'capturing',
        captureTime: firebase.database.ServerValue.TIMESTAMP
      });
    }

    // Mostrar mensaje simple
    updateCameraStatus(`Capturando: ${codeNumber}`);

    // Definir nombre del archivo con extensión basada en el formato
    const extension = IMAGE_FORMAT === 'image/png' ? '.png' : '.jpg';
    const fileName = `${codeNumber}${extension}`;

    console.log('Capturando imagen con nombre:', fileName);
    console.log('Overlay en imagen:', overlayText);

    // Capturar imagen en alta calidad
    // codeNumber = nombre del archivo (5 dígitos o completo según versión)
    // overlayText = IDH completo SIEMPRE para overlay en imagen
    const imageBlob = await captureHighQualityImage(domElements.iphone.camera, overlayText);

    // IMPORTANTE: Mostrar éxito inmediatamente después de capturar
    updateCameraStatus('¡Foto capturada con éxito!');

    // Notificar al tablet que puede continuar inmediatamente
    // Y mostrar el check verde en el tablet
    if (appState.firebaseRefs.status) {
      appState.firebaseRefs.status.update({
        photoStatus: 'captured', // Nuevo estado que indica que la foto fue tomada
        captureCompleteTime: firebase.database.ServerValue.TIMESTAMP,
        canContinue: true, // Flag explícito para indicar que puede continuar
        showSuccess: true // Flag para mostrar éxito inmediatamente
      });
    }

    // IMPORTANTE: Notificar tablet que foto está en cola, pero puede continuar
    // Esto resetea la pantalla del tablet inmediatamente
    notifyTabletCaptureComplete(codeNumber);

    // Permitir escaneo inmediato del siguiente código QR
    // El tablet puede continuar escaneando mientras las subidas ocurren en segundo plano
    if (domElements.iphone.scanOverlay) {
      setTimeout(() => {
        domElements.iphone.scanOverlay.classList.remove('detected');
        domElements.iphone.scanOverlay.classList.add('hidden');
      }, 300); // Reducido para acelerar UX
    }

    // Limpiar el input QR
    if (domElements.iphone.qrInput) {
      domElements.iphone.qrInput.value = '';
    }

    // Añadir a la cola
    const queueItem = {
      blob: imageBlob,
      fileName: fileName,
      codeNumber: codeNumber,
      photoKey: photoKey,
      timestamp: Date.now(),
      attempts: 0
    };

    appState.photoQueue.push(queueItem);

    // Actualizar status Firebase para cola - DESPUÉS de notificar éxito
    if (appState.firebaseRefs.photos && photoKey) {
      appState.firebaseRefs.photos.child(photoKey).update({
        status: 'queued',
        queuePosition: appState.photoQueue.length,
        queueTime: firebase.database.ServerValue.TIMESTAMP
      });
    }

    // Actualizar indicador de cola
    updateQueueStatusBadge();

    // Iniciar procesamiento de cola si no está activo
    if (!appState.isProcessingQueue) {
      // Pequeño delay para permitir que el UI responda primero
      setTimeout(() => {
        processPhotoQueue();
      }, 100);
    }

  } catch (err) {
    console.error('Error en la captura:', err);
    updateCameraStatus('Error al capturar: ' + (err.message || 'Falla desconocida'), 'error');

    // Actualizar status Firebase
    if (appState.firebaseRefs.status) {
      appState.firebaseRefs.status.update({
        photoStatus: 'error',
        errorMessage: err.message,
        errorTime: firebase.database.ServerValue.TIMESTAMP
      });
    }

    // Actualizar status de la foto específica
    if (appState.firebaseRefs.photos && photoKey) {
      appState.firebaseRefs.photos.child(photoKey).update({
        status: 'error',
        errorMessage: err.message,
        errorTime: firebase.database.ServerValue.TIMESTAMP
      });
    }
  }
}

// Función para notificar al tablet que puede continuar - con mejora visual
function notifyTabletCaptureComplete(codeNumber) {
  // Verificar conexión
  if (!appState.isConnectedToFirebase || !appState.firebaseRefs.status) {
    return;
  }

  // Hacer que el indicador de Drive sea más visible
  const { container } = domElements.driveStatus;
  if (container) {
    container.style.transform = 'scale(1.3)';
    container.style.opacity = '1';

    // Restaurar después de un tiempo
    setTimeout(() => {
      container.style.transform = '';
      container.style.opacity = '';
    }, 2000);
  }

  // Actualizar último código y permitir continuar
  // Importante: Aquí es donde se muestra el check verde en el tablet
  appState.firebaseRefs.status.update({
    lastQrCode: codeNumber,
    photoStatus: 'captured', // Estado especial: capturado pero en cola
    captureCompleteTime: firebase.database.ServerValue.TIMESTAMP,
    canContinue: true, // Flag explícito para indicar que puede continuar
    showSuccess: true // Mostrar éxito inmediatamente
  });
}

// Procesar cola de fotos
function processPhotoQueue() {
  // Si la cola está vacía, terminamos
  if (appState.photoQueue.length === 0) {
    appState.isProcessingQueue = false;
    updateQueueStatusBadge();
    return;
  }

  // Si ya estamos procesando, no hacer nada
  if (appState.isProcessingQueue) {
    return;
  }

  appState.isProcessingQueue = true;

  // Tomar el primer elemento de la cola
  const queueItem = appState.photoQueue[0];

  // Actualizar mensaje de status
  updateCameraStatus(`Subiendo en segundo plano: ${queueItem.codeNumber} (${appState.photoQueue.length} en cola)`);

  // Actualizar status de la foto específica
  if (appState.firebaseRefs.photos && queueItem.photoKey) {
    appState.firebaseRefs.photos.child(queueItem.photoKey).update({
      status: 'uploading',
      uploadStartTime: firebase.database.ServerValue.TIMESTAMP
    });
  }

  // Intentar subir
  uploadToDriveFromQueue(queueItem)
    .then(() => {
      // Eliminar de la cola
      appState.photoQueue.shift();

      // Actualizar badge de cola
      updateQueueStatusBadge();

      // Procesar siguiente elemento con un pequeño delay
      setTimeout(() => {
        appState.isProcessingQueue = false;
        processPhotoQueue();
      }, 500);
    })
    .catch(err => {
      console.error('Error al subir elemento de la cola:', err);

      // Incrementar intentos
      queueItem.attempts++;

      if (queueItem.attempts >= 3) {
        // Intentos máximos alcanzados, pasar al siguiente
        appState.photoQueue.shift();
        updateCameraStatus('La subida falló después de varios intentos', 'error');

        // Actualizar status de la foto específica
        if (appState.firebaseRefs.photos && queueItem.photoKey) {
          appState.firebaseRefs.photos.child(queueItem.photoKey).update({
            status: 'error',
            errorMessage: 'La subida falló después de varios intentos',
            errorTime: firebase.database.ServerValue.TIMESTAMP
          });
        }

        // Continuar con el siguiente
        setTimeout(() => {
          appState.isProcessingQueue = false;
          processPhotoQueue();
        }, 500);
      } else {
        // Reintentar con backoff exponencial
        const backoffDelay = Math.pow(2, queueItem.attempts) * 1000;
        updateCameraStatus(`Reintentando en segundo plano (${backoffDelay / 1000}s)...`, 'waiting');

        setTimeout(() => {
          appState.isProcessingQueue = false;
          processPhotoQueue();
        }, backoffDelay);
      }

      // Actualizar badge de cola
      updateQueueStatusBadge();
    });
}

// Subir a Drive desde la cola
async function uploadToDriveFromQueue(queueItem) {
  if (!appState.accessToken) {
    throw new Error('Por favor, inicie sesión primero');
  }

  try {
    // Intentar primer método de upload (multipart)
    try {
      const response = await uploadMultipart(queueItem.blob, {
        name: queueItem.fileName,
        mimeType: IMAGE_FORMAT,
        parents: [FOLDER_ID]
      });

      await handleSuccessfulUpload(response, queueItem.photoKey);
      return;
    } catch (err) {
      console.error(`Error en el método de upload principal:`, err);

      // Intentar método alternativo
      const response = await uploadWithFetch(queueItem.blob, {
        name: queueItem.fileName,
        mimeType: IMAGE_FORMAT,
        parents: [FOLDER_ID]
      });

      await handleSuccessfulUpload(response, queueItem.photoKey);
      return;
    }
  } catch (err) {
    console.error('Error en upload desde cola:', err);
    throw err;
  }
}

// Empty function that does nothing - replaces updateQueueStatusBadge
function updateQueueStatusBadge() {
  // This function intentionally left empty
  return; // Just return immediately
}

// Upload a Google Drive con backoff exponencial y retries
async function uploadToDrive(blob, filename, photoKey) {
  const maxRetries = 3;
  let retry = 0;
  let backoffDelay = 1000; // 1 segundo inicial

  while (retry <= maxRetries) {
    try {
      if (!appState.accessToken) {
        updateCameraStatus('Por favor, inicie sesión primero', 'error');
        return;
      }

      // Verificar tamaño de la imagen
      const blobSizeMB = blob.size / (1024 * 1024);
      console.log(`Tamaño de la imagen: ${blobSizeMB.toFixed(2)} MB`);

      if (blobSizeMB > 10) {
        updateCameraStatus(`Enviando imagen de ${blobSizeMB.toFixed(1)} MB...`);
      }

      // Garantizar nombre de archivo correcto
      const extension = IMAGE_FORMAT === 'image/png' ? '.png' : '.jpg';
      const fileNameWithExt = filename.endsWith(extension) ?
        filename :
        filename.replace(/\.[^/.]+$/, "") + extension;

      console.log('Iniciando upload con nombre:', fileNameWithExt);

      // Preparar metadatos del archivo
      const metadata = {
        name: fileNameWithExt,
        mimeType: IMAGE_FORMAT,
        parents: [FOLDER_ID]
      };

      // Intentar primer método de upload (multipart)
      try {
        const response = await uploadMultipart(blob, metadata);
        await handleSuccessfulUpload(response, photoKey);
        return; // Upload exitoso, salir de la función
      } catch (err) {
        console.error(`Error en el método de upload principal (intento ${retry + 1}):`, err);

        // Intentar método alternativo
        try {
          const response = await uploadWithFetch(blob, metadata);
          await handleSuccessfulUpload(response, photoKey);
          return; // Upload exitoso, salir de la función
        } catch (fetchErr) {
          console.error(`Error en el método de upload alternativo (intento ${retry + 1}):`, fetchErr);

          retry++;

          if (retry <= maxRetries) {
            // Backoff exponencial
            updateCameraStatus(`Intentando nuevamente en ${backoffDelay / 1000}s...`);
            await new Promise(resolve => setTimeout(resolve, backoffDelay));
            backoffDelay *= 2; // Dobla el tiempo de espera para el próximo intento
          } else {
            // Falló en todos los intentos
            throw new Error("Falla después de varios intentos de upload: " + (fetchErr.message || "Error desconocido"));
          }
        }
      }
    } catch (err) {
      if (retry >= maxRetries) {
        console.error('Error fatal en la operación de upload:', err);
        updateCameraStatus('Falla en el upload: ' + (err.message || 'Error desconocido'), 'error');

        // Actualizar Firebase con error
        if (appState.firebaseRefs.status) {
          appState.firebaseRefs.status.update({
            photoStatus: 'error',
            errorMessage: err.message || 'Error en la operación de upload',
            errorTime: firebase.database.ServerValue.TIMESTAMP
          });
        }

        // Actualizar status de la foto específica
        if (appState.firebaseRefs.photos && photoKey) {
          appState.firebaseRefs.photos.child(photoKey).update({
            status: 'error',
            errorMessage: err.message || 'Error en la operación de upload',
            errorTime: firebase.database.ServerValue.TIMESTAMP
          });
        }

        break; // Salir del loop después de actualizar status
      }

      retry++;
      backoffDelay *= 2;
    }
  }
}

// Método principal de upload para Drive vía multipart
async function uploadMultipart(blob, metadata) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(blob);

    reader.onloadend = async function () {
      try {
        // Remover encabezado del base64
        const base64Data = reader.result.split(',')[1];

        // Crear body multipart con nombre del archivo
        const body = createMultipartBody(metadata, base64Data);

        const response = await gapi.client.request({
          path: 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
          method: 'POST',
          headers: {
            'Authorization': 'Bearer ' + appState.accessToken,
            'Content-Type': 'multipart/related; boundary=boundary'
          },
          body: body
        });

        resolve(response);
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = function (error) {
      reject(new Error("Error al leer archivo: " + error));
    };
  });
}

// Método alternativo de upload para Drive vía fetch
async function uploadWithFetch(blob, metadata) {
  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', blob);

  const fetchResponse = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
    {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + appState.accessToken },
      body: form
    }
  );

  if (!fetchResponse.ok) {
    const errorData = await fetchResponse.json();
    throw new Error(errorData.error?.message || `Error HTTP: ${fetchResponse.status}`);
  }

  return await fetchResponse.json();
}

// Procesa upload exitoso
async function handleSuccessfulUpload(response, photoKey) {
  let fileId, fileName;

  // Extraer datos dependiendo del formato de la respuesta
  if (response.result) {
    fileId = response.result.id;
    fileName = response.result.name;
  } else {
    fileId = response.id;
    fileName = response.name;
  }

  console.log('Upload exitoso:', { fileId, fileName });

  // Actualizar Firebase con éxito
  if (appState.firebaseRefs.status) {
    appState.firebaseRefs.status.update({
      photoStatus: 'completed',
      completionTime: firebase.database.ServerValue.TIMESTAMP,
      driveFileId: fileId,
      driveFileName: fileName
    });
  }

  // Actualizar status de la foto específica
  if (appState.firebaseRefs.photos && photoKey) {
    appState.firebaseRefs.photos.child(photoKey).update({
      status: 'completed',
      completionTime: firebase.database.ServerValue.TIMESTAMP,
      driveFileId: fileId,
      driveFileName: fileName
    });
  }

  updateCameraStatus('¡Foto enviada con éxito!');

  // Esperar un poco para mostrar el status de éxito
  setTimeout(() => {
    // Limpiar input
    if (domElements.iphone.qrInput) {
      domElements.iphone.qrInput.value = '';
    }

    updateCameraStatus('Esperando próximo código');
  }, 1500);
}

// Crear cuerpo multipart para upload
function createMultipartBody(metadata, base64Data) {
  const boundary = 'boundary';
  let body = `--${boundary}\r\n`;
  body += 'Content-Type: application/json\r\n\r\n';
  body += JSON.stringify(metadata) + '\r\n';
  body += `--${boundary}\r\n`;
  body += `Content-Type: ${IMAGE_FORMAT}\r\n`;
  body += 'Content-Transfer-Encoding: base64\r\n\r\n';
  body += base64Data + '\r\n';
  body += `--${boundary}--`;

  return body;
}

// === ALERTA GIGANTE PARA IPHONE DESCONECTADO ===
function showIPhoneDisconnectedAlert() {
  // Remover alerta anterior se existir
  const existingAlert = document.getElementById('iphone-disconnected-alert');
  if (existingAlert) return; // Já está mostrando

  // Criar alerta gigante específico para iPhone
  const alert = document.createElement('div');
  alert.id = 'iphone-disconnected-alert';
  alert.innerHTML = `
    <div class="error-overlay">
      <div class="error-content">
        <div class="error-icon">📱</div>
        <h2>iPHONE DESCONECTADO</h2>
        <p>El iPhone se ha desconectado del sistema.</p>
        <p><strong>NO CONTINÚE ESCANEANDO</strong></p>
        <p>Las fotos NO se guardarán.</p>
        <div class="error-actions">
          <button onclick="window.location.reload()" class="reload-btn">
            🔄 RECARGAR Y RECONECTAR
          </button>
        </div>
      </div>
    </div>
  `;

  // CSS inline igual ao alerta de Firebase
  alert.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(183, 28, 28, 0.95);
    color: white;
    z-index: 99999;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: Arial, sans-serif;
  `;

  const content = alert.querySelector('.error-content');
  content.style.cssText = `
    text-align: center;
    background: rgba(0, 0, 0, 0.8);
    padding: 40px;
    border-radius: 20px;
    max-width: 500px;
    border: 3px solid #fff;
  `;

  const icon = alert.querySelector('.error-icon');
  icon.style.cssText = `
    font-size: 80px;
    margin-bottom: 20px;
    animation: shake 1s infinite;
  `;

  const h2 = alert.querySelector('h2');
  h2.style.cssText = `
    font-size: 32px;
    margin: 20px 0;
    color: #fff;
  `;

  const p = alert.querySelectorAll('p');
  p.forEach(para => {
    para.style.cssText = `
      font-size: 18px;
      margin: 15px 0;
      color: #fff;
    `;
  });

  const button = alert.querySelector('.reload-btn');
  button.style.cssText = `
    background: #fff;
    color: #B71C1C;
    border: none;
    padding: 15px 30px;
    font-size: 18px;
    font-weight: bold;
    border-radius: 10px;
    cursor: pointer;
    margin-top: 20px;
  `;

  // Adicionar animação de shake ao ícone
  const style = document.createElement('style');
  style.textContent = `
    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      25% { transform: translateX(-10px); }
      75% { transform: translateX(10px); }
    }
  `;
  document.head.appendChild(style);

  document.body.appendChild(alert);

  // TRAVAR o sistema - desabilitar input do tablet
  const tabletInput = document.getElementById('tablet-qr-input');
  if (tabletInput) {
    tabletInput.disabled = true;
    tabletInput.placeholder = 'iPHONE DESCONECTADO - NO ESCANEAR';
    tabletInput.style.backgroundColor = '#ffcccb'; // Fundo vermelho claro
  }
}