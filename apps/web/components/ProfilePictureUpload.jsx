'use client';

import { useState, useRef, useEffect } from 'react';
import { Upload, X, User as UserIcon, Loader2 } from 'lucide-react';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const TARGET_SIZE = 400; // Square 400x400px

export default function ProfilePictureUpload({ 
  currentImageUrl, 
  onImageChange, 
  onRemove,
  disabled = false 
}) {
  const [preview, setPreview] = useState(currentImageUrl || null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [croppedImage, setCroppedImage] = useState(null);
  const fileInputRef = useRef(null);
  const canvasRef = useRef(null);

  // Update preview when currentImageUrl changes externally
  useEffect(() => {
    setPreview(currentImageUrl || null);
  }, [currentImageUrl]);

  // Validate file
  const validateFile = (file) => {
    if (!file) return 'No file selected';
    
    if (!ALLOWED_TYPES.includes(file.type)) {
      return 'Only JPEG, PNG, and WebP images are allowed';
    }
    
    if (file.size > MAX_FILE_SIZE) {
      return 'File size must be less than 5MB';
    }
    
    return null;
  };

  // Convert image to square and resize
  const processImage = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          // Calculate square crop (center crop)
          const size = Math.min(img.width, img.height);
          const x = (img.width - size) / 2;
          const y = (img.height - size) / 2;
          
          // Set canvas to target size
          canvas.width = TARGET_SIZE;
          canvas.height = TARGET_SIZE;
          
          // Draw and resize
          ctx.drawImage(
            img,
            x, y, size, size, // Source: square crop
            0, 0, TARGET_SIZE, TARGET_SIZE // Destination: resized
          );
          
          // Convert to blob
          canvas.toBlob((blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to process image'));
            }
          }, file.type, 0.9); // 90% quality
        };
        
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = e.target.result;
      };
      
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  };

  // Handle file selection
  const handleFileSelect = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);
    setUploading(true);

    // Validate
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      setUploading(false);
      return;
    }

    try {
      // Process image (crop and resize)
      const processedBlob = await processImage(file);
      
      // Create preview URL
      const previewUrl = URL.createObjectURL(processedBlob);
      setPreview(previewUrl);
      setCroppedImage(processedBlob);
      
      // Upload to server
      await uploadImage(processedBlob, file.name);
    } catch (err) {
      console.error('Error processing image:', err);
      setError(err.message || 'Failed to process image');
      setPreview(currentImageUrl || null);
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Upload image to server
  const uploadImage = async (blob, originalFileName) => {
    try {
      const formData = new FormData();
      formData.append('file', blob, originalFileName);

      const response = await fetch('/api/user/profile/picture', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to upload image');
      }

      const data = await response.json();
      
      // Update parent component
      if (onImageChange) {
        onImageChange(data.url);
      }

      // Clean up old preview URL if we created one
      if (preview && preview.startsWith('blob:')) {
        URL.revokeObjectURL(preview);
      }

      setError(null);
    } catch (err) {
      console.error('Error uploading image:', err);
      setError(err.message || 'Failed to upload image');
      throw err;
    }
  };

  // Handle remove
  const handleRemove = async () => {
    if (!confirm('Are you sure you want to remove your profile picture?')) {
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const response = await fetch('/api/user/profile/picture', {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to remove profile picture');
      }

      setPreview(null);
      setCroppedImage(null);
      
      if (onRemove) {
        onRemove();
      }
    } catch (err) {
      console.error('Error removing image:', err);
      setError(err.message || 'Failed to remove profile picture');
    } finally {
      setUploading(false);
    }
  };

  // Handle click on upload area
  const handleUploadClick = () => {
    if (disabled || uploading) return;
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-4">
      <label className="block text-sm font-medium text-white mb-2">
        Profile Picture
      </label>

      {/* Preview and Upload Area */}
      <div className="flex items-start gap-6">
        {/* Preview */}
        <div className="flex-shrink-0">
          <div className="relative w-32 h-32 rounded-full overflow-hidden border-2 border-white/20 bg-white/5 flex items-center justify-center">
            {preview ? (
              <img
                src={preview}
                alt="Profile preview"
                className="w-full h-full object-cover"
              />
            ) : (
              <UserIcon className="w-12 h-12 text-gray-400" />
            )}
            {uploading && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <Loader2 className="w-6 h-6 text-white animate-spin" />
              </div>
            )}
          </div>
        </div>

        {/* Upload Controls */}
        <div className="flex-1 space-y-3">
          {/* Upload Button */}
          <button
            type="button"
            onClick={handleUploadClick}
            disabled={disabled || uploading}
            className={[
              'px-4 py-2 rounded-lg text-sm font-medium transition-all',
              'border border-white/20 text-white',
              'hover:bg-white/5 hover:border-white/30',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'flex items-center gap-2'
            ].join(' ')}
          >
            <Upload className="w-4 h-4" />
            {uploading ? 'Uploading...' : preview ? 'Change Picture' : 'Upload Picture'}
          </button>

          {/* Remove Button (only show if there's an image) */}
          {preview && (
            <button
              type="button"
              onClick={handleRemove}
              disabled={disabled || uploading}
              className={[
                'px-4 py-2 rounded-lg text-sm font-medium transition-all',
                'border border-red-500/20 text-red-400',
                'hover:bg-red-500/10 hover:border-red-500/30',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                'flex items-center gap-2'
              ].join(' ')}
            >
              <X className="w-4 h-4" />
              Remove
            </button>
          )}

          {/* Error Message */}
          {error && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* Help Text */}
          <p className="text-xs text-gray-500">
            JPEG, PNG, or WebP. Max 5MB. Image will be cropped to square and resized to 400x400px.
          </p>
        </div>
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled || uploading}
      />
    </div>
  );
}


