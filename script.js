const qrInput = document.getElementById("qr-input");
const smallNumberDisplay = document.getElementById("small-number-display");
const bigNumberDisplay = document.getElementById("big-number-display");
const camera = document.createElement("video"); // não está mais no HTML
camera.setAttribute("playsinline", "true"); // necessário pro iPhone
let track = null;
let qrCodeText = "";
let smallNumber = "";
let bigNumber = "";
let captureTimeout = null;

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
    if (captureTimeout) clearTimeout(captureTimeout);

    captureTimeout = setTimeout(() => {
      autoCapturePhoto();
    }, 3000);
  }
});

async function startCamera() {
  try {
    const constraints = {
      video: {
        facingMode: { ideal: "environment" },
        width: { ideal: 3840 },
        height: { ideal: 2160 },
        frameRate: { ideal: 30, max: 60 }
      }
    };

    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    camera.srcObject = stream;
    track = stream.getVideoTracks()[0];

    camera.onloadedmetadata = () => {
      camera.play();
      console.log("Resolução real:", camera.videoWidth, camera.videoHeight);
    };
  } catch (error) {
    console.error("Erro ao acessar a câmera:", error);
  }
}

async function autoCapturePhoto() {
  if (!track) return alert("Câmera não iniciada");

  try {
    const canvas = document.getElementById("canvas");
    const context = canvas.getContext("2d");

    // Espera o vídeo carregar de fato
    await camera.play();

    const width = camera.videoWidth;
    const height = camera.videoHeight;

    canvas.width = width;
    canvas.height = height;

    context.drawImage(camera, 0, 0, width, height);
    const imageDataURL = canvas.toDataURL("image/png");

    const link = document.createElement("a");
    link.href = imageDataURL;
    link.download = `${bigNumber || "foto"}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    qrInput.value = '';
    smallNumberDisplay.innerText = "";
    bigNumberDisplay.innerText = "";
    qrInput.focus();
  } catch (error) {
    console.error("Erro ao capturar foto:", error);
  }
}

startCamera();
