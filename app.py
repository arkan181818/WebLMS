import os
import re
from functools import wraps
from datetime import datetime
from flask import (
    Flask, render_template, request, redirect, url_for,
    flash, session, send_from_directory, jsonify, abort
)
from werkzeug.utils import secure_filename
from dotenv import load_dotenv
from models import db, User, Subject, Material, MaterialProgress, Assignment, Submission
from database import init_db

# Load environment variables from .env file
load_dotenv()

app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'elearning-secret-key-super-secure-2026')

# Use DATABASE_URL from environment if available (e.g. Neon DB), otherwise fallback to local sqlite
db_uri = os.environ.get('DATABASE_URL', 'sqlite:///elearning.db')
if db_uri.startswith("postgres://"):
    db_uri = db_uri.replace("postgres://", "postgresql://", 1)
app.config['SQLALCHEMY_DATABASE_URI'] = db_uri

app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Konfigurasi Upload
UPLOAD_FOLDER = os.path.join(app.root_path, 'static', 'uploads')
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024  # Maksimal 50MB

os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def allowed_file(filename):
    """Mendukung semua format file yang memiliki ekstensi valid"""
    if not filename or '.' not in filename:
        return False
    # Tolak file tanpa nama atau executable yang berbahaya jika perlu, tetapi izinkan semua format umum tugas
    ext = filename.rsplit('.', 1)[1].lower()
    return len(ext) > 0 and ext not in {'exe', 'bat', 'sh', 'cmd', 'vbs'}


# ==========================================
# AUTH HELPERS & DECORATORS
# ==========================================

def get_current_user():
    user_id = session.get('user_id')
    if user_id:
        return db.session.get(User, user_id)
    return None

@app.context_processor
def inject_user():
    user = get_current_user()
    return dict(current_user=user, now=datetime.now())

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not session.get('user_id'):
            flash('Silakan masuk terlebih dahulu untuk mengakses halaman ini.', 'warning')
            return redirect(url_for('login', next=request.url))
        return f(*args, **kwargs)
    return decorated_function

def teacher_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        user = get_current_user()
        if not user:
            flash('Silakan masuk terlebih dahulu.', 'warning')
            return redirect(url_for('login'))
        if user.role != 'guru':
            flash('Akses ditolak! Halaman ini hanya untuk Guru / Admin.', 'danger')
            return redirect(url_for('dashboard'))
        return f(*args, **kwargs)
    return decorated_function

# ==========================================
# CUSTOM JINJA FILTERS
# ==========================================

@app.template_filter('format_content')
def format_content(text):
    """Format teks sederhana / markdown ringan menjadi HTML aman"""
    if not text:
        return ''
    import html
    # Escape HTML dasar untuk keamanan
    escaped = html.escape(text)
    
    # Header level 3
    escaped = re.sub(r'###\s*(.*?)\n', r'<h3 class="materi-h3">\1</h3>', escaped)
    # Header level 2
    escaped = re.sub(r'##\s*(.*?)\n', r'<h2 class="materi-h2">\1</h2>', escaped)
    # Bold
    escaped = re.sub(r'\*\*(.*?)\*\*', r'<strong>\1</strong>', escaped)
    # Italic
    escaped = re.sub(r'\*(.*?)\*', r'<em>\1</em>', escaped)
    # Horizontal rule
    escaped = re.sub(r'---', r'<hr class="materi-divider">', escaped)
    
    # Code block ```python ... ```
    escaped = re.sub(
        r'```(?:[a-zA-Z]*)\n([\s\S]*?)```',
        r'<pre class="code-block"><code>\1</code></pre>',
        escaped
    )
    
    # Inline code `code`
    escaped = re.sub(r'`([^`]+)`', r'<code class="inline-code">\1</code>', escaped)

    # Paragraphs & newlines
    paragraphs = escaped.split('\n\n')
    formatted = []
    for p in paragraphs:
        p = p.strip()
        if p.startswith('<h2') or p.startswith('<h3') or p.startswith('<pre') or p.startswith('<hr'):
            formatted.append(p)
        else:
            p_lines = p.replace('\n', '<br>')
            formatted.append(f'<p class="materi-p">{p_lines}</p>')

    return '\n'.join(formatted)

# ==========================================
# ROUTES
# ==========================================

