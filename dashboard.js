document.addEventListener('DOMContentLoaded', () => {

    /* =========================================================
       DATA
       Stage order mirrors the escalation ladder on the homepage:
       CR -> Class Teacher -> HOD
       ========================================================= */

    const STAGES = ['CR', 'Class Teacher', 'HOD'];

    let issues = [
        {
            id: 1042, category: 'Projector', title: 'Projector not turning on in Room 204',
            description: 'Bulb seems dead, tried two different HDMI cables. Blocking the whole first period.',
            priority: 'High', status: 'InProgress', stage: 1, daysElapsed: 1,
            date: '2026-07-24', reportedBy: 'Aditi Sharma'
        },
        {
            id: 1041, category: 'Electrical', title: 'Ceiling fan sparking in Lab 3',
            description: 'Fan made a loud crackling noise and sparked briefly during the afternoon session. Nobody has used that switch since.',
            priority: 'Critical', status: 'InProgress', stage: 2, daysElapsed: 0,
            date: '2026-07-24', reportedBy: 'Rohan Mehta'
        },
        {
            id: 1039, category: 'Furniture', title: 'Broken chair leg, Row 3 Seat 2',
            description: 'One of the chair legs is cracked and wobbles. Minor risk of tipping over.',
            priority: 'Low', status: 'Pending', stage: 0, daysElapsed: 1,
            date: '2026-07-23', reportedBy: 'Aditi Sharma'
        },
        {
            id: 1037, category: 'Internet', title: 'Wi-Fi drops every 10 minutes in the CS wing',
            description: 'Affects the whole floor during lab hours, makes it hard to submit assignments on time.',
            priority: 'Medium', status: 'InProgress', stage: 1, daysElapsed: 2,
            date: '2026-07-22', reportedBy: 'Neha Kulkarni'
        },
        {
            id: 1035, category: 'Cleanliness', title: 'Washroom near Block B not cleaned since Monday',
            description: 'No soap, overflowing bin. Reported to housekeeping once already with no response.',
            priority: 'Medium', status: 'Resolved', stage: 0, daysElapsed: 3,
            date: '2026-07-20', reportedBy: 'Aditi Sharma'
        },
        {
            id: 1033, category: 'Safety', title: 'Exposed wiring near the stairwell exit',
            description: 'Cables running along the floor near the emergency exit, tripping hazard during a fire drill.',
            priority: 'Critical', status: 'Resolved', stage: 2, daysElapsed: 1,
            date: '2026-07-18', reportedBy: 'Rohan Mehta'
        },
        {
            id: 1031, category: 'Furniture', title: 'Not enough chairs for elective batch',
            description: 'Six students standing through the entire lecture, elective batch size grew this semester.',
            priority: 'Medium', status: 'Pending', stage: 0, daysElapsed: 0,
            date: '2026-07-24', reportedBy: 'Aditi Sharma'
        },
        {
            id: 1028, category: 'Projector', title: 'Screen flickering during presentations',
            description: 'Happens intermittently, worse when the AC is running.',
            priority: 'Low', status: 'Resolved', stage: 0, daysElapsed: 2,
            date: '2026-07-15', reportedBy: 'Neha Kulkarni'
        },
    ];

    let nextId = 1043;

    const state = {
        search: '',
        status: 'all',
        priority: 'all',
        escalatedOnly: false,
        sort: 'recent'
    };

    /* =========================================================
       ELEMENTS
       ========================================================= */

    const issuesList = document.getElementById('issuesList');
    const ladderSummary = document.getElementById('ladderSummary');
    const searchInput = document.getElementById('searchInput');
    const filterStatus = document.getElementById('filterStatus');
    const filterPriority = document.getElementById('filterPriority');
    const sortBy = document.getElementById('sortBy');

    const statTotal = document.getElementById('statTotal');
    const statPending = document.getElementById('statPending');
    const statProgress = document.getElementById('statProgress');
    const statResolved = document.getElementById('statResolved');
    const statEscalated = document.getElementById('statEscalated');

    const navAllCount = document.getElementById('navAllCount');
    const navPendingCount = document.getElementById('navPendingCount');
    const navEscalatedCount = document.getElementById('navEscalatedCount');
    const topbarSubtext = document.getElementById('topbarSubtext');

    /* =========================================================
       HELPERS
       ========================================================= */

    function initials(name) {
        return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    }

    function stageAbbr(stage) {
        // "CR" and "HOD" stay as-is; "Class Teacher" -> "CT"
        return stage.length <= 3 ? stage : stage.split(' ').map(w => w[0]).join('');
    }

    function timeAgo(days) {
        if (days === 0) return 'today';
        if (days === 1) return '1 day ago';
        return `${days} days ago`;
    }

    function statusLabel(status) {
        return status === 'InProgress' ? 'In Progress' : status;
    }

    function isEscalated(issue) {
        return issue.stage > 0 && issue.status !== 'Resolved';
    }

    /* =========================================================
       RENDER: STATS
       ========================================================= */

    function renderStats() {
        const total = issues.length;
        const pending = issues.filter(i => i.status === 'Pending').length;
        const progress = issues.filter(i => i.status === 'InProgress').length;
        const resolved = issues.filter(i => i.status === 'Resolved').length;
        const escalated = issues.filter(isEscalated).length;

        statTotal.textContent = total;
        statPending.textContent = pending;
        statProgress.textContent = progress;
        statResolved.textContent = resolved;
        statEscalated.textContent = escalated;

        navAllCount.textContent = total;
        navPendingCount.textContent = pending;
        navEscalatedCount.textContent = escalated;

        const openCount = pending + progress;
        topbarSubtext.textContent = openCount === 0
            ? 'All caught up — nothing needs your attention.'
            : `You have ${openCount} issue${openCount === 1 ? '' : 's'} awaiting a response.`;
    }

    /* =========================================================
       RENDER: LADDER SUMMARY (signature element, sidebar view)
       ========================================================= */

    function renderLadderSummary() {
        const counts = STAGES.map((_, idx) =>
            issues.filter(i => i.stage === idx && i.status !== 'Resolved').length
        );

        ladderSummary.innerHTML = STAGES.map((stage, idx) => `
            <div class="ladder-stage ${counts[idx] > 0 ? 'filled' : ''}">
                <div class="ladder-line"></div>
                <div class="ladder-node">${idx + 1}</div>
                <div class="ladder-info">
                    <strong>${stage}</strong>
                    <span>${counts[idx]} active issue${counts[idx] === 1 ? '' : 's'}</span>
                </div>
                <div class="ladder-count">${counts[idx]}</div>
            </div>
        `).join('');
    }

    /* =========================================================
       RENDER: ISSUE LIST
       ========================================================= */

    function getFilteredIssues() {
        let list = issues.filter(issue => {
            if (state.search) {
                const q = state.search.toLowerCase();
                if (!issue.title.toLowerCase().includes(q) &&
                    !issue.category.toLowerCase().includes(q)) return false;
            }
            if (state.status !== 'all' && issue.status !== state.status) return false;
            if (state.priority !== 'all' && issue.priority !== state.priority) return false;
            if (state.escalatedOnly && !isEscalated(issue)) return false;
            return true;
        });

        const priorityRank = { Critical: 0, High: 1, Medium: 2, Low: 3 };

        if (state.sort === 'recent') {
            list = list.slice().sort((a, b) => b.id - a.id);
        } else if (state.sort === 'oldest') {
            list = list.slice().sort((a, b) => a.id - b.id);
        } else if (state.sort === 'priority') {
            list = list.slice().sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority]);
        }

        return list;
    }

    function renderIssues() {
        const list = getFilteredIssues();

        if (list.length === 0) {
            issuesList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">◌</div>
                    <p>No issues match these filters. Try clearing a filter, or raise a new issue.</p>
                </div>
            `;
            return;
        }

        issuesList.innerHTML = list.map(issue => `
            <div class="issue-row" data-id="${issue.id}">
                <span class="priority-dot ${issue.priority}" title="${issue.priority} priority"></span>
                <div class="issue-main">
                    <div class="issue-title">${issue.title}</div>
                    <div class="issue-meta">
                        <span>#${issue.id}</span>
                        <span class="sep">·</span>
                        <span>${issue.category}</span>
                        <span class="sep">·</span>
                        <span>${timeAgo(issue.daysElapsed)}</span>
                    </div>
                </div>
                <span class="badge-pill status-${issue.status}">${statusLabel(issue.status)}</span>
                <span class="assignee-chip">
                    <span class="assignee-icon">${stageAbbr(STAGES[issue.stage])}</span>
                    ${STAGES[issue.stage]}
                </span>
                <span class="issue-days">
                    <strong>${issue.daysElapsed}d</strong>
                    in stage
                </span>
            </div>
        `).join('');

        issuesList.querySelectorAll('.issue-row').forEach(row => {
            row.addEventListener('click', () => openIssueDetail(Number(row.dataset.id)));
        });
    }

    function renderAll() {
        renderStats();
        renderLadderSummary();
        renderIssues();
    }

    /* =========================================================
       ISSUE DETAIL MODAL
       ========================================================= */

    const detailModal = document.getElementById('issueDetailModal');

    function openIssueDetail(id) {
        const issue = issues.find(i => i.id === id);
        if (!issue) return;

        document.getElementById('detailTitle').textContent = issue.title;
        document.getElementById('detailId').textContent = `#${issue.id} · reported by ${issue.reportedBy}`;
        document.getElementById('detailDescription').textContent = issue.description;

        document.getElementById('detailMetaRow').innerHTML = `
            <span class="badge-pill status-${issue.status}">${statusLabel(issue.status)}</span>
            <span class="badge-pill" style="background:rgba(255,255,255,0.06); color:var(--text-muted);">
                <span class="priority-dot ${issue.priority}" style="display:inline-block; margin-right:6px; vertical-align:middle;"></span>${issue.priority} priority
            </span>
            <span class="badge-pill" style="background:rgba(255,255,255,0.06); color:var(--text-muted);">${issue.category}</span>
        `;

        const timelineEl = document.getElementById('detailTimeline');
        timelineEl.innerHTML = STAGES.map((stage, idx) => {
            let cls = 'pending';
            let icon = idx + 1;
            let sub = 'Not yet reached';

            if (issue.status === 'Resolved' && idx <= issue.stage) {
                cls = 'done';
                icon = '✓';
                sub = idx === issue.stage ? 'Resolved here' : 'Cleared';
            } else if (idx < issue.stage) {
                cls = 'done';
                icon = '✓';
                sub = 'Escalated onward';
            } else if (idx === issue.stage) {
                cls = 'current';
                sub = `Currently here · ${timeAgo(issue.daysElapsed)}`;
            }

            return `
                <div class="timeline-stage ${cls}">
                    <div class="timeline-connector"></div>
                    <div class="timeline-node">${icon}</div>
                    <div class="timeline-content">
                        <strong>${stage}</strong>
                        <span>${sub}</span>
                    </div>
                </div>
            `;
        }).join('');

        const actionsEl = document.getElementById('detailActions');
        if (issue.status === 'Resolved') {
            actionsEl.innerHTML = `<span style="color:var(--text-muted); font-size:0.9rem;">This issue has been marked resolved.</span>`;
        } else {
            actionsEl.innerHTML = `
                <button class="btn btn-secondary" id="markResolvedBtn">Mark Resolved</button>
                ${issue.stage < STAGES.length - 1
                    ? `<button class="btn btn-primary" id="escalateBtn">Escalate to ${STAGES[issue.stage + 1]}</button>`
                    : ''}
            `;

            document.getElementById('markResolvedBtn').addEventListener('click', () => {
                issue.status = 'Resolved';
                renderAll();
                closeModal('issueDetailModal');
                showToast('Issue resolved', `#${issue.id} marked as resolved.`);
            });

            const escalateBtn = document.getElementById('escalateBtn');
            if (escalateBtn) {
                escalateBtn.addEventListener('click', () => {
                    issue.stage += 1;
                    issue.status = 'InProgress';
                    issue.daysElapsed = 0;
                    renderAll();
                    closeModal('issueDetailModal');
                    showToast('Issue escalated', `#${issue.id} sent to ${STAGES[issue.stage]}.`);
                });
            }
        }

        detailModal.classList.add('open');
    }

    /* =========================================================
       RAISE ISSUE MODAL
       ========================================================= */

    const raiseForm = document.getElementById('raiseIssueForm');
    const issuePriority = document.getElementById('issuePriority');
    const priorityPreview = document.getElementById('priorityPreview');

    function updatePriorityPreview() {
        const val = issuePriority.value;
        priorityPreview.querySelector('.priority-dot').className = `priority-dot ${val}`;
        const routeText = val === 'Critical'
            ? 'Will be routed directly to the HOD.'
            : 'Will be sent to your Class Representative first.';
        priorityPreview.lastChild.textContent = routeText;
    }
    issuePriority.addEventListener('change', updatePriorityPreview);

    raiseForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const category = document.getElementById('issueCategory').value;
        const priority = issuePriority.value;
        const title = document.getElementById('issueTitle').value.trim();
        const description = document.getElementById('issueDescription').value.trim();

        if (!category || !title || !description) return;

        const newIssue = {
            id: nextId++,
            category, title, description, priority,
            status: 'Pending',
            stage: priority === 'Critical' ? 2 : 0,
            daysElapsed: 0,
            date: new Date().toISOString().slice(0, 10),
            reportedBy: 'Aditi Sharma'
        };

        issues.unshift(newIssue);
        renderAll();
        raiseForm.reset();
        issuePriority.value = 'Medium';
        updatePriorityPreview();
        closeModal('raiseIssueModal');
        showToast('Issue submitted', priority === 'Critical'
            ? `#${newIssue.id} sent directly to the HOD.`
            : `#${newIssue.id} sent to your Class Representative.`);
    });

    /* =========================================================
       MODAL OPEN / CLOSE (generic)
       ========================================================= */

    function openModal(id) {
        document.getElementById(id).classList.add('open');
    }
    function closeModal(id) {
        document.getElementById(id).classList.remove('open');
    }

    document.getElementById('openRaiseIssueBtn').addEventListener('click', () => openModal('raiseIssueModal'));
    document.getElementById('navRaiseIssue').addEventListener('click', (e) => {
        e.preventDefault();
        openModal('raiseIssueModal');
    });

    document.querySelectorAll('[data-close]').forEach(btn => {
        btn.addEventListener('click', () => closeModal(btn.dataset.close));
    });

    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) overlay.classList.remove('open');
        });
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open'));
        }
    });

    /* =========================================================
       SIDEBAR QUICK FILTERS
       ========================================================= */

    document.querySelectorAll('.sidebar-link[data-filter]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
            link.classList.add('active');

            const filterType = link.dataset.filter;
            if (filterType === 'status') {
                state.status = link.dataset.value;
                state.escalatedOnly = false;
                filterStatus.value = state.status;
            } else if (filterType === 'escalated') {
                state.escalatedOnly = true;
                state.status = 'all';
                filterStatus.value = 'all';
            }
            renderIssues();
        });
    });

    /* =========================================================
       TOAST
       ========================================================= */

    let toastTimer;
    function showToast(title, subtitle) {
        const toast = document.getElementById('toast');
        document.getElementById('toastTitle').textContent = title;
        document.getElementById('toastSubtitle').textContent = subtitle;
        toast.classList.add('show');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => toast.classList.remove('show'), 3500);
    }

    /* =========================================================
       FILTER / SEARCH / SORT BINDINGS
       ========================================================= */

    searchInput.addEventListener('input', (e) => {
        state.search = e.target.value;
        renderIssues();
    });
    filterStatus.addEventListener('change', (e) => {
        state.status = e.target.value;
        state.escalatedOnly = false;
        renderIssues();
    });
    filterPriority.addEventListener('change', (e) => {
        state.priority = e.target.value;
        renderIssues();
    });
    sortBy.addEventListener('change', (e) => {
        state.sort = e.target.value;
        renderIssues();
    });

    /* =========================================================
       INIT
       ========================================================= */

    updatePriorityPreview();
    renderAll();
});
