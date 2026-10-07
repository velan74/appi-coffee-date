/* =========================================================
   ☕ APPI × VELAN
   PREMIUM CINEMATIC COFFEE EXPERIENCE
========================================================= */


/* =========================================================
   EMAILJS
========================================================= */

const EMAILJS_SERVICE_ID =
    "service_z94wkkg";

const EMAILJS_TEMPLATE_ID =
    "template_qux5jer";

const MY_EMAIL =
    "velanvels1125@gmail.com";

const HER_EMAIL =
    "appibalaji02@gmail.com";

const STORAGE_KEY =
    "appiCoffeePlan_v5";

const screens = [
    "intro",
    "story",
    "question",
    "date",
    "time",
    "place",
    "drink",
    "vibe",
    "note",
    "review",
    "success"
];


/* =========================================================
   PLAN DATA
========================================================= */

const datePlan = {

    date: "",
    time: "",
    place: "",
    drink: "",
    vibe: "",
    note: "",

    confirmed: false,

    confirmedAt: null
};


/* =========================================================
   STATE
========================================================= */

let currentScreen = 0;

let screenHistory = [];

let countdownTimer = null;

let toastTimer = null;

let noAttempts = 0;

let confirmationInProgress = false;


/* =========================================================
   HELPERS
========================================================= */

const $ = id =>
    document.getElementById(id);

function wait(ms) {

    return new Promise(
        resolve => setTimeout(resolve, ms)
    );
}

function clamp(
    value,
    min,
    max
) {

    return Math.min(
        Math.max(value, min),
        max
    );
}


/* =========================================================
   SAVE
========================================================= */

function savePlan() {

    try {

        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({

                ...datePlan,

                currentScreen,

                noAttempts

            })
        );

    } catch (error) {

        console.warn(
            "Could not save coffee plan:",
            error
        );

    }
}


/* =========================================================
   LOAD
========================================================= */

function loadPlan() {

    try {

        const saved =
            JSON.parse(
                localStorage.getItem(
                    STORAGE_KEY
                ) || "null"
            );

        if (
            !saved ||
            typeof saved !== "object"
        ) {
            return;
        }

        Object.keys(datePlan)
            .forEach(key => {

                if (
                    saved[key] !== undefined
                ) {

                    datePlan[key] =
                        saved[key];

                }

            });

        if (
            Number.isInteger(
                saved.currentScreen
            )
        ) {

            currentScreen =
                clamp(
                    saved.currentScreen,
                    0,
                    screens.length - 1
                );

        }

        if (
            Number.isInteger(
                saved.noAttempts
            )
        ) {

            noAttempts =
                saved.noAttempts;

        }

    } catch (error) {

        console.warn(
            "Could not restore plan:",
            error
        );

    }
}


/* =========================================================
   PROGRESS
========================================================= */

function updateProgress(
    screenId
) {

    const index =
        screens.indexOf(
            screenId
        );

    if (index === -1) {
        return;
    }

    currentScreen =
        index;

    const stepNumber =
        $("stepNumber");

    const progress =
        $("experienceProgress");

    if (stepNumber) {

        stepNumber.textContent =
            String(
                index + 1
            ).padStart(
                2,
                "0"
            );

    }

    if (progress) {

        progress.style.width =
            `${(
                (index + 1) /
                screens.length
            ) * 100}%`;

    }
}


/* =========================================================
   NAVIGATION
========================================================= */

function goTo(
    screenId,
    options = {}
) {

    const nextScreen =
        $(screenId);

    if (!nextScreen) {

        console.warn(
            `Screen "${screenId}" not found.`
        );

        return;
    }

    const current =
        document.querySelector(
            ".screen.active"
        );

    if (
        current &&
        current.id === screenId
    ) {

        return;
    }


    /*
       Forward navigation.
    */

    if (
        current &&
        !options.back &&
        !options.restore &&
        current.id !== "intro"
    ) {

        if (
            screenHistory[
                screenHistory.length - 1
            ] !== current.id
        ) {

            screenHistory.push(
                current.id
            );

        }

    }


    /*
       Exit current screen.
    */

    if (current) {

        current.classList.remove(
            "enter-left",
            "enter-right"
        );

        current.classList.add(
            "exit-left"
        );

        setTimeout(
            () => {

                current.classList.remove(
                    "exit-left"
                );

            },
            550
        );

        current.classList.remove(
            "active"
        );

    }


    /*
       Prepare next screen.
    */

    nextScreen.classList.remove(
        "active",
        "enter-left",
        "enter-right",
        "exit-left"
    );

    void nextScreen.offsetWidth;


    /*
       Direction.
    */

    const nextIndex =
        screens.indexOf(
            screenId
        );

    const currentIndex =
        current
            ? screens.indexOf(
                current.id
            )
            : -1;

    if (
        options.back ||
        (
            currentIndex !== -1 &&
            nextIndex < currentIndex
        )
    ) {

        nextScreen.classList.add(
            "enter-left"
        );

    } else {

        nextScreen.classList.add(
            "enter-right"
        );

    }

    nextScreen.classList.add(
        "active"
    );


    /*
       Remove transition class.
    */

    setTimeout(
        () => {

            nextScreen.classList.remove(
                "enter-left",
                "enter-right"
            );

        },
        850
    );


    /*
       Progress.
    */

    updateProgress(
        screenId
    );


    /*
       Notify the effects layer (fx.js).
    */

    document.dispatchEvent(
        new CustomEvent(
            "screenchange",
            {
                detail: {
                    id: screenId,
                    from: current ? current.id : null,
                    back: nextScreen.classList.contains("enter-left")
                }
            }
        )
    );


    /*
       Scroll.
    */

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });


    /*
       Screen specific.
    */

    if (
        screenId === "review"
    ) {

        updateReview();

    }


    if (
        screenId === "success"
    ) {

        updateSuccessScreen();

        startCountdown();

    }


    /*
       Back buttons.
    */

    refreshBackButtons();


    /*
       Save.
    */

    savePlan();


    /*
       Ambient particles.
    */

    createScreenParticles(
        screenId
    );
}


