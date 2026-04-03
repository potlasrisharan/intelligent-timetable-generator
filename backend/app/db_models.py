from sqlalchemy import Column, String, Integer, Boolean, ForeignKey, UniqueConstraint, Table
from sqlalchemy.orm import relationship
from .database import Base

combined_section_association = Table(
    'combined_section_association', Base.metadata,
    Column('combined_id', String, ForeignKey('combined_sections.id'), primary_key=True),
    Column('section_id', String, ForeignKey('sections.id'), primary_key=True)
)

class Department(Base):
    __tablename__ = "departments"
    id = Column(String, primary_key=True, index=True)
    name = Column(String, index=True)
    code = Column(String, unique=True, index=True)

class Course(Base):
    __tablename__ = "courses"
    id = Column(String, primary_key=True, index=True)
    name = Column(String)
    theory_hrs = Column(Integer, default=0)
    practical_hrs = Column(Integer, default=0)
    department_id = Column(String, ForeignKey("departments.id"))
    department = relationship("Department")

class Faculty(Base):
    __tablename__ = "faculty"
    id = Column(String, primary_key=True, index=True)
    name = Column(String)
    max_periods = Column(Integer)
    department_id = Column(String, ForeignKey("departments.id"))
    department = relationship("Department")

class Section(Base):
    __tablename__ = "sections"
    id = Column(String, primary_key=True, index=True)
    student_count = Column(Integer)
    department_id = Column(String, ForeignKey("departments.id"))
    department = relationship("Department")

class Room(Base):
    __tablename__ = "rooms"
    id = Column(String, primary_key=True, index=True)
    capacity = Column(Integer)
    type = Column(String) # CLASSROOM or LAB
    department_exclusive_id = Column(String, ForeignKey("departments.id"), nullable=True)

class Timeslot(Base):
    __tablename__ = "timeslots"
    id = Column(String, primary_key=True, index=True)
    day = Column(String)
    period = Column(Integer)
    start_time = Column(String)
    end_time = Column(String)
    is_lunch = Column(Boolean, default=False)

class CombinedSection(Base):
    __tablename__ = "combined_sections"
    id = Column(String, primary_key=True, index=True)
    course_id = Column(String, ForeignKey("courses.id"))
    faculty_id = Column(String, ForeignKey("faculty.id"))
    sections = relationship("Section", secondary=combined_section_association)

class Holiday(Base):
    __tablename__ = "holidays"
    id = Column(String, primary_key=True, index=True)
    date = Column(String)
    name = Column(String)

class TimetableVersion(Base):
    __tablename__ = "timetable_versions"
    id = Column(String, primary_key=True, index=True)
    department_id = Column(String, ForeignKey("departments.id"))
    status = Column(String) # DRAFT, ACTIVE, ARCHIVED
    quality_score = Column(Integer, default=0)
    generation_time = Column(Integer, nullable=True) # milliseconds

class TimetableEntry(Base):
    __tablename__ = "timetable_entries"
    id = Column(String, primary_key=True, index=True)
    version_id = Column(String, ForeignKey("timetable_versions.id"))
    course_id = Column(String, ForeignKey("courses.id"))
    section_id = Column(String, ForeignKey("sections.id"))
    faculty_id = Column(String, ForeignKey("faculty.id"))
    room_id = Column(String, ForeignKey("rooms.id"))
    timeslot_id = Column(String, ForeignKey("timeslots.id"))

    __table_args__ = (
        UniqueConstraint('version_id', 'room_id', 'timeslot_id', name='uix_version_room_timeslot'),
    )

class LockedSlot(Base):
    __tablename__ = "locked_slots"
    id = Column(String, primary_key=True, index=True)
    entry_id = Column(String, ForeignKey("timetable_entries.id"))

class User(Base):
    __tablename__ = "users"
    id = Column(String, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    password_hash = Column(String)
    role = Column(String)

class ConflictLog(Base):
    __tablename__ = "conflict_logs"
    id = Column(String, primary_key=True, index=True)
    version_id = Column(String, ForeignKey("timetable_versions.id"))
    status = Column(String) # OPEN, RESOLVED

class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"))
    action = Column(String)
    timestamp = Column(String)
