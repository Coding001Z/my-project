(function () {
  const storage = window.DigitalBalanceStorage;
  const GOAL_TYPES = ["screen_time", "social_media", "focus"];
  const form = document.querySelector("#goals-form");
  const errorMessage = document.querySelector("#goals-error");
  const successMessage = document.querySelector("#goals-success");
  const fields = {
    screen_time: document.querySelector("#screen-goal-input"),
    social_media: document.querySelector("#social-goal-input"),
    focus: document.querySelector("#focus-goal-input")
  };

  if (!storage || !storage.goals || !storage.focusSessions || !form || !errorMessage
    || !successMessage || Object.values(fields).some((field) => !field)) {
    throw new Error("หน้าตั้งเป้าหมายโหลดไม่ครบ: ตรวจสอบ Storage Layer และองค์ประกอบ HTML");
  }

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

  function renderProgress(type, current, target) {
    const remaining = Math.max(target - current, 0);
    const percentage = Math.min(Math.round(current / target * 100), 100);
    document.querySelector(`#${type}-current`).textContent = formatDuration(current);
    document.querySelector(`#${type}-target-label`).textContent = formatDuration(target);
    document.querySelector(`#${type}-remaining`).textContent = formatDuration(remaining);
    document.querySelector(`#${type}-progress`).textContent = `${percentage}%`;

    const track = document.querySelector(`#${type}-track`);
    track.firstElementChild.style.width = `${percentage}%`;
    track.setAttribute("aria-label", `${type} ใช้ไป ${formatDuration(current)} จาก ${formatDuration(target)}, ${percentage}%`);
  }

  function renderGoals() {
    errorMessage.hidden = true;

    try {
      const goals = storage.goals.get();
      const entries = storage.get();
      const sessions = storage.focusSessions.get();
      const today = getLocalDateKey(new Date());
      const activeGoals = goals.filter((goal) => goal.active);
      const targets = {};

      GOAL_TYPES.forEach((type) => {
        const goal = activeGoals.find((item) => item.type === type);
        if (!goal) {
          throw new Error(`ไม่พบเป้าหมาย ${type} ที่เปิดใช้งาน`);
        }
        targets[type] = goal.targetMinutes;
        fields[type].value = String(goal.targetMinutes / 60);
      });

      const currentValues = {
        screen_time: entries
          .filter((entry) => entry.date === today && entry.duration > 0)
          .reduce((total, entry) => total + entry.duration, 0),
        social_media: entries
          .filter((entry) => entry.date === today && entry.category === "social" && entry.duration > 0)
          .reduce((total, entry) => total + entry.duration, 0),
        focus: sessions
          .filter((session) => session.date === today && session.completed && session.duration > 0)
          .reduce((total, session) => total + session.duration, 0)
      };

      renderProgress("screen", currentValues.screen_time, targets.screen_time);
      renderProgress("social", currentValues.social_media, targets.social_media);
      renderProgress("focus", currentValues.focus, targets.focus);
    } catch (error) {
      errorMessage.textContent = `โหลดเป้าหมายไม่สำเร็จ: ${error.message}`;
      errorMessage.hidden = false;
    }
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    errorMessage.hidden = true;
    successMessage.hidden = true;

    const targets = {};
    let firstInvalidField = null;

    GOAL_TYPES.forEach((type) => {
      const hours = Number(fields[type].value);
      const minutes = Math.round(hours * 60);
      const isValid = Number.isFinite(hours)
        && hours >= 0.25
        && hours <= 24
        && minutes > 0
        && minutes <= 1440;

      fields[type].setAttribute("aria-invalid", String(!isValid));
      if (!isValid && firstInvalidField === null) {
        firstInvalidField = fields[type];
      } else if (isValid) {
        targets[type] = minutes;
      }
    });

    if (firstInvalidField) {
      errorMessage.textContent = "กรุณากำหนดเป้าหมายแต่ละรายการตั้งแต่ 0.25 ถึง 24 ชั่วโมงต่อวัน";
      errorMessage.hidden = false;
      firstInvalidField.focus();
      return;
    }

    try {
      storage.goals.update(targets);
      successMessage.textContent = "บันทึกเป้าหมายเรียบร้อยแล้ว";
      successMessage.hidden = false;
      renderGoals();
    } catch (error) {
      errorMessage.textContent = `บันทึกเป้าหมายไม่สำเร็จ: ${error.message}`;
      errorMessage.hidden = false;
    }
  });

  Object.values(fields).forEach((field) => {
    field.addEventListener("input", () => {
      field.removeAttribute("aria-invalid");
      errorMessage.hidden = true;
      successMessage.hidden = true;
    });
  });

  renderGoals();
  window.addEventListener("storage", (event) => {
    if ([
      "digitalBalance.screenTimeEntries.v1",
      "digitalBalance.goals.v1",
      "digitalBalance.focusSessions.v1"
    ].includes(event.key) || event.key === null) {
      renderGoals();
    }
  });
})();
