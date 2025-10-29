/**
 * Safely copy text to clipboard with fallback method
 * @param {string} text - Text to copy to clipboard
 * @returns {Promise<boolean>} Promise that resolves to true if successful, false otherwise
 */
export async function copyToClipboard(text) {
  // Try modern Clipboard API first (only if available and in secure context)
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      // Silently fail and try fallback method
    }
  }

  // Fallback method using textarea (works in more contexts)
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    
    // Make the textarea invisible and non-intrusive
    textarea.style.position = 'fixed';
    textarea.style.left = '-999999px';
    textarea.style.top = '-999999px';
    textarea.style.opacity = '0';
    textarea.setAttribute('readonly', '');
    textarea.setAttribute('aria-hidden', 'true');
    
    document.body.appendChild(textarea);
    
    // Select the text
    textarea.focus();
    textarea.select();
    textarea.setSelectionRange(0, 99999); // For mobile devices
    
    // Copy the text using the legacy method
    const successful = document.execCommand('copy');
    
    // Clean up
    document.body.removeChild(textarea);
    
    return successful;
  } catch (err) {
    // Only log actual errors, not expected permission issues
    return false;
  }
}