/* =========================================================
   BACK BUTTON
========================================================= */

const backAllowedScreens = [

    "story",
    "question",
    "date",
    "time",
    "place",
    "drink",
    "vibe",
    "note",
    "review"

];


function createBackButton(
    screen
) {

    if (
        screen.querySelector(
            ".cinematic-back"
        )
    ) {
        return;
    }

    const button =
        document.createElement(
            "button"
        );

    button.type =
        "button";

    button.className =
        "cinematic-back dynamic-back";

    button.innerHTML = `
        <span class="back-icon">←</span>
        <span class="back-text">BACK</span>
    `;

    button.addEventListener(
        "click",
        goBack
    );

    screen
        .querySelector(".screen-inner")
        ?.prepend(button);
}


function refreshBackButtons() {

    document
        .querySelectorAll(".screen")
        .forEach(screen => {

            if (
                backAllowedScreens.includes(
                    screen.id
                )
            ) {

                createBackButton(
                    screen
                );

            }

        });
}


function goBack() {

    const current =
        document.querySelector(
            ".screen.active"
        );

    if (!current) {
        return;
    }

    if (
        current.id === "intro"
    ) {
        return;
    }

    let previous =
        screenHistory.pop();


    /*
       Fallback.
    */

    if (!previous) {

        const index =
            screens.indexOf(
                current.id
            );

        previous =
            screens[
                Math.max(
                    0,
                    index - 1
                )
            ];

    }

    goTo(
        previous,
        {
            back: true
        }
    );
}


/* =========================================================
   INTRO
========================================================= */

$("openButton")
    ?.addEventListener(
        "click",
        () => {

            createCoffeeBurst();

            goTo("story");

        }
    );


/* =========================================================
   STORY
========================================================= */

$("storyButton")
    ?.addEventListener(
        "click",
        () => {

            goTo("question");

        }
    );


/* =========================================================
   QUESTION
========================================================= */

$("yesButton")
    ?.addEventListener(
        "click",
        () => {

            createMiniSparkles();

            goTo("date");

        }
    );


const noButton =
    $("noButton");

const questionButtons =
    $("questionButtons");

const noHint =
    $("noHint");


function moveNoButton() {

    if (
        !noButton ||
        !questionButtons
    ) {
        return;
    }

    noAttempts++;

    const container =
        questionButtons
            .getBoundingClientRect();

    const button =
        noButton
            .getBoundingClientRect();


    // Keep the landing rectangle outside Yes, including a generous safety margin.
    const yesRect = $("yesButton").getBoundingClientRect();
    const width = noButton.offsetWidth;
    const height = noButton.offsetHeight;
    const maxX = Math.max(8, questionButtons.clientWidth - width - 8);
    const maxY = Math.max(8, questionButtons.clientHeight - height - 12);
    const minY = Math.max(8, yesRect.bottom - container.top + 28);
    const oldX = noButton.offsetLeft;
    const oldY = noButton.offsetTop;
    const candidates = [];
    for (let i = 0; i < 48; i++) {
        const px = 8 + Math.random() * (maxX - 8);
        const py = minY + Math.random() * Math.max(0, maxY - minY);
        if (Math.hypot(px - oldX, py - oldY) >= 64) candidates.push({ x: px, y: py });
    }
    // Corners guarantee a distant fallback even after repeated rapid taps.
    const corners = [{x:8,y:minY},{x:maxX,y:minY},{x:8,y:maxY},{x:maxX,y:maxY}];
    corners.sort((a,b) => Math.hypot(b.x-oldX,b.y-oldY)-Math.hypot(a.x-oldX,a.y-oldY));
    const { x, y } = candidates.length ? candidates[Math.floor(Math.random()*candidates.length)] : corners[0];

    noButton.style.position =
        "absolute";

    noButton.style.left =
        `${x}px`;

    noButton.style.top =
        `${y}px`;


    noButton.classList.remove(
        "no-dodge"
    );

    void noButton.offsetWidth;

    noButton.classList.add(
        "no-dodge"
    );


    const messages = [

        "Nice try.",

        "That button is feeling shy.",

        "Appi... the button has other plans.",

        "Still trying? I respect the commitment.",

        "YES is looking like the easier option.",

        "Okay... the website has made its decision."

    ];


    if (noHint) {

        noHint.textContent =
            messages[
                Math.min(
                    noAttempts - 1,
                    messages.length - 1
                )
            ];

    }


    /* particles burst from where the button just escaped (viewport coords) */
    createTinyEscapeParticles(
        button.left + button.width / 2,
        button.top + button.height / 2
    );

    savePlan();
}


