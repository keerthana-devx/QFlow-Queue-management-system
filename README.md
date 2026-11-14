# QFlow — Smart Queue Management

Replace physical queues with a digital token system. Managers issue tokens, call customers, and track service analytics — all from one dashboard.

---

## Tech Stack

| Layer    | Technology                        |
|----------|-----------------------------------|
| Frontend | React 18, Vite, Tailwind CSS v4   |
| Icons    | Lucide React                      |
| Charts   | Recharts                          |
| Backend  | Node.js, Express                  |
| Database | MongoDB (Mongoose)                |
| Auth     | JWT + bcryptjs                    |

---

## Quick Start

### Prerequisites
- Node.js 18+
- MongoDB running locally (or a MongoDB Atlas URI)

### 1. Backend

```bash
cd backend
# Copy env file and edit if needed
copy .env.example .env
npm install
npm run dev
```

Backend runs on http://localhost:5000

### 2. Frontend

```bash
cd frontend
# Copy env file
copy .env.example .env
npm install
npm run dev
```

Frontend runs on http://localhost:5173

---

## How It Works

### Token Generation
When a manager clicks "Issue Token", the backend finds the highest token number issued today for that manager and adds 1. Token 1 is the first of the day.

### Queue Order
Tokens are sorted by their `number` field (ascending). The lowest waiting number is always called next.

### Call Next
`POST /api/queue/call-next` — finds the lowest `waiting` token, marks it `serving`, and records `calledAt`.

### Complete Service
`POST /api/queue/complete/:id` — marks the token `completed` and records `completedAt`.

### Analytics
- Average service time = mean of `(completedAt - calledAt)` across all completed tokens
- Estimated wait = waiting count × average service time
- Weekly chart = MongoDB aggregation grouped by date

### Manager Data Isolation
Every token stores `managerId`. All queries filter by `req.user._id` (from JWT). One manager can never see another manager's queue.

### Authentication
- Passwords are hashed with bcryptjs (salt rounds = 10)
- Login returns a JWT valid for 7 days
- JWT is stored in localStorage and sent as `Authorization: Bearer <token>` on every request

---

## API Endpoints

| Method | Path                      | Auth | Description          |
|--------|---------------------------|------|----------------------|
| POST   | /api/auth/register        | No   | Create manager account |
| POST   | /api/auth/login           | No   | Login, get JWT       |
| GET    | /api/queue                | Yes  | Today's token list   |
| POST   | /api/queue/issue          | Yes  | Issue new token      |
| POST   | /api/queue/call-next      | Yes  | Call next waiting    |
| POST   | /api/queue/complete/:id   | Yes  | Complete a token     |
| DELETE | /api/queue/reset          | Yes  | Reset today's queue  |
| GET    | /api/analytics            | Yes  | Stats + weekly chart |

---

## Folder Structure

```
Qflow/
├── backend/
│   ├── config/db.js
│   ├── middleware/auth.js
│   ├── models/User.js
│   ├── models/Token.js
│   ├── routes/auth.js
│   ├── routes/queue.js
│   ├── routes/analytics.js
│   └── server.js
└── frontend/
    └── src/
        ├── components/Logo.jsx
        ├── components/Sidebar.jsx
        ├── components/Navbar.jsx
        ├── context/AuthContext.jsx
        ├── services/api.js
        └── pages/
            ├── Landing.jsx
            ├── Login.jsx
            ├── Register.jsx
            ├── Dashboard.jsx
            ├── Queue.jsx
            └── Analytics.jsx
```
