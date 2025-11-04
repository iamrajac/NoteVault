# NoteVault – Workspace Notes & Milestones

A collaborative workspace management system for managing projects, milestones, tasks, and notes with role-based access control.

## Features

- **Three User Roles**: Admin, Team Lead, and Employee
- **Authentication**: JWT-based authentication with Spring Security
- **Project Management**: Create and manage projects with milestones and tasks
- **Task Assignment**: Assign tasks to employees with deadlines and priorities
- **Notes System**: Add notes to tasks and projects
- **Dashboard**: Role-specific dashboards with statistics and charts
- **Progress Tracking**: Visual progress indicators for projects and tasks

## Tech Stack

### Backend
- Java 17
- Spring Boot 3.2.0
- Spring Security with JWT
- Spring Data JPA
- MySQL 8.0
- Maven

### Frontend
- React 18
- React Router
- Axios
- Chart.js
- CSS3

## Prerequisites

1. **Java 17** or higher
2. **Maven** (already installed)
3. **MySQL 8.0** or higher
4. **Node.js 16+** and npm

## Setup Instructions

### 1. Database Setup

Open MySQL Command Line or MySQL Workbench and run:

```sql
CREATE DATABASE notevault_db;
```

Or simply start the backend - the database will be created automatically if `createDatabaseIfNotExist=true` is in the connection string.

### 2. Backend Setup

1. Navigate to backend directory:
```powershell
cd notevault-backend
```

2. Update database credentials in `src/main/resources/application.properties` if needed:
```properties
spring.datasource.username=root
spring.datasource.password=root
```

3. Build and run the backend:
```powershell
mvn clean install
mvn spring-boot:run
```

The backend will start on `http://localhost:8080`

**Default Admin Credentials:**
- Username: `admin`
- Password: `admin123`

### 3. Frontend Setup

1. Navigate to frontend directory:
```powershell
cd ..\notevault-frontend
```

2. Install dependencies:
```powershell
npm install
```

3. Start the development server:
```powershell
npm start
```

The frontend will start on `http://localhost:3000`

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login

### Users
- `POST /api/admin/users/teamlead` - Create Team Lead (Admin only)
- `POST /api/teamlead/users/employee` - Create Employee (Team Lead)
- `GET /api/users` - Get all users
- `GET /api/teamlead/employees` - Get team members
- `GET /api/users/{id}` - Get user by ID
- `DELETE /api/admin/users/{id}` - Delete user (Admin only)

### Projects
- `POST /api/projects` - Create project (Team Lead)
- `GET /api/projects` - Get all projects
- `GET /api/projects/my` - Get my projects
- `GET /api/projects/{id}` - Get project by ID
- `PUT /api/projects/{id}` - Update project
- `DELETE /api/projects/{id}` - Delete project

### Milestones
- `POST /api/milestones` - Create milestone
- `GET /api/milestones` - Get all milestones
- `GET /api/milestones/project/{projectId}` - Get milestones by project
- `GET /api/milestones/{id}` - Get milestone by ID
- `PUT /api/milestones/{id}` - Update milestone
- `DELETE /api/milestones/{id}` - Delete milestone

### Tasks
- `POST /api/tasks` - Create task (Team Lead)
- `GET /api/tasks` - Get all tasks
- `GET /api/tasks/my` - Get my assigned tasks
- `GET /api/tasks/milestone/{milestoneId}` - Get tasks by milestone
- `GET /api/tasks/{id}` - Get task by ID
- `PUT /api/tasks/{id}` - Update task
- `DELETE /api/tasks/{id}` - Delete task

### Notes
- `POST /api/notes` - Create note
- `GET /api/notes/task/{taskId}` - Get notes by task
- `GET /api/notes/project/{projectId}` - Get notes by project
- `GET /api/notes/{id}` - Get note by ID
- `PUT /api/notes/{id}` - Update note
- `DELETE /api/notes/{id}` - Delete note

### Dashboard
- `GET /api/dashboard/stats` - Get dashboard statistics

## User Roles & Permissions

### Admin
- Create Team Lead accounts
- View all users and projects
- Full system access

### Team Lead
- Create Employee accounts under their workspace
- Create and manage projects, milestones, and tasks
- Assign tasks to employees
- View team progress

### Employee
- View assigned tasks
- Update task progress and status
- Add notes and comments to tasks
- View projects in their workspace

## Project Structure

```
NoteVault/
├── notevault-backend/
│   ├── src/
│   │   ├── main/
│   │   │   ├── java/com/notevault/
│   │   │   │   ├── config/         # Security & Config
│   │   │   │   ├── controller/     # REST Controllers
│   │   │   │   ├── dto/            # Data Transfer Objects
│   │   │   │   ├── entity/         # JPA Entities
│   │   │   │   ├── repository/     # Data Repositories
│   │   │   │   ├── security/       # JWT & Security
│   │   │   │   └── service/        # Business Logic
│   │   │   └── resources/
│   │   │       └── application.properties
│   │   └── pom.xml
│   └── README.md
├── notevault-frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/             # React Components
│   │   ├── pages/                  # Page Components
│   │   ├── services/               # API Services
│   │   └── App.js
│   └── package.json
└── README.md
```

## Troubleshooting

### Backend Issues

1. **Port already in use**: Change the port in `application.properties`:
```properties
server.port=8081
```

2. **Database connection error**: Verify MySQL is running and credentials are correct

3. **JWT token errors**: Check the secret key length in `application.properties`

### Frontend Issues

1. **CORS errors**: Ensure backend CORS configuration includes `http://localhost:3000`

2. **API connection refused**: Verify backend is running on port 8080

## Development

- Backend runs on `http://localhost:8080`
- Frontend runs on `http://localhost:3000`
- All API requests go through `/api` prefix

## License

MIT License