noButton?.addEventListener(
    "mouseenter",
    moveNoButton
);


noButton?.addEventListener(
    "touchstart",
    event => {

        event.preventDefault();

        moveNoButton();

    },
    {
        passive: false
    }
);


noButton?.addEventListener(
    "click",
    event => {

        event.preventDefault();

        moveNoButton();

    }
);


/* =========================================================
   DATE
========================================================= */

const dateInput =
    $("dateInput");

const dateButton =
    $("dateButton");


function getLocalDateString() {

    const now =
        new Date();

    return [

        now.getFullYear(),

        String(
            now.getMonth() + 1
        ).padStart(
            2,
            "0"
        ),

        String(
            now.getDate()
        ).padStart(
            2,
            "0"
        )

    ].join("-");
}


if (dateInput) {

    dateInput.min =
        getLocalDateString();


    dateInput.addEventListener(
        "change",
        () => {

            datePlan.date =
                dateInput.value;

            if (dateButton) {

                dateButton.disabled =
                    !datePlan.date;

            }

            createMiniSparkles();

            savePlan();

        }
    );
}


dateButton?.addEventListener(
    "click",
    () => {

        if (!datePlan.date) {

            showToast(
                "Choose a date first."
            );

            return;
        }

        goTo("time");

    }
);


/* =========================================================
   TIME
========================================================= */

const timeOptions =
    document.querySelectorAll(
        ".time-option"
    );

const customTimeToggle =
    $("customTimeToggle");

const customTimePanel =
    $("customTimePanel");

const customTimeInput =
    $("customTimeInput");

const timeButton =
    $("timeButton");

const selectedTimeLabel =
    $("selectedTimeLabel");


function selectTime(
    value,
    clickedButton = null
) {

    if (!value) {
        return;
    }

    datePlan.time =
        value;


    timeOptions.forEach(
        button => {

            button.classList.remove(
                "selected"
            );

        }
    );


    if (clickedButton) {

        clickedButton.classList.add(
            "selected"
        );

    }


    if (selectedTimeLabel) {

        selectedTimeLabel.textContent =
            formatTime(
                value
            );

    }


    if (timeButton) {

        timeButton.disabled =
            false;

    }


    createMiniSparkles();

    savePlan();
}


timeOptions.forEach(
    button => {

        button.addEventListener(
            "click",
            () => {

                if (
                    customTimePanel
                ) {

                    customTimePanel.hidden =
                        true;

                }

                if (
                    customTimeToggle
                ) {

                    customTimeToggle
                        .classList.remove(
                            "open"
                        );

                }

                selectTime(
                    button.dataset.time,
                    button
                );

            }
        );

    }
);


customTimeToggle
    ?.addEventListener(
        "click",
        () => {

            if (!customTimePanel) {
                return;
            }

            customTimePanel.hidden =
                !customTimePanel.hidden;

            customTimeToggle.classList.toggle(
                "open",
                !customTimePanel.hidden
            );

            if (
                !customTimePanel.hidden
            ) {

                customTimeInput?.focus();

            }

        }
    );


customTimeInput
    ?.addEventListener(
        "change",
        () => {

            if (
                !customTimeInput.value
            ) {
                return;
            }

            selectTime(
                customTimeInput.value
            );

            timeOptions.forEach(
                button => {

                    button.classList.remove(
                        "selected"
                    );

                }
            );

        }
    );


timeButton?.addEventListener(
    "click",
    () => {

        if (!datePlan.time) {

            showToast(
                "Choose a time first."
            );

            return;
        }

        goTo("place");

    }
);


/* =========================================================
   PLACE
========================================================= */

document
    .querySelectorAll(
        ".place-option"
    )
    .forEach(
        button => {

            button.addEventListener(
                "click",
                () => {

                    document
                        .querySelectorAll(
                            ".place-option"
                        )
                        .forEach(
                            item => {

                                item.classList.remove(
                                    "selected"
                                );

                            }
                        );


                    button.classList.add(
                        "selected"
                    );


                    datePlan.place =
                        button.dataset.place ||
                        "";


                    createMiniSparkles();

                    savePlan();


                    setTimeout(
                        () => {

                            goTo("drink");

                        },
                        250
                    );

                }
            );

        }
    );


/* =========================================================
   DRINK
========================================================= */

const drinkButton =
    $("drinkButton");


document
    .querySelectorAll(
        ".choice-card"
    )
    .forEach(
        button => {

            button.addEventListener(
                "click",
                () => {

                    document
                        .querySelectorAll(
                            ".choice-card"
                        )
                        .forEach(
                            item => {

                                item.classList.remove(
                                    "selected"
                                );

                            }
                        );


                    button.classList.add(
                        "selected"
                    );


                    datePlan.drink =
                        button.dataset.drink ||
                        "";


                    if (drinkButton) {

                        drinkButton.disabled =
                            false;

                    }


                    createMiniSparkles();

                    savePlan();

                }
            );

        }
    );


drinkButton?.addEventListener(
    "click",
    () => {

        if (!datePlan.drink) {

            showToast(
                "Choose what we're drinking."
            );

            return;
        }

        goTo("vibe");

    }
);


