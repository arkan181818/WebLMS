import os
import re
import jwt
from functools import wraps
from datetime import datetime, timedelta, timezone
from flask import Flask, request, jsonify, send_from_directory, abort
from werkzeug.utils import secure_filename
from dotenv import load_dotenv
from flask_cors import CORS
from models import db, User, Subject, Material, MaterialProgress, MaterialAttachment, Assignment, Submission, Message, Quiz, QuizQuestion, QuizAttempt, QuizAnswer
from database import init_db

load_dotenv()

app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'elearning-secret-key-super-secure-2026')

db_uri = os.environ.get('DATABASE_URL', 'sqlite:///elearning.db').strip()
if db_uri.startswith("postgres://"):
    db_uri = db_uri.replace("postgres://", "postgresql://", 1)
app.config['SQLALCHEMY_DATABASE_URI'] = db_uri
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
# Agar koneksi ke Neon (serverless PostgreSQL) tidak mati saat auto-suspend
# connect_args hanya untuk PostgreSQL (psycopg2), tidak perlu connect_timeout di sini
_is_postgres = not db_uri.startswith('sqlite')
app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
    'pool_pre_ping': True,      # cek koneksi sebelum dipakai
    'pool_recycle': 300,        # recycle koneksi setiap 5 menit
    **({'connect_args': {'connect_timeout': 10}} if _is_postgres else {}),
}

CORS(app, resources={r"/*": {
    "origins": "*",
    "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    "allow_headers": ["Content-Type", "Authorization", "X-Requested-With", "Accept"],
    "expose_headers": ["Content-Type", "Authorization"]
}})



UPLOAD_FOLDER = os.path.join(app.root_path, 'static', 'uploads')
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

JWT_EXPIRATION_HOURS = 24 * 7  # 7 days

def allowed_file(filename):
    if not filename or '.' not in filename:
        return False
    ext = filename.rsplit('.', 1)[1].lower()
    return len(ext) > 0 and ext not in {'exe', 'bat', 'sh', 'cmd', 'vbs'}

# ==========================================
# JWT AUTH HELPERS
# ==========================================
def generate_token(user):
    """Generate a JWT token for the given user."""
    payload = {
        'user_id': user.id,
        'username': user.username,
        'role': user.role,
        'exp': datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS),
        'iat': datetime.now(timezone.utc)
    }
    return jwt.encode(payload, app.config['SECRET_KEY'], algorithm='HS256')

def get_current_user():
    """Extract and validate JWT token from Authorization header."""
    auth_header = request.headers.get('Authorization', '')
    if not auth_header.startswith('Bearer '):
        return None
    token = auth_header[7:]  # Remove 'Bearer ' prefix
    try:
        payload = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
        user = db.session.get(User, payload['user_id'])
        return user
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if request.method == 'OPTIONS':
            return f(*args, **kwargs)
        user = get_current_user()
        if not user:
            return jsonify({'error': 'Unauthorized', 'message': 'Silakan masuk terlebih dahulu.'}), 401
        return f(*args, **kwargs)
    return decorated_function

def teacher_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if request.method == 'OPTIONS':
            return f(*args, **kwargs)
        user = get_current_user()
        if not user:
            return jsonify({'error': 'Unauthorized', 'message': 'Silakan masuk terlebih dahulu.'}), 401
        if user.role != 'guru':
            return jsonify({'error': 'Forbidden', 'message': 'Akses ditolak! Halaman ini hanya untuk Guru / Admin.'}), 403
        return f(*args, **kwargs)
    return decorated_function

# ==========================================
# API ROUTES
# ==========================================

@app.route('/api/me', methods=['GET'])
def get_me():
    user = get_current_user()
    if user:
        return jsonify({
            'authenticated': True,
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'full_name': user.full_name,
                'campus': user.campus or user.username,
                'department': user.department,
                'semester': user.semester,
                'role': user.role,
                'display_name': user.display_name
            }
        })
    return jsonify({'authenticated': False})

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    identifier = data.get('identifier', '').strip()
    password = data.get('password', '')

    # Coba query dengan email (case-insensitive) ATAU username
    identifier_lower = identifier.lower()
    user = User.query.filter(
        (db.func.lower(User.email) == identifier_lower) | (User.username == identifier)
    ).first()
    if user and user.check_password(password):
        if not user.is_approved:
            return jsonify({'success': False, 'message': 'Akun Anda sedang menunggu persetujuan dari Guru/Admin.'}), 403

        token = generate_token(user)
        return jsonify({
            'success': True,
            'message': f'Selamat datang kembali, {user.display_name}!',
            'token': token,
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'full_name': user.full_name,
                'campus': user.campus or user.username,
                'department': user.department,
                'semester': user.semester,
                'role': user.role,
                'display_name': user.display_name,
                'name': user.display_name
            }
        })
    return jsonify({'success': False, 'message': 'Email/Username atau password salah.'}), 401

@app.route('/api/profile/update', methods=['POST'])
@login_required
def update_profile():
    user = get_current_user()
    data = request.json
    full_name = data.get('full_name', '').strip()
    username = data.get('username', '').strip()
    campus = data.get('campus', '').strip()
    department = data.get('department', '').strip()
    semester = data.get('semester', '').strip()

    if username and username != user.username:
        if User.query.filter(User.username == username, User.id != user.id).first():
            return jsonify({'success': False, 'message': 'Username sudah digunakan oleh akun lain.'}), 400
        user.username = username

    if full_name:
        user.full_name = full_name
    if campus:
        user.campus = campus
    if department is not None:
        user.department = department
    if semester is not None:
        user.semester = semester

    db.session.commit()
    return jsonify({
        'success': True,
        'message': 'Profil berhasil diperbarui!',
        'user': {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'full_name': user.full_name,
            'campus': user.campus or user.username,
            'department': user.department,
            'semester': user.semester,
            'role': user.role,
            'display_name': user.display_name,
            'name': user.display_name
        }
    })

@app.route('/api/register', methods=['POST'])
def register():
    try:
        data = request.json or {}
        campus = data.get('campus', '').strip() or data.get('username', '').strip()
        raw_username = data.get('username', '').strip() or campus
        email = data.get('email', '').strip().lower()
        full_name = data.get('full_name', '').strip()
        department = data.get('department', '').strip()
        semester = data.get('semester', '').strip()
        password = data.get('password', '')
        confirm_password = data.get('confirm_password', '')
        role = data.get('role', 'murid')
        if role not in ['murid', 'guru']:
            role = 'murid'

        if not campus or not email or not password:
            return jsonify({'success': False, 'message': 'Harap isi semua kolom yang wajib.'}), 400
        if password != confirm_password:
            return jsonify({'success': False, 'message': 'Konfirmasi password tidak cocok.'}), 400
        if len(password) < 6:
            return jsonify({'success': False, 'message': 'Password minimal harus terdiri dari 6 karakter.'}), 400

        if User.query.filter_by(email=email).first():
            return jsonify({'success': False, 'message': 'Email sudah terdaftar. Silakan gunakan email lain.'}), 400

        base_username = email.split('@')[0] if email else (raw_username or 'user')
        clean_username = re.sub(r'[^a-zA-Z0-9_]', '_', base_username)[:50]
        final_username = clean_username
        counter = 1
        while User.query.filter_by(username=final_username).first():
            final_username = f"{clean_username}_{counter}"
            counter += 1

        new_user = User(
            username=final_username,
            email=email,
            full_name=full_name if full_name else campus,
            campus=campus,
            department=department,
            semester=semester,
            role=role,
            is_approved=False
        )
        new_user.set_password(password)
        db.session.add(new_user)
        db.session.commit()
        msg = 'Pendaftaran berhasil! Akun Anda sedang menunggu persetujuan dari Admin/Guru.'
        return jsonify({'success': True, 'message': msg})
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': f'Gagal mendaftar: {str(e)}'}), 500

