import os
import re
import jwt
from functools import wraps
from datetime import datetime, timedelta, timezone
from flask import Flask, request, jsonify, send_from_directory, abort
from werkzeug.utils import secure_filename
from dotenv import load_dotenv
from flask_cors import CORS
from models import db, User, Subject, Material, MaterialProgress, Assignment, Submission, Message
from database import init_db

load_dotenv()

app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'elearning-secret-key-super-secure-2026')

db_uri = os.environ.get('DATABASE_URL', 'sqlite:///elearning.db')
if db_uri.startswith("postgres://"):
    db_uri = db_uri.replace("postgres://", "postgresql://", 1)
app.config['SQLALCHEMY_DATABASE_URI'] = db_uri
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

frontend_url = os.environ.get('FRONTEND_URL', 'http://localhost:5173')
allowed_origins = [origin.strip() for origin in frontend_url.split(',')]
allowed_origins.extend(["http://localhost:5173", "http://127.0.0.1:5173"])
CORS(app, resources={r"/api/*": {"origins": allowed_origins}})

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
        user = get_current_user()
        if not user:
            return jsonify({'error': 'Unauthorized', 'message': 'Silakan masuk terlebih dahulu.'}), 401
        return f(*args, **kwargs)
    return decorated_function

def teacher_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
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

    user = User.query.filter((User.email == identifier) | (User.username == identifier)).first()
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
                'role': user.role,
                'display_name': user.display_name,
                'name': user.display_name
            }
        })
    return jsonify({'success': False, 'message': 'Email/Username atau password salah.'}), 401

@app.route('/api/register', methods=['POST'])
def register():
    data = request.json
    username = data.get('username', '').strip()
    email = data.get('email', '').strip().lower()
    full_name = data.get('full_name', '').strip()
    password = data.get('password', '')
    confirm_password = data.get('confirm_password', '')
    role = 'murid'

    if not username or not email or not password:
        return jsonify({'success': False, 'message': 'Harap isi semua kolom yang wajib.'}), 400
    if password != confirm_password:
        return jsonify({'success': False, 'message': 'Konfirmasi password tidak cocok.'}), 400
    if len(password) < 6:
        return jsonify({'success': False, 'message': 'Password minimal harus terdiri dari 6 karakter.'}), 400

    if User.query.filter_by(username=username).first():
        return jsonify({'success': False, 'message': 'Username sudah digunakan.'}), 400
    if User.query.filter_by(email=email).first():
        return jsonify({'success': False, 'message': 'Email sudah terdaftar.'}), 400

    new_user = User(username=username, email=email, full_name=full_name if full_name else username, role=role, is_approved=False)
    new_user.set_password(password)
    db.session.add(new_user)
    db.session.commit()
    return jsonify({'success': True, 'message': 'Pendaftaran berhasil! Akun Anda sedang menunggu persetujuan Guru.'})

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

    return jsonify({
        'id': material.id,
        'title': material.title,
        'content': material.content,
        'video_url': material.get_youtube_embed_url(),
        'subject_name': material.subject.name if material.subject else '',
        'is_completed': progress.is_completed if progress else False,
        'attachment': material.attachment_original_name if material.attachment_filename else None,
        'attachment_url': f"/uploads/{material.attachment_filename}" if material.attachment_filename else None
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

    title = data.get('title', '').strip()
    content = data.get('content', '').strip()
    summary = data.get('summary', '').strip()
    subject_input = data.get('subject_name') or data.get('subject_id')
    video_url = data.get('video_url', '').strip() or None

    if not title or not content or not subject_input:
        return jsonify({'error': 'Bad Request', 'message': 'Judul, konten, dan mata pelajaran wajib diisi.'}), 400

    subject = get_or_create_subject(subject_input)
    if not subject:
        return jsonify({'error': 'Bad Request', 'message': 'Mata pelajaran tidak valid.'}), 400

    attachment_filename = None
    attachment_original_name = None

    if 'file' in request.files and request.files['file'].filename:
        file = request.files['file']
        original_name = file.filename
        safe_name = secure_filename(f"mat_{user.id}_{int(datetime.now().timestamp())}_{original_name}")
        upload_dir = os.path.join(app.root_path, 'uploads', 'materials')
        os.makedirs(upload_dir, exist_ok=True)
        file.save(os.path.join(upload_dir, safe_name))
        attachment_filename = f"materials/{safe_name}"
        attachment_original_name = original_name

    m = Material(
        title=title, content=content, summary=summary,
        subject_id=subject.id, teacher_id=user.id, video_url=video_url,
        attachment_filename=attachment_filename, attachment_original_name=attachment_original_name
    )
    db.session.add(m)
    db.session.commit()
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

@app.route('/api/users/teachers', methods=['GET'])
@login_required
def get_teachers():
    teachers = User.query.filter_by(role='guru', is_approved=True).all()
    return jsonify([{'id': t.id, 'full_name': t.display_name, 'email': t.email} for t in teachers])

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

@app.route('/api/chat/<int:student_id>', methods=['GET'])
@login_required
def get_chat(student_id):
    user = get_current_user()
    
    # Validasi otorisasi (IDOR check)
    if user.role == 'murid' and user.id != student_id:
        return jsonify({'error': 'Forbidden', 'message': 'Anda tidak berhak melihat pesan ini.'}), 403

    messages = Message.query.filter(
        ((Message.sender_id == user.id) & (Message.receiver_id == student_id)) |
        ((Message.sender_id == student_id) & (Message.receiver_id == user.id))
    ).order_by(Message.timestamp.asc()).all()
    
    return jsonify([{
        'id': m.id,
        'sender_id': m.sender_id,
        'receiver_id': m.receiver_id,
        'content': m.content,
        'timestamp': m.timestamp.isoformat(),
        'is_read': m.is_read
    } for m in messages])

@app.route('/api/chat/<int:student_id>', methods=['POST'])
@login_required
def send_message(student_id):
    user = get_current_user()
    if user.role == 'murid' and user.id != student_id:
        return jsonify({'error': 'Forbidden', 'message': 'Anda tidak berhak mengirim pesan sebagai pengguna ini.'}), 403

    data = request.json
    content = data.get('content', '').strip()
    if not content:
        return jsonify({'error': 'Bad Request', 'message': 'Pesan tidak boleh kosong.'}), 400

    receiver_id = student_id if user.role == 'guru' else User.query.filter_by(role='guru').first().id

    new_message = Message(
        sender_id=user.id,
        receiver_id=receiver_id,
        content=content
    )
    db.session.add(new_message)
    db.session.commit()
    
    return jsonify({'success': True, 'message': 'Pesan terkirim.'})

init_db(app)

if __name__ == '__main__':
    app.run(debug=True, port=5000)
