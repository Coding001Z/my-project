(function () {
  if (window.DigitalBalanceEyeBreak) {
    return;
  }

  const storage = window.DigitalBalanceStorage;
  const settingsKey = "digitalBalance.eyeBreakSettings.v1";
  const stateKey = "digitalBalance.eyeBreakState.v1";
  const breakMinutes = 5;
  const snoozeMinutes = 5;
  const allowedIntervals = [30, 45, 50, 60];
  const listenerController = new AbortController();
  const banner = createBanner();
  const errorNotice = document.createElement("div");
  let settings = null;
  let state = null;
  let timerId = null;
  let trackingStartedAt = null;
  let disposed = false;

  errorNotice.className = "eye-break-error";
  errorNotice.setAttribute("role", "alert");
  errorNotice.setAttribute("aria-live", "assertive");
  errorNotice.hidden = true;

  const mainContent = document.querySelector(".main-content");
  if (mainContent) {
    mainContent.prepend(errorNotice);
  } else {
    document.body.prepend(errorNotice);
  }

  function createBanner() {
    const container = document.createElement("section");
    container.className = "eye-break-banner";
    container.hidden = true;
    container.setAttribute("role", "region");
    container.setAttribute("aria-labelledby", "eye-break-title");
    container.setAttribute("aria-live", "polite");
    container.setAttribute("aria-atomic", "true");

    const message = document.createElement("div");
    message.className = "eye-break-message";
    const heading = document.createElement("h2");
    heading.id = "eye-break-title";
    heading.textContent = "ถึงเวลาพักสายตาแล้ว";
    const description = document.createElement("p");
    description.className = "eye-break-description";
    description.setAttribute("aria-live", "polite");
    message.append(heading, description);

    const actions = document.createElement("div");
    actions.className = "eye-break-actions";
    actions.append(
      createActionButton("rest", "พักตอนนี้", true),
      createActionButton("snooze", "เลื่อนออกไป 5 นาที", false),
      createActionButton("close", "ปิด", false)
    );
    container.append(message, actions);
    document.body.append(container);
    return container;
  }

  function createActionButton(action, label, isPrimary) {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.eyeBreakAction = action;
    button.className = isPrimary ? "primary-button" : "secondary-button";
    button.textContent = label;
    return button;
  }

  function showError(message) {
    errorNotice.textContent = message;
    errorNotice.hidden = false;
  }

  function clearError() {
    errorNotice.hidden = true;
    errorNotice.textContent = "";
  }

  function clearTimer() {
    if (timerId !== null) {
      window.clearTimeout(timerId);
      timerId = null;
    }
  }

  function saveState(nextState) {
    state = storage.eyeBreak.setState(nextState);
    return state;
  }

  function showReminder() {
    banner.hidden = false;
    const description = banner.querySelector(".eye-break-description");
    description.textContent = "พักสายตาสักครู่ แล้วค่อยกลับมาใช้งานต่อ";
  }

  function hideReminder() {
    banner.hidden = true;
  }

  function showBreakCompleteReminder() {
    saveState({ status: "reminder", elapsedMs: 0 });
    showReminder();
  }

  function onScheduledTime() {
    timerId = null;

    try {
      if (!settings.enabled || document.visibilityState === "hidden") {
        checkpointAndStop();
        return;
      }

      if (state.status === "tracking") {
        const elapsedMs = getElapsedMs();
        if (elapsedMs < settings.intervalMinutes * 60 * 1000) {
          saveState({ status: "tracking", elapsedMs });
          trackingStartedAt = Date.now();
          scheduleTracking();
          return;
        }

        trackingStartedAt = null;
        saveState({ status: "reminder", elapsedMs: settings.intervalMinutes * 60 * 1000 });
        showReminder();
        return;
      }

      if (state.status === "snoozed" && state.deadline <= Date.now()) {
        showBreakCompleteReminder();
        return;
      }

      if (state.status === "break" && state.deadline <= Date.now()) {
        saveState({ status: "tracking", elapsedMs: 0 });
        startTracking();
        return;
      }

      reconcileState();
    } catch (error) {
      clearTimer();
      trackingStartedAt = null;
      showError(`Eye Break Reminder หยุดทำงาน: ${error.message}`);
    }
  }

  function scheduleTracking() {
    clearTimer();
    if (!settings.enabled || state.status !== "tracking" || document.visibilityState === "hidden" || disposed) {
      return;
    }

    const elapsedMs = getElapsedMs();
    const remainingMs = Math.max(settings.intervalMinutes * 60 * 1000 - elapsedMs, 0);
    timerId = window.setTimeout(onScheduledTime, remainingMs);
  }

  function scheduleDeadline() {
    clearTimer();
    if (document.visibilityState === "hidden" || disposed) {
      return;
    }

    timerId = window.setTimeout(onScheduledTime, Math.max(state.deadline - Date.now(), 0));
  }

  function getElapsedMs() {
    if (state.status !== "tracking" || trackingStartedAt === null) {
      return state.elapsedMs || 0;
    }
    return state.elapsedMs + Math.max(Date.now() - trackingStartedAt, 0);
  }

  function checkpointAndStop() {
    clearTimer();
    if (state && state.status === "tracking" && trackingStartedAt !== null) {
      const elapsedMs = Math.min(getElapsedMs(), settings.intervalMinutes * 60 * 1000);
      trackingStartedAt = null;
      saveState({ status: "tracking", elapsedMs });
    }
  }

  function startTracking() {
    if (!settings.enabled || document.visibilityState === "hidden" || disposed) {
      return;
    }

    hideReminder();
    trackingStartedAt = Date.now();
    scheduleTracking();
  }

  function reconcileState() {
    clearTimer();
    trackingStartedAt = null;

    if (!settings.enabled) {
      hideReminder();
      state = storage.eyeBreak.resetState();
      return;
    }

    if (state.status === "break") {
      hideReminder();
      if (state.deadline <= Date.now()) {
        saveState({ status: "tracking", elapsedMs: 0 });
        startTracking();
      } else {
        scheduleDeadline();
      }
      return;
    }

    if (state.status === "snoozed") {
      hideReminder();
      if (state.deadline <= Date.now()) {
        showBreakCompleteReminder();
      } else {
        scheduleDeadline();
      }
      return;
    }

    if (state.status === "reminder") {
      hideReminder();
      showReminder();
      return;
    }

    hideReminder();
    if (document.visibilityState === "visible") {
      startTracking();
    }
  }

  function loadFromStorage() {
    settings = storage.eyeBreak.getSettings();
    state = storage.eyeBreak.getState();
    clearError();
    reconcileState();
  }

  function saveSettings(nextSettings) {
    if (!allowedIntervals.includes(nextSettings.intervalMinutes)
      || typeof nextSettings.enabled !== "boolean") {
      throw new Error("เลือกช่วงเวลา 30, 45, 50 หรือ 60 นาที และกำหนดสถานะเปิดหรือปิด");
    }

    clearTimer();
    trackingStartedAt = null;
    settings = storage.eyeBreak.setSettings(nextSettings);

    if (!settings.enabled) {
      state = storage.eyeBreak.resetState();
      hideReminder();
    } else if (state.status === "tracking") {
      reconcileState();
    } else {
      reconcileState();
    }
    clearError();
    return settings;
  }

  function resetProgress() {
    clearTimer();
    trackingStartedAt = null;
    state = storage.eyeBreak.resetState();
    hideReminder();
    clearError();
    if (settings.enabled) {
      startTracking();
    }
    return state;
  }

  function onBannerAction(event) {
    const button = event.target.closest("button[data-eye-break-action]");
    if (!button || !banner.contains(button) || state.status !== "reminder") {
      return;
    }

    clearTimer();
    trackingStartedAt = null;

    try {
      if (button.dataset.eyeBreakAction === "rest") {
        saveState({
          status: "break",
          deadline: Date.now() + breakMinutes * 60 * 1000
        });
        hideReminder();
        scheduleDeadline();
      } else if (button.dataset.eyeBreakAction === "snooze") {
        saveState({
          status: "snoozed",
          deadline: Date.now() + snoozeMinutes * 60 * 1000
        });
        hideReminder();
        scheduleDeadline();
      } else if (button.dataset.eyeBreakAction === "close") {
        saveState({ status: "tracking", elapsedMs: 0 });
        hideReminder();
        startTracking();
      }
      clearError();
    } catch (error) {
      showError(`บันทึกการตั้งค่า Reminder ไม่สำเร็จ: ${error.message}`);
      reconcileState();
    }
  }

  function onVisibilityChange() {
    if (document.visibilityState === "hidden") {
      checkpointAndStop();
      return;
    }

    try {
      reconcileState();
    } catch (error) {
      clearTimer();
      showError(`กู้คืน Eye Break Reminder ไม่สำเร็จ: ${error.message}`);
    }
  }

  function onPageHide(event) {
    if (disposed) {
      return;
    }

    try {
      checkpointAndStop();
    } catch (error) {
      showError(`บันทึกเวลาการใช้งานก่อนออกจากหน้าไม่สำเร็จ: ${error.message}`);
    }
    if (event && event.persisted) {
      return;
    }
    disposed = true;
    clearTimer();
    listenerController.abort();
  }

  banner.addEventListener("click", onBannerAction, { signal: listenerController.signal });
  document.addEventListener("visibilitychange", onVisibilityChange, { signal: listenerController.signal });
  window.addEventListener("pagehide", onPageHide, { signal: listenerController.signal, once: true });
  window.addEventListener("pageshow", onVisibilityChange, { signal: listenerController.signal });
  window.addEventListener("storage", (event) => {
    if (event.key === settingsKey || event.key === stateKey || event.key === null) {
      try {
        loadFromStorage();
      } catch (error) {
        clearTimer();
        trackingStartedAt = null;
        hideReminder();
        showError(`โหลด Eye Break Reminder ไม่สำเร็จ: ${error.message}`);
      }
    }
  }, { signal: listenerController.signal });

  window.DigitalBalanceEyeBreak = Object.freeze({
    getSettings: () => ({ ...settings }),
    getState: () => ({ ...state, elapsedMs: state.status === "tracking" ? getElapsedMs() : state.elapsedMs }),
    saveSettings,
    reset: resetProgress,
    cleanup: onPageHide
  });

  if (!storage || !storage.eyeBreak) {
    showError("Eye Break Reminder โหลด Storage Layer ไม่ได้");
    return;
  }

  try {
    loadFromStorage();
  } catch (error) {
    clearTimer();
    showError(`โหลด Eye Break Reminder ไม่สำเร็จ: ${error.message}`);
  }
})();