@app.route('/api/logout', methods=['POST'])
def logout():
    # With JWT, logout is handled client-side by removing the token
    return jsonify({'success': True, 'message': 'Anda telah berhasil keluar.'})

@app.route('/api/users/students', methods=['GET'])
@login_required
def get_students():
    user = get_current_user()
    if user.role != 'guru':
        return jsonify({'error': 'Forbidden'}), 403
    
    students = User.query.filter_by(role='murid', is_approved=True).all()
    return jsonify([{
        'id': s.id,
        'full_name': s.full_name,
        'email': s.email
    } for s in students])

@app.route('/api/users/pending', methods=['GET'])
@login_required
def get_pending_users():
    user = get_current_user()
    if user.role != 'guru':
        return jsonify({'error': 'Forbidden'}), 403
    
    pending_users = User.query.filter_by(is_approved=False).order_by(User.created_at.desc()).all()
    return jsonify([{
        'id': u.id,
        'username': u.username,
        'email': u.email,
        'full_name': u.full_name,
        'role': u.role,
        'created_at': u.created_at.isoformat()
    } for u in pending_users])

@app.route('/api/users/<int:student_id>/approve', methods=['POST'])
@login_required
def approve_user(student_id):
    user = get_current_user()
    if user.role != 'guru':
        return jsonify({'error': 'Forbidden'}), 403
        
    student = User.query.get(student_id)
    if not student:
        return jsonify({'error': 'Not Found'}), 404
        
    student.is_approved = True
    db.session.commit()
    return jsonify({'success': True, 'message': 'Akun berhasil disetujui.'})

@app.route('/api/users/<int:student_id>/reject', methods=['POST'])
@login_required
def reject_user(student_id):
    user = get_current_user()
    if user.role != 'guru':
        return jsonify({'error': 'Forbidden'}), 403
        
    student = User.query.get(student_id)
    if not student:
        return jsonify({'error': 'Not Found'}), 404
        
    db.session.delete(student)
    db.session.commit()
    return jsonify({'success': True, 'message': 'Pendaftaran ditolak dan akun dihapus.'})

@app.route('/api/dashboard', methods=['GET'])
@login_required
def dashboard():
    user = get_current_user()
    if user.role == 'guru':
        total_materials = Material.query.count()
        total_students = User.query.filter_by(role='murid').count()
        total_subjects = Subject.query.count()
        total_assignments = Assignment.query.count()
        recent_materials = Material.query.order_by(Material.created_at.desc()).limit(5).all()
        return jsonify({
            'role': 'guru',
            'stats': {
                'total_materials': total_materials,
                'total_students': total_students,
                'total_subjects': total_subjects,
                'total_assignments': total_assignments
            },
            'recent_materials': [{'id': m.id, 'title': m.title} for m in recent_materials]
        })
    else:
        total_materials = Material.query.count()
        completed_count = MaterialProgress.query.filter_by(user_id=user.id, is_completed=True).count()
        progress_percentage = int((completed_count / total_materials * 100)) if total_materials > 0 else 0
        latest_materials = Material.query.order_by(Material.created_at.desc()).limit(4).all()
        return jsonify({
            'role': 'murid',
            'stats': {
                'total_materials': total_materials,
                'completed_count': completed_count,
                'progress_percentage': progress_percentage
            },
            'latest_materials': [{'id': m.id, 'title': m.title, 'summary': m.summary} for m in latest_materials]
        })

@app.route('/api/subjects', methods=['GET'])
def get_subjects():
    subjects = Subject.query.all()
    return jsonify([{'id': s.id, 'name': s.name, 'code': s.code, 'description': s.description, 'color': s.color, 'icon': s.icon} for s in subjects])

@app.route('/api/materials', methods=['GET'])
@login_required
def get_materials():
    user = get_current_user()
    if user.role == 'guru':
        materials = Material.query.order_by(Material.created_at.desc()).all()
    else:
        # Murid hanya melihat materi yang tidak memiliki target (global) ATAU yang ditargetkan spesifik untuk mereka
        materials = Material.query.filter(
            (Material.target_student_id == None) | (Material.target_student_id == user.id)
        ).order_by(Material.created_at.desc()).all()

    completed_ids = set(p.material_id for p in MaterialProgress.query.filter_by(user_id=user.id, is_completed=True).all())
    
    data = []
    for m in materials:
        data.append({
            'id': m.id,
            'title': m.title,
            'summary': m.summary,
            'subject_id': m.subject_id,
            'subject_name': m.subject.name if m.subject else '',
            'is_completed': m.id in completed_ids,
            'created_at': m.created_at.isoformat()
        })
    return jsonify(data)

@app.route('/api/materials/<int:id>', methods=['GET'])
@login_required
def get_material_detail(id):
    material = Material.query.get_or_404(id)
    user = get_current_user()
    
    progress = None
    if user.role == 'murid':
        progress = MaterialProgress.query.filter_by(user_id=user.id, material_id=material.id).first()
        if not progress:
            progress = MaterialProgress(user_id=user.id, material_id=material.id, is_completed=False)
            db.session.add(progress)
        progress.last_accessed = datetime.now()
        db.session.commit()

    base_url = os.environ.get('VITE_API_URL', '')

    def att_data(att):
        url = f"{base_url}/uploads/{att.filename}"
        return {
            'id': att.id,
            'name': att.original_name,
            'url': url,
            'size': att.file_size
        }

    # Kumpulkan semua lampiran: dari tabel baru + kolom lama (backward-compat)
    attachments = [att_data(a) for a in material.attachments]
    if not attachments and material.attachment_filename:
        attachments = [{
            'id': None,
            'name': material.attachment_original_name or material.attachment_filename,
            'url': f"{base_url}/uploads/{material.attachment_filename}",
            'size': None
        }]

    return jsonify({
        'id': material.id,
        'title': material.title,
        'content': material.content,
        'video_url': material.get_youtube_embed_url(),
        'subject_name': material.subject.name if material.subject else '',
        'is_completed': progress.is_completed if progress else False,
        'attachments': attachments,
        # Backward-compat (single)
        'attachment': material.attachment_original_name if material.attachment_filename else None,
        'attachment_url': f"{base_url}/uploads/{material.attachment_filename}" if material.attachment_filename else None
    })

