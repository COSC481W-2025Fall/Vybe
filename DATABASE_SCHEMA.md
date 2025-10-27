# Vybe Database Schema & User Flow

## Complete User Flow

### 1. Sign Up / Sign In
- User visits `/sign-in`
- Enters email and password
- **On Sign Up:**
  - Account created in `auth.users` (Supabase Auth)
  - Trigger automatically creates entry in `users` table
  - Username defaults to email prefix (e.g., `john@email.com` → `john`)
  - Email confirmation sent
- **On Sign In:**
  - User enters credentials
  - Authenticated via Supabase Auth
  - Redirected to `/library`

### 2. Connect Services (First Time)
- User lands on `/library`
- If no YouTube/Spotify connected, sees prompt
- Clicks "Go to Settings"
- In `/settings`:
  - Clicks "Connect YouTube" → OAuth flow → tokens stored in `youtube_tokens`
  - Clicks "Connect Spotify" → OAuth flow → tokens stored in `spotify_tokens`

### 3. Library View
- User sees combined playlists and songs from:
  - YouTube (if connected)
  - Spotify (if connected)
- Can play songs, create playlists, etc.

### 4. Friends Feature
- User goes to Friends page
- Can search for other users by username
- Sends friend request
- Other user accepts/rejects
- Once accepted, can see each other's:
  - Song of the day
  - Playlists (if shared)
  - Activity

### 5. Groups Feature
- User creates a group → auto-generates 6-character join code
- User shares join code with friends
- Friends enter join code to join group
- Group has:
  - Shared playlists
  - Group activity feed
  - Member list

---

## Database Tables

### 1. `auth.users` (Supabase managed)
Handles authentication
- `id` (UUID) - Primary key
- `email` - User email
- `encrypted_password` - Hashed password
- `email_confirmed_at` - When email was verified
- `created_at` - Account creation timestamp

### 2. `users` (Public profiles)
```sql
id                  UUID (references auth.users.id)
username            VARCHAR (unique, for @mentions and search)
display_name        VARCHAR (visible name)
profile_picture_url TEXT
bio                 TEXT
song_of_the_day     TEXT
created_at          TIMESTAMPTZ
updated_at          TIMESTAMPTZ
```

**Triggers:**
- Auto-created when user signs up
- Auto-updates `updated_at` on changes

**RLS Policies:**
- Everyone can view all profiles (for search)
- Users can only edit their own profile

### 3. `youtube_tokens` (OAuth tokens)
```sql
user_id        UUID (references auth.users.id) PRIMARY KEY
access_token   TEXT NOT NULL
refresh_token  TEXT NOT NULL
expires_at     INTEGER NOT NULL
scope          TEXT
token_type     TEXT (default: 'Bearer')
created_at     TIMESTAMPTZ
updated_at     TIMESTAMPTZ
```

**RLS Policies:**
- Users can only access their own tokens

### 4. `spotify_tokens` (OAuth tokens)
Same structure as `youtube_tokens`

### 5. `friendships` (Friend relationships)
```sql
id          UUID PRIMARY KEY
user_id     UUID (references auth.users.id) -- Person who sent request
friend_id   UUID (references auth.users.id) -- Person who receives request
status      TEXT (default: 'pending') -- 'pending', 'accepted', 'rejected', 'blocked'
created_at  TIMESTAMPTZ
updated_at  TIMESTAMPTZ
```

**Constraints:**
- Can't friend yourself
- No duplicate friendships (unique constraint on user_id + friend_id)

**RLS Policies:**
- Users can view friendships where they're involved
- Users can create friend requests
- Recipients can accept/reject requests
- Either party can unfriend (delete)

**How it works:**
- User A sends request to User B → Creates row with status='pending'
- User B accepts → Updates status='accepted'
- To get all friends: Query where `status='accepted'` AND (`user_id=me` OR `friend_id=me`)

### 6. `groups` (Friend groups)
```sql
id             UUID PRIMARY KEY
name           VARCHAR
join_code      VARCHAR (unique, 6 chars, auto-generated)
owner_id       UUID (references auth.users.id)
description    TEXT
playlist_songs _TEXT (array of song IDs)
created_at     TIMESTAMPTZ
updated_at     TIMESTAMPTZ
```

**Triggers:**
- Auto-generates unique 6-character join code on creation

**RLS Policies:**
- Users can view groups they own or are members of
- Users can create groups
- Owners can update/delete their groups

### 7. `group_members` (Group membership)
```sql
group_id   UUID (references groups.id)
user_id    UUID (references auth.users.id)
joined_at  TIMESTAMPTZ
```

**Primary Key:** Composite (group_id, user_id)

**RLS Policies:**
- Users can view members of groups they're in
- Users can join groups (with valid join code)
- Users can leave groups
- Group owners can remove members

---

## Migrations to Run

When Supabase is back online, run these migrations IN ORDER:

1. ✅ `001_create_youtube_tokens.sql` - Already exists
2. ✅ `002_create_spotify_tokens.sql` - Already exists
3. ⏳ `003_create_friendships.sql` - NEW (run this)
4. ⏳ `004_update_users_table.sql` - NEW (run this)
5. ⏳ `005_update_groups_table.sql` - NEW (run this)

---

## Key Features

### Auto-generated Join Codes
- 6 characters (A-Z, 2-9, excluding similar looking chars)
- Automatically generated when group is created
- Guaranteed unique

### Friend System
- Bidirectional relationships (both parties see each other as friends)
- Status tracking (pending, accepted, rejected, blocked)
- Search users by username to add friends

### User Profiles
- Auto-created on signup
- Username defaults to email prefix
- Can be updated by user later
- Public visibility for friend discovery

### OAuth Token Management
- Automatic refresh when expired
- Secure storage with RLS
- Per-user isolation

---

## API Routes to Build

### Friends
- `POST /api/friends/request` - Send friend request
- `POST /api/friends/accept/:id` - Accept request
- `POST /api/friends/reject/:id` - Reject request
- `DELETE /api/friends/:id` - Unfriend
- `GET /api/friends` - List all friends
- `GET /api/users/search?q=username` - Search users

### Groups
- `POST /api/groups` - Create group
- `POST /api/groups/join` - Join group with code
- `GET /api/groups` - List my groups
- `GET /api/groups/:id` - Get group details
- `DELETE /api/groups/:id/leave` - Leave group
- `PUT /api/groups/:id` - Update group (owner only)
- `DELETE /api/groups/:id` - Delete group (owner only)

### Profile
- `GET /api/profile` - Get my profile
- `PUT /api/profile` - Update my profile
- `GET /api/profile/:username` - Get user's profile

---

## Next Steps

1. Wait for Supabase to come back online
2. Run migrations 003, 004, 005
3. Build API routes for friends and groups
4. Build UI pages for:
   - Friends list/search
   - Group creation/joining
   - Profile editing
5. Test complete user flow
