-- Supabase Schema for Intelligent Timetable Generator

-- 1. Departments
CREATE TABLE IF NOT EXISTS departments (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    short_code TEXT NOT NULL,
    campus TEXT NOT NULL,
    sections INTEGER NOT NULL
);

-- 2. Faculty
CREATE TABLE IF NOT EXISTS faculty (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    designation TEXT NOT NULL,
    department_id TEXT REFERENCES departments(id),
    max_periods_per_day INTEGER NOT NULL,
    weekly_load INTEGER NOT NULL,
    availability TEXT NOT NULL,
    preferences TEXT[] NOT NULL,
    status TEXT NOT NULL
);

-- 3. Rooms
CREATE TABLE IF NOT EXISTS rooms (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    block TEXT NOT NULL,
    capacity INTEGER NOT NULL,
    room_type TEXT NOT NULL,
    utilization INTEGER NOT NULL
);

-- 4. Sections
CREATE TABLE IF NOT EXISTS sections (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    department_id TEXT REFERENCES departments(id),
    semester INTEGER NOT NULL,
    student_count INTEGER NOT NULL,
    advisor TEXT NOT NULL,
    compactness INTEGER NOT NULL
);

-- 5. Courses
CREATE TABLE IF NOT EXISTS courses (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    department_id TEXT REFERENCES departments(id),
    semester INTEGER NOT NULL,
    theory_hours INTEGER NOT NULL,
    practical_hours INTEGER NOT NULL,
    lab_required BOOLEAN NOT NULL,
    faculty_id TEXT REFERENCES faculty(id),
    section_ids TEXT[] NOT NULL,
    status TEXT NOT NULL
);

-- 6. Combined Sections
CREATE TABLE IF NOT EXISTS combined_sections (
    id TEXT PRIMARY KEY,
    label TEXT NOT NULL,
    course_code TEXT NOT NULL,
    semester INTEGER NOT NULL,
    section_ids TEXT[] NOT NULL,
    combined_student_count INTEGER NOT NULL,
    faculty_id TEXT REFERENCES faculty(id),
    room_id TEXT REFERENCES rooms(id)
);

-- 7. Timeslots
CREATE TABLE IF NOT EXISTS timeslots (
    id TEXT PRIMARY KEY,
    label TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    is_lunch BOOLEAN DEFAULT FALSE
);

-- 8. Holidays
CREATE TABLE IF NOT EXISTS holidays (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    holiday_date TEXT NOT NULL,
    scope TEXT NOT NULL,
    impact TEXT NOT NULL
);

-- 9. Timetable Versions
CREATE TABLE IF NOT EXISTS timetable_versions (
    id TEXT PRIMARY KEY,
    label TEXT NOT NULL,
    department_id TEXT NOT NULL,
    status TEXT NOT NULL,
    generated_at TEXT NOT NULL,
    quality_score INTEGER NOT NULL,
    locked_slots INTEGER NOT NULL,
    notes TEXT NOT NULL
);

-- 10. Locked Slots
CREATE TABLE IF NOT EXISTS locked_slots (
    id TEXT PRIMARY KEY,
    day TEXT NOT NULL,
    timeslot_id TEXT REFERENCES timeslots(id),
    section_id TEXT REFERENCES sections(id),
    reason TEXT NOT NULL,
    locked_by TEXT NOT NULL
);

-- 11. Timetable Entries
CREATE TABLE IF NOT EXISTS timetable_entries (
    id TEXT PRIMARY KEY,
    day TEXT NOT NULL,
    timeslot_id TEXT REFERENCES timeslots(id),
    section_id TEXT REFERENCES sections(id),
    course_code TEXT NOT NULL,
    course_name TEXT NOT NULL,
    faculty_name TEXT NOT NULL,
    room_name TEXT NOT NULL,
    type TEXT NOT NULL,
    locked BOOLEAN DEFAULT FALSE,
    note TEXT,
    combined BOOLEAN DEFAULT FALSE
);

