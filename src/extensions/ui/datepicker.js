(function ($, zeta, Date) {
    'use strict';

    var MONTH_STR = 'January February March April May June July August September October November December'.split(' ');
    var WEEKDAYS_STR = 'Su Mo Tu We Th Fr Sa'.split(' ');
    var MS_PER_DAY = 86400000;
    var TIMEZONE_OFFSET = new Date().getTimezoneOffset() * 60000;
    var INPUT_TYPES = {
        datetime: 'datetime-local',
        day: 'date',
        week: 'week',
        month: 'month'
    };

    var helper = zeta.helper;
    var dom = zeta.dom;
    var repeat = helper.repeat;

    var ui = new zeta.UI('zeta.ui.datepicker');
    var controls;
    var activeTyper;
    var callout;

    function range(count, callback) {
        var arr = [];
        for (var i = 0; i < count; i++) {
            arr[i] = callback(i);
        }
        return arr;
    }

    function getFullYear(d) {
        return d.getFullYear();
    }

    function getMonth(d) {
        return d.getMonth();
    }

    function getDate(d) {
        return d.getDate();
    }

    function getHours(d) {
        return d.getHours();
    }

    function getMinutes(d) {
        return d.getMinutes();
    }

    function sameMonth(x, y) {
        return getFullYear(x) === getFullYear(y) && getMonth(x) === getMonth(y);
    }

    function parseMaxima(d) {
        if (typeof d === 'string' && /^today|([+-]\d+)(day|week|month|year)?$/g.test(d)) {
            return RegExp.$1 ? stepDate(RegExp.$2 || 'day', new Date(), +RegExp.$1) : new Date();
        }
        d = d === null ? undefined : d instanceof Date ? d : new Date(d);
        return isNaN(d) ? undefined : d;
    }

    function makeTime(h, m) {
        var date = new Date();
        date.setHours(h, m, 0, 0);
        return date;
    }

    function normalizeDate(options, date) {
        var min = parseMaxima(options.min);
        var max = parseMaxima(options.max);
        date = new Date(+(date < min ? min : date > max ? max : date));
        switch (options.mode || options) {
            case 'week':
                date.setDate(getDate(date) - date.getDay());
                break;
            case 'month':
                date.setDate(1);
                break;
        }
        if ((options.mode || options) !== 'datetime') {
            date.setHours(0, 0, 0, 0);
        } else {
            date.setSeconds(0, 0);
        }
        return date;
    }

    function stepDate(mode, date, dir, step) {
        switch (mode) {
            case 'minute':
                var d = dir / Math.abs(dir);
                return new Date(+date + 60000 * ((((d > 0 ? step : 0) - (getMinutes(date) % step)) || (step * d)) + (step * (dir - d))));
            case 'day':
                return new Date(+date + MS_PER_DAY * dir);
            case 'week':
                return new Date(+date + MS_PER_DAY * 7 * dir);
            case 'month':
                return new Date(getFullYear(date), getMonth(date) + dir, getDate(date));
            case 'year':
                return new Date(getFullYear(date) + dir, getMonth(date), getDate(date));
        }
    }

    function formatDate(mode, date) {
        switch (mode) {
            case 'month':
                return MONTH_STR[getMonth(date)] + ' ' + getFullYear(date);
            case 'week':
                var end = stepDate('day', date, 6);
                return MONTH_STR[getMonth(date)] + ' ' + getDate(date) + ' - ' + (getMonth(end) !== getMonth(date) ? MONTH_STR[getMonth(end)] + ' ' : '') + getDate(end) + ', ' + getFullYear(date);
        }
        var monthPart = MONTH_STR[getMonth(date)] + ' ' + getDate(date) + ', ' + getFullYear(date);
        return mode === 'datetime' ? monthPart + ' ' + (getHours(date) || 12) + ':' + ('0' + getMinutes(date)).slice(-2) + ' ' + (getHours(date) >= 12 ? 'PM' : 'AM') : monthPart;
    }

    function showMonth(self, date) {
        if (isNaN(+date)) {
            return;
        }
        if (typeof date === 'number') {
            date = stepDate('month', self.currentMonth, date);
        }
        var min = parseMaxima(self.min);
        var max = parseMaxima(self.max);
        var currentMonth = normalizeDate({
            mode: 'month',
            min: min,
            max: max
        }, date);
        var y = getFullYear(currentMonth);
        var m = getMonth(currentMonth);
        var all = ui.all(self);
        var firstDay = currentMonth.getDay();
        var $buttons = $('td', self.element).removeClass('selected disabled');

        if (!self.currentMonth || !sameMonth(currentMonth, self.currentMonth)) {
            var numDays = new Date(y, m + 1, 0).getDate();
            var numDaysLast = new Date(y, m, 0).getDate();
            $buttons.removeClass('prev cur next today');
            $buttons.each(function (i, v) {
                if (i < firstDay) {
                    $(v).children().text(i + 1 - firstDay + numDaysLast).end().addClass('prev');
                } else if (i >= numDays + firstDay) {
                    $(v).children().text(i + 1 - firstDay - numDays).end().addClass('next');
                } else {
                    $(v).children().text(i + 1 - firstDay).end().addClass('cur');
                }
            });
            var today = new Date();
            if (sameMonth(currentMonth, today)) {
                $buttons.eq(getDate(today) + firstDay - 1).addClass('today');
            }
            $('tr:last', self.element).toggle(firstDay + numDays > 35);

            all.year.choices = range(11, function (v) {
                return y + v - 5;
            });
            self.currentMonth = currentMonth;
        }
        all.year.value = y;
        all.month.value = m;

        var isMinMonth = min && sameMonth(currentMonth, min);
        var isMaxMonth = max && sameMonth(currentMonth, max);
        all.prevMonth.enabled = !isMinMonth;
        all.nextMonth.enabled = !isMaxMonth;
        if (isMinMonth) {
            $buttons.slice(0, getDate(min) + firstDay - 1).addClass('disabled');
        }
        if (isMaxMonth) {
            $buttons.slice(getDate(max) + firstDay).addClass('disabled');
        }

        var selected = sameMonth(currentMonth, self.value);
        if (selected || (self.mode === 'week' && sameMonth(currentMonth, stepDate('day', self.value, 6)))) {
            switch (self.mode) {
                case 'day':
                    $buttons.eq(getDate(self.value) + firstDay - 1).addClass('selected');
                    break;
                case 'week':
                    $buttons.slice(selected ? getDate(self.value) + firstDay - 1 : 0).slice(0, 7).addClass('selected');
                    break;
                case 'month':
                    $buttons.filter('td.cur').addClass('selected');
                    break;
            }
        }
        $(self.element).toggleClass('select-range', self.mode !== 'day');
    }

    function initInternalControls() {
        var dropdownOptions = {
            template: '<z:callout label="{{selectedText}}" show-text="true"/>'
        };
        var monthChoices = new shim.Map();
        range(12, function (v) {
            monthChoices.set(v, MONTH_STR[v].toLowerCase());
        });
        controls = {
            year: ui.dropdown('year', function (self) {
                return showMonth(self.parent, new Date(self.value, getMonth(self.parent.currentMonth)));
            }, dropdownOptions),
            month: ui.dropdown('month', monthChoices, function (self) {
                return showMonth(self.parent, new Date(getFullYear(self.parent.currentMonth), self.value));
            }, dropdownOptions),
            prev: ui.button('prevMonth', '\ue314', function (self) {
                return showMonth(self.parent, -1);
            }),
            setToday: ui.button('setToday', '\ue8df', function (self) {
                return self.parent.execute(new Date());
            }),
            next: ui.button('nextMonth', '\ue315', function (self) {
                return showMonth(self.parent, 1);
            }),
            hour: ui.number('hour', {
                options: {
                    min: 0,
                    max: 23,
                    loop: true
                },
                execute: function (self) {
                    self.parent.execute(makeTime(self.value, self.all.minute.value));
                }
            }),
            timeSeperator: ui.label('timeSeperator'),
            minute: ui.number('minute', {
                options: {
                    min: 0,
                    max: 59,
                    digits: 'fixed',
                    loop: true
                },
                execute: function (self) {
                    self.parent.execute(makeTime(self.all.hour.value, self.value));
                }
            }),
            meridiem: ui.button('meridiem', {
                value: false,
                label: 'am',
                showText: true,
                propertyChange: function (e, self) {
                    self.label = self.value ? 'pm' : 'am';
                },
                execute: function (self) {
                    self.value = !self.value;
                    self.parent.execute(makeTime(self.all.hour.value % 12 + (self.value ? 12 : 0), self.all.minute.value));
                }
            })
        };
    }

    function initDatepickerCallout() {
        var executed = function (e, self) {
            var date = new Date(+self.all.calendar.value);
            date.setHours(getHours(self.all.clock.value), getMinutes(self.all.clock.value));
            activeTyper.setValue(date);
        };
        var calender = ui.calendar({
            executed: executed,
            contextChange: function (e, self) {
                self.min = callout.min;
                self.max = callout.max;
                self.mode = callout.mode === 'datetime' ? 'day' : callout.mode;
            }
        });
        var clock = ui.clock({
            hiddenWhenDisabled: true,
            executed: executed,
            contextChange: function (e, self) {
                self.step = callout.minuteStep;
                self.enabled = callout.mode === 'datetime';
            }
        });
        var okButton = ui.submit('done', 'done', {
            execute: function (self) {
                $(callout.element).detach();
            }
        });
        callout = ui.menu(
            ui.buttonset(calender, clock),
            ui.generic({
                controls: [ui.buttonset(okButton)],
                template: '<z:generic><controls layout="dialog"/></z:generic>'
            }), {
            hideCalloutOnBlur: false
        }).render();
    }

    zeta.UI.define('calendar', {
        template: '<div class="zeta-calendar"><div class="zeta-calendar-header"><z:buttonset show-text="false"/></div><div class="zeta-calendar-body"><table></table></div></div>',
        hideCalloutOnExecute: false,
        value: null,
        mode: 'day',
        min: null,
        max: null,
        setValue: function (e, self) {
            var value = normalizeDate(this, e.newValue);
            self.selectedDate = value;
            self.value = value;
            showMonth(self, value);
        },
        init: function (e, self) {
            if (!controls) {
                initInternalControls();
            }
            self.append([controls.year, controls.month, controls.prev, controls.setToday, controls.next]);

            var updateValue = function () {
                self.value = normalizeDate(self, self.selectedDate);
            };
            self.watch('mode', updateValue);
            self.watch('min', updateValue);
            self.watch('max', updateValue);

            var $table = $('table', self.element);
            $(repeat('<tr></tr>', 7)).appendTo($table);
            $(repeat('<th></th>', 7)).appendTo($table.find('tr:first'));
            $(repeat('<td></td>', 7)).appendTo($table.find('tr+tr'));
            $('<button>').appendTo($table.find('td'));
            $table.find('th').text(function (i) {
                return WEEKDAYS_STR[i];
            });
            $table.find('td').click(function () {
                var monthDelta = $(this).hasClass('prev') ? -1 : $(this).hasClass('next') ? 1 : 0;
                self.execute(new Date(getFullYear(self.currentMonth), getMonth(self.currentMonth) + monthDelta, +this.textContent));
            });
            if (!self.value) {
                self.value = new Date();
            } else {
                showMonth(self, 0);
            }
        },
        mousewheel: function (e, self) {
            showMonth(self, e.data);
            e.handled();
        },
        contextChange: function (e, self) {
            showMonth(self, self.currentMonth || self.value || new Date());
        }
    });

    zeta.UI.define('clock', {
        template: '<div class="zeta-clock"><div class="zeta-clock-face"><s hand="h"></s><s hand="m"></s></div><z:buttonset/></div>',
        hideCalloutOnExecute: false,
        step: 1,
        value: null,
        init: function (e, self) {
            if (!controls) {
                initInternalControls();
            }
            self.append([controls.hour, controls.timeSeperator, controls.minute, controls.meridiem]);
            if (!self.value) {
                self.value = new Date();
            }
            self.watch('step', function () {
                ui.all(self).minute.options.step = self.step;
            });

            // only allow minute interval that is a factor of 60
            // to maintain consistent step over hours
            if (60 % self.step > 0) {
                self.step = 1;
            }
            var $face = $('.zeta-clock-face', self.element);
            $(repeat('<i></i>', 12)).appendTo($face).each(function (i, v) {
                $(v).css('transform', 'rotate(' + (i * 30) + 'deg)');
            });
            $('s', self.element).on('mousedown touchstart', function (e) {
                var elm = e.target;
                var rect = helper.getRect(elm.parentNode);
                var isTouch = e.type === 'touchstart';
                var handlers = {};
                handlers[isTouch ? 'touchmove' : 'mousemove'] = function (e) {
                    if (!isTouch && e.which !== 1) {
                        return handlers.mouseup();
                    }
                    var point = isTouch ? e.originalEvent.touches[0] : e;
                    var rad = Math.atan2(point.clientY - rect.centerY, point.clientX - rect.centerX) / Math.PI;
                    var curM = getMinutes(self.value);
                    var curH = getHours(self.value);
                    if (elm.getAttribute('hand') === 'm') {
                        var m = (Math.round((rad * 30 + 75) / self.step) * self.step) % 60;
                        if (m !== curM) {
                            var deltaH = Math.floor(Math.abs(curM - m) / 30) * (m > curM ? -1 : 1);
                            self.setValue(makeTime(curH + deltaH, m));
                        }
                    } else {
                        var h = Math.round(rad * 6 + 15) % 12 + (ui.all(self).meridiem.value ? 12 : 0);
                        if (h !== curH) {
                            self.setValue(makeTime(h, curM));
                        }
                    }
                };
                handlers[isTouch ? 'touchend' : 'mouseup'] = function () {
                    $(document.body).off(handlers);
                    self.execute();
                };
                if (e.which === 1 || (e.originalEvent.touches || '').length === 1) {
                    $(document.body).on(handlers);
                }
            });
            self.setValue(new Date());
        },
        setValue: function (e, self) {
            var date = e.newValue;
            var all = ui.all(self);
            all.hour.value = getHours(date) || 12;
            all.minute.value = getMinutes(date);
            all.meridiem.value = getHours(date) >= 12;
            $('s[hand="h"]', self.element).css('transform', 'rotate(' + (getHours(date) * 30 + getMinutes(date) * 0.5 - 90) + 'deg)');
            $('s[hand="m"]', self.element).css('transform', 'rotate(' + (getMinutes(date) * 6 - 90) + 'deg)');
        },
        mousewheel: function (e, self) {
            self.setValue(stepDate('minute', self.value, e.data, self.step));
            self.mousewheelTimeout = self.mousewheelTimeout || setTimeout(function () {
                self.mousewheelTimeout = null;
                self.execute();
            });
            e.preventDefault();
            e.handled();
        }
    });

    var preset = {
        options: {
            mode: 'day',
            minuteStep: 1,
            min: null,
            max: null,
            required: false,
            formatDate: null
        },
        overrides: {
            getValue: function (preset) {
                return preset.selectedDate ? normalizeDate(preset.options, preset.selectedDate) : null;
            },
            setValue: function (preset, date) {
                date = date ? normalizeDate(preset.options, date) : null;
                preset.selectedDate = date;
                preset.softSelectedDate = null;

                var text = '';
                if (date) {
                    var format = function (fn) {
                        return helper.isFunction(fn) && fn(preset.options.mode, date);
                    };
                    text = format(preset.options.formatDate) || format(formatDate);
                }
                if (text !== this.extractText()) {
                    this.invoke(function (tx) {
                        tx.selection.selectAll();
                        tx.insertText(text);
                    });
                    if (this === activeTyper) {
                        callout.calendar = callout.clock = preset.selectedDate || new Date();
                    }
                }
            },
            hasContent: function (preset) {
                return !!this.extractText();
            },
            validate: function (preset) {
                if (preset.options.required && !!preset.selectedDate) {
                    return helper.reject('required');
                }
            }
        },
        commands: {
            step: function (tx, value) {
                var options = tx.widget.options;
                var date = stepDate(options.mode === 'datetime' ? 'minute' : options.mode, tx.typer.getValue() || new Date(), value, options.minuteStep);
                tx.typer.setValue(date);
            }
        },
        contentChange: function (e) {
            if (e.typer === activeTyper && e.source !== 'script') {
                var date = new Date(e.typer.extractText());
                if (!isNaN(+date)) {
                    callout.calendar = callout.clock = normalizeDate(e.widget.options, date);
                }
                e.widget.softSelectedDate = date;
            }
        },
        click: function (e) {
            if (e.typer === activeTyper) {
                callout.showMenu(e.typer.element);
            }
        },
        mousewheel: function (e) {
            e.typer.invoke('step', e.data);
            e.preventDefault();
        },
        upArrow: function (e) {
            e.typer.invoke('step', -1);
        },
        downArrow: function (e) {
            e.typer.invoke('step', 1);
        },
        escape: function (e) {
            if (helper.containsOrEquals(document, callout.element)) {
                $(callout.element).detach();
                e.handled();
            }
        },
        focusin: function (e) {
            if (!callout) {
                initDatepickerCallout();
            }
            dom.retainFocus(e.typer.element, callout.element);
            activeTyper = e.typer;

            var options = e.widget.options;
            var value = e.typer.getValue() || new Date();
            helper.extend(callout, {
                mode: options.mode,
                minuteStep: options.minuteStep,
                min: options.min,
                max: options.max,
                calendar: value,
                clock: value
            });
            callout.update();
            callout.showMenu(e.typer.element);
        },
        focusout: function (e) {
            if (e.typer === activeTyper) {
                var softDate = e.widget.softSelectedDate;
                e.typer.setValue(!softDate || isNaN(+softDate) ? e.widget.selectedDate : softDate);
                activeTyper = null;
                callout.hideMenu();
            }
        }
    };

    zeta.UI.define('datepicker', {
        template: '<z:textbox/>',
        preventLeave: true,
        value: '',
        preset: preset,
        options: {},
        init: function (e, self) {
            if (zeta.IS_TOUCH) {
                var mode = self.options.mode || self.preset.options.mode;
                self.nativeInput = $('<input type="' + INPUT_TYPES[mode] + '">').appendTo(self.element)[0];
                helper.bind(self.nativeInput, 'change', function (e) {
                    // see comments below for conversion
                    self.setValue(new Date(self.nativeInput.valueAsNumber + (TIMEZONE_OFFSET * (mode === 'datetime' ? 1 : -1))));
                });
            }
        },
        focusin: function (e, self) {
            if (zeta.IS_TOUCH) {
                // input type "datetime-local" does not support valueAsDate so we need to use with valueAsNumber (timestamp)
                // timestamp values for native controls are based on local time against local time epoch for "datetime-local" and
                // UTC midnight against UTC epoch for other non-time types; which is exactly the opposite in this library:
                // local time against UTC epoch and local midnight against UTC epoch respectively
                var mode = self.options.mode || self.preset.options.mode;
                self.nativeInput.valueAsNumber = +(self.value || new Date()) - (TIMEZONE_OFFSET * (mode === 'datetime' ? 1 : -1));
            }
        }
    });

    var DEFAULT_LABELS = {
        setToday: 'Today',
        prevMonth: 'Previous month',
        nextMonth: 'Next month',
        timeSeperator: ':',
        am: 'AM',
        pm: 'PM',
        done: 'Done'
    };
    range(12, function (i) {
        DEFAULT_LABELS[MONTH_STR[i].toLowerCase()] = MONTH_STR[i];
    });
    ui.i18n('en', DEFAULT_LABELS);

}(jQuery, zeta, Date));
