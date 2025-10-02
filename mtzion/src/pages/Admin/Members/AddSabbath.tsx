import React, { useState } from 'react';
import { supabase } from '../../../lib/supabase';

const AddSabbath: React.FC = () => {
  const [resourceForm, setResourceForm] = useState({
    title: '',
    category: 'adult' as 'adult' | 'children',
  });
  const [resourceFile, setResourceFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<string | null>(null);
  const [uploadErr, setUploadErr] = useState<string | null>(null);

  const handleResourceChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target as HTMLInputElement & HTMLSelectElement;
    setResourceForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    setResourceFile(e.target.files && e.target.files[0] ? e.target.files[0] : null);
  };

  // Left form removed, submission handler no longer needed

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);
    setUploadMsg(null);
    setUploadErr(null);
    
    try {
      // Validation
      if (!resourceFile) throw new Error('Please choose a file to upload');
      if (!resourceForm.title.trim()) throw new Error('Please enter a title');
      
      // File size limit (25MB)
      const maxBytes = 25 * 1024 * 1024;
      if (resourceFile.size > maxBytes) {
        throw new Error('File too large. Max allowed size is 25MB.');
      }

      // Get current user for debugging
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) {
        console.error('Auth error:', authError);
        throw new Error('Authentication error. Please log in again.');
      }
      
      if (!user) {
        throw new Error('No authenticated user found');
      }

      console.log('Current user:', { id: user.id, email: user.email });

      // Check user type for debugging
      const { data: systemUser } = await supabase
        .from('system_users')
        .select('role, is_active')
        .eq('user_id', user.id)
        .single();
      
      const { data: member } = await supabase
        .from('members')
        .select('first_name, last_name')
        .eq('user_id', user.id)
        .single();

      console.log('User check:', { 
        systemUser: systemUser || null, 
        member: member || null 
      });

      // Upload to storage
      const bucket = 'sabbath-resources';
      const fileExt = resourceFile.name.split('.').pop();
      const path = `${resourceForm.category}/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;

      console.log('Uploading to storage:', { bucket, path });
      const { error: upErr } = await supabase.storage.from(bucket).upload(path, resourceFile, {
        cacheControl: '3600',
        upsert: false,
        contentType: resourceFile.type || 'application/octet-stream',
      });
      
      if (upErr) {
        console.error('Storage upload error:', upErr);
        throw new Error(`Storage upload failed: ${upErr.message}`);
      }

      console.log('Storage upload successful');

      // Get public URL
      const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(path);
      const fileUrl = publicUrlData?.publicUrl || null;

      // Prepare database insert (without created_by - let database handle it)
      const insertPayload = {
        title: resourceForm.title.trim(),
        category: resourceForm.category,
        file_path: path,
        file_url: fileUrl,
      };

      console.log('Attempting database insert:', insertPayload);
      
      // Insert into sabbath_resources table
      const { error: insErr, data: insertedData } = await supabase
        .from('sabbath_resources')
        .insert(insertPayload)
        .select();

      if (insErr) {
        console.error('Database insert error:', insErr);
        
        // Clean up uploaded file since insert failed
        await supabase.storage.from(bucket).remove([path]);
        
        throw new Error(`Database error: ${insErr.message}`);
      }

      console.log('Database insert successful:', insertedData);

      // Success
      setUploadMsg('Resource uploaded successfully');
      setResourceForm({ title: '', category: resourceForm.category });
      setResourceFile(null);
      
      // Clear file input
      const fileInput = document.getElementById('sabbath-resource-file') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

    } catch (err: any) {
      console.error('Upload error details:', err);
      const msg = err?.message || 'Failed to upload resource';
      setUploadErr(msg);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Upload Sabbath Lesson Resources</h1>
        <p className="text-gray-600">Share study materials for Adult or Children categories</p>
      </div>


      <div className="bg-white rounded-xl shadow-md border overflow-hidden w-full">
        <div className="px-6 py-4 border-b bg-gray-50 flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-gray-800">Upload Lesson Resource</div>
            <div className="text-xs text-gray-500">PDF, DOCX, PPTX, images or media up to 25MB</div>
          </div>
        </div>
        <form onSubmit={handleUpload} className="p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm text-gray-700 mb-1">Title</label>
              <input name="title" value={resourceForm.title} onChange={handleResourceChange} placeholder="e.g. Q4 Adult Lesson, Week 3" className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">Category</label>
              <select name="category" value={resourceForm.category} onChange={handleResourceChange} className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/50">
                <option value="adult">Adult</option>
                <option value="children">Children</option>
              </select>
            </div>
          </div>
          
          <div>
            <label className="block text-sm text-gray-700 mb-2">File</label>
            <input id="sabbath-resource-file" type="file" accept=".pdf,.doc,.docx,.ppt,.pptx,.png,.jpg,.jpeg,.gif,.mp3,.mp4,.wav" onChange={handleFile} className="w-full border rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-primary/50" />
            {resourceFile && (
              <div className="mt-1 text-xs text-gray-500">Selected: {resourceFile.name}</div>
            )}
          </div>
          {uploadErr && <div className="text-sm text-red-600">{uploadErr}</div>}
          {uploadMsg && <div className="text-sm text-green-600">{uploadMsg}</div>}
          <div className="flex items-center gap-3">
            <button type="submit" disabled={uploading} className="px-5 py-2.5 bg-primary text-white rounded-lg hover:opacity-90 disabled:opacity-60">{uploading ? 'Uploading…' : 'Upload Resource'}</button>
            <button type="button" onClick={() => { setResourceForm({ title: '', category: resourceForm.category }); setResourceFile(null); (document.getElementById('sabbath-resource-file') as HTMLInputElement | null)?.value && ((document.getElementById('sabbath-resource-file') as HTMLInputElement).value = ''); }} className="px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50">Clear</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddSabbath;




