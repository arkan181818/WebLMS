import json
from datetime import datetime, timedelta
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
    department = db.Column(db.String(120), nullable=True)  # Jurusan
    campus = db.Column(db.String(150), nullable=True)      # Nama Kampus
    semester = db.Column(db.String(50), nullable=True)     # Semester
    role = db.Column(db.String(20), nullable=False, default='murid', index=True)  # 'guru' (admin) atau 'murid'
    is_approved = db.Column(db.Boolean, default=False, index=True)
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
    attachments = db.relationship('MaterialAttachment', backref='material', lazy=True, cascade='all, delete-orphan')

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


class MaterialAttachment(db.Model):
    """Menyimpan lampiran file untuk sebuah materi (mendukung banyak file)."""
    __tablename__ = 'material_attachments'

    id = db.Column(db.Integer, primary_key=True)
    material_id = db.Column(db.Integer, db.ForeignKey('materials.id'), nullable=False)
    filename = db.Column(db.String(255), nullable=False)       # nama file tersimpan di disk
    original_name = db.Column(db.String(255), nullable=False)  # nama file asli dari pengguna
    file_size = db.Column(db.Integer, nullable=True)           # ukuran dalam bytes
    uploaded_at = db.Column(db.DateTime, default=datetime.now)

    def __repr__(self):
        return f'<MaterialAttachment {self.original_name} -> Material:{self.material_id}>'


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
    sender_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    receiver_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    content = db.Column(db.Text, nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.now, index=True)
    is_read = db.Column(db.Boolean, default=False, index=True)

    __table_args__ = (
        db.Index('idx_messages_conversation', 'sender_id', 'receiver_id', 'timestamp'),
    )

    # Relasi
    sender = db.relationship('User', foreign_keys=[sender_id], backref=db.backref('sent_messages', lazy=True, cascade='all, delete-orphan'))
    receiver = db.relationship('User', foreign_keys=[receiver_id], backref=db.backref('received_messages', lazy=True, cascade='all, delete-orphan'))

    def __repr__(self):
        return f'<Message From:{self.sender_id} To:{self.receiver_id}>'


class Quiz(db.Model):
    __tablename__ = 'quizzes'

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=True)
    subject_id = db.Column(db.Integer, db.ForeignKey('subjects.id'), nullable=False)
    teacher_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    target_student_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)

    start_time = db.Column(db.DateTime, nullable=True)
    end_time = db.Column(db.DateTime, nullable=True)
    duration_minutes = db.Column(db.Integer, default=60, nullable=False)
    show_score_immediately = db.Column(db.Boolean, default=True)
    is_published = db.Column(db.Boolean, default=True)

    created_at = db.Column(db.DateTime, default=datetime.now)
    updated_at = db.Column(db.DateTime, default=datetime.now, onupdate=datetime.now)

    # Relasi
    subject = db.relationship('Subject', backref=db.backref('quizzes', lazy=True, cascade='all, delete-orphan'))
    teacher = db.relationship('User', foreign_keys=[teacher_id], backref=db.backref('quizzes_created', lazy=True, cascade='all, delete-orphan'))
    target_student = db.relationship('User', foreign_keys=[target_student_id], backref=db.backref('quizzes_received', lazy=True, cascade='all, delete-orphan'))
    questions = db.relationship('QuizQuestion', backref='quiz', lazy=True, cascade='all, delete-orphan', order_by='QuizQuestion.order_index')
    attempts = db.relationship('QuizAttempt', backref='quiz', lazy=True, cascade='all, delete-orphan')

    @property
    def total_points(self):
        return sum(q.points for q in self.questions)

    @property
    def question_count(self):
        return len(self.questions)

    @property
    def has_essay(self):
        return any(q.question_type == 'essay' for q in self.questions)

    @property
    def is_active(self):
        now = datetime.now()
        if self.start_time and now < self.start_time:
            return False
        if self.end_time and now > self.end_time:
            return False
        return self.is_published

    def get_student_attempt(self, student_id):
        if not student_id:
            return None
        return QuizAttempt.query.filter_by(quiz_id=self.id, student_id=student_id).first()

    def __repr__(self):
        return f'<Quiz {self.title}>'


