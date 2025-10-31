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
 * - Validates URL format using Zod's built-in URL validator
 */
const profilePictureUrlSchema = z
  .string({
    invalid_type_error: 'Profile picture URL must be a string',
  })
  .url('Invalid profile picture URL format')
  .optional()
  .or(z.literal(''))
  .nullable()
  .transform((val) => (val === '' ? null : val));

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

