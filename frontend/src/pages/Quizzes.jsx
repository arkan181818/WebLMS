import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { 
  HelpCircle, Plus, Clock, CheckCircle2, AlertCircle, 
  Trash2, Edit3, Eye, Check, X, Award, ChevronRight, 
  ChevronLeft, Send, Save, Sparkles, BookOpen, User, 
  Calendar, RotateCcw, AlertTriangle, MessageSquare, 
  FileText, CheckCircle, ArrowRight, ShieldCheck, 
  Settings2, Layers, CheckSquare, RefreshCw
} from 'lucide-react';
import Sidebar from '../components/Sidebar';

export default function Quizzes({ user, onLogout }) {
  const isGuru = user?.role === 'guru';

  // Core Data States
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'active', 'completed', 'needs_grading'
  const [searchQuery, setSearchQuery] = useState('');
  const [mentees, setMentees] = useState([]);

  // Create / Edit Modal States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingQuizId, setEditingQuizId] = useState(null);
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formSubjectName, setFormSubjectName] = useState('');
  const [formTargetStudentId, setFormTargetStudentId] = useState('');
  const [formStartTime, setFormStartTime] = useState('');
  const [formEndTime, setFormEndTime] = useState('');
  const [formDuration, setFormDuration] = useState(60);
  const [formShowScoreImmediately, setFormShowScoreImmediately] = useState(true);
  const [formQuestions, setFormQuestions] = useState([
    {
      id: 1,
      question_type: 'multiple_choice',
      question_text: '',
      points: 10,
      correct_answer: 'A',
      options: [
        { key: 'A', text: '' },
        { key: 'B', text: '' },
        { key: 'C', text: '' },
        { key: 'D', text: '' },
      ],
      rubric: ''
    }
  ]);
  const [isSavingQuiz, setIsSavingQuiz] = useState(false);

  // Submissions & Grading Modal States (Guru)
  const [showAttemptsModal, setShowAttemptsModal] = useState(false);
  const [selectedQuizForAttempts, setSelectedQuizForAttempts] = useState(null);
  const [attemptsData, setAttemptsData] = useState(null);
  const [loadingAttempts, setLoadingAttempts] = useState(false);
  
  // Grade Single Attempt Modal (Guru)
  const [showGradeModal, setShowGradeModal] = useState(false);
  const [selectedAttemptDetail, setSelectedAttemptDetail] = useState(null);
  const [gradingInputs, setGradingInputs] = useState({}); // { question_id: { earned_points: X, teacher_feedback: Y } }
  const [isSavingGrade, setIsSavingGrade] = useState(false);

  // Student Exam Room States
  const [activeExamQuiz, setActiveExamQuiz] = useState(null);
  const [examAttemptId, setExamAttemptId] = useState(null);
  const [examQuestions, setExamQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [examAnswers, setExamAnswers] = useState({}); // { question_id: { selected_option: 'A', essay_answer: 'text' } }
  const [remainingTime, setRemainingTime] = useState(null);
  const [isExamLoading, setIsExamLoading] = useState(false);
  const [isSubmittingExam, setIsSubmittingExam] = useState(false);
  const [showSubmitConfirmModal, setShowSubmitConfirmModal] = useState(false);
  const [saveStatus, setSaveStatus] = useState('saved'); // 'saved', 'saving', 'error'
  const timerRef = useRef(null);

  // Student Result Modal States
  const [showResultModal, setShowResultModal] = useState(false);
  const [resultAttemptDetail, setResultAttemptDetail] = useState(null);
  const [loadingResult, setLoadingResult] = useState(false);

  useEffect(() => {
    fetchQuizzes();
    if (isGuru) {
      fetchMentees();
    }
  }, [isGuru]);

  const fetchQuizzes = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/quizzes');
      setQuizzes(res.data);
    } catch (err) {
      toast.error('Gagal memuat daftar kuis');
    } finally {
      setLoading(false);
    }
  };

  const fetchMentees = async () => {
    try {
      const res = await api.get('/api/mentees');
      setMentees(res.data || []);
    } catch (err) {
      // Ignore if mentees API fails
    }
  };

  // ==========================================
  // QUIZ CREATION & QUESTION BUILDER HANDLERS
  // ==========================================
  const handleOpenCreateModal = (quizToEdit = null) => {
    if (quizToEdit) {
      setEditingQuizId(quizToEdit.id);
      setFormTitle(quizToEdit.title || '');
      setFormDesc(quizToEdit.description || '');
      setFormSubjectName(quizToEdit.subject_name || '');
      setFormTargetStudentId(quizToEdit.target_student_id || '');
      setFormStartTime(quizToEdit.start_time ? quizToEdit.start_time.substring(0, 16) : '');
      setFormEndTime(quizToEdit.end_time ? quizToEdit.end_time.substring(0, 16) : '');
      setFormDuration(quizToEdit.duration_minutes || 60);
      setFormShowScoreImmediately(quizToEdit.show_score_immediately ?? true);

      // Load full questions for editing
      api.get(`/api/quizzes/${quizToEdit.id}`)
        .then(res => {
          if (res.data.questions && res.data.questions.length > 0) {
            setFormQuestions(res.data.questions.map((q, idx) => ({
              id: q.id || idx + 1,
              question_type: q.question_type,
              question_text: q.question_text,
              points: q.points,
              correct_answer: q.correct_answer || 'A',
              options: q.options && q.options.length > 0 ? q.options : [
                { key: 'A', text: '' },
                { key: 'B', text: '' },
                { key: 'C', text: '' },
                { key: 'D', text: '' }
              ],
              rubric: q.rubric || ''
            })));
          }
        })
        .catch(() => {
          toast.error('Gagal memuat butir soal untuk diedit');
        });
    } else {
      setEditingQuizId(null);
      setFormTitle('');
      setFormDesc('');
      setFormSubjectName('');
      setFormTargetStudentId('');
      setFormStartTime('');
      setFormEndTime('');
      setFormDuration(60);
      setFormShowScoreImmediately(true);
      setFormQuestions([
        {
          id: 1,
          question_type: 'multiple_choice',
          question_text: '',
          points: 10,
          correct_answer: 'A',
          options: [
            { key: 'A', text: '' },
            { key: 'B', text: '' },
            { key: 'C', text: '' },
            { key: 'D', text: '' },
          ],
          rubric: ''
        }
      ]);
    }
    setShowCreateModal(true);
  };

  const handleAddQuestion = (type) => {
    const newId = Date.now();
    if (type === 'multiple_choice') {
      setFormQuestions(prev => [
        ...prev,
        {
          id: newId,
          question_type: 'multiple_choice',
          question_text: '',
          points: 10,
          correct_answer: 'A',
          options: [
            { key: 'A', text: '' },
            { key: 'B', text: '' },
            { key: 'C', text: '' },
            { key: 'D', text: '' },
          ],
          rubric: ''
        }
      ]);
    } else {
      setFormQuestions(prev => [
        ...prev,
        {
          id: newId,
          question_type: 'essay',
          question_text: '',
          points: 20,
          correct_answer: '',
          options: [],
          rubric: ''
        }
      ]);
    }
  };

  const handleRemoveQuestion = (idx) => {
    if (formQuestions.length <= 1) {
      toast.error('Kuis harus memiliki minimal 1 soal.');
      return;
    }
    setFormQuestions(prev => prev.filter((_, i) => i !== idx));
  };

  const handleUpdateQuestion = (idx, field, value) => {
    setFormQuestions(prev => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: value };
      return updated;
    });
  };

  const handleUpdateOption = (qIdx, optIdx, text) => {
    setFormQuestions(prev => {
      const updated = [...prev];
      const opts = [...updated[qIdx].options];
      opts[optIdx] = { ...opts[optIdx], text };
      updated[qIdx] = { ...updated[qIdx], options: opts };
      return updated;
    });
  };

  const handleSaveQuiz = async (e) => {
    e.preventDefault();
    if (!formTitle.trim()) { toast.error('Judul kuis wajib diisi'); return; }
    if (!formSubjectName.trim()) { toast.error('Mata pelajaran/kuliah wajib diisi'); return; }

    // Validate questions
    for (let i = 0; i < formQuestions.length; i++) {
      const q = formQuestions[i];
      if (!q.question_text.trim()) {
        toast.error(`Pertanyaan soal nomor ${i + 1} belum diisi.`);
        return;
      }
      if (q.question_type === 'multiple_choice') {
        const hasEmptyOption = q.options.some(opt => !opt.text.trim());
        if (hasEmptyOption) {
          toast.error(`Semua opsi pilihan ganda pada nomor ${i + 1} harus diisi.`);
          return;
        }
      }
    }

    setIsSavingQuiz(true);
    const payload = {
      title: formTitle,
      description: formDesc,
      subject_name: formSubjectName,
      target_student_id: formTargetStudentId ? parseInt(formTargetStudentId) : null,
      start_time: formStartTime ? new Date(formStartTime).toISOString() : null,
      end_time: formEndTime ? new Date(formEndTime).toISOString() : null,
      duration_minutes: parseInt(formDuration) || 60,
      show_score_immediately: formShowScoreImmediately,
      is_published: true,
      questions: formQuestions.map((q, idx) => ({
        question_type: q.question_type,
        question_text: q.question_text,
        points: parseFloat(q.points) || 10,
        correct_answer: q.question_type === 'multiple_choice' ? q.correct_answer : null,
        options: q.question_type === 'multiple_choice' ? q.options : [],
        rubric: q.question_type === 'essay' ? q.rubric : null,
        order_index: idx
      }))
    };

    try {
      if (editingQuizId) {
        await api.put(`/api/quizzes/${editingQuizId}`, payload);
        toast.success('Kuis berhasil diperbarui!');
      } else {
        await api.post('/api/quizzes', payload);
        toast.success('Kuis baru berhasil dibuat dan diterbitkan!');
      }
      setShowCreateModal(false);
      fetchQuizzes();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menyimpan kuis');
    } finally {
      setIsSavingQuiz(false);
    }
  };

  const handleDeleteQuiz = async (quizId) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus kuis ini? Semua riwayat ujian siswa pada kuis ini juga akan terhapus.')) return;
    try {
      await api.delete(`/api/quizzes/${quizId}`);
      toast.success('Kuis berhasil dihapus.');
      fetchQuizzes();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menghapus kuis');
    }
  };

  // ==========================================
  // TEACHER GRADING & ATTEMPTS HANDLERS
  // ==========================================
  const handleOpenAttemptsModal = async (quiz) => {
    setSelectedQuizForAttempts(quiz);
    setShowAttemptsModal(true);
    setLoadingAttempts(true);
    try {
      const res = await api.get(`/api/quizzes/${quiz.id}/attempts`);
      setAttemptsData(res.data);
    } catch (err) {
      toast.error('Gagal memuat data pengerjaan siswa');
    } finally {
      setLoadingAttempts(false);
    }
  };

  const handleOpenGradeModal = async (attemptId) => {
    try {
      const res = await api.get(`/api/quizzes/${selectedQuizForAttempts.id}/attempts/${attemptId}`);
      setSelectedAttemptDetail(res.data);
      
      // Initialize grading inputs from existing answers
      const initialInputs = {};
      res.data.answers.forEach(ans => {
        initialInputs[ans.question_id] = {
          earned_points: ans.earned_points !== null ? ans.earned_points : '',
          teacher_feedback: ans.teacher_feedback || ''
        };
      });
      setGradingInputs(initialInputs);
      setShowGradeModal(true);
    } catch (err) {
      toast.error('Gagal memuat detail lembar jawaban');
    }
  };

  const handleSaveGrade = async (releaseImmediately = false) => {
    if (!selectedAttemptDetail) return;
    setIsSavingGrade(true);

    const gradesPayload = Object.keys(gradingInputs).map(qId => ({
      question_id: parseInt(qId),
      earned_points: gradingInputs[qId].earned_points !== '' ? parseFloat(gradingInputs[qId].earned_points) : 0,
      teacher_feedback: gradingInputs[qId].teacher_feedback
    }));

    try {
      await api.post(`/api/quizzes/attempts/${selectedAttemptDetail.attempt_id}/grade`, {
        grades: gradesPayload,
        release_score: releaseImmediately
      });
      toast.success(releaseImmediately ? 'Nilai disimpan & dirilis ke siswa!' : 'Penilaian berhasil disimpan!');
      setShowGradeModal(false);
      // Refresh attempts
      handleOpenAttemptsModal(selectedQuizForAttempts);
      fetchQuizzes();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menyimpan penilaian');
    } finally {
      setIsSavingGrade(false);
    }
  };

  const handleReleaseAllScores = async (quizId) => {
    try {
      const res = await api.post(`/api/quizzes/${quizId}/release-scores`);
      toast.success(res.data.message || 'Nilai kuis berhasil dirilis ke semua siswa!');
      if (selectedQuizForAttempts) {
        handleOpenAttemptsModal(selectedQuizForAttempts);
      }
      fetchQuizzes();
    } catch (err) {
      toast.error('Gagal merilis nilai kuis');
    }
  };

  // ==========================================
  // STUDENT EXAM ROOM HANDLERS
  // ==========================================
  const handleStartQuiz = async (quiz) => {
    setIsExamLoading(true);
    try {
      const res = await api.get(`/api/quizzes/${quiz.id}`);
      setActiveExamQuiz(res.data);

      const startRes = await api.post(`/api/quizzes/${quiz.id}/start`);
      setExamAttemptId(startRes.data.attempt_id);
      setExamQuestions(startRes.data.questions || []);
      setRemainingTime(startRes.data.remaining_seconds);

      // Pre-fill answers from saved state
      const initialAnswers = {};
      (startRes.data.questions || []).forEach(q => {
        initialAnswers[q.id] = {
          selected_option: q.saved_answer?.selected_option || '',
          essay_answer: q.saved_answer?.essay_answer || ''
        };
      });
      setExamAnswers(initialAnswers);
      setCurrentQuestionIndex(0);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal memulai kuis');
      setActiveExamQuiz(null);
    } finally {
      setIsExamLoading(false);
    }
  };

  // Live Timer Countdown Effect
  useEffect(() => {
    if (activeExamQuiz && remainingTime !== null && remainingTime > 0) {
      timerRef.current = setInterval(() => {
        setRemainingTime(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            handleAutoSubmitOnTimeout();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [activeExamQuiz, remainingTime]);

  const formatSeconds = (sec) => {
    if (sec === null || sec === undefined) return '--:--';
    const hours = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    const secs = sec % 60;
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSelectOption = (questionId, optionKey) => {
    setExamAnswers(prev => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        selected_option: optionKey
      }
    }));
    triggerAutoSave(questionId, { selected_option: optionKey });
  };

  const handleEssayChange = (questionId, text) => {
    setExamAnswers(prev => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        essay_answer: text
      }
    }));
  };

  const handleEssayBlur = (questionId) => {
    const ans = examAnswers[questionId]?.essay_answer;
    triggerAutoSave(questionId, { essay_answer: ans });
  };

  const triggerAutoSave = async (questionId, payload) => {
    if (!activeExamQuiz) return;
    setSaveStatus('saving');
    try {
      await api.post(`/api/quizzes/${activeExamQuiz.id}/save-answer`, {
        question_id: questionId,
        ...payload
      });
      setSaveStatus('saved');
    } catch (err) {
      setSaveStatus('error');
    }
  };

  const handleAutoSubmitOnTimeout = async () => {
    toast.error('Waktu pengerjaan telah habis! Mengumpulkan jawaban...');
    await performFinalSubmit();
  };

  const performFinalSubmit = async () => {
    if (!activeExamQuiz) return;
    setIsSubmittingExam(true);

    const batchAnswers = Object.keys(examAnswers).map(qId => ({
      question_id: parseInt(qId),
      selected_option: examAnswers[qId].selected_option,
      essay_answer: examAnswers[qId].essay_answer
    }));

    try {
      const res = await api.post(`/api/quizzes/${activeExamQuiz.id}/submit`, {
        answers: batchAnswers
      });
      toast.success('Kuis berhasil dikumpulkan!');
      setActiveExamQuiz(null);
      setShowSubmitConfirmModal(false);
      fetchQuizzes();

      // If score is immediately available, open result modal
      if (res.data.is_score_released) {
        handleViewStudentResult(activeExamQuiz.id);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal mengirim jawaban kuis');
    } finally {
      setIsSubmittingExam(false);
    }
  };

  // ==========================================
  // STUDENT RESULT & REVIEW HANDLERS
  // ==========================================
  const handleViewStudentResult = async (quizId) => {
    setLoadingResult(true);
    setShowResultModal(true);
    try {
      const quizRes = await api.get(`/api/quizzes/${quizId}`);
      if (quizRes.data.attempt) {
        const attemptRes = await api.get(`/api/quizzes/${quizId}/attempts/${quizRes.data.attempt.id}`);
        setResultAttemptDetail(attemptRes.data);
      }
    } catch (err) {
      toast.error('Gagal memuat hasil kuis');
      setShowResultModal(false);
    } finally {
      setLoadingResult(false);
    }
  };

  // Calculation Helpers
  const totalFormPoints = formQuestions.reduce((acc, q) => acc + (parseFloat(q.points) || 0), 0);
  const currentQ = examQuestions[currentQuestionIndex];
  const answeredCount = Object.values(examAnswers).filter(a => a.selected_option || a.essay_answer?.trim()).length;

  // Filter Quizzes
  const filteredQuizzes = quizzes.filter(q => {
    const matchesSearch = q.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (q.subject_name && q.subject_name.toLowerCase().includes(searchQuery.toLowerCase()));
    if (!matchesSearch) return false;

    if (activeTab === 'active') return q.is_active;
    if (activeTab === 'completed') {
      if (isGuru) return q.total_attempts > 0;
      return q.attempt && (q.attempt.status === 'submitted' || q.attempt.status === 'graded');
    }
    if (activeTab === 'needs_grading' && isGuru) {
      return q.pending_grading_count > 0;
    }
    return true;
  });

  return (
    <div className="flex bg-[#070b14] min-h-screen text-slate-100 font-sans selection:bg-indigo-500 selection:text-white">
      <Sidebar user={user} onLogout={onLogout} />

      {/* Main Content Area */}
      <main className="flex-1 md:ml-64 p-4 md:p-8 overflow-y-auto">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 rounded-xl text-indigo-400">
                <HelpCircle size={24} />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-white via-slate-100 to-indigo-200 bg-clip-text text-transparent">
                  Kuis & Evaluasi Pembelajaran
                </h1>
                <p className="text-slate-400 text-xs md:text-sm mt-0.5">
                  {isGuru 
                    ? 'Buat kuis pilihan ganda & essai terstruktur, atur timer otomatis, dan periksa lembar jawaban murid.' 
                    : 'Uji pemahaman materi pembelajaran melalui evaluasi pilihan ganda & essai dengan batas waktu.'}
                </p>
              </div>
            </div>
          </div>

          {isGuru && (
            <button
              onClick={() => handleOpenCreateModal()}
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-medium rounded-xl shadow-lg shadow-indigo-500/25 border border-indigo-400/30 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus size={18} />
              <span>Buat Kuis Baru</span>
            </button>
          )}
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="p-4 rounded-2xl bg-[#0B1120]/80 border border-white/[0.08] backdrop-blur-xl relative overflow-hidden group hover:border-indigo-500/40 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">Total Kuis Tersedia</span>
              <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-400 border border-indigo-500/20">
                <BookOpen size={18} />
              </div>
            </div>
            <div className="mt-3 text-2xl font-bold text-white tracking-tight">
              {quizzes.length}
            </div>
            <span className="text-[11px] text-slate-500 mt-1 block">Modul evaluasi terdaftar</span>
          </div>

          <div className="p-4 rounded-2xl bg-[#0B1120]/80 border border-white/[0.08] backdrop-blur-xl relative overflow-hidden group hover:border-emerald-500/40 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">
                {isGuru ? 'Total Pengerjaan Siswa' : 'Kuis Selesai'}
              </span>
              <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-400 border border-emerald-500/20">
                <CheckCircle2 size={18} />
              </div>
            </div>
            <div className="mt-3 text-2xl font-bold text-white tracking-tight">
              {isGuru 
                ? quizzes.reduce((acc, q) => acc + (q.total_attempts || 0), 0)
                : quizzes.filter(q => q.attempt && (q.attempt.status === 'submitted' || q.attempt.status === 'graded')).length}
            </div>
            <span className="text-[11px] text-slate-500 mt-1 block">
              {isGuru ? 'Lembar jawaban terkumpul' : 'Evaluasi telah dikerjakan'}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-[#0B1120]/80 border border-white/[0.08] backdrop-blur-xl relative overflow-hidden group hover:border-amber-500/40 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">
                {isGuru ? 'Perlu Dikoreksi' : 'Kuis Menunggu Nilai'}
              </span>
              <div className="p-2 bg-amber-500/10 rounded-xl text-amber-400 border border-amber-500/20">
                <AlertCircle size={18} />
              </div>
            </div>
            <div className="mt-3 text-2xl font-bold text-white tracking-tight">
              {isGuru 
                ? quizzes.reduce((acc, q) => acc + (q.pending_grading_count || 0), 0)
                : quizzes.filter(q => q.attempt && q.attempt.status === 'submitted' && !q.attempt.is_score_released).length}
            </div>
            <span className="text-[11px] text-slate-500 mt-1 block">
              {isGuru ? 'Jawaban essai menunggu feedback' : 'Essai dalam proses review guru'}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-[#0B1120]/80 border border-white/[0.08] backdrop-blur-xl relative overflow-hidden group hover:border-purple-500/40 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">Sistem Penilaian</span>
              <div className="p-2 bg-purple-500/10 rounded-xl text-purple-400 border border-purple-500/20">
                <Award size={18} />
              </div>
            </div>
            <div className="mt-3 text-xl font-bold text-white tracking-tight flex items-center gap-1.5">
              <span>PG & Essai</span>
              <span className="text-[10px] px-1.5 py-0.5 bg-purple-500/20 text-purple-300 rounded border border-purple-500/30">Auto-Grade</span>
            </div>
            <span className="text-[11px] text-slate-500 mt-1 block">Otomatis & Koreksi Manual</span>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-1.5 p-1 bg-[#0B1120]/90 border border-white/[0.08] rounded-xl w-full sm:w-auto overflow-x-auto">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'all'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Semua Kuis
            </button>
            <button
              onClick={() => setActiveTab('active')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'active'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Sedang Aktif
            </button>
            <button
              onClick={() => setActiveTab('completed')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'completed'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {isGuru ? 'Ada Pengerjaan' : 'Selesai'}
            </button>
            {isGuru && (
              <button
                onClick={() => setActiveTab('needs_grading')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  activeTab === 'needs_grading'
                    ? 'bg-amber-600 text-white shadow-md shadow-amber-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Perlu Dikoreksi
              </button>
            )}
          </div>

          <div className="w-full sm:w-64">
            <input
              type="text"
              placeholder="Cari judul kuis atau matkul..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3.5 py-2 bg-[#0B1120]/80 border border-white/[0.08] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
        </div>

        {/* Quizzes List Cards */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-slate-400 text-xs mt-3">Memuat modul kuis...</span>
          </div>
        ) : filteredQuizzes.length === 0 ? (
          <div className="p-12 text-center rounded-3xl bg-[#0B1120]/40 border border-white/[0.06] backdrop-blur-xl">
            <div className="w-16 h-16 bg-white/[0.03] border border-white/[0.08] rounded-2xl flex items-center justify-center mx-auto text-slate-500 mb-4">
              <HelpCircle size={32} />
            </div>
            <h3 className="text-lg font-bold text-white mb-1">Belum Ada Kuis</h3>
            <p className="text-slate-400 text-xs max-w-md mx-auto mb-5">
              {isGuru 
                ? 'Belum ada kuis yang dibuat. Klik tombol di bawah untuk membuat kuis evaluasi baru untuk murid.' 
                : 'Saat ini belum ada kuis atau ujian yang ditugaskan untuk Anda.'}
            </p>
            {isGuru && (
              <button
                onClick={() => handleOpenCreateModal()}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-xl transition-all"
              >
                <Plus size={16} />
                <span>Buat Kuis Sekarang</span>
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredQuizzes.map((quiz) => {
              const attempt = quiz.attempt;
              const isCompleted = attempt && (attempt.status === 'submitted' || attempt.status === 'graded');
              const isInProgress = attempt && attempt.status === 'in_progress';
              const hasScore = attempt && attempt.is_score_released && attempt.total_score !== null;

              return (
                <motion.div
                  key={quiz.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-5 rounded-2xl bg-[#0B1120]/90 border border-white/[0.08] hover:border-indigo-500/40 backdrop-blur-xl flex flex-col justify-between transition-all duration-200 group relative shadow-lg shadow-black/20"
                >
                  {/* Top Tags */}
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="px-2.5 py-1 rounded-lg text-[10px] font-semibold tracking-wide uppercase bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                        {quiz.subject_name || 'Umum'}
                      </span>
                      
                      {quiz.target_student_name && (
                        <span className="px-2 py-0.5 rounded text-[10px] bg-purple-500/10 text-purple-300 border border-purple-500/20 flex items-center gap-1">
                          <User size={10} />
                          <span>{quiz.target_student_name}</span>
                        </span>
                      )}

                      {/* Status Pill */}
                      {isGuru ? (
                        quiz.pending_grading_count > 0 ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            {quiz.pending_grading_count} Perlu Dinilai
                          </span>
                        ) : quiz.total_attempts > 0 ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            {quiz.total_attempts} Peserta
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-500/20 text-slate-300 border border-slate-500/30">
                            Belum Ada Peserta
                          </span>
                        )
                      ) : (
                        hasScore ? (
                          <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                            <Award size={12} />
                            <span>Nilai: {attempt.total_score} / 100</span>
                          </span>
                        ) : isCompleted ? (
                          <span className="px-2.5 py-1 rounded-lg text-[10px] font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            Menunggu Koreksi Guru
                          </span>
                        ) : isInProgress ? (
                          <span className="px-2.5 py-1 rounded-lg text-[10px] font-medium bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 animate-pulse">
                            Sedang Berjalan
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-lg text-[10px] font-medium bg-slate-500/20 text-slate-300 border border-slate-500/30">
                            Belum Dikerjakan
                          </span>
                        )
                      )}
                    </div>

                    {/* Title & Description */}
                    <h3 className="text-base font-bold text-white group-hover:text-indigo-300 transition-colors line-clamp-1 mb-1.5">
                      {quiz.title}
                    </h3>
                    <p className="text-slate-400 text-xs line-clamp-2 mb-4 leading-relaxed">
                      {quiz.description || 'Tidak ada instruksi khusus untuk kuis ini.'}
                    </p>

                    {/* Meta Specs */}
                    <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400 bg-white/[0.02] p-2.5 rounded-xl border border-white/[0.04] mb-4">
                      <div className="flex items-center gap-1.5">
                        <Clock size={13} className="text-indigo-400" />
                        <span>{quiz.duration_minutes} Menit</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <CheckSquare size={13} className="text-purple-400" />
                        <span>{quiz.question_count} Soal ({quiz.has_essay ? 'PG & Essai' : 'Pilihan Ganda'})</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Award size={13} className="text-amber-400" />
                        <span>Bobot: {quiz.total_points} Poin</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Layers size={13} className="text-emerald-400" />
                        <span>{quiz.show_score_immediately ? 'Nilai Instan' : 'Rilis Bertahap'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Bottom Bar */}
                  <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between gap-2">
                    {isGuru ? (
                      <>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleOpenCreateModal(quiz)}
                            title="Edit Kuis"
                            className="p-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white border border-white/[0.06] transition-colors"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteQuiz(quiz.id)}
                            title="Hapus Kuis"
                            className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>

                        <button
                          onClick={() => handleOpenAttemptsModal(quiz)}
                          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 hover:text-white border border-indigo-500/30 rounded-xl text-xs font-medium transition-all"
                        >
                          <Eye size={14} />
                          <span>Hasil & Koreksi ({quiz.total_attempts || 0})</span>
                        </button>
                      </>
                    ) : (
                      <>
                        {hasScore ? (
                          <button
                            onClick={() => handleViewStudentResult(quiz.id)}
                            className="w-full flex items-center justify-center gap-2 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-semibold transition-all"
                          >
                            <Award size={14} />
                            <span>Lihat Hasil & Pembahasan</span>
                          </button>
                        ) : isCompleted ? (
                          <button
                            onClick={() => handleViewStudentResult(quiz.id)}
                            className="w-full flex items-center justify-center gap-2 py-2 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-semibold transition-all"
                          >
                            <FileText size={14} />
                            <span>Lihat Lembar Jawaban</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleStartQuiz(quiz)}
                            disabled={isExamLoading}
                            className="w-full flex items-center justify-center gap-2 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-500/20 transition-all"
                          >
                            <Sparkles size={14} />
                            <span>{isInProgress ? 'Lanjutkan Kuis' : 'Mulai Kerjakan Kuis'}</span>
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </main>

      {/* ========================================================================= */}
      {/* 1. MODAL CREATE / EDIT QUIZ (GURU)                                        */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-[#0B1120] border border-white/[0.1] rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-white/[0.08] flex items-center justify-between bg-white/[0.02]">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-indigo-500/20 border border-indigo-500/30 rounded-xl text-indigo-400">
                    <Edit3 size={20} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">
                      {editingQuizId ? 'Edit Pengaturan Kuis & Soal' : 'Buat Kuis & Evaluasi Baru'}
                    </h2>
                    <p className="text-xs text-slate-400">
                      Konfigurasi jadwal, durasi, opsi penilaian, dan butir soal pilihan ganda / essai.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/[0.06] transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Modal Scrollable Body */}
              <form onSubmit={handleSaveQuiz} className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Basic Settings */}
                <div className="bg-white/[0.02] border border-white/[0.06] p-4 md:p-5 rounded-2xl space-y-4">
                  <h3 className="text-xs font-bold text-indigo-400 tracking-wider uppercase flex items-center gap-1.5">
                    <Settings2 size={14} />
                    <span>Informasi Utama & Pengaturan Waktu</span>
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1.5">
                        Judul Kuis / Ujian <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="Contoh: Kuis 1 - Logika Pemrograman & Algoritma"
                        value={formTitle}
                        onChange={(e) => setFormTitle(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-[#070b14] border border-white/[0.08] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1.5">
                        Mata Pelajaran / Kuliah <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="Contoh: Pemrograman Web, Kalkulus, dsb"
                        value={formSubjectName}
                        onChange={(e) => setFormSubjectName(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-[#070b14] border border-white/[0.08] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Petunjuk & Instruksi Pengerjaan
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Tuliskan petunjuk pengerjaan kuis untuk siswa..."
                      value={formDesc}
                      onChange={(e) => setFormDesc(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-[#070b14] border border-white/[0.08] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1">
                        <Clock size={12} className="text-indigo-400" />
                        <span>Durasi Pengerjaan (Menit)</span>
                      </label>
                      <input
                        type="number"
                        min="5"
                        max="300"
                        value={formDuration}
                        onChange={(e) => setFormDuration(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-[#070b14] border border-white/[0.08] rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1">
                        <Calendar size={12} className="text-emerald-400" />
                        <span>Waktu Buka (Opsional)</span>
                      </label>
                      <input
                        type="datetime-local"
                        value={formStartTime}
                        onChange={(e) => setFormStartTime(e.target.value)}
                        className="w-full px-3 py-2 bg-[#070b14] border border-white/[0.08] rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1">
                        <Calendar size={12} className="text-red-400" />
                        <span>Batas Akhir (Opsional)</span>
                      </label>
                      <input
                        type="datetime-local"
                        value={formEndTime}
                        onChange={(e) => setFormEndTime(e.target.value)}
                        className="w-full px-3 py-2 bg-[#070b14] border border-white/[0.08] rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1.5">
                        Target Murid
                      </label>
                      <select
                        value={formTargetStudentId}
                        onChange={(e) => setFormTargetStudentId(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-[#070b14] border border-white/[0.08] rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                      >
                        <option value="">Semua Murid (Kuis Terbuka)</option>
                        {mentees.map(m => (
                          <option key={m.id} value={m.id}>
                            {m.display_name || m.username} ({m.campus || 'Murid'})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center gap-3 pt-6">
                      <input
                        type="checkbox"
                        id="showScoreImmediately"
                        checked={formShowScoreImmediately}
                        onChange={(e) => setFormShowScoreImmediately(e.target.checked)}
                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 bg-slate-900 border-white/20"
                      />
                      <label htmlFor="showScoreImmediately" className="text-xs text-slate-300 cursor-pointer">
                        <span className="font-semibold text-white block">Tampilkan Nilai Langsung</span>
                        <span className="text-slate-400 text-[11px]">
                          Jika dicentang, nilai PG langsung tampil setelah submit (Essai tetap menunggu koreksi).
                        </span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Question Builder */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <span>Daftar Butir Soal ({formQuestions.length} Soal)</span>
                        <span className="text-xs px-2 py-0.5 bg-indigo-500/20 text-indigo-300 rounded-md border border-indigo-500/30">
                          Total {totalFormPoints} Poin
                        </span>
                      </h3>
                      <p className="text-xs text-slate-400">Tambahkan soal pilihan ganda atau uraian essai.</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleAddQuestion('multiple_choice')}
                        className="px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-xl text-xs font-medium transition-colors flex items-center gap-1"
                      >
                        <Plus size={14} />
                        <span>+ Pilihan Ganda</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAddQuestion('essay')}
                        className="px-3 py-1.5 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 rounded-xl text-xs font-medium transition-colors flex items-center gap-1"
                      >
                        <Plus size={14} />
                        <span>+ Soal Essai</span>
                      </button>
                    </div>
                  </div>

                  {/* Question Cards */}
                  <div className="space-y-4">
                    {formQuestions.map((q, idx) => (
                      <div
                        key={q.id || idx}
                        className="p-4 rounded-2xl bg-[#070b14] border border-white/[0.08] relative group"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center text-xs font-bold">
                              {idx + 1}
                            </span>
                            <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                              q.question_type === 'multiple_choice' 
                                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' 
                                : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                            }`}>
                              {q.question_type === 'multiple_choice' ? 'Pilihan Ganda' : 'Essai'}
                            </span>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[11px] text-slate-400">Bobot Poin:</span>
                              <input
                                type="number"
                                min="1"
                                max="100"
                                value={q.points}
                                onChange={(e) => handleUpdateQuestion(idx, 'points', e.target.value)}
                                className="w-16 px-2 py-1 bg-black/40 border border-white/10 rounded-lg text-xs text-white text-center focus:outline-none focus:border-indigo-500"
                              />
                            </div>

                            <button
                              type="button"
                              onClick={() => handleRemoveQuestion(idx)}
                              className="p-1.5 text-slate-500 hover:text-red-400 rounded-lg hover:bg-red-500/10 transition-colors"
                              title="Hapus Soal"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </div>

                        {/* Question Text */}
                        <div className="mb-3">
                          <textarea
                            rows={2}
                            placeholder={`Tuliskan pertanyaan nomor ${idx + 1}...`}
                            value={q.question_text}
                            onChange={(e) => handleUpdateQuestion(idx, 'question_text', e.target.value)}
                            className="w-full px-3 py-2 bg-white/[0.02] border border-white/[0.06] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                            required
                          />
                        </div>

                        {/* Multiple Choice Options Builder */}
                        {q.question_type === 'multiple_choice' ? (
                          <div className="space-y-2 pt-1">
                            <span className="text-[11px] text-slate-400 block font-medium">
                              Pilihan Jawaban (Klik lingkaran untuk memilih Kunci Jawaban Benar):
                            </span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {q.options.map((opt, optIdx) => (
                                <div
                                  key={opt.key}
                                  className={`flex items-center gap-2 p-2 rounded-xl border transition-all ${
                                    q.correct_answer === opt.key 
                                      ? 'bg-emerald-500/10 border-emerald-500/40' 
                                      : 'bg-white/[0.02] border-white/[0.06]'
                                  }`}
                                >
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateQuestion(idx, 'correct_answer', opt.key)}
                                    className={`w-6 h-6 rounded-lg text-xs font-bold flex items-center justify-center transition-all ${
                                      q.correct_answer === opt.key
                                        ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30'
                                        : 'bg-white/[0.06] text-slate-400 hover:text-white'
                                    }`}
                                  >
                                    {opt.key}
                                  </button>
                                  <input
                                    type="text"
                                    placeholder={`Jawaban opsi ${opt.key}...`}
                                    value={opt.text}
                                    onChange={(e) => handleUpdateOption(idx, optIdx, e.target.value)}
                                    className="flex-1 bg-transparent border-none text-xs text-white focus:outline-none placeholder-slate-600"
                                    required
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          /* Essay Rubric Hint */
                          <div className="pt-1">
                            <label className="text-[11px] text-slate-400 block font-medium mb-1">
                              Rubrik / Catatan Kunci Guru (Opsional - Sebagai panduan koreksi):
                            </label>
                            <input
                              type="text"
                              placeholder="Kriteria jawaban yang diharapkan atau kata kunci esensial..."
                              value={q.rubric || ''}
                              onChange={(e) => handleUpdateQuestion(idx, 'rubric', e.target.value)}
                              className="w-full px-3 py-2 bg-white/[0.02] border border-white/[0.06] rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Submit Actions */}
                <div className="pt-4 border-t border-white/[0.08] flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 text-xs font-medium rounded-xl transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingQuiz}
                    className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-500/25 transition-all flex items-center gap-2"
                  >
                    {isSavingQuiz ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Menyimpan Kuis...</span>
                      </>
                    ) : (
                      <>
                        <Save size={15} />
                        <span>{editingQuizId ? 'Simpan Perubahan' : 'Terbitkan Kuis'}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* 2. MODAL SUBMISSIONS & HASIL KUIS (GURU)                                  */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {showAttemptsModal && selectedQuizForAttempts && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-[#0B1120] border border-white/[0.1] rounded-3xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden"
            >
              {/* Header */}
              <div className="p-6 border-b border-white/[0.08] flex items-center justify-between bg-white/[0.02]">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <span>Hasil & Rekapitulasi: {selectedQuizForAttempts.title}</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Daftar seluruh murid yang telah mengerjakan kuis ini.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleReleaseAllScores(selectedQuizForAttempts.id)}
                    className="px-3.5 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5"
                  >
                    <ShieldCheck size={14} />
                    <span>Rilis Semua Nilai</span>
                  </button>
                  <button
                    onClick={() => setShowAttemptsModal(false)}
                    className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/[0.06]"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Table */}
              <div className="flex-1 overflow-y-auto p-6">
                {loadingAttempts ? (
                  <div className="text-center py-12">
                    <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <span className="text-xs text-slate-400 mt-2 block">Memuat data pengerjaan...</span>
                  </div>
                ) : !attemptsData || attemptsData.attempts.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 text-xs">
                    Belum ada murid yang menyelesaikan kuis ini.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-300">
                      <thead className="bg-white/[0.03] text-slate-400 uppercase tracking-wider text-[10px]">
                        <tr>
                          <th className="p-3 rounded-l-xl">Nama Murid</th>
                          <th className="p-3">Kampus / Jurusan</th>
                          <th className="p-3">Waktu Selesai</th>
                          <th className="p-3 text-center">Status</th>
                          <th className="p-3 text-center">Nilai Akhir</th>
                          <th className="p-3 text-right rounded-r-xl">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.04]">
                        {attemptsData.attempts.map((att) => (
                          <tr key={att.id} className="hover:bg-white/[0.02] transition-colors">
                            <td className="p-3 font-medium text-white">
                              {att.student_name}
                            </td>
                            <td className="p-3 text-slate-400">
                              {att.student_campus || '-'} {att.student_department ? `• ${att.student_department}` : ''}
                            </td>
                            <td className="p-3 text-slate-400">
                              {att.submitted_at ? new Date(att.submitted_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : '-'}
                            </td>
                            <td className="p-3 text-center">
                              {att.essay_pending_count > 0 ? (
                                <span className="px-2 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                  {att.essay_pending_count} Essai Belum Dinilai
                                </span>
                              ) : att.is_score_released ? (
                                <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                  Nilai Dirilis
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                                  Sudah Dinilai (Belum Rilis)
                                </span>
                              )}
                            </td>
                            <td className="p-3 text-center font-bold text-white">
                              {att.total_score !== null ? `${att.total_score} / 100` : '-'}
                            </td>
                            <td className="p-3 text-right">
                              <button
                                onClick={() => handleOpenGradeModal(att.id)}
                                className="px-3 py-1 bg-indigo-600/30 hover:bg-indigo-600 text-indigo-200 hover:text-white rounded-lg text-xs font-medium border border-indigo-500/30 transition-all"
                              >
                                Koreksi & Beri Nilai
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* 3. MODAL KOREKSI / GRADING INDIVIDU (GURU)                                 */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {showGradeModal && selectedAttemptDetail && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-[#0B1120] border border-white/[0.1] rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
            >
              {/* Header */}
              <div className="p-6 border-b border-white/[0.08] flex items-center justify-between bg-white/[0.02]">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <span>Lembar Ujian: {selectedAttemptDetail.student_name}</span>
                    <span className="text-xs px-2 py-0.5 bg-indigo-500/20 text-indigo-300 rounded border border-indigo-500/30">
                      {selectedAttemptDetail.quiz_title}
                    </span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Koreksi jawaban essai, sesuaikan perolehan poin, dan berikan feedback pembelajaran.
                  </p>
                </div>
                <button
                  onClick={() => setShowGradeModal(false)}
                  className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/[0.06]"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-5">
                {selectedAttemptDetail.answers.map((ans, idx) => (
                  <div
                    key={ans.question_id}
                    className="p-4 rounded-2xl bg-[#070b14] border border-white/[0.08] space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center text-xs font-bold">
                          {idx + 1}
                        </span>
                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                          ans.question_type === 'multiple_choice' 
                            ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' 
                            : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                        }`}>
                          {ans.question_type === 'multiple_choice' ? 'Pilihan Ganda' : 'Essai'}
                        </span>
                        <span className="text-xs text-slate-400">Maks: {ans.points} Poin</span>
                      </div>

                      {/* Points input */}
                      <div className="flex items-center gap-1.5">
                        <label className="text-xs font-medium text-slate-300">Poin Diperoleh:</label>
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          max={ans.points}
                          value={gradingInputs[ans.question_id]?.earned_points ?? ''}
                          onChange={(e) => setGradingInputs(prev => ({
                            ...prev,
                            [ans.question_id]: {
                              ...prev[ans.question_id],
                              earned_points: e.target.value
                            }
                          }))}
                          className="w-20 px-2.5 py-1 bg-white/[0.05] border border-white/10 rounded-lg text-xs text-white text-center focus:outline-none focus:border-indigo-500 font-bold"
                        />
                      </div>
                    </div>

                    {/* Question text */}
                    <p className="text-xs text-white font-medium">
                      {ans.question_text}
                    </p>

                    {/* Multiple Choice Answers Comparison */}
                    {ans.question_type === 'multiple_choice' ? (
                      <div className="bg-white/[0.02] p-3 rounded-xl border border-white/[0.04] space-y-1.5 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400">Jawaban Murid:</span>
                          <span className={`font-bold px-2 py-0.5 rounded ${
                            ans.selected_option === ans.correct_answer
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-red-500/20 text-red-300 border border-red-500/30'
                          }`}>
                            {ans.selected_option ? `Opsi ${ans.selected_option}` : 'Tidak Menjawab'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400">Kunci Jawaban:</span>
                          <span className="font-bold text-emerald-400">Opsi {ans.correct_answer}</span>
                        </div>
                      </div>
                    ) : (
                      /* Essay Answer Display */
                      <div className="space-y-3">
                        <div className="bg-white/[0.02] p-3 rounded-xl border border-white/[0.04]">
                          <span className="text-[11px] text-slate-400 block font-medium mb-1">
                            Jawaban Teks Murid:
                          </span>
                          <p className="text-xs text-slate-200 whitespace-pre-wrap leading-relaxed bg-[#0B1120] p-3 rounded-lg border border-white/[0.06]">
                            {ans.essay_answer || '(Murid tidak mengisi jawaban essai ini)'}
                          </p>
                        </div>

                        {ans.rubric && (
                          <div className="text-[11px] text-indigo-300 bg-indigo-500/10 p-2.5 rounded-lg border border-indigo-500/20">
                            <strong>Rubrik Guru:</strong> {ans.rubric}
                          </div>
                        )}

                        <div>
                          <label className="text-[11px] text-slate-300 block font-medium mb-1">
                            Catatan & Feedback Guru untuk Murid:
                          </label>
                          <textarea
                            rows={2}
                            placeholder="Tuliskan evaluasi, koreksi, atau apresiasi untuk jawaban murid ini..."
                            value={gradingInputs[ans.question_id]?.teacher_feedback || ''}
                            onChange={(e) => setGradingInputs(prev => ({
                              ...prev,
                              [ans.question_id]: {
                                ...prev[ans.question_id],
                                teacher_feedback: e.target.value
                              }
                            }))}
                            className="w-full px-3 py-2 bg-[#0B1120] border border-white/[0.08] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Bottom Actions */}
              <div className="p-4 border-t border-white/[0.08] flex items-center justify-end gap-3 bg-white/[0.02]">
                <button
                  onClick={() => setShowGradeModal(false)}
                  className="px-4 py-2 bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 text-xs font-medium rounded-xl"
                >
                  Tutup
                </button>
                <button
                  onClick={() => handleSaveGrade(false)}
                  disabled={isSavingGrade}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition-all"
                >
                  Simpan Draft Nilai
                </button>
                <button
                  onClick={() => handleSaveGrade(true)}
                  disabled={isSavingGrade}
                  className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-1.5"
                >
                  <ShieldCheck size={15} />
                  <span>Simpan & Rilis Nilai ke Siswa</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* 4. RUANG UJIAN / EXAM ROOM (MURID) - FOCUSED FULLSCREEN MODE              */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {activeExamQuiz && currentQ && (
          <div className="fixed inset-0 z-50 bg-[#070b14] flex flex-col overflow-hidden">
            {/* Exam Header */}
            <header className="h-16 px-4 md:px-8 border-b border-white/[0.08] bg-[#0B1120]/90 backdrop-blur-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <HelpCircle size={20} />
                </div>
                <div>
                  <h2 className="text-sm md:text-base font-bold text-white line-clamp-1">
                    {activeExamQuiz.title}
                  </h2>
                  <span className="text-[11px] text-slate-400">
                    Soal {currentQuestionIndex + 1} dari {examQuestions.length} • {activeExamQuiz.subject_name}
                  </span>
                </div>
              </div>

              {/* Timer Bar */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5 text-xs">
                  <span className={`w-2 h-2 rounded-full ${
                    saveStatus === 'saved' ? 'bg-emerald-400' : saveStatus === 'saving' ? 'bg-amber-400 animate-ping' : 'bg-red-400'
                  }`}></span>
                  <span className="text-[11px] text-slate-400 hidden sm:inline">
                    {saveStatus === 'saved' ? 'Tersimpan' : saveStatus === 'saving' ? 'Menyimpan...' : 'Gagal Simpan'}
                  </span>
                </div>

                <div className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl border font-mono font-bold text-xs md:text-sm shadow-md ${
                  remainingTime !== null && remainingTime < 300 
                    ? 'bg-red-500/20 text-red-300 border-red-500/40 animate-pulse' 
                    : 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30'
                }`}>
                  <Clock size={16} />
                  <span>{formatSeconds(remainingTime)}</span>
                </div>

                <button
                  onClick={() => setShowSubmitConfirmModal(true)}
                  className="px-4 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-emerald-500/25 transition-all flex items-center gap-1.5"
                >
                  <CheckCircle size={15} />
                  <span>Selesai & Kumpulkan</span>
                </button>
              </div>
            </header>

            {/* Exam Main Layout */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
              {/* Question & Answer Area */}
              <div className="flex-1 overflow-y-auto p-4 md:p-8 flex flex-col justify-between">
                <div className="max-w-3xl mx-auto w-full space-y-6">
                  {/* Question Header Card */}
                  <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-bold">
                        Soal Nomor {currentQuestionIndex + 1}
                      </span>
                      <span className="text-xs text-slate-400">
                        {currentQ.question_type === 'multiple_choice' ? 'Pilihan Ganda' : 'Essai / Uraian'} • {currentQ.points} Poin
                      </span>
                    </div>
                  </div>

                  {/* Question Text */}
                  <div className="text-sm md:text-base text-slate-100 font-medium leading-relaxed bg-[#0B1120]/60 p-5 rounded-2xl border border-white/[0.06]">
                    {currentQ.question_text}
                  </div>

                  {/* Answer Input Section */}
                  {currentQ.question_type === 'multiple_choice' ? (
                    <div className="space-y-3 pt-2">
                      {currentQ.options.map((opt) => {
                        const isSelected = examAnswers[currentQ.id]?.selected_option === opt.key;
                        return (
                          <button
                            key={opt.key}
                            type="button"
                            onClick={() => handleSelectOption(currentQ.id, opt.key)}
                            className={`w-full text-left p-4 rounded-2xl border transition-all flex items-center gap-3.5 group ${
                              isSelected
                                ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-lg shadow-indigo-500/10'
                                : 'bg-[#0B1120]/40 border-white/[0.06] text-slate-300 hover:bg-white/[0.04] hover:border-white/[0.12]'
                            }`}
                          >
                            <div className={`w-8 h-8 rounded-xl font-bold text-xs flex items-center justify-center transition-all ${
                              isSelected
                                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30'
                                : 'bg-white/[0.06] text-slate-400 group-hover:text-white'
                            }`}>
                              {opt.key}
                            </div>
                            <span className="text-xs md:text-sm leading-relaxed">{opt.text}</span>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    /* Essay Textarea */
                    <div className="space-y-2 pt-2">
                      <label className="text-xs font-medium text-slate-300 flex items-center justify-between">
                        <span>Tuliskan Jawaban Uraian Anda di bawah:</span>
                        <span className="text-[11px] text-slate-500">Autosave saat berpindah nomor</span>
                      </label>
                      <textarea
                        rows={8}
                        placeholder="Ketikkan jawaban lengkap, penjelasan, atau analisis Anda di sini..."
                        value={examAnswers[currentQ.id]?.essay_answer || ''}
                        onChange={(e) => handleEssayChange(currentQ.id, e.target.value)}
                        onBlur={() => handleEssayBlur(currentQ.id)}
                        className="w-full p-4 bg-[#0B1120]/60 border border-white/[0.08] rounded-2xl text-xs md:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 leading-relaxed font-sans"
                      />
                    </div>
                  )}
                </div>

                {/* Question Navigation Controls */}
                <div className="max-w-3xl mx-auto w-full pt-6 mt-6 border-t border-white/[0.06] flex items-center justify-between">
                  <button
                    onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
                    disabled={currentQuestionIndex === 0}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft size={16} />
                    <span>Sebelumnya</span>
                  </button>

                  <span className="text-xs text-slate-400">
                    {answeredCount} dari {examQuestions.length} Terjawab
                  </span>

                  {currentQuestionIndex < examQuestions.length - 1 ? (
                    <button
                      onClick={() => setCurrentQuestionIndex(prev => Math.min(examQuestions.length - 1, prev + 1))}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
                    >
                      <span>Selanjutnya</span>
                      <ChevronRight size={16} />
                    </button>
                  ) : (
                    <button
                      onClick={() => setShowSubmitConfirmModal(true)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors shadow-md shadow-emerald-500/20"
                    >
                      <CheckCircle size={15} />
                      <span>Kumpulkan Ujian</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Right Sidebar Question Grid Pallete */}
              <div className="w-full md:w-72 bg-[#0B1120]/80 border-t md:border-t-0 md:border-l border-white/[0.08] p-4 flex flex-col">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-3">
                  Nomor Soal
                </h3>
                <div className="grid grid-cols-5 gap-2 overflow-y-auto flex-1 pr-1">
                  {examQuestions.map((q, idx) => {
                    const isAnswered = examAnswers[q.id]?.selected_option || examAnswers[q.id]?.essay_answer?.trim();
                    const isCurrent = currentQuestionIndex === idx;

                    return (
                      <button
                        key={q.id}
                        onClick={() => setCurrentQuestionIndex(idx)}
                        className={`h-10 rounded-xl text-xs font-bold flex items-center justify-center transition-all ${
                          isCurrent
                            ? 'bg-indigo-600 text-white ring-2 ring-indigo-400 ring-offset-2 ring-offset-[#070b14]'
                            : isAnswered
                            ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40'
                            : 'bg-white/[0.04] text-slate-400 hover:bg-white/[0.08] hover:text-white border border-white/[0.06]'
                        }`}
                      >
                        {idx + 1}
                      </button>
                    );
                  })}
                </div>

                <div className="pt-4 border-t border-white/[0.06] space-y-1.5 text-[11px] text-slate-400">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded bg-emerald-600/40 border border-emerald-500/50"></span>
                    <span>Sudah Dijawab ({answeredCount})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded bg-white/[0.04] border border-white/[0.08]"></span>
                    <span>Belum Dijawab ({examQuestions.length - answeredCount})</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Confirmation Modal Before Final Submit */}
            <AnimatePresence>
              {showSubmitConfirmModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-[#0B1120] border border-white/[0.1] rounded-3xl p-6 max-w-md w-full text-center space-y-4 shadow-2xl"
                  >
                    <div className="w-14 h-14 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-2xl flex items-center justify-center mx-auto">
                      <CheckCircle size={28} />
                    </div>
                    <h3 className="text-lg font-bold text-white">Konfirmasi Pengumpulan Ujian</h3>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Anda telah menjawab <strong>{answeredCount}</strong> dari <strong>{examQuestions.length}</strong> soal yang tersedia.
                      {answeredCount < examQuestions.length && (
                        <span className="block mt-1 text-amber-300 font-medium">
                          ⚠️ Masih ada {examQuestions.length - answeredCount} soal yang belum Anda jawab.
                        </span>
                      )}
                      Setelah dikumpulkan, lembar ujian tidak dapat diubah kembali.
                    </p>

                    <div className="pt-3 flex items-center justify-center gap-3">
                      <button
                        onClick={() => setShowSubmitConfirmModal(false)}
                        className="px-4 py-2 bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 text-xs font-medium rounded-xl"
                      >
                        Periksa Kembali
                      </button>
                      <button
                        onClick={performFinalSubmit}
                        disabled={isSubmittingExam}
                        className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-semibold rounded-xl shadow-lg shadow-emerald-500/25 flex items-center gap-1.5"
                      >
                        {isSubmittingExam ? 'Mengumpulkan...' : 'Ya, Kumpulkan Sekarang'}
                      </button>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* 5. MODAL HASIL & REVIEW NILAI (MURID)                                      */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {showResultModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-[#0B1120] border border-white/[0.1] rounded-3xl w-full max-w-3xl max-h-[88vh] flex flex-col shadow-2xl overflow-hidden"
            >
              {/* Header */}
              <div className="p-6 border-b border-white/[0.08] flex items-center justify-between bg-white/[0.02]">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl">
                    <Award size={22} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">
                      Hasil Evaluasi Kuis
                    </h2>
                    <p className="text-xs text-slate-400">
                      Rincian perolehan nilai, kunci jawaban, dan umpan balik pengajar.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowResultModal(false)}
                  className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/[0.06]"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {loadingResult ? (
                  <div className="text-center py-12">
                    <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <span className="text-xs text-slate-400 mt-2 block">Memuat hasil kuis...</span>
                  </div>
                ) : !resultAttemptDetail ? (
                  <div className="text-center py-12 text-slate-400 text-xs">
                    Data hasil kuis tidak dapat ditampilkan.
                  </div>
                ) : (
                  <>
                    {/* Score Hero Banner */}
                    <div className="p-6 rounded-2xl bg-gradient-to-br from-indigo-900/40 via-[#0B1120] to-purple-900/40 border border-indigo-500/30 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
                      <div>
                        <span className="text-xs font-semibold text-indigo-300 uppercase tracking-wider">
                          {resultAttemptDetail.quiz_title}
                        </span>
                        <h3 className="text-xl font-bold text-white mt-0.5">
                          {resultAttemptDetail.is_score_released
                            ? 'Nilai Anda Telah Dirilis'
                            : 'Kuis Berhasil Dikumpulkan'}
                        </h3>
                        <p className="text-xs text-slate-300 mt-1 max-w-sm">
                          {resultAttemptDetail.is_score_released
                            ? 'Selamat telah menyelesaikan evaluasi ini! Silakan tinjau pembahasan di bawah.'
                            : 'Jawaban essai Anda sedang dalam proses penilaian oleh Guru/Dosen.'}
                        </p>
                      </div>

                      {resultAttemptDetail.total_score !== null ? (
                        <div className="p-4 rounded-2xl bg-black/40 border border-indigo-500/40 flex flex-col items-center justify-center min-w-[120px]">
                          <span className="text-3xl font-black text-emerald-400">
                            {resultAttemptDetail.total_score}
                          </span>
                          <span className="text-[10px] text-slate-400 font-semibold uppercase mt-0.5">Skor / 100</span>
                        </div>
                      ) : (
                        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-medium">
                          Menunggu Rilis Nilai
                        </div>
                      )}
                    </div>

                    {/* Breakdown Questions */}
                    <div className="space-y-4">
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                        Rincian Lembar Jawaban & Pembahasan
                      </h4>

                      {resultAttemptDetail.answers.map((ans, idx) => (
                        <div
                          key={ans.question_id}
                          className="p-4 rounded-2xl bg-[#070b14] border border-white/[0.06] space-y-2.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-indigo-300">
                              Nomor {idx + 1} ({ans.question_type === 'multiple_choice' ? 'Pilihan Ganda' : 'Essai'})
                            </span>
                            {ans.earned_points !== null && (
                              <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                Poin: {ans.earned_points} / {ans.points}
                              </span>
                            )}
                          </div>

                          <p className="text-xs text-slate-200 font-medium">{ans.question_text}</p>

                          {ans.question_type === 'multiple_choice' ? (
                            <div className="bg-white/[0.02] p-3 rounded-xl border border-white/[0.04] space-y-1.5 text-xs">
                              <div className="flex items-center gap-2">
                                <span className="text-slate-400">Pilihan Anda:</span>
                                <span className={`font-bold px-2 py-0.5 rounded ${
                                  ans.correct_answer && ans.selected_option === ans.correct_answer
                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                    : 'bg-red-500/20 text-red-300 border border-red-500/30'
                                }`}>
                                  {ans.selected_option ? `Opsi ${ans.selected_option}` : 'Tidak Dijawab'}
                                </span>
                              </div>
                              {ans.correct_answer && (
                                <div className="flex items-center gap-2">
                                  <span className="text-slate-400">Kunci Jawaban Benar:</span>
                                  <span className="font-bold text-emerald-400">Opsi {ans.correct_answer}</span>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <div className="bg-white/[0.02] p-3 rounded-xl border border-white/[0.04]">
                                <span className="text-[11px] text-slate-400 block mb-1">Jawaban Anda:</span>
                                <p className="text-xs text-slate-200 whitespace-pre-wrap">
                                  {ans.essay_answer || '(Tidak diisi)'}
                                </p>
                              </div>
                              {ans.teacher_feedback && (
                                <div className="bg-indigo-500/10 p-3 rounded-xl border border-indigo-500/20 text-xs text-indigo-300">
                                  <strong>Feedback Guru:</strong> {ans.teacher_feedback}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-white/[0.08] flex items-center justify-end bg-white/[0.02]">
                <button
                  onClick={() => setShowResultModal(false)}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition-all"
                >
                  Tutup Tinjauan
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
