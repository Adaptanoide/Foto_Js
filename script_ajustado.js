const qrInput = document.getElementById("qr-input");
const smallNumberDisplay = document.getElementById("small-number-display");
const bigNumberDisplay = document.getElementById("big-number-display");
const camera = document.getElementById("camera");
const canvas = document.getElementById("canvas");
const cameraContainer = document.getElementById("camera-container");
const toggleCameraBtn = document.getElementById("toggle-camera-btn");
const exportBtn = document.getElementById("export-btn");
const viewPhotosBtn = document.getElementById("view-photos-btn");
const photoCountBadge = document.getElementById("photo-count-badge");

let qrCodeText = ""; 
let smallNumber = ""; 
let bigNumber = "";
let sessionPhotos = [];
let isCameraVisible = false;

document.addEventListener('DOMContentLoaded', () => {
  initCamera();
  cameraContainer.style.display = 'none';
});

function initCamera() {
  navigator.mediaDevices.getUserMedia({
    video: {
      facingMode: { ideal: "environment" },
      width: { ideal: 1920 },
      height: { ideal: 1080 }
    }
  }).then((stream) => {
    camera.srcObject = stream;
  }).catch((error) => {
    console.error("Erro ao acessar a câmera: ", error);
  });
}

toggleCameraBtn.addEventListener("click", () => {
  isCameraVisible = !isCameraVisible;
  cameraContainer.style.display = isCameraVisible ? 'block' : 'none';
  qrInput.style.display = isCameraVisible ? 'none' : 'block';
});

qrInput.addEventListener("input", () => {
  qrCodeText = qrInput.value.trim();
  smallNumber = extractSmallNumber(qrCodeText);
  bigNumber = extractBigNumber(smallNumber);

  smallNumberDisplay.innerText = smallNumber;
  bigNumberDisplay.innerText = bigNumber;

  if (smallNumber && bigNumber) {
    setTimeout(() => capturePhoto(), 3000);
  }
});

function extractSmallNumber(qrCode) {
  const parts = qrCode.split(";");
  const numberField = parts[3]; 
  return numberField ? numberField.slice(0, 9) : "";
}

function extractBigNumber(smallNumber) {
  return smallNumber ? smallNumber.slice(-5) : "";
}

function capturePhoto() {
  const context = canvas.getContext("2d");
  canvas.width = camera.videoWidth;
  canvas.height = camera.videoHeight;
  context.drawImage(camera, 0, 0, canvas.width, canvas.height);

  const dataUrl = canvas.toDataURL("image/png");
  addToSession(dataUrl, bigNumber || "foto");

  qrInput.value = '';
  smallNumberDisplay.innerText = "";
  bigNumberDisplay.innerText = "";
  qrInput.focus();
}

function addToSession(dataUrl, name) {
  sessionPhotos.push({ dataUrl, name, timestamp: new Date().toISOString() });
  updateSessionCounter();
  showMessage(`Foto adicionada ao lote (${sessionPhotos.length} total)`, 'success');
}

function updateSessionCounter() {
  photoCountBadge.innerText = sessionPhotos.length;
}

exportBtn.addEventListener("click", exportBatch);

function exportBatch() {
  if (sessionPhotos.length === 0) {
    showMessage('Nenhuma foto para exportar.', 'info');
    return;
  }

  showMessage('Gerando ZIP...', 'info');

  const zip = new JSZip();
  sessionPhotos.forEach(photo => {
    const imageData = photo.dataUrl.split(',')[1];
    const blob = b64toBlob(imageData, 'image/png');
    zip.file(`${photo.name}.png`, blob);
  });

  zip.generateAsync({ type: 'blob' })
    .then(content => {
      saveAs(content, `Fotos_${new Date().toISOString().slice(0, 10)}.zip`);
      showMessage(`${sessionPhotos.length} fotos exportadas com sucesso!`, 'success');
    });
}

function b64toBlob(b64Data, contentType = '', sliceSize = 512) {
  const byteCharacters = atob(b64Data);
  const byteArrays = [];

  for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
    const slice = byteCharacters.slice(offset, offset + sliceSize);
    const byteNumbers = new Array(slice.length).fill().map((_, i) => slice.charCodeAt(i));
    byteArrays.push(new Uint8Array(byteNumbers));
  }

  return new Blob(byteArrays, { type: contentType });
}

viewPhotosBtn.addEventListener("click", () => {
  const modal = document.createElement('div');
  modal.style.position = "fixed";
  modal.style.top = "0";
  modal.style.left = "0";
  modal.style.width = "100vw";
  modal.style.height = "100vh";
  modal.style.backgroundColor = "rgba(0,0,0,0.8)";
  modal.style.overflowY = "auto";
  modal.style.zIndex = "3000";
  modal.style.padding = "20px";
  modal.style.display = "flex";
  modal.style.flexWrap = "wrap";
  modal.style.justifyContent = "center";
  modal.style.alignItems = "flex-start";

  sessionPhotos.forEach(photo => {
    const container = document.createElement('div');
    container.style.margin = "10px";
    container.style.textAlign = "center";
    container.style.color = "white";

    const img = document.createElement('img');
    img.src = photo.dataUrl;
    img.style.maxWidth = "180px";
    img.style.borderRadius = "8px";
    img.style.display = "block";
    img.style.marginBottom = "5px";

    const name = document.createElement('div');
    name.textContent = `${photo.name}.png`;
    name.style.fontSize = "14px";

    container.appendChild(img);
    container.appendChild(name);
    modal.appendChild(container);
  });

  modal.addEventListener("click", () => {
    document.body.removeChild(modal);
  });

  document.body.appendChild(modal);
});

function showMessage(message, type = 'info') {
  const messageContainer = document.createElement('div');
  messageContainer.style.position = 'fixed';
  messageContainer.style.top = '20px';
  messageContainer.style.left = '50%';
  messageContainer.style.transform = 'translateX(-50%)';
  messageContainer.style.padding = '10px 20px';
  messageContainer.style.borderRadius = '5px';
  messageContainer.style.color = 'white';
  messageContainer.style.zIndex = '2000';
  messageContainer.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
  messageContainer.style.maxWidth = '80%';
  messageContainer.style.textAlign = 'center';

  messageContainer.style.backgroundColor = {
    'error': '#f44336',
    'success': '#4CAF50',
    'info': '#2196F3'
  }[type] || '#2196F3';

  messageContainer.textContent = message;
  document.body.appendChild(messageContainer);

  setTimeout(() => {
    if (document.body.contains(messageContainer)) {
      document.body.removeChild(messageContainer);
    }
  }, 3000);
}

// Alerta ao tentar sair da página
window.addEventListener("beforeunload", function (e) {
  if (sessionPhotos.length > 0) {
    e.preventDefault();
    e.returnValue = 'Você perderá suas fotos se não baixar o arquivo ZIP.';
    showExitAlert();
    return '';
  }
});

// Alerta visual com botão de download
function showExitAlert() {
  const alertBox = document.getElementById('exit-alert');
  const btn = document.getElementById('exit-download-btn');
  alertBox.style.display = 'flex';

  btn.onclick = () => {
    exportBatch();
    alertBox.style.display = 'none';
  };
}