/*! flatpickr v2.2.3, @license MIT */
function Flatpickr(element, config) {
	const self = this;

	function init() {
		if (element._flatpickr)
			destroy(element._flatpickr);

		element._flatpickr = self;

		self.element = element;
		self.instanceConfig = config || {};

		setupFormats();

		parseConfig();
		setupLocale();
		setupInputs();
		setupDates();

		setupHelperFunctions();

		self.isOpen = self.config.inline;
		self.changeMonth = changeMonth;
		self.clear = clear;
		self.close = close;
		self.destroy = destroy;
		self.formatDate = formatDate;
		self.jumpToDate = jumpToDate;
		self.open = open;
		self.parseDate = parseDate;
		self.redraw = redraw;
		self.set = set;
		self.setDate = setDate;
		self.toggle = toggle;

		self.isMobile = (
			!self.config.disableMobile &&
			!self.config.inline &&
			self.config.mode === "single" &&
			!self.config.disable.length &&
			!self.config.enable.length &&
			/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
		);

		if (!self.isMobile)
			build();

		bind();

		self.minDateHasTime = self.config.minDate && (
			self.config.minDate.getHours()
			|| self.config.minDate.getMinutes()
			|| self.config.minDate.getSeconds()
		);

		self.maxDateHasTime = self.config.maxDate && (
			self.config.maxDate.getHours()
			|| self.config.maxDate.getMinutes()
			|| self.config.maxDate.getSeconds()
		);

		if (!self.isMobile)
			Object.defineProperty(self, "dateIsPicked", {
				set: function(bool) {
					if (bool)
						return self.calendarContainer.classList.add("dateIsPicked");
					self.calendarContainer.classList.remove("dateIsPicked");
				}
			});

		self.dateIsPicked = self.selectedDates.length > 0 || self.config.noCalendar;

		if (self.selectedDates.length) {
			if (self.config.enableTime)
				setHoursFromDate();
			updateValue();
		}

		if (self.config.weekNumbers) {
			self.calendarContainer.style.width = self.days.offsetWidth + self.weekWrapper.offsetWidth + 2 + "px";
		}

		triggerEvent("Ready");
	}

	function updateTime(e) {
		if (self.config.noCalendar && !self.selectedDates.length)
			// picking time only
			self.selectedDates = [self.now];

		timeWrapper(e);

		if (!self.selectedDates.length)
			return;

		setHoursFromInputs();
		updateValue();
	}

	function setHoursFromInputs(){
		if (!self.config.enableTime)
			return;

		let hours = (parseInt(self.hourElement.value, 10) || 0),
			minutes = (parseInt(self.minuteElement.value, 10) || 0),
			seconds = self.config.enableSeconds
				? (parseInt(self.secondElement.value, 10) || 0)
				: 0;

		if (self.amPM)
			hours = (hours % 12) + (12 * (self.amPM.innerHTML === "PM"));

		if (self.minDateHasTime && compareDates(latestSelectedDateObj(), self.config.minDate) === 0) {
			hours = Math.max(hours, self.config.minDate.getHours());
			if (hours === self.config.minDate.getHours())
				minutes = Math.max(minutes, self.config.minDate.getMinutes());
		}

		else if (self.maxDateHasTime && compareDates(latestSelectedDateObj(), self.config.maxDate) === 0) {
			hours = Math.min(hours, self.config.maxDate.getHours());
			if (hours === self.config.maxDate.getHours())
				minutes = Math.min(minutes, self.config.maxDate.getMinutes());
		}

		setHours(hours, minutes, seconds);
	}

	function setHoursFromDate(dateObj){
		const date = dateObj || latestSelectedDateObj();

		if (date)
			setHours(date.getHours(), date.getMinutes(), date.getSeconds());
	}

	function setHours(hours, minutes, seconds) {
		if (self.selectedDates.length)
			self.selectedDates[self.selectedDates.length - 1].setHours(hours % 24, minutes, seconds || 0, 0);

		if (!self.config.enableTime || self.isMobile)
			return;

		self.hourElement.value = self.pad(
			!self.config.time_24hr ? (12 + hours) % 12 + 12 * (hours % 12 === 0) : hours
		);

		self.minuteElement.value = self.pad(minutes);

		if (!self.config.time_24hr && self.selectedDates.length)
			self.amPM.textContent = latestSelectedDateObj().getHours() >= 12 ? "PM" : "AM";

		if (self.config.enableSeconds)
			self.secondElement.value = self.pad(seconds);
	}

	function bind() {
		if (self.config.wrap) {
			["open", "close", "toggle", "clear"].forEach(el => {
				try {
					self.element.querySelector(`[data-${el}]`)
						.addEventListener("click", self[el]);
				}
				catch (e) {
					//
				}
			});
		}

		if ("createEvent" in document) {
			self.changeEvent = document.createEvent("HTMLEvents");
			self.changeEvent.initEvent("change", false, true);
		}


		if (self.isMobile)
			return setupMobile();

		self.debouncedResize = debounce(onResize, 50);
		self.triggerChange = () => triggerEvent("Change");
		self.debouncedChange = debounce(self.triggerChange, 1000);

		if (self.config.mode === "range")
			self.days.addEventListener("mouseover", onMouseOver);

		document.addEventListener("keydown", onKeyDown);
		window.addEventListener("resize", self.debouncedResize);

		document.addEventListener("click", documentClick);
		document.addEventListener("blur", documentClick);

		if (self.config.clickOpens)
			(self.altInput || self.input).addEventListener("focus", open);

		if (!self.config.noCalendar) {
			self.prevMonthNav.addEventListener("click", () => changeMonth(-1));
			self.nextMonthNav.addEventListener("click", () => changeMonth(1));

			self.currentYearElement.addEventListener("wheel", e => debounce(yearScroll(e), 50));
			self.currentYearElement.addEventListener("focus", () => {
				self.currentYearElement.select();
			});

			self.currentYearElement.addEventListener("input", event => {
				if (event.target.value.length === 4) {
					self.currentYearElement.blur();
					handleYearChange(event.target.value);
					event.target.value = self.currentYear;
				}
			});

			self.days.addEventListener("click", selectDate);
		}

		if (self.config.enableTime) {
			self.timeContainer.addEventListener("wheel", e => debounce(updateTime(e), 5));
			self.timeContainer.addEventListener("input", updateTime);

			self.timeContainer.addEventListener("wheel", self.debouncedChange);
			self.timeContainer.addEventListener("input", self.triggerChange);

			self.hourElement.addEventListener("focus", () => {
				self.hourElement.select();
			});
			self.minuteElement.addEventListener("focus", () => {
				self.minuteElement.select();
			});

			if (self.secondElement) {
				self.secondElement.addEventListener("focus", () => {
					self.secondElement.select();
				});
			}

			if (self.amPM) {
				self.amPM.addEventListener("click", (e) => {
					updateTime(e);
					self.triggerChange(e);
				});
			}
		}
	}

	function jumpToDate(jumpDate) {
		jumpDate = jumpDate
			? parseDate(jumpDate)
			: latestSelectedDateObj() || (self.config.minDate > self.now
				? self.config.minDate
				: self.now
			);

		try {
			self.currentYear = jumpDate.getFullYear();
			self.currentMonth = jumpDate.getMonth();
		}

		catch (e) {
			console.error(e.stack);
			console.warn("Invalid date supplied: " + jumpDate);
		}

		self.redraw();
	}

	function incrementNumInput(e, delta) {
		const input = e.target.parentNode.childNodes[0];
		input.value = parseInt(input.value, 10) + delta*(input.step||1);

		try {
			input.dispatchEvent(new Event("input", { "bubbles": true }));

		}

		catch (e) {
			const ev = document.createEvent('CustomEvent');
  			ev.initCustomEvent('input', true, true, {});
  			input.dispatchEvent(ev);
		}
	}

	function createNumberInput(inputClassName) {
		const wrapper = createElement("div", "numInputWrapper"),
			numInput = createElement("input", "numInput " + inputClassName),
			arrowUp = createElement("span", "arrowUp"),
			arrowDown = createElement("span", "arrowDown");

		numInput.type = "text";
		wrapper.appendChild(numInput);
		wrapper.appendChild(arrowUp);
		wrapper.appendChild(arrowDown);

		arrowUp.addEventListener("click", e => incrementNumInput(e, 1));
		arrowDown.addEventListener("click", e => incrementNumInput(e, -1));
		return wrapper;
	}

	function build() {
		const fragment = document.createDocumentFragment();
		self.calendarContainer = createElement("div", "flatpickr-calendar");
		self.numInputType = navigator.userAgent.indexOf("MSIE 9.0") > 0 ? "text" : "number";

		if (!self.config.noCalendar) {
			fragment.appendChild(buildMonthNav());
			self.innerContainer = createElement("div", "flatpickr-innerContainer")

			if (self.config.weekNumbers)
				self.innerContainer.appendChild(buildWeeks());

			self.rContainer = createElement("div", "flatpickr-rContainer");
			self.rContainer.appendChild(buildWeekdays());
			self.rContainer.appendChild(buildDays());
			self.innerContainer.appendChild(self.rContainer);
			fragment.appendChild(self.innerContainer);
		}

		if (self.config.enableTime)
			fragment.appendChild(buildTime());

		self.calendarContainer.appendChild(fragment);

		if (self.config.inline || self.config.static) {
			self.calendarContainer.classList.add(self.config.inline ? "inline" : "static");
			positionCalendar();

			if (self.config.appendTo && self.config.appendTo.nodeType)
				self.config.appendTo.appendChild(self.calendarContainer);

			else {
				self.element.parentNode.insertBefore(
					self.calendarContainer,
					(self.altInput || self.input).nextSibling
				);
			}

		}
		else
			document.body.appendChild(self.calendarContainer);
	}

	function buildDays() {
		if (!self.days) {
			self.days = createElement("div", "flatpickr-days");
			self.days.tabIndex = -1;
		}

		self.firstOfMonth = (
				new Date(self.currentYear, self.currentMonth, 1).getDay() -
				self.l10n.firstDayOfWeek + 7
			) % 7;

		self.prevMonthDays = self.utils.getDaysinMonth((self.currentMonth - 1 + 12) % 12);

		const daysInMonth = self.utils.getDaysinMonth(),
			days = document.createDocumentFragment();

		let	dayNumber = self.prevMonthDays + 1 - self.firstOfMonth,
			currentDate,
			dateIsDisabled;

		if (self.config.weekNumbers)
			self.weekNumbers.innerHTML = "";

		if (self.config.mode === "range") {
			const dateLimits = self.config.enable.length || self.config.disable.length || self.config.mixDate || self.config.maxDate;
			self.minRangeDate = new Date(self.currentYear, self.currentMonth - 1, dayNumber);
			self.maxRangeDate = new Date(
				self.currentYear,
				self.currentMonth + 1,
				(42 - self.firstOfMonth) % daysInMonth
			);


		}

		self.days.innerHTML = "";

		// prepend days from the ending of previous month
		for (let i = 0; dayNumber <= self.prevMonthDays; i++, dayNumber++) {
			const curDate = new Date(self.currentYear, self.currentMonth - 1, dayNumber, 0, 0, 0, 0, 0),
				dateIsEnabled = isEnabled(curDate),
				dayElement = createElement(
					"span",
					"flatpickr-day prevMonthDay"
						+ (!dateIsEnabled ? " disabled" : "")
						+ (isDateInRange(curDate) ? " inRange" : "")
						+ (
							(
								self.selectedDates.length === 1 &&
								(curDate < self.minRangeDate || curDate > self.maxRangeDate)
							) ? " notAllowed" : ""
						)
						+ (isDateSelected(curDate) !== false ? " selected" : ""),
					dayNumber
				);

			dayElement.dateObj = curDate;

			if (dateIsEnabled)
				dayElement.tabIndex = 0;

			else if (self.selectedDates[0] && curDate > self.minRangeDate && curDate < self.selectedDates[0])
				self.minRangeDate = curDate;

			else if (self.selectedDates[0] && curDate < self.maxRangeDate && curDate > self.selectedDates[0])
				self.maxRangeDate = curDate;


			triggerEvent("DayCreate", dayElement);
			days.appendChild(dayElement);
		}

		// Start at 1 since there is no 0th day
		for (dayNumber = 1; dayNumber <= daysInMonth; dayNumber++) {
			currentDate = new Date(self.currentYear, self.currentMonth, dayNumber, 0, 0, 0, 0, 0);

			if (self.config.weekNumbers && dayNumber % 7 === 1) {
				self.weekNumbers.insertAdjacentHTML(
					"beforeend",
					"<span class='disabled flatpickr-day'>" + self.config.getWeek(currentDate) + "</span>"
				);
			}

			dateIsDisabled = !isEnabled(currentDate);

			const dayElement = createElement(
				"span",
				dateIsDisabled
					? "flatpickr-day disabled"
					: "flatpickr-day"
						+ (isDateInRange(currentDate) ? " inRange" : "")
						+ (self.selectedDates.length === 1 && (currentDate < self.minRangeDate || currentDate > self.maxRangeDate) ? " notAllowed" : ""),
				dayNumber
			);

			dayElement.dateObj = currentDate;

			if (compareDates(currentDate, self.now) === 0)
				dayElement.classList.add("today");

			if (!dateIsDisabled) {
				dayElement.tabIndex = 0;

				if (isDateSelected(currentDate)){
					dayElement.classList.add("selected");
					self.selectedDateElem = dayElement;

					if (self.config.mode === "range") {
						dayElement.className +=	compareDates(currentDate, self.selectedDates[0]) === 0
							? " startRange"
							: self.selectedDates.length > 1
								? " endRange"
								: "";
					}
				}
			}

			else if (self.selectedDates[0] && currentDate > self.minRangeDate && currentDate < self.selectedDates[0])
				self.minRangeDate = currentDate;

			else if (self.selectedDates[0] && currentDate < self.maxRangeDate && currentDate > self.selectedDates[0])
				self.maxRangeDate = currentDate;


			triggerEvent("DayCreate", dayElement);
			days.appendChild(dayElement);
		}

		// append days from the next month
		for (let dayNum = daysInMonth + 1; dayNum <= 42 - self.firstOfMonth; dayNum++) {
			const curDate = new Date(
				self.currentYear,
				self.currentMonth + 1,
				dayNum % daysInMonth,
				0, 0, 0, 0, 0
			),
				dateIsEnabled = isEnabled(curDate),
				dayElement = createElement(
					"span",
					"flatpickr-day nextMonthDay"
						+ (!dateIsEnabled ? " disabled" : "")
						+ (isDateInRange(curDate) ? " inRange" : "")
						+ (
							(
								self.selectedDates.length === 1 &&
								(curDate < self.minRangeDate || curDate > self.maxRangeDate)
							) ? " notAllowed" : ""
						)
						+ (isDateSelected(curDate) !== false ? " selected" : ""),
					dayNum % daysInMonth
				);

			dayElement.dateObj = curDate;

			if (self.config.weekNumbers && dayNum % 7 === 1) {
				self.weekNumbers.insertAdjacentHTML(
					"beforeend",
					"<span class='disabled flatpickr-day'>" + self.config.getWeek(curDate) + "</span>"
				);
			}

			if (dateIsEnabled)
				dayElement.tabIndex = 0;

			else if (self.selectedDates[0] && curDate > self.minRangeDate && curDate < self.selectedDates[0])
				self.minRangeDate = curDate;

			else if (self.selectedDates[0] && curDate < self.maxRangeDate && curDate > self.selectedDates[0])
				self.maxRangeDate = curDate;


			triggerEvent("DayCreate", dayElement);
			days.appendChild(dayElement);
		}
		self.days.appendChild(days);
		return self.days;
	}

	function buildMonthNav() {
		const monthNavFragment = document.createDocumentFragment();
		self.monthNav = createElement("div", "flatpickr-month");

		self.prevMonthNav = createElement("span", "flatpickr-prev-month");
		self.prevMonthNav.innerHTML = self.config.prevArrow;

		self.currentMonthElement = createElement("span", "cur-month");

		const yearInput = createNumberInput("cur-year");
		self.currentYearElement =  yearInput.childNodes[0];
		self.currentYearElement.title = self.l10n.scrollTitle;

		if (self.config.minDate)
			self.currentYearElement.min = self.config.minDate.getFullYear();

		if (self.config.maxDate) {
			self.currentYearElement.max = self.config.maxDate.getFullYear();

			self.currentYearElement.disabled = self.config.minDate	&&
				self.config.minDate.getFullYear() === self.config.maxDate.getFullYear();
		}

		self.nextMonthNav = createElement("span", "flatpickr-next-month");
		self.nextMonthNav.innerHTML = self.config.nextArrow;

		self.navigationCurrentMonth = createElement("span", "flatpickr-current-month");
		self.navigationCurrentMonth.appendChild(self.currentMonthElement);
		self.navigationCurrentMonth.appendChild(yearInput);

		monthNavFragment.appendChild(self.prevMonthNav);
		monthNavFragment.appendChild(self.navigationCurrentMonth);
		monthNavFragment.appendChild(self.nextMonthNav);
		self.monthNav.appendChild(monthNavFragment);

		updateNavigationCurrentMonth();

		return self.monthNav;
	}

	function buildTime() {
		self.calendarContainer.classList.add("hasTime");
		self.timeContainer = createElement("div", "flatpickr-time");
		self.timeContainer.tabIndex = -1;
		const separator = createElement("span", "flatpickr-time-separator", ":");

		const hourInput = createNumberInput("flatpickr-hour");
		self.hourElement =  hourInput.childNodes[0];

		const minuteInput = createNumberInput("flatpickr-minute");
		self.minuteElement =  minuteInput.childNodes[0];

		self.hourElement.tabIndex = self.minuteElement.tabIndex = 0;
		self.hourElement.pattern = self.minuteElement.pattern = "\d*";

		self.hourElement.value = self.pad(latestSelectedDateObj()
			? latestSelectedDateObj().getHours()
			: self.config.defaultHour
		);

		self.minuteElement.value = self.pad(latestSelectedDateObj()
			? latestSelectedDateObj().getMinutes()
			: self.config.defaultMinute
		);

		self.hourElement.step = self.config.hourIncrement;
		self.minuteElement.step = self.config.minuteIncrement;

		self.hourElement.min = self.config.time_24hr ? 0 : 1;
		self.hourElement.max = self.config.time_24hr ? 23 : 12;

		self.minuteElement.min = 0;
		self.minuteElement.max = 59;

		self.hourElement.title = self.minuteElement.title = self.l10n.scrollTitle;

		self.timeContainer.appendChild(hourInput);
		self.timeContainer.appendChild(separator);
		self.timeContainer.appendChild(minuteInput);

		if (self.config.time_24hr)
			self.timeContainer.classList.add("time24hr");

		if (self.config.enableSeconds) {
			self.timeContainer.classList.add("hasSeconds");

			const secondInput = createNumberInput("flatpickr-second");
			self.secondElement =  secondInput.childNodes[0];

			self.secondElement.pattern = self.hourElement.pattern;
			self.secondElement.value =
				latestSelectedDateObj() ? self.pad(latestSelectedDateObj().getSeconds()) : "00";

			self.secondElement.step = self.minuteElement.step;
			self.secondElement.min = self.minuteElement.min;
			self.secondElement.max = self.minuteElement.max;

			self.timeContainer.appendChild(
				createElement("span", "flatpickr-time-separator", ":")
			);
			self.timeContainer.appendChild(secondInput);
		}

		if (!self.config.time_24hr) { // add self.amPM if appropriate
			self.amPM = createElement(
				"span",
				"flatpickr-am-pm",
				["AM", "PM"][(self.hourElement.value > 11) | 0]
			);
			self.amPM.title = self.l10n.toggleTitle;
			self.amPM.tabIndex = 0;
			self.timeContainer.appendChild(self.amPM);
		}

		return self.timeContainer;
	}

	function buildWeekdays() {
		if (!self.weekdayContainer)
			self.weekdayContainer = createElement("div", "flatpickr-weekdays");

		const firstDayOfWeek = self.l10n.firstDayOfWeek;
		let	weekdays = self.l10n.weekdays.shorthand.slice();

		if (firstDayOfWeek > 0 && firstDayOfWeek < weekdays.length) {
			weekdays = [].concat(
				weekdays.splice(firstDayOfWeek, weekdays.length),
				weekdays.splice(0, firstDayOfWeek)
			);
		}

		self.weekdayContainer.innerHTML = `
		<span class=flatpickr-weekday>
			${weekdays.join("</span><span class=flatpickr-weekday>")}
		</span>
		`;

		return self.weekdayContainer;
	}

	function buildWeeks() {
		self.calendarContainer.classList.add("hasWeeks");
		self.weekWrapper = createElement("div", "flatpickr-weekwrapper");
		self.weekWrapper.appendChild(
			createElement("span", "flatpickr-weekday", self.l10n.weekAbbreviation)
		);
		self.weekNumbers = createElement("div", "flatpickr-weeks");
		self.weekWrapper.appendChild(self.weekNumbers);

		return self.weekWrapper;
	}

	function changeMonth(value, is_offset) {
		self.currentMonth = (typeof is_offset === "undefined" || is_offset)
			? self.currentMonth + value
			: value;

		handleYearChange();
		updateNavigationCurrentMonth();
		buildDays();

		if (!(self.config.noCalendar))
			self.days.focus();

		triggerEvent("MonthChange");
	}

	function clear() {
		self.input.value = "";

		if (self.altInput)
			self.altInput.value = "";

		if (self.mobileInput)
			self.mobileInput.value = "";

		self.selectedDates = [];
		self.dateIsPicked = false;

		self.redraw();
		triggerEvent("Change");
	}

	function close() {
		self.isOpen = false;

		if (!self.isMobile) {
			self.calendarContainer.classList.remove("open");
			(self.altInput || self.input).classList.remove("active");
		}

		triggerEvent("Close");
	}

	function destroy(instance) {
		instance = instance || self;
		instance.clear();

		document.removeEventListener("keydown", onKeyDown);
		window.removeEventListener("resize", instance.debouncedResize);

		document.removeEventListener("click", documentClick);
		document.removeEventListener("blur", documentClick);

		if (instance.isMobile && instance.mobileInput && instance.mobileInput.parentNode)
			instance.mobileInput.parentNode.removeChild(instance.mobileInput);

		else if (instance.calendarContainer && instance.calendarContainer.parentNode)
				instance.calendarContainer.parentNode.removeChild(instance.calendarContainer);


		if (instance.altInput) {
			instance.input.type = "text";
			if (instance.altInput.parentNode)
				instance.altInput.parentNode.removeChild(instance.altInput);
		}

		instance.input.classList.remove("flatpickr-input");
		instance.input.removeEventListener("focus", open);
		instance.input.removeAttribute("readonly");


	}

	function isCalendarElem(elem) {
		let e = elem;
		while (e) {
			if (/flatpickr-day|flatpickr-calendar/.test(e.className))
				return true;
			e = e.parentNode;
		}

		return false;
	}

	function documentClick(e) {
		const isInput = self.element.contains(e.target) || e.target === self.input || e.target === self.altInput;

		if (self.isOpen && !isCalendarElem(e.target) && !isInput) {
			self.close();

			if (self.config.mode === "range" && self.selectedDates.length === 1) {
				self.clear();
				self.redraw();
			}
		}
	}

	function formatDate(frmt, dateObj) {
		if (self.config.formatDate)
			return self.config.formatDate(frmt, dateObj);

		const chars = frmt.split("");
		return chars.map((c, i) => self.formats[c] && chars[i - 1] !== "\\"
			? self.formats[c](dateObj)
			: c !== "\\" ? c : ""
		).join("");
	}

	function handleYearChange(newYear) {
		if (self.currentMonth < 0 || self.currentMonth > 11) {
			self.currentYear += self.currentMonth % 11;
			self.currentMonth = (self.currentMonth + 12) % 12;
			triggerEvent("YearChange");
		}

		else if (
			newYear
			&& (!self.currentYearElement.min || newYear >= self.currentYearElement.min)
			&&(!self.currentYearElement.max || newYear <= self.currentYearElement.max)
		) {
			self.currentYear = parseInt(newYear, 10) || self.currentYear;

			if (self.config.maxDate && self.currentYear === self.config.maxDate.getFullYear())
				self.currentMonth = Math.min(self.config.maxDate.getMonth(), self.currentMonth);

			else if (self.config.minDate && self.currentYear === self.config.minDate.getFullYear())
				self.currentMonth = Math.max(self.config.minDate.getMonth(), self.currentMonth);

			self.redraw();
			triggerEvent("YearChange");
		}
	}

	function isEnabled(dateToCheck) {
		if (
			(self.config.minDate && compareDates(dateToCheck, self.config.minDate) < 0) ||
			(self.config.maxDate && compareDates(dateToCheck, self.config.maxDate) > 0)
		)
			return false;

		if (!self.config.enable.length && !self.config.disable.length)
			return true;


		dateToCheck = parseDate(dateToCheck, true); // timeless

		const bool = self.config.enable.length > 0,
			array = bool ? self.config.enable : self.config.disable;

		for (let i = 0, d; i < array.length; i++) {
			d = array[i];

			if (d instanceof Function && d(dateToCheck)) // disabled by function
				return bool;


			else if ((d instanceof Date || (typeof d === "string")) &&
				parseDate(d, true).getTime() === dateToCheck.getTime()
			)
				// disabled by date string
				return bool;

			else if ( // disabled by range
				typeof d === "object" && d.from && d.to &&
				dateToCheck >= parseDate(d.from) &&	dateToCheck <= parseDate(d.to)
			)
				return bool;
		}

		return !bool;
	}

	function onKeyDown(e) {
		if (self.isOpen) {
			switch (e.which) {
				case 13:
					if (self.timeContainer && self.timeContainer.contains(e.target))
						updateValue();

					else
						selectDate(e);

					break;

				case 27: // escape
					self.clear();
					self.redraw();
					self.close();
					break;

				case 37:
					if (e.target !== self.input & e.target !== self.altInput)
						changeMonth(-1);
					break;

				case 38:
					e.preventDefault();

					if (self.timeContainer && self.timeContainer.contains(e.target))
						updateTime(e);

					else {
						self.currentYear++;
						self.redraw();
					}

					break;

				case 39:
					if (e.target !== self.input & e.target !== self.altInput)
						changeMonth(1);
					break;

				case 40:
					e.preventDefault();
					if (self.timeContainer && self.timeContainer.contains(e.target))
						updateTime(e);

					else {
						self.currentYear--;
						self.redraw();
					}

					break;

				default: break;
			}
		}
	}

	function onMouseOver(e) {
		if (self.selectedDates.length !== 1 || !e.target.classList.contains("flatpickr-day"))
			return;

		let hoverDate = e.target.dateObj,
			rangeStartDate = Math.min(hoverDate.getTime(), self.selectedDates[0].getTime()),
			rangeEndDate = Math.max(hoverDate.getTime(), self.selectedDates[0].getTime()),
			containsDisabled = false;

		for (let t = rangeStartDate; t < rangeEndDate; t += self.utils.duration.DAY) {
			if (!isEnabled(new Date(t))) {
				containsDisabled = true;
				break;
			}
		}

		for (
			let timestamp = self.days.childNodes[0].dateObj.getTime(), i = 0;
			i < 42;
			i++, timestamp += self.utils.duration.DAY
		) {
			if (timestamp < self.minRangeDate.getTime() || timestamp > self.maxRangeDate.getTime()) {
				self.days.childNodes[i].classList.add("notAllowed");
				self.days.childNodes[i].classList.remove("inRange");
			}


			else if (
				!containsDisabled &&
				timestamp > Math.max(self.minRangeDate.getTime(), rangeStartDate) &&
				timestamp < Math.min(self.maxRangeDate.getTime(), rangeEndDate)
			)
				self.days.childNodes[i].classList.add("inRange");
			else
				self.days.childNodes[i].classList.remove("inRange");
		}


	}

	function onResize() {
		if (self.isOpen && !self.config.static && !self.config.inline)
			positionCalendar();
	}

	function open(e) {
		if (self.isMobile) {
			if (e) {
				e.preventDefault();
				e.target.blur();
			}

			setTimeout(() => {
				self.mobileInput.click();
			}, 0);

			triggerEvent("Open");
			return;
		}

		else if (self.isOpen || (self.altInput || self.input).disabled || self.config.inline)
			return;

		self.calendarContainer.classList.add("open");

		if (!self.config.static && !self.config.inline)
			positionCalendar();


		self.isOpen = true;

		if (!self.config.allowInput) {
			(self.altInput || self.input).blur();
			(self.config.noCalendar
				? self.timeContainer
				: self.selectedDateElem
					? self.selectedDateElem
					: self.days).focus();
		}

		(self.altInput || self.input).classList.add("active");
		triggerEvent("Open");
	}

	function parseConfig() {
		var boolOpts = [
			"utc", "wrap", "weekNumbers", "allowInput", "clickOpens", "time_24hr", "enableTime", "noCalendar", "altInput", "shorthandCurrentMonth", "inline", "static", "enableSeconds", "disableMobile"
		];
		self.config = Object.create(Flatpickr.defaultConfig);
		let userConfig = Object.assign({}, self.instanceConfig, self.element.dataset || {});

		Object.defineProperty(self.config, "minDate", {
			get: function() {
				return this._minDate;
			},
			set: function(date) {
				this._minDate = parseDate(date);

				if(self.days)
					redraw();

				if (!self.currentYearElement)
					return;

				if (date && this._minDate instanceof Date) {
					self.minDateHasTime = this._minDate.getHours()
						|| this._minDate.getMinutes()
						|| this._minDate.getSeconds();

					self.currentYearElement.min = this._minDate.getFullYear();
				}

				else {
					self.currentYearElement.removeAttribute("min");
				}

				self.currentYearElement.disabled = this._maxDate && this._minDate &&
					this._maxDate.getFullYear() === this._minDate.getFullYear();
			}
		});

		Object.defineProperty(self.config, "maxDate", {
			get: function() {
				return this._maxDate;
			},
			set: function(date) {
				this._maxDate = parseDate(date);
				if(self.days)
					redraw();

				if (!self.currentYearElement)
					return;

				if (date && this._maxDate instanceof Date) {
					self.currentYearElement.max = this._maxDate.getFullYear();
					self.maxDateHasTime = this._maxDate.getHours()
						|| this._maxDate.getMinutes()
						|| this._maxDate.getSeconds();
				}

				else
					self.currentYearElement.removeAttribute("max");

				self.currentYearElement.disabled = this._maxDate && this._minDate &&
					this._maxDate.getFullYear() === this._minDate.getFullYear();
			}
		});

		Object.assign(self.config, userConfig);

		for (var i = 0; i < boolOpts.length; i++)
			self.config[boolOpts[i]] = (self.config[boolOpts[i]] === true) || self.config[boolOpts[i]] === "true";

		if (!userConfig.dateFormat && userConfig.enableTime) {
			self.config.dateFormat = self.config.noCalendar
				? "H:i" + (self.config.enableSeconds ? ":S" : "")
				: Flatpickr.defaultConfig.dateFormat + " H:i" + (self.config.enableSeconds ? ":S" : "");
		}

		if (userConfig.altInput && userConfig.enableTime && !userConfig.altFormat) {
			self.config.altFormat = self.config.noCalendar
				? "h:i" + (self.config.enableSeconds ? ":S K" : " K")
				: Flatpickr.defaultConfig.altFormat + ` h:i${self.config.enableSeconds ? ":S" : ""} K`;
		}

	}

	function setupLocale() {
		if (typeof self.config.locale !== "object" &&
			typeof Flatpickr.l10ns[self.config.locale] === "undefined"
		)
			console.warn(`flatpickr: invalid locale ${self.config.locale}`);

		self.l10n = Object.assign(
			Object.create(Flatpickr.l10ns.default),
			typeof self.config.locale === "object"
				? self.config.locale
				: self.config.locale !== "default"
					? Flatpickr.l10ns[self.config.locale] || {}
					: {}
		);
	}

	function parseDate(date, timeless = false) {
		if (!date)
			return null;

		const dateTimeRegex = /(\d+)/g,
			timeRegex = /^(\d{1,2})[:\s](\d\d)?[:\s]?(\d\d)?\s?(a|p)?/i,
			timestamp = /^(\d+)$/g,
			date_orig = date;

		if (date.toFixed) // timestamp
			date = new Date(date);


		else if (typeof date === "string") {
			date = date.trim();

			if (date === "today") {
				date = new Date();
				timeless = true;
			}

			else if (self.config.parseDate)
				date = self.config.parseDate(date);

			else if (timeRegex.test(date)) { // time picker
				const m = date.match(timeRegex),
					hours = !m[4]
						? m[1]  // military time, no conversion needed
						: (m[1] % 12) + (m[4].toLowerCase() === "p" ? 12 : 0); // am/pm

				date = new Date();
				date.setHours(hours, m[2] || 0, m[3] || 0);
			}

			else if (/Z$/.test(date) || /GMT$/.test(date)) // datestrings w/ timezone
				date = new Date(date);

			else if (dateTimeRegex.test(date) && /^[0-9]/.test(date)) {
				const d = date.match(dateTimeRegex);
				date = new Date(
					`${d[0]}/${d[1] || 1}/${d[2] || 1} ${d[3] || 0}:${d[4] || 0}:${d[5] || 0}`
				);
			}

			else // fallback
				date = new Date(date);
		}

		if (!(date instanceof Date)) {
			console.warn(`flatpickr: invalid date ${date_orig}`);
			console.info(self.element);
			return null;
		}

		if (self.config.utc && !date.fp_isUTC)
			date = date.fp_toUTC();

		if (timeless)
			date.setHours(0, 0, 0, 0);

		return date;
	}

	function positionCalendar() {
		const calendarHeight = self.calendarContainer.offsetHeight,
			input = (self.altInput || self.input),
			inputBounds = input.getBoundingClientRect(),
			distanceFromBottom = window.innerHeight - inputBounds.bottom + input.offsetHeight;

		let top,
			left = (window.pageXOffset + inputBounds.left);

		if (distanceFromBottom < calendarHeight) {
			top = (window.pageYOffset - calendarHeight + inputBounds.top) - 2;
			self.calendarContainer.classList.remove("arrowTop");
			self.calendarContainer.classList.add("arrowBottom");
		}

		else {
			top = (window.pageYOffset + input.offsetHeight + inputBounds.top) + 2;
			self.calendarContainer.classList.remove("arrowBottom");
			self.calendarContainer.classList.add("arrowTop");
		}

		if (!self.config.static && !self.config.inline) {
			self.calendarContainer.style.top = `${top}px`;
			self.calendarContainer.style.left = `${left}px`;
		}

	}

	function redraw() {
		if (self.config.noCalendar || self.isMobile)
			return;

		buildWeekdays();
		updateNavigationCurrentMonth();
		buildDays();
	}

	function selectDate(e) {
		if (
			self.config.allowInput && e.which === 13 &&	(e.target === (self.altInput || self.input))
		)
			return self.setDate((self.altInput || self.input).value), e.target.blur();

		if (
			!e.target.classList.contains("flatpickr-day") ||
			e.target.classList.contains("disabled") ||
			e.target.classList.contains("notAllowed")
		)
			return;

		const selectedDate = e.target.dateObj;
		self.selectedDateElem = e.target;

		if (self.config.mode === "single") {
			self.selectedDates = [selectedDate];

			if (!self.config.enableTime)
				self.close();
		}

		else if (self.config.mode === "multiple") {
			const selectedIndex = isDateSelected(selectedDate);
			if (selectedIndex)
				self.selectedDates.splice(selectedIndex, 1);
			else
				self.selectedDates.push(selectedDate);

		}

		else if (self.config.mode === "range") {
			if (self.selectedDates.length === 2)
				self.clear();

			self.selectedDates.push(selectedDate);
			self.selectedDates.sort((a,b) => a.getTime() - b.getTime());
		}

		setHoursFromInputs();


		if (selectedDate.getMonth() !== self.currentMonth && self.config.mode !== "range") {
			self.currentYear = selectedDate.getFullYear();
			self.currentMonth = selectedDate.getMonth();
			updateNavigationCurrentMonth();
		}

		buildDays();

		if (self.minDateHasTime	&& self.config.enableTime
			&& compareDates(selectedDate, self.config.minDate) === 0
		) {
			setHoursFromDate(self.config.minDate);
		}

		updateValue();
		setTimeout(() => self.dateIsPicked = true, 50);

		if (self.config.mode === "range" && self.selectedDates.length === 1)
			onMouseOver(e);

		triggerEvent("Change");
	}

	function set(option, value) {
		self.config[option] = value;
		self.redraw();
		jumpToDate();
	}

	function setDate(date, triggerChange) {
		if (!date)
			return self.clear();

		self.selectedDates = (Array.isArray(date) ? date.map(parseDate) : [parseDate(date)]).filter(
			d => d instanceof Date && isEnabled(d)
		);
		self.redraw();
		jumpToDate();

		setHoursFromDate();
		updateValue();

		self.dateIsPicked = self.selectedDates.length > 0;

		if (triggerChange)
			triggerEvent("Change");
	}

	function setupDates() {
		self.selectedDates = [];
		self.now = new Date();
		const inputDate = self.config.defaultDate || self.input.value;

		if (Array.isArray(inputDate))
			self.selectedDates = inputDate.map(parseDate);

		else if (inputDate) {
			switch (self.config.mode) {
				case "single":
					self.selectedDates = [parseDate(inputDate)];
					break;

				case "multiple":
					self.selectedDates = inputDate.split("; ").map(parseDate);
					break;

				case "range":
					self.selectedDates = inputDate.split(" to ").map(parseDate);
					break;

				default: break;
			}
		}

		self.selectedDates = self.selectedDates.filter(
			d => d instanceof Date && d.getTime() && isEnabled(d)
		);

		const initialDate = (self.selectedDates.length
			? self.selectedDates[0]
			: (self.config.minDate > self.now ? self.config.minDate : self.now)
		);

		self.currentYear = initialDate.getFullYear();
		self.currentMonth = initialDate.getMonth();
	}

	function setupHelperFunctions() {
		self.utils = {
			duration: {
				DAY: 86400000,
			},
			getDaysinMonth: (month = self.currentMonth, yr = self.currentYear) => {
				if (month === 1 && (((yr % 4 === 0) && (yr % 100 !== 0)) || (yr % 400 === 0)))
					return 29;
				return self.l10n.daysInMonth[month];
			},

			monthToStr: (monthNumber, short = self.config.shorthandCurrentMonth) =>
				self.l10n.months[(`${short ? "short" : "long"}hand`)][monthNumber],
		};
	}

	function setupFormats() {
		self.formats = {
			// weekday name, short, e.g. Thu
			D: date => self.l10n.weekdays.shorthand[self.formats.w(date)],

			// full month name e.g. January
			F: date => self.utils.monthToStr(self.formats.n(date) - 1, false),

			// hours with leading zero e.g. 03
			H: date => Flatpickr.prototype.pad(date.getHours()),

			// day (1-30) with ordinal suffix e.g. 1st, 2nd
			J: date => date.getDate() + self.l10n.ordinal(date.getDate()),

			// AM/PM
			K: date => date.getHours() > 11 ? "PM" : "AM",

			// shorthand month e.g. Jan, Sep, Oct, etc
			M: date => self.utils.monthToStr(date.getMonth(), true),

			// seconds 00-59
			S: date => Flatpickr.prototype.pad(date.getSeconds()),

			// unix timestamp
			U: date => date.getTime() / 1000,

			// full year e.g. 2016
			Y: date => date.getFullYear(),

			// day in month, padded (01-30)
			d: date => Flatpickr.prototype.pad(self.formats.j(date)),

			// hour from 1-12 (am/pm)
			h: date => date.getHours() % 12 ? date.getHours() % 12 : 12,

			// minutes, padded with leading zero e.g. 09
			i: date => Flatpickr.prototype.pad(date.getMinutes()),

			// day in month (1-30)
			j: date => date.getDate(),

			// weekday name, full, e.g. Thursday
			l: date => self.l10n.weekdays.longhand[self.formats.w(date)],

			// padded month number (01-12)
			m: date => Flatpickr.prototype.pad(self.formats.n(date)),

			// the month number (1-12)
			n: date => date.getMonth() + 1,

			// seconds 0-59
			s: date => date.getSeconds(),

			// number of the day of the week
			w: date => date.getDay(),

			// last two digits of year e.g. 16 for 2016
			y: date => String(self.formats.Y(date)).substring(2)
		};
	}

	function setupInputs() {
		self.input = self.config.wrap ? self.element.querySelector("[data-input]") : self.element;

		self.input.classList.add("flatpickr-input");
		if (self.config.altInput) {
			// replicate self.element
			self.altInput = createElement(
				self.input.nodeName,
				self.config.altInputClass
			);
			self.altInput.placeholder = self.input.placeholder;
			self.altInput.type = "text";

			self.input.type = "hidden";
			if (self.input.parentNode)
				self.input.parentNode.insertBefore(self.altInput, self.input.nextSibling);
		}

		if (!self.config.allowInput)
			(self.altInput || self.input).setAttribute("readonly", "readonly");
	}

	function setupMobile() {
		const inputType = self.config.enableTime
			? (self.config.noCalendar ? "time" : "datetime-local")
			: "date";

		self.mobileInput = createElement("input", "flatpickr-input flatpickr-mobile");
		self.mobileInput.step = "any";
		self.mobileInput.tabIndex = -1;
		self.mobileInput.type = inputType;
		self.mobileInput.disabled = self.input.disabled;


		self.mobileFormatStr = inputType === "datetime-local"
			? "Y-m-d\\TH:i:S"
			: inputType === "date"
				? "Y-m-d"
				: "H:i:S";

		if (self.selectedDates.length) {
			self.mobileInput.defaultValue
			= self.mobileInput.value
			= formatDate(self.mobileFormatStr, self.selectedDates[0]);
		}

		if (self.config.minDate)
			self.mobileInput.min = formatDate("Y-m-d", self.config.minDate);

		if (self.config.maxDate)
			self.mobileInput.max = formatDate("Y-m-d", self.config.maxDate);

		self.input.type = "hidden";
		if (self.config.altInput)
			self.altInput.type = "hidden";

		try {
			self.input.parentNode.insertBefore(self.mobileInput, self.input.nextSibling);
		}
		catch (e) {
			//
		}

		self.mobileInput.addEventListener("change", e => {
			self.setDate(e.target.value);
			triggerEvent("Change");
			triggerEvent("Close");
		});
	}

	function toggle() {
		if (self.isOpen)
			self.close();
		else
			self.open();
	}

	function triggerEvent(event, data) {
		if (self.config["on" + event]) {
			const hooks = Array.isArray(self.config["on" + event])
				? self.config["on" + event]
				: [self.config["on" + event]];

			for (var i = 0; i < hooks.length; i++)
				hooks[i](self.selectedDates, self.input.value, self, data);
		}

		if (event === "Change") {
			try {
				self.input.dispatchEvent(new Event("change", { "bubbles": true }));

				// many front-end frameworks bind to the input event
				self.input.dispatchEvent(new Event("input", { "bubbles": true }));
			}

			catch(e) {
				if ("createEvent" in document)
					return self.input.dispatchEvent(self.changeEvent);

				self.input.fireEvent("onchange");
			}

		}
	}

	function latestSelectedDateObj() {
		if (self.selectedDates.length)
			return self.selectedDates[self.selectedDates.length - 1];
		return null;
	}

	function isDateSelected(date) {
		for (var i = 0; i < self.selectedDates.length; i++) {
			if (compareDates(self.selectedDates[i], date) === 0)
				return "" + i;
		}

		return false;
	}

	function isDateInRange(date){
		if (self.config.mode !== "range" || self.selectedDates.length < 2)
			return false;
		return date > self.selectedDates[0] && date < self.selectedDates[1];
	}

	function updateNavigationCurrentMonth() {
		if (self.config.noCalendar || self.isMobile || !self.monthNav)
			return;

		self.currentMonthElement.textContent = self.utils.monthToStr(self.currentMonth) + " ";
		self.currentYearElement.value = self.currentYear;

		if (self.config.minDate) {
			const hidePrevMonthArrow = self.currentYear === self.config.minDate.getFullYear()
				? (self.currentMonth + 11) % 12 < self.config.minDate.getMonth()
				: self.currentYear < self.config.minDate.getFullYear();

			self.prevMonthNav.style.display = hidePrevMonthArrow ? "none" : "block";
		}

		else
			self.prevMonthNav.style.display = "block";


		if (self.config.maxDate) {
			const hideNextMonthArrow = self.currentYear === self.config.maxDate.getFullYear()
				? self.currentMonth + 1 > self.config.maxDate.getMonth()
				: self.currentYear > self.config.maxDate.getFullYear();

			self.nextMonthNav.style.display = hideNextMonthArrow ? "none" : "block";
		}

		else
			self.nextMonthNav.style.display = "block";

	}



	function updateValue() {
		if (!self.selectedDates.length)
			return self.clear();

		if (self.isMobile) {
			self.mobileInput.value = self.selectedDates.length
				? formatDate(self.mobileFormatStr, latestSelectedDateObj())
				: "";
		}

		const joinChar = self.config.mode !== "range" ? "; " : " to ";

		self.input.value = self.selectedDates
			.map(dObj => formatDate(self.config.dateFormat, dObj))
			.join(joinChar);

		if (self.config.altInput) {
			self.altInput.value = self.selectedDates
				.map(dObj => formatDate(self.config.altFormat, dObj))
				.join(joinChar);
		}

		triggerEvent("ValueUpdate");
	}

	function yearScroll(e) {
		e.preventDefault();

		const delta = Math.max(-1, Math.min(1, (e.wheelDelta || -e.deltaY))),
			newYear = parseInt(e.target.value, 10) + delta;

		handleYearChange(newYear);
		e.target.value = self.currentYear;
	}

	function createElement(tag, className = "", content = "") {
		const e = document.createElement(tag);
		e.className = className;

		if (content)
			e.innerHTML = content;

		return e;
	}

	function debounce(func, wait, immediate) {
		let timeout;
		return function (...args) {
			const context = this;
			const later = function () {
				timeout = null;
				if (!immediate)
					func.apply(context, args);
			};

			clearTimeout(timeout);
			timeout = setTimeout(later, wait);
			if (immediate && !timeout)
				func.apply(context, args);
		};
	}

	function compareDates(date1, date2) {
		if (!(date1 instanceof Date) || !(date2 instanceof Date))
			return false;

		return new Date(date1.getTime()).setHours(0,0,0,0) - new Date(date2.getTime()).setHours(0,0,0,0);
	}

	function timeWrapper(e) {
		e.preventDefault();
		if (e && (
			(e.target.value || e.target.textContent).length >= 2 || // typed two digits
			(e.type !== "keydown" && e.type !== "input") // scroll event
		))
			e.target.blur();

		if (self.amPM && e.target === self.amPM)
			return e.target.textContent = ["AM", "PM"][(e.target.textContent === "AM") | 0];

		const min = Number(e.target.min),
			max = Number(e.target.max),
			step = Number(e.target.step),
			curValue = parseInt(e.target.value, 10),
			delta = Math.max(-1, Math.min(1, (e.wheelDelta || -e.deltaY)));

		let newValue = Number(curValue);

		if (e.type === "wheel")
			newValue = curValue + step * delta;

		else if (e.type === "keydown")
			newValue = curValue + step * (e.which === 38 ? 1 : -1);

		if (newValue < min)
			newValue = max + newValue + (e.target !== self.hourElement) + (e.target === self.hourElement && !self.amPM);

		else if (newValue > max)
			newValue = e.target === self.hourElement ? newValue - max - (!self.amPM) : min;

		if (
			self.amPM && e.target === self.hourElement &&
			(step === 1 ? newValue + curValue === 23 : Math.abs(newValue - curValue) > step)
		)
			self.amPM.textContent = self.amPM.innerHTML === "PM" ? "AM" : "PM";

		e.target.value = self.pad(newValue);
	}

	init();
	return self;
}

