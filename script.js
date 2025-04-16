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
        width: { ideal: 9999 },
        height: { ideal: 9999 },
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
  if (!track) return alert("Câmera não iniciada");

  try {
    const imageCapture = new ImageCapture(track);
    const photo = await imageCapture.takePhoto();
    const imgURL = URL.createObjectURL(photo);

    const tempLink = document.createElement("a");
    tempLink.href = imgURL;
    tempLink.download = `${bigNumber || "foto"}.png`;
    document.body.appendChild(tempLink);
    tempLink.click();
    document.body.removeChild(tempLink);

    // Limpar os campos e definir foco de novo
    qrInput.value = '';
    smallNumberDisplay.innerText = "";
    bigNumberDisplay.innerText = "";
    qrInput.focus();
  } catch (error) {
    console.error("Erro ao capturar foto:", error);
  }
}

startCamera();
