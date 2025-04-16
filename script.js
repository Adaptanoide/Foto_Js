const qrInput = document.getElementById("qr-input");
const smallNumberDisplay = document.getElementById("small-number-display");
const bigNumberDisplay = document.getElementById("big-number-display");
const camera = document.getElementById("camera");
const captureBtn = document.getElementById("capture-btn");
const canvas = document.getElementById("canvas");

let track = null;
let qrCodeText = "";
let smallNumber = "";
let bigNumber = "";
let captureTimeout = null; // para evitar múltiplas capturas

function extractSmallNumber(qrCode) {
  const parts = qrCode.split(";");
  const numberField = parts[3];
  return numberField ? numberField.slice(0, 9) : "";
}

function extractBigNumber(smallNumber) {
  return smallNumber ? smallNumber.slice(-5) : "";
}

qrInput.addEventListener("input", () => {
  qrCodeText = qrInput.value.trim();
  smallNumber = extractSmallNumber(qrCodeText);
  bigNumber = extractBigNumber(smallNumber);

  smallNumberDisplay.innerText = smallNumber;
  bigNumberDisplay.innerText = bigNumber;

  if (smallNumber && bigNumber) {
    if (captureTimeout) clearTimeout(captureTimeout); // reseta se já tiver um timeout rolando

    captureTimeout = setTimeout(() => {
      autoCapturePhoto();
    }, 3000); // espera 3 segundos
  }
});

async function startCamera() {
  try {
    const constraints = {
      video: {
        facingMode: { ideal: "environment" },
        width: { ideal: 1920 },
        height: { ideal: 1080 },
        frameRate: { ideal: 30, max: 60 }
      }
    };

    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    camera.srcObject = stream;
    track = stream.getVideoTracks()[0];
  } catch (error) {
    console.error("Erro ao acessar a câmera:", error);
  }
}

async function autoCapturePhoto() {
  if (!camera.srcObject) return alert("Câmera não iniciada");

  // Definir canvas conforme o tamanho do vídeo
  // Tenta pegar o tamanho atual do vídeo, ou usa as configurações
  let width = camera.videoWidth;
  let height = camera.videoHeight;
  
  // Se não tiver dados do vídeo, tenta com as configurações da track
  if (!width || !height) {
    const videoSettings = track.getSettings();
    width = videoSettings.width || 640;
    height = videoSettings.height || 480;
  }
  
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  context.drawImage(camera, 0, 0, width, height);

  canvas.toBlob((blob) => {
    if (!blob) {
      console.error("Erro ao converter imagem");
      return;
    }
    const imgURL = URL.createObjectURL(blob);
    const tempLink = document.createElement("a");
    tempLink.href = imgURL;
    tempLink.download = `${bigNumber || "foto"}.png`;
    document.body.appendChild(tempLink);
    tempLink.click();
    document.body.removeChild(tempLink);

    // Limpar os campos e dar foco de novo
    qrInput.value = '';
    smallNumberDisplay.innerText = "";
    bigNumberDisplay.innerText = "";
    qrInput.focus();
  }, "image/png");
}

startCamera();
