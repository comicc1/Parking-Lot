# Parking Lot

A sleek, responsive note-taking application built with a modern stack.


## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 20+
- [Modal CLI](https://modal.com/docs/guide) installed and configured (`pip install modal && modal setup`)

### Running Locally

#### 1. Start the Backend
```bash
cd backend
modal serve main.py
```
This will start the FastAPI app and provide a local URL (typically `http://localhost:8000` or a Modal-specific tunnel).

#### 2. Start the Frontend
```bash
cd frontend
npm install
npm run dev
```
By default, the frontend expects the API at `http://localhost:8000`. You can override this by setting `VITE_API_URL` in an `.env` file.

## Project Structure

- `frontend/`: React application and styles.
- `backend/`: FastAPI application and Modal deployment script.
- `.devcontainer/`: Standardized development environment configuration.

---

*Note: This is a prototype version with in-memory storage. Future iterations will include persistent storage using SQLite or a cloud database.*
