# Yap

Yap is a full-stack real-time chat application with user authentication, one-to-one messaging, online presence, profile updates, and image sharing. The project is split into a React + Vite frontend and an Express + Socket.IO backend, with MongoDB for persistence.

## Features

- Secure signup, login, logout, and session checks
- Real-time one-to-one messaging with Socket.IO
- Contact list and chat history views
- Image message uploads through Cloudinary
- Profile picture updates
- Online user tracking
- Welcome email delivery on signup through Resend
- Basic request protection through Arcjet middleware

## Tech Stack

- Frontend: React 19, Vite, Tailwind CSS, DaisyUI, Zustand, React Router, Axios, Socket.IO Client
- Backend: Node.js, Express, Socket.IO, MongoDB, Mongoose, JWT, bcryptjs, CORS, Cookie Parser
- Services: Cloudinary, Resend, Arcjet

## Project Structure

```text
Yap/
  backend/
    src/
      controllers/
      emails/
      lib/
      middleware/
      models/
      routes/
      server.js
  frontend/
    src/
      components/
      hooks/
      pages/
      store/
```

## Prerequisites

- Node.js 18 or newer
- MongoDB database
- Cloudinary account
- Resend account and API key
- Arcjet credentials if you plan to keep request protection enabled

## Environment Variables

Create a `.env` file inside `backend/` with the following values:

```env
PORT=5000
NODE_ENV=development
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
CLIENT_URL=http://localhost:5173

RESEND_API_KEY=your_resend_api_key
EMAIL_FROM=your_verified_sender@email.com
EMAIL_FROM_NAME=Yap

CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

ARCJET_API=your_arcjet_api_key
ARCJET_ENV=development
```

If you deploy the app, update `CLIENT_URL` to match the production frontend URL.

## Installation

1. Install dependencies for both apps:

```bash
npm install --prefix backend
npm install --prefix frontend
```

2. Add the backend environment variables.

## Running Locally

Run the backend and frontend in separate terminals.

### Backend

```bash
npm run dev --prefix backend
```

### Frontend

```bash
npm run dev --prefix frontend
```

The frontend will usually run on `http://localhost:5173`, and the backend on the port defined in `backend/.env`.

## Production Build

The root package includes a build script that installs dependencies and builds the frontend:

```bash
npm run build
```

To start the backend in production mode after building the frontend:

```bash
npm start
```

The backend serves the compiled frontend from `frontend/dist` when `NODE_ENV=production`.

## API Overview

### Authentication

- `POST /api/auth/signup`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `PUT /api/auth/update-profile`
- `GET /api/auth/check`

### Messages

- `GET /api/messages/contacts`
- `GET /api/messages/chats`
- `GET /api/messages/:id`
- `POST /api/messages/send/:id`

## Notes

- The backend uses cookie-based JWT authentication.
- Socket connections are authenticated before a user is marked online.
- Message uploads are stored in Cloudinary, while chat data and user data are stored in MongoDB.

## License

This project is licensed under the ISC License.