# Vybe System Architecture

## Overview
Vybe is a collaborative music platform that allows users to create groups, share playlists, and discover music together.

## Core Components

### Frontend (Next.js)
- **Framework**: Next.js 15 with App Router
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Authentication**: Supabase Auth

### Backend Services
- **API Routes**: Next.js API routes for server-side logic
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth with OAuth providers

### External Integrations
- **Spotify API**: Music streaming and playlist management
- **YouTube API**: Play history import and music discovery

## Database Schema

### Core Tables
- `users` - User profiles and authentication
- `groups` - Collaborative groups
- `songs` - Music track information
- `playlists` - User and group playlists
- `play_history` - User listening history

## API Endpoints

### Authentication
- `POST /api/auth/callback` - OAuth callback handling
- `POST /api/sign-out` - User sign out

### Music Integration
- `GET /api/spotify/[...path]` - Spotify API proxy
- `POST /api/youtube/import-history` - Import YouTube play history

### Groups & Playlists
- `GET /api/groups` - List user groups
- `POST /api/groups` - Create new group
- `GET /api/playlists` - List playlists

## Security Considerations
- Row Level Security (RLS) enabled on all tables
- OAuth token management
- User data isolation
- API rate limiting

## Deployment
- **Frontend**: Vercel
- **Database**: Supabase Cloud
- **Environment**: Production and development configurations
