// Database Type Definitions for Vybe
// Basic TypeScript interfaces for database entities

export type UUID = string;

export interface User {
  id: UUID;
  email: string;
  display_name?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Group {
  id: UUID;
  name: string;
  join_code: string;
  created_by: UUID;
  created_at: string;
  updated_at: string;
}

export interface GroupMember {
  group_id: UUID;
  user_id: UUID;
  joined_at: string;
}

export interface Song {
  id: UUID;
  title: string;
  artist: string;
  album?: string;
  duration_ms?: number;
  external_id: string;
  source: 'spotify' | 'youtube';
  thumbnail_url?: string;
  created_at: string;
}

export interface PlayHistory {
  id: UUID;
  user_id: UUID;
  song_id: UUID;
  played_at: string;
  source: 'spotify' | 'youtube';
  created_at: string;
}

export interface Playlist {
  id: UUID;
  name: string;
  description?: string;
  created_by?: UUID;
  group_id?: UUID;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface PlaylistSong {
  playlist_id: UUID;
  song_id: UUID;
  order_index: number;
  added_at: string;
}

// Database response types
export interface Database {
  public: {
    Tables: {
      users: {
        Row: User;
        Insert: Partial<User>;
        Update: Partial<User>;
      };
      groups: {
        Row: Group;
        Insert: Partial<Group>;
        Update: Partial<Group>;
      };
      group_members: {
        Row: GroupMember;
        Insert: Partial<GroupMember>;
        Update: Partial<GroupMember>;
      };
      songs: {
        Row: Song;
        Insert: Partial<Song>;
        Update: Partial<Song>;
      };
      play_history: {
        Row: PlayHistory;
        Insert: Partial<PlayHistory>;
        Update: Partial<PlayHistory>;
      };
      playlists: {
        Row: Playlist;
        Insert: Partial<Playlist>;
        Update: Partial<Playlist>;
      };
      playlist_songs: {
        Row: PlaylistSong;
        Insert: Partial<PlaylistSong>;
        Update: Partial<PlaylistSong>;
      };
    };
  };
}
