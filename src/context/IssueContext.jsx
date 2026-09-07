import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { INITIAL_ISSUES, STAGES } from '../data/mockData';
import { 
  fetchIssues, 
  createIssueApi, 
  resolveIssueApi, 
  escalateIssueApi, 
  upvoteIssueApi 
} from '../services/api';

const IssueContext = createContext(null);
const STORAGE_KEY = 'campusresolve_issues_v1';

export function IssueProvider({ children }) {
  const [issues, setIssues] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : INITIAL_ISSUES;
    } catch {
      return INITIAL_ISSUES;
    }
  });

  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [escalatedOnly, setEscalatedOnly] = useState(false);
  const [sortBy, setSortBy] = useState('recent');

  const [toast, setToast] = useState({ show: false, title: '', subtitle: '', type: 'success' });
  const [toastTimer, setToastTimer] = useState(null);

  // Load from backend on mount
  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        setLoading(true);
        const data = await fetchIssues();
        if (mounted && Array.isArray(data) && data.length > 0) {
          setIssues(data);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        }
      } catch (err) {
        console.warn('Backend issues fetch failed, using local storage cache:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  const showToast = (title, subtitle, type = 'success') => {
    if (toastTimer) clearTimeout(toastTimer);
    setToast({ show: true, title, subtitle, type });
    const timer = setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }));
    }, 3500);
    setToastTimer(timer);
  };

  const isEscalated = (issue) => {
    return issue.stage > 0 && issue.status !== 'Resolved';
  };

  const addIssue = async ({ category, priority, title, description, imagePreview }) => {
    const isCritical = priority === 'Critical';

    try {
      const created = await createIssueApi({ category, priority, title, description, imagePreview });
      setIssues(prev => [created, ...prev]);
      showToast(
        'Issue Submitted to Backend',
        isCritical
          ? `#${created.id} routed directly to the HOD.`
          : `#${created.id} routed to Class Representative (CR).`
      );
      return created;
    } catch (e) {
      console.warn('Backend call failed, recording locally:', e);
      const maxId = issues.reduce((max, i) => Math.max(max, i.id), 1000);
      const newIssue = {
        id: maxId + 1,
        category,
        priority,
        title,
        description,
        imagePreview: imagePreview || null,
        status: 'Pending',
        stage: isCritical ? 2 : 0,
        daysElapsed: 0,
        date: new Date().toISOString().slice(0, 10),
        reportedBy: 'Aditi Sharma',
        upvotes: 1
      };
      setIssues(prev => [newIssue, ...prev]);
      showToast(
        'Issue Submitted (Offline)',
        isCritical
          ? `#${newIssue.id} routed directly to the HOD.`
          : `#${newIssue.id} routed to your Class Representative (CR).`
      );
      return newIssue;
    }
  };

  const resolveIssue = async (id) => {
    try {
      await resolveIssueApi(id);
    } catch (err) {
      console.warn('Backend resolve call failed, updating local state:', err);
    }
    setIssues(prev =>
      prev.map(item => {
        if (item.id === id) {
          return { ...item, status: 'Resolved' };
        }
        return item;
      })
    );
    showToast('Issue Resolved', `#${id} marked as resolved.`, 'success');
  };

  const escalateIssue = async (id) => {
    let nextStageName = '';
    try {
      const res = await escalateIssueApi(id);
      nextStageName = STAGES[res.stage] || 'next tier';
    } catch (err) {
      console.warn('Backend escalate call failed, updating local state:', err);
    }

    setIssues(prev =>
      prev.map(item => {
        if (item.id === id) {
          const nextStage = Math.min(item.stage + 1, STAGES.length - 1);
          if (!nextStageName) nextStageName = STAGES[nextStage];
          return {
            ...item,
            stage: nextStage,
            status: 'InProgress',
            daysElapsed: 0
          };
        }
        return item;
      })
    );
    showToast('Issue Escalated', `#${id} escalated to ${nextStageName}.`, 'warning');
  };

  const toggleUpvote = async (id) => {
    try {
      await upvoteIssueApi(id);
    } catch (err) {
      console.warn('Backend upvote failed:', err);
    }
    setIssues(prev =>
      prev.map(item => {
        if (item.id === id) {
          return { ...item, upvotes: (item.upvotes || 0) + 1 };
        }
        return item;
      })
    );
  };

  const resetFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setPriorityFilter('all');
    setEscalatedOnly(false);
    setSortBy('recent');
  };

  // Computed metrics
  const stats = useMemo(() => {
    const total = issues.length;
    const pending = issues.filter(i => i.status === 'Pending').length;
    const progress = issues.filter(i => i.status === 'InProgress').length;
    const resolved = issues.filter(i => i.status === 'Resolved').length;
    const escalated = issues.filter(isEscalated).length;

    const ladderCounts = STAGES.map((_, idx) =>
      issues.filter(i => i.stage === idx && i.status !== 'Resolved').length
    );

    return { total, pending, progress, resolved, escalated, ladderCounts };
  }, [issues]);

  // Filtered & sorted issues
  const filteredIssues = useMemo(() => {
    let list = issues.filter(issue => {
      if (search) {
        const q = search.toLowerCase();
        const matchTitle = issue.title.toLowerCase().includes(q);
        const matchCategory = issue.category.toLowerCase().includes(q);
        const matchId = String(issue.id).includes(q);
        const matchDesc = issue.description.toLowerCase().includes(q);
        if (!matchTitle && !matchCategory && !matchId && !matchDesc) return false;
      }
      if (statusFilter !== 'all' && issue.status !== statusFilter) return false;
      if (priorityFilter !== 'all' && issue.priority !== priorityFilter) return false;
      if (escalatedOnly && !isEscalated(issue)) return false;
      return true;
    });

    const priorityRank = { Critical: 0, High: 1, Medium: 2, Low: 3 };

    if (sortBy === 'recent') {
      list = [...list].sort((a, b) => b.id - a.id);
    } else if (sortBy === 'oldest') {
      list = [...list].sort((a, b) => a.id - b.id);
    } else if (sortBy === 'priority') {
      list = [...list].sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority]);
    } else if (sortBy === 'upvotes') {
      list = [...list].sort((a, b) => (b.upvotes || 0) - (a.upvotes || 0));
    }

    return list;
  }, [issues, search, statusFilter, priorityFilter, escalatedOnly, sortBy]);

  return (
    <IssueContext.Provider
      value={{
        issues,
        filteredIssues,
        stats,
        loading,
        search,
        setSearch,
        statusFilter,
        setStatusFilter,
        priorityFilter,
        setPriorityFilter,
        escalatedOnly,
        setEscalatedOnly,
        sortBy,
        setSortBy,
        resetFilters,
        addIssue,
        resolveIssue,
        escalateIssue,
        toggleUpvote,
        isEscalated,
        toast,
        showToast
      }}
    >
      {children}
    </IssueContext.Provider>
  );
}

export function useIssues() {
  const context = useContext(IssueContext);
  if (!context) {
    throw new Error('useIssues must be used within an IssueProvider');
  }
  return context;
}
