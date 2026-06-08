/**
 * proto.js — Chikitsa360 Clickable Prototype Layer
 *
 * Drop this into any mockup page. It auto-wires:
 *   • Sidebar navigation links → correct HTML files
 *   • Action buttons → navigate or show toast feedback
 *   • Table rows → detail pages
 *   • Form submissions → success states
 *   • Back/Cancel buttons → history.back()
 *
 * Zero changes required to existing HTML. Pure progressive enhancement.
 */
(function () {
  'use strict';

  /* ─── Navigation map ────────────────────────────────────── */
  const NAV = {
    'dashboard':     'dashboard.html',
    'appointments':  'appointment-calendar.html',
    'patients':      'patients-list.html',
    'doctors':       'doctors-list.html',
    'prescriptions': 'prescriptions.html',
    'billing':       'billing-list.html',
    'reports':       'reports.html',
    'settings':      'settings.html',
    'help':          'index.html',
    'sign out':      'login.html',
    'logout':        'login.html',
  };

  /* ─── Button text → destination or action ───────────────── */
  const BTN_NAV = {
    'new appointment':        'new-appointment.html',
    '+ new appointment':      'new-appointment.html',
    'book appointment':       'new-appointment.html',
    'new patient':            'new-patient.html',
    '+ new patient':          'new-patient.html',
    'add patient':            'new-patient.html',
    'new invoice':            'new-invoice.html',
    '+ new invoice':          'new-invoice.html',
    'generate invoice':       'new-invoice.html',
    'create invoice':         'new-invoice.html',
    'new prescription':       'new-prescription.html',
    '+ new prescription':     'new-prescription.html',
    'create prescription':    'new-prescription.html',
    'write prescription':     'new-prescription.html',
    'add walk-in':            'new-appointment.html',
    'new walk-in':            'new-appointment.html',
    'view profile':           'patient-profile.html',
    'open profile':           'patient-profile.html',
    'doctor profile':         'doctor-profile.html',
  };

  const BTN_BACK = [
    '← back', 'back', '← edit details', '← cancel', 'cancel',
    'discard', 'close',
  ];

  const BTN_TOAST_SUCCESS = [
    'save', 'save changes', 'update', 'confirm booking',
    'mark complete', 'mark completed', 'mark as complete',
    'complete appointment', 'send', 'send reminder', 'send all →',
    'send confirmation', 'apply', 'submit', 'record payment',
    'mark paid', 'mark as paid', 'approve', 'set schedule',
    'save schedule', 'invite', 'send invite', 'copy link',
    'download qr', 'enable', 'disable', 'activate', 'deactivate',
  ];

  const BTN_TOAST_WARNING = [
    'no-show', 'mark no-show', 'cancel appointment', 'suspend',
    'remove', 'delete', 'revoke',
  ];

  const BTN_TOAST_INFO = [
    'export', 'export csv', 'export pdf', 'download', 'print',
    'share', 'copy', 'view all →', 'see all', 'refresh',
  ];

  /* ─── Current page slug ──────────────────────────────────── */
  const currentFile = window.location.pathname.split('/').pop() || 'index.html';
  const currentSlug = currentFile.replace('.html', '');

  /* ─── Page titles for breadcrumb ────────────────────────── */
  const PAGE_LABELS = {
    'dashboard':              'Dashboard',
    'appointment-calendar':   'Appointments — Calendar',
    'appointments-agenda':    'Appointments — Agenda',
    'appointments-waitlist':  'Appointments — Waitlist',
    'appointment-detail':     'Appointment Detail',
    'new-appointment':        'New Appointment',
    'patients-list':          'Patients',
    'patient-profile':        'Patient Profile',
    'new-patient':            'New Patient',
    'doctors-list':           'Doctors',
    'doctor-profile':         'Doctor Profile',
    'prescriptions':          'Prescriptions',
    'new-prescription':       'New Prescription',
    'billing-list':           'Billing',
    'invoice-detail':         'Invoice Detail',
    'new-invoice':            'New Invoice',
    'reports':                'Reports',
    'settings':               'Settings',
    'onboarding':             'Onboarding',
    'login':                  'Login',
    'web-booking':            'Web Booking (Patient)',
  };

  /* ═══════════════════════════════════════════════════════════
     TOAST SYSTEM
  ═══════════════════════════════════════════════════════════ */
  const TOAST_ICONS = { success: '✓', error: '✕', info: 'ℹ', warning: '⚠' };
  const TOAST_COLORS = {
    success: '#22C55E', error: '#EF4444', info: '#0A6EFF', warning: '#F59E0B',
  };

  function injectToastStyles() {
    if (document.getElementById('proto-styles')) return;
    const s = document.createElement('style');
    s.id = 'proto-styles';
    s.textContent = `
      @keyframes proto-slide-in {
        from { transform: translateX(32px); opacity: 0; }
        to   { transform: translateX(0);    opacity: 1; }
      }
      @keyframes proto-fade-out {
        to { opacity: 0; transform: translateX(8px); }
      }
      #proto-toasts {
        position: fixed; bottom: 72px; right: 20px; z-index: 99999;
        display: flex; flex-direction: column; gap: 8px;
        pointer-events: none;
      }
      .proto-toast {
        background: #1E293B; color: #fff;
        padding: 10px 16px; border-radius: 8px;
        font-size: 13px; font-weight: 500;
        display: flex; align-items: center; gap: 8px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.25);
        animation: proto-slide-in 0.18s ease;
        max-width: 300px; line-height: 1.4;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      }
      .proto-toast-icon {
        font-weight: 800; font-size: 13px; flex-shrink: 0;
      }
      /* HUD bar */
      #proto-hud {
        position: fixed; bottom: 0; left: 0; right: 0; height: 44px;
        background: #0F172A; border-top: 1px solid #1E293B;
        display: flex; align-items: center; justify-content: space-between;
        padding: 0 16px; z-index: 99998; gap: 12px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      }
      .proto-hud-left { display: flex; align-items: center; gap: 10px; }
      .proto-hud-badge {
        font-size: 10px; font-weight: 700; letter-spacing: 0.8px;
        background: #0A6EFF; color: #fff;
        padding: 2px 8px; border-radius: 10px; text-transform: uppercase;
      }
      .proto-hud-page {
        font-size: 12px; font-weight: 600; color: #94A3B8;
      }
      .proto-hud-right { display: flex; align-items: center; gap: 8px; }
      .proto-hud-btn {
        font-size: 12px; font-weight: 600;
        padding: 5px 12px; border-radius: 6px; border: none;
        cursor: pointer; transition: background 0.12s; text-decoration: none;
        display: inline-flex; align-items: center; gap: 5px;
      }
      .proto-hud-btn-ghost {
        background: transparent; color: #64748B; border: 1px solid #334155;
      }
      .proto-hud-btn-ghost:hover { background: #1E293B; color: #94A3B8; }
      .proto-hud-btn-primary {
        background: #1E293B; color: #94A3B8; border: 1px solid #334155;
      }
      .proto-hud-btn-primary:hover { background: #0A6EFF; color: #fff; border-color: #0A6EFF; }
      /* Row hover cursor */
      .proto-clickable { cursor: pointer !important; }
      .proto-clickable:hover { background: rgba(10,110,255,0.04) !important; }
      /* Ripple */
      .proto-ripple {
        position: absolute; border-radius: 50%;
        background: rgba(10,110,255,0.15);
        transform: scale(0);
        animation: proto-ripple-anim 0.4s ease-out forwards;
        pointer-events: none;
      }
      @keyframes proto-ripple-anim {
        to { transform: scale(4); opacity: 0; }
      }
    `;
    document.head.appendChild(s);
  }

  function showToast(message, type = 'success') {
    let container = document.getElementById('proto-toasts');
    if (!container) {
      container = document.createElement('div');
      container.id = 'proto-toasts';
      document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = 'proto-toast';
    toast.style.borderLeft = `3px solid ${TOAST_COLORS[type] || TOAST_COLORS.info}`;
    toast.innerHTML = `
      <span class="proto-toast-icon" style="color:${TOAST_COLORS[type] || TOAST_COLORS.info}">
        ${TOAST_ICONS[type] || TOAST_ICONS.info}
      </span>
      <span>${message}</span>
    `;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.animation = 'proto-fade-out 0.25s ease forwards';
      setTimeout(() => toast.remove(), 250);
    }, 2600);
  }

  /* ═══════════════════════════════════════════════════════════
     PROTOTYPE HUD
  ═══════════════════════════════════════════════════════════ */
  function injectHUD() {
    if (document.getElementById('proto-hud')) return;
    // Add bottom padding to body so HUD doesn't cover content
    document.body.style.paddingBottom = '44px';

    const label = PAGE_LABELS[currentSlug] || currentSlug;
    const hud = document.createElement('div');
    hud.id = 'proto-hud';
    hud.innerHTML = `
      <div class="proto-hud-left">
        <span class="proto-hud-badge">Prototype</span>
        <span class="proto-hud-page">${label}</span>
      </div>
      <div class="proto-hud-right">
        ${history.length > 1 ? `<button class="proto-hud-btn proto-hud-btn-ghost" id="proto-back-btn">← Back</button>` : ''}
        <a class="proto-hud-btn proto-hud-btn-primary" href="index.html">🗺 Journey Map</a>
      </div>
    `;
    document.body.appendChild(hud);

    const backBtn = document.getElementById('proto-back-btn');
    if (backBtn) backBtn.addEventListener('click', () => history.back());
  }

  /* ═══════════════════════════════════════════════════════════
     SIDEBAR NAVIGATION WIRING
  ═══════════════════════════════════════════════════════════ */
  function wireNav() {
    document.querySelectorAll('.nav-item, .sidebar-nav-item').forEach(item => {
      // Get text, strip badge numbers
      const rawText = item.textContent.trim();
      const key = rawText.replace(/\d+/g, '').trim().toLowerCase();

      if (NAV[key]) {
        item.style.cursor = 'pointer';
        item.addEventListener('click', (e) => {
          e.preventDefault();
          window.location.href = NAV[key];
        });
      }
    });

    // Footer settings / sign out
    document.querySelectorAll('a, button, [role="button"]').forEach(el => {
      const txt = el.textContent.trim().toLowerCase();
      if (txt === 'settings' && !el.closest('.sidebar')) {
        el.addEventListener('click', (e) => { e.preventDefault(); window.location.href = 'settings.html'; });
      }
      if (txt === 'sign out' || txt === 'logout') {
        el.addEventListener('click', (e) => { e.preventDefault(); window.location.href = 'login.html'; });
      }
    });
  }

  /* ═══════════════════════════════════════════════════════════
     BUTTON WIRING
  ═══════════════════════════════════════════════════════════ */
  function normalise(text) {
    return text.trim().toLowerCase().replace(/\s+/g, ' ');
  }

  function wireButtons() {
    document.querySelectorAll('button, a, [role="button"], .btn, .action-btn, .quick-action').forEach(el => {
      if (el.dataset.protoWired) return;
      el.dataset.protoWired = '1';

      const txt = normalise(el.textContent);

      /* ── Navigate to another page ── */
      if (BTN_NAV[txt]) {
        el.addEventListener('click', (e) => {
          e.preventDefault();
          window.location.href = BTN_NAV[txt];
        });
        return;
      }

      /* ── Back / cancel ── */
      if (BTN_BACK.includes(txt) || el.id === 'proto-back-btn') {
        if (el.id !== 'proto-back-btn') {
          el.addEventListener('click', (e) => { e.preventDefault(); history.back(); });
        }
        return;
      }

      /* ── Success toasts ── */
      if (BTN_TOAST_SUCCESS.some(k => txt.includes(k))) {
        el.addEventListener('click', (e) => {
          e.preventDefault();
          const label = el.textContent.trim();
          const messages = {
            'save': 'Changes saved successfully',
            'save changes': 'Changes saved successfully',
            'update': 'Updated successfully',
            'confirm booking': 'Booking confirmed! WhatsApp sent.',
            'mark complete': 'Appointment marked as completed',
            'mark completed': 'Appointment marked as completed',
            'mark as complete': 'Appointment marked as completed',
            'complete appointment': 'Appointment marked as completed',
            'record payment': 'Payment recorded successfully',
            'mark paid': 'Invoice marked as paid',
            'mark as paid': 'Invoice marked as paid',
            'send reminder': 'Reminder sent via WhatsApp',
            'send all →': 'Reminders sent to all patients',
            'send confirmation': 'Confirmation sent via WhatsApp',
            'copy link': 'Booking link copied to clipboard',
            'download qr': 'QR code downloading...',
            'invite': 'Invitation sent via WhatsApp',
            'send invite': 'Invitation sent via WhatsApp',
            'set schedule': 'Schedule updated',
            'save schedule': 'Schedule saved',
          };
          const msg = messages[txt] || `${label} — done!`;
          showToast(msg, 'success');
          addRipple(el);
        });
        return;
      }

      /* ── Warning toasts ── */
      if (BTN_TOAST_WARNING.some(k => txt.includes(k))) {
        el.addEventListener('click', (e) => {
          e.preventDefault();
          const messages = {
            'no-show': 'Appointment marked as no-show',
            'mark no-show': 'Appointment marked as no-show',
            'cancel appointment': 'Appointment cancelled. Patient notified via WhatsApp.',
            'suspend': 'Account suspended',
            'remove': 'Removed successfully',
            'delete': 'Deleted',
            'revoke': 'Access revoked',
          };
          const msg = messages[txt] || `${el.textContent.trim()} — done`;
          showToast(msg, 'warning');
        });
        return;
      }

      /* ── Info toasts ── */
      if (BTN_TOAST_INFO.some(k => txt.includes(k))) {
        el.addEventListener('click', (e) => {
          e.preventDefault();
          const messages = {
            'export': 'Export started — CSV will download shortly',
            'export csv': 'CSV export started',
            'export pdf': 'PDF generating...',
            'download': 'Download started',
            'print': 'Sending to printer...',
            'share': 'Share link copied',
            'copy': 'Copied to clipboard',
            'refresh': 'Data refreshed',
            'view all →': 'Loading...',
            'see all': 'Loading...',
          };
          const msg = messages[txt] || `${el.textContent.trim()} — done`;
          showToast(msg, 'info');
        });
        return;
      }
    });
  }

  /* ═══════════════════════════════════════════════════════════
     TABLE ROW WIRING
     Clicking a row on a list page opens the detail page
  ═══════════════════════════════════════════════════════════ */
  function wireTableRows() {
    const rowTargets = {
      'patients-list':         'patient-profile.html',
      'doctors-list':          'doctor-profile.html',
      'prescriptions':         'patient-profile.html',
      'billing-list':          'invoice-detail.html',
      'appointment-calendar':  'appointment-detail.html',
      'appointments-agenda':   'appointment-detail.html',
      'appointments-waitlist': 'appointment-detail.html',
    };

    const target = rowTargets[currentSlug];
    if (!target) return;

    // Wire table rows
    document.querySelectorAll('table tbody tr, .patient-row, .appt-row, .billing-row, .doctor-card').forEach(row => {
      row.classList.add('proto-clickable');
      row.style.position = 'relative';
      row.addEventListener('click', (e) => {
        // Don't intercept button/link clicks inside the row
        if (e.target.closest('button, a')) return;
        window.location.href = target;
      });
    });

    // Wire agenda list items
    document.querySelectorAll('.agenda-item, .appt-card, .appointment-item, .waitlist-item').forEach(item => {
      item.classList.add('proto-clickable');
      item.addEventListener('click', (e) => {
        if (e.target.closest('button, a')) return;
        window.location.href = 'appointment-detail.html';
      });
    });
  }

  /* ═══════════════════════════════════════════════════════════
     FORM WIRING
     Submitting a form navigates to the logical next screen
  ═══════════════════════════════════════════════════════════ */
  const FORM_SUBMIT_TARGET = {
    'new-appointment': 'appointment-detail.html',
    'new-patient':     'patient-profile.html',
    'new-invoice':     'invoice-detail.html',
    'new-prescription':'prescriptions.html',
    'login':           'dashboard.html',
    'onboarding':      'dashboard.html',
  };

  function wireForms() {
    document.querySelectorAll('form').forEach(form => {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const target = FORM_SUBMIT_TARGET[currentSlug];
        if (target) {
          showToast('Saved successfully', 'success');
          setTimeout(() => { window.location.href = target; }, 800);
        } else {
          showToast('Saved', 'success');
        }
      });
    });
  }

  /* ═══════════════════════════════════════════════════════════
     PAGE-SPECIFIC INTERACTIONS
  ═══════════════════════════════════════════════════════════ */
  function wirePageSpecific() {

    /* Login page — submit on Enter or button click */
    if (currentSlug === 'login') {
      const loginBtn = [...document.querySelectorAll('button')].find(b =>
        /sign in|login|log in|continue/i.test(b.textContent)
      );
      if (loginBtn) {
        loginBtn.addEventListener('click', (e) => {
          e.preventDefault();
          window.location.href = 'dashboard.html';
        });
      }
      // Also handle Enter in password field
      document.querySelectorAll('input[type="password"]').forEach(input => {
        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') window.location.href = 'dashboard.html';
        });
      });
    }

    /* Onboarding — Continue → next step or dashboard */
    if (currentSlug === 'onboarding') {
      const continueBtn = [...document.querySelectorAll('button')].find(b =>
        /continue|next|finish|complete|get started/i.test(b.textContent)
      );
      if (continueBtn) {
        continueBtn.addEventListener('click', (e) => {
          e.preventDefault();
          showToast('Step saved — continuing', 'success');
          setTimeout(() => { window.location.href = 'dashboard.html'; }, 900);
        });
      }
    }

    /* Appointment detail — quick action buttons */
    if (currentSlug === 'appointment-detail') {
      document.querySelectorAll('button, .action-btn, .quick-btn').forEach(btn => {
        const txt = normalise(btn.textContent);
        if (txt.includes('create prescription') || txt.includes('write prescription')) {
          btn.addEventListener('click', (e) => { e.preventDefault(); window.location.href = 'new-prescription.html'; });
        }
        if (txt.includes('generate invoice') || txt.includes('create invoice')) {
          btn.addEventListener('click', (e) => { e.preventDefault(); window.location.href = 'new-invoice.html'; });
        }
        if (txt.includes('view patient') || txt.includes('open patient') || txt.includes('patient profile')) {
          btn.addEventListener('click', (e) => { e.preventDefault(); window.location.href = 'patient-profile.html'; });
        }
      });
    }

    /* Patient profile — tabs */
    if (currentSlug === 'patient-profile') {
      document.querySelectorAll('.tab, .tab-btn, [role="tab"]').forEach(tab => {
        tab.addEventListener('click', () => {
          document.querySelectorAll('.tab, .tab-btn, [role="tab"]').forEach(t => t.classList.remove('active'));
          tab.classList.add('active');
        });
      });
      // "New Appointment" from patient profile
      document.querySelectorAll('button').forEach(btn => {
        if (/new appointment|book appointment/i.test(btn.textContent)) {
          btn.addEventListener('click', (e) => { e.preventDefault(); window.location.href = 'new-appointment.html'; });
        }
        if (/new prescription|write rx/i.test(btn.textContent)) {
          btn.addEventListener('click', (e) => { e.preventDefault(); window.location.href = 'new-prescription.html'; });
        }
        if (/new invoice|generate invoice/i.test(btn.textContent)) {
          btn.addEventListener('click', (e) => { e.preventDefault(); window.location.href = 'new-invoice.html'; });
        }
      });
    }

    /* Appointment calendar — click on calendar slot → new appointment */
    if (currentSlug === 'appointment-calendar') {
      document.querySelectorAll('.slot, .cal-slot, .time-slot, .empty-slot').forEach(slot => {
        slot.style.cursor = 'pointer';
        slot.addEventListener('click', () => { window.location.href = 'new-appointment.html'; });
      });
    }

    /* Waitlist — "Assign Slot" / slot grid */
    if (currentSlug === 'appointments-waitlist') {
      document.querySelectorAll('.slot-cell, .time-slot').forEach(slot => {
        slot.style.cursor = 'pointer';
        slot.addEventListener('click', () => {
          showToast('Patient assigned to slot', 'success');
        });
      });
    }

    /* Reports — tabs */
    if (currentSlug === 'reports') {
      document.querySelectorAll('.tab, .tab-btn, [role="tab"], .report-tab').forEach(tab => {
        tab.addEventListener('click', () => {
          document.querySelectorAll('.tab, .tab-btn, [role="tab"], .report-tab').forEach(t => t.classList.remove('active'));
          tab.classList.add('active');
        });
      });
    }

    /* Settings — tabs */
    if (currentSlug === 'settings') {
      document.querySelectorAll('.settings-nav-item, .tab, .tab-btn').forEach(tab => {
        tab.addEventListener('click', () => {
          document.querySelectorAll('.settings-nav-item, .tab, .tab-btn').forEach(t => t.classList.remove('active'));
          tab.classList.add('active');
        });
      });
    }

    /* Invoice detail — "Record Payment" opens a side panel hint */
    if (currentSlug === 'invoice-detail') {
      document.querySelectorAll('button').forEach(btn => {
        if (/record payment|add payment/i.test(btn.textContent)) {
          btn.addEventListener('click', (e) => {
            e.preventDefault();
            showToast('Payment recorded — invoice updated', 'success');
          });
        }
      });
    }

    /* Billing list — row click → invoice detail */
    if (currentSlug === 'billing-list') {
      document.querySelectorAll('table tbody tr').forEach(row => {
        row.addEventListener('click', (e) => {
          if (e.target.closest('button, a')) return;
          window.location.href = 'invoice-detail.html';
        });
      });
    }

    /* Doctors list — card click → doctor profile */
    if (currentSlug === 'doctors-list') {
      document.querySelectorAll('.doctor-card, .doc-card, .staff-card').forEach(card => {
        card.style.cursor = 'pointer';
        card.addEventListener('click', (e) => {
          if (e.target.closest('button, a')) return;
          window.location.href = 'doctor-profile.html';
        });
      });
    }
  }

  /* ═══════════════════════════════════════════════════════════
     RIPPLE EFFECT
  ═══════════════════════════════════════════════════════════ */
  function addRipple(el) {
    const rect = el.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const ripple = document.createElement('span');
    ripple.className = 'proto-ripple';
    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = '0px';
    ripple.style.top = '0px';
    if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
    el.appendChild(ripple);
    setTimeout(() => ripple.remove(), 500);
  }

  /* ═══════════════════════════════════════════════════════════
     GLOBAL KEYBOARD SHORTCUTS
  ═══════════════════════════════════════════════════════════ */
  function wireKeyboard() {
    document.addEventListener('keydown', (e) => {
      // Cmd+K / Ctrl+K → global search toast
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        showToast('Global search — type to find patients, appointments…', 'info');
      }
      // Escape → back
      if (e.key === 'Escape' && !['login', 'onboarding', 'index'].includes(currentSlug)) {
        history.back();
      }
    });
  }

  /* ═══════════════════════════════════════════════════════════
     ACTIVE STATE — highlight current page in sidebar
  ═══════════════════════════════════════════════════════════ */
  function setActiveNav() {
    // Map current file to the nav label
    const fileToNav = {
      'dashboard.html':             'dashboard',
      'appointment-calendar.html':  'appointments',
      'appointments-agenda.html':   'appointments',
      'appointments-waitlist.html': 'appointments',
      'appointment-detail.html':    'appointments',
      'new-appointment.html':       'appointments',
      'patients-list.html':         'patients',
      'patient-profile.html':       'patients',
      'new-patient.html':           'patients',
      'doctors-list.html':          'doctors',
      'doctor-profile.html':        'doctors',
      'prescriptions.html':         'prescriptions',
      'new-prescription.html':      'prescriptions',
      'billing-list.html':          'billing',
      'invoice-detail.html':        'billing',
      'new-invoice.html':           'billing',
      'reports.html':               'reports',
      'settings.html':              'settings',
    };
    const activeSection = fileToNav[currentFile];
    if (!activeSection) return;

    document.querySelectorAll('.nav-item').forEach(item => {
      const txt = item.textContent.replace(/\d+/g, '').trim().toLowerCase();
      if (txt === activeSection) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });
  }

  /* ═══════════════════════════════════════════════════════════
     INIT
  ═══════════════════════════════════════════════════════════ */
  function init() {
    injectToastStyles();
    injectHUD();
    wireNav();
    wireButtons();
    wireTableRows();
    wireForms();
    wirePageSpecific();
    wireKeyboard();
    setActiveNav();

    // Re-wire after any dynamic content (waitlist slot grid, etc.)
    setTimeout(() => {
      wireButtons();
      wireTableRows();
      wirePageSpecific();
    }, 500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