-- 12. Conflicts
CREATE TABLE IF NOT EXISTS conflicts (
    id TEXT PRIMARY KEY,
    severity TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    rule_code TEXT NOT NULL,
    affected TEXT[] NOT NULL,
    suggested_fixes TEXT[] NOT NULL,
    quality_impact INTEGER NOT NULL,
    status TEXT NOT NULL
);

-- 13. Audit Trail
CREATE TABLE IF NOT EXISTS audit_trail (
    id TEXT PRIMARY KEY,
    actor TEXT NOT NULL,
    action TEXT NOT NULL,
    target TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    tone TEXT NOT NULL
);

-------------------------------------------------------------------------------
-- SEED DATA INSERTION
-------------------------------------------------------------------------------

INSERT INTO departments (id, name, short_code, campus, sections) VALUES
('cse', 'Computer Science', 'CSE', 'Main Block', 4),
('ece', 'Electrical Engineering', 'ECE', 'North Wing', 3),
('me', 'Mechanical Engineering', 'ME', 'Central Labs', 2) ON CONFLICT DO NOTHING;

INSERT INTO faculty (id, name, designation, department_id, max_periods_per_day, weekly_load, availability, preferences, status) VALUES
('fac-001', 'Dr. Farhan Alam', 'Professor', 'cse', 4, 14, 'Mon-Thu, morning heavy', ARRAY['AI Lab', 'P1', 'P2'], 'balanced'),
('fac-002', 'Prof. Sara Joseph', 'Associate Professor', 'cse', 4, 17, 'Mon-Fri, all day', ARRAY['P3', 'P4'], 'high_load'),
('fac-003', 'Dr. Ibrahim Khan', 'Assistant Professor', 'ece', 3, 11, 'Tue-Fri, no P7', ARRAY['Circuits Lab'], 'limited'),
('fac-004', 'Prof. Nidhi Sharma', 'Professor', 'ece', 4, 13, 'Mon-Thu, balanced', ARRAY['P1', 'P5'], 'balanced'),
('fac-005', 'Dr. Zubair Hussain', 'Lab Coordinator', 'me', 4, 12, 'Mon-Fri, practical slots', ARRAY['Manufacturing Lab', 'P6', 'P7'], 'balanced') ON CONFLICT DO NOTHING;

INSERT INTO rooms (id, name, block, capacity, room_type, utilization) VALUES
('rm-101', 'A-101', 'Academic Block A', 60, 'CLASSROOM', 82),
('rm-203', 'A-203', 'Academic Block A', 48, 'CLASSROOM', 68),
('rm-305', 'B-305', 'Engineering Block', 120, 'CLASSROOM', 74),
('lab-ai', 'AI Lab', 'Innovation Center', 36, 'LAB', 86),
('lab-circuits', 'Circuits Lab', 'North Wing', 32, 'LAB', 71),
('lab-manufacturing', 'Manufacturing Lab', 'Central Labs', 28, 'LAB', 79) ON CONFLICT DO NOTHING;

INSERT INTO sections (id, name, department_id, semester, student_count, advisor, compactness) VALUES
('cse-3a', 'CSE 3A', 'cse', 3, 54, 'Dr. Farhan Alam', 87),
('cse-3b', 'CSE 3B', 'cse', 3, 50, 'Prof. Sara Joseph', 82),
('cse-5a', 'CSE 5A', 'cse', 5, 44, 'Dr. Farhan Alam', 90),
('ece-3a', 'ECE 3A', 'ece', 3, 46, 'Dr. Ibrahim Khan', 78),
('ece-5a', 'ECE 5A', 'ece', 5, 38, 'Prof. Nidhi Sharma', 81),
('me-3a', 'ME 3A', 'me', 3, 34, 'Dr. Zubair Hussain', 84) ON CONFLICT DO NOTHING;