/* =========================================================
   VIBE
========================================================= */

const vibeButton =
    $("vibeButton");


document
    .querySelectorAll(
        ".choice-row"
    )
    .forEach(
        button => {

            button.addEventListener(
                "click",
                () => {

                    document
                        .querySelectorAll(
                            ".choice-row"
                        )
                        .forEach(
                            item => {

                                item.classList.remove(
                                    "selected"
                                );

                            }
                        );


                    button.classList.add(
                        "selected"
                    );


                    datePlan.vibe =
                        button.dataset.vibe ||
                        "";


                    if (vibeButton) {

                        vibeButton.disabled =
                            false;

                    }


                    createMiniSparkles();

                    savePlan();

                }
            );

        }
    );


vibeButton?.addEventListener(
    "click",
    () => {

        if (!datePlan.vibe) {

            showToast(
                "Pick the vibe."
            );

            return;
        }

        goTo("note");

    }
);


/* =========================================================
   NOTE
========================================================= */

const noteInput =
    $("noteInput");

const noteCount =
    $("noteCount");


noteInput?.addEventListener(
    "input",
    () => {

        const value =
            noteInput.value;


        if (noteCount) {

            noteCount.textContent =
                `${value.length} / 240`;

        }


        datePlan.note =
            value.trim();


        savePlan();

    }
);


$("noteButton")
    ?.addEventListener(
        "click",
        () => {

            datePlan.note =
                noteInput?.value.trim() ||
                "";

            goTo("review");

        }
    );


$("skipNoteButton")
    ?.addEventListener(
        "click",
        () => {

            datePlan.note = "";

            if (noteInput) {

                noteInput.value =
                    "";

            }

            if (noteCount) {

                noteCount.textContent =
                    "0 / 240";

            }

            savePlan();

            goTo("review");

        }
    );


/* =========================================================
   FORMAT DATE
========================================================= */

function formatDate(
    dateString
) {

    if (!dateString) {

        return "Not selected";

    }

    const date =
        new Date(
            `${dateString}T00:00:00`
        );

    return date.toLocaleDateString(
        "en-IN",
        {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric"
        }
    );
}


/* =========================================================
   FORMAT TIME
========================================================= */

function formatTime(
    timeString
) {

    if (!timeString) {

        return "Not selected";

    }

    const parts =
        timeString.split(":");

    const hours =
        Number(parts[0]);

    const minutes =
        Number(parts[1]);

    const date =
        new Date();

    date.setHours(
        hours,
        minutes,
        0,
        0
    );

    return date.toLocaleTimeString(
        "en-IN",
        {
            hour: "numeric",
            minute: "2-digit",
            hour12: true
        }
    );
}


/* =========================================================
   REVIEW
========================================================= */

function updateReview() {

    if ($("reviewDate")) {

        $("reviewDate").textContent =
            formatDate(
                datePlan.date
            );

    }


    if ($("reviewTime")) {

        $("reviewTime").textContent =
            formatTime(
                datePlan.time
            );

    }


    if ($("reviewPlace")) {

        $("reviewPlace").textContent =
            datePlan.place ||
            "Not selected";

    }


    if ($("reviewDrink")) {

        $("reviewDrink").textContent =
            datePlan.drink ||
            "Not selected";

    }


    if ($("reviewVibe")) {

        $("reviewVibe").textContent =
            datePlan.vibe ||
            "Not selected";

    }


    const noteWrap =
        $("reviewNoteWrap");


    if (datePlan.note) {

        if (noteWrap) {

            noteWrap.style.display =
                "";

        }

        if ($("reviewNote")) {

            $("reviewNote").textContent =
                datePlan.note;

        }

    } else {

        if (noteWrap) {

            noteWrap.style.display =
                "none";

        }

    }
}


/* =========================================================
   EMAIL
========================================================= */

async function sendEmailTo(
    recipientEmail,
    recipientName,
    recipientType
) {

    const templateParams = {

        to_email:
            recipientEmail,

        recipient_name:
            recipientName,

        recipient_type:
            recipientType,

        date:
            formatDate(
                datePlan.date
            ),

        time:
            formatTime(
                datePlan.time
            ),

        place:
            datePlan.place,

        drink:
            datePlan.drink,

        vibe:
            datePlan.vibe,

        note:
            datePlan.note ||
            "No note was added.",

        status:
            "CONFIRMED",

        name:
            "Appi Dhanavanthri Singh",

        nickname:
            "Appi",

        sender_name:
            "Velan",

        email_subject:
            "Coffee plans — Appi × Velan"

    };


    return emailjs.send(
        EMAILJS_SERVICE_ID,
        EMAILJS_TEMPLATE_ID,
        templateParams
    );
}


async function sendConfirmationEmails() {

    await sendEmailTo(
        MY_EMAIL,
        "Velan",
        "VELAN"
    );

    await wait(1200);

    await sendEmailTo(
        HER_EMAIL,
        "Appi",
        "APPI"
    );
}


/* =========================================================
   CONFIRMATION MODAL
========================================================= */

const confirmationModal =
    $("confirmationModal");

const modalTitle =
    $("modalTitle");

const modalMessage =
    $("modalMessage");

const modalEyebrow =
    $("modalEyebrow");

const brewProgress =
    $("brewProgress");

