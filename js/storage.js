(function () {
  const STORAGE_KEY = "digitalBalance.screenTimeEntries.v1";
  const GOALS_KEY = "digitalBalance.goals.v1";
  const FOCUS_SESSIONS_KEY = "digitalBalance.focusSessions.v1";
  const FOCUS_TIMER_KEY = "digitalBalance.focusTimerState.v1";
  const EYE_BREAK_SETTINGS_KEY = "digitalBalance.eyeBreakSettings.v1";
  const EYE_BREAK_STATE_KEY = "digitalBalance.eyeBreakState.v1";
  const CATEGORIES = ["social", "study", "work", "entertainment", "exercise", "other"];
  const FOCUS_DURATIONS = [15, 25, 45, 60];
  const EYE_BREAK_INTERVALS = [30, 45, 50, 60];
  const DEFAULT_GOALS = [
    { id: "goal-001", type: "screen_time", targetMinutes: 420, period: "daily", active: true },
    { id: "goal-002", type: "social_media", targetMinutes: 120, period: "daily", active: true },
    { id: "goal-003", type: "focus", targetMinutes: 240, period: "daily", active: true }
  ];

  function isValidDate(value) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!match) {
      return false;
    }

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const date = new Date(0);
    date.setHours(0, 0, 0, 0);
    date.setFullYear(year, month - 1, day);
    return date.getFullYear() === year
      && date.getMonth() === month - 1
      && date.getDate() === day;
  }

  function getTimeInMinutes(value) {
    const match = /^(\d{2}):(\d{2})$/.exec(value);
    if (!match) {
      return null;
    }

    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    if (hours > 23 || minutes > 59) {
      return null;
    }

    return hours * 60 + minutes;
  }

  function isEntry(entry) {
    return entry !== null
      && typeof entry === "object"
      && typeof entry.id === "string"
      && entry.id.length > 0
      && typeof entry.date === "string"
      && isValidDate(entry.date)
      && CATEGORIES.includes(entry.category)
      && typeof entry.startTime === "string"
      && typeof entry.endTime === "string"
      && getTimeInMinutes(entry.startTime) !== null
      && getTimeInMinutes(entry.endTime) !== null
      && Number.isInteger(entry.duration)
      && entry.duration >= 0
      && getTimeInMinutes(entry.endTime) - getTimeInMinutes(entry.startTime) === entry.duration
      && typeof entry.note === "string";
  }

  function isRecordableEntry(entry) {
    return isEntry(entry) && entry.duration > 0;
  }

  function validateEntries(entries) {
    if (!Array.isArray(entries)) {
      throw new Error("ข้อมูล Screen Time ใน LocalStorage ไม่ถูกต้อง คาดว่าจะได้รับรายการแบบ Array");
    }

    const seenIds = new Set();
    entries.forEach((entry) => {
      if (!isEntry(entry)) {
        throw new Error("พบรายการ Screen Time ที่ข้อมูลไม่ครบหรือไม่ถูกต้อง กรุณาตรวจสอบข้อมูลใน LocalStorage");
      }

      if (seenIds.has(entry.id)) {
        throw new Error("พบ ID ซ้ำในข้อมูล Screen Time กรุณาตรวจสอบข้อมูลใน LocalStorage");
      }

      seenIds.add(entry.id);
    });

    return entries;
  }

  function get() {
    const savedValue = window.localStorage.getItem(STORAGE_KEY);
    if (savedValue === null) {
      return [];
    }

    let entries;
    try {
      entries = JSON.parse(savedValue);
    } catch (error) {
      throw new Error("อ่านข้อมูล Screen Time ไม่สำเร็จ ข้อมูลใน LocalStorage อาจเสียหาย", { cause: error });
    }

    return validateEntries(entries);
  }

  function write(entries) {
    validateEntries(entries);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  }

  function save(entry) {
    if (!isRecordableEntry(entry)) {
      throw new Error("ไม่สามารถบันทึกรายการได้: ข้อมูลรายการไม่ถูกต้อง");
    }

    const entries = get();
    if (entries.some((savedEntry) => savedEntry.id === entry.id)) {
      throw new Error("ไม่สามารถบันทึกรายการได้: ID นี้มีอยู่แล้ว");
    }

    entries.push(entry);
    write(entries);
    return entry;
  }

  function update(id, changes) {
    const entries = get();
    const entryIndex = entries.findIndex((entry) => entry.id === id);
    if (entryIndex === -1) {
      throw new Error("ไม่พบรายการที่ต้องการแก้ไข รายการอาจถูกลบไปแล้ว");
    }

    const updatedEntry = { ...entries[entryIndex], ...changes, id };
    if (!isRecordableEntry(updatedEntry)) {
      throw new Error("ไม่สามารถแก้ไขรายการได้: ข้อมูลรายการไม่ถูกต้อง");
    }

    entries[entryIndex] = updatedEntry;
    write(entries);
    return updatedEntry;
  }

  function remove(id) {
    const entries = get();
    const entryIndex = entries.findIndex((entry) => entry.id === id);
    if (entryIndex === -1) {
      throw new Error("ไม่พบรายการที่ต้องการลบ รายการอาจถูกลบไปแล้ว");
    }

    entries.splice(entryIndex, 1);
    write(entries);
  }

  function readJson(key, label) {
    const savedValue = window.localStorage.getItem(key);
    if (savedValue === null) {
      return null;
    }

    try {
      return JSON.parse(savedValue);
    } catch (error) {
      throw new Error(`อ่านข้อมูล${label}ไม่สำเร็จ ข้อมูลใน LocalStorage อาจเสียหาย`, { cause: error });
    }
  }

  function isGoal(goal) {
    return goal !== null
      && typeof goal === "object"
      && typeof goal.id === "string"
      && goal.id.length > 0
      && ["screen_time", "social_media", "focus"].includes(goal.type)
      && Number.isInteger(goal.targetMinutes)
      && goal.targetMinutes > 0
      && goal.targetMinutes <= 1440
      && goal.period === "daily"
      && typeof goal.active === "boolean";
  }

  function validateGoals(goals) {
    if (!Array.isArray(goals)) {
      throw new Error("ข้อมูล Goals ใน LocalStorage ไม่ถูกต้อง");
    }

    const types = new Set();
    goals.forEach((goal) => {
      if (!isGoal(goal) || types.has(goal.type)) {
        throw new Error("พบ Goal ที่ข้อมูลไม่ถูกต้องหรือซ้ำ กรุณาตรวจสอบ LocalStorage");
      }
      types.add(goal.type);
    });

    return goals;
  }

  function getGoals() {
    const goals = readJson(GOALS_KEY, " Goals");
    if (goals === null) {
      const defaults = DEFAULT_GOALS.map((goal) => ({ ...goal }));
      window.localStorage.setItem(GOALS_KEY, JSON.stringify(defaults));
      return defaults;
    }

    return validateGoals(goals);
  }

  function updateGoals(targets) {
    const goals = getGoals();
    const updatedGoals = goals.map((goal) => {
      if (!Object.prototype.hasOwnProperty.call(targets, goal.type)) {
        return goal;
      }

      const targetMinutes = targets[goal.type];
      const updatedGoal = { ...goal, targetMinutes };
      if (!isGoal(updatedGoal)) {
        throw new Error(`เป้าหมาย ${goal.type} ต้องอยู่ระหว่าง 1 ถึง 1440 นาที`);
      }
      return updatedGoal;
    });

    validateGoals(updatedGoals);
    window.localStorage.setItem(GOALS_KEY, JSON.stringify(updatedGoals));
    return updatedGoals;
  }

  function isFocusSession(session) {
    return session !== null
      && typeof session === "object"
      && typeof session.id === "string"
      && session.id.length > 0
      && typeof session.date === "string"
      && isValidDate(session.date)
      && Number.isInteger(session.duration)
      && session.duration > 0
      && CATEGORIES.includes(session.category)
      && typeof session.completed === "boolean";
  }

  function validateFocusSessions(sessions) {
    if (!Array.isArray(sessions)) {
      throw new Error("ข้อมูล Focus Sessions ใน LocalStorage ไม่ถูกต้อง");
    }

    const ids = new Set();
    sessions.forEach((session) => {
      if (!isFocusSession(session) || ids.has(session.id)) {
        throw new Error("พบ Focus Session ที่ข้อมูลไม่ถูกต้องหรือ ID ซ้ำ กรุณาตรวจสอบ LocalStorage");
      }
      ids.add(session.id);
    });

    return sessions;
  }

  function getFocusSessions() {
    const sessions = readJson(FOCUS_SESSIONS_KEY, " Focus Sessions");
    return sessions === null ? [] : validateFocusSessions(sessions);
  }

  function saveFocusSession(session) {
    if (!isFocusSession(session)) {
      throw new Error("ไม่สามารถบันทึก Focus Session ได้: ข้อมูล Session ไม่ถูกต้อง");
    }

    const sessions = getFocusSessions();
    const existingSession = sessions.find((item) => item.id === session.id);
    if (existingSession) {
      if (JSON.stringify(existingSession) !== JSON.stringify(session)) {
        throw new Error("พบ Session ID ซ้ำที่มีข้อมูลไม่ตรงกัน");
      }
      return existingSession;
    }

    sessions.push(session);
    validateFocusSessions(sessions);
    window.localStorage.setItem(FOCUS_SESSIONS_KEY, JSON.stringify(sessions));
    return session;
  }

  function isFocusTimerState(state) {
    if (!state || typeof state !== "object"
      || !["idle", "running", "paused"].includes(state.status)
      || !FOCUS_DURATIONS.includes(state.durationMinutes)
      || !CATEGORIES.includes(state.category)) {
      return false;
    }

    if (state.status === "idle") {
      return true;
    }

    if (typeof state.sessionId !== "string" || state.sessionId.length === 0) {
      return false;
    }
    if (typeof state.date !== "string" || !isValidDate(state.date)) {
      return false;
    }

    if (state.status === "running") {
      return Number.isFinite(state.deadline) && state.deadline > 0;
    }

    return Number.isInteger(state.remainingSeconds)
      && state.remainingSeconds > 0
      && state.remainingSeconds <= state.durationMinutes * 60;
  }

  function getFocusTimerState() {
    const state = readJson(FOCUS_TIMER_KEY, " Focus Timer State");
    if (state === null) {
      return { status: "idle", durationMinutes: 25, category: "study" };
    }
    if (!isFocusTimerState(state)) {
      throw new Error("ข้อมูล Focus Timer State ไม่ถูกต้อง กรุณาตรวจสอบ LocalStorage");
    }
    return state;
  }

  function setFocusTimerState(state) {
    if (!isFocusTimerState(state)) {
      throw new Error("ไม่สามารถบันทึก Timer State ได้: ข้อมูล Timer ไม่ถูกต้อง");
    }
    window.localStorage.setItem(FOCUS_TIMER_KEY, JSON.stringify(state));
    return state;
  }

  function resetFocusTimerState(durationMinutes = 25, category = "study") {
    const state = { status: "idle", durationMinutes, category };
    setFocusTimerState(state);
    return state;
  }

  function isEyeBreakSettings(settings) {
    return settings !== null
      && typeof settings === "object"
      && typeof settings.enabled === "boolean"
      && EYE_BREAK_INTERVALS.includes(settings.intervalMinutes);
  }

  function getEyeBreakSettings() {
    const settings = readJson(EYE_BREAK_SETTINGS_KEY, " Eye Break Settings");
    if (settings === null) {
      const defaults = { enabled: true, intervalMinutes: 50 };
      window.localStorage.setItem(EYE_BREAK_SETTINGS_KEY, JSON.stringify(defaults));
      return defaults;
    }
    if (!isEyeBreakSettings(settings)) {
      throw new Error("ข้อมูล Eye Break Reminder ไม่ถูกต้อง กรุณาตรวจสอบ LocalStorage");
    }
    return settings;
  }

  function setEyeBreakSettings(settings) {
    if (!isEyeBreakSettings(settings)) {
      throw new Error("ตั้งค่า Eye Break ไม่ถูกต้อง: เลือกระยะเวลา 30, 45, 50 หรือ 60 นาที และเปิดหรือปิด Reminder");
    }
    window.localStorage.setItem(EYE_BREAK_SETTINGS_KEY, JSON.stringify(settings));
    return settings;
  }

  function isEyeBreakState(state) {
    if (state === null || typeof state !== "object"
      || !["tracking", "reminder", "break", "snoozed"].includes(state.status)) {
      return false;
    }

    if (state.status === "tracking" || state.status === "reminder") {
      return Number.isFinite(state.elapsedMs) && state.elapsedMs >= 0;
    }

    return Number.isFinite(state.deadline) && state.deadline > 0;
  }

  function getEyeBreakState() {
    const state = readJson(EYE_BREAK_STATE_KEY, " Eye Break State");
    if (state === null) {
      return { status: "tracking", elapsedMs: 0 };
    }
    if (!isEyeBreakState(state)) {
      throw new Error("ข้อมูล Eye Break Timer ไม่ถูกต้อง กรุณาตรวจสอบ LocalStorage");
    }
    return state;
  }

  function setEyeBreakState(state) {
    if (!isEyeBreakState(state)) {
      throw new Error("ไม่สามารถบันทึกสถานะ Eye Break ได้: ข้อมูล Timer ไม่ถูกต้อง");
    }
    window.localStorage.setItem(EYE_BREAK_STATE_KEY, JSON.stringify(state));
    return state;
  }

  function resetEyeBreakState() {
    return setEyeBreakState({ status: "tracking", elapsedMs: 0 });
  }

  function resetAllData() {
    const keysToRemove = [];
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (key && key.startsWith("digitalBalance.")) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach((key) => window.localStorage.removeItem(key));
    return keysToRemove.length;
  }

  window.DigitalBalanceStorage = Object.freeze({
    save,
    get,
    update,
    delete: remove,
    resetAllData,
    goals: Object.freeze({
      get: getGoals,
      update: updateGoals
    }),
    focusSessions: Object.freeze({
      get: getFocusSessions,
      save: saveFocusSession
    }),
    focusTimer: Object.freeze({
      get: getFocusTimerState,
      set: setFocusTimerState,
      reset: resetFocusTimerState
    }),
    eyeBreak: Object.freeze({
      getSettings: getEyeBreakSettings,
      setSettings: setEyeBreakSettings,
      getState: getEyeBreakState,
      setState: setEyeBreakState,
      resetState: resetEyeBreakState
    })
  });
})();
