import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { useAuth } from './AuthContext';
import { useIssues } from './IssueContext';
import { 
  fetchLostFoundItems, 
  createLostFoundItemApi, 
  claimLostFoundItemApi, 
  updateLostFoundStatusApi, 
  deleteLostFoundItemApi 
} from '../services/api';

const LostFoundContext = createContext(null);
const STORAGE_KEY = 'campusresolve_lost_found_v1';

export const INITIAL_LOST_FOUND_ITEMS = [
  {
    id: 1,
    type: "FOUND",
    title: "AirPods Pro (2nd Gen)",
    description: "White case with small scratch on lid. Left near study desk #14.",
    category: "Electronics",
    location: "Central Library",
    date: "2026-09-15",
    contact: "Library Front Desk",
    imageUrl: "https://images.unsplash.com/photo-1606841837239-c5a1a4a07af7?w=600&h=500&fit=crop&auto=format",
    status: "Active",
    reportedBy: "Arjun Mehta",
    reportedById: "stu_arjun",
    createdAt: "2026-09-15 08:30:00",
    claimedBy: null,
    claimNotes: null
  },
  {
    id: 2,
    type: "LOST",
    title: "Black Leather Wallet",
    description: "Bifold wallet with student ID, driving license and credit cards.",
    category: "Cards & IDs",
    location: "Canteen Block A",
    date: "2026-09-14",
    contact: "rahul.verma@campus.edu",
    imageUrl: "https://images.unsplash.com/photo-1601592996763-f05c9c80a7f1?w=600&h=500&fit=crop&auto=format",
    status: "Active",
    reportedBy: "Rahul Verma",
    reportedById: "stu_rahul",
    createdAt: "2026-09-14 14:15:00",
    claimedBy: null,
    claimNotes: null
  },
  {
    id: 3,
    type: "FOUND",
    title: "Room Key Ring with Torch",
    description: "3 silver keys on a red carabiner clip with a mini LED torch.",
    category: "Keys",
    location: "Hostel Block C",
    date: "2026-09-14",
    contact: "Warden Desk",
    imageUrl: "https://images.unsplash.com/photo-1741156386380-0236c72eb6f9?w=600&h=500&fit=crop&auto=format",
    status: "Active",
    reportedBy: "Mei Ling",
    reportedById: "stu_mei",
    createdAt: "2026-09-14 18:00:00",
    claimedBy: null,
    claimNotes: null
  },
  {
    id: 4,
    type: "LOST",
    title: "Navy Canvas Backpack",
    description: "Has a Patagonia patch on front pocket. Contains MacBook Pro 14 inch.",
    category: "Bags",
    location: "Sports Complex",
    date: "2026-09-13",
    contact: "9876543210",
    imageUrl: "https://images.unsplash.com/photo-1745273619794-efe47c73826c?w=600&h=500&fit=crop&auto=format",
    status: "Claimed",
    reportedBy: "Daniel Kumar",
    reportedById: "stu_daniel",
    createdAt: "2026-09-13 17:45:00",
    claimedBy: "Rahul Verma",
    claimNotes: "Submitted serial number match"
  },
  {
    id: 5,
    type: "FOUND",
    title: "Engineering Mechanics Textbook",
    description: "5th edition Hibbeler. Name 'Rohan V.' written on inside cover.",
    category: "Books",
    location: "Lecture Hall A",
    date: "2026-09-12",
    contact: "LH-A Desk",
    imageUrl: "https://images.unsplash.com/photo-1770235622334-7b721261a230?w=600&h=500&fit=crop&auto=format",
    status: "Active",
    reportedBy: "Prof. Rajesh Verma",
    reportedById: "prof_rajesh",
    createdAt: "2026-09-12 11:20:00",
    claimedBy: null,
    claimNotes: null
  },
  {
    id: 6,
    type: "FOUND",
    title: "Yellow Columbia Rain Jacket",
    description: "Size M waterproof windbreaker left on chair in dining area.",
    category: "Clothing",
    location: "Canteen Block B",
    date: "2026-09-12",
    contact: "Canteen Staff",
    imageUrl: "https://images.unsplash.com/photo-1629987464829-2d6bd11b5826?w=600&h=500&fit=crop&auto=format",
    status: "Active",
    reportedBy: "Sanjay Rao",
    reportedById: "stu_sanjay",
    createdAt: "2026-09-12 16:10:00",
    claimedBy: null,
    claimNotes: null
  },
  {
    id: 7,
    type: "LOST",
    title: "140W USB-C MagSafe Charger",
    description: "Apple white braided cable, slightly frayed near connector.",
    category: "Electronics",
    location: "Central Library",
    date: "2026-09-11",
    contact: "rahul.verma@campus.edu",
    imageUrl: "https://images.unsplash.com/photo-1572569511254-d8f925fe2cbb?w=600&h=500&fit=crop&auto=format",
    status: "Active",
    reportedBy: "Rahul Verma",
    reportedById: "stu_rahul",
    createdAt: "2026-09-11 10:00:00",
    claimedBy: null,
    claimNotes: null
  },
  {
    id: 8,
    type: "FOUND",
    title: "Round Gold Frame Glasses",
    description: "Prescription glasses found near counter in Canteen A.",
    category: "Other",
    location: "Canteen Block A",
    date: "2026-09-10",
    contact: "Security Desk",
    imageUrl: "https://images.unsplash.com/photo-1610482599307-b858c8791013?w=600&h=500&fit=crop&auto=format",
    status: "Returned",
    reportedBy: "Security Guard Ram",
    reportedById: "sec_ram",
    createdAt: "2026-09-10 09:15:00",
    claimedBy: "Rohan Verma",
    claimNotes: "Verified prescription & collected"
  }
];