class QuizQuestion(db.Model):
    __tablename__ = 'quiz_questions'

    id = db.Column(db.Integer, primary_key=True)
    quiz_id = db.Column(db.Integer, db.ForeignKey('quizzes.id'), nullable=False)
    question_type = db.Column(db.String(20), nullable=False, default='multiple_choice')  # 'multiple_choice' or 'essay'
    question_text = db.Column(db.Text, nullable=False)
    options_json = db.Column(db.Text, nullable=True)  # JSON list: [{"key": "A", "text": "Option 1"}, ...]
    correct_answer = db.Column(db.String(10), nullable=True)  # 'A', 'B', 'C', etc.
    rubric = db.Column(db.Text, nullable=True)  # Panduan rubrik guru
    points = db.Column(db.Float, default=10.0, nullable=False)
    order_index = db.Column(db.Integer, default=0, nullable=False)

    answers = db.relationship('QuizAnswer', backref='question', lazy=True, cascade='all, delete-orphan')

    def get_options(self):
        if not self.options_json:
            return []
        try:
            return json.loads(self.options_json)
        except:
            return []

    def set_options(self, options_list):
        self.options_json = json.dumps(options_list)

    def __repr__(self):
        return f'<QuizQuestion {self.id} Type:{self.question_type}>'


class QuizAttempt(db.Model):
    __tablename__ = 'quiz_attempts'

    id = db.Column(db.Integer, primary_key=True)
    quiz_id = db.Column(db.Integer, db.ForeignKey('quizzes.id'), nullable=False)
    student_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    started_at = db.Column(db.DateTime, default=datetime.now)
    submitted_at = db.Column(db.DateTime, nullable=True)
    total_score = db.Column(db.Float, nullable=True)  # Skala 0 - 100
    status = db.Column(db.String(20), default='in_progress', nullable=False)  # 'in_progress', 'submitted', 'graded'
    is_score_released = db.Column(db.Boolean, default=False)

    student = db.relationship('User', backref=db.backref('quiz_attempts', lazy=True, cascade='all, delete-orphan'))
    answers = db.relationship('QuizAnswer', backref='attempt', lazy=True, cascade='all, delete-orphan')

    __table_args__ = (
        db.UniqueConstraint('quiz_id', 'student_id', name='uq_quiz_student_attempt'),
    )

    def calculate_score(self):
        """Kalkulasi skor otomatis untuk soal PG dan gabungkan dengan nilai essai jika sudah dinilai."""
        total_quiz_points = self.quiz.total_points
        if total_quiz_points <= 0:
            self.total_score = 0
            return 0
        
        earned_total = 0
        for ans in self.answers:
            if ans.earned_points is not None:
                earned_total += ans.earned_points
        
        final_percentage = round((earned_total / total_quiz_points) * 100, 2)
        final_percentage = min(100.0, max(0.0, final_percentage))
        self.total_score = final_percentage
        return final_percentage

    @property
    def remaining_seconds(self):
        if self.submitted_at or self.status != 'in_progress':
            return 0
        if not self.quiz.duration_minutes:
            return None
        deadline = self.started_at + timedelta(minutes=self.quiz.duration_minutes)
        now = datetime.now()
        diff = (deadline - now).total_seconds()
        return max(0, int(diff))

    def __repr__(self):
        return f'<QuizAttempt Student:{self.student_id} Quiz:{self.quiz_id} Score:{self.total_score}>'


class QuizAnswer(db.Model):
    __tablename__ = 'quiz_answers'

    id = db.Column(db.Integer, primary_key=True)
    attempt_id = db.Column(db.Integer, db.ForeignKey('quiz_attempts.id'), nullable=False)
    question_id = db.Column(db.Integer, db.ForeignKey('quiz_questions.id'), nullable=False)
    selected_option = db.Column(db.String(10), nullable=True)
    essay_answer = db.Column(db.Text, nullable=True)
    earned_points = db.Column(db.Float, nullable=True)
    teacher_feedback = db.Column(db.Text, nullable=True)
    is_graded = db.Column(db.Boolean, default=False)

    __table_args__ = (
        db.UniqueConstraint('attempt_id', 'question_id', name='uq_attempt_question_answer'),
    )

    def __repr__(self):
        return f'<QuizAnswer Attempt:{self.attempt_id} Question:{self.question_id}>'