const modalClose =
    $("modalClose");


function openConfirmationModal() {

    if (!confirmationModal) {
        return;
    }

    confirmationModal.classList.add(
        "show"
    );

    confirmationModal.setAttribute(
        "aria-hidden",
        "false"
    );

    document.body.classList.add(
        "modal-open"
    );
}


function closeConfirmationModal() {

    if (!confirmationModal) {
        return;
    }

    confirmationModal.classList.remove(
        "show"
    );

    confirmationModal.setAttribute(
        "aria-hidden",
        "true"
    );

    document.body.classList.remove(
        "modal-open"
    );
}


/* =========================================================
   BREW STEPS
========================================================= */

function setBrewStep(
    index,
    state = "reset"
) {

    const step =
        $(`brewStep${index}`);

    if (!step) {
        return;
    }

    step.classList.remove(
        "active",
        "done"
    );

    if (
        state === "active" ||
        state === "done"
    ) {

        step.classList.add(
            state
        );

    }
}


async function playConfirmationSequence() {

    openConfirmationModal();


    if (modalClose) {

        modalClose.hidden =
            true;

    }


    if (brewProgress) {

        brewProgress.style.width =
            "5%";

    }


    [1,2,3,4].forEach(
        index =>
            setBrewStep(
                index,
                "reset"
            )
    );


    if (modalEyebrow) {

        modalEyebrow.textContent =
            "PROCESSING";

    }


    if (modalTitle) {

        modalTitle.textContent =
            "Preparing your coffee plan...";

    }


    if (modalMessage) {

        modalMessage.textContent =
            "Just a moment. I'm making sure everything is in place.";

    }


    setBrewStep(
        1,
        "active"
    );


    if (brewProgress) {

        brewProgress.style.width =
            "25%";

    }


    await wait(800);


    setBrewStep(
        1,
        "done"
    );


    if (modalTitle) {

        modalTitle.textContent =
            "Checking the details...";

    }


    if (modalMessage) {

        modalMessage.textContent =
            "Date, time and place are looking good.";

    }


    setBrewStep(
        2,
        "active"
    );


    if (brewProgress) {

        brewProgress.style.width =
            "50%";

    }


    await wait(900);


    setBrewStep(
        2,
        "done"
    );


    if (modalTitle) {

        modalTitle.textContent =
            "One final check...";

    }


    if (modalMessage) {

        modalMessage.textContent =
            "Making sure Appi still can't escape the coffee plan.";

    }


    setBrewStep(
        3,
        "active"
    );


    if (brewProgress) {

        brewProgress.style.width =
            "75%";

    }


    await wait(1000);


    setBrewStep(
        3,
        "done"
    );


    if (modalEyebrow) {

        modalEyebrow.textContent =
            "READY";

    }


    if (modalTitle) {

        modalTitle.textContent =
            "Everything looks good.";

    }


    if (modalMessage) {

        modalMessage.textContent =
            "Your coffee plan is ready to be made official.";

    }


    setBrewStep(
        4,
        "active"
    );


    if (brewProgress) {

        brewProgress.style.width =
            "100%";

    }


    await wait(700);


    setBrewStep(
        4,
        "done"
    );


    if (modalClose) {

        modalClose.hidden =
            false;

    }
}


/* =========================================================
   CONFIRM
========================================================= */

$("confirmButton")
    ?.addEventListener(
        "click",
        async () => {

            if (
                confirmationInProgress
            ) {
                return;
            }


            if (
                !datePlan.date ||
                !datePlan.time ||
                !datePlan.place ||
                !datePlan.drink ||
                !datePlan.vibe
            ) {

                showToast(
                    "Please complete all the details."
                );

                return;
            }


            confirmationInProgress =
                true;


            const button =
                $("confirmButton");

            const status =
                $("emailStatus");


            if (button) {

                button.disabled =
                    true;

                button.innerHTML =
                    `PROCESSING... <span>☕</span>`;

            }


            if (status) {

                status.textContent =
                    "Preparing your coffee plan...";

            }


            try {

                await playConfirmationSequence();


                if (status) {

                    status.textContent =
                        "Sending the confirmation...";

                }


                await sendConfirmationEmails();


                datePlan.confirmed =
                    true;

                datePlan.confirmedAt =
                    new Date()
                        .toISOString();


                savePlan();


                if (status) {

                    status.textContent =
                        "";

                }


                closeConfirmationModal();


                createCelebration();


                confirmationInProgress =
                    false;


                goTo(
                    "success"
                );


            } catch (error) {

                console.error(
                    "EMAIL ERROR:",
                    error
                );


                confirmationInProgress =
                    false;


                if (button) {

                    button.disabled =
                        false;

                    button.innerHTML =
                        `MAKE IT OFFICIAL <span>→</span>`;

                }


                if (status) {

                    status.textContent =
                        "The confirmation email could not be sent. Please try again.";

                }


                closeConfirmationModal();


                showToast(
                    "Something went wrong. Please try again."
                );

            }

        }
    );


/* =========================================================
   MODAL CLOSE
========================================================= */

modalClose?.addEventListener(
    "click",
    closeConfirmationModal
);


/* =========================================================
   SUCCESS
========================================================= */

