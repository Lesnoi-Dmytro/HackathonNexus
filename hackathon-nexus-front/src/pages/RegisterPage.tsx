import { type FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { register, type UserRole } from '../api/auth';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../shared/ui/Button';
import { Input } from '../shared/ui/Input';
import { Select } from '../shared/ui/Select';
import styles from './AuthPage.module.css';

const ROLE_OPTIONS = [
  { value: 'participant', label: 'Participant' },
  { value: 'hackathon-admin', label: 'Hackathon Admin' },
];

export function RegisterPage() {
  const navigate = useNavigate();
  const { setAuth } = useAuth();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('participant');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const { accessToken, user } = await register({ firstName, lastName, email, password, role });
      setAuth(accessToken, user);
      navigate('/hackathons', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>Create account</h1>
        <p className={styles.subtitle}>Join Hackathon Nexus</p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.row}>
            <Input
              label="First name"
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              autoComplete="given-name"
              required
            />
            <Input
              label="Last name"
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              autoComplete="family-name"
              required
            />
          </div>
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            minLength={8}
            required
          />
          <Select
            label="Role"
            value={role}
            onValueChange={(v) => setRole(v as UserRole)}
            options={ROLE_OPTIONS}
          />

          {error && <p className={styles.error}>{error}</p>}

          <Button type="submit" size="lg" disabled={isSubmitting} className={styles.submit}>
            {isSubmitting ? 'Creating account…' : 'Create account'}
          </Button>
        </form>

        <p className={styles.footer}>
          Already have an account?{' '}
          <Link to="/login" className={styles.link}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
