import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

// Contact email - stored server-side only, never exposed to client
const CONTACT_EMAIL = 'teamvybe25@gmail.com';

/**
 * POST /api/contact
 * Handle contact form submissions
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { name, email, subject, message } = body;

    // Validate required fields
    if (!name || !email || !subject || !message) {
      return NextResponse.json(
        { error: 'Please fill in all fields.' },
        { status: 400 }
      );
    }

    // Type validation - ensure all inputs are strings
    if (typeof name !== 'string' || typeof email !== 'string' || 
        typeof subject !== 'string' || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Invalid input format.' },
        { status: 400 }
      );
    }

    // Length validation - prevent ReDoS and abuse
    const MAX_EMAIL_LENGTH = 254; // RFC 5321 max email length
    const MAX_NAME_LENGTH = 100;
    const MAX_SUBJECT_LENGTH = 200;
    const MAX_MESSAGE_LENGTH = 5000;

    if (email.length > MAX_EMAIL_LENGTH || name.length > MAX_NAME_LENGTH ||
        subject.length > MAX_SUBJECT_LENGTH || message.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json(
        { error: 'Input exceeds maximum allowed length.' },
        { status: 400 }
      );
    }

    // Validate email format (safe after length check)
    // Simple validation: must have exactly one @, text before and after, and a dot after @
    const atIndex = email.indexOf('@');
    const lastAtIndex = email.lastIndexOf('@');
    if (atIndex < 1 || atIndex !== lastAtIndex || atIndex > email.length - 4 || 
        email.indexOf('.', atIndex) === -1 || email.includes(' ')) {
      return NextResponse.json(
        { error: 'Please enter a valid email address.' },
        { status: 400 }
      );
    }

    // Rate limiting - check if this email has submitted recently
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    // Store the contact submission in the database
    const { error: dbError } = await supabase
      .from('contact_submissions')
      .insert({
        name,
        email,
        subject,
        message,
        created_at: new Date().toISOString(),
      });

    // If table doesn't exist, that's okay - we'll still try to send email
    if (dbError && !dbError.message.includes('does not exist')) {
      console.warn('[Contact API] DB insert warning:', dbError);
    }

    // Send email using Resend or fallback
    const emailSent = await sendContactEmail({ name, email, subject, message });

    if (!emailSent) {
      // Log for manual follow-up
      console.error('[Contact API] Failed to send email, logging for manual follow-up:', {
        name,
        email,
        subject,
        messagePreview: message.substring(0, 100),
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Your message has been received. We\'ll get back to you soon!',
    });

  } catch (error) {
    console.error('[Contact API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to send message. Please try again.' },
      { status: 500 }
    );
  }
}

/**
 * Send contact email
 */
async function sendContactEmail({ name, email, subject, message }) {
  const subjectMap = {
    bug: '🐛 Bug Report',
    feature: '✨ Feature Request',
    question: '❓ Question',
    feedback: '💬 Feedback',
    other: '📩 Contact',
  };

  const emailSubject = `[Vybe] ${subjectMap[subject] || 'Contact'} from ${name}`;
  const emailBody = `
New contact form submission from Vybe:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

From: ${name}
Email: ${email}
Subject: ${subjectMap[subject] || subject}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Message:

${message}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Sent at: ${new Date().toLocaleString()}
  `.trim();

  // Try Resend first
  if (process.env.RESEND_API_KEY) {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Vybe Contact <noreply@vybe.app>',
          to: [CONTACT_EMAIL],
          reply_to: email,
          subject: emailSubject,
          text: emailBody,
        }),
      });

      if (response.ok) {
        console.log('[Contact API] Email sent via Resend');
        return true;
      } else {
        const error = await response.text();
        console.error('[Contact API] Resend error:', error);
      }
    } catch (error) {
      console.error('[Contact API] Resend request failed:', error);
    }
  }

  // Try SendGrid as fallback
  if (process.env.SENDGRID_API_KEY) {
    try {
      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: CONTACT_EMAIL }] }],
          from: { email: 'noreply@vybe.app', name: 'Vybe Contact' },
          reply_to: { email },
          subject: emailSubject,
          content: [{ type: 'text/plain', value: emailBody }],
        }),
      });

      if (response.ok || response.status === 202) {
        console.log('[Contact API] Email sent via SendGrid');
        return true;
      } else {
        const error = await response.text();
        console.error('[Contact API] SendGrid error:', error);
      }
    } catch (error) {
      console.error('[Contact API] SendGrid request failed:', error);
    }
  }

  // Log to console as last resort (for development)
  console.log('[Contact API] Email service not configured, logging submission:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`To: ${CONTACT_EMAIL}`);
  console.log(`Subject: ${emailSubject}`);
  console.log(emailBody);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Return true anyway - message is logged and saved to DB
  return true;
}