function updateSuccessScreen() {

    if ($("successDate")) {

        $("successDate").textContent =
            formatDate(
                datePlan.date
            );

    }


    if ($("successTime")) {

        $("successTime").textContent =
            formatTime(
                datePlan.time
            );

    }


    if ($("successPlace")) {

        $("successPlace").textContent =
            datePlan.place;

    }


    if ($("successDrink")) {

        $("successDrink").textContent =
            datePlan.drink;

    }
}


/* =========================================================
   COUNTDOWN
========================================================= */

function startCountdown() {

    clearInterval(
        countdownTimer
    );


    if (
        !datePlan.date ||
        !datePlan.time
    ) {

        return;

    }


    const target =
        new Date(
            `${datePlan.date}T${datePlan.time}:00`
        );


    function update() {

        const difference =
            target.getTime() -
            Date.now();


        if (difference <= 0) {

            if ($("days")) {

                $("days").textContent =
                    "00";

            }

            if ($("hours")) {

                $("hours").textContent =
                    "00";

            }

            if ($("minutes")) {

                $("minutes").textContent =
                    "00";

            }

            clearInterval(
                countdownTimer
            );

            return;

        }


        const totalMinutes =
            Math.floor(
                difference / 60000
            );


        const days =
            Math.floor(
                totalMinutes / 1440
            );


        const hours =
            Math.floor(
                (
                    totalMinutes % 1440
                ) / 60
            );


        const minutes =
            totalMinutes % 60;


        if ($("days")) {

            $("days").textContent =
                String(
                    days
                ).padStart(
                    2,
                    "0"
                );

        }


        if ($("hours")) {

            $("hours").textContent =
                String(
                    hours
                ).padStart(
                    2,
                    "0"
                );

        }


        if ($("minutes")) {

            $("minutes").textContent =
                String(
                    minutes
                ).padStart(
                    2,
                    "0"
                );

        }

    }


    update();


    countdownTimer =
        setInterval(
            update,
            30000
        );
}


/* =========================================================
   CELEBRATION
========================================================= */

function createCelebration() {

    const symbols = [
        "☕",
        "✦",
        "✧",
        "·"
    ];


    for (
        let i = 0;
        i < 34;
        i++
    ) {

        const particle =
            document.createElement(
                "div"
            );


        particle.className =
            "celebration-particle";


        particle.textContent =
            symbols[
                Math.floor(
                    Math.random() *
                    symbols.length
                )
            ];


        particle.style.left =
            `${Math.random() * 100}%`;


        particle.style.top =
            `${65 + Math.random() * 25}%`;


        particle.style.setProperty(
            "--x",
            `${(
                Math.random() - .5
            ) * 300}px`
        );


        particle.style.setProperty(
            "--y",
            `${-(
                150 +
                Math.random() * 350
            )}px`
        );


        /*
           IMPORTANT:
           CSS uses --rotate.
        */

        particle.style.setProperty(
            "--rotate",
            `${(
                Math.random() * 720
            ) - 360}deg`
        );


        particle.style.setProperty(
            "--random",
            `${Math.random()}`
        );


        particle.style.setProperty(
            "--delay",
            `${Math.random() * .6}s`
        );


        document.body.appendChild(
            particle
        );


        setTimeout(
            () => {

                particle.remove();

            },
            3200
        );

    }


    createCoffeeBurst();

    window.FX?.celebrate();
}


/* =========================================================
   COFFEE BURST
========================================================= */

function createCoffeeBurst() {

    const burst =
        document.createElement(
            "div"
        );


    burst.className =
        "coffee-burst";

    window.FX?.burst();


    burst.innerHTML = `
        <span>☕</span>
        <span>✦</span>
        <span>✧</span>
        <span>·</span>
        <span>✦</span>
        <span>☕</span>
    `;


    document.body.appendChild(
        burst
    );


    setTimeout(
        () => {

            burst.remove();

        },
        1800
    );
}


/* =========================================================
   MINI SPARKLES
========================================================= */

function createMiniSparkles() {

    window.FX?.sparkle();

    for (
        let i = 0;
        i < 7;
        i++
    ) {

        const sparkle =
            document.createElement(
                "span"
            );


        sparkle.className =
            "mini-sparkle";


        sparkle.textContent =
            i % 2 === 0
                ? "✦"
                : "·";


        sparkle.style.left =
            `${45 + (
                Math.random() - .5
            ) * 35}%`;


        sparkle.style.top =
            `${45 + (
                Math.random() - .5
            ) * 20}%`;


        sparkle.style.setProperty(
            "--spark-x",
            `${(
                Math.random() - .5
            ) * 100}px`
        );


        sparkle.style.setProperty(
            "--spark-y",
            `${(
                Math.random() - .5
            ) * 100}px`
        );


        document.body.appendChild(
            sparkle
        );


        setTimeout(
            () => {

                sparkle.remove();

            },
            900
        );

    }
}


/* =========================================================
   NO BUTTON PARTICLES
========================================================= */

function createTinyEscapeParticles(
    x,
    y
) {

    for (
        let i = 0;
        i < 5;
        i++
    ) {

        const particle =
            document.createElement(
                "span"
            );


        particle.className =
            "escape-particle";


        particle.textContent =
            "·";


        particle.style.left =
            `${x}px`;


        particle.style.top =
            `${y}px`;


        particle.style.setProperty(
            "--escape-x",
            `${(
                Math.random() - .5
            ) * 80}px`
        );


        particle.style.setProperty(
            "--escape-y",
            `${(
                Math.random() - .5
            ) * 80}px`
        );


        document.body.appendChild(
            particle
        );


        setTimeout(
            () => {

                particle.remove();

            },
            800
        );

    }
}


