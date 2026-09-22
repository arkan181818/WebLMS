import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { PenTool, Plus, X, Save, Upload, Clock, CheckCircle, AlertTriangle, FileText, Download, Paperclip, Star, Users, Award } from 'lucide-react';
import Sidebar from '../components/Sidebar';

export default function Assignments({ user, onLogout }) {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [showForm, setShowForm] = useState(false);
  
  // Student submission states
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadNote, setUploadNote] = useState('');
  const [isSubmittingTask, setIsSubmittingTask] = useState(false);

  // Teacher create assignment states
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formSubjectName, setFormSubjectName] = useState('');
  const [formDueDate, setFormDueDate] = useState('');
  const [formFile, setFormFile] = useState(null);
  const [isCreating, setIsCreating] = useState(false);

  // Teacher grading states
  const [submissions, setSubmissions] = useState(null);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [gradeInputs, setGradeInputs] = useState({});
  const [savingGrade, setSavingGrade] = useState({});

  useEffect(() => {
    fetchAssignments();
  }, []);

  const fetchAssignments = async () => {
    try {
      const res = await api.get('/api/assignments');
      setAssignments(res.data);
    } catch (err) {
      toast.error('Gagal memuat tugas');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAssignment = async (e) => {
    e.preventDefault();
    if (!formSubjectName.trim()) { toast.error('Mata pelajaran wajib diisi'); return; }
    if (!formTitle.trim() || !formDesc.trim()) { toast.error('Judul dan deskripsi wajib diisi'); return; }

    setIsCreating(true);
    try {
      const formData = new FormData();
      formData.append('title', formTitle);
      formData.append('description', formDesc);
      formData.append('subject_name', formSubjectName);
      if (formDueDate) formData.append('due_date', formDueDate);
      if (formFile) formData.append('file', formFile);

      await api.post('/api/assignments/create', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      toast.success('Tugas baru berhasil diterbitkan!');
      setShowForm(false);
      setFormTitle(''); setFormDesc(''); setFormSubjectName(''); setFormDueDate(''); setFormFile(null);
      fetchAssignments();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal membuat tugas');
    } finally {
      setIsCreating(false);
    }
  };

  const handleSubmitFile = async (assignmentId) => {
    if (!uploadFile) { toast.error('Pilih file tugas terlebih dahulu'); return; }
    
    setIsSubmittingTask(true);
    const formData = new FormData();
    formData.append('file', uploadFile);
    formData.append('note', uploadNote);

    try {
      await api.post(`/api/assignments/${assignmentId}/submit`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success('Tugas berhasil dikirim ke mentor!');
      setSelectedAssignment(null);
      setUploadFile(null);
      setUploadNote('');
      fetchAssignments();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal mengirim tugas');
    } finally {
      setIsSubmittingTask(false);
    }
  };

  const getFileUrl = (urlPath) => {
    if (!urlPath) return '#';
    if (urlPath.startsWith('http')) return urlPath;
    const baseUrl = import.meta.env.VITE_API_URL || '';
    return `${baseUrl}${urlPath.startsWith('/') ? '' : '/'}${urlPath}`;
  };

  const openAssignmentDetail = async (asg) => {
    setSelectedAssignment(asg);
    setSubmissions(null);
    setGradeInputs({});
    if (asg && user?.role === 'guru') {
      setLoadingSubmissions(true);
      try {
        const res = await api.get(`/api/assignments/${asg.id}/submissions`);
        setSubmissions(res.data);
        const prefill = {};
        res.data.submissions.forEach(s => {
          prefill[s.submission_id] = {
            grade: s.grade !== null && s.grade !== undefined ? String(s.grade) : '',
            feedback: s.feedback || ''
          };
        });
        setGradeInputs(prefill);
      } catch {
        toast.error('Gagal memuat data submission');
      } finally {
        setLoadingSubmissions(false);
      }
    }
  };

  const handleGrade = async (submissionId) => {
    const input = gradeInputs[submissionId] || {};
    if (input.grade === '' || input.grade === undefined) {
      toast.error('Masukkan nilai terlebih dahulu');
      return;
    }
    setSavingGrade(prev => ({ ...prev, [submissionId]: true }));
    try {
      const res = await api.post(`/api/submissions/${submissionId}/grade`, {
        grade: Number(input.grade),
        feedback: input.feedback || ''
      });
      toast.success(res.data.message);
      setSubmissions(prev => ({
        ...prev,
        submissions: prev.submissions.map(s =>
          s.submission_id === submissionId
            ? { ...s, grade: Number(input.grade), feedback: input.feedback, is_graded: true }
            : s
        )
      }));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menyimpan nilai');
    } finally {
      setSavingGrade(prev => ({ ...prev, [submissionId]: false }));
    }
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
              {isGuru ? 'Review & Kelola Tugas' : 'Tugas Saya'}
            </h1>
            <p className="text-slate-400 mt-2">
              {isGuru ? 'Buat penugasan baru dan periksa tugas yang diunggah oleh murid.' : 'Kerjakan dan unggah lembar tugas dari mentor Anda.'}
            </p>
          </div>
          {isGuru && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowForm(true)}
              className="btn btn-primary shadow-lg shadow-primary/30 flex items-center gap-2"
            >
              <Plus size={18} /> Buat Tugas Baru
            </motion.button>
          )}
        </motion.div>

        {/* Daftar Tugas */}
        {assignments.length === 0 ? (
          <div className="glass-card p-12 text-center max-w-lg mx-auto mt-12">
            <PenTool className="w-16 h-16 mx-auto mb-4 text-slate-600" />
            <h3 className="text-lg font-bold text-white mb-1">Belum Ada Tugas</h3>
            <p className="text-slate-400 text-sm">
              {user.role === 'guru' ? 'Klik "Buat Tugas Baru" untuk menerbitkan penugasan.' : 'Belum ada tugas yang diberikan oleh mentor.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {assignments.map(asg => (
              <motion.div
                key={asg.id}
                whileHover={{ y: -4 }}
                className="glass-card p-6 flex flex-col justify-between group hover:border-primary/40 transition-all duration-300"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary-light text-xs font-semibold">
                      {asg.subject_name || 'Umum'}
                    </span>
                    {user.role === 'murid' && (
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-md flex items-center gap-1 ${
                        asg.status === 'graded' ? 'bg-secondary/15 text-secondary border border-secondary/20' :
                        asg.status === 'submitted' ? 'bg-accent/15 text-accent border border-accent/20' :
                        'bg-rose/15 text-rose border border-rose/20'
                      }`}>
                        {asg.status === 'graded' ? <CheckCircle size={12} /> :
                         asg.status === 'submitted' ? <Clock size={12} /> :
                         <AlertTriangle size={12} />}
                        {asg.status === 'graded' ? `Nilai: ${asg.grade}` :
                         asg.status === 'submitted' ? 'Terkirim' :
                         'Belum Kumpul'}
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-bold text-white group-hover:text-primary-light transition-colors mb-2 line-clamp-2">
                    {asg.title}
                  </h3>
                  <p className="text-slate-400 text-sm line-clamp-3 mb-4">
                    {asg.description}
                  </p>
                </div>

                <div className="pt-4 border-t border-white/[0.06] flex items-center justify-between">
                  <div className="text-xs text-slate-500">
                    {asg.due_date ? (
                      <span className={asg.is_past_due ? 'text-rose font-medium' : ''}>
                        Deadline: {new Date(asg.due_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                      </span>
                    ) : 'Tanpa Deadline'}
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => openAssignmentDetail(asg)}
                    className="btn btn-primary py-1.5 px-3 text-xs flex items-center gap-1.5"
                  >
                    {user.role === 'guru' ? 'Lihat Detail' : (asg.status === 'not_submitted' ? 'Kumpulkan' : 'Lihat Status')}
                  </motion.button>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Modal Form Tambah Tugas Baru */}
        <AnimatePresence>
          {showForm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="glass-card w-full max-w-xl p-6 relative max-h-[90vh] overflow-y-auto"
              >
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/[0.08]">
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <PenTool className="text-primary-light" size={24} /> Terbitkan Tugas Baru
                  </h2>
                  <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-white p-1">
                    <X size={20} />
                  </button>
                </div>

                <form onSubmit={handleCreateAssignment} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      Mata Pelajaran <span className="text-rose">*</span>
                    </label>
                    <input
                      type="text"
                      value={formSubjectName}
                      onChange={e => setFormSubjectName(e.target.value)}
                      placeholder="Ketik Mata Pelajaran (contoh: Pemrograman Web, Pemodelan 3D...)"
                      className="input-field"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      Judul Tugas <span className="text-rose">*</span>
                    </label>
                    <input
                      type="text"
                      value={formTitle}
                      onChange={e => setFormTitle(e.target.value)}
                      placeholder="Judul tugas..."
                      className="input-field"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      Deskripsi / Instruksi Tugas <span className="text-rose">*</span>
                    </label>
                    <textarea
                      value={formDesc}
                      onChange={e => setFormDesc(e.target.value)}
                      placeholder="Instruksi pengerjaan tugas secara rinci..."
                      className="input-field min-h-[120px]"
                      required
                    />
                  </div>

                  {/* Upload Lampiran Soal oleh Guru */}
                  <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.08]">
                    <label className="block text-sm font-semibold text-slate-200 mb-1 flex items-center gap-2">
                      <Paperclip size={16} className="text-primary-light" /> Lampiran Soal (PDF / Dokumen)
                    </label>
                    <p className="text-xs text-slate-400 mb-3">Upload file soal/instruksi tambahan untuk murid jika ada.</p>
                    <input
                      type="file"
                      onChange={e => setFormFile(e.target.files[0])}
                      className="text-sm text-slate-300 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-primary/20 file:text-primary-light hover:file:bg-primary/30 transition-all cursor-pointer"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Deadline Pengumpulan (Opsional)</label>
                    <input
                      type="datetime-local"
                      value={formDueDate}
                      onChange={e => setFormDueDate(e.target.value)}
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
                      disabled={isCreating}
                      className="btn btn-primary flex items-center gap-2"
                    >
                      <Save size={18} /> {isCreating ? 'Menerbitkan...' : 'Terbitkan Tugas'}
                    </motion.button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Modal Detail / Pengumpulan Tugas */}
        <AnimatePresence>
          {selectedAssignment && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="glass-card w-full max-w-2xl p-6 relative max-h-[90vh] overflow-y-auto"
              >
                <div className="flex items-start justify-between gap-4 mb-4 pb-4 border-b border-white/[0.08]">
                  <div>
                    <span className="px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary-light text-xs font-semibold mb-2 inline-block">
                      {selectedAssignment.subject_name || 'Mata Pelajaran'}
                    </span>
                    <h2 className="text-2xl font-bold text-white">{selectedAssignment.title}</h2>
                  </div>
                  <button onClick={() => setSelectedAssignment(null)} className="text-slate-400 hover:text-white p-1">
                    <X size={20} />
                  </button>
                </div>

                <div className="mb-6">
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Instruksi Tugas:</h4>
                  <p className="text-slate-300 text-sm whitespace-pre-wrap leading-relaxed bg-white/[0.03] p-4 rounded-xl border border-white/[0.06]">
                    {selectedAssignment.description}
                  </p>
                </div>

                {/* File Soal Lampiran Guru */}
                {selectedAssignment.attachment_url && (
                  <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-primary/10 to-violet/10 border border-primary/30 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center text-primary-light">
                        <FileText size={20} />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-white">File Lampiran Soal</h4>
                        <p className="text-xs text-slate-400">{selectedAssignment.attachment || 'Dokumen Tugas'}</p>
                      </div>
                    </div>
                    <a
                      href={getFileUrl(selectedAssignment.attachment_url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-primary py-2 px-4 text-xs flex items-center gap-2 shadow-lg shadow-primary/20"
                    >
                      <Download size={14} /> Unduh Soal
                    </a>
                  </div>
                )}

                {/* Status Nilai / Feedback jika sudah dinilai */}
                {selectedAssignment.status === 'graded' && (
                  <div className="mb-6 p-4 rounded-xl bg-secondary/15 border border-secondary/30">
                    <h4 className="text-sm font-bold text-secondary mb-1">Status: Sudah Dinilai</h4>
                    <p className="text-2xl font-black text-white">Nilai: {selectedAssignment.grade} / 100</p>
                    {selectedAssignment.feedback && (
                      <p className="text-xs text-slate-300 mt-2 bg-black/20 p-2.5 rounded-lg border border-white/5">
                        Catatan Mentor: "{selectedAssignment.feedback}"
                      </p>
                    )}
                  </div>
                )}

                {/* Form Pengumpulan Murid */}
                {user.role === 'murid' && selectedAssignment.status === 'not_submitted' && (
                  <div className="p-5 rounded-2xl bg-white/[0.04] border border-white/10 space-y-4">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <Upload size={18} className="text-primary-light" /> Unggah Hasil Pengerjaan Tugas
                    </h4>
                    
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Pilih File Tugas (PDF, DOCX, ZIP, Gambar)</label>
                      <input
                        type="file"
                        onChange={e => setUploadFile(e.target.files[0])}
                        className="text-sm text-slate-300 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-primary/20 file:text-primary-light hover:file:bg-primary/30 transition-all cursor-pointer"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Catatan Tambahan (Opsional)</label>
                      <input
                        type="text"
                        value={uploadNote}
                        onChange={e => setUploadNote(e.target.value)}
                        placeholder="Pesan atau catatan singkat untuk mentor..."
                        className="input-field text-sm"
                      />
                    </div>

                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleSubmitFile(selectedAssignment.id)}
                      disabled={isSubmittingTask || !uploadFile}
                      className="btn btn-primary w-full py-3 flex items-center justify-center gap-2 font-semibold shadow-lg shadow-primary/20 disabled:opacity-50"
                    >
                      <Upload size={18} /> {isSubmittingTask ? 'Mengirim...' : 'Kirimkan Tugas Sekarang'}
                    </motion.button>
                  </div>
                )}

                {/* GURU: Panel Penilaian Submission */}
                {user.role === 'guru' && (
                  <div className="mt-4">
                    <h4 className="text-sm font-bold text-slate-200 flex items-center gap-2 mb-3">
                      <Users size={16} className="text-primary-light" />
                      Pengumpulan Murid
                    </h4>

                    {loadingSubmissions ? (
                      <div className="py-6 text-center text-slate-400 text-sm flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                        Memuat data pengumpulan...
                      </div>
                    ) : submissions ? (
                      <div className="space-y-3">
                        {submissions.submissions.length === 0 && (
                          <p className="text-slate-500 text-sm text-center py-6 bg-white/[0.02] rounded-xl border border-white/[0.05]">
                            Belum ada murid yang mengumpulkan tugas ini.
                          </p>
                        )}

                        {submissions.submissions.map(sub => (
                          <div key={sub.submission_id} className="p-4 rounded-xl bg-white/[0.04] border border-white/[0.08] space-y-3">
                            {/* Info Murid & Tombol Unduh */}
                            <div className="flex items-center justify-between flex-wrap gap-2">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary-light">
                                  {sub.student_name.charAt(0).toUpperCase()}
                                </div>
                                <span className="text-sm font-semibold text-white">{sub.student_name}</span>
                                {sub.is_late && (
                                  <span className="text-xs bg-rose/15 text-rose border border-rose/30 px-2 py-0.5 rounded-md">Terlambat</span>
                                )}
                                {sub.is_graded && (
                                  <span className="text-xs bg-secondary/15 text-secondary border border-secondary/30 px-2 py-0.5 rounded-md flex items-center gap-1">
                                    <Award size={10} /> Nilai: {sub.grade}
                                  </span>
                                )}
                              </div>
                              <a
                                href={getFileUrl(sub.file_url)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1.5 text-xs text-primary-light border border-primary/30 px-3 py-1.5 rounded-lg hover:bg-primary/20 transition-all"
                              >
                                <Download size={12} /> Unduh File ({sub.file_name})
                              </a>
                            </div>

                            {sub.note && (
                              <p className="text-xs text-slate-400 italic bg-black/20 px-3 py-2 rounded-lg">"{sub.note}"</p>
                            )}

                            <p className="text-xs text-slate-500">
                              Dikirim: {new Date(sub.submitted_at).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </p>

                            {/* Form Input Nilai */}
                            <div className="flex gap-2 items-end pt-2 border-t border-white/[0.06]">
                              <div className="flex-shrink-0">
                                <label className="block text-xs text-slate-400 mb-1">Nilai (0–100)</label>
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={gradeInputs[sub.submission_id]?.grade ?? ''}
                                  onChange={e => setGradeInputs(prev => ({
                                    ...prev,
                                    [sub.submission_id]: { ...prev[sub.submission_id], grade: e.target.value }
                                  }))}
                                  className="input-field text-sm w-24 text-center"
                                  placeholder="0-100"
                                />
                              </div>
                              <div className="flex-1">
                                <label className="block text-xs text-slate-400 mb-1">Feedback (Opsional)</label>
                                <input
                                  type="text"
                                  value={gradeInputs[sub.submission_id]?.feedback ?? ''}
                                  onChange={e => setGradeInputs(prev => ({
                                    ...prev,
                                    [sub.submission_id]: { ...prev[sub.submission_id], feedback: e.target.value }
                                  }))}
                                  className="input-field text-sm"
                                  placeholder="Catatan untuk murid..."
                                />
                              </div>
                              <motion.button
                                whileHover={{ scale: 1.03 }}
                                whileTap={{ scale: 0.97 }}
                                onClick={() => handleGrade(sub.submission_id)}
                                disabled={!!savingGrade[sub.submission_id]}
                                className="btn btn-primary py-2 px-3 text-xs flex items-center gap-1.5 flex-shrink-0"
                              >
                                <Star size={13} />
                                {savingGrade[sub.submission_id] ? 'Menyimpan...' : 'Simpan Nilai'}
                              </motion.button>
                            </div>
                          </div>
                        ))}

                        {/* Murid Belum Mengumpulkan */}
                        {submissions.not_submitted.length > 0 && (
                          <div className="mt-3 p-3 rounded-xl bg-rose/5 border border-rose/20">
                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                              Belum Mengumpulkan ({submissions.not_submitted.length})
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {submissions.not_submitted.map(st => (
                                <span key={st.student_id} className="text-xs bg-rose/10 text-rose border border-rose/20 px-2.5 py-1 rounded-full">
                                  {st.student_name}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>
                )}

                <div className="pt-4 border-t border-white/[0.08] flex justify-end">
                  <button
                    onClick={() => { setSelectedAssignment(null); setSubmissions(null); }}
                    className="btn bg-white/5 hover:bg-white/10 text-slate-300"
                  >
                    Tutup
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