@app.route('/uploads/<path:filename>', methods=['GET'])
def serve_upload_file(filename):
    return send_from_directory(os.path.join(app.root_path, 'uploads'), filename)

def get_or_create_subject(subject_input):
    if not subject_input:
        return None
    # Jika dikirim ID numerik
    if isinstance(subject_input, int) or (isinstance(subject_input, str) and subject_input.isdigit()):
        subj = db.session.get(Subject, int(subject_input))
        if subj:
            return subj
    name = str(subject_input).strip()
    if not name:
        return None
    subj = Subject.query.filter(db.func.lower(Subject.name) == db.func.lower(name)).first()
    if not subj:
        code = re.sub(r'[^A-Z0-9]', '', name.upper())[:6] or 'SUBJ'
        subj = Subject(name=name, code=code, description=f"Mata pelajaran {name}")
        db.session.add(subj)
        db.session.commit()
    return subj

@app.route('/api/materials/create', methods=['POST'])
@login_required
def create_material():
    user = get_current_user()
    if user.role != 'guru':
        return jsonify({'error': 'Forbidden'}), 403

    if request.is_json:
        data = request.json
    else:
        data = request.form

    title = (data.get('title') or '').strip()
    content = (data.get('content') or '').strip()
    summary = (data.get('summary') or '').strip()
    subject_input = (data.get('subject_name') or data.get('subject_id') or '').strip() or None
    video_url = (data.get('video_url') or '').strip() or None

    if not title or not content or not subject_input:
        return jsonify({'error': 'Bad Request', 'message': 'Judul, konten, dan mata pelajaran wajib diisi.'}), 400

    subject = get_or_create_subject(subject_input)
    if not subject:
        return jsonify({'error': 'Bad Request', 'message': 'Mata pelajaran tidak valid.'}), 400

    attachment_filename = None
    attachment_original_name = None

    # --- Multi-file upload: field name 'files' (multiple) ---
    uploaded_files = request.files.getlist('files')
    # Fallback ke field 'file' tunggal jika tidak ada 'files'
    if not uploaded_files or all(f.filename == '' for f in uploaded_files):
        single = request.files.get('file')
        uploaded_files = [single] if single and single.filename else []

    upload_dir = os.path.join(app.root_path, 'uploads', 'materials')
    os.makedirs(upload_dir, exist_ok=True)

    m = Material(
        title=title, content=content, summary=summary,
        subject_id=subject.id, teacher_id=user.id, video_url=video_url,
        attachment_filename=attachment_filename, attachment_original_name=attachment_original_name
    )
    db.session.add(m)
    db.session.commit()  # commit dulu agar m.id tersedia

    # Simpan file-file lampiran (jika ada)
    for file in uploaded_files:
        if not file or not file.filename:
            continue
        try:
            original_name = file.filename
            safe_name = secure_filename(f"mat_{user.id}_{m.id}_{int(datetime.now().timestamp())}_{original_name}")
            file_path = os.path.join(upload_dir, safe_name)
            file.save(file_path)
            file_size = os.path.getsize(file_path)
            att = MaterialAttachment(
                material_id=m.id,
                filename=f"materials/{safe_name}",
                original_name=original_name,
                file_size=file_size
            )
            db.session.add(att)
        except Exception:
            pass  # file gagal disimpan tidak membatalkan pembuatan materi

    try:
        db.session.commit()
    except Exception:
        db.session.rollback()
        # Materi sudah tersimpan, hanya lampiran yang gagal — tetap sukses

    return jsonify({'success': True, 'message': 'Materi berhasil dibuat.'}), 201

@app.route('/api/materials/<int:id>/toggle', methods=['POST'])
@login_required
def toggle_material(id):
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
    return jsonify({'success': True, 'is_completed': progress.is_completed})


@app.route('/api/materials/<int:mat_id>/attachments/<int:att_id>', methods=['DELETE'])
@login_required
def delete_material_attachment(mat_id, att_id):
    """Guru menghapus satu file lampiran dari materi."""
    user = get_current_user()
    if user.role != 'guru':
        return jsonify({'error': 'Forbidden'}), 403

    att = MaterialAttachment.query.filter_by(id=att_id, material_id=mat_id).first_or_404()

    # Hapus file dari disk
    file_path = os.path.join(app.root_path, 'uploads', att.filename)
    if os.path.exists(file_path):
        os.remove(file_path)

    db.session.delete(att)
    db.session.commit()
    return jsonify({'success': True, 'message': 'Lampiran berhasil dihapus.'})


@app.route('/api/assignments', methods=['GET'])
@login_required
def get_assignments():
    user = get_current_user()
    if user.role == 'guru':
        assignments = Assignment.query.filter_by(teacher_id=user.id).order_by(Assignment.created_at.desc()).all()
    else:
        assignments = Assignment.query.filter(
            (Assignment.target_student_id == None) | (Assignment.target_student_id == user.id)
        ).order_by(Assignment.created_at.desc()).all()
    
    data = []
    for a in assignments:
        sub = a.get_user_submission(user.id) if user.role == 'murid' else None
        status = 'not_submitted'
        grade = None
        feedback = None
        if sub:
            status = 'graded' if sub.is_graded else 'submitted'
            grade = sub.grade
            feedback = sub.feedback
        data.append({
            'id': a.id,
            'title': a.title,
            'description': a.description,
            'subject_name': a.subject.name if a.subject else '',
            'due_date': a.due_date.isoformat() if a.due_date else None,
            'is_past_due': a.is_past_due,
            'status': status,
            'grade': grade,
            'feedback': feedback,
            'attachment': a.attachment_original_name if a.attachment_filename else None,
            'attachment_url': f"/uploads/{a.attachment_filename}" if a.attachment_filename else None,
            'created_at': a.created_at.isoformat()
        })
    return jsonify(data)

@app.route('/api/assignments/create', methods=['POST'])
@login_required
def create_assignment():
    user = get_current_user()
    if user.role != 'guru':
        return jsonify({'error': 'Forbidden'}), 403

    if request.is_json:
        data = request.json
    else:
        data = request.form

    title = data.get('title', '').strip()
    description = data.get('description', '').strip()
    subject_input = data.get('subject_name') or data.get('subject_id')
    due_date_str = data.get('due_date')
    due_date = None
    if due_date_str:
        try:
            due_date = datetime.fromisoformat(due_date_str)
        except ValueError:
            pass

    if not title or not description or not subject_input:
        return jsonify({'error': 'Bad Request', 'message': 'Judul, deskripsi, dan mata pelajaran wajib diisi.'}), 400

    subject = get_or_create_subject(subject_input)
    if not subject:
        return jsonify({'error': 'Bad Request', 'message': 'Mata pelajaran tidak valid.'}), 400

    attachment_filename = None
    attachment_original_name = None

    if 'file' in request.files and request.files['file'].filename:
        file = request.files['file']
        original_name = file.filename
        safe_name = secure_filename(f"asg_{user.id}_{int(datetime.now().timestamp())}_{original_name}")
        upload_dir = os.path.join(app.root_path, 'uploads', 'assignments')
        os.makedirs(upload_dir, exist_ok=True)
        file.save(os.path.join(upload_dir, safe_name))
        attachment_filename = f"assignments/{safe_name}"
        attachment_original_name = original_name

    a = Assignment(
        title=title, description=description, subject_id=subject.id,
        teacher_id=user.id, due_date=due_date,
        attachment_filename=attachment_filename, attachment_original_name=attachment_original_name
    )
    db.session.add(a)
    db.session.commit()
    return jsonify({'success': True, 'message': 'Tugas berhasil dibuat.'}), 201

