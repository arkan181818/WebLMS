from datetime import datetime
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash

db = SQLAlchemy()

class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    full_name = db.Column(db.String(120), nullable=True)
    role = db.Column(db.String(20), nullable=False, default='murid')  # 'guru' (admin) atau 'murid'
    is_approved = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.now)

    # Relasi
    materials_created = db.relationship('Material', foreign_keys='Material.teacher_id', backref='author', lazy=True, cascade="all, delete-orphan")
    progress_records = db.relationship('MaterialProgress', backref='student', lazy=True, cascade="all, delete-orphan")

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    @property
    def is_teacher(self):
        return self.role == 'guru'

    @property
    def display_name(self):
        return self.full_name if self.full_name else self.username

    def __repr__(self):
        return f'<User {self.username} ({self.role})>'


class Subject(db.Model):
    __tablename__ = 'subjects'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)
    code = db.Column(db.String(20), nullable=True)
    description = db.Column(db.Text, nullable=True)
    icon = db.Column(db.String(50), default='book-open')
    color = db.Column(db.String(50), default='blue')  # blue, indigo, emerald, amber, rose, purple
    created_at = db.Column(db.DateTime, default=datetime.now)

    # Relasi
    materials = db.relationship('Material', backref='subject', lazy=True, cascade="all, delete-orphan")

    def __repr__(self):
        return f'<Subject {self.name}>'


class Material(db.Model):
    __tablename__ = 'materials'

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    summary = db.Column(db.Text, nullable=True)
    content = db.Column(db.Text, nullable=False)
    
    subject_id = db.Column(db.Integer, db.ForeignKey('subjects.id'), nullable=False)
    teacher_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    target_student_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    
    video_url = db.Column(db.String(300), nullable=True)
    attachment_filename = db.Column(db.String(255), nullable=True)
    attachment_original_name = db.Column(db.String(255), nullable=True)
    
    created_at = db.Column(db.DateTime, default=datetime.now)
    updated_at = db.Column(db.DateTime, default=datetime.now, onupdate=datetime.now)

    # Relasi
    progress_entries = db.relationship('MaterialProgress', backref='material', lazy=True, cascade="all, delete-orphan")

    def get_youtube_embed_url(self):
        """Konversi berbagai format URL YouTube menjadi format embed aman"""
        if not self.video_url:
            return None
        import re
        url = self.video_url.strip()
        # Format: https://www.youtube.com/watch?v=VIDEO_ID atau https://youtu.be/VIDEO_ID
        yt_regex = r'(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})'
        match = re.search(yt_regex, url)
        if match:
            video_id = match.group(1)
            return f"https://www.youtube.com/embed/{video_id}"
        return None

    def is_completed_by(self, user_id):
        if not user_id:
            return False
        progress = MaterialProgress.query.filter_by(user_id=user_id, material_id=self.id).first()
        return progress.is_completed if progress else False

    def __repr__(self):
        return f'<Material {self.title}>'


class MaterialProgress(db.Model):
    __tablename__ = 'material_progress'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    material_id = db.Column(db.Integer, db.ForeignKey('materials.id'), nullable=False)
    is_completed = db.Column(db.Boolean, default=False)
    completed_at = db.Column(db.DateTime, nullable=True)
    last_accessed = db.Column(db.DateTime, default=datetime.now)

    __table_args__ = (
        db.UniqueConstraint('user_id', 'material_id', name='uq_user_material_progress'),
    )

    def __repr__(self):
        return f'<MaterialProgress User:{self.user_id} Mat:{self.material_id} Done:{self.is_completed}>'


class Assignment(db.Model):
    __tablename__ = 'assignments'

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=False)
    subject_id = db.Column(db.Integer, db.ForeignKey('subjects.id'), nullable=False)
    teacher_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    target_student_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    
    due_date = db.Column(db.DateTime, nullable=True)
    attachment_filename = db.Column(db.String(255), nullable=True)
    attachment_original_name = db.Column(db.String(255), nullable=True)
    
    created_at = db.Column(db.DateTime, default=datetime.now)
    updated_at = db.Column(db.DateTime, default=datetime.now, onupdate=datetime.now)

    # Relasi
    subject = db.relationship('Subject', backref=db.backref('assignments', lazy=True, cascade='all, delete-orphan'))
    teacher = db.relationship('User', foreign_keys=[teacher_id], backref=db.backref('assignments_created', lazy=True, cascade='all, delete-orphan'))
    target_student = db.relationship('User', foreign_keys=[target_student_id], backref=db.backref('assignments_received', lazy=True, cascade='all, delete-orphan'))
    submissions = db.relationship('Submission', backref='assignment', lazy=True, cascade='all, delete-orphan')

    @property
    def is_past_due(self):
        if not self.due_date:
            return False
        return datetime.now() > self.due_date

    def get_user_submission(self, user_id):
        if not user_id:
            return None
        return Submission.query.filter_by(assignment_id=self.id, student_id=user_id).first()

    def __repr__(self):
        return f'<Assignment {self.title}>'


class Submission(db.Model):
    __tablename__ = 'submissions'

    id = db.Column(db.Integer, primary_key=True)
    assignment_id = db.Column(db.Integer, db.ForeignKey('assignments.id'), nullable=False)
    student_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    
    file_filename = db.Column(db.String(255), nullable=False)
    file_original_name = db.Column(db.String(255), nullable=False)
    note = db.Column(db.Text, nullable=True)
    submitted_at = db.Column(db.DateTime, default=datetime.now)
    
    # Penilaian oleh Guru
    grade = db.Column(db.Integer, nullable=True)  # Skala 0 - 100
    feedback = db.Column(db.Text, nullable=True)
    graded_at = db.Column(db.DateTime, nullable=True)

    # Relasi
    student = db.relationship('User', backref=db.backref('submissions', lazy=True, cascade='all, delete-orphan'))

    __table_args__ = (
        db.UniqueConstraint('assignment_id', 'student_id', name='uq_assignment_student_submission'),
    )

    @property
    def is_graded(self):
        return self.grade is not None

    @property
    def is_late(self):
        if self.assignment and self.assignment.due_date:
            return self.submitted_at > self.assignment.due_date
        return False

    def __repr__(self):
        return f'<Submission Student:{self.student_id} Task:{self.assignment_id}>'


class Message(db.Model):
    __tablename__ = 'messages'

    id = db.Column(db.Integer, primary_key=True)
    sender_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    receiver_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    content = db.Column(db.Text, nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.now)
    is_read = db.Column(db.Boolean, default=False)

    # Relasi
    sender = db.relationship('User', foreign_keys=[sender_id], backref=db.backref('sent_messages', lazy=True, cascade='all, delete-orphan'))
    receiver = db.relationship('User', foreign_keys=[receiver_id], backref=db.backref('received_messages', lazy=True, cascade='all, delete-orphan'))

    def __repr__(self):
        return f'<Message From:{self.sender_id} To:{self.receiver_id}>'
