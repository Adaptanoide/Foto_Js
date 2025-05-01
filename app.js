// === CONFIG Google API ===
const CLIENT_ID = '209622447692-eev27ais29mr9rn8o1jfjh9tc5budni4.apps.googleusercontent.com';
const FOLDER_ID = '1PoWXuFHe0-AXKLTbQlWu0NmEG3aC-ZxP';
const API_KEY = ''; // Adicione sua API_KEY se necessário
const SCOPES = 'https://www.googleapis.com/auth/drive.file';

// Configurações otimizadas para iPhone 11 na horizontal
const IMAGE_FORMAT = 'image/jpeg'; 
const IMAGE_QUALITY = 1.0; 
const TARGET_WIDTH = 4032;  
const TARGET_HEIGHT = 3024;
const TARGET_RATIO = TARGET_WIDTH / TARGET_HEIGHT;

// Configurações da captura e QR
const QR_SCAN_INTERVAL = 200;
const QR_CONFIRMATION_DELAY = 2000;
const PROCESSING_SIZE = 800;
const AUTO_CAPTURE_DELAY = 2000;

// Estado da aplicação - centralizado para maior controle
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
  
  // Autenticação
  tokenClient: null,
  accessToken: null,
  gapiInited: false,
  gisInited: false,
  authStorageKey: 'qrScanAuthToken'
};

// Detectar dispositivo - com detecção mais confiável
const deviceDetection = {
  isIOS: /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream,
  isSafari: false, // Será definido abaixo
  isTablet: /iPad/.test(navigator.userAgent) || (navigator.maxTouchPoints > 0 && window.innerWidth > 768)
};
deviceDetection.isSafari = deviceDetection.isIOS && 
  /AppleWebKit/.test(navigator.userAgent) && 
  !/Chrome/.test(navigator.userAgent);

// Modo debug (desativado para produção)
const DEBUG_MODE = false;

// Agrupando todos os elementos DOM por contexto
const domElements = {
  // Telas
  screens: {
    deviceSelection: document.getElementById('device-selection-screen'),
    tabletCode: document.getElementById('tablet-code-screen'),
    iphoneCode: document.getElementById('iphone-code-screen'),
    tablet: document.getElementById('tablet-screen'),
    login: document.getElementById('login-screen'),
    camera: document.getElementById('camera-screen')
  },
  
  // Seleção de dispositivo
  deviceSelection: {
    tabletButton: document.getElementById('tablet-select-btn'),
    iphoneButton: document.getElementById('iphone-select-btn')
  },
  
  // Tela de código Tablet
  tabletCode: {
    codeDisplay: document.getElementById('connection-code'),
    connectionStatus: document.getElementById('tablet-connection-status'),
    generateNewCodeBtn: document.getElementById('generate-new-code-btn'),
    backBtn: document.getElementById('tablet-code-back-btn')
  },
  
  // Tela de código iPhone
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

// Logs de debug - Melhorado para suportar diferentes níveis
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

// Inicialização - Com tratamento de erros aprimorado
window.addEventListener('DOMContentLoaded', () => {
  try {
    // Setup dos listeners para botões
    setupDeviceSelectionButtons();
    
    // Setup Firebase
    try {
      const { database, sessionsRef } = initFirebase();
      appState.firebaseRefs.sessions = sessionsRef;
      debugLog('Firebase inicializado com sucesso');
    } catch (err) {
      console.error('Erro ao inicializar Firebase:', err);
      updateDriveStatus('error');
      // Continuar mesmo com erro no Firebase, apenas com funcionalidade limitada
    }
    
    // Carregar bibliotecas Google
    loadGoogleLibraries();
    
    // Verificar e configurar orientação
    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);
    
    // Setup para modo tablet
    setupTabletMode();
    
    // Tentar restaurar sessão anterior
    tryRestoreAuthSession();
    
    debugLog('Aplicação inicializada com sucesso');
  } catch (err) {
    console.error('Erro fatal na inicialização:', err);
    // Exibir mensagem amigável para o usuário em vez de falhar silenciosamente
    alert('Ocorreu um erro ao inicializar o aplicativo. Por favor, recarregue a página.');
  }
});

// Tentar restaurar sessão de autenticação anterior - com catch aprimorado
function tryRestoreAuthSession() {
  try {
    const savedToken = localStorage.getItem(appState.authStorageKey);
    if (savedToken) {
      appState.accessToken = savedToken;
      debugLog('Token de autenticação restaurado do armazenamento local');
    }
  } catch (err) {
    debugLog('Erro ao restaurar sessão:', err, 'warn');
    // Limpar qualquer token possivelmente corrompido
    try {
      localStorage.removeItem(appState.authStorageKey);
    } catch (e) {
      // Falha silenciosa apenas para limpeza de token
    }
  }
}

// Gerar código de conexão aleatório - com tamanho padrão de 3 dígitos
function generateConnectionCode() {
  return Math.floor(Math.random() * 900 + 100).toString();
}

// Configurar botões da tela de seleção de dispositivo
function setupDeviceSelectionButtons() {
  const { tabletButton, iphoneButton } = domElements.deviceSelection;
  
  // Botão "Tablet"
  if (tabletButton) {
    tabletButton.addEventListener('click', () => {
      appState.currentMode = 'tablet';
      
      // Gerar um novo código de conexão
      appState.connectionCode = generateConnectionCode();
      
      // Exibir o código
      if (domElements.tabletCode.codeDisplay) {
        domElements.tabletCode.codeDisplay.textContent = appState.connectionCode;
      }
      
      // Registrar no Firebase como um host
      setupFirebaseForTabletHost(appState.connectionCode);
      
      // Mostrar a tela de código do tablet
      showScreen(domElements.screens.tabletCode);
    });
  }

  // Botão "iPhone"
  if (iphoneButton) {
    iphoneButton.addEventListener('click', () => {
      appState.currentMode = 'iphone';
      showScreen(domElements.screens.iphoneCode);
      
      // Focar no campo de entrada
      if (domElements.iphoneCode.codeInput) {
        domElements.iphoneCode.codeInput.focus();
      }
    });
  }
  
  // Botão "Gerar Novo Código" na tela do tablet
  if (domElements.tabletCode.generateNewCodeBtn) {
    domElements.tabletCode.generateNewCodeBtn.addEventListener('click', () => {
      // Desconectar da sessão anterior
      if (appState.isConnectedToFirebase) {
        disconnectFromFirebase();
      }
      
      // Gerar novo código
      appState.connectionCode = generateConnectionCode();
      
      // Exibir o novo código
      if (domElements.tabletCode.codeDisplay) {
        domElements.tabletCode.codeDisplay.textContent = appState.connectionCode;
      }
      
      // Registrar novo código no Firebase
      setupFirebaseForTabletHost(appState.connectionCode);
      
      updateDriveStatus('ready');
    });
  }
  
  // Botão "Voltar" na tela de código do tablet
  if (domElements.tabletCode.backBtn) {
    domElements.tabletCode.backBtn.addEventListener('click', () => {
      disconnectFromFirebase();
      appState.currentMode = null;
      showScreen(domElements.screens.deviceSelection);
    });
  }
  
  // Botão "Desconectar" na tela principal do tablet
  if (domElements.tablet.disconnectBtn) {
    domElements.tablet.disconnectBtn.addEventListener('click', () => {
      disconnectFromFirebase();
      appState.currentMode = null;
      showScreen(domElements.screens.deviceSelection);
    });
  }

  // Botão "Conectar" na tela de código do iPhone
  if (domElements.iphoneCode.connectBtn) {
    domElements.iphoneCode.connectBtn.addEventListener('click', handleConnectButtonClick);
  }
  
  // Campo de entrada de código no iPhone - permitir Enter
  if (domElements.iphoneCode.codeInput) {
    domElements.iphoneCode.codeInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        handleConnectButtonClick();
      }
    });
  }
  
  // Botão "Voltar" na tela de código do iPhone
  if (domElements.iphoneCode.backBtn) {
    domElements.iphoneCode.backBtn.addEventListener('click', () => {
      appState.currentMode = null;
      showScreen(domElements.screens.deviceSelection);
    });
  }
  
  // Botão "Desconectar" na tela de login do iPhone
  if (domElements.iphone.disconnectBtn) {
    domElements.iphone.disconnectBtn.addEventListener('click', () => {
      disconnectFromFirebase();
      appState.currentMode = null;
      showScreen(domElements.screens.deviceSelection);
    });
  }
  
  // Botões de ação no modo tablet
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

