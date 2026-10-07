(function () {
  const storage = window.DigitalBalanceStorage;
  const CATEGORY_ORDER = [
    { id: "social", label: "Social Media", color: "#66a583" },
    { id: "study", label: "Study", color: "#7c9fc0" },
    { id: "work", label: "Work", color: "#c49a70" },
    { id: "entertainment", label: "Entertainment", color: "#a18dbd" },
    { id: "exercise", label: "Exercise", color: "#73aaa7" },
    { id: "other", label: "Other", color: "#a0aaa4" }
  ];
  const SVG_NS = "http://www.w3.org/2000/svg";
  const reportError = document.querySelector("#report-error");

  if (!storage || !storage.focusSessions || !reportError) {
    throw new Error("หน้า Weekly Report โหลดไม่ครบ: ตรวจสอบ Storage Layer และองค์ประกอบ HTML");
  }

  function getDateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function dateFromKey(dateKey) {
    const [year, month, day] = dateKey.split("-").map(Number);
    return new Date(Date.UTC(year, month - 1, day, 12));
  }

  function formatDay(dateKey, options = {}) {
    return new Intl.DateTimeFormat("th-TH", {
      timeZone: "UTC",
      day: "numeric",
      month: "short",
      ...options
    }).format(dateFromKey(dateKey));
  }

  function formatDuration(minutes) {
    const hours = Math.floor(minutes / 60);
    const remainder = minutes % 60;
    if (hours === 0) {
      return `${remainder} นาที`;
    }
    if (remainder === 0) {
      return `${hours} ชม.`;
    }
    return `${hours} ชม. ${remainder} นาที`;
  }

  function createElement(tagName, className, text) {
    const element = document.createElement(tagName);
    if (className) {
      element.className = className;
    }
    if (text !== undefined) {
      element.textContent = text;
    }
    return element;
  }

  function createSvgElement(tagName, attributes = {}) {
    const element = document.createElementNS(SVG_NS, tagName);
    Object.entries(attributes).forEach(([name, value]) => element.setAttribute(name, String(value)));
    return element;
  }

  function createDays(referenceDate) {
    const today = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate());
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6 + index);
      return {
        dateKey: getDateKey(date),
        screenTime: 0,
        focusTime: 0,
        categories: Object.fromEntries(CATEGORY_ORDER.map((category) => [category.id, 0]))
      };
    });
  }

  function buildReport(entries, sessions, referenceDate) {
    const days = createDays(referenceDate);
    const daysByKey = new Map(days.map((day) => [day.dateKey, day]));
    const previousWeekStart = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate() - 13);
    const previousWeekEnd = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate() - 7);
    const previousStartKey = getDateKey(previousWeekStart);
    const previousEndKey = getDateKey(previousWeekEnd);
    let previousWeekTotal = 0;

    entries.forEach((entry) => {
      if (!Number.isInteger(entry.duration) || entry.duration <= 0) {
        return;
      }

      const day = daysByKey.get(entry.date);
      if (day) {
        day.screenTime += entry.duration;
        day.categories[entry.category] += entry.duration;
      } else if (entry.date >= previousStartKey && entry.date <= previousEndKey) {
        previousWeekTotal += entry.duration;
      }
    });

    sessions.forEach((session) => {
      if (!session.completed) {
        return;
      }
      const day = daysByKey.get(session.date);
      if (day) {
        day.focusTime += session.duration;
      }
    });

    return { days, previousWeekTotal };
  }

  function renderDailyRows(days) {
    const body = document.querySelector("#daily-report-rows");
    const fragment = document.createDocumentFragment();
    days.forEach((day) => {
      const row = document.createElement("tr");
      const cells = [
        formatDay(day.dateKey, { weekday: "short" }),
        formatDuration(day.screenTime),
        formatDuration(day.categories.social),
        formatDuration(day.categories.study),
        formatDuration(day.categories.work),
        formatDuration(day.categories.entertainment),
        formatDuration(day.focusTime)
      ];
      cells.forEach((value, index) => {
        const cell = document.createElement(index === 0 ? "th" : "td");
        if (index === 0) {
          cell.scope = "row";
        }
        cell.textContent = value;
        row.append(cell);
      });
      fragment.append(row);
    });
    body.replaceChildren(fragment);
  }

  function renderBarChart(container, days, valueKey, fill, label) {
    const svg = createSvgElement("svg", {
      viewBox: "0 0 600 250",
      role: "img",
      "aria-label": label,
      preserveAspectRatio: "xMidYMid meet"
    });
    const chartLeft = 46;
    const chartRight = 586;
    const chartTop = 16;
    const chartBottom = 205;
    const chartHeight = chartBottom - chartTop;
    const maximum = Math.max(0, ...days.map((day) => day[valueKey]));
    const scaleMaximum = maximum > 0 ? maximum : 60;
    const step = (chartRight - chartLeft) / days.length;

    for (let line = 0; line <= 4; line += 1) {
      const y = chartTop + (chartHeight / 4) * line;
      const lineElement = createSvgElement("line", {
        x1: chartLeft,
        y1: y,
        x2: chartRight,
        y2: y,
        stroke: "#e8efeb",
        "stroke-width": 1
      });
      const value = Math.round(scaleMaximum * (4 - line) / 4);
      const valueLabel = createSvgElement("text", {
        x: chartLeft - 7,
        y: y + 4,
        fill: "#84928a",
        "font-size": 11,
        "text-anchor": "end"
      });
      valueLabel.textContent = value === 0 ? "0" : formatAxisValue(value);
      svg.append(lineElement, valueLabel);
    }

    days.forEach((day, index) => {
      const value = day[valueKey];
      const barHeight = value === 0 ? 0 : Math.max(2, value / scaleMaximum * chartHeight);
      const x = chartLeft + step * index + step * 0.23;
      const y = chartBottom - barHeight;
      if (value > 0) {
        const bar = createSvgElement("rect", {
          x,
          y,
          width: step * 0.54,
          height: barHeight,
          rx: 5,
          fill
        });
        const title = createSvgElement("title");
        title.textContent = `${formatDay(day.dateKey, { weekday: "long" })}: ${formatDuration(value)}`;
        bar.append(title);
        svg.append(bar);
      }

      const dayLabel = createSvgElement("text", {
        x: chartLeft + step * index + step / 2,
        y: 229,
        fill: "#76867c",
        "font-size": 11,
        "text-anchor": "middle"
      });
      dayLabel.textContent = formatDay(day.dateKey, { day: "numeric" });
      svg.append(dayLabel);
    });

    container.replaceChildren(svg);
  }

  function formatAxisValue(minutes) {
    if (minutes >= 60) {
      const hours = minutes / 60;
      return `${Number.isInteger(hours) ? hours : hours.toFixed(1)}h`;
    }
    return `${minutes}m`;
  }

  function renderCategoryChart(container, totals) {
    const maximum = Math.max(0, ...CATEGORY_ORDER.map((category) => totals[category.id]));
    const fragment = document.createDocumentFragment();
    if (maximum === 0) {
      container.replaceChildren(createElement("p", "report-chart-empty", "ยังไม่มีข้อมูล Screen Time ในช่วงนี้"));
      return;
    }

    CATEGORY_ORDER.forEach((category) => {
      const minutes = totals[category.id];
      const row = createElement("div", "category-bar-row");
      const header = createElement("div", "category-bar-header");
      header.append(
        createElement("span", "category-bar-label", category.label),
        createElement("span", "category-bar-value", formatDuration(minutes))
      );
      const track = createElement("div", "category-bar-track");
      track.setAttribute("role", "img");
      track.setAttribute("aria-label", `${category.label}: ${formatDuration(minutes)}`);
      const bar = createElement("span", "category-bar-fill");
      bar.style.width = `${minutes === 0 ? 0 : Math.max(2, minutes / maximum * 100)}%`;
      bar.style.backgroundColor = category.color;
      track.append(bar);
      row.append(header, track);
      fragment.append(row);
    });
    container.replaceChildren(fragment);
  }

  function renderStatistics(days) {
    const screenTotal = days.reduce((total, day) => total + day.screenTime, 0);
    const focusTotal = days.reduce((total, day) => total + day.focusTime, 0);
    const totalByCategory = Object.fromEntries(CATEGORY_ORDER.map((category) => [
      category.id,
      days.reduce((total, day) => total + day.categories[category.id], 0)
    ]));
    const maximumDay = days.reduce((best, day) => day.screenTime > best.screenTime ? day : best, days[0]);
    const minimumDay = days.reduce((best, day) => day.screenTime < best.screenTime ? day : best, days[0]);
    const bestFocusDay = days.reduce((best, day) => day.focusTime > best.focusTime ? day : best, days[0]);
    const mostUsedCategory = CATEGORY_ORDER.reduce((best, category) => (
      totalByCategory[category.id] > totalByCategory[best.id] ? category : best
    ), CATEGORY_ORDER[0]);

    document.querySelector("#stat-total").textContent = formatDuration(screenTotal);
    document.querySelector("#stat-average").textContent = formatDuration(Math.round(screenTotal / days.length));
    document.querySelector("#stat-maximum").textContent = formatDuration(maximumDay.screenTime);
    document.querySelector("#stat-maximum-day").textContent = formatDay(maximumDay.dateKey, { weekday: "long" });
    document.querySelector("#stat-minimum").textContent = formatDuration(minimumDay.screenTime);
    document.querySelector("#stat-minimum-day").textContent = formatDay(minimumDay.dateKey, { weekday: "long" });
    document.querySelector("#stat-category").textContent = totalByCategory[mostUsedCategory.id] > 0
      ? mostUsedCategory.label
      : "ยังไม่มีข้อมูล";
    document.querySelector("#stat-category-time").textContent = totalByCategory[mostUsedCategory.id] > 0
      ? formatDuration(totalByCategory[mostUsedCategory.id])
      : "7 วันล่าสุด";
    document.querySelector("#stat-focus-day").textContent = bestFocusDay.focusTime > 0
      ? formatDay(bestFocusDay.dateKey, { weekday: "long" })
      : "ยังไม่มีข้อมูล";
    document.querySelector("#stat-focus-time").textContent = bestFocusDay.focusTime > 0
      ? formatDuration(bestFocusDay.focusTime)
      : "7 วันล่าสุด";

    return { screenTotal, focusTotal, totalByCategory, maximumDay, mostUsedCategory };
  }

  function renderInsights(days, previousWeekTotal, statistics) {
    const list = document.querySelector("#report-insights");
    const items = [];
    if (statistics.screenTotal === 0 && statistics.focusTotal === 0) {
      list.replaceChildren(createElement("li", "report-insight-item report-insight-muted", "ยังมีข้อมูลไม่เพียงพอสำหรับวิเคราะห์"));
      return;
    }

    if (previousWeekTotal > 0) {
      const difference = Math.round(Math.abs(statistics.screenTotal - previousWeekTotal) / previousWeekTotal * 100);
      if (statistics.screenTotal < previousWeekTotal) {
        items.push(`Screen Time ลดลง ${difference}% จาก 7 วันก่อนหน้า`);
      } else if (statistics.screenTotal > previousWeekTotal) {
        items.push(`Screen Time เพิ่มขึ้น ${difference}% จาก 7 วันก่อนหน้า`);
      } else {
        items.push("Screen Time เท่ากับ 7 วันก่อนหน้า");
      }
    } else if (statistics.screenTotal > 0) {
      items.push("ยังมีข้อมูลไม่เพียงพอสำหรับเปรียบเทียบกับ 7 วันก่อนหน้า");
    }

    if (statistics.maximumDay.screenTime > 0) {
      items.push(`${formatDay(statistics.maximumDay.dateKey, { weekday: "long" })}เป็นวันที่ใช้หน้าจอมากที่สุด`);
    }
    if (statistics.totalByCategory[statistics.mostUsedCategory.id] > 0) {
      items.push(`${statistics.mostUsedCategory.label} เป็นหมวดที่ใช้เวลามากที่สุด`);
    }
    const bestFocusDay = days.reduce((best, day) => day.focusTime > best.focusTime ? day : best, days[0]);
    if (bestFocusDay.focusTime > 0) {
      items.push(`${formatDay(bestFocusDay.dateKey, { weekday: "long" })}เป็นวันที่มี Focus Time มากที่สุด`);
    } else {
      items.push("ยังมีข้อมูล Focus ไม่เพียงพอสำหรับระบุวันที่โฟกัสดีที่สุด");
    }

    list.replaceChildren(...items.map((text) => createElement("li", "report-insight-item", text)));
  }

  function renderReport() {
    reportError.hidden = true;
    const now = new Date();
    const referenceDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const entries = storage.get();
    const sessions = storage.focusSessions.get();
    const { days, previousWeekTotal } = buildReport(entries, sessions, referenceDate);
    const totals = renderStatistics(days);
    const startKey = days[0].dateKey;
    const endKey = days[days.length - 1].dateKey;

    document.querySelector("#report-date-range").textContent = `${formatDay(startKey, { year: "numeric" })} – ${formatDay(endKey, { year: "numeric" })} · 7 วันล่าสุด`;
    renderDailyRows(days);
    renderBarChart(document.querySelector("#screen-chart"), days, "screenTime", "#5c9b76", "เวลาหน้าจอในแต่ละวันของ 7 วันล่าสุด");
    renderBarChart(document.querySelector("#focus-chart"), days, "focusTime", "#7d9dbb", "Focus Time ที่ทำสำเร็จในแต่ละวันของ 7 วันล่าสุด");
    renderCategoryChart(document.querySelector("#category-chart"), totals.totalByCategory);
    renderInsights(days, previousWeekTotal, totals);
  }

  function renderSafely() {
    try {
      renderReport();
    } catch (error) {
      reportError.textContent = `ไม่สามารถสร้างรายงานได้: ${error.message}`;
      reportError.hidden = false;
    }
  }

  renderSafely();
  window.addEventListener("storage", (event) => {
    if ([
      "digitalBalance.screenTimeEntries.v1",
      "digitalBalance.focusSessions.v1"
    ].includes(event.key) || event.key === null) {
      renderSafely();
    }
  });
})();
