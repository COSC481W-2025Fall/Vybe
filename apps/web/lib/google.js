import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

/**
 * Google API Utility Functions
 * 
 * This module provides utility functions for making authenticated requests
 * to Google APIs using stored OAuth tokens from the database.
 * 
 * Features:
 * - Automatic token refresh when expired
 * - Error handling for API failures
 * - Type-safe response handling
 */

/**
 * Get a valid Google access token for the current user
 * This function retrieves the stored Google token and refreshes it if necessary
 * @param {Object} supabase - Supabase client instance
 * @param {string} userId - User ID to get tokens for
 * @returns {Promise<string|null>} - Valid access token or null if unavailable
 */
export async function getValidGoogleToken(supabase, userId) {
  try {
    // Get stored Google tokens from database
    const { data: tokens, error } = await supabase
      .from('google_tokens')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error || !tokens) {
      console.log('No Google tokens found for user:', userId);
      return null;
    }

    // Check if token is expired (with 5-minute buffer)
    const now = Math.floor(Date.now() / 1000);
    const bufferTime = 300; // 5 minutes
    const isExpired = tokens.expires_at <= (now + bufferTime);

    if (!isExpired) {
      // Token is still valid
      return tokens.access_token;
    }

    // Token is expired, try to refresh it
    if (!tokens.refresh_token) {
      console.log('Token expired and no refresh token available');
      return null;
    }

    console.log('Refreshing expired Google token...');
    
    // Refresh the token using Google's OAuth2 token endpoint
    const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        refresh_token: tokens.refresh_token,
        grant_type: 'refresh_token',
      }),
    });

    if (!refreshResponse.ok) {
      console.error('Failed to refresh Google token:', await refreshResponse.text());
      return null;
    }

    const refreshData = await refreshResponse.json();
    
    // Update the stored tokens with the new access token
    const { error: updateError } = await supabase
      .from('google_tokens')
      .update({
        access_token: refreshData.access_token,
        expires_at: Math.floor(Date.now() / 1000) + refreshData.expires_in,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (updateError) {
      console.error('Failed to update refreshed token:', updateError);
      return null;
    }

    console.log('Google token refreshed successfully');
    return refreshData.access_token;

  } catch (error) {
    console.error('Error getting valid Google token:', error);
    return null;
  }
}

/**
 * Make an authenticated request to a Google API endpoint
 * This function automatically handles token management and API calls
 * @param {string} endpoint - Google API endpoint URL
 * @param {Object} options - Fetch options (method, headers, body, etc.)
 * @param {string} userId - User ID for token lookup
 * @returns {Promise<Object>} - API response data or error
 */
export async function makeGoogleApiRequest(endpoint, options = {}, userId) {
  try {
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    
    // Get a valid access token
    const accessToken = await getValidGoogleToken(supabase, userId);
    
    if (!accessToken) {
      return {
        error: 'No valid Google access token available',
        status: 401
      };
    }

    // Prepare the request with authentication headers
    const requestOptions = {
      ...options,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    };

    // Make the API request
    const response = await fetch(endpoint, requestOptions);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Google API request failed: ${response.status} ${response.statusText}`, errorText);
      return {
        error: `Google API request failed: ${response.statusText}`,
        status: response.status,
        details: errorText
      };
    }

    const data = await response.json();
    return { data, status: response.status };

  } catch (error) {
    console.error('Error making Google API request:', error);
    return {
      error: 'Failed to make Google API request',
      status: 500,
      details: error.message
    };
  }
}

/**
 * Get user's YouTube channel information
 * This function fetches the authenticated user's YouTube channel details
 * @param {string} userId - User ID for token lookup
 * @returns {Promise<Object>} - YouTube channel data or error
 */
export async function getYouTubeChannelInfo(userId) {
  try {
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    
    // First, get the user's channel ID
    const channelResponse = await makeGoogleApiRequest(
      'https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true',
      { method: 'GET' },
      userId
    );

    if (channelResponse.error) {
      return channelResponse;
    }

    const channels = channelResponse.data.items;
    if (!channels || channels.length === 0) {
      return {
        error: 'No YouTube channel found for this user',
        status: 404
      };
    }

    const channel = channels[0];
    
    return {
      data: {
        id: channel.id,
        title: channel.snippet.title,
        description: channel.snippet.description,
        thumbnail: channel.snippet.thumbnails.default.url,
        customUrl: channel.snippet.customUrl,
      },
      status: 200
    };

  } catch (error) {
    console.error('Error getting YouTube channel info:', error);
    return {
      error: 'Failed to get YouTube channel information',
      status: 500,
      details: error.message
    };
  }
}

/**
 * Get user's YouTube playlists
 * This function fetches the authenticated user's YouTube playlists
 * @param {string} userId - User ID for token lookup
 * @param {number} maxResults - Maximum number of playlists to return (default: 25)
 * @returns {Promise<Object>} - YouTube playlists data or error
 */
export async function getYouTubePlaylists(userId, maxResults = 25) {
  try {
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    
    const playlistsResponse = await makeGoogleApiRequest(
      `https://www.googleapis.com/youtube/v3/playlists?part=snippet&mine=true&maxResults=${maxResults}`,
      { method: 'GET' },
      userId
    );

    if (playlistsResponse.error) {
      return playlistsResponse;
    }

    const playlists = playlistsResponse.data.items || [];
    
    return {
      data: playlists.map(playlist => ({
        id: playlist.id,
        title: playlist.snippet.title,
        description: playlist.snippet.description,
        thumbnail: playlist.snippet.thumbnails.default.url,
        publishedAt: playlist.snippet.publishedAt,
        channelTitle: playlist.snippet.channelTitle,
      })),
      status: 200
    };

  } catch (error) {
    console.error('Error getting YouTube playlists:', error);
    return {
      error: 'Failed to get YouTube playlists',
      status: 500,
      details: error.message
    };
  }
}
