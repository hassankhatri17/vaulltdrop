const API_BASE = ""; // same origin

// ---- Config (must mirror backend) ----
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

// ---- Elements ----
const dropzone = document.getElementById("dropzone");
const fileInput = document.getElementById("fileInput");
const browseLink = document.getElementById("browseLink");
const previewArea = document.getElementById("previewArea");
const previewThumb = document.getElementById("previewThumb");
const previewName = document.getElementById("previewName");
const previewMeta = document.getElementById("previewMeta");
const progressFill = document.getElementById("progressFill");
const progressLabel = document.getElementById("progressLabel");
const uploadBtn = document.getElementById("uploadBtn");
const cancelBtn = document.getElementById("cancelBtn");
const errorMsg = document.getElementById("errorMsg");
const gallery = document.getElementById("gallery");
const fileCount = document.getElementById("fileCount");
const emptyState = document.getElementById("emptyState");

let selectedFile = null;

// ---- Helpers ----
function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileIconFor(mime) {
  if (mime === "application/pdf") return "📄";
  if (mime.includes("word")) return "📝";
  if (mime === "text/plain") return "🗒";
  return "📁";
}

function showError(message) {
  errorMsg.textContent = message;
  errorMsg.classList.remove("hidden");
}
function clearError() {
  errorMsg.textContent = "";
  errorMsg.classList.add("hidden");
}

// ---- Validation ----
function validateFile(file) {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return "Unsupported file type. Use JPG, PNG, GIF, WEBP, PDF, DOC, DOCX or TXT.";
  }
  if (file.size > MAX_FILE_SIZE) {
    return "File is too large. Max size is 5MB.";
  }
  return null;
}

// ---- Preview rendering ----
function renderPreview(file) {
  previewName.textContent = file.name;
  previewMeta.textContent = `${formatBytes(file.size)} • ${file.type || "unknown type"}`;
  progressFill.style.width = "0%";
  progressLabel.textContent = "Ready to upload";
  uploadBtn.disabled = false;
  uploadBtn.textContent = "Upload File";

  previewThumb.innerHTML = "";
  if (file.type.startsWith("image/")) {
    const img = document.createElement("img");
    img.src = URL.createObjectURL(file);
    previewThumb.appendChild(img);
  } else {
    previewThumb.textContent = fileIconFor(file.type);
  }

  previewArea.classList.remove("hidden");
  clearError();
}

function resetPreview() {
  selectedFile = null;
  fileInput.value = "";
  previewArea.classList.add("hidden");
  clearError();
}

// ---- File selection handling ----
function handleFile(file) {
  if (!file) return;
  const error = validateFile(file);
  if (error) {
    selectedFile = null;
    previewArea.classList.remove("hidden");
    previewName.textContent = file.name;
    previewMeta.textContent = formatBytes(file.size);
    previewThumb.textContent = "⚠";
    progressFill.style.width = "0%";
    progressLabel.textContent = "Validation failed";
    uploadBtn.disabled = true;
    showError(error);
    return;
  }
  selectedFile = file;
  renderPreview(file);
}

// ---- Dropzone events ----
dropzone.addEventListener("click", () => fileInput.click());
browseLink.addEventListener("click", (e) => {
  e.stopPropagation();
  fileInput.click();
});

fileInput.addEventListener("change", (e) => {
  if (e.target.files.length) handleFile(e.target.files[0]);
});

["dragenter", "dragover"].forEach((evt) => {
  dropzone.addEventListener(evt, (e) => {
    e.preventDefault();
    dropzone.classList.add("dragover");
  });
});

["dragleave", "drop"].forEach((evt) => {
  dropzone.addEventListener(evt, (e) => {
    e.preventDefault();
    dropzone.classList.remove("dragover");
  });
});

dropzone.addEventListener("drop", (e) => {
  const file = e.dataTransfer.files[0];
  if (file) handleFile(file);
});

cancelBtn.addEventListener("click", resetPreview);

// ---- Upload with progress ----
uploadBtn.addEventListener("click", () => {
  if (!selectedFile) return;
  clearError();
  uploadBtn.disabled = true;
  uploadBtn.textContent = "Uploading...";

  const formData = new FormData();
  formData.append("file", selectedFile);

  const xhr = new XMLHttpRequest();
  xhr.open("POST", `${API_BASE}/api/upload`);

  xhr.upload.addEventListener("progress", (e) => {
    if (e.lengthComputable) {
      const percent = Math.round((e.loaded / e.total) * 100);
      progressFill.style.width = `${percent}%`;
      progressLabel.textContent = `Uploading... ${percent}%`;
    }
  });

  xhr.onload = () => {
    let response;
    try {
      response = JSON.parse(xhr.responseText);
    } catch {
      response = { success: false, message: "Unexpected server response." };
    }

    if (xhr.status >= 200 && xhr.status < 300 && response.success) {
      progressLabel.textContent = "Upload complete ✓";
      uploadBtn.textContent = "Uploaded";
      loadGallery();
      setTimeout(resetPreview, 900);
    } else {
      showError(response.message || "Upload failed. Try again.");
      uploadBtn.disabled = false;
      uploadBtn.textContent = "Upload File";
      progressLabel.textContent = "Upload failed";
    }
  };

  xhr.onerror = () => {
    showError("Network error. Is the server running?");
    uploadBtn.disabled = false;
    uploadBtn.textContent = "Upload File";
  };

  xhr.send(formData);
});

// ---- Gallery ----
async function loadGallery() {
  try {
    const res = await fetch(`${API_BASE}/api/files`);
    const data = await res.json();
    if (!data.success) return;
    renderGallery(data.files);
  } catch (err) {
    console.error("Failed to load files:", err);
  }
}

function renderGallery(files) {
  gallery.innerHTML = "";
  fileCount.textContent = `${files.length} file${files.length !== 1 ? "s" : ""}`;
  emptyState.classList.toggle("hidden", files.length > 0);

  files.forEach((file) => {
    const card = document.createElement("div");
    card.className = "file-card";

    const isImage = /\.(jpe?g|png|gif|webp)$/i.test(file.storedName);
    const thumb = document.createElement("div");
    thumb.className = "file-card-thumb";
    if (isImage) {
      const img = document.createElement("img");
      img.src = file.url;
      img.alt = file.storedName;
      thumb.appendChild(img);
    } else {
      thumb.textContent = "📄";
    }

    const body = document.createElement("div");
    body.className = "file-card-body";
    const name = document.createElement("p");
    name.className = "file-card-name";
    name.textContent = file.storedName.replace(/-\d+-\d+(\.[^.]+)?$/, "$1");
    const size = document.createElement("p");
    size.className = "file-card-size";
    size.textContent = formatBytes(file.size);
    body.appendChild(name);
    body.appendChild(size);

    const actions = document.createElement("div");
    actions.className = "file-card-actions";
    const viewLink = document.createElement("a");
    viewLink.href = file.url;
    viewLink.target = "_blank";
    viewLink.textContent = isImage ? "View" : "Open";
    const delBtn = document.createElement("button");
    delBtn.textContent = "Delete";
    delBtn.addEventListener("click", () => deleteFile(file.storedName));
    actions.appendChild(viewLink);
    actions.appendChild(delBtn);

    card.appendChild(thumb);
    card.appendChild(body);
    card.appendChild(actions);
    gallery.appendChild(card);
  });
}

async function deleteFile(storedName) {
  try {
    await fetch(`${API_BASE}/api/files/${storedName}`, { method: "DELETE" });
    loadGallery();
  } catch (err) {
    console.error("Delete failed:", err);
  }
}

// ---- Init ----
loadGallery();
