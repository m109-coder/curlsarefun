import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

const BUCKET = 'promo';
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);

/**
 * POST /api/admin/promo/upload
 *
 * Accepts `multipart/form-data` with a single `file` field, uploads it to the
 * public Supabase Storage bucket `promo`, and returns the public URL.
 *
 * The bucket is auto-created as public on first upload so no manual Supabase
 * setup is required. Requests are protected by the `/api/admin/*` middleware.
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!ALLOWED.has(file.type)) {
      return NextResponse.json({ error: 'Only PNG, JPG, WEBP or GIF images are allowed' }, { status: 400 });
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'Image must be smaller than 5MB' }, { status: 400 });
    }

    // Ensure the public bucket exists (no-op if it already does)
    const { data: buckets } = await supabaseAdmin.storage.listBuckets();
    if (!buckets?.some((b) => b.name === BUCKET)) {
      const { error: createError } = await supabaseAdmin.storage.createBucket(BUCKET, { public: true });
      if (createError) {
        console.error('[promo/upload] createBucket failed:', createError);
        return NextResponse.json({ error: 'Failed to create storage bucket', details: createError.message }, { status: 500 });
      }
    }

    const ext = file.name.split('.').pop() || 'png';
    const fileName = `promo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const buffer = Buffer.from(await file.arrayBuffer());
    const { error: uploadError } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(fileName, buffer, { contentType: file.type, upsert: false });

    if (uploadError) {
      console.error('[promo/upload] upload failed:', uploadError);
      return NextResponse.json({ error: 'Upload failed', details: uploadError.message }, { status: 500 });
    }

    const { data: { publicUrl } } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(fileName);

    return NextResponse.json({ url: publicUrl });
  } catch (error) {
    console.error('[promo/upload] error:', error);
    const message = error instanceof Error ? error.message : 'Upload failed';
    return NextResponse.json({ error: 'Upload failed', details: message }, { status: 500 });
  }
}
