const GENDERS = ['male', 'female', 'other'];
const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[+\d][\d\s\-()]{5,19}$/;

/**
 * Validates and normalises a patient payload.
 * Returns { value, errors } — errors is an object keyed by field name.
 */
function validatePatient(body = {}) {
  const errors = {};
  const trim = (v) => (typeof v === 'string' ? v.trim() : v);

  const value = {
    first_name: trim(body.first_name),
    last_name: trim(body.last_name),
    date_of_birth: trim(body.date_of_birth),
    gender: trim(body.gender),
    blood_type: trim(body.blood_type) || null,
    email: trim(body.email) || null,
    phone: trim(body.phone) || null,
  };

  if (!value.first_name || value.first_name.length > 50)
    errors.first_name = 'First name is required (max 50 chars)';

  if (!value.last_name || value.last_name.length > 50)
    errors.last_name = 'Last name is required (max 50 chars)';

  if (!value.date_of_birth || !/^\d{4}-\d{2}-\d{2}$/.test(value.date_of_birth)) {
    errors.date_of_birth = 'Date of birth is required (YYYY-MM-DD)';
  } else {
    const dob = new Date(value.date_of_birth);
    if (isNaN(dob) || dob > new Date()) errors.date_of_birth = 'Date of birth must be a valid past date';
  }

  if (!GENDERS.includes(value.gender))
    errors.gender = `Gender must be one of: ${GENDERS.join(', ')}`;

  if (value.blood_type && !BLOOD_TYPES.includes(value.blood_type))
    errors.blood_type = `Blood type must be one of: ${BLOOD_TYPES.join(', ')}`;

  if (value.email && (!EMAIL_RE.test(value.email) || value.email.length > 100))
    errors.email = 'Email is not valid';

  if (value.phone && !PHONE_RE.test(value.phone))
    errors.phone = 'Phone is not valid';

  return { value, errors };
}

module.exports = { validatePatient };