@app.route('/')
def index():
    if session.get('user_id'):
        return redirect(url_for('dashboard'))
    
    # Landing page preview
    subjects = Subject.query.all()
    latest_materials = Material.query.order_by(Material.created_at.desc()).limit(6).all()
    total_materials = Material.query.count()
    total_students = User.query.filter_by(role='murid').count()
    return render_template(
        'landing.html',
        subjects=subjects,
        latest_materials=latest_materials,
        total_materials=total_materials,
        total_students=total_students
    )

# --- Autentikasi ---

@app.route('/login', methods=['GET', 'POST'])
def login():
    if session.get('user_id'):
        return redirect(url_for('dashboard'))
        
    if request.method == 'POST':
        identifier = request.form.get('identifier', '').strip()
        password = request.form.get('password', '')

        user = User.query.filter(
            (User.email == identifier) | (User.username == identifier)
        ).first()

        if user and user.check_password(password):
            session['user_id'] = user.id
            session['username'] = user.username
            session['role'] = user.role
            flash(f'Selamat datang kembali, {user.display_name}!', 'success')
            
            next_page = request.args.get('next')
            return redirect(next_page if next_page else url_for('dashboard'))
        else:
            flash('Email/Username atau password salah. Silakan coba lagi.', 'danger')

    return render_template('auth/login.html')

@app.route('/register', methods=['GET', 'POST'])
def register():
    if session.get('user_id'):
        return redirect(url_for('dashboard'))

    if request.method == 'POST':
        username = request.form.get('username', '').strip()
        email = request.form.get('email', '').strip().lower()
        full_name = request.form.get('full_name', '').strip()
        role = 'murid' # Selalu paksa murid
        password = request.form.get('password', '')
        confirm_password = request.form.get('confirm_password', '')

        # Validasi
        if not username or not email or not password:
            flash('Harap isi semua kolom yang wajib.', 'warning')
            return render_template('auth/register.html')

        if password != confirm_password:
            flash('Konfirmasi password tidak cocok.', 'danger')
            return render_template('auth/register.html')

        if len(password) < 6:
            flash('Password minimal harus terdiri dari 6 karakter.', 'danger')
            return render_template('auth/register.html')

        # Cek duplikasi
        if User.query.filter_by(username=username).first():
            flash('Username sudah digunakan, silakan pilih username lain.', 'danger')
            return render_template('auth/register.html')

        if User.query.filter_by(email=email).first():
            flash('Email sudah terdaftar, silakan gunakan email lain atau masuk.', 'danger')
            return render_template('auth/register.html')

        # Buat user baru
        new_user = User(
            username=username,
            email=email,
            full_name=full_name if full_name else username,
            role=role
        )
        new_user.set_password(password)
        db.session.add(new_user)
        db.session.commit()

        flash(f'Pendaftaran berhasil sebagai {role.upper()}! Silakan masuk.', 'success')
        return redirect(url_for('login'))

    return render_template('auth/register.html')

@app.route('/logout')
def logout():
    session.clear()
    flash('Anda telah berhasil keluar.', 'info')
    return redirect(url_for('login'))

# --- Dashboard ---

@app.route('/dashboard')
@login_required
def dashboard():
    user = get_current_user()
    
    if user.role == 'guru':
        # Statistik Guru
        total_materials = Material.query.count()
        my_materials = Material.query.filter_by(teacher_id=user.id).count()
        total_students = User.query.filter_by(role='murid').count()
        total_subjects = Subject.query.count()
        total_assignments = Assignment.query.count()
        
        # Pengumpulan tugas yang butuh dinilai
        pending_grading_count = Submission.query.filter(Submission.grade.is_(None)).count()
        
        # Materi terbaru & Tugas terbaru
        recent_materials = Material.query.order_by(Material.created_at.desc()).limit(5).all()
        recent_assignments = Assignment.query.order_by(Assignment.created_at.desc()).limit(4).all()
        
        # Aktivitas penyelesaian murid terbaru
        recent_completions = MaterialProgress.query.filter_by(is_completed=True)\
            .order_by(MaterialProgress.completed_at.desc()).limit(6).all()
        
        return render_template(
            'dashboard/guru.html',
            total_materials=total_materials,
            my_materials=my_materials,
            total_students=total_students,
            total_subjects=total_subjects,
            total_assignments=total_assignments,
            pending_grading_count=pending_grading_count,
            recent_materials=recent_materials,
            recent_assignments=recent_assignments,
            recent_completions=recent_completions
        )
    else:
        # Statistik Murid
        total_materials = Material.query.count()
        completed_count = MaterialProgress.query.filter_by(user_id=user.id, is_completed=True).count()
        progress_percentage = int((completed_count / total_materials * 100)) if total_materials > 0 else 0
        
        # Statistik Tugas Murid
        total_assignments = Assignment.query.count()
        my_submissions = Submission.query.filter_by(student_id=user.id).all()
        submitted_tasks_count = len(my_submissions)
        graded_tasks_count = len([s for s in my_submissions if s.is_graded])
        
        # Materi & Tugas terbaru
        latest_materials = Material.query.order_by(Material.created_at.desc()).limit(4).all()
        active_assignments = Assignment.query.order_by(Assignment.due_date.asc(), Assignment.created_at.desc()).limit(4).all()
        subjects = Subject.query.all()
        
        # ID materi yang sudah diselesaikan
        completed_ids = [
            p.material_id for p in MaterialProgress.query.filter_by(user_id=user.id, is_completed=True).all()
        ]
        user_submissions_map = {s.assignment_id: s for s in my_submissions}
        
        return render_template(
            'dashboard/murid.html',
            total_materials=total_materials,
            completed_count=completed_count,
            progress_percentage=progress_percentage,
            total_assignments=total_assignments,
            submitted_tasks_count=submitted_tasks_count,
            graded_tasks_count=graded_tasks_count,
            latest_materials=latest_materials,
            active_assignments=active_assignments,
            subjects=subjects,
            completed_ids=completed_ids,
            user_submissions_map=user_submissions_map
        )

