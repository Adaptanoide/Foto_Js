const qrInput = document.getElementById("qr-input");
const smallNumberDisplay = document.getElementById("small-number-display");
const bigNumberDisplay = document.getElementById("big-number-display");
const camera = document.getElementById("camera");
const captureBtn = document.getElementById("capture-btn");
const canvas = document.getElementById("canvas");

let track = null; // Guarda a referência ao vídeo
let qrCodeText = "";
let smallNumber = "";
let bigNumber = "";

// Extrai os 9 primeiros dígitos do campo específico do QR
function extractSmallNumber(qrCode) {
  const parts = qrCode.split(";");
  const numberField = parts[3]; 
  return numberField ? numberField.slice(0, 9) : "";
}

// Extrai os últimos 5 dígitos do número pequeno
function extractBigNumber(smallNumber) {
  return smallNumber ? smallNumber.slice(-5) : "";
}

// Atualiza os números exibidos ao digitar ou escanear o QR Code
qrInput.addEventListener("input", () => {
  qrCodeText = qrInput.value.trim();
  smallNumber = extractSmallNumber(qrCodeText);
  bigNumber = extractBigNumber(smallNumber);

  smallNumberDisplay.innerText = smallNumber;
  bigNumberDisplay.innerText = bigNumber;

  if (smallNumber && bigNumber) {
    captureBtn.focus();
  }
});

// Ativa a câmera com a maior resolução possível
async function startCamera() {
  try {
    const constraints = {
      video: {
        facingMode: { ideal: "environment" }, // Usa a câmera traseira
        width: { ideal: 9999 },  // Pede a resolução máxima
        height: { ideal: 9999 },
        frameRate: { ideal: 30, max: 60 } // Alta taxa de quadros
      }
    };

    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    camera.srcObject = stream;
    track = stream.getVideoTracks()[0]; // Guarda referência para captura
  } catch (error) {
    console.error("Erro ao acessar a câmera:", error);
  }
}

// Captura a foto com a resolução máxima disponível
captureBtn.addEventListener("click", async () => {
  if (!track) return alert("Câmera não iniciada");

  try {
    const imageCapture = new ImageCapture(track);
    const photo = await imageCapture.takePhoto(); // Captura com qualidade máxima
    const imgURL = URL.createObjectURL(photo);

    // Criar link para download automático
    const tempLink = document.createElement("a");
    tempLink.href = imgURL;
    tempLink.download = `${bigNumber || "foto"}.png`;
    document.body.appendChild(tempLink);
    tempLink.click();
    document.body.removeChild(tempLink);

    // Resetar os campos
    qrInput.value = '';
    smallNumberDisplay.innerText = "";
    bigNumberDisplay.innerText = "";
    qrInput.focus();

  } catch (error) {
    console.error("Erro ao capturar foto:", error);
  }
});

// Inicia a câmera ao carregar a página
startCamera();
