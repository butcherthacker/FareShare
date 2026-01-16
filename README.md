# FareShare

Ride sharing app

<img width="2548" height="1298" alt="image" src="https://github.com/user-attachments/assets/f458641b-f829-45af-8821-35778bfa5dab" />


## Demo Video

https://github.com/user-attachments/assets/25696072-142e-447d-b973-da5d1830bc32


## Quick Start

### Prerequisites

- [Python 3.8+](https://www.python.org/downloads/) (the script will automatically create a virtual environment)
- [Node.js 16+](https://nodejs.org/en/download)
- npm or yarn
- [PostgreSQL 12+](https://www.postgresql.org/download/) - Database server

### Environment Configuration

Before running the application, you need to configure environment variables.

#### Backend Setup (.env)

Create a `.env` file in the `backend/` directory with the following configuration:

```env
# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/fareshare
DB_HOST=localhost
DB_NAME=fareshare
DB_USER=your_postgres_username
DB_PASSWORD=your_postgres_password
DB_PORT=5432

# API Configuration
API_HOST=0.0.0.0
API_PORT=8000
DEBUG=true

# Security (IMPORTANT: Change these for production!)
SECRET_KEY=your-secret-key-here-generate-a-random-string
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
VERIFICATION_TOKEN_EXPIRE_HOURS=24

# Email Configuration - Gmail SMTP
# For Gmail: Enable 2FA and generate an App Password at https://myaccount.google.com/apppasswords
MAIL_USERNAME=your-email@gmail.com
MAIL_PASSWORD=your-app-specific-password
MAIL_FROM=your-email@gmail.com
MAIL_FROM_NAME=FareShare
MAIL_PORT=587
MAIL_SERVER=smtp.gmail.com
MAIL_STARTTLS=True
MAIL_SSL_TLS=False
USE_CREDENTIALS=True
VALIDATE_CERTS=True

# Frontend URL (for email verification links)
FRONTEND_URL=http://localhost:5173
```

**Required Steps:**

1. **PostgreSQL Database:**
   - Install PostgreSQL and create a database named `fareshare`
   - Update `DB_USER` and `DB_PASSWORD` with your PostgreSQL credentials
   - Ensure the `DATABASE_URL` matches your database credentials

2. **Secret Key:**
   - Generate a secure random string for `SECRET_KEY`
   - Example: `openssl rand -hex 32` (or use any secure random generator)

3. **Email Configuration:**
   - Use Gmail with an App Password (requires 2FA enabled)
   - Or configure a different SMTP provider by updating `MAIL_SERVER`, `MAIL_PORT`, etc.

#### Frontend Setup (.env) - Optional

Create a `.env` file in the `frontend/` directory only if your backend runs on a different URL:

```env
VITE_API_BASE_URL=http://127.0.0.1:8000
```

**Note:** This is optional for local development (defaults to `http://127.0.0.1:8000`). Only needed if your backend runs on a different port/host or for production deployment.


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



