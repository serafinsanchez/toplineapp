# Topline App

Topline is a web application that allows users to extract stems from audio files. Users can upload audio files, and the application will extract the stems (vocals, drums, bass, etc.) from the file.

## Features

- User authentication with NextAuth.js and Supabase
- Credit system for stem extraction
- Payment processing with Stripe
- File upload and processing
- Admin dashboard for managing users and credits

## Tech Stack

- Next.js
- Supabase (PostgreSQL)
- NextAuth.js
- Stripe
- Docker

## Getting Started

### Prerequisites

- Node.js 18+
- Docker Desktop
- Supabase CLI

### Installation

1. Clone the repository:

```bash
git clone https://github.com/serafinsanchez/toplineapp.git
cd toplineapp
```

2. Install dependencies:

```bash
npm install
```

3. Set up environment variables:

Copy the `.env.local.example` file to `.env.local` and fill in the required values.

4. Start Docker Desktop

5. Initialize Supabase:

```bash
./scripts/init-supabase.sh
```

6. Start the development server:

```bash
npm run dev
```

7. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Database Schema

The database schema is defined in the `supabase/migrations` directory. The initial schema creates:

1. `user_profiles` table - Stores application-specific user data, including roles and credit balances
2. `transactions` table - Logs all credit-related activities, such as purchases and uses of the stem extraction service

## API Endpoints

- `/api/auth/[...nextauth]` - Authentication endpoints
- `/api/upload` - File upload endpoint
- `/api/extract` - Stem extraction endpoint
- `/api/credits` - Credit management endpoints
- `/api/profile` - User profile endpoints

## License

This project is private and proprietary.
