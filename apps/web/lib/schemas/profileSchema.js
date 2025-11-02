import { z } from 'zod';

/**
 * Profile validation schema using Zod
 * 
 * Validates:
 * - Display name: Required, 2-50 characters, alphanumeric + spaces
 * - Bio: Optional, max 200 characters
 * - Profile picture URL: Valid URL format or empty/null
 * 
 * @typedef {Object} ProfileFormData
 * @property {string} display_name - User's display name (2-50 chars, alphanumeric + spaces)
 * @property {string} [bio] - User's bio/description (optional, max 200 chars)
 * @property {string} [profile_picture_url] - URL to profile picture (optional, must be valid URL)
 */

/**
 * Display name validation:
 * - Required field
 * - Minimum 2 characters
 * - Maximum 50 characters
 * - Only letters, numbers, and spaces
 * - Trimmed of leading/trailing whitespace
 */
const displayNameSchema = z
  .string({
    required_error: 'Display name is required',
    invalid_type_error: 'Display name must be a string',
  })
  .min(2, 'Display name must be at least 2 characters')
  .max(50, 'Display name must not exceed 50 characters')
  .regex(
    /^[a-zA-Z0-9\s]+$/,
    'Display name can only contain letters, numbers, and spaces'
  )
  .trim()
  .refine(
    (val) => val.length >= 2,
    'Display name cannot be empty after trimming'
  );

/**
 * Bio validation:
 * - Optional field
 * - Maximum 200 characters
 * - Can be empty string or null
 */
const bioSchema = z
  .string({
    invalid_type_error: 'Bio must be a string',
  })
  .max(200, 'Bio must not exceed 200 characters')
  .optional()
  .or(z.literal(''))
  .nullable()
  .transform((val) => (val === '' ? undefined : val));

/**
 * Profile picture URL validation:
 * - Optional field
 * - Must be valid URL format if provided
 * - Can be empty string or null
 * - Also accepts File objects for uploads
 * - Validates URL format using Zod's built-in URL validator
 */
const profilePictureUrlSchema = z
  .union([
    z.string({
      invalid_type_error: 'Profile picture must be a URL string or File object',
    }).url('Invalid profile picture URL format'),
    z.instanceof(File, {
      message: 'Profile picture must be a valid image file',
    }).refine((file) => {
      // Validate file type
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
      return validTypes.includes(file.type);
    }, 'Profile picture must be a JPEG, PNG, WebP, or GIF image')
    .refine((file) => {
      // Validate file size (max 5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB
      return file.size <= maxSize;
    }, 'Profile picture must be smaller than 5MB'),
    z.literal(''),
    z.null(),
  ])
  .optional()
  .transform((val) => {
    // If empty string, return null
    if (val === '') return null;
    // If File object, return as-is (will be handled by upload component)
    if (val instanceof File) return val;
    // If URL string, return as-is
    return val;
  });

/**
 * Profile form validation schema
 * 
 * Usage:
 * ```javascript
 * import { profileSchema } from '@/lib/schemas/profileSchema';
 * import { zodResolver } from '@hookform/resolvers/zod';
 * 
 * const form = useForm({
 *   resolver: zodResolver(profileSchema),
 *   defaultValues: {
 *     display_name: '',
 *     bio: '',
 *     profile_picture_url: '',
 *   },
 * });
 * ```
 */
export const profileSchema = z.object({
  display_name: displayNameSchema,
  bio: bioSchema,
  profile_picture_url: profilePictureUrlSchema,
});

/**
 * TypeScript/JSDoc type definition for profile form data
 * 
 * @typedef {z.infer<typeof profileSchema>} ProfileFormData
 * 
 * Example usage in JavaScript with JSDoc:
 * ```javascript
 * /**
 *  * @type {import('@/lib/schemas/profileSchema').ProfileFormData}
 *  *\/
 * const formData = {
 *   display_name: 'John Doe',
 *   bio: 'My bio',
 *   profile_picture_url: 'https://...',
 * };
 * ```
 */

/**
 * Export TypeScript-compatible type
 * Note: This is a JSDoc typedef for JavaScript projects
 * For TypeScript projects, use: `type ProfileFormData = z.infer<typeof profileSchema>;`
 */

