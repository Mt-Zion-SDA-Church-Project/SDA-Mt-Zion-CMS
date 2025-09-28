import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!supabaseUrl || !/^https?:\/\//i.test(supabaseUrl) || /YOUR-PROJECT-REF/i.test(supabaseUrl)) {
  throw new Error(
    'VITE_SUPABASE_URL is missing or still set to the placeholder. Paste your real project URL in .env.local and restart the dev server.'
  );
}

if (!supabaseAnonKey || /YOUR-ANON-PUBLIC-KEY/i.test(supabaseAnonKey)) {
  throw new Error(
    'VITE_SUPABASE_ANON_KEY is missing or still set to the placeholder. Paste your real anon key in .env.local and restart the dev server.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const uploadFile = async (file: File, bucket: string, path: string) => {
  const { data, error } = await supabase.storage.from(bucket).upload(path, file);
  
  if (error) {
    throw error;
  }
  
  return data;
};

export const getFileUrl = (bucket: string, path: string) => {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
};