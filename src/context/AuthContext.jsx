import React, { createContext, useContext, useState, useEffect } from 'react';
import { switchUserRole, fetchCurrentUser } from '../services/api';

const AuthContext = createContext(null);

const USERS_BY_ROLE = {
  student: {
    id: 'stu_aditi',
    name: 'Aditi Sharma',
    email: 'aditi.sharma@campus.edu',
    role: 'student',
    department: 'CSE',
    semester_or_title: 'Sem 5',
    initials: 'AS'
  },
  teacher: {
    id: 'prof_rajesh',
    name: 'Prof. Rajesh Verma',
    email: 'rajesh.verma@campus.edu',
    role: 'teacher',
    department: 'CSE & AI',
    semester_or_title: 'Associate Professor / HOD',
    initials: 'RV'
  }
};

export function AuthProvider({ children }) {
  const [role, setRole] = useState(() => {
    return localStorage.getItem('campusresolve_role') || 'student';
  });

  const [user, setUser] = useState(() => USERS_BY_ROLE[role] || USERS_BY_ROLE.student);

  // Sync user object whenever role changes
  useEffect(() => {
    localStorage.setItem('campusresolve_role', role);
    setUser(USERS_BY_ROLE[role]);
    // Notify backend
    switchUserRole(role).catch(err => console.warn('Could not sync role to backend:', err));
  }, [role]);

  const switchRole = (newRole) => {
    if (newRole === 'student' || newRole === 'teacher') {
      setRole(newRole);
    }
  };

  const isTeacher = role === 'teacher';
  const isStudent = role === 'student';

  return (
    <AuthContext.Provider
      value={{
        role,
        user,
        switchRole,
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
