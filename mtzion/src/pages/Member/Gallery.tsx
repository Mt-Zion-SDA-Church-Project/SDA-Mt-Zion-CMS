import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';
import MemberMobileNav from '../../components/Member/MemberMobileNav';
import { Images, Layers, Calendar, Search, Loader2 } from 'lucide-react';

interface GalleryItem {
  id: string;
  title: string;
  description?: string;
  cover_image_url?: string | null;
  event_id?: string | null;
  created_at: string;
}

interface EventItem {
  id: string;
  title: string;
  event_date: string;
}

const MemberGallery: React.FC = () => {
  const [galleries, setGalleries] = useState<GalleryItem[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  const load = async () => {
    setLoading(true);
    const [{ data: g }, { data: e }] = await Promise.all([
      supabase.from('galleries').select('id, title, description, cover_image_url, event_id, created_at').order('created_at', { ascending: false }),
      supabase.from('events').select('id, title, event_date')
    ]);
    setGalleries((g as GalleryItem[]) || []);
    setEvents((e as EventItem[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const channel = supabase
      .channel('member-galleries')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'galleries' }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return galleries;
    return galleries.filter(a => a.title.toLowerCase().includes(q) || (a.description || '').toLowerCase().includes(q));
  }, [search, galleries]);

  const AlbumCard: React.FC<{ item: GalleryItem; event?: EventItem | undefined } > = ({ item, event }) => (
    <div className="group relative rounded-2xl overflow-hidden shadow-xl bg-white border border-gray-100 hover:shadow-2xl transition-all">
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

  return (
    <div className="p-4 pb-4 h-full flex flex-col">
      <MemberMobileNav />
      {/* Sticky header */}
      <div className="sticky top-0 z-10 bg-gray-50/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 py-2">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-800">Gallery</h1>
        </div>
        <div className="mt-2 max-w-md relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search albums" className="pl-9 w-full rounded-md border-gray-300 focus:border-blue-500 focus:ring-blue-500" />
        </div>
      </div>

      {/* Scrollable grid */}
      <div className="mt-2 flex-1 overflow-y-auto">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pb-24">
        {loading ? (
          <div className="col-span-full flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
        ) : filtered.length === 0 ? (
          <div className="col-span-full text-sm text-gray-600">No albums yet.</div>
        ) : (
          filtered.map(g => (
            <AlbumCard key={g.id} item={g} event={events.find(e => e.id === g.event_id)} />
          ))
        )}
      </div>
      </div>
    </div>
  );
};

export default MemberGallery;




