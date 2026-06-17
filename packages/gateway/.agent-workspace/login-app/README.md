# Login App

A full-stack login application built with React, Express, TypeScript, and Tailwind CSS.

## 🚀 Features

### Frontend (React + TypeScript)
- **Login Form** with email/password validation
- **Password visibility toggle** (show/hide)
- **Real-time form validation** with error messages
- **Loading states** with spinner animation
- **Dashboard** after successful login
- **Social login buttons** (Google, GitHub - UI only)
- **Remember me** and **Forgot password** links
- **Responsive design** with Tailwind CSS
- **Smooth animations** and transitions

### Backend (Express + TypeScript)
- **RESTful API** with Express
- **JWT authentication** with token verification
- **Password hashing** with bcryptjs
- **Input validation** with Zod schemas
- **CORS** configuration
- **Error handling** middleware

### Testing
- **Unit tests** for React components (LoginForm, Dashboard)
- **Unit tests** for custom hooks (useAuth)
- **Integration tests** for API endpoints
- **Form validation tests**
- **Authentication flow tests**

## 📁 Project Structure

```
login-app/
├── shared/                    # Shared types between client and server
│   └── types.ts
├── client/                    # React frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── LoginForm.tsx
│   │   │   └── Dashboard.tsx
│   │   ├── hooks/
│   │   │   └── useAuth.ts
│   │   ├── __tests__/
│   │   │   ├── LoginForm.test.tsx
│   │   │   ├── Dashboard.test.tsx
│   │   │   └── useAuth.test.ts
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css
│   ├── tailwind.config.js
│   └── vite.config.ts
├── server/                    # Express backend
│   ├── src/
│   │   ├── routes/
│   │   │   └── auth.ts
│   │   ├── middleware/
│   │   │   └── errorHandler.ts
│   │   ├── __tests__/
│   │   │   └── auth.test.ts
│   │   └── index.ts
│   └── vitest.config.ts
└── package.json               # Root package.json (workspaces)
```

## 🛠️ Installation

```bash
# Install all dependencies
npm install

# Or install separately
npm install -w client
npm install -w server
```

## 🏃‍♂️ Running the App

### Development Mode
```bash
# Start both client and server concurrently
npm run dev
```

This will start:
- **Client**: http://localhost:5173
- **Server**: http://localhost:3001

### Individual Commands
```bash
# Client only
npm run dev -w client

# Server only
npm run dev -w server
```

## 🧪 Running Tests

```bash
# Run all tests
npm test

# Run server tests only
npm run test:server

# Run client tests only
npm run test:client

# Run tests in watch mode
npm run test -w client -- --watch
npm run test -w server -- --watch
```

## 📝 Test Credentials

Use these credentials to test the login:

| Email | Password |
|-------|----------|
| user@example.com | password123 |
| admin@example.com | admin123 |

## 🔐 API Endpoints

### POST /api/auth/login
Login with email and password.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "1",
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

### GET /api/auth/verify
Verify JWT token (requires Authorization header).

**Headers:**
```
Authorization: Bearer <token>
```

### GET /api/health
Health check endpoint.

## 🎨 UI Features

- **Gradient background** with blur effects
- **Card-based layout** with shadows
- **Icon integration** throughout the UI
- **Focus states** for accessibility
- **Disabled states** during loading
- **Error alerts** with icons
- **Responsive design** for all screen sizes

## 🛡️ Security Features

- Password hashing with bcryptjs
- JWT token authentication
- Input validation with Zod
- CORS configuration
- Secure password storage (hashed, never plain text)

## 📦 Tech Stack

### Frontend
- React 18
- TypeScript
- Vite
- Tailwind CSS
- Vitest (testing)

### Backend
- Express
- TypeScript
- JWT (jsonwebtoken)
- bcryptjs
- Zod (validation)
- Vitest + Supertest (testing)

## 📄 License

MIT
