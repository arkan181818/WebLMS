import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { BookOpen, Plus, ChevronRight, CheckCircle, Circle, X, Save, FileText, Download, Paperclip } from 'lucide-react';
import Sidebar from '../components/Sidebar';

export default function Materials({ user, onLogout }) {
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMaterial, setSelectedMaterial] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  // Form states
  const [formTitle, setFormTitle] = useState('');
  const [formSubjectName, setFormSubjectName] = useState('');
  const [formSummary, setFormSummary] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formVideoUrl, setFormVideoUrl] = useState('');
  const [formFile, setFormFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchMaterials();
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
    if (!formSubjectName.trim()) { toast.error('Mata pelajaran wajib diisi'); return; }
    if (!formTitle.trim() || !formContent.trim()) { toast.error('Judul dan isi materi wajib diisi'); return; }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('title', formTitle);
      formData.append('subject_name', formSubjectName);
      formData.append('summary', formSummary);
      formData.append('content', formContent);
      if (formVideoUrl) formData.append('video_url', formVideoUrl);
      if (formFile) formData.append('file', formFile);

      await api.post('/api/materials/create', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      toast.success('Materi baru berhasil dipublikasikan!');
      setShowForm(false);
      setFormTitle(''); setFormSubjectName(''); setFormSummary(''); setFormContent(''); setFormVideoUrl(''); setFormFile(null);
      fetchMaterials();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal membuat materi');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getAttachmentUrl = (filename) => {
    if (!filename) return '#';
    if (filename.startsWith('http')) return filename;
    const baseUrl = import.meta.env.VITE_API_URL || '';
    return `${baseUrl}/uploads/${filename}`;
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
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">
              {user.role === 'guru' ? 'Kelola Materi Pembelajaran' : 'Materi Pembelajaran'}
            </h1>
            <p className="text-slate-400 mt-2">
              {user.role === 'guru' ? 'Buat dan bagikan modul/file materi untuk murid Anda.' : 'Akses modul materi dan dokumen pembelajaran dari mentor Anda.'}
            </p>
          </div>
          {user.role === 'guru' && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowForm(true)}
              className="btn btn-primary shadow-lg shadow-primary/30 flex items-center gap-2"
            >
              <Plus size={18} /> Buat Materi Baru
            </motion.button>
          )}
        </motion.div>

        {/* Daftar Materi */}
        {materials.length === 0 ? (
          <div className="glass-card p-12 text-center max-w-lg mx-auto mt-12">
            <BookOpen className="w-16 h-16 mx-auto mb-4 text-slate-600" />
            <h3 className="text-lg font-bold text-white mb-1">Belum Ada Materi</h3>
            <p className="text-slate-400 text-sm">
              {user.role === 'guru' ? 'Klik "Buat Materi Baru" untuk mempublikasikan materi pertama.' : 'Mentor belum menambahkan materi.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {materials.map(materi => (
              <motion.div
                key={materi.id}
                whileHover={{ y: -4 }}
                className="glass-card p-6 flex flex-col justify-between group hover:border-primary/40 transition-all duration-300"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary-light text-xs font-semibold">
                      {materi.subject_name || 'Umum'}
                    </span>
                    {user.role === 'murid' && (
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-md flex items-center gap-1 ${materi.is_completed ? 'bg-secondary/15 text-secondary border border-secondary/20' : 'bg-white/5 text-slate-500'}`}>
                        {materi.is_completed ? <CheckCircle size={12} /> : <Circle size={12} />}
                        {materi.is_completed ? 'Selesai' : 'Belum'}
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-bold text-white group-hover:text-primary-light transition-colors mb-2 line-clamp-2">
                    {materi.title}
                  </h3>
                  <p className="text-slate-400 text-sm line-clamp-3 mb-4">
                    {materi.summary || materi.content}
                  </p>
                </div>

                <div className="pt-4 border-t border-white/[0.06] flex items-center justify-between">
                  <span className="text-xs text-slate-500">
                    {new Date(materi.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                  <motion.button
                    whileHover={{ x: 2 }}
                    onClick={() => openDetail(materi.id)}
                    className="text-sm font-semibold text-primary-light flex items-center gap-1 hover:underline"
                  >
                    Baca Detail <ChevronRight size={16} />
                  </motion.button>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Modal Form Tambah Materi */}
        <AnimatePresence>
          {showForm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="glass-card w-full max-w-2xl p-6 relative max-h-[90vh] overflow-y-auto"
              >
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/[0.08]">
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <BookOpen className="text-primary-light" size={24} /> Buat Materi Pembelajaran Baru
                  </h2>
                  <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-white p-1">
                    <X size={20} />
                  </button>
                </div>

                <form onSubmit={handleCreateMaterial} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      Mata Pelajaran <span className="text-rose">*</span>
                    </label>
                    <input
                      type="text"
                      value={formSubjectName}
                      onChange={e => setFormSubjectName(e.target.value)}
                      placeholder="Ketik Mata Pelajaran (contoh: Matematika, Pemrograman Web, Fisika...)"
                      className="input-field"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      Judul Materi <span className="text-rose">*</span>
                    </label>
                    <input
                      type="text"
                      value={formTitle}
                      onChange={e => setFormTitle(e.target.value)}
                      placeholder="Judul materi pembelajaran..."
                      className="input-field"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Ringkasan Singkat</label>
                    <input
                      type="text"
                      value={formSummary}
                      onChange={e => setFormSummary(e.target.value)}
                      placeholder="Penjelasan singkat 1-2 kalimat..."
                      className="input-field"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      Konten / Isi Materi Kompleks <span className="text-rose">*</span>
                    </label>
                    <textarea
                      value={formContent}
                      onChange={e => setFormContent(e.target.value)}
                      placeholder="Tuliskan materi pembelajaran lengkap di sini..."
                      className="input-field min-h-[140px]"
                      required
                    />
                  </div>

                  {/* Upload File PDF/Dokumen */}
                  <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.08]">
                    <label className="block text-sm font-semibold text-slate-200 mb-1 flex items-center gap-2">
                      <Paperclip size={16} className="text-primary-light" /> Lampiran File (PDF / Dokumen / Gambar)
                    </label>
                    <p className="text-xs text-slate-400 mb-3">Upload modul materi berformat PDF, Word, PPT, ZIP, atau Gambar.</p>
                    <input
                      type="file"
                      onChange={e => setFormFile(e.target.files[0])}
                      className="text-sm text-slate-300 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-primary/20 file:text-primary-light hover:file:bg-primary/30 transition-all cursor-pointer"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">URL Video YouTube (Opsional)</label>
                    <input
                      type="url"
                      value={formVideoUrl}
                      onChange={e => setFormVideoUrl(e.target.value)}
                      placeholder="https://www.youtube.com/watch?v=..."
                      className="input-field"
                    />
                  </div>

                  <div className="pt-4 flex justify-end gap-3">
                    <button type="button" onClick={() => setShowForm(false)} className="btn bg-white/5 hover:bg-white/10 text-slate-300">
                      Batal
                    </button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      type="submit"
                      disabled={isSubmitting}
                      className="btn btn-primary flex items-center gap-2"
                    >
                      <Save size={18} /> {isSubmitting ? 'Menyimpan...' : 'Simpan Materi'}
                    </motion.button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Modal Detail Materi */}
        <AnimatePresence>
          {selectedMaterial && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="glass-card w-full max-w-3xl p-6 relative max-h-[90vh] overflow-y-auto"
              >
                {detailLoading ? (
                  <div className="py-12 text-center text-slate-400">Memuat detail materi...</div>
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-4 mb-4 pb-4 border-b border-white/[0.08]">
                      <div>
                        <span className="px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary-light text-xs font-semibold mb-2 inline-block">
                          {selectedMaterial.subject_name || 'Mata Pelajaran'}
                        </span>
                        <h2 className="text-2xl font-bold text-white">{selectedMaterial.title}</h2>
                      </div>
                      <button onClick={() => setSelectedMaterial(null)} className="text-slate-400 hover:text-white p-1">
                        <X size={20} />
                      </button>
                    </div>

                    {/* Attachment PDF Download */}
                    {selectedMaterial.attachment_url && (
                      <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-primary/10 to-violet/10 border border-primary/30 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center text-primary-light">
                            <FileText size={20} />
                          </div>
                          <div>
                            <h4 className="text-sm font-semibold text-white">File Lampiran Modul</h4>
                            <p className="text-xs text-slate-400">{selectedMaterial.attachment || 'Dokumen Materi'}</p>
                          </div>
                        </div>
                        <a
                          href={getAttachmentUrl(selectedMaterial.attachment_url)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-primary py-2 px-4 text-xs flex items-center gap-2 shadow-lg shadow-primary/20"
                        >
                          <Download size={14} /> Unduh / Buka PDF
                        </a>
                      </div>
                    )}

                    {/* YouTube Video */}
                    {selectedMaterial.video_url && (
                      <div className="mb-6 aspect-video rounded-xl overflow-hidden border border-white/10 shadow-2xl">
                        <iframe
                          src={selectedMaterial.video_url}
                          title={selectedMaterial.title}
                          className="w-full h-full"
                          allowFullScreen
                        />
                      </div>
                    )}

                    {/* Text Content */}
                    <div className="prose prose-invert max-w-none text-slate-300 text-sm whitespace-pre-wrap leading-relaxed mb-6">
                      {selectedMaterial.content}
                    </div>

                    {/* Footer Actions */}
                    <div className="pt-4 border-t border-white/[0.08] flex items-center justify-between">
                      {user.role === 'murid' ? (
                        <button
                          onClick={() => toggleComplete(selectedMaterial.id)}
                          className={`btn flex items-center gap-2 ${
                            selectedMaterial.is_completed
                              ? 'bg-secondary/20 border border-secondary/40 text-secondary'
                              : 'btn-primary'
                          }`}
                        >
                          <CheckCircle size={18} />
                          {selectedMaterial.is_completed ? 'Selesai (Klik untuk Batal)' : 'Tandai Selesai Modul Ini'}
                        </button>
                      ) : <div />}
                      <button onClick={() => setSelectedMaterial(null)} className="btn bg-white/5 hover:bg-white/10 text-slate-300">
                        Tutup
                      </button>
                    </div>
                  </>
                )}
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
