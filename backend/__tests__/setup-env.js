import { vi } from 'vitest';
vi.stubEnv('ADMIN_PASSWORD', 'admin123');
vi.stubEnv('COMMITTEE_PASSWORD', 'committee123');
vi.stubEnv('AD_URL', 'ldap://mockserver');
vi.stubEnv('AD_USER_BIND_DN', 'uid=${username},ou=students,dc=example,dc=com');
vi.stubEnv('AD_DOMAIN', 'EXAMPLE');
