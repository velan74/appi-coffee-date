/* Custom time controls keep the original input and save handlers intact. */
(() => {
    const input = document.getElementById('customTimeInput');
    const panel = document.getElementById('customTimePanel');
    const toggle = document.getElementById('customTimeToggle');
    if (!input || !panel || !toggle) return;
    input.hidden = true;
    input.tabIndex = -1;
    panel.classList.add('modern-time-panel');
    const label = panel.querySelector('label');
    label.removeAttribute('for');
    const picker = document.createElement('div');
    picker.className = 'modern-time-picker';
    picker.setAttribute('role', 'group');
    picker.setAttribute('aria-label', 'Choose a custom time');
    picker.innerHTML = `<div class="time-dials">
        <div class="time-dial"><button type="button" data-step="1" data-part="hour" aria-label="Increase hour">⌃</button><input class="time-number" data-number="hour" type="text" inputmode="numeric" pattern="[0-9]*" maxlength="2" aria-label="Hour, 1 to 12"><button type="button" data-step="-1" data-part="hour" aria-label="Decrease hour">⌄</button><span>Hour</span></div>
        <span class="time-colon" aria-hidden="true">:</span>
        <div class="time-dial"><button type="button" data-step="1" data-part="minute" aria-label="Increase minute">⌃</button><input class="time-number" data-number="minute" type="text" inputmode="numeric" pattern="[0-9]*" maxlength="2" aria-label="Minute, 0 to 59"><button type="button" data-step="-1" data-part="minute" aria-label="Decrease minute">⌄</button><span>Minute</span></div>
        <div class="time-period" role="group" aria-label="AM or PM"><button type="button" data-period="AM">AM</button><button type="button" data-period="PM">PM</button></div>
    </div><button type="button" class="time-apply">Set this time <span aria-hidden="true">→</span></button>`;
    panel.appendChild(picker);
    const hourField = picker.querySelector('[data-number="hour"]');
    const minuteField = picker.querySelector('[data-number="minute"]');
    let hour = 5, minute = 0, period = 'PM';
    const paint = () => {
        hourField.value = String(hour).padStart(2, '0');
        minuteField.value = String(minute).padStart(2, '0');
        picker.querySelectorAll('[data-period]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.period === period)));
    };
    const collect = () => {
        hour = Math.min(12, Math.max(1, Number(hourField.value) || hour));
        minute = Math.min(59, Math.max(0, Number(minuteField.value) || 0));
        paint();
    };
    const load = () => {
        const selected = document.querySelector('.time-option.selected');
        const value = selected?.dataset.time || input.value || '17:00';
        const [h, m] = value.split(':').map(Number);
        hour = h % 12 || 12; minute = m; period = h >= 12 ? 'PM' : 'AM';
        paint();
    };
    picker.addEventListener('click', event => {
        const step = event.target.closest('[data-step]');
        if (step) {
            collect();
            if (step.dataset.part === 'hour') hour = (hour - 1 + Number(step.dataset.step) + 12) % 12 + 1;
            else minute = (minute + Number(step.dataset.step) + 60) % 60;
            paint();
        }
        const periodButton = event.target.closest('[data-period]');
        if (periodButton) { collect(); period = periodButton.dataset.period; paint(); }
        if (event.target.closest('.time-apply')) {
            collect();
            input.value = `${String(hour % 12 + (period === 'PM' ? 12 : 0)).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
            panel.hidden = true;
            toggle.classList.remove('open');
            toggle.setAttribute('aria-expanded', 'false');
            toggle.focus();
        }
    });
    [hourField, minuteField].forEach(field => {
        field.addEventListener('input', () => { field.value = field.value.replace(/\D/g, ''); });
        field.addEventListener('change', collect);
        field.addEventListener('keydown', event => {
            if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
                event.preventDefault();
                picker.querySelector(`[data-part="${field.dataset.number}"][data-step="${event.key === 'ArrowUp' ? 1 : -1}"]`).click();
            }
            if (event.key === 'Enter') { event.preventDefault(); picker.querySelector('.time-apply').click(); }
        });
    });
    toggle.setAttribute('aria-controls', panel.id);
    toggle.setAttribute('aria-expanded', String(!panel.hidden));
    new MutationObserver(() => {
        toggle.setAttribute('aria-expanded', String(!panel.hidden));
        if (!panel.hidden) { load(); hourField.focus(); }
    }).observe(panel, { attributes: true, attributeFilter: ['hidden'] });
    picker.addEventListener('keydown', event => {
        if (event.key === 'Escape') { panel.hidden = true; toggle.classList.remove('open'); toggle.focus(); }
    });
    load();
})();
