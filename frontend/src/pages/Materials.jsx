import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { BookOpen, Plus, ChevronRight, CheckCircle, Circle, X, Save, FileText, Download, Paperclip, Trash2, FileImage, FileArchive, File } from 'lucide-react';
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
  const [formFiles, setFormFiles] = useState([]); // Array of File objects
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
      // Kirim semua file dengan field name 'files'
      formFiles.forEach(f => formData.append('files', f));

      await api.post('/api/materials/create', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      toast.success('Materi baru berhasil dipublikasikan!');
      setShowForm(false);
      setFormTitle(''); setFormSubjectName(''); setFormSummary(''); setFormContent(''); setFormVideoUrl(''); setFormFiles([]);
      fetchMaterials();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal membuat materi');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getAttachmentUrl = (url) => {
    if (!url) return '#';
    if (url.startsWith('http')) return url;
    const baseUrl = import.meta.env.VITE_API_URL || '';
    return url.startsWith('/') ? `${baseUrl}${url}` : `${baseUrl}/uploads/${url}`;
  };

  const getFileIcon = (filename) => {
    const ext = (filename || '').split('.').pop().toLowerCase();
    if (['pdf'].includes(ext)) return <FileText size={20} className="text-rose-400" />;
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) return <FileImage size={20} className="text-emerald-400" />;
    if (['zip', 'rar', '7z'].includes(ext)) return <FileArchive size={20} className="text-amber-400" />;
    if (['doc', 'docx'].includes(ext)) return <FileText size={20} className="text-blue-400" />;
    if (['ppt', 'pptx'].includes(ext)) return <FileText size={20} className="text-orange-400" />;
    if (['xls', 'xlsx'].includes(ext)) return <FileText size={20} className="text-green-400" />;
    return <File size={20} className="text-slate-400" />;
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const removeFormFile = (idx) => {
    setFormFiles(prev => prev.filter((_, i) => i !== idx));
  };

  if (loading || !user) {
    return (
      <div className="page-bg flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const isGuru = user?.role === 'guru';

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
              {isGuru ? 'Kelola Materi Pembelajaran' : 'Materi Pembelajaran'}
            </h1>
            <p className="text-slate-400 mt-2">
              {isGuru ? 'Buat dan bagikan modul/file materi untuk murid Anda.' : 'Akses modul materi dan dokumen pembelajaran dari mentor Anda.'}
            </p>
          </div>
          {isGuru && (
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
                    {!isGuru && (
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

                  {/* Upload File PDF/Dokumen - Multiple */}
                  <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.08] space-y-3">
                    <label className="block text-sm font-semibold text-slate-200 flex items-center gap-2">
                      <Paperclip size={16} className="text-primary-light" /> Lampiran File (bisa lebih dari 1)
                    </label>
                    <p className="text-xs text-slate-400">Upload PDF, Word, PPT, ZIP, Gambar, dll. Klik atau seret beberapa file sekaligus.</p>
                    <input
                      id="mat-file-input"
                      type="file"
                      multiple
                      onChange={e => {
                        const picked = Array.from(e.target.files);
                        setFormFiles(prev => {
                          const existing = new Set(prev.map(f => f.name + f.size));
                          const fresh = picked.filter(f => !existing.has(f.name + f.size));
                          return [...prev, ...fresh];
                        });
                        e.target.value = '';
                      }}
                      className="text-sm text-slate-300 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-primary/20 file:text-primary-light hover:file:bg-primary/30 transition-all cursor-pointer w-full"
                    />

                    {/* Daftar file yang dipilih */}
                    {formFiles.length > 0 && (
                      <ul className="space-y-2 mt-2">
                        {formFiles.map((f, idx) => (
                          <li key={idx} className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-white/[0.05] border border-white/[0.08]">
                            <div className="flex items-center gap-2 min-w-0">
                              {getFileIcon(f.name)}
                              <span className="text-sm text-slate-200 truncate">{f.name}</span>
                              <span className="text-xs text-slate-500 flex-shrink-0">{formatFileSize(f.size)}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeFormFile(idx)}
                              className="text-slate-500 hover:text-rose-400 transition-colors flex-shrink-0"
                              title="Hapus file ini"
                            >
                              <X size={16} />
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
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

                    {/* Attachments — Multi-file */}
                    {selectedMaterial.attachments && selectedMaterial.attachments.length > 0 && (
                      <div className="mb-6">
                        <h4 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                          <Paperclip size={15} className="text-primary-light" />
                          Lampiran File ({selectedMaterial.attachments.length})
                        </h4>
                        <div className="space-y-2">
                          {selectedMaterial.attachments.map((att, idx) => (
                            <div
                              key={att.id ?? idx}
                              className="flex items-center justify-between gap-3 p-3 rounded-xl bg-gradient-to-r from-primary/5 to-violet/5 border border-primary/20 group hover:border-primary/40 transition-all"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
                                  {getFileIcon(att.name)}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-white truncate">{att.name}</p>
                                  {att.size && (
                                    <p className="text-xs text-slate-500">{formatFileSize(att.size)}</p>
                                  )}
                                </div>
                              </div>
                              <a
                                href={getAttachmentUrl(att.url)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1.5 text-xs font-semibold text-primary-light border border-primary/30 rounded-lg px-3 py-1.5 hover:bg-primary/20 transition-all flex-shrink-0"
                              >
                                <Download size={13} /> Unduh
                              </a>
                            </div>
                          ))}
                        </div>
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
