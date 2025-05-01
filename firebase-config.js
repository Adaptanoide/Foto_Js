// Arquivo: firebase-config.js
// Contém a configuração do Firebase para a aplicação

// IMPORTANTE: Substitua estas informações com as do seu projeto Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDK9DocAsrYMVZTTZdGqNBMja89Bdt877g",
  authDomain: "qr-photo-automation.firebaseapp.com",
  databaseURL: "https://qr-photo-automation-default-rtdb.firebaseio.com",
  projectId: "qr-photo-automation",
  storageBucket: "qr-photo-automation.firebasestorage.app",
  messagingSenderId: "1054121533295",
  appId: "1:1054121533295:web:944852c141b1d1d41a129a"
};

// Inicialização do Firebase - com melhor tratamento de erro
function initFirebase() {
// Verificar se o Firebase está disponível
if (typeof firebase === 'undefined') {
  throw new Error('Firebase SDK não está carregado. Verifique a conexão de rede.');
}

// Inicializar Firebase apenas uma vez
if (!firebase.apps.length) {
  try {
    firebase.initializeApp(firebaseConfig);
  } catch (error) {
    console.error('Erro ao inicializar Firebase:', error);
    throw error;
  }
}

// Referência ao Realtime Database
const database = firebase.database();

// Verificar conexão com o banco
const connectedRef = database.ref('.info/connected');
connectedRef.on('value', (snap) => {
  if (snap.val() === true) {
    console.log('Conectado ao Firebase Realtime Database');
  } else {
    console.warn('Desconectado do Firebase Realtime Database');
  }
});

return {
  database,
  sessionsRef: database.ref('sessions')
};
}