# VaultDrop

File/Image Upload UI connected to backend storage — Week 4, Task 1 (NeuroFive Solutions Internship).

## Features
- Drag-and-drop upload zone + styled file picker (click or "browse from device")
- File preview (image thumbnail or file-type icon) before upload
- Frontend validation: file type (JPG, PNG, GIF, WEBP, PDF, DOC, DOCX, TXT) and size (max 5MB)
- Real-time upload progress bar (XHR `upload.onprogress`)
- Backend (Node.js + Express + Multer) stores files locally in `/uploads`, with matching server-side validation
- Gallery of all uploaded files with image previews / download links, and delete option

## Tech Stack
- Backend: Node.js, Express, Multer (local disk storage)
- Frontend: Vanilla HTML/CSS/JS (no framework)

## Project Structure

```
vaultdrop/
├── backend/
│   ├── server.js
│   ├── package.json
│   └── uploads/        (created automatically, files stored here)
└── frontend/
    ├── index.html
    ├── style.css
    └── script.js
```

## Setup

```bash
cd backend
npm install
npm start
```

Server runs at `http://localhost:5000`. Express serves the `frontend/` folder as static files, so open `http://localhost:5000` in your browser — frontend and backend run from the same origin, no separate frontend server needed.

## API Endpoints

| Method | Route              | Description              |
|--------|---------------------|---------------------------|
| POST   | `/api/upload`        | Upload a file (multipart) |
| GET    | `/api/files`          | List all uploaded files   |
| DELETE | `/api/files/:name`   | Delete an uploaded file   |

## Notes
- Uploaded files are stored locally under `/uploads` (not committed to git — only `.gitkeep` is tracked).
- Max file size: 5MB. Validated on both frontend and backend.
