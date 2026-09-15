import React, { createContext, useContext, useState, useEffect } from 'react';
import { loginApi, registerApi, logoutApi, fetchCurrentUser, switchUserRole } from '../services/api';

const AuthContext = createContext(null);

export const DEMO_USERS = {
  student: {
    id: 'stu_rahul',
    name: 'Rahul Verma',
    email: 'rahul.verma@campus.edu',
    role: 'student',
    department: 'CSE',
    semester_or_title: 'Sem 5',
    initials: 'RV',
    token: 'token_stu_rahul_demo'
  },
  teacher: {
    id: 'prof_rajesh',
    name: 'Prof. Rajesh Verma',
    email: 'rajesh.verma@campus.edu',
    role: 'teacher',
    department: 'CSE & AI',
    semester_or_title: 'Associate Professor / HOD',
    initials: 'RV',
    token: 'token_prof_rajesh_demo'
  }
};

const TOKEN_KEY = 'campusresolve_token_v2';
const USER_KEY = 'campusresolve_user_v2';
const ROLE_KEY = 'campusresolve_role_v2';

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) || null);
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem(USER_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [role, setRole] = useState(() => localStorage.getItem(ROLE_KEY) || 'student');
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  const isAuthenticated = Boolean(user && token);

  // Sync to localStorage
  useEffect(() => {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);

    if (user) {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
      const normalizedRole = user.role === 'faculty' ? 'teacher' : user.role;
      setRole(normalizedRole);
      localStorage.setItem(ROLE_KEY, normalizedRole);
    } else {
      localStorage.removeItem(USER_KEY);
      localStorage.removeItem(ROLE_KEY);
    }
  }, [token, user]);

  // Validate session on mount
  useEffect(() => {
    let mounted = true;
    async function validateSession() {
      if (!token) return;
      try {
        setLoading(true);
        const freshUser = await fetchCurrentUser(token);
        if (mounted && freshUser) {
          setUser(freshUser);
          setRole(freshUser.role === 'faculty' ? 'teacher' : freshUser.role);
        }
      } catch (err) {
        console.warn('Session check warning (using cached user):', err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    validateSession();
    return () => { mounted = false; };
  }, [token]);

  const login = async ({ email, password, role: requestedRole }) => {
    setAuthError('');
    setLoading(true);

    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanPassword = (password || '').trim();
    const targetRole = requestedRole === 'faculty' ? 'teacher' : requestedRole;

    try {
      // 1. Attempt API Login
      const data = await loginApi({ email: cleanEmail, password: cleanPassword, role: targetRole });
      setUser(data.user);
      setToken(data.token);
      const userRole = data.user.role === 'faculty' ? 'teacher' : data.user.role;
      setRole(userRole);
      switchUserRole(userRole).catch(() => {});
      return data.user;
    } catch (err) {
      console.warn('Backend login call failed or offline, checking local demo matching:', err);

      // 2. Demo fallback matching
      const studentMatch = cleanEmail === DEMO_USERS.student.email && (cleanPassword === 'password123' || cleanPassword === '');
      const facultyMatch = cleanEmail === DEMO_USERS.teacher.email && (cleanPassword === 'password123' || cleanPassword === '');

      if (studentMatch && targetRole !== 'teacher') {
        const demoUser = DEMO_USERS.student;
        setUser(demoUser);
        setToken(demoUser.token);
        setRole('student');
        return demoUser;
      }

      if (facultyMatch && targetRole !== 'student') {
        const demoUser = DEMO_USERS.teacher;
        setUser(demoUser);
        setToken(demoUser.token);
        setRole('teacher');
        return demoUser;
      }

      // Generic fallback for any email during demo if password is provided
      if (cleanEmail && cleanPassword) {
        const isFacultyRole = targetRole === 'teacher' || targetRole === 'faculty';
        const fallbackUser = {
          id: isFacultyRole ? `prof_${cleanEmail.split('@')[0]}` : `stu_${cleanEmail.split('@')[0]}`,
          name: cleanEmail.split('@')[0].replace('.', ' ').replace(/\b\w/g, c => c.toUpperCase()),
          email: cleanEmail,
          role: isFacultyRole ? 'teacher' : 'student',
          department: isFacultyRole ? 'CSE & AI' : 'CSE',
          semester_or_title: isFacultyRole ? 'Assistant Professor' : 'Sem 5',
          initials: cleanEmail.slice(0, 2).toUpperCase(),
          token: `token_${cleanEmail}_${Date.now()}`
        };

        setUser(fallbackUser);
        setToken(fallbackUser.token);
        setRole(fallbackUser.role);
        return fallbackUser;
      }

      const msg = err.message || 'Invalid email or password. Please check your credentials.';
      setAuthError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  };

  const loginDemoUser = (roleType) => {
    setAuthError('');
    const targetKey = roleType === 'faculty' || roleType === 'teacher' ? 'teacher' : 'student';
    const demoUser = DEMO_USERS[targetKey];
    setUser(demoUser);
    setToken(demoUser.token);
    setRole(targetKey);
    switchUserRole(targetKey).catch(() => {});
    return demoUser;
  };

  const register = async (userData) => {
    setAuthError('');
    setLoading(true);

    try {
      const data = await registerApi(userData);
      setUser(data.user);
      setToken(data.token);
      const userRole = data.user.role === 'faculty' ? 'teacher' : data.user.role;
      setRole(userRole);
      return data.user;
    } catch (err) {
      console.warn('Backend register failed, registering locally:', err);
      const roleStr = userData.role === 'faculty' ? 'teacher' : (userData.role || 'student');
      
      if (roleStr === 'teacher' && (userData.faculty_access_code || '').trim() !== 'FACULTY2026') {
        const errMsg = 'Invalid Faculty Authorization Access Code. Faculty self-registration requires administrative verification code (FACULTY2026).';
        setAuthError(errMsg);
        throw new Error(errMsg);
      }

      const cleanName = (userData.name || 'Campus User').trim();
      const parts = cleanName.split(' ');
      const initials = parts.map(p => p[0]).join('').toUpperCase().slice(0, 2);

      const newUser = {
        id: `${roleStr === 'teacher' ? 'prof' : 'stu'}_${Date.now()}`,
        name: cleanName,
        email: userData.email,
        role: roleStr,
        department: userData.department || (roleStr === 'teacher' ? 'CSE & AI' : 'CSE'),
        semester_or_title: userData.semester_or_title || (roleStr === 'teacher' ? 'Assistant Professor' : 'Sem 5'),
        initials,
        token: `token_${Date.now()}`
      };

      setUser(newUser);
      setToken(newUser.token);
      setRole(roleStr);
      return newUser;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      if (token) await logoutApi(token);
    } catch (e) {
      console.warn('Logout notification error:', e);
    } finally {
      setUser(null);
      setToken(null);
      setRole('student');
      setAuthError('');
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      localStorage.removeItem(ROLE_KEY);
    }
  };

  const isTeacher = role === 'teacher' || role === 'faculty';
  const isStudent = role === 'student';

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        role,
        isAuthenticated,
        loading,
        authError,
        setAuthError,
        login,
        loginDemoUser,
        register,
        logout,
        isTeacher,
        isStudent
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
