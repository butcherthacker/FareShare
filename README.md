# FareShare

Ride sharing app

## Quick Start

### Prerequisites

- [Python 3.8+](https://www.python.org/downloads/) (the script will automatically create a virtual environment)
- [Node.js 16+](https://nodejs.org/en/download)
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/Flapjacck/FareShare.git
cd FareShare

# One-time setup (installs npm dependencies for root and frontend)
npm install
npm run setup
```

### Running the Application

#### Option 1: Start Both Servers (Recommended)

```bash
npm start
# or
npm run dev
```

**The script will automatically:**

- Create a Python virtual environment (if not present)
- Upgrade pip to the latest version
- Install backend dependencies from requirements.txt
- Start the FastAPI backend on `http://localhost:8000`
- Start the Vite frontend on `http://localhost:5173`

#### Option 2: Start Servers Individually

```bash
# Backend only
npm run dev:backend

# Frontend only  
npm run dev:frontend
```

### Project Structure

- `backend/` - FastAPI backend server
- `frontend/` - React + Vite frontend

For more detailed information:

- [Backend README](./backend/README.md)
- [Frontend README](./frontend/README.md)

## Making changes to the code (Git workflow)

1. Before you do anything, make sure you're on the main branch and your code is up to date:

```bash
git switch main
git pull origin main
```

2. Make a new branch to make your changes on:

```bash
git checkout -b branch-name
```

3. Make your changes. You can check status with:

```bash
git status
```

4. Add your changes to the commit. Add the file path to the files you want to commit. Example:

```bash
git add public/home.html server.js
```

5. Commit your added changes:

```bash
git commit -m "text explaining commit changes"
```

6. Push. You might have to push upstream; if so, follow the terminal instructions (it will show the exact command):

```bash
git push
```

7. Repeat from step 1 after pushing your changes so you can make future changes.

