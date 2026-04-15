# NoteVault

NoteVault is a modern, real-time collaborative workspace web application. It features real-time note editing, workspace management, task tracking, interactive knowledge graphs, and workspace audting trails.

## Tech Stack
- **Frontend**: Next.js, React, TailwindCSS, Framer Motion
- **Backend**: Node.js, Express.js
- **Database**: MySQL, Prisma ORM
- **Real-time Engine**: Socket.io

## Prerequisites
- Node.js (v18 or higher recommended)
- MySQL Server (running locally or remotely)
- Git

---

## 🚀 First-Time Setup Instructions

Follow these steps if you have just cloned the repository and are running NoteVault for the very first time.

### 1. Clone the Repository
```bash
git clone https://github.com/heysuhas/sepmnotevault.git
cd sepmnotevault
```

### 2. Configure the Backend & Database
1. Navigate to the backend folder:
   ```bash
   cd backend
   ```
2. Install the necessary Node.js dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the `backend` directory based on the following template (replace `root:admin@localhost:3306` with your actual MySQL credentials):
   ```env
   DATABASE_URL="mysql://root:admin@localhost:3306/notevault_db"
   JWT_SECRET="your-super-secret-jwt-key"
   PORT=5069
   ```
4. Push the Prisma schema to create the tables in your MySQL database, and generate the Prisma client:
   ```bash
   npx prisma db push
   npx prisma generate
   ```
5. Start the backend Node server (this will also initialize Socket.io):
   ```bash
   npm run dev
   ```

### 3. Configure the Frontend
1. Open a **new, separate terminal window** and navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install the necessary Next.js dependencies:
   ```bash
   npm install
   ```
3. Start the Next.js development server:
   ```bash
   npm run dev
   ```

### 4. Open the Application
Once both terminal windows show that servers are running locally:
- Backend: `http://localhost:5069`
- Frontend: `http://localhost:3000`

Open `http://localhost:3000` in your web browser. You can now register your first admin account and create a Workspace!

---

## ⚡ Running Second-Time Onwards

If you have already performed the "First-Time Setup" and just want to boot up the application for development or usage again:

1. **Start the Database**: Ensure your MySQL server service is actively running on your machine.
2. **Start the Backend**:
   Open a terminal, navigate to the `backend` folder, and run:
   ```bash
   npm run dev
   ```
3. **Start the Frontend**:
   Open a second terminal, navigate to the `frontend` folder, and run:
   ```bash
   npm run dev
   ```
4. Open your browser to `http://localhost:3000`. Your previous login sessions and workspace data will all be preserved.
