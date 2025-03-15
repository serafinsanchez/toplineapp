# Topline App Supabase Setup

This directory contains the Supabase configuration for the Topline app.

## Database Schema

The database schema is defined in the `migrations` directory. The initial schema creates:

1. `user_profiles` table - Stores application-specific user data, including roles and credit balances
2. `transactions` table - Logs all credit-related activities, such as purchases and uses of the stem extraction service

## Row Level Security (RLS)

Row Level Security policies are set up to ensure:

- Users can only view and update their own profiles
- Admins can view and update all profiles
- Users can only view their own transactions
- Admins can view all transactions

## Functions and Triggers

The following functions and triggers are set up:

1. `handle_new_user()` - Automatically creates a user profile when a new user signs up
2. `update_updated_at_column()` - Updates the `updated_at` field when a user profile is updated
3. `handle_credit_transaction()` - Handles credit transactions, ensuring users have enough credits for 'use' transactions

## Local Development

To start the local Supabase development environment:

```bash
supabase start
```

To stop the local Supabase development environment:

```bash
supabase stop
```

To reset the local Supabase development environment:

```bash
supabase reset
```

## Migrations

To create a new migration:

```bash
supabase migration new <migration_name>
```

To apply migrations:

```bash
supabase db reset
```

## Accessing the Supabase Studio

Once the local Supabase development environment is running, you can access the Supabase Studio at:

```
http://localhost:54323
``` 