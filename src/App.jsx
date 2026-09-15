import React, { useState, useEffect } from 'react';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import RaiseIssueModal from './components/RaiseIssueModal';
import IssueDetailModal from './components/IssueDetailModal';
import Toast from './components/Toast';
import { IssueProvider, useIssues } from './context/IssueContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LostFoundProvider } from './context/LostFoundContext';

function AppContent() {
  const { isAuthenticated, user, isTeacher, isStudent } = useAuth();
  const { showToast } = useIssues();

  const [currentView, setCurrentView] = useState(() => {
    const hash = window.location.hash.toLowerCase();
    if (hash.includes('login')) return 'login';
    if (hash.includes('dashboard') || hash.includes('student') || hash.includes('faculty') || hash.includes('lost-found')) {
      return 'dashboard';
    }
    return 'landing';
  });

  const [raiseModalOpen, setRaiseModalOpen] = useState(false);
  const [selectedIssueId, setSelectedIssueId] = useState(null);

  const { issues } = useIssues();
  const activeIssue = issues.find(i => i.id === selectedIssueId) || null;

  // Protected Hash Routing & Guard
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.toLowerCase();

      if (hash.includes('login')) {
        setCurrentView('login');
        return;
      }

      const isProtected = 
        hash.includes('dashboard') || 
        hash.includes('student') || 
        hash.includes('faculty') || 
        hash.includes('lost-found') ||
        hash.includes('tickets') ||
        hash.includes('attendance');

      if (isProtected) {
        if (!isAuthenticated) {
          window.location.hash = '#login';
          setCurrentView('login');
          return;
        }

        // Cross-role guard
        if (isStudent && hash.includes('faculty')) {
          showToast('Access Denied', 'Faculty authorization required. Redirected to Student Companion.', 'error');
          window.location.hash = '#student/dashboard';
          setCurrentView('dashboard');
          return;
        }

        if (isTeacher && hash.includes('student')) {
          window.location.hash = '#faculty/dashboard';
          setCurrentView('dashboard');
          return;
        }

        setCurrentView('dashboard');
      } else {
        setCurrentView('landing');
      }
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [isAuthenticated, isTeacher, isStudent]);

  const navigateToDashboard = () => {
    if (!isAuthenticated) {
      window.location.hash = '#login';
      setCurrentView('login');
      return;
    }

    const defaultHash = isTeacher ? '#faculty/dashboard' : '#student/dashboard';
    window.location.hash = defaultHash;
    setCurrentView('dashboard');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navigateToLogin = () => {
    window.location.hash = '#login';
    setCurrentView('login');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navigateToHome = () => {
    window.location.hash = '';
    setCurrentView('landing');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      {currentView === 'landing' ? (
        <LandingPage
          onNavigateDashboard={navigateToDashboard}
          onNavigateLogin={navigateToLogin}
          onOpenRaiseModal={() => setRaiseModalOpen(true)}
        />
      ) : currentView === 'login' ? (
        <LoginPage
          onLoginSuccess={navigateToDashboard}
          onNavigateHome={navigateToHome}
        />
      ) : (
        <DashboardPage
          onNavigateHome={navigateToHome}
          onOpenRaiseModal={() => setRaiseModalOpen(true)}
          onSelectIssue={(issue) => setSelectedIssueId(issue.id)}
          onLogout={navigateToLogin}
        />
      )}

      {/* Modals & Popups */}
      <RaiseIssueModal
        isOpen={raiseModalOpen}
        onClose={() => setRaiseModalOpen(false)}
      />

      <IssueDetailModal
        issue={activeIssue}
        onClose={() => setSelectedIssueId(null)}
      />

      <Toast />
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <IssueProvider>
        <LostFoundProvider>
          <AppContent />
        </LostFoundProvider>
      </IssueProvider>
    </AuthProvider>
  );
}