// Função para validar e conectar (extraída para melhorar legibilidade)
function handleConnectButtonClick() {
  const enteredCode = domElements.iphoneCode.codeInput.value.trim();
  
  if (enteredCode.length !== 3) {
    showCodeError('Por favor, digite o código de 3 dígitos');
    return;
  }
  
  if (!/^\d{3}$/.test(enteredCode)) {
    showCodeError('O código deve conter apenas 3 dígitos numéricos');
    return;
  }
  
  // Verificar se o código existe no Firebase
  connectToTablet(enteredCode);
}

// Atualizar status do indicador de Drive - Simplificado
function updateDriveStatus(state, message) {
  const { container, icon, text } = domElements.driveStatus;
  if (!container || !icon) return;
  
  // Remover todas as classes de estado
  icon.classList.remove('waiting', 'uploading', 'success', 'error');
  
  // Atualizar classe baseada no estado
  if (state) {
    icon.classList.add(state);
  }
  
  // Remover completamente o texto (sempre)
  if (text) text.textContent = '';
  
  // Mostrar o status em destaque
  container.classList.add('active');
  
  // Reduzir a opacidade após alguns segundos se for sucesso
  if (state === 'success') {
    setTimeout(() => {
      container.classList.remove('active');
    }, 3000);
  }
}

// Mostrar erro na tela de entrada de código
function showCodeError(message) {
  const { errorMessage, codeInput } = domElements.iphoneCode;
  
  if (errorMessage) {
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
    
    // Agitar o campo de entrada
    if (codeInput) {
      codeInput.classList.add('shake');
      setTimeout(() => {
        codeInput.classList.remove('shake');
      }, 500);
    }
  }
}

// Esconder erro na tela de entrada de código
function hideCodeError() {
  const { errorMessage } = domElements.iphoneCode;
  
  if (errorMessage) {
    errorMessage.style.display = 'none';
  }
}

// Exibir uma determinada tela e ocultar as demais
function showScreen(screenElement) {
  // Obter todas as telas do objeto domElements.screens
  const screens = Object.values(domElements.screens);
  
  // Ocultar todas as telas
  screens.forEach(screen => {
    if (screen) screen.style.display = 'none';
  });
  
  // Exibir a tela solicitada
  if (screenElement) {
    screenElement.style.display = 'flex';
    
    // Focar no input do tablet automaticamente
    if (screenElement === domElements.screens.tablet && domElements.tablet.qrInput) {
      setTimeout(() => domElements.tablet.qrInput.focus(), 300);
    }
  }
}

// Verificar e ajustar orientação do dispositivo
function checkOrientation() {
  if (window.matchMedia("(orientation: portrait)").matches && appState.currentMode === 'iphone') {
    // Estamos em portrait - solicitar ao usuário rotacionar para landscape
    document.body.classList.add('portrait-warning');
    debugLog('Dispositivo em modo retrato - solicitando rotação');
  } else {
    // Estamos em landscape ou em modo tablet
    document.body.classList.remove('portrait-warning');
  }
}

// Configurar Firebase para modo tablet (host) - com melhor tratamento de erros
function setupFirebaseForTabletHost(code) {
  if (!firebase || !appState.firebaseRefs.sessions) {
    updateDriveStatus('error');
    debugLog('Firebase não inicializado', null, 'error');
    return;
  }
  
  try {
    // Desconectar de qualquer sessão anterior
    if (appState.isConnectedToFirebase) {
      disconnectFromFirebase();
    }
    
    // Configurar referências Firebase para o código de conexão
    const sessionRef = appState.firebaseRefs.sessions.child(code);
    appState.firebaseRefs.currentSession = sessionRef;
    appState.firebaseRefs.photos = sessionRef.child('photos');
    appState.firebaseRefs.status = sessionRef.child('status');
    appState.firebaseRefs.devices = sessionRef.child('devices');
    
    // Inicializar os dados da sessão com timestamp do servidor
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
    
    // Configurar desconexão
    tabletRef.onDisconnect().update({
      connected: false,
      lastSeen: firebase.database.ServerValue.TIMESTAMP
    });
    
    // Escutar status do iPhone
    setupIPhoneStatusListener();
    
    // Escutar status das fotos
    setupPhotoStatusListener();
    
    // Configurar input para leitura do scanner físico
    setupTabletQRInputListener();
    
    appState.isConnectedToFirebase = true;
    debugLog('Firebase configurado para host tablet com código:', code);
  } catch (err) {
    debugLog('Erro ao configurar host tablet no Firebase:', err, 'error');
    updateDriveStatus('error');
    alert('Erro ao conectar ao serviço. Por favor, tente novamente.');
  }
}

