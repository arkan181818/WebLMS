import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import toast from 'react-hot-toast';
import { UserCheck, UserX, Clock, Users, Search } from 'lucide-react';
import Sidebar from '../components/Sidebar';

export default function Mentees({ user, onLogout }) {
  const [pendingUsers, setPendingUsers] = useState([]);
  const [activeUsers, setActiveUsers] = useState([]); // Anggap saja kita punya endpoint ini nanti, saat ini pakai pending saja dulu
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPendingUsers();
  }, []);

  const fetchPendingUsers = async () => {
    try {
      const res = await axios.get('/api/users/pending');
      setPendingUsers(res.data);
    } catch (err) {
      toast.error('Gagal mengambil daftar persetujuan');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    try {
      await axios.post(`/api/users/${id}/approve`);
      toast.success('Akun berhasil disetujui');
      setPendingUsers(pendingUsers.filter(u => u.id !== id));
    } catch (err) {
      toast.error('Gagal menyetujui akun');
    }
  };

  const handleReject = async (id) => {
    if (!window.confirm('Yakin ingin menolak dan menghapus akun ini?')) return;
    try {
      await axios.post(`/api/users/${id}/reject`);
      toast.success('Akun berhasil ditolak');
      setPendingUsers(pendingUsers.filter(u => u.id !== id));
    } catch (err) {
      toast.error('Gagal menolak akun');
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Memuat...</div>;

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar user={user} onLogout={onLogout} />
      
      <div className="flex-1 ml-64 p-8">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-3xl font-bold text-slate-800">Daftar Murid</h1>
          <p className="text-slate-500 mt-2">Kelola daftar murid dan persetujuan akun pendaftar baru.</p>
        </motion.div>

        {/* Section Pending Approval */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-xl font-bold text-slate-800">Menunggu Persetujuan</h2>
            {pendingUsers.length > 0 && (
              <span className="px-3 py-1 rounded-full bg-accent text-white text-xs font-bold">
                {pendingUsers.length} Baru
              </span>
            )}
          </div>

          {pendingUsers.length === 0 ? (
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 text-center text-slate-500">
              <Clock className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p>Tidak ada murid yang menunggu persetujuan saat ini.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingUsers.map(student => (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }} 
                  animate={{ opacity: 1, scale: 1 }}
                  key={student.id} 
                  className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center text-accent font-bold text-lg">
                      {student.full_name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800">{student.full_name}</h3>
                      <p className="text-sm text-slate-500">{student.email}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleApprove(student.id)}
                      className="p-2 rounded-lg bg-secondary/10 text-secondary hover:bg-secondary hover:text-white transition-colors"
                      title="Setujui"
                    >
                      <UserCheck size={20} />
                    </button>
                    <button 
                      onClick={() => handleReject(student.id)}
                      className="p-2 rounded-lg bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white transition-colors"
                      title="Tolak"
                    >
                      <UserX size={20} />
                    </button>
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
