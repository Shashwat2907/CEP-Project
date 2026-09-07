import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import StudentCompanion from '../components/StudentCompanion';
import FacultyConsole from '../components/FacultyConsole';
import AttendanceTeacherView from '../components/AttendanceTeacherView';
import AttendanceStudentView from '../components/AttendanceStudentView';
import IssueList from '../components/IssueList';
import PriorityLegend from '../components/PriorityLegend';
import LadderSummary from '../components/LadderSummary';
import { useAuth } from '../context/AuthContext';
import { Shield, Users, Phone, Mail, MapPin } from 'lucide-react';
import '../styles/dashboard.css';

export default function DashboardPage({ 
  onNavigateHome, 
  onOpenRaiseModal, 
  onSelectIssue 
}) {
  const [activeNav, setActiveNav] = useState('desk');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const { isTeacher } = useAuth();

  return (
    <div className="dashboard-layout">
      <Sidebar
        onNavigateHome={onNavigateHome}
        activeNav={activeNav}
        setActiveNav={setActiveNav}
        mobileOpen={mobileSidebarOpen}
        setMobileOpen={setMobileSidebarOpen}
      />

      <div className="dashboard-main">
        <Topbar
          onOpenRaiseModal={onOpenRaiseModal}
          onToggleMobileSidebar={() => setMobileSidebarOpen(prev => !prev)}
        />

        <section className="dashboard-content">
          {/* Main Content Router */}
          {activeNav === 'desk' ? (
            isTeacher ? (
              <FacultyConsole onSelectIssue={onSelectIssue} />
            ) : (
              <StudentCompanion onSelectIssue={onSelectIssue} />
            )
          ) : activeNav === 'attendance' ? (
            isTeacher ? (
              <AttendanceTeacherView />
            ) : (
              <AttendanceStudentView />
            )
          ) : activeNav === 'tickets' ? (
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
          ) : activeNav === 'directory' ? (
            <div className="directory-view">
              <div className="panel" style={{ padding: '1.4rem 1.6rem', marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Campus Authority Directory & Governance</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.86rem', marginTop: '0.2rem' }}>
                  Transparent departmental point-of-contact hierarchy and escalation matrix.
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
                <div className="panel" style={{ padding: '1.3rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.8rem' }}>
                    <span className="priority-dot Low"></span>
                    <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Tier 1: Class Representatives (CR)</h3>
                  </div>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.84rem', lineHeight: 1.5, marginBottom: '0.8rem' }}>
                    Responsible for classroom benches, whiteboards, markers, student ergonomics, and peer coordination.
                  </p>
                  <div style={{ background: 'var(--bg-subtle)', padding: '0.75rem', borderRadius: '6px', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    <div><strong>CSE Sem 5 CR:</strong> Rohan Mehta & Aditi Sharma</div>
                    <div style={{ color: 'var(--text-dim)' }}>Response SLA: Within 48 Hours</div>
                  </div>
                </div>

                <div className="panel" style={{ padding: '1.3rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.8rem' }}>
                    <span className="priority-dot High"></span>
                    <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Tier 2: Faculty Advisors / Class Teachers</h3>
                  </div>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.84rem', lineHeight: 1.5, marginBottom: '0.8rem' }}>
                    Responsible for projector equipment, AC/electrical circuits, Wi-Fi infrastructure, and academic lab computers.
                  </p>
                  <div style={{ background: 'var(--bg-subtle)', padding: '0.75rem', borderRadius: '6px', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    <div><strong>Faculty In-Charge:</strong> Prof. Rajesh Verma</div>
                    <div style={{ color: 'var(--text-dim)' }}>Office: Block A, Room 312 · ext. 4102</div>
                  </div>
                </div>

                <div className="panel" style={{ padding: '1.3rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.8rem' }}>
                    <span className="priority-dot Critical"></span>
                    <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Tier 3: Head of Department (HOD)</h3>
                  </div>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.84rem', lineHeight: 1.5, marginBottom: '0.8rem' }}>
                    Executive administrative oversight for severe safety hazards, laboratory outages, and unaddressed complaints.
                  </p>
                  <div style={{ background: 'var(--bg-subtle)', padding: '0.75rem', borderRadius: '6px', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    <div><strong>Department Head:</strong> Dr. K. S. Sundaram</div>
                    <div style={{ color: 'var(--text-dim)' }}>Office: Department Executive Wing, Room 401</div>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
