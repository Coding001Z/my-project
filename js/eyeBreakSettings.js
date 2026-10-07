(function () {
  const reminder = window.DigitalBalanceEyeBreak;
  const enabledInput = document.querySelector("#eye-break-enabled");
  const intervalInputs = document.querySelectorAll('input[name="eye-break-interval"]');
  const resetButton = document.querySelector("#reset-eye-break");
  const settingsStatus = document.querySelector("#eye-break-settings-status");
  const feedback = document.querySelector("#settings-feedback");
  const errorMessage = document.querySelector("#settings-error");
  const resetAllButton = document.querySelector("#reset-all-data");
  const resetAllFeedback = document.querySelector("#data-reset-feedback");
  const storage = window.DigitalBalanceStorage;
  const allowedIntervals = [30, 45, 50, 60];

  if (!reminder || !enabledInput || intervalInputs.length !== allowedIntervals.length
    || !resetButton || !settingsStatus || !feedback || !errorMessage
    || !resetAllButton || !resetAllFeedback || !storage || !storage.resetAllData) {
    throw new Error("หน้า Settings โหลดไม่ครบ: ตรวจสอบ Eye Break Reminder และองค์ประกอบ HTML");
  }

  function showError(message) {
    errorMessage.textContent = message;
    errorMessage.hidden = false;
    feedback.hidden = true;
  }

  function showFeedback(message) {
    feedback.textContent = message;
    feedback.hidden = false;
    errorMessage.hidden = true;
  }

  function renderSettings() {
    try {
      const settings = reminder.getSettings();
      enabledInput.checked = settings.enabled;
      intervalInputs.forEach((input) => {
        input.checked = Number(input.value) === settings.intervalMinutes;
        input.disabled = !settings.enabled;
      });
      settingsStatus.textContent = settings.enabled
        ? `กำลังเตือนทุก ${settings.intervalMinutes} นาที · พัก 5 นาที · เลื่อนได้ 5 นาที`
        : "ปิดการเตือนแล้ว · Timer ถูกยกเลิก";
      resetButton.disabled = !settings.enabled;
    } catch (error) {
      showError(`อ่านการตั้งค่าไม่สำเร็จ: ${error.message}`);
      enabledInput.disabled = true;
      intervalInputs.forEach((input) => {
        input.disabled = true;
      });
      resetButton.disabled = true;
    }
  }

  function saveCurrentSettings() {
    const selectedInput = document.querySelector('input[name="eye-break-interval"]:checked');
    const intervalMinutes = Number(selectedInput?.value);
    if (!allowedIntervals.includes(intervalMinutes)) {
      showError("กรุณาเลือกระยะเวลา 30, 45, 50 หรือ 60 นาที");
      return;
    }

    try {
      const settings = reminder.saveSettings({
        enabled: enabledInput.checked,
        intervalMinutes
      });
      showFeedback(settings.enabled
        ? `บันทึกแล้ว · เตือนทุก ${settings.intervalMinutes} นาที`
        : "ปิด Reminder แล้ว และยกเลิก Timer ที่กำลังทำงาน");
      renderSettings();
    } catch (error) {
      showError(`บันทึกการตั้งค่าไม่สำเร็จ: ${error.message}`);
    }
  }

  enabledInput.addEventListener("change", saveCurrentSettings);
  intervalInputs.forEach((input) => {
    input.addEventListener("change", saveCurrentSettings);
  });

  resetButton.addEventListener("click", () => {
    if (resetButton.disabled) {
      return;
    }

    try {
      reminder.reset();
      showFeedback("เริ่มนับรอบการใช้งานใหม่แล้ว");
      renderSettings();
    } catch (error) {
      showError(`รีเซ็ตรอบเตือนไม่สำเร็จ: ${error.message}`);
    }
  });

  resetAllButton.addEventListener("click", () => {
    const confirmed = window.confirm(
      "ต้องการลบข้อมูล Digital Balance ทั้งหมดจากเบราว์เซอร์นี้หรือไม่? รายการเวลา เป้าหมาย Focus Session และการตั้งค่าจะถูกลบ และไม่สามารถกู้คืนได้"
    );
    if (!confirmed) {
      return;
    }

    resetAllButton.disabled = true;
    resetAllFeedback.hidden = true;
    try {
      reminder.cleanup();
      storage.resetAllData();
      window.location.assign("../index.html#dashboard");
    } catch (error) {
      resetAllButton.disabled = false;
      resetAllFeedback.textContent = `รีเซ็ตข้อมูลไม่สำเร็จ: ${error.message}`;
      resetAllFeedback.hidden = false;
    }
  });

  window.addEventListener("storage", (event) => {
    if (event.key === "digitalBalance.eyeBreakSettings.v1" || event.key === null) {
      renderSettings();
    }
  });

  renderSettings();
})();