# --- Katalog & Pembelajaran Materi ---

@app.route('/materi')
@login_required
def materi_list():
    user = get_current_user()
    query = request.args.get('q', '').strip()
    subject_id = request.args.get('subject_id', type=int)
    status_filter = request.args.get('status', '') # 'completed' or 'pending'

    m_query = Material.query

    if subject_id:
        m_query = m_query.filter(Material.subject_id == subject_id)

    if query:
        search = f"%{query}%"
        m_query = m_query.filter(
            (Material.title.ilike(search)) | 
            (Material.summary.ilike(search)) |
            (Material.content.ilike(search))
        )

    materials = m_query.order_by(Material.created_at.desc()).all()
    subjects = Subject.query.all()

    # Dapatkan set materi yang sudah diselesaikan oleh user saat ini
    completed_material_ids = set(
        p.material_id for p in MaterialProgress.query.filter_by(user_id=user.id, is_completed=True).all()
    )

    # Filter status selesai/belum untuk murid
    if user.role == 'murid' and status_filter:
        if status_filter == 'completed':
            materials = [m for m in materials if m.id in completed_material_ids]
        elif status_filter == 'pending':
            materials = [m for m in materials if m.id not in completed_material_ids]

    return render_template(
        'materi/index.html',
        materials=materials,
        subjects=subjects,
        selected_subject=subject_id,
        search_query=query,
        status_filter=status_filter,
        completed_material_ids=completed_material_ids
    )

@app.route('/materi/<int:id>')
@login_required
def materi_detail(id):
    material = Material.query.get_or_404(id)
    user = get_current_user()
    
    # Cek atau buat record progress untuk murid
    progress = None
    if user.role == 'murid':
        progress = MaterialProgress.query.filter_by(user_id=user.id, material_id=material.id).first()
        if not progress:
            progress = MaterialProgress(user_id=user.id, material_id=material.id, is_completed=False)
            db.session.add(progress)
            db.session.commit()
        else:
            progress.last_accessed = datetime.now()
            db.session.commit()

    # Materi terkait dari mata pelajaran yang sama
    related_materials = Material.query.filter(
        Material.subject_id == material.subject_id,
        Material.id != material.id
    ).limit(3).all()

    youtube_embed_url = material.get_youtube_embed_url()

    return render_template(
        'materi/detail.html',
        material=material,
        progress=progress,
        related_materials=related_materials,
        youtube_embed_url=youtube_embed_url
    )

@app.route('/materi/<int:id>/toggle-complete', methods=['POST'])
@login_required
def toggle_material_complete(id):
    user = get_current_user()
    material = Material.query.get_or_404(id)
    
    progress = MaterialProgress.query.filter_by(user_id=user.id, material_id=material.id).first()
    if not progress:
        progress = MaterialProgress(user_id=user.id, material_id=material.id, is_completed=True, completed_at=datetime.now())
        db.session.add(progress)
    else:
        progress.is_completed = not progress.is_completed
        progress.completed_at = datetime.now() if progress.is_completed else None
    
    db.session.commit()
    
    if request.headers.get('X-Requested-With') == 'XMLHttpRequest' or request.is_json:
        return jsonify({
            'success': True,
            'is_completed': progress.is_completed,
            'message': 'Materi ditandai selesai!' if progress.is_completed else 'Status materi direset ke belum selesai.'
        })

    flash('Status penyelesaian materi berhasil diperbarui.', 'success')
    return redirect(url_for('materi_detail', id=material.id))

