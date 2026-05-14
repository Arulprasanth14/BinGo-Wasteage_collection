# 🗑️ BinGo — Smart Waste Collection Management System

<p align="center">
  <img src="https://img.shields.io/badge/Platform-Android%20%7C%20iOS-green?style=for-the-badge&logo=expo" />
  <img src="https://img.shields.io/badge/Backend-FastAPI-009688?style=for-the-badge&logo=fastapi" />
  <img src="https://img.shields.io/badge/Database-PostgreSQL-336791?style=for-the-badge&logo=postgresql" />
  <img src="https://img.shields.io/badge/Frontend-React%20Native%20%7C%20Expo-61DAFB?style=for-the-badge&logo=react" />
  <img src="https://img.shields.io/badge/Language-TypeScript-3178C6?style=for-the-badge&logo=typescript" />
</p>

---

## 📖 Overview

**BinGo** is a full-stack **Smart Waste Collection Management System** built as a mini-project. It connects **Citizens**, **Waste Collection Workers**, and **Administrators** through a unified mobile application and REST API, enabling efficient scheduling, real-time tracking, and management of waste pickup requests.

The system features three distinct user roles with separate interfaces:
- 👤 **User (Citizen)** — Request waste pickups, track workers in real-time, provide feedback.
- 🚛 **Worker** — View assigned pickups, update pickup status, broadcast live GPS location.
- 🛡️ **Admin** — Manage workers, monitor all pickups, assign/reassign tasks, and view dashboard statistics.

---

## 🏗️ Project Structure

```
mini project/
├── backend/                    # FastAPI REST API (Python)
│   ├── main.py                 # App entry point & middleware
│   ├── database.py             # PostgreSQL connection (SQLAlchemy)
│   ├── models.py               # ORM models (User, Pickup, Feedback, WorkerLocation)
│   ├── schema.py               # Pydantic request/response schemas
│   ├── auth.py                 # Registration & JWT login
│   ├── pickup.py               # Pickup lifecycle endpoints
│   ├── worker.py               # Worker-facing endpoints
│   ├── admin.py                # Admin dashboard endpoints
│   ├── location.py             # Location logging
│   └── test_server.py          # Server connectivity test
│
├── frontend/
│   └── bingo-app/              # Expo (React Native) Mobile App
│       ├── app/
│       │   ├── index.tsx       # Login screen (entry point)
│       │   ├── register.tsx    # New user registration
│       │   ├── (user-tabs)/    # Citizen module screens
│       │   │   ├── index.tsx       # Home — Request pickup
│       │   │   ├── pickup.tsx      # Active pickup tracker
│       │   │   ├── history.tsx     # Pickup history
│       │   │   └── profile.tsx     # User profile
│       │   ├── (worker-tabs)/  # Worker module screens
│       │   │   ├── worker-home.tsx     # Assigned pickups list
│       │   │   └── worker-track.tsx    # Live GPS tracking & status update
│       │   └── (admin)/        # Admin module screens
│       │       ├── dashboard.tsx   # Stats overview
│       │       ├── workers.tsx     # Manage workers
│       │       └── pickups.tsx     # Manage & assign pickups
│       ├── config/
│       │   └── api.ts          # Central API base URL configuration
│       └── package.json
│
├── database/
│   ├── bingo_db.sql            # Initial schema (CREATE TABLEs)
│   └── migration_worker_user_id.sql  # Migration — adds worker_user_id to assignments
│
└── README.md
```

---

## ✨ Features

### 👤 User (Citizen) Module
| Feature | Description |
|---|---|
| 📍 Request Pickup | Submit a waste pickup with GPS coordinates and waste type |
| 📦 Active Pickup Tracker | View the current pickup status (Pending → Assigned → In Progress → Completed) |
| 🗺️ Live Worker Tracking | See the assigned worker's live GPS location on a map |
| 📜 Pickup History | Browse all past pickup requests and their final statuses |
| ⭐ Feedback System | Submit a 1–5 star rating with a comment after a completed pickup |

