Database Tables
1. users Table
Description: Managed by NextAuth.js and Supabase authentication, this table stores core user information for registered users and admins.

Columns:
id (uuid, primary key): Unique identifier for each user.

name (string): User's name.

email (string, unique): User's email address.

email_verified (timestamp): Timestamp of email verification.

image (string): URL to user's profile image (optional).

created_at (timestamp): When the user account was created.

updated_at (timestamp): When the user account was last updated.

(Additional columns as per NextAuth schema may be included automatically by the adapter.)

Notes: This table is automatically set up and managed by the NextAuth.js Supabase adapter. It serves as the foundation for authentication.

2. user_profiles Table
Description: Stores application-specific user data, including roles and credit balances, linked to the users table.

Columns:
user_id (uuid, primary key, foreign key to users.id): References the user in the users table.

role (string, not null, default 'user'): User role, e.g., 'user' or 'admin'.

balance (integer, not null, default 0, check (balance >= 0)): Current credit balance for the user, with a constraint to prevent negative values.

created_at (timestamp, not null, default now()): When the profile was created.

updated_at (timestamp, not null, default now()): When the profile was last updated.

Notes: 
A record is created here when a user registers, with role set to 'user' by default and balance initialized to 0. Admins can have their role set to 'admin'.

The balance column tracks credits available for the stem extraction service.

3. transactions Table
Description: Logs all credit-related activities, such as purchases and uses of the stem extraction service.

Columns:
id (uuid, primary key): Unique identifier for each transaction.

user_id (uuid, foreign key to users.id, on delete cascade): References the user who performed the transaction.

type (string, not null): Type of transaction, e.g., 'purchase' (credit added) or 'use' (credit deducted).

amount (integer, not null): Number of credits added (positive, e.g., +10) or deducted (negative, e.g., -1).

stripe_transaction_id (string): Stripe transaction ID for purchases (optional, null for 'use' transactions).

created_at (timestamp, not null, default now()): When the transaction occurred.

Notes:
For a credit purchase, type is 'purchase', amount is positive (e.g., +10 for 10 credits), and stripe_transaction_id links to the Stripe payment.

For a service use, type is 'use', amount is -1, and stripe_transaction_id is null.

The on delete cascade ensures that if a user is deleted, their transaction records are also removed.

Additional Notes on Authentication Tables
Supabase with NextAuth.js automatically creates and manages the following standard tables for authentication:
accounts: Stores OAuth provider-specific data (if OAuth is used).

sessions: Tracks active user sessions.

verification_tokens: Manages email verification and password reset tokens.

These tables do not require manual design as they are handled by the NextAuth adapter.

Key Features Supported
User Authentication and Roles:
The users table handles authentication, while user_profiles adds role-based access ('user' or 'admin').

Admins can manage users or access additional features via application logic.

Credit System:
user_profiles.balance maintains each user's current credit balance.

Credits are added via purchases and deducted when the stem extraction service is used.

Transaction Logging:
The transactions table records all credit purchases (linked to Stripe) and service uses, providing an audit trail.

Guest Usage:
Guests get one free use, tracked client-side (e.g., via browser cookies or local storage), so no database tables are needed for them.

Implementation Considerations
Balance Management: 
Use Supabase transactions in the application code to ensure atomic updates:
For a 'purchase': Insert into transactions and increment user_profiles.balance.

For a 'use': Check balance > 0, then insert into transactions with amount = -1 and decrement balance.

This prevents negative balances and ensures consistency.

Indexes: Consider adding an index on transactions.user_id for faster queries if transaction volume grows.

Scalability: The design is minimal but extensible; a jobs table could be added later for tracking stem extraction history if needed.

This design meets the core requirements of the Topline web application while leveraging Supabase's features effectively.