@app.route('/api/assignments/<int:assignment_id>/submit', methods=['POST'])
@login_required
def submit_assignment(assignment_id):
    user = get_current_user()
    if user.role != 'murid':
        return jsonify({'error': 'Forbidden'}), 403
    assignment = Assignment.query.get_or_404(assignment_id)
    existing = Submission.query.filter_by(assignment_id=assignment_id, student_id=user.id).first()
    if existing:
        return jsonify({'error': 'Conflict', 'message': 'Anda sudah pernah mengumpulkan tugas ini.'}), 409
    
    if 'file' not in request.files:
        return jsonify({'error': 'Bad Request', 'message': 'File wajib diunggah.'}), 400
    
    file = request.files['file']
    allowed_ext = {'pdf', 'docx', 'zip', 'png', 'jpg', 'jpeg'}
    ext = file.filename.rsplit('.', 1)[-1].lower() if '.' in file.filename else ''
    if ext not in allowed_ext:
        return jsonify({'error': 'Bad Request', 'message': 'Format file tidak diizinkan.'}), 400
    
    original_name = file.filename
    safe_name = secure_filename(f"{user.id}_{assignment_id}_{original_name}")
    upload_dir = os.path.join(app.root_path, 'uploads', 'submissions')
    os.makedirs(upload_dir, exist_ok=True)
    file.save(os.path.join(upload_dir, safe_name))
    
    note = request.form.get('note', '')
    sub = Submission(assignment_id=assignment_id, student_id=user.id, file_filename=safe_name, file_original_name=original_name, note=note)
    db.session.add(sub)
    db.session.commit()
    return jsonify({'success': True, 'message': 'Tugas berhasil dikirim.'}), 201


@app.route('/api/assignments/<int:assignment_id>/submissions', methods=['GET'])
@login_required
def get_assignment_submissions(assignment_id):
    """Guru melihat semua pengumpulan tugas dari murid."""
    user = get_current_user()
    if user.role != 'guru':
        return jsonify({'error': 'Forbidden'}), 403

    assignment = Assignment.query.get_or_404(assignment_id)

    # Semua murid yang sudah mengumpulkan
    submissions = Submission.query.filter_by(assignment_id=assignment_id).all()
    submitted_ids = {s.student_id for s in submissions}

    # Semua murid yang seharusnya bisa melihat tugas ini
    if assignment.target_student_id:
        all_students = User.query.filter_by(id=assignment.target_student_id, role='murid').all()
    else:
        all_students = User.query.filter_by(role='murid', is_approved=True).all()

    base_url = os.environ.get('VITE_API_URL', '')

    sub_data = []
    for sub in submissions:
        sub_data.append({
            'submission_id': sub.id,
            'student_id': sub.student_id,
            'student_name': sub.student.display_name if sub.student else f'Murid #{sub.student_id}',
            'file_url': f"{base_url}/uploads/submissions/{sub.file_filename}",
            'file_name': sub.file_original_name,
            'note': sub.note,
            'submitted_at': sub.submitted_at.isoformat(),
            'is_late': sub.is_late,
            'grade': sub.grade,
            'feedback': sub.feedback,
            'is_graded': sub.is_graded,
        })

    # Murid yang belum mengumpulkan
    not_submitted = []
    for st in all_students:
        if st.id not in submitted_ids:
            not_submitted.append({
                'student_id': st.id,
                'student_name': st.display_name,
            })

    return jsonify({
        'assignment_id': assignment_id,
        'title': assignment.title,
        'submissions': sub_data,
        'not_submitted': not_submitted,
    })


@app.route('/api/submissions/<int:submission_id>/grade', methods=['POST'])
@login_required
def grade_submission(submission_id):
    """Guru memberi nilai dan feedback pada satu submission."""
    user = get_current_user()
    if user.role != 'guru':
        return jsonify({'error': 'Forbidden'}), 403

    sub = Submission.query.get_or_404(submission_id)
    data = request.json or {}

    grade = data.get('grade')
    feedback = data.get('feedback', '').strip()

    if grade is None:
        return jsonify({'error': 'Bad Request', 'message': 'Nilai wajib diisi.'}), 400

    try:
        grade = int(grade)
        if not (0 <= grade <= 100):
            raise ValueError
    except (ValueError, TypeError):
        return jsonify({'error': 'Bad Request', 'message': 'Nilai harus angka antara 0 - 100.'}), 400

    sub.grade = grade
    sub.feedback = feedback
    sub.graded_at = datetime.now()
    db.session.commit()

    return jsonify({'success': True, 'message': f'Nilai {grade} berhasil disimpan.', 'grade': grade})

@app.route('/api/users/teachers', methods=['GET'])
@login_required
def get_teachers():
    teachers = User.query.filter_by(role='guru', is_approved=True).all()
    return jsonify([{
        'id': t.id,
        'username': t.username,
        'full_name': t.full_name or t.display_name,
        'email': t.email,
        'campus': t.campus or t.username,
        'department': t.department or '',
        'semester': t.semester or '',
        'role': 'guru'
    } for t in teachers])

