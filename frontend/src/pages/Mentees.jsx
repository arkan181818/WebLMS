import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { UserCheck, UserX, Clock, Users } from 'lucide-react';
import Sidebar from '../components/Sidebar';

export default function Mentees({ user, onLogout }) {
  const [pendingUsers, setPendingUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPendingUsers();
  }, []);

  const fetchPendingUsers = async () => {
    try {
      const res = await api.get('/api/users/pending');
      setPendingUsers(res.data);
    } catch (err) {
      toast.error('Gagal mengambil daftar persetujuan');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    try {
      await api.post(`/api/users/${id}/approve`);
      toast.success('Akun berhasil disetujui');
      setPendingUsers(pendingUsers.filter(u => u.id !== id));
    } catch (err) {
      toast.error('Gagal menyetujui akun');
    }
  };

  const handleReject = async (id) => {
    if (!window.confirm('Yakin ingin menolak dan menghapus akun ini?')) return;
    try {
      await api.post(`/api/users/${id}/reject`);
      toast.success('Akun berhasil ditolak');
      setPendingUsers(pendingUsers.filter(u => u.id !== id));
    } catch (err) {
      toast.error('Gagal menolak akun');
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
          <p className="text-slate-400 mt-2">Kelola daftar murid dan persetujuan akun pendaftar baru.</p>
        </motion.div>

        {/* Pending Approval */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-5">
            <h2 className="text-xl font-bold text-white">Menunggu Persetujuan</h2>
            {pendingUsers.length > 0 && (
              <span className="px-3 py-1 rounded-full bg-gradient-to-r from-accent to-rose text-white text-xs font-bold shadow-lg shadow-accent/30">
                {pendingUsers.length} Baru
              </span>
            )}
          </div>

          {pendingUsers.length === 0 ? (
            <div className="glass-card p-10 text-center">
              <Clock className="w-14 h-14 mx-auto mb-4 text-slate-600" />
              <p className="text-slate-400 font-medium">Tidak ada murid yang menunggu persetujuan saat ini.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingUsers.map(student => (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  key={student.id}
                  className="glass-card p-5 flex items-center justify-between hover:border-white/20 transition-all duration-300"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-accent/20 to-rose/20 border border-accent/30 rounded-full flex items-center justify-center text-accent font-bold text-lg">
                      {student.full_name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-bold text-white">{student.full_name}</h3>
                      <p className="text-sm text-slate-500">{student.email}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleApprove(student.id)}
                      className="p-2.5 rounded-xl bg-secondary/15 border border-secondary/30 text-secondary hover:bg-secondary hover:text-white transition-all duration-300"
                      title="Setujui"
                    >
                      <UserCheck size={20} />
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleReject(student.id)}
                      className="p-2.5 rounded-xl bg-rose/15 border border-rose/30 text-rose hover:bg-rose hover:text-white transition-all duration-300"
                      title="Tolak"
                    >
                      <UserX size={20} />
                    </motion.button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