/* =========================================================
   SCREEN PARTICLES
========================================================= */

function createScreenParticles(
    screenId
) {

    if (
        window.matchMedia(
            "(prefers-reduced-motion: reduce)"
        ).matches
    ) {

        return;

    }


    if (
        screenId === "intro" ||
        screenId === "success"
    ) {

        return;

    }


    for (
        let i = 0;
        i < 5;
        i++
    ) {

        const particle =
            document.createElement(
                "span"
            );


        particle.className =
            "screen-particle";


        particle.textContent =
            i % 2 === 0
                ? "·"
                : "✦";


        particle.style.left =
            `${10 + Math.random() * 80}%`;


        particle.style.top =
            `${20 + Math.random() * 60}%`;


        particle.style.setProperty(
            "--drift-x",
            `${(
                Math.random() - .5
            ) * 100}px`
        );


        particle.style.setProperty(
            "--drift-y",
            `${(
                Math.random() - .5
            ) * 120}px`
        );


        document.body.appendChild(
            particle
        );


        setTimeout(
            () => {

                particle.remove();

            },
            1500
        );

    }
}


/* =========================================================
   TOAST
========================================================= */

function showToast(
    message
) {

    const toast =
        $("toast");

    if (!toast) {
        return;
    }


    toast.textContent =
        message;


    toast.classList.add(
        "show"
    );


    clearTimeout(
        toastTimer
    );


    toastTimer =
        setTimeout(
            () => {

                toast.classList.remove(
                    "show"
                );

            },
            2600
        );
}


/* =========================================================
   RESET PLAN
========================================================= */

function resetCoffeePlan() {

    datePlan.date =
        "";

    datePlan.time =
        "";

    datePlan.place =
        "";

    datePlan.drink =
        "";

    datePlan.vibe =
        "";

    datePlan.note =
        "";

    datePlan.confirmed =
        false;

    datePlan.confirmedAt =
        null;


    currentScreen =
        screens.indexOf(
            "date"
        );


    screenHistory =
        [];


    noAttempts =
        0;


    /*
       DATE
    */

    if (dateInput) {

        dateInput.value =
            "";

    }


    if (dateButton) {

        dateButton.disabled =
            true;

    }


    /*
       TIME
    */

    if (selectedTimeLabel) {

        selectedTimeLabel.textContent =
            "Choose a time";

    }


    if (timeButton) {

        timeButton.disabled =
            true;

    }


    if (customTimeInput) {

        customTimeInput.value =
            "";

    }


    if (customTimePanel) {

        customTimePanel.hidden =
            true;

    }


    if (customTimeToggle) {

        customTimeToggle.classList.remove(
            "open"
        );

    }


    timeOptions.forEach(
        button => {

            button.classList.remove(
                "selected"
            );

        }
    );


    /*
       PLACE
    */

    document
        .querySelectorAll(
            ".place-option"
        )
        .forEach(
            button => {

                button.classList.remove(
                    "selected"
                );

            }
        );


    /*
       DRINK
    */

    document
        .querySelectorAll(
            ".choice-card"
        )
        .forEach(
            button => {

                button.classList.remove(
                    "selected"
                );

            }
        );


    if (drinkButton) {

        drinkButton.disabled =
            true;

    }


    /*
       VIBE
    */

    document
        .querySelectorAll(
            ".choice-row"
        )
        .forEach(
            button => {

                button.classList.remove(
                    "selected"
                );

            }
        );


    if (vibeButton) {

        vibeButton.disabled =
            true;

    }


    /*
       NOTE
    */

    if (noteInput) {

        noteInput.value =
            "";

    }


    if (noteCount) {

        noteCount.textContent =
            "0 / 240";

    }


    /*
       NO BUTTON
    */

    if (noButton) {

        noButton.style.position =
            "";

        noButton.style.left =
            "";

        noButton.style.top =
            "";

    }


    if (noHint) {

        noHint.textContent =
            "You can still say no... technically.";

    }


    /*
       Save clean state.
    */

    savePlan();
}


/* =========================================================
   PLAN ANOTHER COFFEE
========================================================= */

const anotherCoffeeButton =
    $("anotherCoffeeButton");


anotherCoffeeButton
    ?.addEventListener(
        "click",
        async () => {

            if (
                anotherCoffeeButton.disabled
            ) {

                return;

            }


            anotherCoffeeButton.disabled =
                true;


            anotherCoffeeButton.innerHTML =
                `<span>☕</span>
                 BREWING ANOTHER PLAN...`;


            showToast(
                "Already planning another one? I like your thinking."
            );


            await wait(1300);


            resetCoffeePlan();


            anotherCoffeeButton.disabled =
                false;


            anotherCoffeeButton.innerHTML =
                `<span>☕</span>
                 PLAN ANOTHER COFFEE
                 <span>→</span>`;


            createCoffeeBurst();


            await wait(250);


            goTo(
                "date",
                {
                    back: true
                }
            );

        }
    );