INSERT INTO courses (id, code, name, department_id, semester, theory_hours, practical_hours, lab_required, faculty_id, section_ids, status) VALUES
('cs301', 'CS301', 'Design and Analysis of Algorithms', 'cse', 3, 3, 0, false, 'fac-002', ARRAY['cse-3a', 'cse-3b'], 'scheduled'),
('cs315', 'CS315', 'Database Systems', 'cse', 3, 2, 2, true, 'fac-001', ARRAY['cse-3a', 'cse-3b'], 'review'),
('cs501', 'CS501', 'Machine Learning', 'cse', 5, 3, 2, true, 'fac-001', ARRAY['cse-5a'], 'draft'),
('ee301', 'EE301', 'Signals and Systems', 'ece', 3, 3, 0, false, 'fac-003', ARRAY['ece-3a'], 'scheduled'),
('ee326', 'EE326', 'Circuits Laboratory', 'ece', 3, 0, 2, true, 'fac-003', ARRAY['ece-3a'], 'review'),
('ee504', 'EE504', 'Power Electronics', 'ece', 5, 3, 1, true, 'fac-004', ARRAY['ece-5a'], 'scheduled'),
('me302', 'ME302', 'Manufacturing Processes', 'me', 3, 3, 2, true, 'fac-005', ARRAY['me-3a'], 'scheduled') ON CONFLICT DO NOTHING;

INSERT INTO combined_sections (id, label, course_code, semester, section_ids, combined_student_count, faculty_id, room_id) VALUES
('cmb-cs315', 'CSE 3A + CSE 3B', 'CS315', 3, ARRAY['cse-3a', 'cse-3b'], 104, 'fac-001', 'rm-305'),
('cmb-foundation', 'CSE 5A + ECE 5A', 'AI Elective', 5, ARRAY['cse-5a', 'ece-5a'], 82, 'fac-002', 'rm-305') ON CONFLICT DO NOTHING;

INSERT INTO timeslots (id, label, start_time, end_time, is_lunch) VALUES
('p1', 'P1', '08:30', '09:25', false),
('p2', 'P2', '09:30', '10:25', false),
('p3', 'P3', '10:35', '11:30', false),
('p4', 'P4', '11:35', '12:30', false),
('lunch', 'Lunch', '12:30', '13:20', true),
('p5', 'P5', '13:20', '14:15', false),
('p6', 'P6', '14:20', '15:15', false),
('p7', 'P7', '15:25', '16:20', false) ON CONFLICT DO NOTHING;

INSERT INTO holidays (id, name, holiday_date, scope, impact) VALUES
('hol-1', 'Founders Day', '2026-04-12', 'University', 'Solver blocks all slots automatically.'),
('hol-2', 'Exam Buffer Day', '2026-05-03', 'Engineering Block', 'Only lab-intensive sections need reseating.'),
('hol-3', 'Admissions Open House', '2026-05-15', 'Main Block', 'Large classrooms reserved from P3 onward.') ON CONFLICT DO NOTHING;

INSERT INTO timetable_versions (id, label, department_id, status, generated_at, quality_score, locked_slots, notes) VALUES
('ver-2026-spring-active', 'Spring 2026 Active', 'all', 'ACTIVE', '2026-04-03 11:22', 93, 8, 'Published after final dean review.'),
('ver-2026-spring-draft', 'Spring 2026 Draft', 'all', 'DRAFT', '2026-04-03 13:05', 96, 11, 'Includes compactness optimization and lab chaining.'),
('ver-2026-spring-archive', 'Spring 2026 Archived', 'all', 'ARCHIVED', '2026-03-29 17:42', 88, 5, 'Pre-convocation revision snapshot.') ON CONFLICT DO NOTHING;

INSERT INTO locked_slots (id, day, timeslot_id, section_id, reason, locked_by) VALUES
('lock-1', 'Mon', 'p2', 'cse-3a', 'Faculty senate commitment', 'Ayesha Rahman'),
('lock-2', 'Wed', 'p5', 'me-3a', 'Lab equipment calibration window', 'Ops Team') ON CONFLICT DO NOTHING;

