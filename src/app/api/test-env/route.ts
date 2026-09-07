import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  return NextResponse.json({
    stripeSecretKey: process.env.STRIPE_SECRET_KEY ? 'Set' : 'Not set',
    stripePublishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ? 'Set' : 'Not set',
    stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET ? 'Set' : 'Not set',
    appUrl: process.env.NEXT_PUBLIC_APP_URL,
    nodeEnv: process.env.NODE_ENV,
  });
}