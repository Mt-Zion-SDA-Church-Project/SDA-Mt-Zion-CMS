import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';

type ResourceRow = {
  id: string;
  title: string;
  category: 'adult' | 'children';
  file_url: string | null;
  file_path: string;
  created_at: string;
};

const MemberResources: React.FC = () => {
  const [resources, setResources] = useState<ResourceRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'adult' | 'children'>('adult');
  const [query, setQuery] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error } = await supabase
          .from('sabbath_resources')
          .select('id, title, category, file_url, file_path, created_at')
          .order('created_at', { ascending: false });
        if (error) throw error;
        setResources((data as any) || []);
      } catch (err: any) {
        setError(err.message || 'Failed to load resources');
      } finally {
        setLoading(false);
      }
    };
    load();

    const channel = supabase
      .channel('member-sabbath-resources')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sabbath_resources' }, () => {
        load();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const filtered = useMemo(() => {
    const byCat = resources.filter((r) => r.category === activeTab);
    if (!query.trim()) return byCat;
    const q = query.toLowerCase();
    return byCat.filter((r) => r.title.toLowerCase().includes(q));
  }, [resources, activeTab, query]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Sabbath School Resources</h1>
        <p className="text-gray-600">Download lesson materials shared by church admins</p>
      </div>

      <div className="bg-white rounded-lg shadow-md">
        <div className="px-4 py-3 border-b bg-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('adult')}
              className={`px-3 py-1.5 rounded text-sm ${activeTab === 'adult' ? 'bg-primary text-white' : 'bg-white border'}`}
            >
              Adult
            </button>
            <button
              onClick={() => setActiveTab('children')}
              className={`px-3 py-1.5 rounded text-sm ${activeTab === 'children' ? 'bg-primary text-white' : 'bg-white border'}`}
            >
              Children
            </button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Search:</span>
            <input value={query} onChange={(e) => setQuery(e.target.value)} className="border rounded px-2 py-1 text-sm w-60" />
          </div>
        </div>

        <div className="px-4 py-3">
          {error && <div className="text-sm text-red-600 mb-2">{error}</div>}
          {loading && <div className="text-sm text-gray-600 mb-2">Loading…</div>}
          <ul className="divide-y">
            {filtered.map((r) => (
              <li key={r.id} className="py-3 flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-800">{r.title}</div>
                  <div className="text-xs text-gray-500">{new Date(r.created_at).toLocaleString()}</div>
                </div>
                {r.file_url ? (
                  <a href={r.file_url} target="_blank" rel="noreferrer" className="px-3 py-1.5 text-xs bg-primary text-white rounded">Download</a>
                ) : (
                  <span className="text-xs text-gray-500">No file URL</span>
                )}
              </li>
            ))}
            {filtered.length === 0 && !loading && (
              <li className="py-6 text-sm text-gray-500">No resources found.</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default MemberResources;