# --- Manajemen Materi (Khusus Guru / Admin) ---

@app.route('/materi/manage')
@teacher_required
def manage_materi():
    user = get_current_user()
    materials = Material.query.order_by(Material.created_at.desc()).all()
    subjects = Subject.query.all()
    
    # Hitung jumlah siswa yang telah menyelesaikan setiap materi
    completion_counts = {}
    for m in materials:
        cnt = MaterialProgress.query.filter_by(material_id=m.id, is_completed=True).count()
        completion_counts[m.id] = cnt
        
    return render_template(
        'materi/manage.html',
        materials=materials,
        subjects=subjects,
        completion_counts=completion_counts
    )

@app.route('/materi/tambah', methods=['GET', 'POST'])
@teacher_required
def tambah_materi():
    user = get_current_user()
    subjects = Subject.query.all()

    if not subjects:
        flash('Silakan buat minimal satu Mata Pelajaran terlebih dahulu sebelum menambahkan materi.', 'warning')
        return redirect(url_for('manage_subjects'))

    if request.method == 'POST':
        title = request.form.get('title', '').strip()
        summary = request.form.get('summary', '').strip()
        content = request.form.get('content', '').strip()
        subject_id = request.form.get('subject_id', type=int)
        video_url = request.form.get('video_url', '').strip()

        if not title or not content or not subject_id:
            flash('Judul, Mata Pelajaran, dan Konten Materi wajib diisi!', 'danger')
            return render_template('materi/form.html', subjects=subjects, mode='create')

        # Handle File Upload
        saved_filename = None
        original_filename = None
        
        file = request.files.get('attachment')
        if file and file.filename != '':
            if allowed_file(file.filename):
                original_filename = file.filename
                # Generate unique filename timestamp
                ext = file.filename.rsplit('.', 1)[1].lower()
                clean_name = secure_filename(file.filename.rsplit('.', 1)[0])
                saved_filename = f"{int(datetime.now().timestamp())}_{clean_name}.{ext}"
                file.save(os.path.join(app.config['UPLOAD_FOLDER'], saved_filename))
            else:
                flash('Format file tidak didukung. Gunakan PDF, Dokumen Office, Gambar, atau ZIP.', 'danger')
                return render_template('materi/form.html', subjects=subjects, mode='create')

        new_material = Material(
            title=title,
            summary=summary,
            content=content,
            subject_id=subject_id,
            teacher_id=user.id,
            video_url=video_url if video_url else None,
            attachment_filename=saved_filename,
            attachment_original_name=original_filename
        )
        db.session.add(new_material)
        db.session.commit()

        flash(f'Materi "{title}" berhasil dipublikasikan!', 'success')
        return redirect(url_for('materi_detail', id=new_material.id))

    return render_template('materi/form.html', subjects=subjects, mode='create')

@app.route('/materi/<int:id>/edit', methods=['GET', 'POST'])
@teacher_required
def edit_materi(id):
    material = Material.query.get_or_404(id)
    subjects = Subject.query.all()

    if request.method == 'POST':
        title = request.form.get('title', '').strip()
        summary = request.form.get('summary', '').strip()
        content = request.form.get('content', '').strip()
        subject_id = request.form.get('subject_id', type=int)
        video_url = request.form.get('video_url', '').strip()
        delete_attachment = request.form.get('delete_attachment') == '1'

        if not title or not content or not subject_id:
            flash('Judul, Mata Pelajaran, dan Konten Materi wajib diisi!', 'danger')
            return render_template('materi/form.html', material=material, subjects=subjects, mode='edit')

        # Handle file removal
        if delete_attachment and material.attachment_filename:
            old_file_path = os.path.join(app.config['UPLOAD_FOLDER'], material.attachment_filename)
            if os.path.exists(old_file_path):
                try:
                    os.remove(old_file_path)
                except Exception:
                    pass
            material.attachment_filename = None
            material.attachment_original_name = None

        # Handle new File Upload
        file = request.files.get('attachment')
        if file and file.filename != '':
            if allowed_file(file.filename):
                # Remove old file if exists
                if material.attachment_filename:
                    old_file_path = os.path.join(app.config['UPLOAD_FOLDER'], material.attachment_filename)
                    if os.path.exists(old_file_path):
                        try:
                            os.remove(old_file_path)
                        except Exception:
                            pass
                
                ext = file.filename.rsplit('.', 1)[1].lower()
                clean_name = secure_filename(file.filename.rsplit('.', 1)[0])
                saved_filename = f"{int(datetime.now().timestamp())}_{clean_name}.{ext}"
                file.save(os.path.join(app.config['UPLOAD_FOLDER'], saved_filename))
                
                material.attachment_filename = saved_filename
                material.attachment_original_name = file.filename
            else:
                flash('Format file tidak didukung. Gunakan PDF, Dokumen Office, Gambar, atau ZIP.', 'danger')
                return render_template('materi/form.html', material=material, subjects=subjects, mode='edit')

        material.title = title
        material.summary = summary
        material.content = content
        material.subject_id = subject_id
        material.video_url = video_url if video_url else None
        
        db.session.commit()
        flash(f'Materi "{title}" berhasil diperbarui!', 'success')
        return redirect(url_for('materi_detail', id=material.id))

    return render_template('materi/form.html', material=material, subjects=subjects, mode='edit')

