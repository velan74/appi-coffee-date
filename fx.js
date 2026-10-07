/* Warm sunlight background, title reveals, cursor, tilt and preloader. */
(() => {
    "use strict";

    const FX = (window.FX = window.FX || {});

    const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const finePointer = matchMedia("(hover: hover) and (pointer: fine)").matches;

    const lerp = (a, b, t) => a + (b - a) * t;

    function splitWords(root) {
        if (!root || root.dataset.split) return;
        root.dataset.split = "true";

        let index = 0;

        const walk = node => {
            [...node.childNodes].forEach(child => {
                if (child.nodeType === Node.TEXT_NODE) {
                    const parts = child.textContent.split(/(\s+)/);
                    const frag = document.createDocumentFragment();
                    parts.forEach(part => {
                        if (!part) return;
                        if (/^\s+$/.test(part)) {
                            frag.appendChild(document.createTextNode(" "));
                            return;
                        }
                        const outer = document.createElement("span");
                        outer.className = "w";
                        const inner = document.createElement("span");
                        inner.className = "wi";
                        inner.style.setProperty("--wi", index++);
                        inner.textContent = part;
                        outer.appendChild(inner);
                        frag.appendChild(outer);
                    });
                    child.replaceWith(frag);
                } else if (child.nodeType === Node.ELEMENT_NODE && child.tagName !== "BR") {
                    walk(child);
                }
            });
        };

        walk(root);

        /* Trim stray leading/trailing spaces created by the HTML formatting */
        root.style.setProperty("--words", index);
    }

    function indexChildren(screen) {
        const inner = screen.querySelector(".screen-inner");
        if (!inner) return;
        [...inner.children].forEach((child, i) => {
            child.style.setProperty("--d", i);
        });
    }


    /* =====================================================
       3. SCREEN CHANGE CHOREOGRAPHY
    ====================================================== */

    function initSunlight() {
        const wall = document.querySelector('.sunlight-wall');
        if (!wall) return;
        const sync = () => {
            const id = document.body.dataset.screen || 'intro';
            wall.querySelectorAll('.sun-mood').forEach(layer => {
                layer.classList.toggle('is-current', layer.dataset.mood === id);
            });
        };
        new MutationObserver(sync).observe(document.body, { attributes: true, attributeFilter: ['data-screen'] });
        sync();
        const motion = matchMedia('(prefers-reduced-motion: reduce)');
        const settle = () => document.body.classList.toggle('sun-still', motion.matches);
        motion.addEventListener?.('change', settle);
        settle();
        document.addEventListener('visibilitychange', () => {
            document.body.classList.toggle('sun-paused', document.hidden);
        });
    }

    const bigNumeral = document.getElementById("bigNumeral");
    const railLabel = document.getElementById("railLabel");
    const screenOrder = ["intro", "story", "question", "date", "time", "place", "drink", "vibe", "note", "review", "success"];

    function onScreen(id, back = false, initial = false) {
        document.body.dataset.screen = id;

        const screen = document.getElementById(id);
        if (screen) indexChildren(screen);

        const n = String(screenOrder.indexOf(id) + 1).padStart(2, "0");

        if (bigNumeral && bigNumeral.textContent !== n) {
            bigNumeral.classList.remove("swap");
            void bigNumeral.offsetWidth;
            bigNumeral.textContent = n;
            bigNumeral.classList.add("swap");
        }

        if (railLabel && screen?.dataset.label) {
            railLabel.textContent = screen.dataset.label;
        }


    }

    document.addEventListener("screenchange", e => {
        onScreen(e.detail.id, e.detail.back);
    });


    /* =====================================================
       4. CURSOR + SPOTLIGHT
    ====================================================== */

    function initCursor() {
        const ring = document.getElementById("cursorRing");
        const dot = document.getElementById("cursorDot");
        const spot = document.getElementById("spotlight");

        if (!finePointer || reduceMotion || !ring || !dot) {
            document.body.classList.add("no-custom-cursor");
            return;
        }

        document.body.classList.add("has-custom-cursor");

        let mx = innerWidth / 2, my = innerHeight / 2;
        let rx = mx, ry = my;
        let sx = mx, sy = my;
        let visible = false;

        window.addEventListener("pointermove", e => {
            mx = e.clientX;
            my = e.clientY;
            if (!visible) {
                visible = true;
                rx = sx = mx;
                ry = sy = my;
                document.body.classList.add("cursor-visible");
            }
        }, { passive: true });

        document.addEventListener("pointerleave", () => {
            visible = false;
            document.body.classList.remove("cursor-visible");
        });

        const interactive = "button, a, input, textarea, label, .time-option, .place-option, .choice-card, .choice-row";

        document.addEventListener("pointerover", e => {
            const el = e.target.closest(interactive);
            document.body.classList.toggle("cursor-hover", !!el && !el.disabled);
            document.body.classList.toggle("cursor-text", !!e.target.closest("input, textarea"));
        });

        document.addEventListener("pointerdown", () => document.body.classList.add("cursor-down"));
        document.addEventListener("pointerup", () => document.body.classList.remove("cursor-down"));

        const tick = () => {
            const vx = mx - rx;
            const vy = my - ry;
            rx += vx * 0.18;
            ry += vy * 0.18;
            sx = lerp(sx, mx, 0.08);
            sy = lerp(sy, my, 0.08);

            const speed = Math.min(Math.hypot(vx, vy), 90);
            const stretch = 1 + speed / 360;
            const angle = Math.atan2(vy, vx) * 180 / Math.PI;

            dot.style.transform = `translate3d(${mx}px, ${my}px, 0)`;
            ring.style.transform = `translate3d(${rx}px, ${ry}px, 0) rotate(${angle}deg) scale(${stretch}, ${1 / stretch})`;

            if (spot) {
                spot.style.transform = `translate3d(${sx}px, ${sy}px, 0)`;
            }

            requestAnimationFrame(tick);
        };

        requestAnimationFrame(tick);
    }


    /* =====================================================
       5. TILT + SPECULAR LIGHT + MAGNETIC BUTTONS
    ====================================================== */

    function initSurfaces() {
        const lightSel = ".glass-card, .reason-card, .time-option, .ticket, .countdown-item";
        const tiltSel = ".story-card, .question-card, .date-card, .time-card, .note-card, .confirmed-card, .ticket, .reason-card, .choice-card";
        const magneticSel = ".primary-button, .yes-button, .confirm-button, .secondary-button, .another-coffee-button, .modal-close";

        /* Specular light follows the pointer on every glass surface */
        document.addEventListener("pointermove", e => {
            const el = e.target.closest?.(lightSel);
            if (!el) return;
            const r = el.getBoundingClientRect();
            el.style.setProperty("--mx", `${((e.clientX - r.left) / r.width) * 100}%`);
            el.style.setProperty("--my", `${((e.clientY - r.top) / r.height) * 100}%`);
        }, { passive: true });

        if (!finePointer || reduceMotion) return;

        /* 3D tilt */
        let tiltEl = null;

        document.addEventListener("pointermove", e => {
            const el = e.target.closest?.(tiltSel);

            if (tiltEl && tiltEl !== el) {
                tiltEl.style.setProperty("--rx", "0deg");
                tiltEl.style.setProperty("--ry", "0deg");
                tiltEl.classList.remove("is-tilting");
            }

            tiltEl = el;
            if (!el) return;

            const r = el.getBoundingClientRect();
            const px = (e.clientX - r.left) / r.width - 0.5;
            const py = (e.clientY - r.top) / r.height - 0.5;
            const max = el.classList.contains("ticket") ? 7 : 5;

            el.classList.add("is-tilting");
            el.style.setProperty("--rx", `${(-py * max).toFixed(2)}deg`);
            el.style.setProperty("--ry", `${(px * max).toFixed(2)}deg`);
        }, { passive: true });

        /* Magnetic buttons (uses the independent `translate` property,
           so it composes with each button's own hover transform) */
        document.addEventListener("pointermove", e => {
            document.querySelectorAll(".is-magnetic").forEach(btn => {
                if (!btn.contains(e.target)) {
                    btn.style.translate = "";
                    btn.classList.remove("is-magnetic");
                }
            });

            const btn = e.target.closest?.(magneticSel);
            if (!btn || btn.disabled) return;

            const r = btn.getBoundingClientRect();
            const dx = e.clientX - (r.left + r.width / 2);
            const dy = e.clientY - (r.top + r.height / 2);

            btn.classList.add("is-magnetic");
            btn.style.translate = `${dx * 0.14}px ${dy * 0.22}px`;
        }, { passive: true });
    }


    /* =====================================================
       6. BREW CUP — mirrors the modal progress bar
    ====================================================== */

    function initBrewCup() {
        const bar = document.getElementById("brewProgress");
        const modal = document.getElementById("confirmationModal");
        if (!bar || !modal) return;

        const sync = () => {
            const w = parseFloat(bar.style.width) || 0;
            modal.style.setProperty("--fill", (w / 100).toFixed(3));
        };

        new MutationObserver(sync).observe(bar, { attributes: true, attributeFilter: ["style"] });
        sync();
    }


    /* =====================================================
       7. PRELOADER
    ====================================================== */

    function initLoader() {
        const loader = document.getElementById("loader");

        const finish = () => {
            document.body.classList.remove("is-loading");
            document.body.classList.add("is-loaded");

            if (loader) {
                setTimeout(() => loader.remove(), 1400);
            }
        };

        if (!loader || reduceMotion) {
            loader?.remove();
            document.body.classList.remove("is-loading");
            document.body.classList.add("is-loaded");
            return;
        }

        let done = false;
        const go = () => {
            if (done) return;
            done = true;
            loader.classList.add("is-done");
            setTimeout(finish, 450);
        };

        /* Pour takes ~1.7s; wait for fonts too, but never longer than 3.2s */
        const minTime = new Promise(r => setTimeout(r, 1750));
        const fonts = document.fonts ? document.fonts.ready.catch(() => {}) : Promise.resolve();

        Promise.all([minTime, fonts]).then(go);
        setTimeout(go, 3200);
    }


    /* =====================================================
       8. PUBLIC API (called from script.js)
    ====================================================== */

    // Existing invitation callbacks retain their API; celebration is a soft light pulse.
    FX.burst = () => {};
    FX.sparkle = () => {};
    FX.celebrate = () => {
        if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        const bloom = document.querySelector('.celebration-light');
        if (!bloom) return;
        bloom.classList.remove('is-celebrating');
        void bloom.offsetWidth;
        bloom.classList.add('is-celebrating');
    };

    /* =====================================================
       INIT
    ====================================================== */

    function init() {
        document
            .querySelectorAll(".hero-title, .section-title, .success-title")
            .forEach(splitWords);

        document.querySelectorAll(".screen").forEach(indexChildren);

        initSunlight();

        const active = document.querySelector(".screen.active");
        onScreen(active ? active.id : "intro", false, true);

        initCursor();
        initSurfaces();
        initBrewCup();
        initLoader();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