### 🚛 Worker Module
| Feature | Description |
|---|---|
| 📋 Assigned Pickups | View all pickups assigned by the admin |
| 🔄 Status Updates | Change pickup status: `ASSIGNED → IN_PROGRESS → COMPLETED` |
| 📡 Live GPS Broadcast | Share real-time coordinates so users can track the worker on map |
| 🗺️ Navigate to Pickup | Open Maps app directly at the customer's pinned location |

### 🛡️ Admin Module
| Feature | Description |
|---|---|
| 📊 Dashboard Stats | Total users, workers, and pickup counts by status |
| 👷 Worker Management | Create new worker accounts, view worker list, delete workers |
| 📦 Pickup Overview | View all pickups (all statuses) with user and worker names |
| ✅ Assign / Reassign | Assign any pending pickup to a worker; reassign if needed |
| 🔄 Auto-reset on Delete | Deleting a worker resets their active pickups back to `PENDING` |

---

## 🛠️ Tech Stack

### Backend
| Technology | Purpose |
|---|---|
| **Python 3.10+** | Core language |
| **FastAPI** | High-performance REST API framework |
| **SQLAlchemy** | ORM for database interaction |
| **PostgreSQL** | Primary relational database |
| **python-jose** | JWT token generation & validation |
| **passlib (bcrypt)** | Secure password hashing |
| **Uvicorn** | ASGI server |

### Frontend
| Technology | Purpose |
|---|---|
| **React Native 0.81** | Cross-platform mobile UI |
| **Expo ~54** | Managed workflow & tooling |
| **Expo Router v6** | File-based navigation |
| **TypeScript** | Type-safe development |
| **react-native-maps** | Interactive maps & GPS visualization |
| **expo-location** | Device GPS access |
| **AsyncStorage** | Local JWT token persistence |
| **expo-linear-gradient** | UI gradients |

---

## 🗄️ Database Schema

```
users            — Stores all accounts (USER / WORKER / ADMIN roles)
pickups          — Waste pickup requests submitted by users
assignments      — Links a pickup to a specific worker (via worker_user_id)
worker_locations — Live GPS coordinates posted by workers during pickups
feedback         — User ratings & comments for completed pickups
status_logs      — Audit trail of pickup status changes
```

### Entity Relationships
```
users ──< pickups       (one user → many pickup requests)
pickups ──< assignments (one pickup → one assignment)
users ──< assignments   (one worker → many assignments)
pickups ──< worker_locations (one pickup → one live location row)
pickups ──< feedback    (one pickup → one feedback)
```

### Pickup Status Flow
```
PENDING → ASSIGNED → IN_PROGRESS → COMPLETED
```

---

## 🚀 Getting Started

### Prerequisites
- Python 3.10+
- Node.js 18+ & npm
- PostgreSQL 14+
- Expo Go app on a mobile device (or Android/iOS emulator)

---

### 1️⃣ Database Setup

```sql
-- Run bingo_db.sql to create the database and tables
psql -U postgres -f database/bingo_db.sql

-- Then run the migration to add worker_user_id to assignments
psql -U postgres -d bingo_db -f database/migration_worker_user_id.sql
```

---

### 2️⃣ Backend Setup

```bash
cd backend

# (Optional) Create a virtual environment
python -m venv venv
venv\Scripts\activate       # Windows
# source venv/bin/activate  # macOS / Linux

# Install dependencies
pip install fastapi uvicorn sqlalchemy psycopg2-binary passlib python-jose python-dotenv bcrypt

# Configure environment variables (or edit database.py defaults)
# DB_USER=postgres
# DB_PASSWORD=your_password
# DB_HOST=localhost
# DB_PORT=5432
# DB_NAME=bingo_db
# JWT_SECRET=bingo_secret

# Start the API server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

> ✅ The API will be available at `http://localhost:8000`  
> 📚 Interactive docs: `http://localhost:8000/docs`

---

### 3️⃣ Frontend Setup

```bash
cd frontend/bingo-app

# Install dependencies
npm install

# ⚠️ IMPORTANT: Update the API base URL to your local machine's Wi-Fi IP address
# Edit: config/api.ts
#   export const API_BASE_URL = 'http://<YOUR_LOCAL_IP>:8000';

# Start the Expo development server
npm start
# or for LAN access (required for physical devices)
expo start --host lan
```

Then scan the QR code with the **Expo Go** app on your phone.

---

## 🔑 API Reference

