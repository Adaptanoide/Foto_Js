// === CONFIG Google API ===
const CLIENT_ID = '209622447692-eev27ais29mr9rn8o1jfjh9tc5budni4.apps.googleusercontent.com';
const FOLDER_ID = '1PoWXuFHe0-AXKLTbQlWu0NmEG3aC-ZxP';
const API_KEY = ''; // Agregue su API_KEY si es necesario
const SCOPES = 'https://www.googleapis.com/auth/drive.file';

// Configuraciones optimizadas para iPhone 11 en horizontal
const IMAGE_FORMAT = 'image/jpeg'; 
const IMAGE_QUALITY = 1.0; 
const TARGET_WIDTH = 4032;  
const TARGET_HEIGHT = 3024;
const TARGET_RATIO = TARGET_WIDTH / TARGET_HEIGHT;

// Configuraciones de captura y QR
const QR_SCAN_INTERVAL = 200;
const QR_CONFIRMATION_DELAY = 2000;
const PROCESSING_SIZE = 800;
const AUTO_CAPTURE_DELAY = 4000;

// Estado de la aplicación - centralizado para mayor control
const appState = {
  currentMode: null,
  sessionId: null,
  connectionCode: null,
  isConnected: false,
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
  
  // Autenticación
  tokenClient: null,
  accessToken: null,
  gapiInited: false,
  gisInited: false,
  authStorageKey: 'qrScanAuthToken'
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
    deviceSelection: document.getElementById('device-selection-screen'),
    tabletCode: document.getElementById('tablet-code-screen'),
    iphoneCode: document.getElementById('iphone-code-screen'),
    tablet: document.getElementById('tablet-screen'),
    login: document.getElementById('login-screen'),
    camera: document.getElementById('camera-screen')
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
  
  switch(level) {
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

// Inicialización - Con manejo de errores mejorado
window.addEventListener('DOMContentLoaded', () => {
  try {
    // Configuración de los listeners para botones
    setupDeviceSelectionButtons();
    
    // Configuración Firebase
    try {
      const { database, sessionsRef } = initFirebase();
      appState.firebaseRefs.sessions = sessionsRef;
      debugLog('Firebase inicializado con éxito');
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

// Modificação simplificada da função updateDriveStatus
function updateDriveStatus(state, message) {
  const { container, icon, text } = domElements.driveStatus;
  if (!container || !icon) return;
  
  // Eliminar todas las clases de estado
  icon.classList.remove('waiting', 'uploading', 'success', 'error');
  
  // Actualizar clase basada en el estado
  if (state) {
    icon.classList.add(state);
  }
  
  // Eliminar completamente el texto (siempre)
  if (text) text.textContent = '';
  
  // Aplicar estilos inline diretamente para garantir visibilidade
  container.style.display = 'flex';
  container.style.opacity = '1';
  container.style.zIndex = '1000';
  container.style.position = 'fixed';
  
  // Se o estado for 'success', aplicar estilos adicionais
  if (state === 'success') {
    icon.style.backgroundColor = 'white';
    // Cor verde mais forte e brilhante
    icon.style.color = '#00c853';
    
    // Mostrar o estado destacado
    container.classList.add('active');
    
    // Aumentar o tempo de exibição para 5 segundos
    setTimeout(() => {
      container.classList.remove('active');
    }, 5000);
  }
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
    debugLog('Firebase configurado para host tablet con código:', code);
  } catch (err) {
    debugLog('Error al configurar host tablet en Firebase:', err, 'error');
    updateDriveStatus('error');
    alert('Error al conectar al servicio. Por favor, intente nuevamente.');
  }
}

// Escuchar status del iPhone - Extraído para mejorar legibilidad
function setupIPhoneStatusListener() {
  const iphoneRef = appState.firebaseRefs.devices.child('iphone');
  iphoneRef.on('value', (snapshot) => {
    const iphoneData = snapshot.val();
    
    if (iphoneData && iphoneData.connected) {
      handleIPhoneConnected();
    } else {
      handleIPhoneDisconnected();
    }
  });
}

// Handler para iPhone conectado
function handleIPhoneConnected() {
  appState.isConnected = true;
  
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

// Handler para cambio en el status de la foto
// MODIFICADO: Limpieza inmediata después de completar la foto
function handlePhotoStatusChange(photoStatus) {
  switch(photoStatus) {
    case 'capturing':
      updateDriveStatus('waiting');
      break;
    case 'uploading':
      updateDriveStatus('uploading');
      break;
    case 'completed':
      updateDriveStatus('success');
      
      // Incrementar contador de fotos
      appState.photoCount++;
      if (domElements.tablet.photoCount) {
        domElements.tablet.photoCount.textContent = appState.photoCount;
      }
      
      // Resetear inmediatamente sin timeout
      resetTabletDisplay();
      if (domElements.tablet.qrInput) {
        domElements.tablet.qrInput.value = '';
        domElements.tablet.qrInput.focus();
      }
      break;
    case 'error':
      updateDriveStatus('error');
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
    // Extraer número completo y los últimos 5 dígitos  
    const { fullNumber, lastFiveDigits } = extractQRCodeData(qrText);
    
    if (fullNumber && lastFiveDigits) {
      // Mostrar los números
      displayQrResult(lastFiveDigits, fullNumber);
      appState.lastProcessedCode = lastFiveDigits;
      updateLastPhotoDisplay(lastFiveDigits);
      
      // Verificar conexión y notificar iPhone
      if (appState.isConnected) {
        // Dividir el QR en partes para mantener la compatibilidad con el código anterior
        const parts = qrText.split(';');
        notifyIphoneToCapture(lastFiveDigits, parts.join(' | '));
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

// Función de extracción de datos del QR code - separada para mejorar legibilidad y mantenimiento
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
  
  // Verificar si el número tiene al menos 5 dígitos
  if (fullNumber.length < 5) {
    throw new Error("El número extraído es muy corto");
  }
  
  // Extraer los últimos 5 dígitos
  const lastFiveDigits = fullNumber.slice(-5);
  
  // Verificar si tenemos 5 dígitos numéricos
  if (!/^\d{5}$/.test(lastFiveDigits)) {
    // Intentar limpiar caracteres no numéricos
    const cleanedDigits = lastFiveDigits.replace(/\D/g, '');
    if (cleanedDigits.length === 5) {
      return { fullNumber, lastFiveDigits: cleanedDigits };
    }
    throw new Error("Los 5 últimos caracteres no son todos dígitos");
  }
  
  return { fullNumber, lastFiveDigits };
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

// Notificar iPhone para capturar foto - Con timeout y retry
function notifyIphoneToCapture(codeNumber, additionalInfo) {
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
    code: codeNumber,
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
        // Capturar la foto
        captureAndUpload(photoData.code, snapshot.key);
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
  
  debugLog('Desconectado de Firebase');
}

// Configurar modo tablet - con detección de Enter mejorada
function setupTabletMode() {
  // Agregar listener para tecla Enter (muchos scanners QR envían Enter después de la lectura)
  document.addEventListener('keydown', function(e) {
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
      showSuccessIcon();
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
      appState.tokenClient.requestAccessToken({prompt: ''});
    } catch (err) {
      // Si falla con prompt silencioso, usar el prompt predeterminado
      console.log('Autenticación silenciosa falló, usando prompt explícito');
      appState.tokenClient.requestAccessToken({prompt: 'consent'});
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
function captureHighQualityImage(sourceElement) {
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

// Función principal de captura y upload con retry automatizado
async function captureAndUpload(codeNumber, photoKey) {
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
  
  const maxRetries = 2;
  let attempt = 0;
  
  while (attempt <= maxRetries) {
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
      
      // Capturar imagen en alta calidad
      const imageBlob = await captureHighQualityImage(domElements.iphone.camera);
      
      // Mostrar mensaje de captura
      updateCameraStatus('Enviando a Drive...');
      
      // Actualizar status Firebase
      if (appState.firebaseRefs.status) {
        appState.firebaseRefs.status.update({
          photoStatus: 'uploading',
          uploadStartTime: firebase.database.ServerValue.TIMESTAMP
        });
      }
      
      // Actualizar status de la foto específica
      if (appState.firebaseRefs.photos && photoKey) {
        appState.firebaseRefs.photos.child(photoKey).update({
          status: 'uploading',
          uploadStartTime: firebase.database.ServerValue.TIMESTAMP
        });
      }
      
      // Enviar a Google Drive
      await uploadToDrive(imageBlob, fileName, photoKey);
      
      // Si llegamos aquí, éxito!
      break;
    } catch (err) {
      attempt++;
      console.error(`Error en la captura (intento ${attempt}/${maxRetries+1}):`, err);
      
      if (attempt <= maxRetries) {
        // Intentar nuevamente después de una pequeña pausa
        updateCameraStatus(`Intentando nuevamente (${attempt}/${maxRetries})...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      } else {
        // Desistir después de todos los intentos
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
  }
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
            updateCameraStatus(`Intentando nuevamente en ${backoffDelay/1000}s...`);
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
    
    reader.onloadend = async function() {
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
    
    reader.onerror = function(error) {
      reject(new Error("Error al leer archivo: " + error));
    };
  });
}

// Método alternativo de upload para Drive vía fetch
async function uploadWithFetch(blob, metadata) {
  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], {type: 'application/json'}));
  form.append('file', blob);
  
  const fetchResponse = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
    {
      method: 'POST',
      headers: {'Authorization': 'Bearer ' + appState.accessToken},
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

function showSuccessIcon() {
  // Remover qualquer ícone existente primeiro
  const oldIcon = document.getElementById('custom-success-icon');
  if (oldIcon) oldIcon.remove();
  
  // Criar um novo elemento independente
  const successIcon = document.createElement('div');
  successIcon.id = 'custom-success-icon';
  
  // Estilizar o elemento para ser bem visível
  Object.assign(successIcon.style, {
    position: 'fixed',
    top: '20px',
    right: '20px',
    zIndex: '9999',
    backgroundColor: '#4CAF50',
    color: 'white',
    width: '50px',
    height: '50px',
    borderRadius: '50%',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    fontSize: '24px',
    fontWeight: 'bold',
    boxShadow: '0 2px 10px rgba(0,0,0,0.3)'
  });
  
  // Adicionar um símbolo de check
  successIcon.innerHTML = '✓';
  
  // Adicionar ao body
  document.body.appendChild(successIcon);
  
  // Remover após 10 segundos
  setTimeout(() => {
    if (successIcon.parentNode) {
      successIcon.parentNode.removeChild(successIcon);
    }
  }, 10000);
}