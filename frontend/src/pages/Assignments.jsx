import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { PenTool, Plus, X, Save, Upload, Clock, CheckCircle, AlertTriangle, FileText } from 'lucide-react';
import Sidebar from '../components/Sidebar';

export default function Assignments({ user, onLogout }) {
  const [assignments, setAssignments] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadNote, setUploadNote] = useState('');

  // Form state (guru)
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formSubjectId, setFormSubjectId] = useState('');
  const [formDueDate, setFormDueDate] = useState('');

  useEffect(() => {
    fetchAssignments();
    fetchSubjects();
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

  const fetchSubjects = async () => {
    try {
      const res = await api.get('/api/subjects');
      setSubjects(res.data);
    } catch (err) { /* ignore */ }
  };

  const handleCreateAssignment = async (e) => {
    e.preventDefault();
    try {
      await api.post('/api/assignments/create', {
        title: formTitle,
        description: formDesc,
        subject_id: formSubjectId,
        due_date: formDueDate || null,
      });
      toast.success('Tugas berhasil dibuat!');
      setShowForm(false);
      setFormTitle(''); setFormDesc(''); setFormSubjectId(''); setFormDueDate('');
      fetchAssignments();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal membuat tugas');
    }
  };

  const handleSubmitFile = async (assignmentId) => {
    if (!uploadFile) { toast.error('Pilih file terlebih dahulu'); return; }
    const allowed = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/zip', 'image/png', 'image/jpeg'];
    if (!allowed.includes(uploadFile.type)) {
      toast.error('Format file tidak diizinkan. Gunakan PDF, DOCX, ZIP, PNG, atau JPG.');
      return;
    }
    const formData = new FormData();
    formData.append('file', uploadFile);
    formData.append('note', uploadNote);
    try {
      await api.post(`/api/assignments/${assignmentId}/submit`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Tugas berhasil dikirim ke mentor!');
      setSelectedAssignment(null);
      setUploadFile(null);
      setUploadNote('');
      fetchAssignments();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal mengirim tugas');
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Memuat...</div>;

  return (
    <div className="min-h-screen bg-[#F9FAFB] flex">
      <Sidebar user={user} onLogout={onLogout} />

      <div className="flex-1 ml-64 p-8">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">{user.role === 'guru' ? 'Review Tugas' : 'Tugas Saya'}</h1>
            <p className="text-slate-500 mt-1">{user.role === 'guru' ? 'Kelola dan review tugas dari murid.' : 'Kerjakan tugas yang diberikan mentor Anda.'}</p>
          </div>
          {user.role === 'guru' && (
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setShowForm(true)} className="btn btn-primary">
              <Plus size={18} /> Buat Tugas
            </motion.button>
          )}
        </motion.div>

        {assignments.length === 0 ? (
          <div className="bg-white p-12 rounded-2xl shadow-sm border border-slate-200 text-center">
            <PenTool className="w-16 h-16 mx-auto mb-4 text-slate-300" />
            <h2 className="text-xl font-bold text-slate-700 mb-2">Belum Ada Tugas</h2>
            <p className="text-slate-500">{user.role === 'guru' ? 'Klik "Buat Tugas" untuk memulai.' : 'Mentor belum memberikan tugas.'}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {assignments.map((a, idx) => (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                key={a.id}
                onClick={() => { setSelectedAssignment(a); setUploadFile(null); setUploadNote(''); }}
                className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 cursor-pointer hover:shadow-md hover:border-primary/30 transition-all flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${a.status === 'graded' ? 'bg-secondary/10 text-secondary' : a.status === 'submitted' ? 'bg-accent/10 text-accent' : 'bg-slate-100 text-slate-400'}`}>
                    {a.status === 'graded' ? <CheckCircle size={24} /> : a.status === 'submitted' ? <Clock size={24} /> : <FileText size={24} />}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800">{a.title}</h3>
                    <p className="text-sm text-slate-500">{a.subject_name}</p>
                  </div>
                </div>
                <div className="text-right">
                  {a.due_date && (
                    <p className={`text-xs font-medium ${a.is_past_due ? 'text-rose-500' : 'text-slate-500'}`}>
                      {a.is_past_due ? <><AlertTriangle className="w-3 h-3 inline mr-1" />Lewat Deadline</> : `Deadline: ${new Date(a.due_date).toLocaleDateString('id-ID')}`}
                    </p>
                  )}
                  {a.status === 'graded' && <span className="text-sm font-bold text-secondary">Nilai: {a.grade}/100</span>}
                  {a.status === 'submitted' && <span className="text-xs font-medium text-accent bg-accent/10 px-2 py-1 rounded-full">Menunggu Review</span>}
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Detail / Submit Modal */}
        <AnimatePresence>
          {selectedAssignment && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setSelectedAssignment(null)}>
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                  <h2 className="text-xl font-bold text-slate-800">{selectedAssignment.title}</h2>
                  <button onClick={() => setSelectedAssignment(null)} className="p-2 hover:bg-slate-100 rounded-lg"><X size={20} /></button>
                </div>
                <div className="p-6">
                  <p className="text-slate-600 whitespace-pre-wrap mb-6">{selectedAssignment.description}</p>

                  {user.role === 'murid' && selectedAssignment.status !== 'graded' && selectedAssignment.status !== 'submitted' && (
                    <div className="border-t border-slate-100 pt-6">
                      <h3 className="font-bold text-slate-800 mb-3">Upload Jawaban</h3>
                      <p className="text-xs text-slate-500 mb-3">Format yang diterima: PDF, DOCX, ZIP, PNG, JPG</p>
                      <input
                        type="file"
                        accept=".pdf,.docx,.zip,.png,.jpg,.jpeg"
                        onChange={(e) => setUploadFile(e.target.files[0])}
                        className="input-field mb-3"
                      />
                      <textarea
                        value={uploadNote}
                        onChange={(e) => setUploadNote(e.target.value)}
                        className="input-field mb-4"
                        placeholder="Catatan tambahan (opsional)..."
                        rows={3}
                      />
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleSubmitFile(selectedAssignment.id)}
                        className="btn w-full py-3 bg-secondary text-white hover:bg-emerald-600"
                      >
                        <Upload size={18} /> Kirim Tugas
                      </motion.button>
                    </div>
                  )}

                  {selectedAssignment.status === 'submitted' && (
                    <div className="border-t border-slate-100 pt-6 text-center">
                      <Clock className="w-12 h-12 mx-auto mb-3 text-accent" />
                      <p className="font-bold text-accent">Tugas Anda sedang menunggu review dari Mentor.</p>
                    </div>
                  )}

                  {selectedAssignment.status === 'graded' && (
                    <div className="border-t border-slate-100 pt-6 text-center">
                      <CheckCircle className="w-12 h-12 mx-auto mb-3 text-secondary" />
                      <p className="text-3xl font-extrabold text-secondary mb-1">{selectedAssignment.grade}/100</p>
                      {selectedAssignment.feedback && <p className="text-slate-600 mt-2">"{selectedAssignment.feedback}"</p>}
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Create Form Modal (Guru) */}
        <AnimatePresence>
          {showForm && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                  <h2 className="text-xl font-bold text-slate-800">Buat Tugas Baru</h2>
                  <button onClick={() => setShowForm(false)} className="p-2 hover:bg-slate-100 rounded-lg"><X size={20} /></button>
                </div>
                <form onSubmit={handleCreateAssignment} className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Mata Pelajaran <span className="text-rose-500">*</span></label>
                    <select value={formSubjectId} onChange={(e) => setFormSubjectId(e.target.value)} className="input-field" required>
                      <option value="">-- Pilih --</option>
                      {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Judul Tugas <span className="text-rose-500">*</span></label>
                    <input type="text" value={formTitle} onChange={(e) => setFormTitle(e.target.value)} className="input-field" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Deskripsi <span className="text-rose-500">*</span></label>
                    <textarea value={formDesc} onChange={(e) => setFormDesc(e.target.value)} className="input-field min-h-[120px]" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Deadline (Opsional)</label>
                    <input type="datetime-local" value={formDueDate} onChange={(e) => setFormDueDate(e.target.value)} className="input-field" />
                  </div>
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="submit" className="btn btn-primary w-full py-3 mt-2">
                    <Save size={18} /> Simpan Tugas
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