// Escutar status do iPhone - Extraído para melhorar legibilidade
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
  
  // Atualizar status de conexão
  if (domElements.tabletCode.connectionStatus) {
    domElements.tabletCode.connectionStatus.innerHTML = `
      <div class="status-indicator connected"></div>
      <span>iPhone conectado! Iniciando...</span>
    `;
  }
  
  if (domElements.tablet.iphoneStatus) {
    domElements.tablet.iphoneStatus.textContent = 'iPhone conectado';
    domElements.tablet.iphoneStatus.classList.add('connected');
    
    // Modificar a cor da bolinha
    const statusDot = document.querySelector('.connection-status-badge .status-dot');
    if (statusDot) {
      statusDot.classList.add('connected');
    }
  }
  
  // Em 2 segundos, se ainda estiver na tela de código, ir para a tela principal
  setTimeout(() => {
    if (appState.isConnected && domElements.screens.tabletCode.style.display !== 'none') {
      showScreen(domElements.screens.tablet);
      
      // Exibir o código de conexão na tela principal também
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
      <span>Aguardando conexão do iPhone...</span>
    `;
  }
  
  if (domElements.tablet.iphoneStatus) {
    domElements.tablet.iphoneStatus.textContent = 'iPhone desconectado';
    domElements.tablet.iphoneStatus.classList.remove('connected');
    
    // Revertendo a cor da bolinha
    const statusDot = document.querySelector('.connection-status-badge .status-dot');
    if (statusDot) {
      statusDot.classList.remove('connected');
    }
  }
  
  updateDriveStatus('error');
}

// Escutar status das fotos - Extraído para melhorar legibilidade
function setupPhotoStatusListener() {
  appState.firebaseRefs.status.on('value', (snapshot) => {
    const status = snapshot.val();
    
    if (status && status.photoStatus) {
      handlePhotoStatusChange(status.photoStatus);
    }
  });
}

// Handler para mudança no status da foto
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
      
      // Resetar após alguns segundos
      setTimeout(() => {
        resetTabletDisplay();
        if (domElements.tablet.qrInput) {
          domElements.tablet.qrInput.value = '';
          domElements.tablet.qrInput.focus();
        }
      }, 3000);
      break;
    case 'error':
      updateDriveStatus('error');
      break;
  }
}

// Configurar listener para o input de QR no tablet
function setupTabletQRInputListener() {
  const { qrInput } = domElements.tablet;
  
  if (qrInput) {
    qrInput.addEventListener('input', handleTabletQrInput);
    qrInput.addEventListener('keydown', (e) => {
      // Capturar Enter do scanner
      if (e.key === 'Enter') {
        const qrText = qrInput.value.trim();
        if (qrText.length > 0) {
          processTabletQrCode(qrText);
        }
      }
    });
  }
}

// Tentar conectar ao tablet com o código informado
function connectToTablet(code) {
  if (!firebase || !appState.firebaseRefs.sessions) {
    updateCameraStatus('Erro ao conectar com o serviço de sincronização', 'error');
    return;
  }
  
  try {
    // Verificar se o código existe
    const sessionRef = appState.firebaseRefs.sessions.child(code);
    
    sessionRef.once('value')
      .then((snapshot) => {
        const sessionData = snapshot.val();
        
        if (!sessionData) {
          showCodeError('Código inválido ou expirado');
          return;
        }
        
        // Código existe, armazenar e conectar
        appState.connectionCode = code;
        
        // Configurar referências Firebase
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
        
        // Configurar desconexão
        iphoneRef.onDisconnect().update({
          connected: false,
          lastSeen: firebase.database.ServerValue.TIMESTAMP
        });
        
        appState.isConnectedToFirebase = true;
        
        // Esconder erro se houver
        hideCodeError();
        
        // Atualizar timestamp de última atividade
        sessionRef.update({
          lastActivity: firebase.database.ServerValue.TIMESTAMP
        });
        
        // Ir para a tela de login
        showScreen(domElements.screens.login);
        
        // Exibir o código na tela de login
        if (domElements.iphone.loginSessionDisplay) {
          domElements.iphone.loginSessionDisplay.textContent = appState.connectionCode;
        }
        
        // Configurar autenticação Google
        setupGoogleAuth();
        setupLoginButton();
        updateAuthUIState(appState.accessToken ? true : false);
        
        debugLog('Conectado ao tablet com código:', appState.connectionCode);
      })
      .catch((error) => {
        console.error('Erro ao verificar código:', error);
        showCodeError('Erro ao verificar código, tente novamente');
      });
  } catch (error) {
    console.error('Erro fatal ao conectar:', error);
    showCodeError('Erro de conexão. Por favor, tente novamente.');
  }
}

// Processar código QR lido no tablet - Simplificado e mais robusto
function processTabletQrCode(qrText) {
  if (!qrText || appState.isProcessingQR) return;
  
  appState.isProcessingQR = true;
  debugLog('Processando QR code no tablet:', qrText);
  
  try {
    // Extrair número completo e os últimos 5 dígitos  
    const { fullNumber, lastFiveDigits } = extractQRCodeData(qrText);
    
    if (fullNumber && lastFiveDigits) {
      // Exibir os números
      displayQrResult(lastFiveDigits, fullNumber);
      appState.lastProcessedCode = lastFiveDigits;
      updateLastPhotoDisplay(lastFiveDigits);
      
      // Verificar conexão e notificar iPhone
      if (appState.isConnected) {
        // Dividir o QR em partes para manter a compatibilidade com o código anterior
        const parts = qrText.split(';');
        notifyIphoneToCapture(lastFiveDigits, parts.join(' | '));
      } else {
        updateDriveStatus('error');
        appState.isProcessingQR = false;
      }
    } else {
      throw new Error("Não foi possível extrair os dados necessários do QR code");
    }
  } catch (error) {
    console.error("Erro na extração do código:", error);
    updateDriveStatus('error');
    appState.isProcessingQR = false;
    
    // Limpar e focar novamente no input
    if (domElements.tablet.qrInput) {
      domElements.tablet.qrInput.value = '';
      domElements.tablet.qrInput.focus();
    }
  }
}

// Função de extração de dados do QR code - separada para melhorar legibilidade e manutenção
function extractQRCodeData(qrText) {
  // Verificar se temos um QR válido com formato esperado
  if (!qrText || !qrText.includes(';')) {
    throw new Error("QR Code inválido ou no formato incorreto");
  }
  
  // Dividir o QR em partes
  const parts = qrText.split(';').map(part => part.trim());
  
  // Verificar se temos pelo menos 4 partes
  if (parts.length < 4) {
    throw new Error("QR Code não possui o formato esperado");
  }
  
  // Extrair o campo na posição 4 (índice 3)
  let fullNumber = parts[3];
  
  // Verificar se o campo é undefined ou null
  if (fullNumber === undefined || fullNumber === null) {
    // Tentar uma abordagem alternativa
    const matches = qrText.match(/;([^;]+);/g);
    if (matches && matches.length >= 2) {
      fullNumber = matches[1].replace(/;/g, '').trim();
    } else {
      throw new Error("Não foi possível extrair o campo necessário");
    }
  }
  
  // Verificar se o número existe
  if (!fullNumber) {
    throw new Error("Campo extraído está vazio");
  }
  
  // Garantir que estamos trabalhando com string e remover espaços
  fullNumber = String(fullNumber).trim();
  
  // Verificar se o número tem pelo menos 5 dígitos
  if (fullNumber.length < 5) {
    throw new Error("Número extraído é muito curto");
  }
  
  // Extrair os últimos 5 dígitos
  const lastFiveDigits = fullNumber.slice(-5);
  
  // Verificar se temos 5 dígitos numéricos
  if (!/^\d{5}$/.test(lastFiveDigits)) {
    // Tentar limpar caracteres não numéricos
    const cleanedDigits = lastFiveDigits.replace(/\D/g, '');
    if (cleanedDigits.length === 5) {
      return { fullNumber, lastFiveDigits: cleanedDigits };
    }
    throw new Error("Os 5 últimos caracteres não são todos dígitos");
  }
  
  return { fullNumber, lastFiveDigits };
}

// Exibir resultado do QR no tablet
function displayQrResult(mainNumber, fullNumber) {
  const { qrMainNumber, qrSecondaryInfo } = domElements.tablet;
  
  if (qrMainNumber) {
    qrMainNumber.textContent = mainNumber;
  }
  
  if (qrSecondaryInfo) {
    qrSecondaryInfo.textContent = fullNumber;
    
    // Remover qualquer classe de estado anterior
    qrSecondaryInfo.classList.remove('waiting');
  }
  
  // Atualizar status de forma mais discreta
  updateDriveStatus('waiting');
}

// Notificar iPhone para capturar foto - Com timeout e retry
function notifyIphoneToCapture(codeNumber, additionalInfo) {
  if (!appState.isConnectedToFirebase || !appState.firebaseRefs.photos) {
    updateDriveStatus('error');
    appState.isProcessingQR = false;
    return;
  }
  
  // Verifica novamente se o iPhone está conectado
  if (!appState.isConnected) {
    updateDriveStatus('error');
    appState.isProcessingQR = false;
    return;
  }
  
  // Criar um novo nó para a foto
  const newPhotoRef = appState.firebaseRefs.photos.push();
  
  // Dados para a foto
  const photoData = {
    code: codeNumber,
    additionalInfo: additionalInfo || '',
    requestTime: firebase.database.ServerValue.TIMESTAMP,
    status: 'requested'
  };
  
  // Salvar os dados com timeout e retry
  const maxRetries = 3;
  let currentRetry = 0;
  
  function attemptSave() {
    newPhotoRef.set(photoData)
      .then(() => {
        debugLog('Solicitação de foto enviada para o iPhone:', photoData);
        updateDriveStatus('waiting');
        
        // Atualizar status
        return appState.firebaseRefs.status.update({
          lastQrCode: codeNumber,
          photoStatus: 'requested',
          requestTime: firebase.database.ServerValue.TIMESTAMP
        });
      })
      .catch(error => {
        currentRetry++;
        console.error(`Erro ao notificar iPhone (tentativa ${currentRetry}):`, error);
        
        if (currentRetry < maxRetries) {
          // Tentar novamente após um breve delay
          setTimeout(attemptSave, 1000);
        } else {
          updateDriveStatus('error');
          appState.isProcessingQR = false;
          
          // Mostrar mensagem de erro apropriada
          alert('Erro ao comunicar com o dispositivo de captura. Por favor, tente novamente.');
        }
      });
  }
  
  // Primeira tentativa
  attemptSave();
}

// Resetar display do tablet
function resetTabletDisplay() {
  const { qrMainNumber, qrSecondaryInfo } = domElements.tablet;
  
  if (qrMainNumber) {
    qrMainNumber.textContent = '-----';
  }
  
  if (qrSecondaryInfo) {
    qrSecondaryInfo.textContent = '---------';
    
    // Adicionar classe de estado de espera
    qrSecondaryInfo.classList.add('waiting');
  }
  
  updateDriveStatus('waiting');
  appState.isProcessingQR = false;
}

// Atualizar display da última foto
function updateLastPhotoDisplay(code) {
  if (domElements.tablet.lastPhotoCode && code) {
    domElements.tablet.lastPhotoCode.textContent = code;
    const parent = domElements.tablet.lastPhotoCode.parentElement;
    if (parent) {
      parent.style.display = 'inline-flex';
    }
  }
}

// Processar input de QR no tablet
function handleTabletQrInput(event) {
  // Se já estiver processando, ignorar
  if (appState.isProcessingQR) return;
  
  // Detectar fim da leitura (normalmente um scanner QR envia um Enter ao final)
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
    updateCameraStatus('Erro: Não está conectado ao tablet', 'error');
    return;
  }
  
  // Exibir o código na tela da câmera
  if (domElements.iphone.cameraSessionDisplay) {
    domElements.iphone.cameraSessionDisplay.textContent = appState.connectionCode;
  }
  
  // Escutar solicitações de fotos novas com tratamento de erros melhorado
  try {
    appState.firebaseRefs.photos
      .orderByChild('status')
      .equalTo('requested')
      .limitToLast(1)
      .on('child_added', handleNewPhotoRequest, handlePhotoRequestError);
    
    debugLog('Firebase configurado para modo iPhone com código:', appState.connectionCode);
  } catch (error) {
    console.error('Erro ao configurar escuta de solicitações de foto:', error);
    updateCameraStatus('Erro ao configurar conexão com o tablet', 'error');
  }
}

// Handler para novas solicitações de foto
function handleNewPhotoRequest(snapshot) {
  try {
    const photoData = snapshot.val();
  
    if (photoData && photoData.code) {
      debugLog('Nova solicitação de foto recebida:', photoData);
      
      // Exibir o código no input
      if (domElements.iphone.qrInput) {
        domElements.iphone.qrInput.value = photoData.code;
      }
      
      // Atualizar status
      updateCameraStatus(`Capturando: ${photoData.code}`);
      
      // Mostrar "detectado" no overlay
      if (domElements.iphone.scanOverlay) {
        domElements.iphone.scanOverlay.classList.remove('hidden');
        domElements.iphone.scanOverlay.classList.add('detected');
      }
      
      // Atualizar status da foto
      snapshot.ref.update({
        status: 'processing',
        processingStartTime: firebase.database.ServerValue.TIMESTAMP
      });
      
      appState.firebaseRefs.status.update({
        photoStatus: 'capturing',
        captureTime: firebase.database.ServerValue.TIMESTAMP
      });
      
      // Agendar captura automática
      setTimeout(() => {
        // Capturar a foto
        captureAndUpload(photoData.code, snapshot.key);
      }, AUTO_CAPTURE_DELAY);
    }
  } catch (error) {
    console.error('Erro ao processar solicitação de foto:', error);
    updateCameraStatus('Erro ao processar solicitação', 'error');
  }
}

// Handler para erro na escuta de solicitações de foto
function handlePhotoRequestError(error) {
  console.error('Erro na escuta de solicitações de foto:', error);
  updateCameraStatus('Erro de comunicação com o tablet', 'error');
}

// Atualizar status da câmera no iPhone - Versão modificada para texto mais discreto
function updateCameraStatus(message, type = 'success') {
  const { simpleStatusMessage } = domElements.iphone;
  
  // Atualizar mensagem simples
  if (simpleStatusMessage) {
    simpleStatusMessage.textContent = message;
    simpleStatusMessage.style.display = 'block';
    
    // Aplicar cor baseada no tipo
    simpleStatusMessage.classList.remove('error');
    if (type === 'error') {
      simpleStatusMessage.classList.add('error');
    }
    
    // Auto-esconder depois de alguns segundos se for uma mensagem de sucesso
    if (type === 'success') {
      setTimeout(() => {
        simpleStatusMessage.style.display = 'none';
      }, 3000);
    }
  }
}

// Desconectar do Firebase - com mecanismo de retry
function disconnectFromFirebase() {
  // Desconectar observadores
  if (appState.isConnectedToFirebase && appState.firebaseRefs.currentSession) {
    try {
      // Cancelar listeners
      if (appState.firebaseRefs.photos) appState.firebaseRefs.photos.off();
      if (appState.firebaseRefs.status) appState.firebaseRefs.status.off();
      if (appState.firebaseRefs.devices) appState.firebaseRefs.devices.off();
      
      // Registrar desconexão se estivermos em algum modo
      if (appState.currentMode === 'tablet' && appState.firebaseRefs.devices) {
        appState.firebaseRefs.devices.child('tablet').update({
          connected: false,
          lastSeen: firebase.database.ServerValue.TIMESTAMP
        }).catch(err => debugLog('Erro ao atualizar status tablet:', err, 'warn'));
      } else if (appState.currentMode === 'iphone' && appState.firebaseRefs.devices) {
        appState.firebaseRefs.devices.child('iphone').update({
          connected: false,
          lastSeen: firebase.database.ServerValue.TIMESTAMP
        }).catch(err => debugLog('Erro ao atualizar status iPhone:', err, 'warn'));
      }
      
      // Limpar referências
      appState.firebaseRefs.currentSession = null;
      appState.firebaseRefs.photos = null;
      appState.firebaseRefs.status = null;
      appState.firebaseRefs.devices = null;
    } catch (error) {
      debugLog('Erro ao desconectar do Firebase:', error, 'warn');
      // Continuar mesmo com erro
    }
  }
  
  appState.isConnectedToFirebase = false;
  appState.connectionCode = null;
  appState.isConnected = false;
  
  debugLog('Desconectado do Firebase');
}

// Configurar modo tablet - com detecção de Enter aprimorada
function setupTabletMode() {
  // Adicionar listener para tecla Enter (muitos scanners QR enviam Enter após a leitura)
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && 
        appState.currentMode === 'tablet' && 
        domElements.screens.tablet.style.display !== 'none' && 
        domElements.tablet.qrInput) {
      
      // Verificar se o foco já está no input para evitar duplicar a entrada
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
  
  // Esconder o overlay de status antigo
  if (statusOverlay) {
    statusOverlay.classList.add('hidden');
  }
  
  // Em vez disso, usar nossa mensagem simples
  if (simpleStatusMessage) {
    if (state === 'uploading') {
      updateCameraStatus('Enviando foto...');
    } else if (state === 'success') {
      updateCameraStatus('Foto enviada com sucesso!');
    } else if (state === 'error') {
      updateCameraStatus('Erro ao enviar foto', 'error');
    } else {
      simpleStatusMessage.style.display = 'none';
    }
  }
}

// Carregar bibliotecas Google - com timeout e tratamento de erro
function loadGoogleLibraries() {
  // Definir um timeout para fallback se carregamento falhar
  const loadTimeout = setTimeout(() => {
    debugLog('Timeout ao carregar bibliotecas Google', null, 'warn');
    handleGoogleLibrariesError();
  }, 10000);
  
  // Carregar o script GAPI
  const gapiScript = document.createElement('script');
  gapiScript.src = 'https://apis.google.com/js/api.js';
  gapiScript.async = true;
  gapiScript.defer = true;
  gapiScript.onload = () => {
    clearTimeout(loadTimeout); // Limpar timeout ao carregar com sucesso
    initializeGapiClient();
  };
  gapiScript.onerror = handleGoogleLibrariesError;
  document.head.appendChild(gapiScript);
  
  // Carregar o script Google Identity Services
  const gisScript = document.createElement('script');
  gisScript.src = 'https://accounts.google.com/gsi/client';
  gisScript.async = true;
  gisScript.defer = true;
  gisScript.onload = () => {
    clearTimeout(loadTimeout); // Limpar timeout ao carregar com sucesso
    initializeGisClient();
  };
  gisScript.onerror = handleGoogleLibrariesError;
  document.head.appendChild(gisScript);
  
  debugLog('Carregando bibliotecas Google...');
}

// Handler para erro no carregamento das bibliotecas Google
function handleGoogleLibrariesError() {
  console.error('Erro ao carregar bibliotecas Google');
  if (appState.currentMode === 'iphone') {
    updateCameraStatus('Erro ao carregar ferramentas de upload. Verifique sua conexão.', 'error');
  } else {
    alert('Não foi possível carregar as bibliotecas necessárias. Por favor, verifique sua conexão e recarregue a página.');
  }
}

// Inicializar GAPI com tratamento de erro
async function initializeGapiClient() {
  try {
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Timeout ao carregar GAPI client')), 5000);
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
    
    // Se tiver um token salvo, verificar sua validade
    if (appState.accessToken) {
      validateSavedToken();
    }
  } catch (err) {
    console.error('Erro ao inicializar GAPI client:', err);
    appState.gapiInited = false;
    maybeEnableButtons();
    
    if (appState.currentMode === 'iphone') {
      updateCameraStatus('Erro ao conectar com Google Drive. Tente novamente.', 'error');
    }
  }
}

// Verificar se o token salvo ainda é válido
async function validateSavedToken() {
  try {
    // Tentar fazer uma requisição ao Drive API para verificar se o token é válido
    const response = await gapi.client.request({
      path: 'https://www.googleapis.com/drive/v3/files?fields=files(id,name)&pageSize=1',
      method: 'GET',
      headers: {
        'Authorization': 'Bearer ' + appState.accessToken
      }
    });
    
    // Se chegou aqui, o token é válido
    console.log('Token de autenticação validado com sucesso');
    
    // Atualizar UI se necessário
    updateAuthUIState(true);
    
    // Se estamos no modo iPhone e já autenticados, mostrar a tela da câmera
    if (appState.currentMode === 'iphone' && domElements.screens.login.style.display !== 'none') {
      showScreen(domElements.screens.camera);
      if (!appState.isCameraInitialized) {
        setupCamera();
        appState.isCameraInitialized = true;
      }
      
      setupFirebaseForIphone();
    }
  } catch (err) {
    console.error('Erro ao validar token salvo:', err);
    
    // Token inválido ou expirado, removê-lo
    try {
      localStorage.removeItem(appState.authStorageKey);
    } catch (e) {
      // Falha silenciosa se não conseguir remover
    }
    appState.accessToken = null;
    
    // Atualizar UI
    updateAuthUIState(false);
  }
}

// Inicializar Google Identity Services
function initializeGisClient() {
  try {
    appState.tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPES,
      prompt: '', // Usar '' para não exibir o prompt quando possível
      callback: handleTokenResponse,
      error_callback: handleAuthError
    });
    appState.gisInited = true;
    maybeEnableButtons();
  } catch (error) {
    console.error('Erro ao inicializar Google Identity Services:', error);
    appState.gisInited = false;
    maybeEnableButtons();
    
    if (appState.currentMode === 'iphone') {
      updateCameraStatus('Erro ao configurar autenticação. Tente novamente.', 'error');
    }
  }
}

// Handler para resposta de token
function handleTokenResponse(tokenResponse) {
  if (tokenResponse && tokenResponse.access_token) {
    appState.accessToken = tokenResponse.access_token;
    
    // Salvar o token para uso futuro
    try {
      localStorage.setItem(appState.authStorageKey, appState.accessToken);
    } catch (err) {
      console.warn('Não foi possível salvar o token:', err);
    }
    
    updateAuthUIState(true);
    
    // Iniciar câmera e tela principal
    showScreen(domElements.screens.camera);
    if (!appState.isCameraInitialized) {
      setupCamera();
      appState.isCameraInitialized = true;
    }
    
    // Configurar Firebase para iPhone (já deve estar configurado na conexão)
    setupFirebaseForIphone();
  }
}

// Handler para erro de autenticação
function handleAuthError(err) {
  console.error('Erro na autenticação:', err);
  updateCameraStatus('Falha na autenticação', 'error');
  updateAuthUIState(false);
}

// Ativar botões quando as bibliotecas estiverem carregadas
function maybeEnableButtons() {
  const { googleAuthBtn } = domElements.iphone;
  const { loginBtn } = domElements.iphone;
  
  const librariesReady = appState.gapiInited && appState.gisInited;
  
  if (googleAuthBtn) googleAuthBtn.disabled = !librariesReady;
  if (loginBtn) loginBtn.disabled = !librariesReady;
}

// Atualizar estado visual dos botões de autenticação
function updateAuthUIState(isLoggedIn) {
  const { googleAuthBtn, loginBtn } = domElements.iphone;
  
  if (googleAuthBtn) {
    googleAuthBtn.classList.toggle('logged-in', isLoggedIn);
    googleAuthBtn.setAttribute('title', isLoggedIn ? 'Atualizar Autorização' : 'Entrar com Google');
    googleAuthBtn.disabled = false;
  }
  
  if (loginBtn) {
    loginBtn.textContent = isLoggedIn ? 'Continuar como Câmera' : 'Fazer Login com Google';
    loginBtn.classList.toggle('logged-in', isLoggedIn);
    loginBtn.disabled = false;
  }
}

// Configurar o botão de autenticação do Google
function setupGoogleAuth() {
  const { googleAuthBtn } = domElements.iphone;
  
  if (googleAuthBtn) {
    googleAuthBtn.disabled = true;
    googleAuthBtn.addEventListener('click', handleAuthClick);
  }
}

// Configurar botão de login
function setupLoginButton() {
  const { loginBtn } = domElements.iphone;
  
  if (loginBtn) {
    loginBtn.addEventListener('click', handleAuthClick);
  }
}

// Lidar com o clique no botão de autenticação
function handleAuthClick() {
  const { googleAuthBtn, loginBtn } = domElements.iphone;
  
  if (googleAuthBtn) googleAuthBtn.disabled = true;
  if (loginBtn) loginBtn.disabled = true;
  
  if (appState.accessToken) {
    // Se já estiver autenticado, ir para a tela da câmera
    showScreen(domElements.screens.camera);
    if (!appState.isCameraInitialized) {
      setupCamera();
      appState.isCameraInitialized = true;
    }
    
    // Configurar Firebase para iPhone
    setupFirebaseForIphone();
  } else {
    // Iniciar processo de autenticação com prompt silencioso primeiro
    try {
      appState.tokenClient.requestAccessToken({prompt: ''});
    } catch (err) {
      // Se falhar com prompt silencioso, usar o prompt padrão
      console.log('Autenticação silenciosa falhou, usando prompt explícito');
      appState.tokenClient.requestAccessToken({prompt: 'consent'});
    }
  }
}

// Função para obter as configurações ideais de câmera para modo landscape
async function getBestCameraSettings() {
  try {
    // Verificar dispositivos disponíveis
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoDevices = devices.filter(device => device.kind === 'videoinput');
    
    if (videoDevices.length === 0) {
      throw new Error('Nenhuma câmera encontrada');
    }
    
    // Identificar a câmera traseira para melhor qualidade
    const rearCamera = videoDevices.find(device => 
      device.label.toLowerCase().includes('back') || 
      device.label.toLowerCase().includes('traseira') ||
      device.label.toLowerCase().includes('rear')
    );
    
    const deviceId = rearCamera ? rearCamera.deviceId : videoDevices[0].deviceId;
    
    // Configurações otimizadas para iPhone
    if (deviceDetection.isIOS) {
      return {
        audio: false,
        video: {
          deviceId: deviceId ? { exact: deviceId } : undefined,
          facingMode: rearCamera ? "environment" : "user",
          width: { ideal: 4032 },
          height: { ideal: 3024 },
          zoom: 1.0, 
          exposureMode: 'continuousAutoExposure',
          whiteBalanceMode: 'continuousAutoWhiteBalance'
        }
      };
    } else {
      return {
        audio: false,
        video: {
          deviceId: deviceId ? { exact: deviceId } : undefined,
          facingMode: rearCamera ? "environment" : "user",
          width: { ideal: TARGET_WIDTH },
          height: { ideal: TARGET_HEIGHT },
          aspectRatio: { ideal: TARGET_RATIO }
        }
      };
    }
  } catch (err) {
    console.error('Erro ao configurar câmera:', err);
    // Configuração fallback
    return {
      audio: false,
      video: { 
        facingMode: "environment"
      }
    };
  }
}

// Inicializar a câmera no modo horizontal com retry e feedback
async function setupCamera() {
  const maxAttempts = 3;
  let attempt = 0;
  
  while (attempt < maxAttempts) {
    attempt++;
    
    try {
      updateCameraStatus(`Configurando câmera (tentativa ${attempt})...`);
      
      // Primeiro inicie a câmera com configurações básicas
      let initialConstraints = {
        audio: false,
        video: {
          facingMode: "environment"
        }
      };
      
      // Solicitar acesso à câmera com configurações básicas primeiro
      const stream = await navigator.mediaDevices.getUserMedia(initialConstraints);
      
      // Aplicar o stream ao elemento de vídeo
      domElements.iphone.camera.srcObject = stream;
      appState.mediaStream = stream;
      
      // Aguardar o carregamento dos metadados do vídeo
      await new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error('Timeout ao carregar metadados do vídeo'));
        }, 5000);
        
        domElements.iphone.camera.onloadedmetadata = () => {
          clearTimeout(timeoutId);
          resolve();
        };
      });

      // Aguardar o vídeo começar a tocar
      await new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          // Não rejeitar, apenas tentar continuar
          console.warn('Timeout ao aguardar vídeo começar a tocar');
          resolve();
        }, 3000);
        
        domElements.iphone.camera.oncanplay = () => {
          clearTimeout(timeoutId);
          resolve();
        };
      });
      
      // Tentar aplicar configurações avançadas
      await optimizeCameraSettings(stream);
      
      // Atualizar dimensões do canvas
      updateCanvasDimensions();
      
      updateCameraStatus('Câmera pronta');
      appState.isCameraInitialized = true;
      return; // Sucesso, sair da função
    } catch (err) {
      console.error(`Erro ao inicializar câmera (tentativa ${attempt}):`, err);
      
      // Limpar recurso se houver
      if (appState.mediaStream) {
        try {
          appState.mediaStream.getTracks().forEach(track => track.stop());
        } catch (e) {
          // Ignorar erros na limpeza
        }
        appState.mediaStream = null;
      }
      
      // Se não for a última tentativa
      if (attempt < maxAttempts) {
        // Aguardar um pouco antes de tentar novamente
        await new Promise(resolve => setTimeout(resolve, 1000));
        updateCameraStatus('Tentando novamente...');
      } else {
        // Última tentativa falhou, mostrar erro
        updateCameraStatus('Erro ao acessar câmera: ' + err.message, 'error');
        
        // Solicitar ao usuário para verificar permissões
        setTimeout(() => {
          if (confirm('Não foi possível acessar a câmera. Verifique se você concedeu permissão para o uso da câmera e tente novamente.')) {
            // Tentar inicializar novamente se o usuário concordar
            setupCamera();
          }
        }, 1000);
      }
    }
  }
}

// Otimizar configurações da câmera
async function optimizeCameraSettings(stream) {
  try {
    const videoTrack = stream.getVideoTracks()[0];
    
    if (videoTrack) {
      // Em dispositivos iOS, isso pode falhar, mas tentamos mesmo assim
      try {
        await videoTrack.applyConstraints({
          width: { ideal: TARGET_WIDTH },
          height: { ideal: TARGET_HEIGHT },
          frameRate: { ideal: 30 }
        });
        
        console.log('Aplicadas configurações avançadas à câmera');
      } catch (constraintErr) {
        console.warn('Não foi possível aplicar configurações avançadas:', constraintErr);
        // Continuar mesmo com erro
      }
      
      // Obter configurações atuais da câmera
      appState.currentVideoSettings = videoTrack.getSettings();
      console.log('Configurações atuais da câmera:', appState.currentVideoSettings);
      
      // Tentar aplicar foco contínuo e exposição automática
      if (!deviceDetection.isSafari) {
        const capabilities = videoTrack.getCapabilities();
        console.log('Capacidades da câmera:', capabilities);
        
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
              console.log('Configurações de foco e exposição aplicadas');
            } catch (e) {
              console.warn('Erro ao aplicar configurações de foco/exposição:', e);
            }
          }
        }
      }
    }
  } catch (err) {
    console.warn('Erro ao otimizar configurações da câmera:', err);
    // Continuar mesmo com erro
  }
}

// Atualizar dimensões do canvas com base no vídeo atual
function updateCanvasDimensions() {
  const { camera, canvas } = domElements.iphone;
  
  if (!camera || !camera.videoWidth || !camera.videoHeight || !canvas) return;
  
  // Garantir que o canvas tenha as dimensões alvo para captura de alta qualidade
  canvas.width = TARGET_WIDTH;
  canvas.height = TARGET_HEIGHT;
  
  // Verificar se as dimensões do vídeo são menores que o alvo (possível limitação do dispositivo)
  if (camera.videoWidth < TARGET_WIDTH || camera.videoHeight < TARGET_HEIGHT) {
    console.warn(`Alerta: Dimensões do vídeo (${camera.videoWidth}x${camera.videoHeight}) são menores que o alvo (${TARGET_WIDTH}x${TARGET_HEIGHT}). A qualidade pode ser limitada pelo hardware.`);
  }
  
  debugLog('Canvas configurado com dimensões:', {
    width: canvas.width,
    height: canvas.height,
    videoWidth: camera.videoWidth,
    videoHeight: camera.videoHeight
  });
}

// Capturar imagem em alta qualidade (4032x3024)
function captureHighQualityImage(sourceElement) {
  return new Promise((resolve, reject) => {
    try {
      const { canvas } = domElements.iphone;
      if (!canvas) {
        throw new Error('Canvas não disponível');
      }
      
      // Verificar disponibilidade do vídeo e dimensões
      const videoWidth = sourceElement.videoWidth;
      const videoHeight = sourceElement.videoHeight;
      
      if (!videoWidth || !videoHeight) {
        throw new Error('Dimensões de vídeo indisponíveis');
      }
      
      console.log(`Capturando imagem do vídeo com dimensões: ${videoWidth}x${videoHeight}`);
      
      // Ajustar dimensões do canvas para corresponder ao alvo
      canvas.width = TARGET_WIDTH;
      canvas.height = TARGET_HEIGHT;
      
      // Configurar canvas para máxima qualidade
      const ctx = canvas.getContext('2d', { 
        alpha: false,
        desynchronized: true,
        willReadFrequently: false
      });
      
      if (!ctx) {
        throw new Error('Não foi possível obter contexto do canvas');
      }
      
      // Importantes configurações de qualidade
      ctx.imageSmoothingEnabled = false;
      ctx.imageSmoothingQuality = 'high';
      
      // Limpar canvas antes de desenhar
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Calcular dimensões preservando ao máximo a resolução
      // Use o máximo da resolução disponível do vídeo
      const sourceRatio = videoWidth / videoHeight;
      const targetRatio = TARGET_WIDTH / TARGET_HEIGHT;
      
      // Variáveis para o recorte
      let sx = 0, sy = 0, sw = videoWidth, sh = videoHeight;
      
      // Calcular o recorte com maior precisão
      if (Math.abs(sourceRatio - targetRatio) > 0.001) {
        if (sourceRatio > targetRatio) {
          // Vídeo é mais largo, recortar nas laterais
          sw = videoHeight * targetRatio;
          sx = Math.floor((videoWidth - sw) / 2);
        } else {
          // Vídeo é mais alto, recortar cima/baixo
          sh = videoWidth / targetRatio;
          sy = Math.floor((videoHeight - sh) / 2);
        }
      }
      
      // Usar números inteiros para evitar cálculos subpixel
      sx = Math.floor(sx);
      sy = Math.floor(sy);
      sw = Math.floor(sw);
      sh = Math.floor(sh);
      
      // Desenhar no canvas, preservando a qualidade máxima
      ctx.drawImage(
        sourceElement,
        sx, sy, sw, sh,
        0, 0, canvas.width, canvas.height
      );
      
      // Definir um timeout para caso a conversão demore muito
      const blobTimeout = setTimeout(() => {
        reject(new Error('Timeout ao gerar blob da imagem'));
      }, 5000);
      
      // Capturar com qualidade máxima
      canvas.toBlob(blob => {
        clearTimeout(blobTimeout);
        
        if (!blob) {
          reject(new Error('Falha ao gerar blob da imagem'));
          return;
        }
        
        console.log(`Imagem capturada: ${blob.size} bytes`);
        resolve(blob);
      }, IMAGE_FORMAT, IMAGE_QUALITY);
      
    } catch (err) {
      console.error('Erro ao capturar imagem:', err);
      reject(err);
    }
  });
}

// Função principal de captura e upload com retry automatizado
async function captureAndUpload(codeNumber, photoKey) {
  // Verificar se está logado
  if (!appState.accessToken) {
    updateCameraStatus('Faça login antes de capturar fotos', 'error');
    return;
  }
  
  // Verificar se a câmera está disponível
  if (!appState.mediaStream) {
    updateCameraStatus('Câmera não disponível', 'error');
    return;
  }
  
  const maxRetries = 2;
  let attempt = 0;
  
  while (attempt <= maxRetries) {
    try {
      // Atualizar status Firebase
      if (appState.firebaseRefs.status) {
        appState.firebaseRefs.status.update({
          photoStatus: 'capturing',
          captureTime: firebase.database.ServerValue.TIMESTAMP
        });
      }
      
      // Atualizar status da foto específica
      if (appState.firebaseRefs.photos && photoKey) {
        appState.firebaseRefs.photos.child(photoKey).update({
          status: 'capturing',
          captureTime: firebase.database.ServerValue.TIMESTAMP
        });
      }
      
      // Exibir mensagem simples
      updateCameraStatus(`Capturando: ${codeNumber}`);
      
      // Definir nome do arquivo com extensão baseada no formato
      const extension = IMAGE_FORMAT === 'image/png' ? '.png' : '.jpg';
      const fileName = `${codeNumber}${extension}`;
      
      console.log('Capturando imagem com nome:', fileName);
      
      // Capturar imagem em alta qualidade
      const imageBlob = await captureHighQualityImage(domElements.iphone.camera);
      
      // Mostrar mensagem de captura
      updateCameraStatus('Enviando para o Drive...');
      
      // Atualizar status Firebase
      if (appState.firebaseRefs.status) {
        appState.firebaseRefs.status.update({
          photoStatus: 'uploading',
          uploadStartTime: firebase.database.ServerValue.TIMESTAMP
        });
      }
      
      // Atualizar status da foto específica
      if (appState.firebaseRefs.photos && photoKey) {
        appState.firebaseRefs.photos.child(photoKey).update({
          status: 'uploading',
          uploadStartTime: firebase.database.ServerValue.TIMESTAMP
        });
      }
      
      // Enviar para o Google Drive
      await uploadToDrive(imageBlob, fileName, photoKey);
      
      // Se chegamos aqui, sucesso!
      break;
    } catch (err) {
      attempt++;
      console.error(`Erro na captura (tentativa ${attempt}/${maxRetries+1}):`, err);
      
      if (attempt <= maxRetries) {
        // Tentar novamente após uma pequena pausa
        updateCameraStatus(`Tentando novamente (${attempt}/${maxRetries})...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      } else {
        // Desistir após todas as tentativas
        updateCameraStatus('Erro ao capturar: ' + (err.message || 'Falha desconhecida'), 'error');
        
        // Atualizar status Firebase
        if (appState.firebaseRefs.status) {
          appState.firebaseRefs.status.update({
            photoStatus: 'error',
            errorMessage: err.message,
            errorTime: firebase.database.ServerValue.TIMESTAMP
          });
        }
        
        // Atualizar status da foto específica
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

// Upload para o Google Drive com backoff exponencial e retries
async function uploadToDrive(blob, filename, photoKey) {
  const maxRetries = 3;
  let retry = 0;
  let backoffDelay = 1000; // 1 segundo inicial
  
  while (retry <= maxRetries) {
    try {
      if (!appState.accessToken) {
        updateCameraStatus('Por favor, faça login primeiro', 'error');
        return;
      }
      
      // Verificar tamanho da imagem
      const blobSizeMB = blob.size / (1024 * 1024);
      console.log(`Tamanho da imagem: ${blobSizeMB.toFixed(2)} MB`);
      
      if (blobSizeMB > 10) {
        updateCameraStatus(`Enviando imagem de ${blobSizeMB.toFixed(1)} MB...`);
      }
      
      // Garantir nome de arquivo correto
      const extension = IMAGE_FORMAT === 'image/png' ? '.png' : '.jpg';
      const fileNameWithExt = filename.endsWith(extension) ? 
                            filename : 
                            filename.replace(/\.[^/.]+$/, "") + extension;
      
      console.log('Iniciando upload com nome:', fileNameWithExt);
      
      // Preparar metadados do arquivo
      const metadata = {
        name: fileNameWithExt,
        mimeType: IMAGE_FORMAT,
        parents: [FOLDER_ID]
      };
      
      // Tentar primeiro método de upload (multipart)
      try {
        const response = await uploadMultipart(blob, metadata);
        await handleSuccessfulUpload(response, photoKey);
        return; // Upload bem-sucedido, sair da função
      } catch (err) {
        console.error(`Erro no método de upload principal (tentativa ${retry + 1}):`, err);
        
        // Tentar método alternativo
        try {
          const response = await uploadWithFetch(blob, metadata);
          await handleSuccessfulUpload(response, photoKey);
          return; // Upload bem-sucedido, sair da função
        } catch (fetchErr) {
          console.error(`Erro no método de upload alternativo (tentativa ${retry + 1}):`, fetchErr);
          
          retry++;
          
          if (retry <= maxRetries) {
            // Backoff exponencial
            updateCameraStatus(`Tentando novamente em ${backoffDelay/1000}s...`);
            await new Promise(resolve => setTimeout(resolve, backoffDelay));
            backoffDelay *= 2; // Dobra o tempo de espera para a próxima tentativa
          } else {
            // Falhou em todas as tentativas
            throw new Error("Falha após várias tentativas de upload: " + (fetchErr.message || "Erro desconhecido"));
          }
        }
      }
    } catch (err) {
      if (retry >= maxRetries) {
        console.error('Erro fatal na operação de upload:', err);
        updateCameraStatus('Falha no upload: ' + (err.message || 'Erro desconhecido'), 'error');
        
        // Atualizar Firebase com erro
        if (appState.firebaseRefs.status) {
          appState.firebaseRefs.status.update({
            photoStatus: 'error',
            errorMessage: err.message || 'Erro na operação de upload',
            errorTime: firebase.database.ServerValue.TIMESTAMP
          });
        }
        
        // Atualizar status da foto específica
        if (appState.firebaseRefs.photos && photoKey) {
          appState.firebaseRefs.photos.child(photoKey).update({
            status: 'error',
            errorMessage: err.message || 'Erro na operação de upload',
            errorTime: firebase.database.ServerValue.TIMESTAMP
          });
        }
        
        break; // Sair do loop após atualizar status
      }
      
      retry++;
      backoffDelay *= 2;
    }
  }
}

// Método principal de upload para o Drive via multipart
async function uploadMultipart(blob, metadata) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(blob);
    
    reader.onloadend = async function() {
      try {
        // Remover cabeçalho do base64
        const base64Data = reader.result.split(',')[1];
        
        // Criar corpo multipart com nome do arquivo
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
      reject(new Error("Erro ao ler arquivo: " + error));
    };
  });
}

// Método alternativo de upload para o Drive via fetch
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
    throw new Error(errorData.error?.message || `Erro HTTP: ${fetchResponse.status}`);
  }
  
  return await fetchResponse.json();
}

