# ReachInbox Email Scheduler / Outbox Softlabs Project

## Table of Contents
1. [Features Implemented](#features-implemented)
2. [Architecture Overview](#architecture-overview)
3. [Setup and Environment Variables](#setup-and-environment-variables)
4. [How to Run with Docker (Recommended)](#how-to-run-with-docker-recommended)
5. [How to Run Backend](#how-to-run-backend)
6. [How to Run Frontend](#how-to-run-frontend)

## Features Implemented

### Backend
* Scheduler: Manages and schedules email sending jobs using BullMQ.
* Persistence: Ensures that jobs and states are preserved across restarts utilizing Redis and the database.
* Rate Limiting: Controls the flow of incoming requests to prevent abuse.
* Concurrency: Handles multiple email tasks concurrently through BullMQ workers.

### Frontend
* Login: User authentication interface.
* Dashboard: Central view for system metrics and quick actions.
* Compose: Interface to create and schedule new email jobs.
* Tables: Data grids to view past, pending, and scheduled jobs.

## Architecture Overview

### How Scheduling Works
The application leverages BullMQ, a Redis-based queue for Node.js, to handle job scheduling. When a user composes an email and sets a scheduled time, a job is added to the BullMQ queue with a delay parameter. The worker process listens to this queue and processes the job only when the scheduled time arrives, sending the email via Ethereal Email.

### How Persistence on Restart is Handled
Persistence is primarily managed by Redis, which stores the queue state, and a relational database, which stores job metadata and application data. If the backend or worker process restarts, BullMQ will automatically resume processing jobs from the queue based on their state in Redis. The database serves as the source of truth for historical records and user data.

### How Rate Limiting & Concurrency are Implemented
* Rate Limiting: Incoming API requests are rate-limited using standard middleware to prevent overwhelming the server and ensure fair usage among users.
* Concurrency: Concurrency is managed by the BullMQ worker configuration. The worker is set up to process a specific number of jobs concurrently. This ensures that the system can process multiple scheduled emails at once without blocking the main event loop, utilizing asynchronous Node.js features.

## Setup and Environment Variables

### Environment Variables
You need to configure the environment variables for both the backend and the frontend.

Backend (`backend/.env`):
```env
# Database connection string
DATABASE_URL="your_database_url_here"

# Redis connection
REDIS_URL="redis://localhost:6379"
REDIS_HOST="localhost"
REDIS_PORT=6379

# Ethereal Email Configuration
ETHEREAL_USER="your_ethereal_user"
ETHEREAL_PASS="your_ethereal_password"

# Server Configuration
PORT=3001
```

Frontend (`frontend/.env.local`):
```env
NEXT_PUBLIC_API_URL="http://localhost:3001"
```

### How to set up Ethereal Email
1. Go to ethereal.email.
2. Click on "Create Ethereal Account".
3. Copy the provided username and password.
4. Paste them into your `backend/.env` file under `ETHEREAL_USER` and `ETHEREAL_PASS`.

## How to Run with Docker (Recommended)

The easiest way to run the entire application (Backend, Frontend, Redis, and Database) is using Docker.

1. Ensure you have Docker and Docker Compose installed on your system.
2. Make sure you have configured your environment variables in `backend/.env` and `frontend/.env.local` as described above.
3. In the root directory of the project, run:
   ```bash
   docker compose up -d
   ```
4. This will automatically spin up:
   * **Backend & Worker**: accessible at `http://localhost:3001`
   * **Frontend**: accessible at `http://localhost:3000`
   * **Redis & PostgreSQL**: running in the background for the backend.

If you prefer to run the services manually without Docker, follow the steps below.

## How to Run Backend

The backend consists of an Express API, a Database (accessed via Prisma), Redis, and a BullMQ worker.

1. Ensure Redis is running on your machine (or update your `REDIS_URL` or use `docker compose up -d`).
2. Navigate to the backend directory:
   ```bash
   cd backend
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Set up the database schema:
   ```bash
   npx prisma generate
   npx prisma db push
   ```
5. Start the backend server and worker:
   ```bash
   npm run dev
   ```

## How to Run Frontend

The frontend is a Next.js application.

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
4. Open your browser and navigate to `http://localhost:3000`.