Flatpickr.defaultConfig = {

	mode: "single",

	/* if true, dates will be parsed, formatted, and displayed in UTC.
	preloading date strings w/ timezones is recommended but not necessary */
	utc: false,

	// wrap: see https://chmln.github.io/flatpickr/#strap
	wrap: false,

	// enables week numbers
	weekNumbers: false,

	// allow manual datetime input
	allowInput: false,

	/*
		clicking on input opens the date(time)picker.
		disable if you wish to open the calendar manually with .open()
	*/
	clickOpens: true,

	// display time picker in 24 hour mode
	time_24hr: false,

	// enables the time picker functionality
	enableTime: false,

	// noCalendar: true will hide the calendar. use for a time picker along w/ enableTime
	noCalendar: false,

	// more date format chars at https://chmln.github.io/flatpickr/#dateformat
	dateFormat: "Y-m-d",

	// altInput - see https://chmln.github.io/flatpickr/#altinput
	altInput: false,

	// the created altInput element will have this class.
	altInputClass: "form-control input",

	// same as dateFormat, but for altInput
	altFormat: "F j, Y", // defaults to e.g. June 10, 2016

	// defaultDate - either a datestring or a date object. used for datetimepicker"s initial value
	defaultDate: null,

	// the minimum date that user can pick (inclusive)
	minDate: null,

	// the maximum date that user can pick (inclusive)
	maxDate: null,

	// dateparser that transforms a given string to a date object
	parseDate: null,

	// dateformatter that transforms a given date object to a string, according to passed format
	formatDate: null,

	getWeek: function (givenDate) {
		const date = new Date(givenDate.getTime());
		date.setHours(0, 0, 0, 0);

		// Thursday in current week decides the year.
		date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
		// January 4 is always in week 1.
		const week1 = new Date(date.getFullYear(), 0, 4);
		// Adjust to Thursday in week 1 and count number of weeks from date to week1.
		return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 +
			(week1.getDay() + 6) % 7) / 7);
	},

	// see https://chmln.github.io/flatpickr/#disable
	enable: [],

	// see https://chmln.github.io/flatpickr/#disable
	disable: [],

	// display the short version of month names - e.g. Sep instead of September
	shorthandCurrentMonth: false,

	// displays calendar inline. see https://chmln.github.io/flatpickr/#inline-calendar
	inline: false,

	// position calendar inside wrapper and next to the input element
	// leave at false unless you know what you"re doing
	static: false,

	// DOM node to append the calendar to in *static* mode
	appendTo: null,

	// code for previous/next icons. this is where you put your custom icon code e.g. fontawesome
	prevArrow: "<svg version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink' viewBox='0 0 17 17'><g></g><path d='M5.207 8.471l7.146 7.147-0.707 0.707-7.853-7.854 7.854-7.853 0.707 0.707-7.147 7.146z' /></svg>",
	nextArrow: "<svg version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink' viewBox='0 0 17 17'><g></g><path d='M13.207 8.472l-7.854 7.854-0.707-0.707 7.146-7.146-7.146-7.148 0.707-0.707 7.854 7.854z' /></svg>",

	// enables seconds in the time picker
	enableSeconds: false,

	// step size used when scrolling/incrementing the hour element
	hourIncrement: 1,

	// step size used when scrolling/incrementing the minute element
	minuteIncrement: 5,

	// initial value in the hour element
	defaultHour: 12,

	// initial value in the minute element
	defaultMinute: 0,

	// disable native mobile datetime input support
	disableMobile: false,

	// default locale
	locale: "default",

	// onChange callback when user selects a date or time
	onChange: null, // function (dateObj, dateStr) {}

	// called every time calendar is opened
	onOpen: null, // function (dateObj, dateStr) {}

	// called every time calendar is closed
	onClose: null, // function (dateObj, dateStr) {}

	// called after calendar is ready
	onReady: null, // function (dateObj, dateStr) {}

	onValueUpdate: null,

	onDayCreate: null
};

