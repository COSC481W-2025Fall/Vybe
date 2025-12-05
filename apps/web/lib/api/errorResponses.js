/**
 * Consumer-Friendly API Error Responses
 * 
 * Use these functions to return user-friendly error messages from API routes.
 * All messages are written for regular users, not developers.
 */

import { NextResponse } from 'next/server';

/**
 * Standard error response with user-friendly message
 */
export function errorResponse(userMessage, status = 500) {
  return NextResponse.json({ error: userMessage }, { status });
}

// ═══════════════════════════════════════════════════════════
// AUTH ERRORS
// ═══════════════════════════════════════════════════════════

export function unauthorizedError() {
  return errorResponse("Please sign in to continue.", 401);
}

export function sessionExpiredError() {
  return errorResponse("Your session has expired. Please sign in again.", 401);
}

export function accessDeniedError() {
  return errorResponse("You don't have access to this.", 403);
}

// ═══════════════════════════════════════════════════════════
// NOT FOUND ERRORS
// ═══════════════════════════════════════════════════════════

export function notFoundError(item = "item") {
  const messages = {
    group: "This group doesn't exist or has been deleted.",
    playlist: "We couldn't find this playlist. It may have been deleted or made private.",
    user: "We couldn't find this user.",
    song: "We couldn't find this song.",
    community: "This community doesn't exist.",
    item: "We couldn't find what you're looking for.",
  };
  return errorResponse(messages[item] || messages.item, 404);
}

// ═══════════════════════════════════════════════════════════
// VALIDATION ERRORS
// ═══════════════════════════════════════════════════════════

export function validationError(message = "Please check your input and try again.") {
  return errorResponse(message, 400);
}

export function missingFieldError(field) {
  const friendlyNames = {
    name: "name",
    email: "email address",
    password: "password",
    title: "title",
    url: "link",
    message: "message",
  };
  const friendly = friendlyNames[field] || field;
  return errorResponse(`Please enter a ${friendly}.`, 400);
}

// ═══════════════════════════════════════════════════════════
// SERVER ERRORS
// ═══════════════════════════════════════════════════════════

export function serverError(context = "action") {
  const messages = {
    save: "Couldn't save your changes. Please try again.",
    load: "Couldn't load the data. Please refresh the page.",
    create: "Couldn't create this. Please try again.",
    update: "Couldn't update this. Please try again.",
    delete: "Couldn't delete this. Please try again.",
    action: "Something went wrong. Please try again.",
  };
  return errorResponse(messages[context] || messages.action, 500);
}

// ═══════════════════════════════════════════════════════════
// RATE LIMITING
// ═══════════════════════════════════════════════════════════

export function rateLimitError(action = "requests") {
  const messages = {
    sort: "You've sorted a few times recently. Please wait a moment.",
    export: "You've exported several playlists. Please wait a moment.",
    search: "Too many searches! Please slow down a bit.",
    requests: "Slow down! Please wait a moment before trying again.",
  };
  return errorResponse(messages[action] || messages.requests, 429);
}

// ═══════════════════════════════════════════════════════════
// FEATURE-SPECIFIC ERRORS
// ═══════════════════════════════════════════════════════════

export const Errors = {
  // Groups
  GROUP_CREATE_FAILED: errorResponse("Couldn't create the group. Please try again.", 500),
  GROUP_JOIN_FAILED: errorResponse("Couldn't join the group. Please check the code and try again.", 400),
  GROUP_LEAVE_FAILED: errorResponse("Couldn't leave the group. Please try again.", 500),
  GROUP_DELETE_FAILED: errorResponse("Couldn't delete the group. Please try again.", 500),
  INVALID_JOIN_CODE: errorResponse("That join code doesn't look right. Please double-check it.", 400),
  
  // Playlists
  PLAYLIST_ADD_FAILED: errorResponse("Couldn't add this playlist. Please check the link.", 500),
  PLAYLIST_INVALID_URL: errorResponse("That doesn't look like a valid playlist link.", 400),
  PLAYLIST_NOT_FOUND: errorResponse("We couldn't find this playlist.", 404),
  PLAYLIST_EMPTY: errorResponse("This playlist doesn't have any songs.", 400),
  
  // Sort
  SORT_FAILED: errorResponse("Couldn't sort your playlist. Please try again.", 500),
  SORT_SAVE_FAILED: errorResponse("Couldn't save the sort order. Please try again.", 500),
  SORT_RESET_FAILED: errorResponse("Couldn't reset the sort order. Please try again.", 500),
  
  // Export
  EXPORT_FAILED: errorResponse("Couldn't export the playlist. Please try again.", 500),
  EXPORT_NOT_CONNECTED: errorResponse("Please connect your account first in Settings.", 400),
  
  // Friends
  FRIEND_REQUEST_FAILED: errorResponse("Couldn't send the friend request. Please try again.", 500),
  ALREADY_FRIENDS: errorResponse("You're already friends!", 400),
  
  // Profile
  PROFILE_UPDATE_FAILED: errorResponse("Couldn't update your profile. Please try again.", 500),
  PICTURE_UPLOAD_FAILED: errorResponse("Couldn't upload your picture. Please try a different image.", 500),
  PICTURE_TOO_LARGE: errorResponse("This image is too large. Please choose one under 5MB.", 400),
  USERNAME_TAKEN: errorResponse("This username is already taken.", 400),
  
  // Songs
  SONG_SHARE_FAILED: errorResponse("Couldn't share this song. Please try again.", 500),
  ALREADY_SHARED_TODAY: errorResponse("You've already shared a song today. Come back tomorrow!", 400),
  
  // Search
  SEARCH_FAILED: errorResponse("Search isn't working right now. Please try again.", 500),
  
  // Contact
  CONTACT_FAILED: errorResponse("Couldn't send your message. Please try again later.", 500),
};

/**
 * Log error for debugging but return user-friendly message
 */
export function handleApiError(error, userMessage = "Something went wrong. Please try again.", status = 500) {
  // Log the actual error for debugging
  console.error('[API Error]', error);
  
  // Return user-friendly message
  return errorResponse(userMessage, status);
}

