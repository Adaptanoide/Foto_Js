const startBtn = document.getElementById('start-btn');
const appContent = document.querySelector('.app-content');
const qrInput = document.getElementById("qr-input");
const smallNumberDisplay = document.getElementById("small-number-display");
const bigNumberDisplay = document.getElementById("big-number-display");
const camera = document.getElementById("camera");
const previewContainer = document.getElementById("photo-preview");
const downloadZipBtn = document.getElementById("download-zip");
const showPhotosBtn = document.getElementById("show-photos");
const modal = document.getElementById("photo-modal");
const closeModal = document.getElementById("close-modal");
const exitModal = document.getElementById("exit-warning-modal");
const forceExitDownloadBtn = document.getElementById("force-download-exit");
const menuToggle = document.getElementById('menu-toggle');
const buttonsContainer = document.querySelector('.buttons-container');
const returnToAppBtn = document.getElementById('return-to-app');

let track = null;
let photos = {};
let captureTimeout = null;
let menuCollapsed = true;

// Controle de Fullscreen
async function toggleFullscreen() {
  try {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen();
      startBtn.classList.add('hidden');
      appContent.classList.remove('hidden');
      startCamera();
    }
  } catch (err) {
    alert('Erro ao entrar em tela cheia: ' + err.message);
  }
}

document.addEventListener('fullscreenchange', () => {
  if (!document.fullscreenElement) {
    startBtn.classList.remove('hidden');
    appContent.classList.add('hidden');
    if (track) {
      track.stop();
      camera.srcObject = null;
    }
  }
});

startBtn.addEventListener('click', toggleFullscreen);

// Controle do Menu
menuToggle.addEventListener('click', () => {
  menuCollapsed = !menuCollapsed;
  buttonsContainer.classList.toggle('collapsed', menuCollapsed);
  menuToggle.classList.toggle('active', !menuCollapsed);
});

// Funções do scanner QR
function extractSmallNumber(qrCode) {
  const parts = qrCode.split(";");
  return parts.length >= 4 && parts[3].length >= 9 ? parts[3].slice(0, 9) : "";
}

function extractBigNumber(small) {
  return small ? small.slice(-5) : "";
}

qrInput.addEventListener("input", () => {
  const qrCodeText = qrInput.value.trim();
  const smallNumber = extractSmallNumber(qrCodeText);
  const bigNumber = extractBigNumber(smallNumber);

  smallNumberDisplay.textContent = smallNumber || "Inválido";
  bigNumberDisplay.textContent = bigNumber || "Inválido";

  if (smallNumber && bigNumber) {
    clearTimeout(captureTimeout);
    captureTimeout = setTimeout(() => autoCapturePhoto(bigNumber), 1500);
  }
});

// Câmera
async function startCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: "environment" },
        width: { ideal: 3840 },
        height: { ideal: 2160 }
      }
    });
    camera.srcObject = stream;
    track = stream.getVideoTracks()[0];
  } catch (err) {
    alert("Erro ao acessar a câmera: " + err.message);
  }
}

// Captura de foto
async function autoCapturePhoto(currentBigNumber) {
  if (!track) return;

  const width = camera.videoWidth;
  const height = camera.videoHeight;
  
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.getContext('2d').drawImage(camera, 0, 0, width, height);

  const filename = `${currentBigNumber}.png`;
  photos[filename] = canvas.toDataURL("image/png");

  qrInput.value = '';
  smallNumberDisplay.textContent = "-----";
  bigNumberDisplay.textContent = "----";
  qrInput.focus();
}

// Galeria e ZIP
downloadZipBtn.addEventListener("click", () => {
  if (!Object.keys(photos).length) return alert("Nenhuma foto para baixar!");
  
  const zip = new JSZip();
  for (const [filename, dataURL] of Object.entries(photos)) {
    zip.file(filename, dataURL.split(",")[1], { base64: true });
  }

  zip.generateAsync({ type: "blob" }).then(blob => {
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "fotos.zip";
    link.click();
  });
});

showPhotosBtn.addEventListener("click", () => {
  previewContainer.innerHTML = Object.entries(photos).map(([name, src]) => `
    <div class="photo-item">
      <img src="${src}" alt="${name}">
      <span>${name.replace('.png', '')}</span>
      <button onclick="deletePhoto('${name}')">🗑️ Excluir</button>
    </div>
  `).join('');
  modal.classList.remove("hidden");
});

function deletePhoto(filename) {
  delete photos[filename];
  const photoItem = [...previewContainer.children].find(item => 
    item.querySelector('span').textContent === filename.replace('.png', '')
  );
  if (photoItem) photoItem.remove();
}

// Controle de modais
closeModal.addEventListener("click", () => modal.classList.add("hidden"));
window.addEventListener("beforeunload", (e) => {
  if (Object.keys(photos).length) {
    e.preventDefault();
    e.returnValue = "";
    exitModal.classList.remove("hidden");
  }
});

forceExitDownloadBtn.addEventListener("click", () => {
  downloadZipBtn.click();
  exitModal.classList.add("hidden");
  photos = {};
});

returnToAppBtn.addEventListener('click', () => {
  exitModal.classList.add("hidden");
});

exitModal.addEventListener('click', (e) => {
  if (e.target === exitModal) {
    exitModal.classList.add("hidden");
  }
});