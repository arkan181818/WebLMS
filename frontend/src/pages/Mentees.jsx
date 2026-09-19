import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { UserCheck, UserX, Clock, Users, CheckCircle2, UserPlus, X, Save } from 'lucide-react';
import Sidebar from '../components/Sidebar';

export default function Mentees({ user, onLogout }) {
  const [approvedStudents, setApprovedStudents] = useState([]);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showTeacherModal, setShowTeacherModal] = useState(false);

  // Form tambah mentor
  const [tUsername, setTUsername] = useState('');
  const [tEmail, setTEmail] = useState('');
  const [tFullName, setTFullName] = useState('');
  const [tPassword, setTPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [pendingRes, studentsRes] = await Promise.all([
        api.get('/api/users/pending'),
        api.get('/api/users/students')
      ]);
      setPendingUsers(pendingRes.data || []);
      setApprovedStudents(studentsRes.data || []);
    } catch (err) {
      toast.error('Gagal mengambil data murid');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (student) => {
    try {
      await api.post(`/api/users/${student.id}/approve`);
      toast.success(`Akun ${student.full_name} (${student.role}) berhasil disetujui`);
      setPendingUsers(prev => prev.filter(u => u.id !== student.id));
      if (student.role === 'murid') {
        setApprovedStudents(prev => [student, ...prev]);
      }
    } catch (err) {
      toast.error('Gagal menyetujui akun');
    }
  };

  const handleReject = async (id) => {
    if (!window.confirm('Yakin ingin menolak dan menghapus pendaftaran ini?')) return;
    try {
      await api.post(`/api/users/${id}/reject`);
      toast.success('Pendaftaran ditolak');
      setPendingUsers(prev => prev.filter(u => u.id !== id));
    } catch (err) {
      toast.error('Gagal menolak pendaftaran');
    }
  };

  const handleCreateTeacher = async (e) => {
    e.preventDefault();
    if (!tUsername || !tEmail || !tPassword) {
      toast.error('Username, email, dan password wajib diisi');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await api.post('/api/users/create_teacher', {
        username: tUsername,
        email: tEmail,
        full_name: tFullName,
        password: tPassword
      });
      toast.success(res.data.message);
      setShowTeacherModal(false);
      setTUsername(''); setTEmail(''); setTFullName(''); setTPassword('');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menambahkan mentor');
    } finally {
      setIsSubmitting(false);
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
            <h1 className="text-3xl font-bold text-white">Daftar Murid & Pengelolaan Mentor</h1>
            <p className="text-slate-400 mt-2">Kelola daftar murid terdaftar, persetujuan pendaftar baru, dan penambahan mentor.</p>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowTeacherModal(true)}
            className="btn btn-primary flex items-center gap-2 shadow-lg shadow-primary/30"
          >
            <UserPlus size={18} /> Tambah Mentor Baru
          </motion.button>
        </motion.div>

        {/* Layout Kanan & Kiri */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* SISI KIRI: Murid Terdaftar */}
          <div>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-secondary/20 border border-secondary/30 flex items-center justify-center text-secondary">
                  <Users size={18} />
                </div>
                <h2 className="text-xl font-bold text-white">Murid Terdaftar</h2>
              </div>
              <span className="px-3.5 py-1 rounded-full bg-secondary/15 border border-secondary/30 text-secondary text-xs font-bold shadow-lg shadow-secondary/20">
                Total: {approvedStudents.length} Murid
              </span>
            </div>

            {approvedStudents.length === 0 ? (
              <div className="glass-card p-10 text-center">
                <Users className="w-12 h-12 mx-auto mb-3 text-slate-600" />
                <p className="text-slate-400 font-medium">Belum ada murid yang terdaftar.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {approvedStudents.map(student => (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    key={student.id}
                    className="glass-card p-4 flex items-center justify-between hover:border-white/20 transition-all duration-300"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-11 h-11 bg-gradient-to-br from-primary to-cyan rounded-full flex items-center justify-center text-white font-bold text-base shadow-md shadow-primary/20 uppercase">
                        {(student.full_name || student.username || 'M').charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-bold text-white text-sm">{student.full_name || student.username}</h3>
                        <p className="text-xs text-slate-400">{student.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-secondary font-medium bg-secondary/10 px-3 py-1.5 rounded-lg border border-secondary/20">
                      <CheckCircle2 size={14} /> Terverifikasi
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* SISI KANAN: Menunggu Persetujuan */}
          <div>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-accent/20 border border-accent/30 flex items-center justify-center text-accent">
                  <Clock size={18} />
                </div>
                <h2 className="text-xl font-bold text-white">Menunggu Persetujuan</h2>
              </div>
              {pendingUsers.length > 0 ? (
                <span className="px-3.5 py-1 rounded-full bg-gradient-to-r from-accent to-rose text-white text-xs font-bold shadow-lg shadow-accent/30">
                  {pendingUsers.length} Pendaftar Baru
                </span>
              ) : (
                <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-slate-400 text-xs font-medium">
                  0 Pendaftar
                </span>
              )}
            </div>

            {pendingUsers.length === 0 ? (
              <div className="glass-card p-10 text-center">
                <Clock className="w-12 h-12 mx-auto mb-3 text-slate-600" />
                <p className="text-slate-400 font-medium">Tidak ada permintaan persetujuan baru saat ini.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingUsers.map(student => (
                  <motion.div
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    key={student.id}
                    className="glass-card p-4 flex items-center justify-between hover:border-white/20 transition-all duration-300"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-11 h-11 bg-gradient-to-br from-accent/20 to-rose/20 border border-accent/30 rounded-full flex items-center justify-center text-accent font-bold text-base uppercase">
                        {(student.full_name || student.username || 'P').charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-white text-sm">{student.full_name || student.username}</h3>
                          <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                            student.role === 'guru' ? 'bg-violet/20 border border-violet/40 text-violet-light' : 'bg-primary/20 border border-primary/40 text-primary-light'
                          }`}>
                            {student.role === 'guru' ? 'Guru/Mentor' : 'Murid'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400">{student.email}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleApprove(student)}
                        className="px-3 py-2 rounded-xl bg-secondary/20 border border-secondary/40 text-secondary hover:bg-secondary hover:text-white transition-all duration-300 flex items-center gap-1.5 text-xs font-bold shadow-md shadow-secondary/10"
                      >
                        <UserCheck size={16} /> Setujui
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleReject(student.id)}
                        className="px-3 py-2 rounded-xl bg-rose/20 border border-rose/40 text-rose hover:bg-rose hover:text-white transition-all duration-300 flex items-center gap-1.5 text-xs font-bold"
                      >
                        <UserX size={16} /> Tolak
                      </motion.button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Modal Tambah Mentor Baru */}
        <AnimatePresence>
          {showTeacherModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="glass-card w-full max-w-md p-6 relative"
              >
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/[0.08]">
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <UserPlus className="text-violet-light" size={24} /> Tambah Mentor / Guru Baru
                  </h2>
                  <button onClick={() => setShowTeacherModal(false)} className="text-slate-400 hover:text-white p-1">
                    <X size={20} />
                  </button>
                </div>

                <form onSubmit={handleCreateTeacher} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Nama Lengkap & Gelar</label>
                    <input
                      type="text"
                      value={tFullName}
                      onChange={e => setTFullName(e.target.value)}
                      placeholder="Contoh: Budi Santoso, S.Kom."
                      className="input-field"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      Username <span className="text-rose">*</span>
                    </label>
                    <input
                      type="text"
                      value={tUsername}
                      onChange={e => setTUsername(e.target.value)}
                      placeholder="username_mentor"
                      className="input-field"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      Email Mentor <span className="text-rose">*</span>
                    </label>
                    <input
                      type="email"
                      value={tEmail}
                      onChange={e => setTEmail(e.target.value)}
                      placeholder="mentor@sekolah.com"
                      className="input-field"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      Password <span className="text-rose">*</span>
                    </label>
                    <input
                      type="password"
                      value={tPassword}
                      onChange={e => setTPassword(e.target.value)}
                      placeholder="Min. 6 karakter"
                      className="input-field"
                      required
                    />
                  </div>

                  <div className="pt-4 flex justify-end gap-3">
                    <button type="button" onClick={() => setShowTeacherModal(false)} className="btn bg-white/5 hover:bg-white/10 text-slate-300">
                      Batal
                    </button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      type="submit"
                      disabled={isSubmitting}
                      className="btn btn-primary flex items-center gap-2"
                    >
                      <Save size={18} /> {isSubmitting ? 'Menyimpan...' : 'Tambah Mentor'}
                    </motion.button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
