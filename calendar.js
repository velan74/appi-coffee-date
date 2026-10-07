/* Lightweight date picker; the original date input remains the source of truth. */
(() => {
    const input = document.getElementById('dateInput');
    if (!input) return;
    const field = input.closest('.date-field');
    const card = field.closest('.date-card');
    const format = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
    const monthFormat = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' });
    const iso = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const parse = value => new Date(`${value}T12:00:00`);
    const minimum = () => parse(input.min || iso(new Date()));
    let month = minimum();
    month.setDate(1);
    let focused = iso(minimum());
    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'calendar-trigger';
    trigger.setAttribute('aria-expanded', 'false');
    trigger.setAttribute('aria-controls', 'coffeeCalendar');
    field.appendChild(trigger);
    const panel = document.createElement('div');
    panel.id = 'coffeeCalendar';
    panel.className = 'coffee-calendar';
    panel.hidden = true;
    panel.setAttribute('role', 'group');
    panel.setAttribute('aria-label', 'Choose your coffee date');
    panel.innerHTML = `<div class="calendar-heading"><button type="button" class="calendar-nav" data-month="-1" aria-label="Previous month">‹</button><strong aria-live="polite"></strong><button type="button" class="calendar-nav" data-month="1" aria-label="Next month">›</button></div><div class="calendar-weekdays" aria-hidden="true"><span>Su</span><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span></div><div class="calendar-days" role="group" aria-label="Days of the month"></div><div class="calendar-footer"><span>A little time for us.</span><button type="button" class="calendar-today">Today</button></div>`;
    field.after(panel);
    field.classList.add('has-modern-calendar');
    input.hidden = true;
    input.tabIndex = -1;
    const sync = () => {
        trigger.textContent = input.value ? format.format(parse(input.value)) : 'Choose a day';
        trigger.classList.toggle('has-date', !!input.value);
        trigger.setAttribute('aria-label', `Coffee date: ${trigger.textContent}`);
    };
    const render = (moveFocus = false) => {
        panel.querySelector('.calendar-heading strong').textContent = monthFormat.format(month);
        const min = iso(minimum());
        const prev = new Date(month.getFullYear(), month.getMonth(), 0);
        panel.querySelector('[data-month="-1"]').disabled = iso(prev) < min;
        const days = panel.querySelector('.calendar-days');
        days.replaceChildren();
        for (let i = 0; i < month.getDay(); i++) {
            const blank = document.createElement('span');
            blank.setAttribute('aria-hidden', 'true');
            days.appendChild(blank);
        }
        const count = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
        const today = iso(new Date());
        for (let n = 1; n <= count; n++) {
            const date = new Date(month.getFullYear(), month.getMonth(), n, 12);
            const value = iso(date);
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'calendar-day';
            button.textContent = n;
            button.dataset.date = value;
            button.disabled = value < min || !!input.max && value > input.max;
            button.tabIndex = value === focused ? 0 : -1;
            button.setAttribute('aria-label', format.format(date));
            button.setAttribute('aria-pressed', String(value === input.value));
            if (value === today) button.setAttribute('aria-current', 'date');
            days.appendChild(button);
        }
        if (!days.querySelector('[tabindex="0"]')) {
            const first = days.querySelector('button:not(:disabled)');
            if (first) { first.tabIndex = 0; focused = first.dataset.date; }
        }
        if (moveFocus) days.querySelector('[tabindex="0"]')?.focus();
    };
    const close = () => { panel.hidden = true; trigger.setAttribute('aria-expanded', 'false'); };
    const choose = value => {
        if (value < iso(minimum()) || input.max && value > input.max) return;
        input.value = value;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        sync(); close(); trigger.focus();
    };
    trigger.addEventListener('click', event => {
        event.preventDefault();
        if (!panel.hidden) { close(); return; }
        focused = input.value && input.value >= iso(minimum()) ? input.value : iso(minimum());
        month = parse(focused); month.setDate(1);
        panel.hidden = false;
        trigger.setAttribute('aria-expanded', 'true');
        render(true);
    });
    panel.addEventListener('click', event => {
        const day = event.target.closest('[data-date]');
        if (day && !day.disabled) choose(day.dataset.date);
        const nav = event.target.closest('[data-month]');
        if (nav && !nav.disabled) { month.setMonth(month.getMonth() + Number(nav.dataset.month)); render(); }
        if (event.target.closest('.calendar-today')) choose(iso(new Date()));
    });
    panel.addEventListener('keydown', event => {
        if (event.key === 'Escape') { event.preventDefault(); close(); trigger.focus(); return; }
        const day = event.target.closest('[data-date]');
        if (!day) return;
        const offsets = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
        if (!(event.key in offsets)) return;
        event.preventDefault();
        const date = parse(day.dataset.date);
        date.setDate(date.getDate() + offsets[event.key]);
        const value = iso(date);
        if (value < iso(minimum()) || input.max && value > input.max) return;
        focused = value; month = new Date(date.getFullYear(), date.getMonth(), 1); render(true);
    });
    document.addEventListener('pointerdown', event => { if (!card.contains(event.target)) close(); });
    card.addEventListener('focusout', event => { if (!card.contains(event.relatedTarget)) close(); });
    document.addEventListener('screenchange', () => { close(); sync(); });
    input.addEventListener('change', sync);
    sync();
})();