/* =========================================================
   BUTTON RIPPLE
========================================================= */

document.addEventListener(
    "click",
    event => {

        const button =
            event.target.closest(
                "button"
            );

        if (!button) {
            return;
        }


        /*
           Ignore moving NO button.
        */

        if (
            button.id ===
            "noButton"
        ) {
            return;
        }


        const rect =
            button.getBoundingClientRect();


        const ripple =
            document.createElement(
                "span"
            );


        ripple.className =
            "button-ripple";


        ripple.style.left =
            `${event.clientX - rect.left}px`;


        ripple.style.top =
            `${event.clientY - rect.top}px`;


        button.appendChild(
            ripple
        );


        setTimeout(
            () => {

                ripple.remove();

            },
            650
        );

    }
);


/* =========================================================
   MOUSE PARALLAX
========================================================= */

let mouseFrame =
    null;


document.addEventListener(
    "pointermove",
    event => {

        if (
            window.matchMedia(
                "(pointer: coarse)"
            ).matches
        ) {

            return;

        }


        const x =
            event.clientX /
            window.innerWidth -
            .5;


        const y =
            event.clientY /
            window.innerHeight -
            .5;


        const mouseX =
            x * 10;


        const mouseY =
            y * 10;


        if (mouseFrame) {

            cancelAnimationFrame(
                mouseFrame
            );

        }


        mouseFrame =
            requestAnimationFrame(
                () => {

                    document.documentElement
                        .style
                        .setProperty(
                            "--mouse-x",
                            `${mouseX}px`
                        );


                    document.documentElement
                        .style
                        .setProperty(
                            "--mouse-y",
                            `${mouseY}px`
                        );

                }
            );

    }
);


/* =========================================================
   KEYBOARD
========================================================= */

document.addEventListener(
    "keydown",
    event => {

        /*
           Escape closes completed modal.
        */

        if (
            event.key === "Escape" &&
            confirmationModal?.classList.contains(
                "show"
            )
        ) {

            if (
                modalClose &&
                !modalClose.hidden
            ) {

                closeConfirmationModal();

            }

            return;

        }


        /*
           Backspace = back.
        */

        if (
            event.key === "Backspace" &&
            ![
                "INPUT",
                "TEXTAREA"
            ].includes(
                document.activeElement?.tagName
            )
        ) {

            goBack();

        }

    }
);


/* =========================================================
   VISIBILITY
========================================================= */

document.addEventListener(
    "visibilitychange",
    () => {

        if (
            !document.hidden &&
            datePlan.confirmed
        ) {

            updateSuccessScreen();

            startCountdown();

        }

    }
);


/* =========================================================
   RESTORE UI
========================================================= */

function restoreUI() {

    /*
       Date
    */

    if (
        dateInput &&
        datePlan.date
    ) {

        dateInput.value =
            datePlan.date;

        if (dateButton) {

            dateButton.disabled =
                false;

        }

    }


    /*
       Time
    */

    if (datePlan.time) {

        if (selectedTimeLabel) {

            selectedTimeLabel.textContent =
                formatTime(
                    datePlan.time
                );

        }


        if (timeButton) {

            timeButton.disabled =
                false;

        }


        timeOptions.forEach(
            button => {

                button.classList.toggle(
                    "selected",
                    button.dataset.time ===
                    datePlan.time
                );

            }
        );

    }


    /*
       Place
    */

    document
        .querySelectorAll(
            ".place-option"
        )
        .forEach(
            button => {

                button.classList.toggle(
                    "selected",
                    button.dataset.place ===
                    datePlan.place
                );

            }
        );


    /*
       Drink
    */

    document
        .querySelectorAll(
            ".choice-card"
        )
        .forEach(
            button => {

                button.classList.toggle(
                    "selected",
                    button.dataset.drink ===
                    datePlan.drink
                );

            }
        );


    /*
       Vibe
    */

    document
        .querySelectorAll(
            ".choice-row"
        )
        .forEach(
            button => {

                button.classList.toggle(
                    "selected",
                    button.dataset.vibe ===
                    datePlan.vibe
                );

            }
        );


    if (drinkButton) {

        drinkButton.disabled =
            !datePlan.drink;

    }


    if (vibeButton) {

        vibeButton.disabled =
            !datePlan.vibe;

    }


    /*
       Note
    */

    if (noteInput) {

        noteInput.value =
            datePlan.note || "";

    }


    if (noteCount) {

        noteCount.textContent =
            `${(
                datePlan.note || ""
            ).length} / 240`;

    }

}


/* =========================================================
   INITIALIZE
========================================================= */

loadPlan();

restoreUI();

refreshBackButtons();


/*
   Confirmed reservation:
   show success.
*/
if (datePlan.confirmed) {

    goTo("success", {
        restore: true
    });

} else {

    currentScreen = 0;
    screenHistory = [];

    goTo("intro", {
        restore: true
    });

}

/* =========================================================
   CONSOLE
========================================================= */

console.log(
    "%c☕ APPI × VELAN",
    "font-size:24px;font-weight:bold;color:#d8ad78;"
);

console.log(
    "%cPrivate cinematic coffee invitation initialized.",
    "font-size:13px;color:#cdbba7;"
);

console.log(
    "%cMade specifically for Appi.",
    "font-size:11px;color:#888;"
);