@app.route('/materi/<int:id>/hapus', methods=['POST'])
@teacher_required
def hapus_materi(id):
    material = Material.query.get_or_404(id)
    title = material.title
    
    # Hapus file attachment fisik jika ada
    if material.attachment_filename:
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], material.attachment_filename)
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
            except Exception:
                pass

    db.session.delete(material)
    db.session.commit()
    flash(f'Materi "{title}" berhasil dihapus.', 'success')
    return redirect(url_for('manage_materi'))

# --- Manajemen Mata Pelajaran (Kategori) ---

@app.route('/mata-pelajaran', methods=['GET', 'POST'])
@teacher_required
def manage_subjects():
    if request.method == 'POST':
        name = request.form.get('name', '').strip()
        code = request.form.get('code', '').strip().upper()
        description = request.form.get('description', '').strip()
        color = request.form.get('color', 'indigo').strip()
        icon = request.form.get('icon', 'book-open').strip()

        if not name:
            flash('Nama mata pelajaran tidak boleh kosong!', 'danger')
        elif Subject.query.filter_by(name=name).first():
            flash('Mata pelajaran dengan nama tersebut sudah ada.', 'warning')
        else:
            subject = Subject(name=name, code=code, description=description, color=color, icon=icon)
            db.session.add(subject)
            db.session.commit()
            flash(f'Mata pelajaran "{name}" berhasil ditambahkan!', 'success')
            return redirect(url_for('manage_subjects'))

    subjects = Subject.query.all()
    # Hitung jumlah materi per subject
    subject_stats = []
    for s in subjects:
        cnt = Material.query.filter_by(subject_id=s.id).count()
        subject_stats.append({'subject': s, 'material_count': cnt})

    return render_template('subjects/index.html', subject_stats=subject_stats)

@app.route('/mata-pelajaran/<int:id>/hapus', methods=['POST'])
@teacher_required
def hapus_subject(id):
    subject = Subject.query.get_or_404(id)
    name = subject.name
    db.session.delete(subject)
    db.session.commit()
    flash(f'Mata pelajaran "{name}" beserta materi di dalamnya telah dihapus.', 'success')
    return redirect(url_for('manage_subjects'))

# --- Pemantauan Murid (Khusus Guru) ---

@app.route('/murid-list')
@teacher_required
def list_murid():
    students = User.query.filter_by(role='murid').order_by(User.created_at.desc()).all()
    total_materials = Material.query.count()

    student_data = []
    for s in students:
        completed = MaterialProgress.query.filter_by(user_id=s.id, is_completed=True).count()
        percentage = int((completed / total_materials * 100)) if total_materials > 0 else 0
        last_act = MaterialProgress.query.filter_by(user_id=s.id).order_by(MaterialProgress.last_accessed.desc()).first()
        student_data.append({
            'user': s,
            'completed_count': completed,
            'percentage': percentage,
            'last_active': last_act.last_accessed if last_act else None
        })

    return render_template('dashboard/murid_list.html', student_data=student_data, total_materials=total_materials)

# --- Progres Belajar Pribadi (Murid) ---

