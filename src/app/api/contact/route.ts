import { NextRequest, NextResponse } from 'next/server';

function sanitizeInput(input: string): string {
  // Remove potentially dangerous characters and HTML tags
  return input
    .replace(/[<>]/g, '') // Remove < and >
    .replace(/&/g, '&amp;') // Escape &
    .replace(/"/g, '&quot;') // Escape quotes
    .replace(/'/g, '&#x27;') // Escape single quotes
    .trim();
}

/**
 * POST /api/contact
 *
 * Accepts and sanitizes a public contact form submission.
 * Validates that name, email and message are present and that the
 * email looks valid. Inputs are HTML-escaped to reduce XSS risk.
 *
 * Note: this endpoint currently logs the submission and returns a
 * success message. Email delivery and persistence are not wired yet.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, phone, location, message } = body;

    // Validate required fields
    if (!name || !email || !message) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Sanitize inputs to prevent XSS
    const sanitizedData = {
      name: sanitizeInput(name),
      email: sanitizeInput(email),
      phone: phone ? sanitizeInput(phone) : '',
      location: location ? sanitizeInput(location) : '',
      message: sanitizeInput(message),
    };

    // Here you would typically:
    // 1. Send email using a service like Resend, SendGrid, or Nodemailer
    // 2. Store the contact submission in a database
    // 3. Send confirmation email to the user
    // 4. Send notification to the business

    console.log('Contact form submission:', {
      ...sanitizedData,
      timestamp: new Date().toISOString(),
    });

    // For now, just return success
    return NextResponse.json({
      success: true,
      message: 'Thank you for your message. We will get back to you soon.',
    });

  } catch (error) {
    console.error('Contact form error:', error);
    return NextResponse.json(
      { error: 'Failed to process contact form' },
      { status: 500 }
    );
  }
}