(function () {
  const storage = window.DigitalBalanceStorage;
  const DAILY_GOAL_MINUTES = 7 * 60;
  const CATEGORY_ORDER = [
    { id: "social", label: "Social Media" },
    { id: "study", label: "Study" },
    { id: "work", label: "Work" },
    { id: "entertainment", label: "Entertainment" },
    { id: "exercise", label: "Exercise" },
    { id: "other", label: "Other" }
  ];
  const DAY_LABELS = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];

  function getDateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function getValidDurationEntries(entries) {
    return entries.filter((entry) => Number.isInteger(entry.duration) && entry.duration > 0);
  }

  function getTodayScreenTime(entries, dateKey = getDateKey(new Date())) {
    return getValidDurationEntries(entries)
      .filter((entry) => entry.date === dateKey)
      .reduce((total, entry) => total + entry.duration, 0);
  }

  function getCategoryBreakdown(entries, dateKey = getDateKey(new Date())) {
    const todayEntries = getValidDurationEntries(entries).filter((entry) => entry.date === dateKey);
    const totalMinutes = todayEntries.reduce((total, entry) => total + entry.duration, 0);

    return CATEGORY_ORDER.map((category) => {
      const minutes = todayEntries
        .filter((entry) => entry.category === category.id)
        .reduce((total, entry) => total + entry.duration, 0);

      return {
        ...category,
        minutes,
        percentage: totalMinutes === 0 ? 0 : Math.round(minutes / totalMinutes * 100)
      };
    }).filter((category) => category.minutes > 0);
  }

  function getWeeklyScreenTime(entries, date = new Date()) {
    const weekStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const dayFromMonday = (weekStart.getDay() + 6) % 7;
    weekStart.setDate(weekStart.getDate() - dayFromMonday);

    const days = Array.from({ length: 7 }, (_, index) => {
      const day = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + index);
      const dateKey = getDateKey(day);
      const minutes = getValidDurationEntries(entries)
        .filter((entry) => entry.date === dateKey)
        .reduce((total, entry) => total + entry.duration, 0);

      return {
        date: day,
        dateKey,
        label: DAY_LABELS[day.getDay()],
        minutes
      };
    });
    const totalMinutes = days.reduce((total, day) => total + day.minutes, 0);

    return {
      days,
      endDate: days[days.length - 1].date,
      startDate: weekStart,
      totalMinutes,
      averageMinutes: Math.round(totalMinutes / days.length)
    };
  }

  function calculateGoalProgress(screenTime, goalMinutes = DAILY_GOAL_MINUTES) {
    if (!Number.isFinite(screenTime) || screenTime < 0
      || !Number.isFinite(goalMinutes) || goalMinutes <= 0) {
      throw new Error("ไม่สามารถคำนวณความคืบหน้าได้: เวลาและเป้าหมายต้องเป็นตัวเลขที่ถูกต้อง");
    }

    return {
      goalMinutes,
      usedMinutes: screenTime,
      remainingMinutes: Math.max(goalMinutes - screenTime, 0),
      percentage: Math.min(Math.round(screenTime / goalMinutes * 100), 100)
    };
  }

  function formatDuration(minutes) {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (remainingMinutes === 0 && hours > 0) {
      return `${hours}h`;
    }
    if (hours === 0) {
      return `${remainingMinutes}m`;
    }
    return `${hours}h ${String(remainingMinutes).padStart(2, "0")}m`;
  }

  function formatDurationThai(minutes) {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    if (hours === 0) {
      return `${remainingMinutes} นาที`;
    }
    if (remainingMinutes === 0) {
      return `${hours} ชม.`;
    }
    return `${hours} ชม. ${remainingMinutes} นาที`;
  }

  function formatThaiDate(date, options) {
    return new Intl.DateTimeFormat("th-TH", options).format(date);
  }

  function getElements() {
    const elements = {
      todayDate: document.querySelector("#today-date"),
      datePickerLabel: document.querySelector("#date-picker-label"),
      dataError: document.querySelector("#dashboard-data-error"),
      todayTotal: document.querySelector("#today-total"),
      todayStatus: document.querySelector("#today-status"),
      screenTimeGoal: document.querySelector("#screen-time-goal"),
      todayProgressTrack: document.querySelector("#today-progress-track"),
      goalRing: document.querySelector("#goal-ring"),
      goalPercent: document.querySelector("#goal-percent"),
      goalDuration: document.querySelector("#goal-duration"),
      goalUsed: document.querySelector("#goal-used"),
      goalRemaining: document.querySelector("#goal-remaining"),
      goalStatus: document.querySelector("#goal-status"),
      socialGoalCurrent: document.querySelector("#social-goal-current"),
      socialGoalTarget: document.querySelector("#social-goal-target"),
      socialGoalRemaining: document.querySelector("#social-goal-remaining"),
      socialGoalProgress: document.querySelector("#social-goal-progress"),
      socialGoalTrack: document.querySelector("#social-goal-track"),
      focusGoalCurrent: document.querySelector("#focus-goal-current"),
      focusGoalTarget: document.querySelector("#focus-goal-target"),
      focusGoalRemaining: document.querySelector("#focus-goal-remaining"),
      focusGoalProgress: document.querySelector("#focus-goal-progress"),
      focusGoalTrack: document.querySelector("#focus-goal-track"),
      categoryTotal: document.querySelector("#category-total"),
      categoryBar: document.querySelector("#category-bar"),
      categoryList: document.querySelector("#category-list"),
      categoryEmpty: document.querySelector("#category-empty"),
      weekLabel: document.querySelector("#week-label"),
      weeklyTotal: document.querySelector("#weekly-total"),
      weeklyAverage: document.querySelector("#weekly-average"),
      chart: document.querySelector("#weekly-chart"),
      chartGuides: document.querySelector("#chart-guides"),
      chartColumns: document.querySelector("#chart-columns"),
      weeklyEmpty: document.querySelector("#weekly-empty")
    };

    if (Object.values(elements).some((element) => !element)) {
      throw new Error("Dashboard โหลดไม่ครบ: ตรวจสอบองค์ประกอบใน index.html");
    }

    return elements;
  }

  function createTextElement(tagName, className, text) {
    const element = document.createElement(tagName);
    element.className = className;
    element.textContent = text;
    return element;
  }

  function renderDate(elements, today) {
    elements.todayDate.textContent = formatThaiDate(today, {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric"
    });
    elements.datePickerLabel.textContent = `วันนี้, ${formatThaiDate(today, {
      day: "numeric",
      month: "short",
      year: "numeric"
    })}`;
    document.querySelector("#date-picker").setAttribute(
      "aria-label",
      `วันที่ ${elements.datePickerLabel.textContent}`
    );
  }

  function renderGoalDetail(elements, prefix, currentMinutes, targetMinutes, label) {
    const progress = calculateGoalProgress(currentMinutes, targetMinutes);
    elements[`${prefix}GoalCurrent`].textContent = formatDuration(currentMinutes);
    elements[`${prefix}GoalTarget`].textContent = formatDuration(targetMinutes);
    elements[`${prefix}GoalRemaining`].textContent = formatDuration(progress.remainingMinutes);
    elements[`${prefix}GoalProgress`].textContent = `${progress.percentage}%`;
    elements[`${prefix}GoalTrack`].firstElementChild.style.width = `${progress.percentage}%`;
    elements[`${prefix}GoalTrack`].setAttribute(
      "aria-label",
      `${label}: ใช้ไป ${formatDuration(currentMinutes)} จาก ${formatDuration(targetMinutes)}, ${progress.percentage}%`
    );
  }

  function renderToday(elements, entries, sessions, goals, todayKey) {
    const todayMinutes = getTodayScreenTime(entries, todayKey);
    const activeGoals = goals.filter((goal) => goal.active);
    const getGoalTarget = (type) => {
      const goal = activeGoals.find((item) => item.type === type);
      if (!goal) {
        throw new Error(`ไม่พบเป้าหมาย ${type} ที่เปิดใช้งาน`);
      }
      return goal.targetMinutes;
    };
    const screenGoal = getGoalTarget("screen_time");
    const socialGoal = getGoalTarget("social_media");
    const focusGoal = getGoalTarget("focus");
    const goal = calculateGoalProgress(todayMinutes, screenGoal);
    const todayFocusMinutes = sessions
      .filter((session) => session.date === todayKey && session.completed && session.duration > 0)
      .reduce((total, session) => total + session.duration, 0);
    const todaySocialMinutes = getCategoryBreakdown(entries, todayKey)
      .find((category) => category.id === "social")?.minutes || 0;
    const hasTodayEntries = getValidDurationEntries(entries).some((entry) => entry.date === todayKey);

    elements.todayTotal.textContent = formatDuration(todayMinutes);
    elements.todayStatus.textContent = hasTodayEntries
      ? "เวลารวมจากรายการที่บันทึกวันนี้"
      : "วันนี้ยังไม่มีรายการบันทึก";
    elements.screenTimeGoal.textContent = formatDuration(screenGoal);
    elements.todayProgressTrack.firstElementChild.style.width = `${goal.percentage}%`;
    elements.todayProgressTrack.setAttribute(
      "aria-label",
      `ใช้เวลา ${formatDuration(todayMinutes)} จากเป้าหมาย ${formatDuration(goal.goalMinutes)}`
    );

    elements.goalPercent.textContent = `${goal.percentage}%`;
    elements.goalRing.style.background = `conic-gradient(#72a989 0 ${goal.percentage}%, #edf2ef ${goal.percentage}% 100%)`;
    elements.goalRing.setAttribute("aria-label", `ใช้เวลา ${formatDuration(todayMinutes)} คิดเป็น ${goal.percentage}% ของเป้าหมาย`);
    elements.goalDuration.textContent = formatDuration(screenGoal);
    elements.goalUsed.textContent = formatDuration(todayMinutes);
    elements.goalRemaining.textContent = formatDuration(goal.remainingMinutes);
    elements.goalStatus.textContent = goal.remainingMinutes === 0
      ? "ถึงเป้าหมายเวลาหน้าจอวันนี้แล้ว"
      : hasTodayEntries
        ? `ใช้เวลาได้อีก ${formatDuration(goal.remainingMinutes)} ก่อนถึงเป้าหมาย`
        : "เริ่มบันทึกเวลาเพื่อดูความคืบหน้า";
    renderGoalDetail(elements, "social", todaySocialMinutes, socialGoal, "Social Media");
    renderGoalDetail(elements, "focus", todayFocusMinutes, focusGoal, "Focus");
  }

  function renderCategories(elements, entries, todayKey) {
    const categories = getCategoryBreakdown(entries, todayKey);
    const totalMinutes = categories.reduce((total, category) => total + category.minutes, 0);
    const listFragment = document.createDocumentFragment();
    const barFragment = document.createDocumentFragment();

    categories.forEach((category) => {
      const item = document.createElement("li");
      const name = document.createElement("span");
      name.className = "category-name";

      const dot = document.createElement("i");
      dot.className = `category-dot ${category.id}-dot`;
      dot.setAttribute("aria-hidden", "true");
      name.append(dot, document.createTextNode(category.label));

      item.append(
        name,
        createTextElement("strong", "", formatDuration(category.minutes)),
        createTextElement("span", "category-percent", `${category.percentage}%`)
      );
      listFragment.append(item);

      const segment = document.createElement("span");
      segment.className = `segment ${category.id}`;
      segment.style.width = `${category.percentage}%`;
      barFragment.append(segment);
    });

    elements.categoryList.replaceChildren(listFragment);
    elements.categoryBar.replaceChildren(barFragment);
    elements.categoryTotal.textContent = formatDuration(totalMinutes);
    elements.categoryBar.setAttribute(
      "aria-label",
      categories.length === 0
        ? "วันนี้ยังไม่มีเวลาที่บันทึกตามหมวดหมู่"
        : categories.map((category) => `${category.label} ${formatDuration(category.minutes)}`).join(", ")
    );
    elements.categoryEmpty.hidden = categories.length > 0;
  }

  function renderWeeklyChart(elements, weekly) {
    const maxMinutes = Math.max(...weekly.days.map((day) => day.minutes));
    const guideStep = Math.max(Math.ceil(maxMinutes / 4 / 30) * 30, 30);
    const guideMaximum = guideStep * 4;
    const guideFragment = document.createDocumentFragment();
    const chartFragment = document.createDocumentFragment();

    [guideMaximum, guideStep * 3, guideStep * 2, guideStep].forEach((minutes) => {
      guideFragment.append(createTextElement("span", "", formatDurationThai(minutes)));
    });

    weekly.days.forEach((day) => {
      const column = document.createElement("div");
      column.className = "chart-column";
      if (day.dateKey === getDateKey(new Date())) {
        column.classList.add("is-today");
      }

      const bar = document.createElement("span");
      bar.className = "chart-bar";
      const barHeight = guideMaximum === 0 ? 0 : day.minutes / guideMaximum * 100;
      bar.style.setProperty("--bar-height", `${barHeight}%`);
      bar.title = `${day.label} ${formatDuration(day.minutes)}`;
      bar.setAttribute("aria-label", `${day.label} ${formatDuration(day.minutes)}`);

      const label = createTextElement("span", "chart-day", day.label);
      column.append(bar, label);
      chartFragment.append(column);
    });

    elements.chartGuides.replaceChildren(guideFragment);
    elements.chartColumns.replaceChildren(chartFragment);
    elements.chart.setAttribute(
      "aria-label",
      `เวลาหน้าจอสัปดาห์นี้ ${weekly.days.map((day) => `${day.label} ${formatDuration(day.minutes)}`).join(", ")}`
    );
    elements.weeklyTotal.textContent = formatDuration(weekly.totalMinutes);
    elements.weeklyAverage.textContent = formatDuration(weekly.averageMinutes);
    elements.weekLabel.textContent = `${formatThaiDate(weekly.startDate, { day: "numeric", month: "short" })} – ${formatThaiDate(weekly.endDate, { day: "numeric", month: "short", year: "numeric" })}`;
    elements.weeklyEmpty.hidden = weekly.totalMinutes > 0;
  }

  function clearDashboard(elements) {
    elements.todayTotal.textContent = "—";
    elements.todayStatus.textContent = "";
    elements.screenTimeGoal.textContent = "—";
    elements.todayProgressTrack.firstElementChild.style.width = "0%";
    elements.goalPercent.textContent = "—";
    elements.goalDuration.textContent = "—";
    elements.goalUsed.textContent = "—";
    elements.goalRemaining.textContent = "—";
    elements.goalStatus.textContent = "ไม่สามารถอ่านข้อมูลเป้าหมายได้";
    ["social", "focus"].forEach((prefix) => {
      elements[`${prefix}GoalCurrent`].textContent = "—";
      elements[`${prefix}GoalTarget`].textContent = "—";
      elements[`${prefix}GoalRemaining`].textContent = "—";
      elements[`${prefix}GoalProgress`].textContent = "—";
      elements[`${prefix}GoalTrack`].firstElementChild.style.width = "0%";
    });
    elements.categoryTotal.textContent = "—";
    elements.categoryList.replaceChildren();
    elements.categoryBar.replaceChildren();
    elements.categoryEmpty.hidden = true;
    elements.weeklyTotal.textContent = "—";
    elements.weeklyAverage.textContent = "—";
    elements.chartColumns.replaceChildren();
    elements.chartGuides.replaceChildren();
    elements.weeklyEmpty.hidden = true;
  }

  function renderDashboard() {
    const elements = getElements();
    const today = new Date();
    renderDate(elements, today);
    elements.dataError.hidden = true;

    try {
      if (!storage) {
        throw new Error("ไม่พบ Storage Layer สำหรับข้อมูล Screen Time");
      }

      const entries = storage.get();
      const goals = storage.goals.get();
      const sessions = storage.focusSessions.get();
      const todayKey = getDateKey(today);
      renderToday(elements, entries, sessions, goals, todayKey);
      renderCategories(elements, entries, todayKey);
      renderWeeklyChart(elements, getWeeklyScreenTime(entries, today));
    } catch (error) {
      clearDashboard(elements);
      elements.dataError.textContent = `ไม่สามารถคำนวณ Dashboard ได้: ${error.message}`;
      elements.dataError.hidden = false;
    }
  }

  window.DigitalBalanceDashboard = Object.freeze({
    getTodayScreenTime,
    getCategoryBreakdown,
    getWeeklyScreenTime,
    calculateGoalProgress,
    render: renderDashboard
  });

  renderDashboard();
  window.addEventListener("storage", (event) => {
    if ([
      "digitalBalance.screenTimeEntries.v1",
      "digitalBalance.goals.v1",
      "digitalBalance.focusSessions.v1"
    ].includes(event.key) || event.key === null) {
      renderDashboard();
    }
  });
})();