@app.route('/progres-saya')
@login_required
def my_progress():
    user = get_current_user()
    if user.role == 'guru':
        return redirect(url_for('dashboard'))

    total_materials = Material.query.count()
    completed_entries = MaterialProgress.query.filter_by(user_id=user.id, is_completed=True)\
        .order_by(MaterialProgress.completed_at.desc()).all()
    
    completed_count = len(completed_entries)
    percentage = int((completed_count / total_materials * 100)) if total_materials > 0 else 0

    # Daftar materi yang belum selesai
    completed_ids = [e.material_id for e in completed_entries]
    pending_materials = Material.query.filter(~Material.id.in_(completed_ids) if completed_ids else True).all()

    return render_template(
        'dashboard/my_progress.html',
        completed_entries=completed_entries,
        pending_materials=pending_materials,
        completed_count=completed_count,
        total_materials=total_materials,
        percentage=percentage
    )

# ==========================================
# FITUR TUGAS & PENGUMPULAN TUGAS (ASSIGNMENT & SUBMISSION)
# ==========================================

@app.route('/tugas')
@login_required
def tugas_list():
    user = get_current_user()
    if user.is_teacher:
        return redirect(url_for('manage_tugas'))

    subject_id = request.args.get('subject_id', type=int)
    status_filter = request.args.get('status', '')  # 'pending', 'submitted', 'graded'

    a_query = Assignment.query
    if subject_id:
        a_query = a_query.filter(Assignment.subject_id == subject_id)

    assignments = a_query.order_by(Assignment.due_date.asc(), Assignment.created_at.desc()).all()
    subjects = Subject.query.all()

    # Kumpulkan data status tugas murid
    user_submissions = {
        s.assignment_id: s for s in Submission.query.filter_by(student_id=user.id).all()
    }

    filtered_assignments = []
    for a in assignments:
        sub = user_submissions.get(a.id)
        if status_filter == 'submitted' and not sub:
            continue
        elif status_filter == 'pending' and sub:
            continue
        elif status_filter == 'graded' and (not sub or not sub.is_graded):
            continue
        filtered_assignments.append(a)

    return render_template(
        'tugas/index.html',
        assignments=filtered_assignments,
        subjects=subjects,
        selected_subject=subject_id,
        status_filter=status_filter,
        user_submissions=user_submissions
    )

@app.route('/tugas/manage')
@teacher_required
def manage_tugas():
    user = get_current_user()
    assignments = Assignment.query.order_by(Assignment.created_at.desc()).all()
    subjects = Subject.query.all()

    # Hitung statistik pengumpulan
    assignment_stats = []
    total_students = User.query.filter_by(role='murid').count()

    for a in assignments:
        sub_count = Submission.query.filter_by(assignment_id=a.id).count()
        graded_count = Submission.query.filter(Submission.assignment_id == a.id, Submission.grade.isnot(None)).count()
        assignment_stats.append({
            'assignment': a,
            'submission_count': sub_count,
            'graded_count': graded_count,
            'total_students': total_students,
            'pending_review': sub_count - graded_count
        })

    return render_template(
        'tugas/manage.html',
        assignment_stats=assignment_stats,
        subjects=subjects
    )

@app.route('/tugas/tambah', methods=['GET', 'POST'])
@teacher_required
def tambah_tugas():
    user = get_current_user()
    subjects = Subject.query.all()

    if not subjects:
        flash('Silakan buat minimal satu Mata Pelajaran terlebih dahulu.', 'warning')
        return redirect(url_for('manage_subjects'))

    if request.method == 'POST':
        title = request.form.get('title', '').strip()
        subject_id = request.form.get('subject_id', type=int)
        description = request.form.get('description', '').strip()
        due_date_str = request.form.get('due_date', '').strip()

        if not title or not description or not subject_id:
            flash('Judul tugas, mata pelajaran, dan instruksi wajib diisi!', 'danger')
            return render_template('tugas/form.html', subjects=subjects, mode='create')

        due_date = None
        if due_date_str:
            try:
                due_date = datetime.strptime(due_date_str, '%Y-%m-%dT%H:%M')
            except ValueError:
                try:
                    due_date = datetime.strptime(due_date_str, '%Y-%m-%d')
                except ValueError:
                    due_date = None

        # Handle lampiran berkas soal dari guru (Format semua file didukung)
        saved_filename = None
        original_filename = None
        file = request.files.get('attachment')
        if file and file.filename != '':
            if allowed_file(file.filename):
                original_filename = file.filename
                ext = file.filename.rsplit('.', 1)[1].lower()
                clean_name = secure_filename(file.filename.rsplit('.', 1)[0]) or 'soal'
                saved_filename = f"tugas_{int(datetime.now().timestamp())}_{clean_name}.{ext}"
                file.save(os.path.join(app.config['UPLOAD_FOLDER'], saved_filename))
            else:
                flash('Format file tidak valid.', 'danger')
                return render_template('tugas/form.html', subjects=subjects, mode='create')

        new_assignment = Assignment(
            title=title,
            description=description,
            subject_id=subject_id,
            teacher_id=user.id,
            due_date=due_date,
            attachment_filename=saved_filename,
            attachment_original_name=original_filename
        )
        db.session.add(new_assignment)
        db.session.commit()

        flash(f'Tugas "{title}" berhasil diterbitkan!', 'success')
        return redirect(url_for('tugas_detail', id=new_assignment.id))

    return render_template('tugas/form.html', subjects=subjects, mode='create')

