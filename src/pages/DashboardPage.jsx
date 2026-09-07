import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import StatsGrid from '../components/StatsGrid';
import IssueList from '../components/IssueList';
import PriorityLegend from '../components/PriorityLegend';
import LadderSummary from '../components/LadderSummary';
import AttendanceTeacherView from '../components/AttendanceTeacherView';
import AttendanceStudentView from '../components/AttendanceStudentView';
import { useAuth } from '../context/AuthContext';
import '../styles/dashboard.css';

export default function DashboardPage({ 
  onNavigateHome, 
  onOpenRaiseModal, 
  onSelectIssue 
}) {
  const [activeNav, setActiveNav] = useState('attendance'); // Start with attendance for immediate preview
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const { isTeacher } = useAuth();

  return (
    <div className="dashboard-layout">
      <Sidebar
        onNavigateHome={onNavigateHome}
        onOpenRaiseModal={onOpenRaiseModal}
        activeNav={activeNav}
        setActiveNav={setActiveNav}
        mobileOpen={mobileSidebarOpen}
        setMobileOpen={setMobileSidebarOpen}
      />

      <div className="dashboard-main">
        <Topbar
          onOpenRaiseModal={onOpenRaiseModal}
          onToggleMobileSidebar={() => setMobileSidebarOpen(prev => !prev)}
          activeNav={activeNav}
          setActiveNav={setActiveNav}
        />

        <section className="dashboard-content">
          {activeNav === 'attendance' ? (
            isTeacher ? (
              <AttendanceTeacherView />
            ) : (
              <AttendanceStudentView />
            )
          ) : (
            <>
              <StatsGrid />

              <div className="content-split">
                <IssueList 
                  onSelectIssue={onSelectIssue} 
                  onOpenRaiseModal={onOpenRaiseModal} 
                />

                <div className="side-panel">
                  <PriorityLegend />
                  <LadderSummary />
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