Flatpickr.l10ns = {
	en: {
		weekdays: {
			shorthand: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
			longhand: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
		},
		months: {
			shorthand: [
				"Jan", "Feb", "Mar", "Apr",
				"May", "Jun", "Jul", "Aug",
				"Sep", "Oct", "Nov", "Dec"
			],
			longhand: [
				"January", "February", "March",	"April",
				"May", "June", "July", "August",
				"September", "October", "November", "December"
			]
		},
		daysInMonth: [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31],
		firstDayOfWeek: 0,
		ordinal: (nth) => {
			const s = nth % 100;
			if (s > 3 && s < 21) return "th";
			switch (s % 10) {
				case 1: return "st";
				case 2: return "nd";
				case 3: return "rd";
				default: return "th";
			}
		},
		weekAbbreviation: "Wk",
		scrollTitle: "Scroll to increment",
		toggleTitle: "Click to toggle"
	}
};

Flatpickr.l10ns.default = Flatpickr.l10ns.en;

Flatpickr.localize = l10n => Object.assign(Flatpickr.l10ns.default, l10n || {});

Flatpickr.prototype = {
	pad: function(number) {
		return `0${number}`.slice(-2);
	}
};

function _flatpickr(nodeList, config) {
	let instances = [];
	for (let i = 0; i < nodeList.length; i++) {
		try {
			nodeList[i]._flatpickr = new Flatpickr(nodeList[i], config || {});
			instances.push(nodeList[i]._flatpickr);
		}

		catch (e) {
			console.warn(e, e.stack);
		}
	}

	return instances.length === 1 ? instances[0] : instances;
}
if (typeof HTMLElement !== "undefined") { // browser env
	HTMLCollection.prototype.flatpickr = NodeList.prototype.flatpickr = function (config) {
		return _flatpickr(this, config);
	};

	HTMLElement.prototype.flatpickr = function (config) {
		return _flatpickr([this], config);
	};
}

