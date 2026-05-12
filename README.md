# Voice AI Assistant

A full-stack voice-enabled AI assistant application built with Next.js frontend and Express.js backend.

## Project Structure

### Frontend (Next.js)
- Located in `client/`
- Uses App Router
- Tailwind CSS for styling

### Backend (Node.js + Express)
- Located in `server/`
- MongoDB for data persistence
- OpenRouter API integration

## Installation & Setup

### Frontend Setup
```bash
cd client
npm install
npm run dev
```

### Backend Setup
```bash
cd server
npm install
npm run dev
```

## Environment Variables

### Client (.env.local)
- `NEXT_PUBLIC_API_URL` - Backend API URL

### Server (.env)
- `MONGODB_URI` - MongoDB connection string
- `OPENROUTER_API_KEY` - OpenRouter API key
- `PORT` - Server port (default: 5000)
- `CORS_ORIGIN` - Frontend URL for CORS

## Tech Stack

- **Frontend**: Next.js, React, Tailwind CSS
- **Backend**: Node.js, Express.js
- **Database**: MongoDB
- **AI**: OpenRouter API
- **Voice**: Web Speech API (Browser native)
