// Captura os elementos do DOM
const qrInput = document.getElementById("qr-input");
const smallNumberDisplay = document.getElementById("small-number-display");
const bigNumberDisplay = document.getElementById("big-number-display");
const camera = document.getElementById("camera");
const captureBtn = document.getElementById("capture-btn");
const canvas = document.getElementById("canvas");

let qrCodeText = ""; // Armazena o número do QR Code
let smallNumber = ""; // Armazena o número pequeno
let bigNumber = ""; // Armazena o número grande

// Função para extrair o número pequeno (9 primeiros dígitos)
function extractSmallNumber(qrCode) {
  const parts = qrCode.split(";");
  const numberField = parts[3]; // Supondo que o campo desejado esteja no índice 3 (4º elemento)
  return numberField ? numberField.slice(0, 9) : "";
}

// Função para extrair os últimos 5 dígitos do número pequeno
function extractBigNumber(smallNumber) {
  return smallNumber ? smallNumber.slice(-5) : "";
}

// Atualiza os números exibidos ao digitar ou escanear o QR Code
qrInput.addEventListener("input", () => {
  qrCodeText = qrInput.value.trim();
  smallNumber = extractSmallNumber(qrCodeText);
  bigNumber = extractBigNumber(smallNumber);

  // Atualiza as exibições dos números
  smallNumberDisplay.innerText = smallNumber;
  bigNumberDisplay.innerText = bigNumber;

  // Se um QR válido for lido, muda o foco para o botão de tirar foto
  if (smallNumber && bigNumber) {
    captureBtn.focus();
  }
});

// Ativa a câmera do dispositivo e força o uso da traseira (quando disponível)
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

// Captura a foto e inicia o download automaticamente
captureBtn.addEventListener("click", () => {
  const context = canvas.getContext("2d");

  canvas.width = camera.videoWidth;
  canvas.height = camera.videoHeight;
  context.drawImage(camera, 0, 0, canvas.width, canvas.height);

  const dataUrl = canvas.toDataURL("image/png");

  // Cria um link temporário e dispara o download automaticamente
  const tempLink = document.createElement("a");
  tempLink.href = dataUrl;
  tempLink.download = `${bigNumber || "foto"}.png`;
  document.body.appendChild(tempLink);
  tempLink.click();
  document.body.removeChild(tempLink);

  // Prepara para a próxima captura: limpa o campo, os números exibidos e coloca o foco no input
  qrInput.value = '';
  smallNumberDisplay.innerText = "";
  bigNumberDisplay.innerText = "";
  qrInput.focus();
});
