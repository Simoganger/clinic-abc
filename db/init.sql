-- Schema + seed data for the Patient demo
CREATE TABLE IF NOT EXISTS patients (
    id             SERIAL PRIMARY KEY,
    first_name     VARCHAR(50)  NOT NULL,
    last_name      VARCHAR(50)  NOT NULL,
    date_of_birth  DATE         NOT NULL,
    gender         VARCHAR(10)  NOT NULL CHECK (gender IN ('male', 'female', 'other')),
    blood_type     VARCHAR(3)   CHECK (blood_type IN ('A+','A-','B+','B-','AB+','AB-','O+','O-')),
    email          VARCHAR(100) UNIQUE,
    phone          VARCHAR(20),
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

INSERT INTO patients (first_name, last_name, date_of_birth, gender, blood_type, email, phone) VALUES
    ('Maria',  'Rossi',    '1985-03-12', 'female', 'A+',  'maria.rossi@example.com',   '+39 333 1234567'),
    ('John',   'Smith',    '1972-11-30', 'male',   'O-',  'john.smith@example.com',    '+44 7700 900123'),
    ('Aiko',   'Tanaka',   '1994-07-05', 'female', 'B+',  'aiko.tanaka@example.com',   '+81 90 1234 5678'),
    ('Lucas',  'Martin',   '2001-01-22', 'male',   'AB+', 'lucas.martin@example.com',  '+33 6 12 34 56 78'),
    ('Sam',    'Taylor',   '1968-09-15', 'other',  'O+',  'sam.taylor@example.com',    '+1 555 0100');
