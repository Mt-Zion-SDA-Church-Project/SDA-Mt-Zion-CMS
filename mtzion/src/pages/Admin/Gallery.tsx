import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { UploadCloud, Images, Plus, Loader2, Search, Layers, Calendar, X, ChevronLeft, ChevronRight } from 'lucide-react';

interface EventItem {
  id: string;
  title: string;
  event_date: string;
}

interface GalleryItem {
  id: string;
  title: string;
  description?: string;
  cover_image_url?: string | null;
  event_id?: string | null;
  created_at: string;
}

interface PhotoItem {
  id: string;
  image_url: string;
  caption?: string;
  created_at: string;
}

const AdminGallery: React.FC = () => {
  const BUCKET_ID = (import.meta as any).env?.VITE_GALLERIES_BUCKET || 'galleries';
  const [activeTab, setActiveTab] = useState<'upload' | 'browse'>('upload');

  // Upload state
  const [events, setEvents] = useState<EventItem[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [albumTitle, setAlbumTitle] = useState('');
  const [albumDescription, setAlbumDescription] = useState('');
  const [files, setFiles] = useState<FileList | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Browse state
  const [galleries, setGalleries] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  
  // Album detail state
  const [selectedAlbum, setSelectedAlbum] = useState<GalleryItem | null>(null);
  const [albumPhotos, setAlbumPhotos] = useState<PhotoItem[]>([]);
  const [photosLoading, setPhotosLoading] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

  useEffect(() => {
    const loadEvents = async () => {
      const { data } = await supabase
        .from('events')
        .select('id, title, event_date')
        .order('event_date', { ascending: false });
      setEvents((data as EventItem[]) || []);
    };
    loadEvents();
  }, []);

  const loadGalleries = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('galleries')
      .select('id, title, description, cover_image_url, event_id, created_at')
      .order('created_at', { ascending: false });
    if (!error) setGalleries((data as GalleryItem[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    if (activeTab === 'browse') {
      loadGalleries();
      const channel = supabase
        .channel('galleries-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'galleries' }, () => loadGalleries())
        .subscribe();
      return () => { supabase.removeChannel(channel); };
    }
  }, [activeTab]);

  const filteredGalleries = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return galleries;
    return galleries.filter(g => g.title.toLowerCase().includes(q) || (g.description || '').toLowerCase().includes(q));
  }, [search, galleries]);

  const loadAlbumPhotos = async (albumId: string) => {
    setPhotosLoading(true);
    try {
      const { data, error } = await supabase
        .from('gallery_photos')
        .select('id, image_url, caption, created_at')
        .eq('gallery_id', albumId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      setAlbumPhotos((data as PhotoItem[]) || []);
    } catch (err) {
      console.error('Error loading album photos:', err);
      setAlbumPhotos([]);
    } finally {
      setPhotosLoading(false);
    }
  };

  const handleAlbumClick = async (album: GalleryItem) => {
    setSelectedAlbum(album);
    setCurrentPhotoIndex(0);
    await loadAlbumPhotos(album.id);
  };

  const closeAlbumView = () => {
    setSelectedAlbum(null);
    setAlbumPhotos([]);
    setCurrentPhotoIndex(0);
  };

  const nextPhoto = () => {
    setCurrentPhotoIndex((prev) => (prev + 1) % albumPhotos.length);
  };

  const prevPhoto = () => {
    setCurrentPhotoIndex((prev) => (prev - 1 + albumPhotos.length) % albumPhotos.length);
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFiles(e.target.files);
  };

  const onCreateAlbumAndUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadError(null);
    setSuccessMsg(null);
    if (!albumTitle.trim()) {
      setUploadError('Album title is required');
      return;
    }
    if (!files || files.length === 0) {
      setUploadError('Please select at least one image');
      return;
    }
    setUploading(true);
    try {
      // 1) Create gallery (album)
      const { data: inserted, error: gErr } = await supabase
        .from('galleries')
        .insert({
          title: albumTitle.trim(),
          description: albumDescription.trim() || null,
          event_id: selectedEventId || null,
        })
        .select()
        .single();
      if (gErr) throw gErr;

      const galleryId = inserted.id as string;
      // 2) Upload images to storage and insert records
      const uploadedFirstUrl: string | null = await (async () => {
        let firstUrl: string | null = null;
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const ext = file.name.split('.').pop();
          const path = `${galleryId}/${Date.now()}_${i}.${ext}`;
          const { error: upErr } = await supabase.storage.from(BUCKET_ID).upload(path, file, {
            cacheControl: '3600',
            upsert: false,
            contentType: file.type || 'image/jpeg'
          });
          if (upErr) throw upErr;

          const { data: pub } = supabase.storage.from(BUCKET_ID).getPublicUrl(path);
          const imageUrl = pub?.publicUrl as string;
          if (!firstUrl) firstUrl = imageUrl;

          await supabase.from('gallery_photos').insert({
            gallery_id: galleryId,
            event_id: selectedEventId || null,
            image_url: imageUrl,
            image_path: path,
          });
        }
        return firstUrl;
      })();

      if (uploadedFirstUrl) {
        await supabase
          .from('galleries')
          .update({ cover_image_url: uploadedFirstUrl, cover_image_path: `${galleryId}` })
          .eq('id', galleryId);
      }

      setSuccessMsg('Album created and photos uploaded successfully');
      setAlbumTitle('');
      setAlbumDescription('');
      setSelectedEventId('');
      setFiles(null);
      const fileInput = document.getElementById('gallery-files') as HTMLInputElement | null;
      if (fileInput) fileInput.value = '';
    } catch (err: any) {
      setUploadError(err?.message || 'Failed to upload photos');
    } finally {
      setUploading(false);
    }
  };

  const AlbumCard: React.FC<{ item: GalleryItem; event?: EventItem | undefined } > = ({ item, event }) => {
    return (
      <div 
        onClick={() => handleAlbumClick(item)}
        className="group relative rounded-2xl overflow-hidden shadow-xl bg-white border border-gray-100 hover:shadow-2xl transition-all cursor-pointer"
      >
        <div className="aspect-[16/10] w-full overflow-hidden">
          {item.cover_image_url ? (
            <img src={item.cover_image_url} alt={item.title} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500" />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
              <Images className="w-12 h-12 text-blue-300" />
            </div>
          )}
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="bg-white/90 backdrop-blur-sm rounded-full px-3 py-1 text-xs font-medium text-gray-700">
            Click to view
          </div>
        </div>
        <div className="p-4">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Layers className="w-4 h-4" />
            <span>Album</span>
            {event && (
              <>
                <span>•</span>
                <Calendar className="w-4 h-4" />
                <span>{new Date(event.event_date).toLocaleDateString()}</span>
              </>
            )}
          </div>
          <div className="mt-1 text-lg font-semibold text-gray-900 line-clamp-1">{item.title}</div>
          {item.description && (
            <div className="mt-1 text-sm text-gray-600 line-clamp-2">{item.description}</div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="p-2 sm:p-4 pb-6 h-full flex flex-col">
      {/* Sticky page header */}
      <div className="sticky top-0 z-10 bg-gray-50/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 py-2">
        {/* Mobile layout */}
        <div className="lg:hidden">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-lg font-bold text-gray-800">Gallery</h1>
            <div className="inline-flex rounded-lg border p-1 bg-white shadow-sm">
              <button onClick={() => setActiveTab('upload')} className={`px-2 py-1 text-xs rounded-md flex items-center gap-1 ${activeTab === 'upload' ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-50'}`}>
                <UploadCloud className="w-3 h-3" /> Upload
              </button>
              <button onClick={() => setActiveTab('browse')} className={`px-2 py-1 text-xs rounded-md flex items-center gap-1 ${activeTab === 'browse' ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-50'}`}>
                <Images className="w-3 h-3" /> Browse
              </button>
            </div>
          </div>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search albums"
              className="pl-9 pr-4 py-2 w-full rounded-md border-gray-300 focus:border-blue-500 focus:ring-blue-500 text-sm"
            />
          </div>
        </div>
        
        {/* Desktop layout */}
        <div className="hidden lg:flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-800 whitespace-nowrap">Gallery</h1>
          {/* Inline search between title and action buttons */}
          <div className="relative flex-1 max-w-xl">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search albums"
              className="pl-9 pr-4 py-2 w-full rounded-md border-gray-300 focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          <div className="ml-auto inline-flex rounded-lg border p-1 bg-white shadow-sm">
            <button onClick={() => setActiveTab('upload')} className={`px-3 py-1.5 text-sm rounded-md flex items-center gap-2 ${activeTab === 'upload' ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-50'}`}>
              <UploadCloud className="w-4 h-4" /> Upload
            </button>
            <button onClick={() => setActiveTab('browse')} className={`px-3 py-1.5 text-sm rounded-md flex items-center gap-2 ${activeTab === 'browse' ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-50'}`}>
              <Images className="w-4 h-4" /> Browse
            </button>
          </div>
        </div>
      </div>

      {/* Scrollable content area */}
      <div className="mt-2 flex-1 overflow-y-auto">
      {activeTab === 'upload' && (
        <form onSubmit={onCreateAlbumAndUpload} className="w-full sm:w-3/4 mx-auto bg-white rounded-xl border p-4 sm:p-6 shadow-sm">
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Album Title</label>
              <input value={albumTitle} onChange={(e) => setAlbumTitle(e.target.value)} className="mt-1 w-full rounded-md border border-gray-300 focus:border-blue-500 focus:ring-blue-500" placeholder="E.g., Youth Retreat 2025" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Related Event (optional)</label>
              <select value={selectedEventId} onChange={(e) => setSelectedEventId(e.target.value)} className="mt-1 w-full rounded-md border border-gray-300 focus:border-blue-500 focus:ring-blue-500">
                <option value="">— None —</option>
                {events.map(ev => (
                  <option key={ev.id} value={ev.id}>{ev.title} — {new Date(ev.event_date).toLocaleDateString()}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Description (optional)</label>
              <textarea value={albumDescription} onChange={(e) => setAlbumDescription(e.target.value)} className="mt-1 w-full rounded-md border border-gray-300 focus:border-blue-500 focus:ring-blue-500" rows={3} placeholder="Say something about this album" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Photos</label>
              <input id="gallery-files" type="file" accept="image/*" multiple onChange={onFileChange} className="mt-1 block w-full text-sm border border-gray-300 rounded-md" />
              <div className="text-xs text-gray-500 mt-1">PNG/JPG up to ~5MB each recommended</div>
            </div>
          </div>
          {uploadError && <div className="mt-4 text-sm text-red-600">{uploadError}</div>}
          {successMsg && <div className="mt-4 text-sm text-green-600">{successMsg}</div>}
          <div className="mt-6">
            <button disabled={uploading} className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-60">
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Create album & upload
            </button>
          </div>
        </form>
      )}

      {activeTab === 'browse' && (
        <div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 pb-24">
            {loading ? (
              <div className="col-span-full flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
            ) : filteredGalleries.length === 0 ? (
              <div className="col-span-full text-sm text-gray-600">No albums found.</div>
            ) : (
              filteredGalleries.map(g => (
                <AlbumCard key={g.id} item={g} event={events.find(e => e.id === g.event_id)} />
              ))
            )}
          </div>
        </div>
      )}
      </div>

      {/* Album Detail Modal */}
      {selectedAlbum && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-2 sm:p-4">
          <div className="bg-white rounded-2xl max-w-6xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 sm:p-6 border-b">
              <div className="flex-1 min-w-0">
                <h2 className="text-lg sm:text-2xl font-bold text-gray-800 truncate">{selectedAlbum.title}</h2>
                {selectedAlbum.description && (
                  <p className="text-gray-600 mt-1 text-sm sm:text-base line-clamp-2">{selectedAlbum.description}</p>
                )}
                <p className="text-xs sm:text-sm text-gray-500 mt-2">
                  {albumPhotos.length} photo{albumPhotos.length !== 1 ? 's' : ''}
                </p>
              </div>
              <button
                onClick={closeAlbumView}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0 ml-2"
              >
                <X className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 sm:p-6">
              {photosLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                </div>
              ) : albumPhotos.length === 0 ? (
                <div className="text-center py-12">
                  <Images className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No photos in this album yet</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Main Photo Display */}
                  <div className="relative">
                    <div className="aspect-video bg-gray-100 rounded-xl overflow-hidden">
                      <img
                        src={albumPhotos[currentPhotoIndex]?.image_url}
                        alt={`Photo ${currentPhotoIndex + 1}`}
                        className="w-full h-full object-contain"
                      />
                    </div>
                    
                    {/* Navigation Arrows */}
                    {albumPhotos.length > 1 && (
                      <>
                        <button
                          onClick={prevPhoto}
                          className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white/90 hover:bg-white rounded-full p-2 shadow-lg transition-colors"
                        >
                          <ChevronLeft className="w-6 h-6 text-gray-700" />
                        </button>
                        <button
                          onClick={nextPhoto}
                          className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white/90 hover:bg-white rounded-full p-2 shadow-lg transition-colors"
                        >
                          <ChevronRight className="w-6 h-6 text-gray-700" />
                        </button>
                      </>
                    )}

                    {/* Photo Counter */}
                    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/70 text-white px-3 py-1 rounded-full text-sm">
                      {currentPhotoIndex + 1} / {albumPhotos.length}
                    </div>
                  </div>

                  {/* Thumbnail Grid */}
                  {albumPhotos.length > 1 && (
                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                      {albumPhotos.map((photo, index) => (
                        <button
                          key={photo.id}
                          onClick={() => setCurrentPhotoIndex(index)}
                          className={`aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                            index === currentPhotoIndex
                              ? 'border-blue-500 ring-2 ring-blue-200'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <img
                            src={photo.image_url}
                            alt={`Thumbnail ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Photo Info */}
                  {albumPhotos[currentPhotoIndex]?.caption && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-gray-700">{albumPhotos[currentPhotoIndex].caption}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminGallery;




