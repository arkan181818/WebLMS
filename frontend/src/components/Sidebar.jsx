import { LogOut, Home, BookOpen, PenTool, BarChart, MessageCircle, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../lib/api';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function Sidebar({ user, onLogout }) {
  const handleLogout = async () => {
    try {
      await api.post('/api/logout');
      onLogout();
      toast.success('Berhasil keluar');
    } catch (err) {
      toast.error('Gagal keluar');
    }
  };

  const navItems = user.role === 'guru' ? [
    { icon: <Home size={20} />, label: 'Dashboard', path: '/dashboard' },
    { icon: <Users size={20} />, label: 'Daftar Murid', path: '/mentees' },
    { icon: <BookOpen size={20} />, label: 'Kelola Materi', path: '/materials' },
    { icon: <PenTool size={20} />, label: 'Review Tugas', path: '/assignments' },
    { icon: <MessageCircle size={20} />, label: 'Chat 1-on-1', path: '/chat' },
  ] : [
    { icon: <Home size={20} />, label: 'Dashboard', path: '/dashboard' },
    { icon: <BookOpen size={20} />, label: 'Materi Personal', path: '/materials' },
    { icon: <PenTool size={20} />, label: 'Tugas Saya', path: '/assignments' },
    { icon: <MessageCircle size={20} />, label: 'Konsultasi Mentor', path: '/chat' },
  ];

  return (
    <div className="w-64 bg-white border-r border-slate-200 h-screen flex flex-col fixed left-0 top-0">
      <div className="p-6 border-b border-slate-100 flex items-center gap-3">
        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
          <BookOpen size={24} />
        </div>
        <div>
          <h1 className="font-bold text-slate-800 text-lg leading-tight">RuangBelajar</h1>
          <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">{user.role} Panel</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-6 px-4 space-y-1">
        {navItems.map((item, idx) => (
          <motion.div whileHover={{ x: 4 }} key={idx}>
            <Link
              to={item.path}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                window.location.pathname === item.path
                  ? 'bg-primary text-white font-medium shadow-md shadow-primary/20' 
                  : 'text-slate-600 hover:bg-slate-50 hover:text-primary font-medium'
              }`}
            >
              {item.icon}
              {item.label}
            </Link>
          </motion.div>
        ))}
      </div>

      <div className="p-4 border-t border-slate-100">
        <div className="flex items-center gap-3 mb-4 px-2">
          <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-600 font-bold uppercase">
            {user.display_name ? user.display_name.charAt(0) : '?'}
          </div>
          <div className="flex-1 overflow-hidden">
            <h4 className="text-sm font-bold text-slate-800 truncate">{user.display_name}</h4>
            <p className="text-xs text-slate-500 truncate capitalize">{user.role}</p>
          </div>
        </div>
        <button 
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors font-medium text-sm"
        >
          <LogOut size={18} /> Keluar
        </button>
      </div>
    </div>
  );
}
