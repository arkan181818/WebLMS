import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { UserCheck, UserX, Clock, Users, CheckCircle2 } from 'lucide-react';
import Sidebar from '../components/Sidebar';

export default function Mentees({ user, onLogout }) {
  const [approvedStudents, setApprovedStudents] = useState([]);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [loading, setLoading] = useState(true);

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
      toast.success(`Akun ${student.full_name} berhasil disetujui`);
      setPendingUsers(prev => prev.filter(u => u.id !== student.id));
      setApprovedStudents(prev => [student, ...prev]);
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
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-3xl font-bold text-white">Daftar Murid</h1>
          <p className="text-slate-400 mt-2">Kelola daftar murid yang terdaftar dan persetujuan pendaftar baru.</p>
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
                        <h3 className="font-bold text-white text-sm">{student.full_name || student.username}</h3>
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
      </div>
    </div>
  );
}