All protected endpoints require a JWT in the Authorization header:
```
Authorization: Bearer <token>
```

### Auth
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/register` | Register a new user account |
| `POST` | `/login` | Login & receive JWT token |

### User (Pickup)
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/pickup/create` | Submit a new pickup request |
| `GET` | `/pickup/active` | Get the current active pickup |
| `GET` | `/pickup/history` | Get all past pickups |
| `GET` | `/pickup/{id}` | Get detail of a single pickup |
| `GET` | `/pickup/{id}/worker-location` | Get assigned worker's live GPS |
| `POST` | `/pickup/{id}/feedback` | Submit feedback for a completed pickup |
| `GET` | `/pickup/{id}/feedback` | Check if feedback was submitted |

### Worker
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/worker/assigned` | Get all pickups assigned to this worker |
| `GET` | `/worker/pickup/{id}` | Get details of a specific assigned pickup |
| `PATCH` | `/worker/pickup/{id}/status` | Update pickup status |
| `POST` | `/worker/location` | Post live GPS coordinates |

### Admin
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/admin/stats` | Dashboard statistics |
| `GET` | `/admin/users` | List all registered users |
| `GET` | `/admin/workers` | List all workers |
| `POST` | `/admin/create-worker` | Create a worker account |
| `DELETE` | `/admin/worker/{id}` | Delete a worker |
| `GET` | `/admin/pending-pickups` | List only pending pickups |
| `GET` | `/admin/all-pickups` | List all pickups (all statuses) |
| `POST` | `/admin/pickup/{id}/assign` | Assign a pickup to a worker |
| `POST` | `/admin/pickup/{id}/reassign` | Reassign a pickup to a different worker |

---

## 👥 User Roles

| Role | How to Create | Access |
|---|---|---|
| `USER` | Self-register via `/register` | Citizen module |
| `WORKER` | Admin creates via dashboard or `/admin/create-worker` | Worker module |
| `ADMIN` | Manually set in the database: `UPDATE users SET role='ADMIN' WHERE email='...'` | Admin module |

---

## 📱 App Navigation

```
Login Screen
    ├── Register (new user)
    └── [Role-based redirect after login]
         ├── USER    → (user-tabs) Home, Pickup, History, Profile
         ├── WORKER  → (worker-tabs) Assigned Pickups, Tracking
         └── ADMIN   → (admin) Dashboard, Workers, Pickups
```

---

## ⚙️ Configuration

| File | Setting | Description |
|---|---|---|
| `backend/database.py` | `DB_USER`, `DB_PASSWORD`, etc. | PostgreSQL connection credentials |
| `backend/auth.py` | `JWT_SECRET` | Secret key for JWT signing |
| `frontend/bingo-app/config/api.ts` | `API_BASE_URL` | Backend server IP/port (update on each network change) |

> 💡 **Tip:** Whenever you connect to a different Wi-Fi network, update `API_BASE_URL` in `config/api.ts` with your machine's new local IP address (e.g., `192.168.x.x:8000`).

---

## 🔒 Security

- Passwords are hashed using **bcrypt** before storage — never stored in plain text.
- All protected API routes validate a **HS256 JWT** token.
- Role-based access control is enforced server-side for `USER`, `WORKER`, and `ADMIN` roles.
- Workers can only modify pickups assigned to them; users can only view their own pickups.

---

## 🐞 Known Limitations / Future Improvements

- [ ] Push notifications for real-time pickup status updates
- [ ] Offline mode support with sync on reconnect
- [ ] Admin analytics dashboard with charts
- [ ] Multiple workers per pickup (for large-scale waste collection)
- [ ] Environment-based API URL config (no manual IP update needed)
- [ ] Production deployment guide (Docker + hosted PostgreSQL)

---

## 🎓 Academic Context

This project was developed as a **mini-project** to demonstrate full-stack mobile application development, covering:
- RESTful API design with **FastAPI**
- Relational database modelling with **PostgreSQL**
- Cross-platform mobile development with **React Native & Expo**
- Role-based authentication using **JWT**
- Real-time GPS tracking via polling

---

## 📄 License

This project is for educational/academic purposes.

---

<p align="center">Made with ❤️ | BinGo — Waste Collection Simplified</p>
