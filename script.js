// Captura os elementos do DOM
const qrInput = document.getElementById("qr-input");
const numberDisplay = document.getElementById("number-display");
const camera = document.getElementById("camera");
const captureBtn = document.getElementById("capture-btn");
const canvas = document.getElementById("canvas");

let qrCodeText = ""; // Armazena o número extraído do QR Code

// Função para extrair os últimos 5 dígitos do terceiro campo do QR Code
function extractQRCodeNumber(qrCode) {
  const parts = qrCode.split(";");
  // Supondo que o campo desejado esteja no índice 3 (4º elemento)
  const numberField = parts[3];
  return numberField ? numberField.slice(-5) : "";
}

// Atualiza o número exibido na top-banner ao digitar ou escanear o QR Code
qrInput.addEventListener("input", () => {
  qrCodeText = extractQRCodeNumber(qrInput.value.trim());
  numberDisplay.innerText = qrCodeText;
  // Se um QR válido for lido, muda o foco para o botão de tirar foto
  if (qrCodeText) {
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
  tempLink.download = `${qrCodeText || "foto"}.png`;
  document.body.appendChild(tempLink);
  tempLink.click();
  document.body.removeChild(tempLink);

  // Prepara para a próxima captura: limpa o campo, o número exibido e coloca o foco nele
  qrInput.value = '';
  numberDisplay.innerText = "";
  qrInput.focus();
});
