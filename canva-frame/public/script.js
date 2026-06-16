const fileInput = document.getElementById("fileInput");
const fileInfo = document.getElementById("fileInfo");
const fileNameEl = document.getElementById("fileName");
const dropZone = document.getElementById("dropZone");
const submitBtn = document.getElementById("submitBtn");
const btnText = document.getElementById("btnText");
const spinnerIcon = document.getElementById("spinnerIcon");
const hataKutusu = document.getElementById("hataKutusu");
const hataMetni = document.getElementById("hataMetni");

// Yeni eklenen DOM elementleri
const dropContent = document.getElementById("dropContent");
const previewContainer = document.getElementById("previewContainer");
const imagePreview = document.getElementById("imagePreview");

// Dosya seçildiğinde çalışacak fonksiyon
function handleFileSelect(file) {
  if (!file) {
    fileInfo.classList.remove("visible");
    submitBtn.disabled = true;

    // Önizlemeyi gizle, standart ikonu göster
    previewContainer.classList.add("hidden");
    dropContent.classList.remove("hidden");
    imagePreview.src = "";
    return;
  }

  // Sadece PNG kontrolü
  if (file.type !== "image/png") {
    showError("Lütfen sadece PNG formatında bir dosya yükleyin.");
    return;
  }

  // Dosya adını yazdır ve butonu aktif et
  fileNameEl.textContent = file.name;
  fileInfo.classList.add("visible");
  submitBtn.disabled = false;
  hataKutusu.style.display = "none";

  // Resmi okuyup önizlemeye basıyoruz
  const reader = new FileReader();
  reader.onload = function (e) {
    imagePreview.src = e.target.result;

    // Standart içeriği gizle, önizlemeyi göster
    dropContent.classList.add("hidden");
    previewContainer.classList.remove("hidden");
  };
  reader.readAsDataURL(file);
}

function showError(message) {
  hataMetni.textContent = message;
  hataKutusu.style.display = "flex";

  // Hata durumunda sistemi sıfırla
  fileInput.value = "";
  handleFileSelect(null);
}

// Event Listeners
fileInput.addEventListener("change", () => {
  handleFileSelect(fileInput.files[0]);
});

dropZone.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropZone.classList.add("dragover");
});

dropZone.addEventListener("dragleave", () => {
  dropZone.classList.remove("dragover");
});

dropZone.addEventListener("drop", (e) => {
  e.preventDefault();
  dropZone.classList.remove("dragover");

  const files = e.dataTransfer.files;
  if (files.length > 0) {
    fileInput.files = files; // Input'a ata ki form gönderilirken gitsin
    handleFileSelect(files[0]);
  }
});

submitBtn.addEventListener("click", async () => {
  if (!fileInput.files.length) return;

  submitBtn.disabled = true;
  btnText.textContent = "İşleniyor...";
  spinnerIcon.classList.remove("hidden");
  hataKutusu.style.display = "none";

  const formData = new FormData();
  formData.append("resim", fileInput.files[0]);

  try {
    const response = await fetch("/uret", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.hata || "Bilinmeyen bir hata oluştu");
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "canva_cerceve.pdf";
    a.click();
    URL.revokeObjectURL(url);
  } catch (err) {
    showError(err.message);
  } finally {
    submitBtn.disabled = false;
    btnText.textContent = "Oluştur ve İndir";
    spinnerIcon.classList.add("hidden");
  }
});