INSERT INTO timetable_entries (id, day, timeslot_id, section_id, course_code, course_name, faculty_name, room_name, type, locked, note, combined) VALUES
('tte-1', 'Mon', 'p1', 'cse-3a', 'CS301', 'Algorithms', 'Prof. Sara Joseph', 'A-101', 'THEORY', false, null, false),
('tte-2', 'Mon', 'p2', 'cse-3a', 'CS315', 'Database Systems', 'Dr. Farhan Alam', 'A-203', 'THEORY', true, 'Pinned during manual review', false),
('tte-3', 'Mon', 'p5', 'cse-3a', 'CS315', 'Database Lab', 'Dr. Farhan Alam', 'AI Lab', 'LAB', false, null, true),
('tte-4', 'Mon', 'p6', 'cse-3a', 'CS315', 'Database Lab', 'Dr. Farhan Alam', 'AI Lab', 'LAB', false, null, true),
('tte-5', 'Tue', 'p3', 'cse-3a', 'CS301', 'Algorithms', 'Prof. Sara Joseph', 'A-101', 'THEORY', false, null, false),
('tte-6', 'Tue', 'p7', 'cse-3a', 'HS210', 'Technical Communication', 'Guest Faculty', 'A-203', 'THEORY', false, null, false),
('tte-7', 'Wed', 'p1', 'cse-5a', 'CS501', 'Machine Learning', 'Dr. Farhan Alam', 'A-101', 'THEORY', false, null, false),
('tte-8', 'Wed', 'p5', 'me-3a', 'ME302', 'Manufacturing Processes', 'Dr. Zubair Hussain', 'Manufacturing Lab', 'LAB', true, null, false),
('tte-9', 'Wed', 'p6', 'me-3a', 'ME302', 'Manufacturing Processes', 'Dr. Zubair Hussain', 'Manufacturing Lab', 'LAB', true, null, false),
('tte-10', 'Thu', 'p2', 'ece-3a', 'EE301', 'Signals and Systems', 'Dr. Ibrahim Khan', 'A-203', 'THEORY', false, null, false),
('tte-11', 'Thu', 'p5', 'ece-3a', 'EE326', 'Circuits Laboratory', 'Dr. Ibrahim Khan', 'Circuits Lab', 'LAB', false, null, false),
('tte-12', 'Thu', 'p6', 'ece-3a', 'EE326', 'Circuits Laboratory', 'Dr. Ibrahim Khan', 'Circuits Lab', 'LAB', false, null, false) ON CONFLICT DO NOTHING;

INSERT INTO conflicts (id, severity, title, description, rule_code, affected, suggested_fixes, quality_impact, status) VALUES
('conf-1', 'critical', 'Combined section exceeds room capacity', 'CSE 3A + CSE 3B exceeds AI Lab capacity during Monday lab block.', 'HC-04', ARRAY['CS315', 'AI Lab', 'CSE 3A', 'CSE 3B'], ARRAY['Move to B-305 large hall', 'Split section back into parallel labs', 'Reassign to Thu P5-P6'], -12, 'open'),
('conf-2', 'high', 'Faculty overload on Tuesday', 'Prof. Sara Joseph is assigned five periods, breaching the configured daily cap.', 'HC-09', ARRAY['Prof. Sara Joseph', 'CS301', 'CS501'], ARRAY['Shift one theory block to Thursday P3', 'Swap with Dr. Farhan Alam''s advisory slot', 'Increase cap after dean approval'], -8, 'open'),
('conf-3', 'medium', 'Section compactness can improve', 'ECE 5A has a two-period idle gap between theory and lab sessions.', 'SC-01', ARRAY['ECE 5A', 'EE504'], ARRAY['Pull theory to P3', 'Push lab to P6-P7', 'Bundle with shared elective window'], -4, 'open') ON CONFLICT DO NOTHING;

INSERT INTO audit_trail (id, actor, action, target, timestamp, tone) VALUES
('evt-1', 'Ayesha Rahman', 'Published timetable', 'Spring 2026 Active', '13 min ago', 'success'),
('evt-2', 'Solver Worker', 'Completed partial regenerate', 'Draft version', '21 min ago', 'info'),
('evt-3', 'Prof. Sara Joseph', 'Updated availability', 'Tuesday slots', '48 min ago', 'warning'),
('evt-4', 'Import assistant', 'Loaded demo dataset', '9 sections / 15 courses', '1 hr ago', 'info') ON CONFLICT DO NOTHING;
