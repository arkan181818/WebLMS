import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { BookOpen, Plus, ChevronRight, CheckCircle, Circle, X, Save } from 'lucide-react';
import Sidebar from '../components/Sidebar';

export default function Materials({ user, onLogout }) {
  const [materials, setMaterials] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMaterial, setSelectedMaterial] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  const [formTitle, setFormTitle] = useState('');
  const [formSummary, setFormSummary] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formSubjectId, setFormSubjectId] = useState('');
  const [formVideoUrl, setFormVideoUrl] = useState('');

  useEffect(() => {
    fetchMaterials();
    fetchSubjects();
  }, []);

  const fetchMaterials = async () => {
    try {
      const res = await api.get('/api/materials');
      setMaterials(res.data);
    } catch (err) {
      toast.error('Gagal memuat materi');
    } finally {
      setLoading(false);
    }
  };

  const fetchSubjects = async () => {
    try {
      const res = await api.get('/api/subjects');
      setSubjects(res.data);
    } catch (err) { /* ignore */ }
  };

  const openDetail = async (id) => {
    setDetailLoading(true);
    try {
      const res = await api.get(`/api/materials/${id}`);
      setSelectedMaterial(res.data);
    } catch (err) {
      toast.error('Gagal memuat detail materi');
    } finally {
      setDetailLoading(false);
    }
  };

  const toggleComplete = async (id) => {
    try {
      const res = await api.post(`/api/materials/${id}/toggle`);
      setSelectedMaterial(prev => ({ ...prev, is_completed: res.data.is_completed }));
      setMaterials(prev => prev.map(m => m.id === id ? { ...m, is_completed: res.data.is_completed } : m));
      toast.success(res.data.is_completed ? 'Materi ditandai selesai!' : 'Status materi dibatalkan.');
    } catch (err) {
      toast.error('Gagal mengubah status');
    }
  };

  const handleCreateMaterial = async (e) => {
    e.preventDefault();
    if (!formSubjectId) { toast.error('Pilih mata pelajaran'); return; }
    try {
      await api.post('/api/materials/create', {
        title: formTitle, summary: formSummary, content: formContent,
        subject_id: formSubjectId, video_url: formVideoUrl,
      });
      toast.success('Materi berhasil dibuat!');
      setShowForm(false);
      setFormTitle(''); setFormSummary(''); setFormContent(''); setFormSubjectId(''); setFormVideoUrl('');
      fetchMaterials();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal membuat materi');
    }
  };

  if (loading) {
    return (
      <div className="page-bg flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="page-bg flex">
      <div className="mesh-grid" />
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <Sidebar user={user} onLogout={onLogout} />

      <div className="flex-1 ml-64 p-8 relative z-10">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">
              {user.role === 'guru' ? 'Kelola Materi' : 'Materi Pembelajaran'}
            </h1>
            <p className="text-slate-400 mt-1">
              {user.role === 'guru' ? 'Buat dan kelola materi untuk murid Anda.' : 'Akses materi yang ditugaskan oleh mentor Anda.'}
            </p>
          </div>
          {user.role === 'guru' && (
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setShowForm(true)} className="btn btn-primary">
              <Plus size={18} /> Buat Materi
            </motion.button>
          )}
        </motion.div>

        {materials.length === 0 ? (
          <div className="glass-card p-16 text-center">
            <BookOpen className="w-16 h-16 mx-auto mb-4 text-slate-600" />
            <h2 className="text-xl font-bold text-white mb-2">Belum Ada Materi</h2>
            <p className="text-slate-400">{user.role === 'guru' ? 'Klik "Buat Materi" untuk memulai.' : 'Mentor Anda belum menugaskan materi.'}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {materials.map((m, idx) => (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                key={m.id}
                onClick={() => openDetail(m.id)}
                className="glass-card p-5 cursor-pointer hover:border-primary/30 transition-all duration-300 group hover:-translate-y-1"
              >
                <div className="flex items-start justify-between mb-3">
                  <span className="text-xs font-semibold text-primary-light bg-primary/15 border border-primary/20 px-2.5 py-1 rounded-full">{m.subject_name}</span>
                  {user.role === 'murid' && (
                    m.is_completed
                      ? <CheckCircle className="w-5 h-5 text-secondary" />
                      : <Circle className="w-5 h-5 text-slate-600" />
                  )}
                </div>
                <h3 className="font-bold text-white mb-1 group-hover:text-primary-light transition-colors">{m.title}</h3>
                <p className="text-sm text-slate-500 line-clamp-2">{m.summary}</p>
                <div className="flex items-center gap-1 mt-4 text-xs text-primary-light font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                  Baca selengkapnya <ChevronRight className="w-3 h-3" />
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Detail Modal */}
        <AnimatePresence>
          {selectedMaterial && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => setSelectedMaterial(null)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="glass-card w-full max-w-3xl max-h-[85vh] overflow-y-auto"
              >
                <div className="p-6 border-b border-white/[0.06] flex items-center justify-between sticky top-0 bg-[#0F172A]/95 backdrop-blur-xl z-10 rounded-t-2xl">
                  <div>
                    <span className="text-xs font-semibold text-primary-light bg-primary/15 border border-primary/20 px-2.5 py-1 rounded-full">{selectedMaterial.subject_name}</span>
                    <h2 className="text-xl font-bold text-white mt-2">{selectedMaterial.title}</h2>
                  </div>
                  <button onClick={() => setSelectedMaterial(null)} className="p-2 hover:bg-white/10 rounded-xl transition-colors text-slate-400 hover:text-white"><X size={20} /></button>
                </div>
                <div className="p-6">
                  {selectedMaterial.video_url && (
                    <div className="mb-6 rounded-xl overflow-hidden aspect-video bg-black border border-white/10">
                      <iframe src={selectedMaterial.video_url} className="w-full h-full" allowFullScreen title="Video" />
                    </div>
                  )}
                  <div className="text-slate-300 leading-relaxed whitespace-pre-wrap">{selectedMaterial.content}</div>
                  {user.role === 'murid' && (
                    <div className="mt-8 pt-6 border-t border-white/[0.06]">
                      <motion.button
                        whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                        onClick={() => toggleComplete(selectedMaterial.id)}
                        className={`btn w-full py-3 ${selectedMaterial.is_completed ? 'btn-secondary' : 'bg-white/10 text-white hover:bg-secondary hover:text-white border border-white/10'}`}
                      >
                        {selectedMaterial.is_completed ? <><CheckCircle size={18} /> Sudah Selesai ✓</> : <><Circle size={18} /> Tandai Selesai</>}
                      </motion.button>
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Create Form Modal */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => setShowForm(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="glass-card w-full max-w-2xl max-h-[85vh] overflow-y-auto"
              >
                <div className="p-6 border-b border-white/[0.06] flex items-center justify-between">
                  <h2 className="text-xl font-bold text-white">Buat Materi Baru</h2>
                  <button onClick={() => setShowForm(false)} className="p-2 hover:bg-white/10 rounded-xl transition-colors text-slate-400 hover:text-white"><X size={20} /></button>
                </div>
                <form onSubmit={handleCreateMaterial} className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Mata Pelajaran <span className="text-rose">*</span></label>
                    <select value={formSubjectId} onChange={(e) => setFormSubjectId(e.target.value)} className="input-field" required>
                      <option value="">-- Pilih Mata Pelajaran --</option>
                      {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Judul Materi <span className="text-rose">*</span></label>
                    <input type="text" value={formTitle} onChange={(e) => setFormTitle(e.target.value)} className="input-field" placeholder="Contoh: Pengenalan HTML & CSS" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Ringkasan</label>
                    <input type="text" value={formSummary} onChange={(e) => setFormSummary(e.target.value)} className="input-field" placeholder="Deskripsi singkat materi..." />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Konten / Isi Materi <span className="text-rose">*</span></label>
                    <textarea value={formContent} onChange={(e) => setFormContent(e.target.value)} className="input-field min-h-[200px]" placeholder="Tulis isi materi di sini..." required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">URL Video YouTube (Opsional)</label>
                    <input type="url" value={formVideoUrl} onChange={(e) => setFormVideoUrl(e.target.value)} className="input-field" placeholder="https://youtube.com/watch?v=..." />
                  </div>
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="submit" className="btn btn-primary w-full py-3 mt-2">
                    <Save size={18} /> Simpan Materi
                  </motion.button>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
