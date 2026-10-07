(function () {
  const storage = window.DigitalBalanceStorage;
  const form = document.querySelector("#time-entry-form");
  const dateInput = document.querySelector("#entry-date");
  const categoryInput = document.querySelector("#entry-category");
  const startInput = document.querySelector("#entry-start");
  const endInput = document.querySelector("#entry-end");
  const noteInput = document.querySelector("#entry-note");
  const formTitle = document.querySelector("#form-title");
  const formFeedback = document.querySelector("#form-feedback");
  const formSuccess = document.querySelector("#form-success");
  const listFeedback = document.querySelector("#list-feedback");
  const entryList = document.querySelector("#entry-list");
  const emptyState = document.querySelector("#empty-state");
  const entryCount = document.querySelector("#entry-count");
  const totalDuration = document.querySelector("#total-duration");
  const durationPreview = document.querySelector("#duration-preview");
  const durationPresetButtons = Array.from(document.querySelectorAll(".time-preset"));
  const saveButton = document.querySelector("#save-entry-button");
  const cancelButton = document.querySelector("#cancel-edit-button");
  const allowedCategories = new Set(["social", "study", "work", "entertainment", "exercise", "other"]);
  const categoryLabels = {
    social: "Social Media",
    study: "Study",
    work: "Work",
    entertainment: "Entertainment",
    exercise: "Exercise",
    other: "Other"
  };

  if (!storage || !form || !dateInput || !categoryInput || !startInput || !endInput || !noteInput
    || !formTitle || !formFeedback || !formSuccess || !listFeedback || !entryList || !emptyState
    || !entryCount || !totalDuration || !durationPreview || durationPresetButtons.length === 0
    || !saveButton || !cancelButton) {
    throw new Error("หน้าบันทึกเวลาโหลดไม่ครบ: ตรวจสอบองค์ประกอบ HTML และลำดับการโหลดสคริปต์");
  }

  function toLocalDateValue(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function parseDate(value) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!match) {
      return null;
    }

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const parsedDate = new Date(0);
    parsedDate.setHours(0, 0, 0, 0);
    parsedDate.setFullYear(year, month - 1, day);

    if (parsedDate.getFullYear() !== year
      || parsedDate.getMonth() !== month - 1
      || parsedDate.getDate() !== day) {
      return null;
    }

    return parsedDate;
  }

  function parseTime(value) {
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

  function calculateDuration(startTime, endTime) {
    const startMinutes = parseTime(startTime);
    const endMinutes = parseTime(endTime);
    if (startMinutes === null || endMinutes === null) {
      return null;
    }

    const duration = endMinutes - startMinutes;
    return duration > 0 ? duration : null;
  }

  function validateForm() {
    const errors = {};
    const duration = calculateDuration(startInput.value, endInput.value);

    if (!parseDate(dateInput.value)) {
      errors.date = "กรุณาเลือกวันที่ที่ถูกต้อง";
    }

    if (!allowedCategories.has(categoryInput.value)) {
      errors.category = "กรุณาเลือกหมวดหมู่จากรายการ";
    }

    if (parseTime(startInput.value) === null) {
      errors.startTime = "กรุณาระบุเวลาเริ่มต้นให้ถูกต้อง";
    }

    if (parseTime(endInput.value) === null) {
      errors.endTime = "กรุณาระบุเวลาสิ้นสุดให้ถูกต้อง";
    }

    if (parseTime(startInput.value) !== null
      && parseTime(endInput.value) !== null
      && duration === null) {
      errors.duration = "เวลาสิ้นสุดต้องอยู่หลังเวลาเริ่มต้นในวันเดียวกัน";
    }

    return { errors, duration };
  }

  function showValidationErrors(errors) {
    const errorTargets = {
      date: { input: dateInput, message: document.querySelector("#date-error") },
      category: { input: categoryInput, message: document.querySelector("#category-error") },
      startTime: { input: startInput, message: document.querySelector("#start-error") },
      endTime: { input: endInput, message: document.querySelector("#end-error") }
    };
    const messages = [];

    Object.entries(errorTargets).forEach(([field, target]) => {
      const message = errors[field] || "";
      target.input.setAttribute("aria-invalid", String(Boolean(message)));
      target.message.textContent = message;
      if (message) {
        messages.push(message);
      }
    });

    const durationMessage = errors.duration || "";
    document.querySelector("#duration-error").textContent = durationMessage;
    if (durationMessage) {
      endInput.setAttribute("aria-invalid", "true");
      messages.push(durationMessage);
    }

    formFeedback.textContent = messages.length > 0
      ? `กรุณาตรวจสอบข้อมูล: ${messages.join(" · ")}`
      : "";
    formFeedback.hidden = messages.length === 0;
  }

  function clearMessages() {
    formFeedback.hidden = true;
    formSuccess.hidden = true;
    listFeedback.hidden = true;
    showValidationErrors({});
  }

  function showStorageError(target, error, prefix) {
    target.textContent = `${prefix}: ${error.message}`;
    target.hidden = false;
  }

  function formatDuration(duration) {
    const hours = Math.floor(duration / 60);
    const minutes = duration % 60;
    if (hours === 0) {
      return `${minutes} นาที`;
    }
    if (minutes === 0) {
      return `${hours} ชม.`;
    }
    return `${hours} ชม. ${minutes} นาที`;
  }

  function updateDurationPreview() {
    const hasBothTimes = startInput.value && endInput.value;
    const duration = calculateDuration(startInput.value, endInput.value);

    durationPreview.classList.toggle("is-invalid", Boolean(hasBothTimes && duration === null));
    if (!hasBothTimes) {
      durationPreview.textContent = "เลือกเวลาเริ่มต้นและเวลาสิ้นสุดเพื่อดูระยะเวลา";
      return;
    }

    if (duration === null) {
      durationPreview.textContent = "เวลาสิ้นสุดต้องอยู่หลังเวลาเริ่มต้นในวันเดียวกัน";
      return;
    }

    durationPreview.textContent = `ระยะเวลา ${formatDuration(duration)}`;
  }

  function updateDurationPresets() {
    const startMinutes = parseTime(startInput.value);

    durationPresetButtons.forEach((button) => {
      const presetMinutes = Number(button.dataset.durationMinutes);
      const canApplyPreset = startMinutes !== null && startMinutes + presetMinutes < 24 * 60;
      button.disabled = !canApplyPreset;
      button.setAttribute("aria-pressed", String(
        canApplyPreset && calculateDuration(startInput.value, endInput.value) === presetMinutes
      ));
    });
  }

  function formatDate(dateValue) {
    const [year, month, day] = dateValue.split("-").map(Number);
    const date = new Date(0);
    date.setHours(0, 0, 0, 0);
    date.setFullYear(year, month - 1, day);
    return new Intl.DateTimeFormat("th-TH", {
      day: "numeric",
      month: "short",
      year: "numeric"
    }).format(date);
  }

  function createTextElement(tagName, className, text) {
    const element = document.createElement(tagName);
    element.className = className;
    element.textContent = text;
    return element;
  }

  function createActionButton(action, label, entryId, className) {
    const button = document.createElement("button");
    button.className = className;
    button.type = "button";
    button.dataset.action = action;
    button.dataset.id = entryId;
    button.textContent = label;
    return button;
  }

  function createEntryCard(entry) {
    const item = document.createElement("li");
    item.className = "entry-item";

    const card = document.createElement("article");
    card.className = "entry-card";

    const main = document.createElement("div");
    main.className = "entry-main";
    const heading = document.createElement("div");
    heading.className = "entry-heading";
    heading.append(
      createTextElement("span", "entry-category", categoryLabels[entry.category]),
      createTextElement("span", "entry-date", formatDate(entry.date))
    );

    const timeDetails = document.createElement("div");
    timeDetails.className = "entry-time-details";
    timeDetails.append(
      createTextElement("span", "entry-time-range", `${entry.startTime} – ${entry.endTime}`),
      createTextElement("span", "entry-duration", formatDuration(entry.duration))
    );
    main.append(heading, timeDetails);

    if (entry.note) {
      main.append(createTextElement("p", "entry-note", entry.note));
    }

    const actions = document.createElement("div");
    actions.className = "entry-actions";
    actions.append(
      createActionButton("edit", "แก้ไข", entry.id, "entry-action edit-action"),
      createActionButton("delete", "ลบ", entry.id, "entry-action delete-action")
    );
    card.append(main, actions);
    item.append(card);
    return item;
  }

  function renderEntries() {
    listFeedback.hidden = true;

    try {
      const storedEntries = storage.get();
      const entries = storedEntries.slice().sort((first, second) => {
        const dateOrder = second.date.localeCompare(first.date);
        return dateOrder || second.startTime.localeCompare(first.startTime);
      });
      const totalMinutes = entries.reduce((total, entry) => total + (entry.duration > 0 ? entry.duration : 0), 0);
      const fragment = document.createDocumentFragment();

      entries.forEach((entry) => fragment.append(createEntryCard(entry)));
      entryList.replaceChildren(fragment);
      entryCount.textContent = String(entries.length);
      totalDuration.textContent = formatDuration(totalMinutes);
      emptyState.hidden = entries.length > 0;
      if (storedEntries.some((entry) => entry.duration === 0)) {
        showStorageError(listFeedback, new Error("มีรายการ Duration 0 นาที รายการดังกล่าวไม่ถูกรวมในเวลาสะสม"), "ตรวจพบข้อมูลที่ไม่สมบูรณ์");
      }
      return true;
    } catch (error) {
      entryList.replaceChildren();
      emptyState.hidden = true;
      entryCount.textContent = "—";
      totalDuration.textContent = "—";
      showStorageError(listFeedback, error, "ไม่สามารถอ่านรายการได้");
      return false;
    }
  }

  function resetForm() {
    form.reset();
    dateInput.value = toLocalDateValue(new Date());
    delete form.dataset.editingId;
    formTitle.textContent = "เพิ่มรายการ";
    saveButton.textContent = "บันทึกรายการ";
    cancelButton.hidden = true;
    showValidationErrors({});
    updateDurationPreview();
  }

  function startEditing(entry) {
    clearMessages();
    form.dataset.editingId = entry.id;
    dateInput.value = entry.date;
    categoryInput.value = entry.category;
    startInput.value = entry.startTime;
    endInput.value = entry.endTime;
    noteInput.value = entry.note;
    formTitle.textContent = "แก้ไขรายการ";
    saveButton.textContent = "บันทึกการแก้ไข";
    cancelButton.hidden = false;
    updateDurationPreview();
    form.scrollIntoView({ behavior: "smooth", block: "center" });
    dateInput.focus();
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    clearMessages();

    const { errors, duration } = validateForm();
    if (Object.keys(errors).length > 0) {
      showValidationErrors(errors);
      const firstInvalidField = form.querySelector('[aria-invalid="true"]');
      if (firstInvalidField) {
        firstInvalidField.focus();
      }
      return;
    }

    const entryData = {
      date: dateInput.value,
      category: categoryInput.value,
      startTime: startInput.value,
      endTime: endInput.value,
      duration,
      note: noteInput.value.trim()
    };
    const editingId = form.dataset.editingId;

    try {
      if (editingId) {
        storage.update(editingId, entryData);
        formSuccess.textContent = "แก้ไขรายการเรียบร้อยแล้ว";
      } else {
        const id = typeof window.crypto.randomUUID === "function"
          ? window.crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
        storage.save({ id, ...entryData });
        formSuccess.textContent = "บันทึกรายการเรียบร้อยแล้ว";
      }

      formSuccess.hidden = false;
      resetForm();
      renderEntries();
    } catch (error) {
      showStorageError(formFeedback, error, "บันทึกรายการไม่สำเร็จ");
    }
  });

  entryList.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button || !entryList.contains(button)) {
      return;
    }

    clearMessages();
    try {
      const entry = storage.get().find((savedEntry) => savedEntry.id === button.dataset.id);
      if (!entry) {
        throw new Error("ไม่พบรายการนี้ อาจมีการเปลี่ยนแปลงข้อมูลจากแท็บอื่น");
      }

      if (button.dataset.action === "edit") {
        startEditing(entry);
        return;
      }

      if (button.dataset.action === "delete"
        && window.confirm("ต้องการลบรายการนี้หรือไม่? การลบจะไม่สามารถย้อนกลับได้")) {
        storage.delete(entry.id);
        if (form.dataset.editingId === entry.id) {
          resetForm();
        }
        renderEntries();
        formSuccess.textContent = "ลบรายการเรียบร้อยแล้ว";
        formSuccess.hidden = false;
      }
    } catch (error) {
      showStorageError(listFeedback, error, "จัดการรายการไม่สำเร็จ");
    }
  });

  cancelButton.addEventListener("click", () => {
    clearMessages();
    resetForm();
    formSuccess.textContent = "ยกเลิกการแก้ไขแล้ว";
    formSuccess.hidden = false;
  });

  [dateInput, categoryInput, startInput, endInput].forEach((input) => {
    input.addEventListener("input", () => {
      if (!formFeedback.hidden) {
        clearMessages();
      }
      updateDurationPreview();
      updateDurationPresets();
    });
  });

  durationPresetButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const startMinutes = parseTime(startInput.value);
      const durationMinutes = Number(button.dataset.durationMinutes);
      if (startMinutes === null || startMinutes + durationMinutes >= 24 * 60) {
        updateDurationPresets();
        return;
      }

      const endMinutes = startMinutes + durationMinutes;
      const hours = String(Math.floor(endMinutes / 60)).padStart(2, "0");
      const minutes = String(endMinutes % 60).padStart(2, "0");
      endInput.value = `${hours}:${minutes}`;
      clearMessages();
      updateDurationPreview();
      updateDurationPresets();
    });
  });

  dateInput.value = toLocalDateValue(new Date());
  updateDurationPreview();
  updateDurationPresets();
  renderEntries();
})();