@app.route('/api/users/create_teacher', methods=['POST'])
@login_required
def create_teacher():
    user = get_current_user()
    if user.role != 'guru':
        return jsonify({'error': 'Forbidden'}), 403
    try:
        data = request.json or {}
        campus = data.get('campus', '').strip() or data.get('username', '').strip()
        raw_username = data.get('username', '').strip() or campus
        email = data.get('email', '').strip().lower()
        full_name = data.get('full_name', '').strip()
        department = data.get('department', '').strip()
        semester = data.get('semester', '').strip()
        password = data.get('password', '')

        if not campus or not email or not password:
            return jsonify({'success': False, 'message': 'Nama Kampus, email, dan password wajib diisi.'}), 400

        existing_user = User.query.filter_by(email=email).first()
        if existing_user:
            existing_user.role = 'guru'
            existing_user.is_approved = True
            existing_user.campus = campus
            if department:
                existing_user.department = department
            if semester:
                existing_user.semester = semester
            if full_name:
                existing_user.full_name = full_name
            if password:
                existing_user.set_password(password)
            db.session.commit()
            return jsonify({'success': True, 'message': f'Akun {existing_user.display_name} ({email}) berhasil diaktifkan menjadi Mentor!'})

        base_username = email.split('@')[0] if email else (raw_username or 'mentor')
        clean_username = re.sub(r'[^a-zA-Z0-9_]', '_', base_username)[:50]
        final_username = clean_username
        counter = 1
        while User.query.filter_by(username=final_username).first():
            final_username = f"{clean_username}_{counter}"
            counter += 1

        new_teacher = User(
            username=final_username,
            email=email,
            full_name=full_name if full_name else campus,
            campus=campus,
            department=department,
            semester=semester,
            role='guru',
            is_approved=True
        )
        new_teacher.set_password(password)
        db.session.add(new_teacher)
        db.session.commit()
        return jsonify({'success': True, 'message': f'Mentor {new_teacher.display_name} berhasil ditambahkan!'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': f'Gagal menambahkan mentor: {str(e)}'}), 500

@app.route('/api/users/mentor-access', methods=['POST'])
@teacher_required
def mentor_access():
    data = request.json or {}
    mentor = db.session.get(User, data.get('mentor_id'))
    password = data.get('password', '')
    if not mentor or mentor.role != 'guru' or not mentor.is_approved or not mentor.check_password(password):
        return jsonify({'success': False, 'message': 'Password mentor salah.'}), 401

    return jsonify({
        'success': True,
        'token': generate_token(mentor),
        'user': {
            'id': mentor.id,
            'username': mentor.username,
            'email': mentor.email,
            'full_name': mentor.full_name,
            'department': mentor.department,
            'role': mentor.role,
            'display_name': mentor.display_name,
            'name': mentor.display_name
        }
    })

@app.route('/api/chat/<int:target_id>', methods=['GET'])
@login_required
def get_chat(target_id):
    user = get_current_user()
    messages = Message.query.filter(
        ((Message.sender_id == user.id) & (Message.receiver_id == target_id)) |
        ((Message.sender_id == target_id) & (Message.receiver_id == user.id))
    ).order_by(Message.timestamp.asc()).all()

    Message.query.filter(
        Message.sender_id == target_id,
        Message.receiver_id == user.id,
        Message.is_read == False
    ).update({Message.is_read: True}, synchronize_session=False)
    db.session.commit()
    
    return jsonify([{
        'id': m.id,
        'sender_id': m.sender_id,
        'receiver_id': m.receiver_id,
        'content': m.content,
        'timestamp': m.timestamp.isoformat(),
        'is_read': m.is_read
    } for m in messages])

@app.route('/api/chat/unread', methods=['GET'])
@teacher_required
def get_unread_chat_count():
    user = get_current_user()
    count = Message.query.filter_by(receiver_id=user.id, is_read=False).count()
    return jsonify({'count': count})

@app.route('/api/chat/<int:target_id>', methods=['POST'])
@login_required
def send_message(target_id):
    user = get_current_user()
    data = request.json
    content = data.get('content', '').strip()
    if not content:
        return jsonify({'error': 'Bad Request', 'message': 'Pesan tidak boleh kosong.'}), 400

    new_message = Message(
        sender_id=user.id,
        receiver_id=target_id,
        content=content
    )
    db.session.add(new_message)
    db.session.commit()
    
    return jsonify({'success': True, 'message': 'Pesan terkirim.'})


# ==========================================
# QUIZ & EXAM API ROUTES
# ==========================================

def parse_iso_datetime(dt_str):
    """Parse berbagai format ISO string datetime menjadi Python datetime naive."""
    if not dt_str:
        return None
    try:
        clean_str = str(dt_str).strip().replace('Z', '+00:00')
        if '+00:00' in clean_str:
            return datetime.fromisoformat(clean_str).replace(tzinfo=None)
        return datetime.fromisoformat(clean_str)
    except Exception:
        try:
            return datetime.strptime(str(dt_str).strip(), "%Y-%m-%dT%H:%M")
        except Exception:
            return None


@app.route('/api/quizzes', methods=['GET'])
@login_required
def get_quizzes():
    user = get_current_user()
    
    if user.role == 'guru':
        quizzes = Quiz.query.order_by(Quiz.created_at.desc()).all()
        result = []
        for q in quizzes:
            attempts = q.attempts
            submitted_attempts = [a for a in attempts if a.status in ('submitted', 'graded')]
            graded_attempts = [a for a in attempts if a.status == 'graded']
            pending_grading_count = sum(1 for a in attempts if a.status == 'submitted' and q.has_essay)
            avg_score = round(sum(a.total_score for a in graded_attempts if a.total_score is not None) / len(graded_attempts), 1) if graded_attempts else None
            
            result.append({
                'id': q.id,
                'title': q.title,
                'description': q.description,
                'subject_id': q.subject_id,
                'subject_name': q.subject.name if q.subject else None,
                'subject_color': q.subject.color if q.subject else 'blue',
                'teacher_id': q.teacher_id,
                'teacher_name': q.teacher.display_name if q.teacher else None,
                'target_student_id': q.target_student_id,
                'target_student_name': q.target_student.display_name if q.target_student else None,
                'start_time': q.start_time.isoformat() if q.start_time else None,
                'end_time': q.end_time.isoformat() if q.end_time else None,
                'duration_minutes': q.duration_minutes,
                'show_score_immediately': q.show_score_immediately,
                'is_published': q.is_published,
                'is_active': q.is_active,
                'total_points': q.total_points,
                'question_count': q.question_count,
                'has_essay': q.has_essay,
                'total_attempts': len(submitted_attempts),
                'pending_grading_count': pending_grading_count,
                'average_score': avg_score,
                'created_at': q.created_at.isoformat()
            })
        return jsonify(result)

    # Role Murid:
    now = datetime.now()
    quizzes = Quiz.query.filter(
        Quiz.is_published == True,
        db.or_(Quiz.target_student_id == None, Quiz.target_student_id == user.id)
    ).order_by(Quiz.created_at.desc()).all()

    result = []
    for q in quizzes:
        attempt = q.get_student_attempt(user.id)
        attempt_data = None
        if attempt:
            # Check timeout for in_progress
            if attempt.status == 'in_progress' and attempt.remaining_seconds == 0:
                # Auto finalize PG if timeout
                attempt.submitted_at = attempt.started_at + timedelta(minutes=q.duration_minutes)
                for ans in attempt.answers:
                    if ans.question and ans.question.question_type == 'multiple_choice':
                        if ans.selected_option and ans.question.correct_answer and ans.selected_option.strip().upper() == ans.question.correct_answer.strip().upper():
                            ans.earned_points = ans.question.points
                        else:
                            ans.earned_points = 0
                        ans.is_graded = True
                if not q.has_essay:
                    attempt.calculate_score()
                    attempt.status = 'graded'
                    if q.show_score_immediately:
                        attempt.is_score_released = True
                else:
                    attempt.status = 'submitted'
                db.session.commit()

            attempt_data = {
                'id': attempt.id,
                'status': attempt.status,
                'started_at': attempt.started_at.isoformat() if attempt.started_at else None,
                'submitted_at': attempt.submitted_at.isoformat() if attempt.submitted_at else None,
                'remaining_seconds': attempt.remaining_seconds,
                'is_score_released': attempt.is_score_released,
                'total_score': attempt.total_score if attempt.is_score_released else None
            }

        result.append({
            'id': q.id,
            'title': q.title,
            'description': q.description,
            'subject_id': q.subject_id,
            'subject_name': q.subject.name if q.subject else None,
            'subject_color': q.subject.color if q.subject else 'blue',
            'teacher_name': q.teacher.display_name if q.teacher else None,
            'start_time': q.start_time.isoformat() if q.start_time else None,
            'end_time': q.end_time.isoformat() if q.end_time else None,
            'duration_minutes': q.duration_minutes,
            'show_score_immediately': q.show_score_immediately,
            'is_active': q.is_active,
            'total_points': q.total_points,
            'question_count': q.question_count,
            'has_essay': q.has_essay,
            'attempt': attempt_data,
            'created_at': q.created_at.isoformat()
        })
    return jsonify(result)


@app.route('/api/quizzes', methods=['POST'])
@teacher_required
def create_quiz():
    user = get_current_user()
    data = request.json or {}
    
    title = data.get('title', '').strip()
    if not title:
        return jsonify({'error': 'Bad Request', 'message': 'Judul kuis wajib diisi.'}), 400
    
    subject_id = data.get('subject_id')
    subject_name = data.get('subject_name', '').strip()
    if not subject_id and subject_name:
        subject = Subject.query.filter(db.func.lower(Subject.name) == subject_name.lower()).first()
        if not subject:
            subject = Subject(name=subject_name, color='indigo')
            db.session.add(subject)
            db.session.flush()
        subject_id = subject.id

    if not subject_id:
        return jsonify({'error': 'Bad Request', 'message': 'Mata pelajaran/kuliah wajib diisi.'}), 400

    questions_data = data.get('questions', [])
    if not questions_data or len(questions_data) == 0:
        return jsonify({'error': 'Bad Request', 'message': 'Kuis harus memiliki minimal 1 soal.'}), 400

    start_time = parse_iso_datetime(data.get('start_time'))
    end_time = parse_iso_datetime(data.get('end_time'))
    duration_minutes = int(data.get('duration_minutes', 60))
    show_score_immediately = bool(data.get('show_score_immediately', True))
    is_published = bool(data.get('is_published', True))
    target_student_id = data.get('target_student_id') or None

    quiz = Quiz(
        title=title,
        description=data.get('description', '').strip(),
        subject_id=subject_id,
        teacher_id=user.id,
        target_student_id=target_student_id,
        start_time=start_time,
        end_time=end_time,
        duration_minutes=duration_minutes,
        show_score_immediately=show_score_immediately,
        is_published=is_published
    )
    db.session.add(quiz)
    db.session.flush()

    for idx, q_data in enumerate(questions_data):
        q_type = q_data.get('question_type', 'multiple_choice')
        q_text = q_data.get('question_text', '').strip()
        points = float(q_data.get('points', 10.0))
        
        question = QuizQuestion(
            quiz_id=quiz.id,
            question_type=q_type,
            question_text=q_text,
            points=points,
            order_index=idx
        )
        if q_type == 'multiple_choice':
            options = q_data.get('options', [])
            question.set_options(options)
            question.correct_answer = q_data.get('correct_answer', '').strip().upper()
        else:
            question.rubric = q_data.get('rubric', '').strip()

        db.session.add(question)

    db.session.commit()
    return jsonify({'success': True, 'message': 'Kuis berhasil dibuat!', 'quiz_id': quiz.id}), 201


@app.route('/api/quizzes/<int:quiz_id>', methods=['GET'])
@login_required
def get_quiz_detail(quiz_id):
    user = get_current_user()
    quiz = db.session.get(Quiz, quiz_id)
    if not quiz:
        return jsonify({'error': 'Not Found', 'message': 'Kuis tidak ditemukan.'}), 404

    is_teacher = (user.role == 'guru')
    attempt = quiz.get_student_attempt(user.id) if not is_teacher else None

    # Status check for student: can they view answers/feedback?
    can_view_full_result = is_teacher or (
        attempt and attempt.is_score_released
    ) or (
        attempt and attempt.status == 'graded' and quiz.show_score_immediately and not quiz.has_essay
    )

    questions_list = []
    for q in quiz.questions:
        q_dict = {
            'id': q.id,
            'question_type': q.question_type,
            'question_text': q.question_text,
            'points': q.points,
            'order_index': q.order_index,
            'options': q.get_options() if q.question_type == 'multiple_choice' else []
        }
        if is_teacher or can_view_full_result:
            q_dict['correct_answer'] = q.correct_answer
            q_dict['rubric'] = q.rubric
        
        # If student has an attempt, attach their saved/graded answer
        if attempt:
            ans = QuizAnswer.query.filter_by(attempt_id=attempt.id, question_id=q.id).first()
            if ans:
                q_dict['student_answer'] = {
                    'selected_option': ans.selected_option,
                    'essay_answer': ans.essay_answer,
                    'earned_points': ans.earned_points if can_view_full_result else None,
                    'teacher_feedback': ans.teacher_feedback if can_view_full_result else None,
                    'is_graded': ans.is_graded
                }

        questions_list.append(q_dict)

    attempt_data = None
    if attempt:
        attempt_data = {
            'id': attempt.id,
            'status': attempt.status,
            'started_at': attempt.started_at.isoformat() if attempt.started_at else None,
            'submitted_at': attempt.submitted_at.isoformat() if attempt.submitted_at else None,
            'remaining_seconds': attempt.remaining_seconds,
            'is_score_released': attempt.is_score_released,
            'total_score': attempt.total_score if can_view_full_result else None
        }

    return jsonify({
        'id': quiz.id,
        'title': quiz.title,
        'description': quiz.description,
        'subject_id': quiz.subject_id,
        'subject_name': quiz.subject.name if quiz.subject else None,
        'subject_color': quiz.subject.color if quiz.subject else 'blue',
        'teacher_id': quiz.teacher_id,
        'teacher_name': quiz.teacher.display_name if quiz.teacher else None,
        'target_student_id': quiz.target_student_id,
        'target_student_name': quiz.target_student.display_name if quiz.target_student else None,
        'start_time': quiz.start_time.isoformat() if quiz.start_time else None,
        'end_time': quiz.end_time.isoformat() if quiz.end_time else None,
        'duration_minutes': quiz.duration_minutes,
        'show_score_immediately': quiz.show_score_immediately,
        'is_published': quiz.is_published,
        'is_active': quiz.is_active,
        'total_points': quiz.total_points,
        'question_count': quiz.question_count,
        'has_essay': quiz.has_essay,
        'questions': questions_list,
        'attempt': attempt_data
    })


@app.route('/api/quizzes/<int:quiz_id>', methods=['PUT'])
@teacher_required
def update_quiz(quiz_id):
    quiz = db.session.get(Quiz, quiz_id)
    if not quiz:
        return jsonify({'error': 'Not Found', 'message': 'Kuis tidak ditemukan.'}), 404

    data = request.json or {}
    quiz.title = data.get('title', quiz.title).strip()
    quiz.description = data.get('description', quiz.description).strip()
    quiz.subject_id = data.get('subject_id', quiz.subject_id)
    quiz.target_student_id = data.get('target_student_id') or None
    quiz.start_time = parse_iso_datetime(data.get('start_time'))
    quiz.end_time = parse_iso_datetime(data.get('end_time'))
    quiz.duration_minutes = int(data.get('duration_minutes', quiz.duration_minutes))
    quiz.show_score_immediately = bool(data.get('show_score_immediately', quiz.show_score_immediately))
    quiz.is_published = bool(data.get('is_published', quiz.is_published))
    quiz.updated_at = datetime.now()

    # If questions list provided, update or recreate
    if 'questions' in data:
        # Delete old questions if no attempts or update them
        # If attempts already exist, update existing questions or replace carefully
        QuizQuestion.query.filter_by(quiz_id=quiz.id).delete()
        for idx, q_data in enumerate(data['questions']):
            q_type = q_data.get('question_type', 'multiple_choice')
            question = QuizQuestion(
                quiz_id=quiz.id,
                question_type=q_type,
                question_text=q_data.get('question_text', '').strip(),
                points=float(q_data.get('points', 10.0)),
                order_index=idx
            )
            if q_type == 'multiple_choice':
                question.set_options(q_data.get('options', []))
                question.correct_answer = q_data.get('correct_answer', '').strip().upper()
            else:
                question.rubric = q_data.get('rubric', '').strip()
            db.session.add(question)

    db.session.commit()
    return jsonify({'success': True, 'message': 'Kuis berhasil diperbarui!'})


@app.route('/api/quizzes/<int:quiz_id>', methods=['DELETE'])
@teacher_required
def delete_quiz(quiz_id):
    quiz = db.session.get(Quiz, quiz_id)
    if not quiz:
        return jsonify({'error': 'Not Found', 'message': 'Kuis tidak ditemukan.'}), 404
    
    db.session.delete(quiz)
    db.session.commit()
    return jsonify({'success': True, 'message': 'Kuis berhasil dihapus.'})


@app.route('/api/quizzes/<int:quiz_id>/start', methods=['POST'])
@login_required
def start_quiz(quiz_id):
    user = get_current_user()
    if user.role != 'murid':
        return jsonify({'error': 'Forbidden', 'message': 'Hanya murid yang dapat mengerjakan kuis.'}), 403

    quiz = db.session.get(Quiz, quiz_id)
    if not quiz:
        return jsonify({'error': 'Not Found', 'message': 'Kuis tidak ditemukan.'}), 404

    now = datetime.now()
    if quiz.start_time and now < quiz.start_time:
        return jsonify({'error': 'Forbidden', 'message': f'Kuis belum dimulai. Dibuka pada {quiz.start_time.strftime("%d %b %Y %H:%M")}.'}), 400

    if quiz.end_time and now > quiz.end_time:
        return jsonify({'error': 'Forbidden', 'message': 'Kuis sudah melewati batas waktu pengerjaan.'}), 400

    attempt = quiz.get_student_attempt(user.id)
    if attempt:
        if attempt.status in ('submitted', 'graded'):
            return jsonify({'error': 'Forbidden', 'message': 'Anda sudah menyelesaikan kuis ini.'}), 400
        
        # Resume in_progress attempt
        if attempt.remaining_seconds == 0:
            # Timed out, finalize
            attempt.submitted_at = datetime.now()
            attempt.status = 'submitted'
            db.session.commit()
            return jsonify({'error': 'Timeout', 'message': 'Waktu pengerjaan kuis Anda telah habis.'}), 400
    else:
        # Create new attempt
        attempt = QuizAttempt(
            quiz_id=quiz.id,
            student_id=user.id,
            started_at=datetime.now(),
            status='in_progress',
            is_score_released=False
        )
        db.session.add(attempt)
        db.session.flush()

        # Pre-populate empty QuizAnswer entries
        for q in quiz.questions:
            ans = QuizAnswer(
                attempt_id=attempt.id,
                question_id=q.id,
                selected_option=None,
                essay_answer=None,
                is_graded=False
            )
            db.session.add(ans)
        
        db.session.commit()

    # Load questions and current saved answers for student
    saved_answers = {ans.question_id: {'selected_option': ans.selected_option, 'essay_answer': ans.essay_answer} for ans in attempt.answers}

    questions_list = [{
        'id': q.id,
        'question_type': q.question_type,
        'question_text': q.question_text,
        'points': q.points,
        'order_index': q.order_index,
        'options': q.get_options() if q.question_type == 'multiple_choice' else [],
        'saved_answer': saved_answers.get(q.id, {'selected_option': None, 'essay_answer': None})
    } for q in quiz.questions]

    return jsonify({
        'success': True,
        'attempt_id': attempt.id,
        'started_at': attempt.started_at.isoformat(),
        'remaining_seconds': attempt.remaining_seconds,
        'duration_minutes': quiz.duration_minutes,
        'questions': questions_list
    })


@app.route('/api/quizzes/<int:quiz_id>/save-answer', methods=['POST'])
@login_required
def save_quiz_answer(quiz_id):
    user = get_current_user()
    attempt = QuizAttempt.query.filter_by(quiz_id=quiz_id, student_id=user.id, status='in_progress').first()
    if not attempt:
        return jsonify({'error': 'Bad Request', 'message': 'Sesi kuis tidak aktif.'}), 400

    if attempt.remaining_seconds == 0:
        return jsonify({'error': 'Timeout', 'message': 'Waktu pengerjaan telah habis.'}), 400

    data = request.json or {}
    question_id = data.get('question_id')
    if not question_id:
        return jsonify({'error': 'Bad Request', 'message': 'ID soal diperlukan.'}), 400

    answer = QuizAnswer.query.filter_by(attempt_id=attempt.id, question_id=question_id).first()
    if not answer:
        answer = QuizAnswer(attempt_id=attempt.id, question_id=question_id)
        db.session.add(answer)

    if 'selected_option' in data:
        answer.selected_option = data['selected_option']
    if 'essay_answer' in data:
        answer.essay_answer = data['essay_answer']

    db.session.commit()
    return jsonify({'success': True})


@app.route('/api/quizzes/<int:quiz_id>/submit', methods=['POST'])
@login_required
def submit_quiz(quiz_id):
    user = get_current_user()
    quiz = db.session.get(Quiz, quiz_id)
    if not quiz:
        return jsonify({'error': 'Not Found', 'message': 'Kuis tidak ditemukan.'}), 404

    attempt = QuizAttempt.query.filter_by(quiz_id=quiz_id, student_id=user.id).first()
    if not attempt:
        return jsonify({'error': 'Bad Request', 'message': 'Sesi kuis tidak ditemukan.'}), 400

    if attempt.status in ('submitted', 'graded'):
        return jsonify({'success': True, 'message': 'Kuis sudah pernah disubmit.', 'total_score': attempt.total_score if attempt.is_score_released else None})

    data = request.json or {}
    batch_answers = data.get('answers', [])
    for item in batch_answers:
        q_id = item.get('question_id')
        if not q_id:
            continue
        ans = QuizAnswer.query.filter_by(attempt_id=attempt.id, question_id=q_id).first()
        if not ans:
            ans = QuizAnswer(attempt_id=attempt.id, question_id=q_id)
            db.session.add(ans)
        if 'selected_option' in item:
            ans.selected_option = item['selected_option']
        if 'essay_answer' in item:
            ans.essay_answer = item['essay_answer']

    db.session.flush()

    # Auto-grade Multiple Choice questions
    for ans in attempt.answers:
        question = ans.question
        if not question:
            continue
        if question.question_type == 'multiple_choice':
            if ans.selected_option and question.correct_answer and ans.selected_option.strip().upper() == question.correct_answer.strip().upper():
                ans.earned_points = question.points
            else:
                ans.earned_points = 0.0
            ans.is_graded = True
        else:
            ans.is_graded = False
            ans.earned_points = None

    attempt.submitted_at = datetime.now()

    if not quiz.has_essay:
        # All questions are PG, auto calculate score
        attempt.calculate_score()
        attempt.status = 'graded'
        if quiz.show_score_immediately:
            attempt.is_score_released = True
        else:
            attempt.is_score_released = False
    else:
        # Has essay, requires teacher grading
        attempt.status = 'submitted'
        attempt.is_score_released = False

    db.session.commit()

    return jsonify({
        'success': True,
        'message': 'Kuis berhasil disubmit!',
        'status': attempt.status,
        'is_score_released': attempt.is_score_released,
        'total_score': attempt.total_score if attempt.is_score_released else None,
        'show_score_immediately': quiz.show_score_immediately
    })


@app.route('/api/quizzes/<int:quiz_id>/attempts', methods=['GET'])
@teacher_required
def get_quiz_attempts(quiz_id):
    quiz = db.session.get(Quiz, quiz_id)
    if not quiz:
        return jsonify({'error': 'Not Found', 'message': 'Kuis tidak ditemukan.'}), 404

    attempts = QuizAttempt.query.filter_by(quiz_id=quiz.id).all()
    result = []
    for a in attempts:
        student = a.student
        essay_pending = sum(1 for ans in a.answers if ans.question and ans.question.question_type == 'essay' and not ans.is_graded)
        result.append({
            'id': a.id,
            'student_id': a.student_id,
            'student_name': student.display_name if student else 'Unknown',
            'student_email': student.email if student else '',
            'student_department': student.department if student else '',
            'student_campus': student.campus if student else '',
            'started_at': a.started_at.isoformat() if a.started_at else None,
            'submitted_at': a.submitted_at.isoformat() if a.submitted_at else None,
            'total_score': a.total_score,
            'status': a.status,
            'is_score_released': a.is_score_released,
            'essay_pending_count': essay_pending
        })

    return jsonify({
        'quiz_id': quiz.id,
        'quiz_title': quiz.title,
        'has_essay': quiz.has_essay,
        'total_points': quiz.total_points,
        'attempts': result
    })


@app.route('/api/quizzes/<int:quiz_id>/attempts/<int:attempt_id>', methods=['GET'])
@login_required
def get_attempt_detail(quiz_id, attempt_id):
    user = get_current_user()
    attempt = db.session.get(QuizAttempt, attempt_id)
    if not attempt or attempt.quiz_id != quiz_id:
        return jsonify({'error': 'Not Found', 'message': 'Data pengerjaan tidak ditemukan.'}), 404

    is_teacher = (user.role == 'guru')
    if not is_teacher and attempt.student_id != user.id:
        return jsonify({'error': 'Forbidden', 'message': 'Akses ditolak.'}), 403

    quiz = attempt.quiz
    answers_data = []
    for ans in attempt.answers:
        q = ans.question
        if not q:
            continue
        answers_data.append({
            'question_id': q.id,
            'question_type': q.question_type,
            'question_text': q.question_text,
            'points': q.points,
            'order_index': q.order_index,
            'options': q.get_options() if q.question_type == 'multiple_choice' else [],
            'correct_answer': q.correct_answer if (is_teacher or attempt.is_score_released) else None,
            'rubric': q.rubric if is_teacher else None,
            'selected_option': ans.selected_option,
            'essay_answer': ans.essay_answer,
            'earned_points': ans.earned_points if (is_teacher or attempt.is_score_released) else None,
            'teacher_feedback': ans.teacher_feedback if (is_teacher or attempt.is_score_released) else None,
            'is_graded': ans.is_graded
        })

    # Sort by order_index
    answers_data.sort(key=lambda x: x['order_index'])

    return jsonify({
        'attempt_id': attempt.id,
        'student_name': attempt.student.display_name if attempt.student else 'Unknown',
        'started_at': attempt.started_at.isoformat() if attempt.started_at else None,
        'submitted_at': attempt.submitted_at.isoformat() if attempt.submitted_at else None,
        'total_score': attempt.total_score if (is_teacher or attempt.is_score_released) else None,
        'status': attempt.status,
        'is_score_released': attempt.is_score_released,
        'quiz_title': quiz.title,
        'quiz_duration': quiz.duration_minutes,
        'answers': answers_data
    })


@app.route('/api/quizzes/attempts/<int:attempt_id>/grade', methods=['POST'])
@teacher_required
def grade_attempt(attempt_id):
    attempt = db.session.get(QuizAttempt, attempt_id)
    if not attempt:
        return jsonify({'error': 'Not Found', 'message': 'Pengerjaan tidak ditemukan.'}), 404

    data = request.json or {}
    grades = data.get('grades', [])
    release_score = bool(data.get('release_score', False))

    for g in grades:
        q_id = g.get('question_id')
        ans = QuizAnswer.query.filter_by(attempt_id=attempt.id, question_id=q_id).first()
        if ans:
            if 'earned_points' in g and g['earned_points'] is not None:
                ans.earned_points = float(g['earned_points'])
                ans.is_graded = True
            if 'teacher_feedback' in g:
                ans.teacher_feedback = g['teacher_feedback']

    # Recalculate total score
    attempt.calculate_score()
    
    # Check if all questions are graded
    all_graded = all(ans.is_graded for ans in attempt.answers)
    if all_graded:
        attempt.status = 'graded'

    if release_score:
        attempt.is_score_released = True

    db.session.commit()
    return jsonify({
        'success': True,
        'message': 'Penilaian berhasil disimpan!',
        'total_score': attempt.total_score,
        'status': attempt.status,
        'is_score_released': attempt.is_score_released
    })


@app.route('/api/quizzes/<int:quiz_id>/release-scores', methods=['POST'])
@teacher_required
def release_quiz_scores(quiz_id):
    quiz = db.session.get(Quiz, quiz_id)
    if not quiz:
        return jsonify({'error': 'Not Found', 'message': 'Kuis tidak ditemukan.'}), 404

    attempts = QuizAttempt.query.filter_by(quiz_id=quiz.id).all()
    count = 0
    for a in attempts:
        if a.status in ('submitted', 'graded'):
            a.is_score_released = True
            count += 1

    db.session.commit()
    return jsonify({'success': True, 'message': f'Nilai berhasil dirilis untuk {count} peserta!'})


init_db(app)

if __name__ == '__main__':
    app.run(debug=True, port=5000)
