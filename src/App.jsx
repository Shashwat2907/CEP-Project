import React, { useState, useEffect } from 'react';
import LandingPage from './pages/LandingPage';
import DashboardPage from './pages/DashboardPage';
import RaiseIssueModal from './components/RaiseIssueModal';
import IssueDetailModal from './components/IssueDetailModal';
import Toast from './components/Toast';
import { IssueProvider, useIssues } from './context/IssueContext';
import { AuthProvider } from './context/AuthContext';

function AppContent() {
  const [currentView, setCurrentView] = useState(() => {
    return window.location.hash.includes('dashboard') ? 'dashboard' : 'landing';
  });

  const [raiseModalOpen, setRaiseModalOpen] = useState(false);
  const [selectedIssueId, setSelectedIssueId] = useState(null);

  const { issues } = useIssues();

  // Find the freshest state for the selected issue
  const activeIssue = issues.find(i => i.id === selectedIssueId) || null;

  useEffect(() => {
    const handleHashChange = () => {
      if (window.location.hash.includes('dashboard')) {
        setCurrentView('dashboard');
      } else {
        setCurrentView('landing');
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigateToDashboard = () => {
    window.location.hash = '#dashboard';
    setCurrentView('dashboard');
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
          onOpenRaiseModal={() => setRaiseModalOpen(true)}
        />
      ) : (
        <DashboardPage
          onNavigateHome={navigateToHome}
          onOpenRaiseModal={() => setRaiseModalOpen(true)}
          onSelectIssue={(issue) => setSelectedIssueId(issue.id)}
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
        <AppContent />
      </IssueProvider>
    </AuthProvider>
  );
}
