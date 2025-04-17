const qrInput = document.getElementById("qr-input");
const smallNumberDisplay = document.getElementById("small-number-display");
const bigNumberDisplay = document.getElementById("big-number-display");
const canvas = document.getElementById("canvas");
const camera = document.getElementById("camera");
const previewContainer = document.getElementById("photo-preview");
const downloadZipBtn = document.getElementById("download-zip");
const showPhotosBtn = document.getElementById("show-photos");
const modal = document.getElementById("photo-modal");
const closeModal = document.getElementById("close-modal");

let track = null;
let photos = {}; // { "12345.png": "data:image/png;base64,...", ... }
let qrCodeText = "", smallNumber = "", bigNumber = "", captureTimeout = null;

function extractSmallNumber(qrCode) {
  const parts = qrCode.split(";");
  return parts[3] ? parts[3].slice(0, 9) : "";
}

function extractBigNumber(small) {
  return small ? small.slice(-5) : "";
}

qrInput.addEventListener("input", () => {
  qrCodeText = qrInput.value.trim();
  smallNumber = extractSmallNumber(qrCodeText);
  bigNumber = extractBigNumber(smallNumber);

  smallNumberDisplay.innerText = smallNumber;
  bigNumberDisplay.innerText = bigNumber;

  if (smallNumber && bigNumber) {
    if (captureTimeout) clearTimeout(captureTimeout);
    captureTimeout = setTimeout(() => autoCapturePhoto(), 3000);
  }
});

async function startCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: "environment" },
        width: { ideal: 3840 },
        height: { ideal: 2160 },
        frameRate: { ideal: 30, max: 60 }
      }
    });
    camera.srcObject = stream;
    track = stream.getVideoTracks()[0];
  } catch (err) {
    console.error("Erro ao acessar a câmera:", err);
  }
}

async function autoCapturePhoto() {
  if (!track) return alert("Câmera não iniciada");

  await camera.play();
  const width = camera.videoWidth;
  const height = camera.videoHeight;

  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(camera, 0, 0, width, height);

  const imageDataURL = canvas.toDataURL("image/png");
  const filename = `${bigNumber}.png`;

  photos[filename] = imageDataURL;

  setTimeout(() => {
    qrInput.value = '';
    smallNumberDisplay.innerText = "";
    bigNumberDisplay.innerText = "";
    qrInput.focus();
  }, 500);
}

downloadZipBtn.addEventListener("click", () => {
  if (Object.keys(photos).length === 0) return alert("Nenhuma foto para baixar!");

  const zip = new JSZip();
  for (const [filename, dataURL] of Object.entries(photos)) {
    zip.file(filename, dataURL.split(",")[1], { base64: true });
  }

  zip.generateAsync({ type: "blob" }).then(content => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(content);
    a.download = "fotos.zip";
    a.click();
  });
});

showPhotosBtn.addEventListener("click", () => {
  previewContainer.innerHTML = "";

  for (const [filename, dataURL] of Object.entries(photos)) {
    const container = document.createElement("div");
    container.classList.add("photo-item");

    const img = document.createElement("img");
    img.src = dataURL;
    img.alt = filename;

    const caption = document.createElement("span");
    caption.innerText = filename.replace(".png", "");

    container.appendChild(img);
    container.appendChild(caption);
    previewContainer.appendChild(container);
  }

  modal.classList.remove("hidden");
});

closeModal.addEventListener("click", () => {
  modal.classList.add("hidden");
});

startCamera();
