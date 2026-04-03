# NCB Tracker - Advanced Routine & Habit Tracker

![NCB Tracker Overview](https://img.shields.io/badge/Status-Complete-success)
![Developer](https://img.shields.io/badge/Developer-Naveena_C_B-blueviolet)

NCB Tracker is a modern, dark-themed, daily routine tracking application designed to enforce discipline and help users build long-term positive habits. It features a robust full-stack architecture built to log streaks, visualize productivity over time, and securely persist user data.

**Developed independently by Naveena C B.**

---

## 🌟 Key Features

1. **Authentication & Security** 
   - Complete custom JWT authentication handling user registration and secure login.
   - Passwords are encrypted on the backend using `bcryptjs`.
2. **Dynamic Dashboard & Analytics**
   - Implements `recharts` to provide visual metrics of your weekly and monthly check-in history.
   - Deep insights into metrics like "Perfect Days," "Average Completion," and identifying your "Most Missed Tasks."
3. **Database Cloud Syncing**
   - Seamless data integration with a MongoDB backend schema.
   - Routines, notes, and records persist permanently across restarts and sessions.
4. **Motivational Engine**
   - Displays dynamic rotating quotes every day inside the dashboard specifically chosen to cultivate discipline.

---

## 🛠️ Tech Stack

### Frontend
- **Framework:** React 18 (TypeScript) with Vite
- **Styling:** Custom Vanilla CSS abstractions with Glassmorphism animations
- **Data Visualization:** Recharts
- **State:** React Hooks targeting JWT interception

### Backend
- **Environment:** Node.js / Express
- **Database:** MongoDB (Local Compass using Mongoose ORM)
- **Security:** `bcryptjs` and `jsonwebtoken`

---

## 🚀 How to Run

Because this is a full-stack application, there are two servers that must be running simultaneously.

### 1. Start the Backend API (Database Service)
Open a terminal in the `backend/` directory and run:
```bash
npm install
npm run dev
```
*(The backend runs on `http://localhost:5000` and automatically connects to MongoDB Compass at `127.0.0.1:27017`)*

### 2. Start the Frontend (React UI)
Open a terminal in the root directory of the project and run:
```bash
npm install
npm run dev -- --port 3000
```
*(The React app runs on `http://localhost:3000`)*

---

*“Consistency Beats Motivation. No Excuses. Just Results.” — Designed by Naveena C B*