function flatpickr(selector, config) {
	return _flatpickr(document.querySelectorAll(selector), config);
}

if (typeof jQuery !== "undefined") {
	jQuery.fn.flatpickr = function (config) {
		return _flatpickr(this, config);
	};
}

Date.prototype.fp_incr = function (days) {
	return new Date(
		this.getFullYear(),
		this.getMonth(),
		this.getDate() + parseInt(days, 10)
	);
};

Date.prototype.fp_isUTC = false;
Date.prototype.fp_toUTC = function () {
	const newDate = new Date(
		this.getUTCFullYear(),
		this.getUTCMonth(),
		this.getUTCDate(),
		this.getUTCHours(),
		this.getUTCMinutes(),
		this.getUTCSeconds()
	);

	newDate.fp_isUTC = true;
	return newDate;
};

// IE9 classList polyfill
if (
	!("classList" in document.documentElement) &&
	Object.defineProperty && typeof HTMLElement !== "undefined"
) {
	Object.defineProperty(HTMLElement.prototype, "classList", {
		get: function () {
			let self = this;
			function update(fn) {
				return function (value) {
					let classes = self.className.split(/\s+/),
						index = classes.indexOf(value);

					fn(classes, index, value);
					self.className = classes.join(" ");
				};
			}

			let ret = {
				add: update((classes, index, value) => {
					if (!(~index))
						classes.push(value);
				}),

				remove: update((classes, index) => {
					if (~index)
						classes.splice(index, 1);
				}),

				toggle: update((classes, index, value) => {
					if (~index)
						classes.splice(index, 1);
					else
						classes.push(value);
				}),

				contains: value => !!~self.className.split(/\s+/).indexOf(value),

				item: function (i) {
					return self.className.split(/\s+/)[i] || null;
				}
			};

			Object.defineProperty(ret, "length", {
				get: function () {
					return self.className.split(/\s+/).length;
				}
			});

			return ret;
		}
	});
}

if (typeof module !== "undefined")
	module.exports = Flatpickr;
