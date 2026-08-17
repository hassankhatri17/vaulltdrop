const express = require("express");
const multer = require("multer");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 5000;
const UPLOAD_DIR = path.join(__dirname, "uploads");
const FRONTEND_DIR = path.join(__dirname, "..", "frontend");

if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(UPLOAD_DIR));
app.use(express.static(FRONTEND_DIR));

// ---- Validation config (kept in sync with frontend) ----
const ALLOWED_MIME_TYPES = [
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

// ---- Multer storage config ----
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path
      .basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .slice(0, 50);
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${base}-${unique}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("UNSUPPORTED_FILE_TYPE"));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE },
});

// ---- Routes ----

// Upload a single file
app.post("/api/upload", (req, res) => {
  upload.single("file")(req, res, (err) => {
    if (err) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ success: false, message: "File exceeds 5MB limit." });
      }
      if (err.message === "UNSUPPORTED_FILE_TYPE") {
        return res.status(400).json({ success: false, message: "Unsupported file type." });
      }
      return res.status(400).json({ success: false, message: "Upload failed." });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file received." });
    }

    const fileData = {
      originalName: req.file.originalname,
      storedName: req.file.filename,
      mimeType: req.file.mimetype,
      size: req.file.size,
      url: `/uploads/${req.file.filename}`,
      uploadedAt: new Date().toISOString(),
    };

    res.status(201).json({ success: true, file: fileData });
  });
});

// List all uploaded files
app.get("/api/files", (req, res) => {
  fs.readdir(UPLOAD_DIR, (err, files) => {
    if (err) return res.status(500).json({ success: false, message: "Could not read uploads." });

    const list = files
      .filter((f) => f !== ".gitkeep")
      .map((filename) => {
        const stats = fs.statSync(path.join(UPLOAD_DIR, filename));
        return {
          storedName: filename,
          url: `/uploads/${filename}`,
          size: stats.size,
          uploadedAt: stats.birthtime,
        };
      })
      .sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));

    res.json({ success: true, files: list });
  });
});

// Delete a file (bonus - keeps demo clean)
app.delete("/api/files/:storedName", (req, res) => {
  const filePath = path.join(UPLOAD_DIR, req.params.storedName);
  if (!filePath.startsWith(UPLOAD_DIR)) {
    return res.status(400).json({ success: false, message: "Invalid path." });
  }
  fs.unlink(filePath, (err) => {
    if (err) return res.status(404).json({ success: false, message: "File not found." });
    res.json({ success: true });
  });
});

app.get("*", (req, res) => {
  res.sendFile(path.join(FRONTEND_DIR, "index.html"));
});

app.listen(PORT, () => {
  console.log(`VaultDrop server running on http://localhost:${PORT}`);
});
