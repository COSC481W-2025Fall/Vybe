'use client';

import { useState, useRef, useEffect } from 'react';
import { Upload, X, User as UserIcon } from 'lucide-react';

export default function ProfilePictureUpload({
  currentImageUrl,
  onImageChange,
  onRemove,
  disabled = false,
}) {
  const [preview, setPreview] = useState(currentImageUrl || null);
  const fileInputRef = useRef(null);

  // Keep preview in sync if parent changes it
  useEffect(() => {
    setPreview(currentImageUrl || null);
  }, [currentImageUrl]);

  const handleFileSelect = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
//When the user uploads a picture, the code turns the image file into Base64 (a long text string).
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result; // base64 string
      setPreview(dataUrl); //shows the picture right away on the screen.
      if (onImageChange) { 
        onImageChange(dataUrl); // parent saves to form
                                  //localStorage,sends the Base64 picture to the Profile Settings page.
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemove = () => {
    if (!confirm('Are you sure you want to remove your profile picture?')) return;
    setPreview(null);
    if (onRemove) onRemove();
  };

  const handleUploadClick = () => {
    if (disabled) return;
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-4">
      <label className="block text-sm font-medium text-white mb-2">
        Profile Picture
      </label>

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
          </div>
        </div>

        {/* Buttons */}
        <div className="flex-1 space-y-3">
          <button
            type="button"
            onClick={handleUploadClick}
            disabled={disabled}
            className={[
              'px-4 py-2 rounded-lg text-sm font-medium transition-all',
              'border border-white/20 text-white',
              'hover:bg-white/5 hover:border-white/30',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'flex items-center gap-2'
            ].join(' ')}
          >
            <Upload className="w-4 h-4" />
            {preview ? 'Change Picture' : 'Upload Picture'}
          </button>

          {preview && (
            <button
              type="button"
              onClick={handleRemove}
              disabled={disabled}
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

          <p className="text-xs text-gray-500">
            Image is stored locally in your browser (base64), not uploaded to the server.
          </p>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled}
      />
    </div>
  );
}