export const LF_CATEGORIES = [
  "Electronics",
  "Bags",
  "Cards & IDs",
  "Keys",
  "Clothing",
  "Books",
  "Other"
];

export const LF_LOCATIONS = [
  "Central Library",
  "Canteen Block A",
  "Canteen Block B",
  "Hostel Block A",
  "Hostel Block B",
  "Hostel Block C",
  "Sports Complex",
  "Main Gate",
  "Admin Block",
  "Lecture Hall A"
];

export function LostFoundProvider({ children }) {
  const { user } = useAuth();
  const { showToast } = useIssues();

  const [items, setItems] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : INITIAL_LOST_FOUND_ITEMS;
    } catch {
      return INITIAL_LOST_FOUND_ITEMS;
    }
  });

  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL'); // 'ALL' | 'LOST' | 'FOUND'
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [locationFilter, setLocationFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'Active' | 'Claimed' | 'Returned'
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'mine' | 'returned'

  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportModalType, setReportModalType] = useState('LOST'); // 'LOST' | 'FOUND'
  const [selectedItemId, setSelectedItemId] = useState(null);

  // Sync to LocalStorage on change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.warn('Could not save lost & found to localStorage:', e);
    }
  }, [items]);

  // Load from backend on mount
  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        setLoading(true);
        const data = await fetchLostFoundItems();
        if (mounted && Array.isArray(data) && data.length > 0) {
          setItems(data);
        }
      } catch (err) {
        console.warn('Backend lost & found fetch failed, using local storage cache:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  const openReportModal = (type = 'LOST') => {
    setReportModalType(type);
    setReportModalOpen(true);
  };

  const closeReportModal = () => {
    setReportModalOpen(false);
  };

  const selectedItem = useMemo(() => {
    return items.find(i => i.id === selectedItemId) || null;
  }, [items, selectedItemId]);

  const addReport = async (reportData) => {
    const userHeaders = {
      'X-User-Name': user?.name || 'Rahul Verma',
      'X-User-Id': user?.id || 'stu_rahul'
    };

    try {
      const created = await createLostFoundItemApi(reportData, userHeaders);
      setItems(prev => [created, ...prev]);
      showToast(
        `${created.type === 'LOST' ? 'Lost' : 'Found'} Item Reported`,
        `"${created.title}" has been published to Lost & Found.`,
        'success'
      );
      return created;
    } catch (err) {
      console.warn('Backend create failed, storing locally:', err);
      const maxId = items.reduce((max, i) => Math.max(max, Number(i.id) || 0), 0);
      const newItem = {
        id: maxId + 1,
        type: reportData.type || 'LOST',
        title: reportData.title,
        description: reportData.description,
        category: reportData.category || 'Other',
        location: reportData.location || 'Campus Main Gate',
        date: reportData.date || new Date().toISOString().slice(0, 10),
        contact: reportData.contact || user?.email || 'rahul.verma@campus.edu',
        imageUrl: reportData.imageUrl || null,
        status: 'Active',
        reportedBy: user?.name || 'Rahul Verma',
        reportedById: user?.id || 'stu_rahul',
        createdAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
        claimedBy: null,
        claimNotes: null
      };
      setItems(prev => [newItem, ...prev]);
      showToast(
        `${newItem.type === 'LOST' ? 'Lost' : 'Found'} Item Reported (Offline)`,
        `"${newItem.title}" has been recorded locally.`,
        'success'
      );
      return newItem;
    }
  };

  const claimItem = async (id, claimNotes, contactInfo) => {
    const userHeaders = {
      'X-User-Name': user?.name || 'Rahul Verma'
    };

    try {
      await claimLostFoundItemApi(id, { claimNotes, contactInfo }, userHeaders);
    } catch (err) {
      console.warn('Backend claim failed, updating locally:', err);
    }

    setItems(prev => prev.map(item => {
      if (item.id === id) {
        return {
          ...item,
          status: 'Claimed',
          claimedBy: user?.name || 'Rahul Verma',
          claimNotes: claimNotes || 'Claim submitted by student'
        };
      }
      return item;
    }));

    showToast('Claim Submitted', 'The reporter has been notified of your claim.', 'success');
  };

  const updateItemStatus = async (id, newStatus) => {
    try {
      await updateLostFoundStatusApi(id, newStatus);
    } catch (err) {
      console.warn('Backend status update failed, updating locally:', err);
    }

    setItems(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, status: newStatus };
      }
      return item;
    }));

    showToast('Status Updated', `Item #${id} marked as ${newStatus}.`, 'success');
  };

  const deleteReport = async (id) => {
    try {
      await deleteLostFoundItemApi(id);
    } catch (err) {
      console.warn('Backend delete failed, removing locally:', err);
    }

    setItems(prev => prev.filter(item => item.id !== id));
    if (selectedItemId === id) setSelectedItemId(null);
    showToast('Report Deleted', `Report #${id} has been removed.`, 'info');
  };

  const resetFilters = () => {
    setSearchQuery('');
    setTypeFilter('ALL');
    setCategoryFilter('ALL');
    setLocationFilter('ALL');
    setStatusFilter('ALL');
    setActiveTab('all');
  };

  // Filtered list computed
  const filteredItems = useMemo(() => {
    const uId = user?.id || '';
    const uName = user?.name || '';
    return items.filter(item => {
      // Tab filter
      if (activeTab === 'mine') {
        const isOwner = (uId && item.reportedById === uId) || (uName && item.reportedBy === uName);
        const isClaimer = uName && item.claimedBy === uName;
        if (!isOwner && !isClaimer) return false;
      } else if (activeTab === 'returned') {
        if (item.status !== 'Returned') return false;
      }

      // Text search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = item.title.toLowerCase().includes(q);
        const matchDesc = item.description.toLowerCase().includes(q);
        const matchLoc = item.location.toLowerCase().includes(q);
        const matchCat = item.category.toLowerCase().includes(q);
        if (!matchTitle && !matchDesc && !matchLoc && !matchCat) return false;
      }

      // Type filter (LOST / FOUND)
      if (typeFilter !== 'ALL' && item.type !== typeFilter) return false;

      // Category filter
      if (categoryFilter !== 'ALL' && item.category !== categoryFilter) return false;

      // Location filter
      if (locationFilter !== 'ALL' && item.location !== locationFilter) return false;

      // Status filter
      if (statusFilter !== 'ALL' && item.status !== statusFilter) return false;

      return true;
    });
  }, [items, searchQuery, typeFilter, categoryFilter, locationFilter, statusFilter, activeTab, user]);

  // Statistics computed
  const stats = useMemo(() => {
    const uId = user?.id || '';
    const uName = user?.name || '';
    const total = items.length;
    const lostCount = items.filter(i => i.type === 'LOST').length;
    const foundCount = items.filter(i => i.type === 'FOUND').length;
    const activeCount = items.filter(i => i.status === 'Active').length;
    const claimedCount = items.filter(i => i.status === 'Claimed').length;
    const returnedCount = items.filter(i => i.status === 'Returned').length;
    const myCount = items.filter(i => (uId && i.reportedById === uId) || (uName && i.reportedBy === uName) || (uName && i.claimedBy === uName)).length;

    return {
      total,
      lostCount,
      foundCount,
      activeCount,
      claimedCount,
      returnedCount,
      myCount
    };
  }, [items, user]);

  return (
    <LostFoundContext.Provider
      value={{
        items,
        filteredItems,
        stats,
        loading,
        searchQuery,
        setSearchQuery,
        typeFilter,
        setTypeFilter,
        categoryFilter,
        setCategoryFilter,
        locationFilter,
        setLocationFilter,
        statusFilter,
        setStatusFilter,
        activeTab,
        setActiveTab,
        resetFilters,
        reportModalOpen,
        reportModalType,
        openReportModal,
        closeReportModal,
        selectedItemId,
        setSelectedItemId,
        selectedItem,
        addReport,
        claimItem,
        updateItemStatus,
        deleteReport
      }}
    >
      {children}
    </LostFoundContext.Provider>
  );
}

export function useLostFound() {
  const context = useContext(LostFoundContext);
  if (!context) {
    throw new Error('useLostFound must be used within a LostFoundProvider');
  }
  return context;
}
