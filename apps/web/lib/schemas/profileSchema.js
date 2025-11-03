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
  .min(2, { message: 'Display name must be at least 2 characters' })
  .max(50, { message: 'Display name must not exceed 50 characters' })
  .regex(
    /^[a-zA-Z0-9\s]+$/,
    { message: 'Display name can only contain letters, numbers, and spaces' }
  )
  .trim()
  .refine(
    (val) => val.length >= 2,
    { message: 'Display name cannot be empty after trimming' }
  );

/**
 * Bio validation:
 * - Optional field
 * - Maximum 200 characters
 * - Can be empty string or null
 */
const bioSchema = z.any().superRefine((val, ctx) => {
  // If value is provided and not empty/null/undefined, it must be a string
  if (val !== undefined && val !== null && val !== '') {
    if (typeof val !== 'string') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Bio must be a string',
      });
      return;
    }
    // If it's a string, check max length
    if (val.length > 200) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Bio must not exceed 200 characters',
      });
    }
  }
}).transform((val) => {
  // Transform empty string, null, or undefined to undefined
  if (val === '' || val === null || val === undefined) {
    return undefined;
  }
  return val;
});

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
const baseProfileSchema = z.object({
  display_name: displayNameSchema.optional(),
  bio: bioSchema,
  profile_picture_url: profilePictureUrlSchema,
}, {
  required_error: 'Profile data is required',
  invalid_type_error: 'Profile data must be an object',
});

export const profileSchema = baseProfileSchema.superRefine((data, ctx) => {
  // Override error messages for missing or invalid fields
  // This ensures our custom messages are used instead of Zod's default ones
  
  // Check display_name
  if (data.display_name === undefined) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['display_name'],
      message: 'Display name is required',
    });
    return; // Don't add duplicate errors
  }
  
  // If display_name exists but fails validation, check if it's a type error
  const displayNameResult = displayNameSchema.safeParse(data.display_name);
  if (!displayNameResult.success) {
    // Override the error message if it's a generic type error
    const error = displayNameResult.error.issues[0];
    if (error?.code === 'invalid_type' && error?.message?.includes('expected string')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['display_name'],
        message: 'Display name is required',
      });
      return;
    }
  }
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