// Processa upload bem-sucedido
async function handleSuccessfulUpload(response, photoKey) {
  let fileId, fileName;
  
  // Extrair dados dependendo do formato da resposta
  if (response.result) {
    fileId = response.result.id;
    fileName = response.result.name;
  } else {
    fileId = response.id;
    fileName = response.name;
  }
  
  console.log('Upload bem-sucedido:', { fileId, fileName });
  
  // Atualizar Firebase com sucesso
  if (appState.firebaseRefs.status) {
    appState.firebaseRefs.status.update({
      photoStatus: 'completed',
      completionTime: firebase.database.ServerValue.TIMESTAMP,
      driveFileId: fileId,
      driveFileName: fileName
    });
  }
  
  // Atualizar status da foto específica
  if (appState.firebaseRefs.photos && photoKey) {
    appState.firebaseRefs.photos.child(photoKey).update({
      status: 'completed',
      completionTime: firebase.database.ServerValue.TIMESTAMP,
      driveFileId: fileId,
      driveFileName: fileName
    });
  }
  
  updateCameraStatus('Foto enviada com sucesso!');
  
  // Esperar um pouco para mostrar o status de sucesso
  setTimeout(() => {
    // Limpar input
    if (domElements.iphone.qrInput) {
      domElements.iphone.qrInput.value = '';
    }
    
    updateCameraStatus('Aguardando próximo código');
  }, 1500);
}

// Criar corpo multipart para upload
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