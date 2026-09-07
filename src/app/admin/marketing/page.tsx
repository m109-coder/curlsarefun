'use client';

import { useEffect, useRef, useState } from 'react';
import { Megaphone, Upload, Loader2, Link as LinkIcon, Image as ImageIcon } from 'lucide-react';

interface PromoConfig {
  id?: string;
  isActive: boolean;
  imageUrl: string | null;
  targetUrl: string | null;
}

export default function AdminMarketingPage() {
  const [promo, setPromo] = useState<PromoConfig>({ isActive: false, imageUrl: null, targetUrl: null });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/admin/promo')
      .then((r) => r.json())
      .then((data) => {
        if (data.promo) setPromo(data.promo);
      })
      .catch((e) => console.error('Failed to load promo:', e))
      .finally(() => setLoading(false));
  }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setMessage(null);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/admin/promo/upload', { method: 'POST', body: formData });
      const data = await res.json();

      if (!res.ok) throw new Error(data.details || data.error || 'Upload failed');

      setPromo((p) => ({ ...p, imageUrl: data.url }));
      setMessage('Image uploaded. Click "Save" to apply.');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/promo', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isActive: promo.isActive,
          imageUrl: promo.imageUrl,
          targetUrl: promo.targetUrl,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      setPromo(data.promo);
      setMessage('Saved. The popup is now ' + (data.promo.isActive ? 'ON' : 'OFF') + '.');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center space-x-3 mb-6">
        <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
          <Megaphone className="w-5 h-5 text-green-700" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Marketing — Promo Pop-up</h1>
          <p className="text-sm text-gray-500">Manage the promotional popup shown on the homepage.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-6 space-y-6">
        {/* Active toggle */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
          <div>
            <p className="font-medium text-gray-900">Show popup on homepage</p>
            <p className="text-sm text-gray-500">Visitors see it once per browser session.</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={promo.isActive}
            onClick={() => setPromo((p) => ({ ...p, isActive: !p.isActive }))}
            className={`relative inline-flex h-7 w-12 flex-shrink-0 items-center rounded-full transition-colors ${
              promo.isActive ? 'bg-green-600' : 'bg-gray-300'
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                promo.isActive ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Image upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Promo image</label>
          {promo.imageUrl ? (
            <div className="relative rounded-xl overflow-hidden border border-gray-200 mb-3">
              <img src={promo.imageUrl} alt="Promo" className="w-full max-h-64 object-cover" />
            </div>
          ) : (
            <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center text-gray-400 mb-3">
              <ImageIcon className="w-10 h-10 mx-auto mb-2" />
              <p className="text-sm">No image yet</p>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            onChange={handleUpload}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center space-x-2 px-5 py-3 border border-gray-300 rounded-xl font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 min-h-[48px]"
          >
            {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
            <span>{uploading ? 'Uploading…' : promo.imageUrl ? 'Replace image' : 'Upload image'}</span>
          </button>
          <p className="text-xs text-gray-400 mt-2">PNG, JPG, WEBP or GIF · max 5MB · stored in Supabase Storage</p>
        </div>

        {/* Target URL */}
        <div>
          <label htmlFor="targetUrl" className="block text-sm font-medium text-gray-700 mb-2">
            Target URL <span className="text-gray-400 font-normal">(optional — image click opens this link)</span>
          </label>
          <div className="relative">
            <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              id="targetUrl"
              type="text"
              value={promo.targetUrl ?? ''}
              onChange={(e) => setPromo((p) => ({ ...p, targetUrl: e.target.value || null }))}
              placeholder="/products  or  https://curlsarefun.com/sale"
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent min-h-[48px]"
            />
          </div>
          <p className="text-xs text-gray-400 mt-1">Accepts internal routes like <code>/cart</code>, <code>/products</code>, <code>/booking</code> or full URLs.</p>
        </div>

        {message && (
          <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-blue-800 text-sm">{message}</div>
        )}

        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !promo.imageUrl}
          className="w-full py-3.5 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 min-h-[52px]"
        >
          {saving && <Loader2 className="w-5 h-5 animate-spin" />}
          <span>{saving ? 'Saving…' : 'Save popup settings'}</span>
        </button>
      </div>
    </div>
  );
}
