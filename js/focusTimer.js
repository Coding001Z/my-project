(function () {
  const storage = window.DigitalBalanceStorage;
  const DURATION_OPTIONS = [15, 25, 45, 60];
  const CATEGORY_LABELS = {
    social: "Social Media",
    study: "Study",
    work: "Work",
    entertainment: "Entertainment",
    exercise: "Exercise",
    other: "Other"
  };
  const errorMessage = document.querySelector("#focus-error");
  const notice = document.querySelector("#focus-notice");
  const timerDisplay = document.querySelector("#timer-display");
  const timerStatus = document.querySelector("#timer-status");
  const timerFace = document.querySelector("#timer-face");
  const progressTrack = document.querySelector("#timer-progress-track");
  const durationInputs = document.querySelectorAll('input[name="duration"]');
  const categoryInput = document.querySelector("#focus-category");
  const startButton = document.querySelector("#timer-start");
  const pauseButton = document.querySelector("#timer-pause");
  const resumeButton = document.querySelector("#timer-resume");
  const resetButton = document.querySelector("#timer-reset");
  const todayFocusTotal = document.querySelector("#today-focus-total");
  const todayFocusCount = document.querySelector("#today-focus-count");
  const todayFocusGoal = document.querySelector("#today-focus-goal");
  const todayFocusProgress = document.querySelector("#today-focus-progress");
  const historyCount = document.querySelector("#focus-history-count");
  const historyEmpty = document.querySelector("#focus-session-empty");
  const sessionList = document.querySelector("#focus-session-list");

  if (!storage || !storage.focusTimer || !storage.focusSessions || !storage.goals
    || !errorMessage || !notice || !timerDisplay || !timerStatus || !timerFace || !progressTrack
    || durationInputs.length !== DURATION_OPTIONS.length || !categoryInput || !startButton
    || !pauseButton || !resumeButton || !resetButton || !todayFocusTotal || !todayFocusCount
    || !todayFocusGoal || !todayFocusProgress || !historyCount || !historyEmpty || !sessionList) {
    throw new Error("Focus Timer โหลดไม่ครบ: ตรวจสอบ Storage Layer และองค์ประกอบ HTML");
  }

  let timerState;
  let tickInterval = null;
  let lastRenderedSecond = null;

  function getLocalDateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function formatDuration(minutes) {
    const hours = Math.floor(minutes / 60);
    const remaining = minutes % 60;
    if (hours === 0) {
      return `${remaining}m`;
    }
    if (remaining === 0) {
      return `${hours}h`;
    }
    return `${hours}h ${String(remaining).padStart(2, "0")}m`;
  }

  function getRemainingSeconds(state, now = Date.now()) {
    if (state.status === "running") {
      return Math.max(0, Math.ceil((state.deadline - now) / 1000));
    }
    if (state.status === "paused") {
      return state.remainingSeconds;
    }
    return state.durationMinutes * 60;
  }

  function updateTimerDisplay() {
    const remainingSeconds = getRemainingSeconds(timerState);
    if (remainingSeconds !== lastRenderedSecond) {
      lastRenderedSecond = remainingSeconds;
      const minutes = Math.floor(remainingSeconds / 60);
      const seconds = remainingSeconds % 60;
      timerDisplay.textContent = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

      const elapsed = timerState.durationMinutes * 60 - remainingSeconds;
      const percentage = Math.min(Math.max(elapsed / (timerState.durationMinutes * 60) * 100, 0), 100);
      timerFace.style.background = `radial-gradient(circle at center, #fff 62%, transparent 63%), conic-gradient(#72a989 ${percentage}%, #eaf2ec ${percentage}% 100%)`;
      progressTrack.firstElementChild.style.width = `${percentage}%`;
      progressTrack.setAttribute("aria-label", `ทำ Focus Session ไปแล้ว ${Math.round(percentage)}%`);
      timerFace.setAttribute("aria-label", `เหลือเวลา ${minutes} นาที ${seconds} วินาที`);
    }

    timerStatus.textContent = timerState.status === "running"
      ? `กำลังโฟกัส · ${timerState.durationMinutes} นาที`
      : timerState.status === "paused"
        ? "พัก Timer ชั่วคราว"
        : "พร้อมเริ่มโฟกัส";
  }

  function updateControls() {
    const isIdle = timerState.status === "idle";
    const isRunning = timerState.status === "running";
    startButton.hidden = !isIdle;
    pauseButton.hidden = !isRunning;
    resumeButton.hidden = timerState.status !== "paused";
    durationInputs.forEach((input) => {
      input.disabled = !isIdle;
      input.checked = Number(input.value) === timerState.durationMinutes;
    });
    categoryInput.disabled = !isIdle;
  }

  function setNotice(message) {
    notice.textContent = message;
    notice.hidden = message.length === 0;
  }

  function setError(message) {
    errorMessage.textContent = message;
    errorMessage.hidden = message.length === 0;
  }

  function clearTickInterval() {
    if (tickInterval !== null) {
      window.clearInterval(tickInterval);
      tickInterval = null;
    }
  }

  function getTodaySessions() {
    const today = getLocalDateKey(new Date());
    return storage.focusSessions.get()
      .filter((session) => session.date === today && session.completed && session.duration > 0)
      .sort((first, second) => second.id.localeCompare(first.id));
  }

  function renderTodayFocus() {
    const sessions = getTodaySessions();
    const totalMinutes = sessions.reduce((total, session) => total + session.duration, 0);
    const focusGoal = storage.goals.get().find((goal) => goal.type === "focus" && goal.active);
    if (!focusGoal) {
      throw new Error("ไม่พบ Focus Goal ที่เปิดใช้งาน");
    }

    const percentage = Math.min(Math.round(totalMinutes / focusGoal.targetMinutes * 100), 100);
    todayFocusTotal.textContent = formatDuration(totalMinutes);
    todayFocusCount.textContent = `${sessions.length} ${sessions.length === 1 ? "Session" : "Sessions"}`;
    todayFocusGoal.textContent = formatDuration(focusGoal.targetMinutes);
    todayFocusProgress.firstElementChild.style.width = `${percentage}%`;
    todayFocusProgress.setAttribute("aria-label", `Focus วันนี้ ${formatDuration(totalMinutes)} จากเป้าหมาย ${formatDuration(focusGoal.targetMinutes)}`);

    const fragment = document.createDocumentFragment();
    sessions.forEach((session) => {
      const item = document.createElement("li");
      item.className = "focus-session-item";

      const info = document.createElement("div");
      info.className = "focus-session-info";
      const category = document.createElement("strong");
      category.textContent = CATEGORY_LABELS[session.category];
      const time = document.createElement("span");
      time.textContent = formatDuration(session.duration);
      info.append(category, time);
      item.append(info, createSessionDate(session.date));
      fragment.append(item);
    });

    sessionList.replaceChildren(fragment);
    historyCount.textContent = `${sessions.length} ${sessions.length === 1 ? "Session" : "Sessions"}`;
    historyEmpty.hidden = sessions.length > 0;
  }

  function createSessionDate(dateKey) {
    const [year, month, day] = dateKey.split("-").map(Number);
    const date = new Date(0);
    date.setHours(0, 0, 0, 0);
    date.setFullYear(year, month - 1, day);
    const element = document.createElement("span");
    element.className = "focus-session-date";
    element.textContent = new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short" }).format(date);
    return element;
  }

  function completeSession() {
    clearTickInterval();
    setError("");

    try {
      storage.focusSessions.save({
        id: timerState.sessionId,
        date: timerState.date,
        duration: timerState.durationMinutes,
        category: timerState.category,
        completed: true
      });
      timerState = storage.focusTimer.reset(timerState.durationMinutes, timerState.category);
    } catch (error) {
      setError(`บันทึก Focus Session ไม่สำเร็จ: ${error.message}`);
      try {
        timerState = storage.focusTimer.get();
        if (timerState.status === "running") {
          startTickInterval();
        }
      } catch (stateError) {
        clearTickInterval();
        setError(`บันทึก Session ไม่สำเร็จ (${error.message}) และอ่าน Timer State ไม่สำเร็จ (${stateError.message})`);
        startButton.disabled = true;
        pauseButton.disabled = true;
        resumeButton.disabled = true;
        resetButton.disabled = true;
      }
      return;
    }

    lastRenderedSecond = null;
    updateTimerDisplay();
    updateControls();
    try {
      renderTodayFocus();
      setNotice("ครบเวลาแล้ว บันทึก Focus Session เรียบร้อย!");
    } catch (error) {
      setError(`บันทึก Focus Session แล้ว แต่โหลดสรุปวันนี้ไม่สำเร็จ: ${error.message}`);
    }
  }

  function tick() {
    if (timerState.status !== "running") {
      clearTickInterval();
      return;
    }

    if (getRemainingSeconds(timerState) === 0) {
      completeSession();
      return;
    }
    updateTimerDisplay();
  }

  function startTickInterval() {
    clearTickInterval();
    lastRenderedSecond = null;
    tick();
    if (timerState.status === "running") {
      tickInterval = window.setInterval(tick, 250);
    }
  }

  function startTimer() {
    const durationMinutes = Number(
      document.querySelector('input[name="duration"]:checked')?.value
    );
    const category = categoryInput.value;
    if (!DURATION_OPTIONS.includes(durationMinutes)) {
      setError("กรุณาเลือกระยะเวลาจากตัวเลือกที่กำหนด");
      return;
    }

    try {
      timerState = storage.focusTimer.set({
        status: "running",
        durationMinutes,
        category,
        sessionId: typeof window.crypto.randomUUID === "function"
          ? window.crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        date: getLocalDateKey(new Date()),
        deadline: Date.now() + durationMinutes * 60 * 1000
      });
      setError("");
      setNotice("");
      updateControls();
      startTickInterval();
    } catch (error) {
      setError(`เริ่ม Focus Timer ไม่สำเร็จ: ${error.message}`);
    }
  }

  function pauseTimer() {
    if (timerState.status !== "running") {
      return;
    }

    const remainingSeconds = getRemainingSeconds(timerState);
    if (remainingSeconds === 0) {
      completeSession();
      return;
    }

    try {
      timerState = storage.focusTimer.set({
        status: "paused",
        durationMinutes: timerState.durationMinutes,
        category: timerState.category,
        sessionId: timerState.sessionId,
        date: timerState.date,
        remainingSeconds
      });
      clearTickInterval();
      updateTimerDisplay();
      updateControls();
      setNotice("พัก Timer แล้ว เวลาที่เหลือถูกบันทึกไว้");
    } catch (error) {
      setError(`พัก Timer ไม่สำเร็จ: ${error.message}`);
    }
  }

  function resumeTimer() {
    if (timerState.status !== "paused") {
      return;
    }

    try {
      timerState = storage.focusTimer.set({
        status: "running",
        durationMinutes: timerState.durationMinutes,
        category: timerState.category,
        sessionId: timerState.sessionId,
        date: timerState.date,
        deadline: Date.now() + timerState.remainingSeconds * 1000
      });
      setError("");
      setNotice("");
      updateControls();
      startTickInterval();
    } catch (error) {
      setError(`ทำ Timer ต่อไม่สำเร็จ: ${error.message}`);
    }
  }

  function resetTimer() {
    clearTickInterval();
    try {
      const durationMinutes = timerState.status === "idle"
        ? Number(document.querySelector('input[name="duration"]:checked')?.value) || timerState.durationMinutes
        : timerState.durationMinutes;
      const category = timerState.status === "idle" ? categoryInput.value : timerState.category;
      timerState = storage.focusTimer.reset(durationMinutes, category);
      lastRenderedSecond = null;
      setError("");
      setNotice("รีเซ็ต Timer แล้ว");
      updateTimerDisplay();
      updateControls();
    } catch (error) {
      setError(`รีเซ็ต Timer ไม่สำเร็จ: ${error.message}`);
      if (timerState.status === "running") {
        startTickInterval();
      }
    }
  }

  startButton.addEventListener("click", startTimer);
  pauseButton.addEventListener("click", pauseTimer);
  resumeButton.addEventListener("click", resumeTimer);
  resetButton.addEventListener("click", resetTimer);

  durationInputs.forEach((input) => {
    input.addEventListener("change", () => {
      if (timerState.status !== "idle" || !DURATION_OPTIONS.includes(Number(input.value))) {
        return;
      }

      try {
        timerState = storage.focusTimer.reset(Number(input.value), categoryInput.value);
        lastRenderedSecond = null;
        updateTimerDisplay();
        setNotice("");
      } catch (error) {
        setError(`เปลี่ยนระยะเวลาไม่สำเร็จ: ${error.message}`);
      }
    });
  });

  categoryInput.addEventListener("change", () => {
    if (timerState.status !== "idle") {
      return;
    }

    try {
      timerState = storage.focusTimer.reset(timerState.durationMinutes, categoryInput.value);
    } catch (error) {
      setError(`เปลี่ยนหมวดหมู่ไม่สำเร็จ: ${error.message}`);
    }
  });

  window.addEventListener("storage", (event) => {
    try {
      if (event.key === "digitalBalance.focusSessions.v1" || event.key === "digitalBalance.goals.v1" || event.key === null) {
        renderTodayFocus();
      }
      if (event.key === "digitalBalance.focusTimerState.v1" || event.key === null) {
        clearTickInterval();
        timerState = storage.focusTimer.get();
        updateControls();
        if (timerState.status === "running") {
          startTickInterval();
        } else {
          lastRenderedSecond = null;
          updateTimerDisplay();
        }
      }
    } catch (error) {
      setError(`อัปเดต Focus Timer ไม่สำเร็จ: ${error.message}`);
    }
  });

  try {
    timerState = storage.focusTimer.get();
    categoryInput.value = timerState.category;
    updateControls();
    renderTodayFocus();
    updateTimerDisplay();

    if (timerState.status === "running") {
      if (getRemainingSeconds(timerState) === 0) {
        completeSession();
      } else {
        setNotice("Timer ที่กำลังทำงานถูกกู้คืนหลังเปิดหน้า");
        startTickInterval();
      }
    } else if (timerState.status === "paused") {
      setNotice("กู้คืน Timer ที่พักไว้แล้ว กดทำต่อเพื่อเริ่มนับเวลา");
    }
  } catch (error) {
    setError(`โหลด Focus Timer ไม่สำเร็จ: ${error.message}`);
    startButton.disabled = true;
    pauseButton.disabled = true;
    resumeButton.disabled = true;
    resetButton.disabled = true;
  }
})();
