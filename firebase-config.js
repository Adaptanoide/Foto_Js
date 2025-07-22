// Archivo: firebase-config.js
// Contiene la configuración de Firebase para la aplicación

// IMPORTANTE: Reemplace esta información con la de su proyecto Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDK9DocAsrYMVZTTZdGqNBMja89Bdt877g",
  authDomain: "qr-photo-automation.firebaseapp.com",
  databaseURL: "https://qr-photo-automation-default-rtdb.firebaseio.com",
  projectId: "qr-photo-automation",
  storageBucket: "qr-photo-automation.firebasestorage.app",
  messagingSenderId: "1054121533295",
  appId: "1:1054121533295:web:944852c141b1d1d41a129a"
};

// Inicialización de Firebase - con mejor manejo de error
function initFirebase() {
  // Verificar si Firebase está disponible
  if (typeof firebase === 'undefined') {
    throw new Error('Firebase SDK no está cargado. Verifique la conexión de red.');
  }

  // Inicializar Firebase solo una vez
  if (!firebase.apps.length) {
    try {
      firebase.initializeApp(firebaseConfig);
    } catch (error) {
      console.error('Error al inicializar Firebase:', error);
      throw error;
    }
  }

  // Referencia al Realtime Database
  const database = firebase.database();

  // Verificar conexión con la base de datos
  const connectedRef = database.ref('.info/connected');
  connectedRef.on('value', (snap) => {
    if (snap.val() === true) {
      console.log('Conectado a Firebase Realtime Database');
      // Esconder alerta se estava mostrando
      hideSystemErrorAlert();
    } else {
      console.warn('Desconectado de Firebase Realtime Database');
      // MOSTRAR ALERTA GRANDE E TRAVAR SISTEMA
      showSystemErrorAlert();
    }
  });

  // Função para mostrar erro crítico
  function showSystemErrorAlert() {
    // Remover alerta anterior se existir
    const existingAlert = document.getElementById('system-error-alert');
    if (existingAlert) return; // Já está mostrando

    // Criar alerta grande
    const alert = document.createElement('div');
    alert.id = 'system-error-alert';
    alert.innerHTML = `
    <div class="error-overlay">
      <div class="error-content">
        <div class="error-icon">⚠️</div>
        <h2>SISTEMA DESCONECTADO</h2>
        <p>La conexión con el servicio se ha perdido.</p>
        <p><strong>NO CONTINÚE ESCANEANDO</strong></p>
        <div class="error-actions">
          <button onclick="window.location.reload()" class="reload-btn">
            🔄 RECARGAR PÁGINA
          </button>
        </div>
      </div>
    </div>
  `;

    // Aplicar CSS inline para garantir que funcione
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
    animation: pulse 1s infinite alternate;
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

    // Adicionar ao body
    document.body.appendChild(alert);

    // TRAVAR o sistema - desabilitar input do tablet
    const tabletInput = document.getElementById('tablet-qr-input');
    if (tabletInput) {
      tabletInput.disabled = true;
      tabletInput.placeholder = 'SISTEMA DESCONECTADO - NO ESCANEAR';
    }
  }

  // Função para esconder erro quando reconectar
  function hideSystemErrorAlert() {
    const alert = document.getElementById('system-error-alert');
    if (alert) {
      alert.remove();
    }

    // REABILITAR o sistema
    const tabletInput = document.getElementById('tablet-qr-input');
    if (tabletInput) {
      tabletInput.disabled = false;
      tabletInput.placeholder = 'Scanner QR';
    }
  }

  return {
    database,
    sessionsRef: database.ref('sessions')
  };
}