@app.route('/tugas/<int:id>')
@login_required
def tugas_detail(id):
    assignment = Assignment.query.get_or_404(id)
    user = get_current_user()

    if user.is_teacher:
        # Tampilan Guru: Detail tugas + daftar pengumpulan semua murid
        submissions = Submission.query.filter_by(assignment_id=assignment.id).order_by(Submission.submitted_at.desc()).all()
        return render_template('tugas/detail_guru.html', assignment=assignment, submissions=submissions)
    else:
        # Tampilan Murid: Detail instruksi + form pengumpulan / status tugas murid
        submission = Submission.query.filter_by(assignment_id=assignment.id, student_id=user.id).first()
        return render_template('tugas/detail_murid.html', assignment=assignment, submission=submission)

@app.route('/tugas/<int:id>/edit', methods=['GET', 'POST'])
@teacher_required
def edit_tugas(id):
    assignment = Assignment.query.get_or_404(id)
    subjects = Subject.query.all()

    if request.method == 'POST':
        title = request.form.get('title', '').strip()
        subject_id = request.form.get('subject_id', type=int)
        description = request.form.get('description', '').strip()
        due_date_str = request.form.get('due_date', '').strip()
        delete_attachment = request.form.get('delete_attachment') == '1'

        if not title or not description or not subject_id:
            flash('Judul tugas, mata pelajaran, dan instruksi wajib diisi!', 'danger')
            return render_template('tugas/form.html', assignment=assignment, subjects=subjects, mode='edit')

        if due_date_str:
            try:
                assignment.due_date = datetime.strptime(due_date_str, '%Y-%m-%dT%H:%M')
            except ValueError:
                try:
                    assignment.due_date = datetime.strptime(due_date_str, '%Y-%m-%d')
                except ValueError:
                    pass
        else:
            assignment.due_date = None

        if delete_attachment and assignment.attachment_filename:
            old_file_path = os.path.join(app.config['UPLOAD_FOLDER'], assignment.attachment_filename)
            if os.path.exists(old_file_path):
                try:
                    os.remove(old_file_path)
                except Exception:
                    pass
            assignment.attachment_filename = None
            assignment.attachment_original_name = None

        file = request.files.get('attachment')
        if file and file.filename != '':
            if allowed_file(file.filename):
                if assignment.attachment_filename:
                    old_file_path = os.path.join(app.config['UPLOAD_FOLDER'], assignment.attachment_filename)
                    if os.path.exists(old_file_path):
                        try:
                            os.remove(old_file_path)
                        except Exception:
                            pass
                ext = file.filename.rsplit('.', 1)[1].lower()
                clean_name = secure_filename(file.filename.rsplit('.', 1)[0]) or 'soal'
                saved_filename = f"tugas_{int(datetime.now().timestamp())}_{clean_name}.{ext}"
                file.save(os.path.join(app.config['UPLOAD_FOLDER'], saved_filename))
                assignment.attachment_filename = saved_filename
                assignment.attachment_original_name = file.filename

        assignment.title = title
        assignment.description = description
        assignment.subject_id = subject_id
        db.session.commit()

        flash(f'Tugas "{title}" berhasil diperbarui!', 'success')
        return redirect(url_for('tugas_detail', id=assignment.id))

    return render_template('tugas/form.html', assignment=assignment, subjects=subjects, mode='edit')

