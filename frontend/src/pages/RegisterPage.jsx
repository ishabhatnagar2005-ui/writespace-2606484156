/** Create only regular local demo accounts with field-associated feedback. */
import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { Link, useNavigate } from 'react-router-dom';
import { register } from '../utils/auth.js';

const fields = [
  ['displayName', 'Display Name', 'text', 'nickname'],
  ['username', 'Username', 'text', 'username'],
  ['password', 'Password', 'password', 'new-password'],
  ['confirmPassword', 'Confirm Password', 'password', 'new-password'],
];

/** Persist account and session before reporting successful registration.
 * Args:
 *   onSessionChange: Application identity updater.
 * Returns:
 *   Four-field demo form with inline errors and plaintext warning.
 */
export default function RegisterPage({ onSessionChange }) {
  const [values, setValues] = useState({ displayName: '', username: '', password: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});
  const [failure, setFailure] = useState('');
  const navigate = useNavigate();
  useEffect(() => { document.title = 'Create an account · WriteSpace'; }, []);

  /** Validate and create on activation, surfacing partial-write uncertainty. */
  function handleSubmit(event) {
    event.preventDefault();
    setFailure('');
    setErrors({});
    let result;
    try {
      result = register(values);
    } catch {
      setFailure('Could not complete registration. Browser storage is unavailable. Your account may have been saved, but you have not been signed in.');
      return;
    }
    if (result.errors) {
      setErrors(result.errors);
      return;
    }
    onSessionChange(result.session);
    navigate('/blogs');
  }

  return (
    <main id="main-content" className="page-container py-16 sm:py-24">
      <div className="mx-auto max-w-md">
        <h1 className="text-3xl">Make space for your words.</h1>
        <p className="mb-8 mt-4 text-foreground-muted">Create a demo account in this browser.</p>
        <form onSubmit={handleSubmit} noValidate className="space-y-6">
          {fields.map(([name, label, type, autoComplete]) => (
            <div key={name}>
              <label htmlFor={`register-${name}`} className="mb-2 block font-medium">{label}</label>
              <input
                id={`register-${name}`} name={name} type={type} autoComplete={autoComplete}
                required aria-required="true" className={`w-full ${errors[name] ? 'border-error' : ''}`}
                value={values[name]} onChange={(event) => setValues({ ...values, [name]: event.target.value })}
                aria-invalid={Boolean(errors[name])} aria-describedby={errors[name] ? `register-${name}-error` : undefined}
              />
              {errors[name] && (
                <p id={`register-${name}-error`} role="alert" className="mt-2 text-sm text-error">{errors[name]}</p>
              )}
            </div>
          ))}
          {failure && <p role="alert" className="text-sm text-error">{failure}</p>}
          <button type="submit" className="button-primary w-full">Create account</button>
        </form>
        <p className="mt-6 text-sm">Already have an account? <Link className="text-link" to="/login">Log in</Link></p>
        <aside className="mt-10 border-t border-border pt-6 text-sm text-foreground-muted" aria-label="Demo account warning">
          <p>Browser-local demo only. Passwords are stored in plaintext in localStorage. Never use real credentials or sensitive information.</p>
          <p className="mt-3">Client-side role checks are not secure authorization. Accounts and sessions are not shared across browsers or devices.</p>
        </aside>
      </div>
    </main>
  );
}
RegisterPage.propTypes = { onSessionChange: PropTypes.func.isRequired };
