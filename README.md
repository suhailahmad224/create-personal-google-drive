# ☁️ My Drive

A Google Drive-inspired personal file management server built with Node.js.

This project mainly focuses on backend development, Node.js core APIs, file system operations, streams, file uploads and HTTP request handling.

## 🚀 Features

- 📤 Upload files
- 📥 Download files
- 👁️ Preview files in browser
- 📁 Create folders
- 📂 Open nested folders
- ⬅️ Navigate back through folders
- ✏️ Rename files and folders
- 🗑️ Delete files and folders
- 🔍 Recursive file and folder search
- 📦 MIME type detection
- 🌊 Stream-based file handling
- 🖥️ Google Drive-inspired web interface

## 🛠️ Tech Stack

- Node.js
- HTTP
- fs/promises
- FileHandle
- Readable Streams
- Busboy
- mime-types
- HTML
- CSS

## 🧠 Backend Highlights

### File Upload

Files are uploaded using `multipart/form-data` and parsed using Busboy.

The uploaded data is streamed directly to the filesystem instead of loading the complete file into memory.

### File Download

Files can be downloaded using the HTTP `Content-Disposition` header.

### File Preview

The `mime-types` package is used to determine the correct `Content-Type`.

This allows supported files such as images, videos and PDFs to be displayed correctly in the browser.

### File System Operations

The backend uses Node.js `fs/promises` APIs for file management:

- `open()`
- `readdir()`
- `mkdir()`
- `rename()`
- `rm()`

### Streams

Readable and writable streams are used for handling files efficiently.

Example:

```js
const readstream = filehandle.createReadStream()
readstream.pipe(res)

📂 Project Structure
create-personal-google-drive/
│
├── storage/
│   └── .gitkeep
│
├── boilerplate.html
├── script.js
├── package.json
├── package-lock.json
├── .gitignore
└── README.md


⚙️ Installation
Clone the repository:
git clone https://share.google/usUcnrmkvdWygZIj7

Go inside the project:
cd create-personal-google-drive

Install dependencies:
npm install

▶️ Run the Server
node script.js
http://localhost:4000

🔄 Backend Flow
Browser
   ↓
HTTP Request
   ↓
Node.js HTTP Server
   ↓
Route Handling
   ↓
File System / Streams
   ↓
Storage

Upload Flow:
Browser
   ↓
multipart/form-data
   ↓
Busboy
   ↓
Writable Stream
   ↓
storage/

Download / Preview Flow:
Browser
   ↓
HTTP Request
   ↓
fs.open()
   ↓
FileHandle
   ↓
Readable Stream
   ↓
HTTP Response

🎯 Project Goal
The main goal of this project is to understand how file-based backend systems work using Node.js core APIs.

Instead of relying on a framework for the main server logic, this project uses Node.js HTTP, filesystem APIs and streams to implement the core functionality.

📌 Future Improvements

File size limits
Path traversal protection
Better error handling
Progress indicator for uploads
File metadata
Cloud storage support