@app.route('/tugas/<int:id>/hapus', methods=['POST'])
@teacher_required
def hapus_tugas(id):
    assignment = Assignment.query.get_or_404(id)
    title = assignment.title

    if assignment.attachment_filename:
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], assignment.attachment_filename)
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
            except Exception:
                pass

    # Hapus file submission terkait
    for sub in assignment.submissions:
        if sub.file_filename:
            sub_path = os.path.join(app.config['UPLOAD_FOLDER'], sub.file_filename)
            if os.path.exists(sub_path):
                try:
                    os.remove(sub_path)
                except Exception:
                    pass

    db.session.delete(assignment)
    db.session.commit()
    flash(f'Tugas "{title}" beserta semua pengumpulan siswa berhasil dihapus.', 'success')
    return redirect(url_for('manage_tugas'))

# --- Pengumpulan Tugas oleh Murid (Semua Format File Didukung) ---

@app.route('/tugas/<int:id>/kumpul', methods=['POST'])
@login_required
def kumpul_tugas(id):
    user = get_current_user()
    if user.role != 'murid':
        flash('Hanya akun murid yang dapat mengumpulkan tugas.', 'warning')
        return redirect(url_for('tugas_detail', id=id))

    assignment = Assignment.query.get_or_404(id)
    note = request.form.get('note', '').strip()
    file = request.files.get('submission_file')

    existing_sub = Submission.query.filter_by(assignment_id=assignment.id, student_id=user.id).first()

    if not file or file.filename == '':
        if not existing_sub:
            flash('Harap pilih file berkas tugas untuk dikumpulkan!', 'danger')
            return redirect(url_for('tugas_detail', id=id))
        else:
            # Update hanya catatan
            existing_sub.note = note
            db.session.commit()
            flash('Catatan tugas berhasil diperbarui.', 'success')
            return redirect(url_for('tugas_detail', id=id))

    if not allowed_file(file.filename):
        flash('Format file tidak valid atau ekstensi berbahaya.', 'danger')
        return redirect(url_for('tugas_detail', id=id))

    # Simpan file dengan nama unik
    ext = file.filename.rsplit('.', 1)[1].lower() if '.' in file.filename else 'dat'
    clean_name = secure_filename(file.filename.rsplit('.', 1)[0]) or 'jawaban'
    saved_filename = f"sub_{assignment.id}_{user.id}_{int(datetime.now().timestamp())}_{clean_name}.{ext}"
    
    # Hapus file lama jika re-upload
    if existing_sub and existing_sub.file_filename:
        old_path = os.path.join(app.config['UPLOAD_FOLDER'], existing_sub.file_filename)
        if os.path.exists(old_path):
            try:
                os.remove(old_path)
            except Exception:
                pass

    file.save(os.path.join(app.config['UPLOAD_FOLDER'], saved_filename))

    if existing_sub:
        existing_sub.file_filename = saved_filename
        existing_sub.file_original_name = file.filename
        existing_sub.note = note
        existing_sub.submitted_at = datetime.now()
        # Reset nilai jika siswa mengunggah ulang tugas
        existing_sub.grade = None
        existing_sub.feedback = None
        existing_sub.graded_at = None
    else:
        new_sub = Submission(
            assignment_id=assignment.id,
            student_id=user.id,
            file_filename=saved_filename,
            file_original_name=file.filename,
            note=note,
            submitted_at=datetime.now()
        )
        db.session.add(new_sub)

    db.session.commit()
    flash('Tugas berhasil dikumpulkan! Guru akan segera memeriksa dan memberikan nilai.', 'success')
    return redirect(url_for('tugas_detail', id=id))

# --- Penilaian Tugas oleh Guru (Admin) ---

@app.route('/submission/<int:sub_id>/grade', methods=['POST'])
@teacher_required
def grade_submission(sub_id):
    submission = Submission.query.get_or_404(sub_id)
    grade = request.form.get('grade', type=int)
    feedback = request.form.get('feedback', '').strip()

    if grade is None or grade < 0 or grade > 100:
        flash('Nilai harus berupa angka antara 0 hingga 100.', 'danger')
        return redirect(url_for('tugas_detail', id=submission.assignment_id))

    submission.grade = grade
    submission.feedback = feedback if feedback else None
    submission.graded_at = datetime.now()
    db.session.commit()

    flash(f'Penilaian untuk {submission.student.display_name} berhasil disimpan (Nilai: {grade}).', 'success')
    return redirect(url_for('tugas_detail', id=submission.assignment_id))

# --- Unduh Lampiran ---

@app.route('/uploads/<path:filename>')
@login_required
def download_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename, as_attachment=True)

# ==========================================
# APP INITIALIZATION
# ==========================================

init_db(app)

if __name__ == '__main__':
    app.run(debug=True, port=5000)

