import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';

export const dynamic = 'force-dynamic';

async function makeSupabase() {
  const cookieStore = await cookies();
  return createRouteHandlerClient({ cookies: () => cookieStore });
}

/**
 * POST /api/user/profile/picture
 * Upload profile picture to Supabase Storage
 * 
 * TODO FOR SUPABASE DEVELOPER:
 * 1. Ensure the 'profile-pictures' bucket exists in Supabase Storage
 * 2. Configure bucket policies to allow authenticated users to upload/read their own files
 * 3. Files should be stored with path: {user_id}/profile-picture.{ext}
 */
export async function POST(request) {
  try {
    const supabase = await makeSupabase();
    
    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get file from form data
    const formData = await request.formData();
    const file = formData.get('file');
    
    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only JPEG, PNG, and WebP are allowed' },
        { status: 400 }
      );
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size exceeds 5MB limit' },
        { status: 400 }
      );
    }

    // Generate file path: {user_id}/profile-picture.{ext}
    const fileExt = file.name.split('.').pop() || 'jpg';
    const fileName = `${user.id}/profile-picture.${fileExt}`;
    const filePath = `profile-pictures/${fileName}`;

    // Convert File to ArrayBuffer for Supabase Storage
    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    // Upload to Supabase Storage
    // TODO FOR SUPABASE DEVELOPER: Ensure storage bucket 'profile-pictures' exists
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('profile-pictures')
      .upload(fileName, fileBuffer, {
        contentType: file.type,
        upsert: true, // Replace existing file if it exists
      });

    if (uploadError) {
      console.error('[profile picture API] Upload error:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload image. Please check Supabase Storage configuration.' },
        { status: 500 }
      );
    }

    // Get public URL for the uploaded image
    const { data: urlData } = supabase.storage
      .from('profile-pictures')
      .getPublicUrl(fileName);

    const publicUrl = urlData.publicUrl;

    // Update users table with profile picture URL
    const { error: updateError } = await supabase
      .from('users')
      .update({ profile_picture_url: publicUrl })
      .eq('id', user.id);

    if (updateError) {
      console.error('[profile picture API] Update error:', updateError);
      // Even if update fails, return the URL - it can be updated later
      return NextResponse.json({
        url: publicUrl,
        message: 'Image uploaded but failed to update profile. URL returned.',
        warning: true,
      });
    }

    return NextResponse.json({
      url: publicUrl,
      message: 'Profile picture uploaded successfully',
    });
  } catch (error) {
    console.error('[profile picture API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/user/profile/picture
 * Remove profile picture from Supabase Storage
 */
export async function DELETE() {
  try {
    const supabase = await makeSupabase();
    
    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get current profile to find existing picture URL
    const { data: profile } = await supabase
      .from('users')
      .select('profile_picture_url')
      .eq('id', user.id)
      .single();

    // Try to delete from storage if we have a URL
    if (profile?.profile_picture_url) {
      // Extract file path from URL
      // Supabase Storage URLs are typically: https://{project}.supabase.co/storage/v1/object/public/{bucket}/{path}
      const urlParts = profile.profile_picture_url.split('/');
      const fileNameIndex = urlParts.findIndex(part => part === 'profile-pictures') + 1;
      
      if (fileNameIndex > 0 && fileNameIndex < urlParts.length) {
        const fileName = urlParts.slice(fileNameIndex).join('/');
        
        const { error: deleteError } = await supabase.storage
          .from('profile-pictures')
          .remove([fileName]);

        if (deleteError) {
          console.error('[profile picture API] Delete from storage error:', deleteError);
          // Continue anyway - we'll still update the database
        }
      }
    }

    // Update users table to remove profile picture URL
    const { error: updateError } = await supabase
      .from('users')
      .update({ profile_picture_url: null })
      .eq('id', user.id);

    if (updateError) {
      console.error('[profile picture API] Update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to remove profile picture' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Profile picture removed successfully',
    });
  } catch (error) {
    console.error('[profile picture API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

