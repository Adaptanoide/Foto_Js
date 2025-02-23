// Captura os elementos do DOM
const qrInput = document.getElementById("qr-input");
const qrResult = document.getElementById("qr-result");
const camera = document.getElementById("camera");
const captureBtn = document.getElementById("capture-btn");
const canvas = document.getElementById("canvas");
const downloadLink = document.getElementById("download-link");

let qrCodeText = "foto"; // Nome padrão se não houver QR Code

// Atualiza o nome do arquivo ao digitar ou escanear o QR Code
qrInput.addEventListener("input", () => {
    qrCodeText = qrInput.value.trim();
    qrResult.innerText = qrCodeText ? `📌 Código Lido: ${qrCodeText}` : "Aguardando QR Code...";
});

// Ativa a câmera do dispositivo
navigator.mediaDevices.getUserMedia({ video: true }).then((stream) => {
    camera.srcObject = stream;
});

// Captura a foto e renomeia com o QR Code
captureBtn.addEventListener("click", () => {
    const context = canvas.getContext("2d");

    canvas.width = camera.videoWidth;
    canvas.height = camera.videoHeight;
    context.drawImage(camera, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL("image/png");

    downloadLink.href = dataUrl;
    downloadLink.download = `${qrCodeText || "foto"}.png`;
    downloadLink.style.display = "inline-block";
    downloadLink.innerText = "📥 Baixar Foto";
});
