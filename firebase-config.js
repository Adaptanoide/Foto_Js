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
  } else {
    console.warn('Desconectado de Firebase Realtime Database');
  }
});

return {
  database,
  sessionsRef: database.ref('sessions')
};
}