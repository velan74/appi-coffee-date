/* ==========================================
   ☕ APPI INVITATION TRACKING
   Tracks when Appi clicks:
   "OPEN YOUR INVITATION"
   
   Sends tracking information through EmailJS
========================================== */

(function () {

    const openButton =
        document.getElementById("openButton");

    if (!openButton) {
        console.warn(
            "Tracking: openButton not found."
        );
        return;
    }


    /* ==========================================
       EMAILJS SETTINGS
    ========================================== */

    const SERVICE_ID =
        "service_z94wkkg";

    const TRACKING_TEMPLATE_ID =
        "template_oy8hr2e";

    const MY_EMAIL =
        "velanvels1125@gmail.com";


    /* ==========================================
       TRACK CLICK
    ========================================== */

    openButton.addEventListener(
        "click",
        function () {

            const now =
                new Date();


            /* DATE */

            const date =
                now.toLocaleDateString(
                    "en-IN",
                    {
                        day: "numeric",
                        month: "long",
                        year: "numeric"
                    }
                );


            /* TIME */

            const time =
                now.toLocaleTimeString(
                    "en-IN",
                    {
                        hour: "numeric",
                        minute: "2-digit",
                        second: "2-digit",
                        hour12: true
                    }
                );


            /* BROWSER */

            const browser =
                getBrowserName();


            /* DEVICE */

            const device =
                getDeviceName();


            console.log(
                "☕ Appi clicked OPEN YOUR INVITATION"
            );

            console.log(
                "Date:",
                date
            );

            console.log(
                "Time:",
                time
            );

            console.log(
                "Browser:",
                browser
            );

            console.log(
                "Device:",
                device
            );


            /* ==========================================
               EMAILJS DATA
            ========================================== */

            const templateParams = {

                to_email:
                    MY_EMAIL,

                recipient_name:
                    "Velan",

                event:
                    "Appi clicked OPEN YOUR INVITATION",

                date:
                    date,

                time:
                    time,

                browser:
                    browser,

                device:
                    device,

                user_agent:
                    navigator.userAgent,

                message:
                    `Appi opened the invitation on ${date} at ${time} using ${browser} on ${device}.`

            };


            /* ==========================================
               SEND EMAIL
            ========================================== */

            if (
                typeof emailjs ===
                "undefined"
            ) {

                console.warn(
                    "Tracking: EmailJS is not loaded."
                );

                return;
            }


            emailjs.send(
                SERVICE_ID,
                TRACKING_TEMPLATE_ID,
                templateParams
            )
            .then(
                function (response) {

                    console.log(
                        "✓ Invitation tracking email sent.",
                        response.status,
                        response.text
                    );

                }
            )
            .catch(
                function (error) {

                    console.warn(
                        "Tracking email failed:",
                        error
                    );

                }
            );

        }
    );


    /* ==========================================
       BROWSER DETECTION
    ========================================== */

    function getBrowserName() {

        const userAgent =
            navigator.userAgent;


        if (
            userAgent.includes("Edg")
        ) {

            return "Microsoft Edge";

        }


        if (
            userAgent.includes("OPR")
        ) {

            return "Opera";

        }


        if (
            userAgent.includes("Chrome")
        ) {

            return "Google Chrome";

        }


        if (
            userAgent.includes("Firefox")
        ) {

            return "Mozilla Firefox";

        }


        if (
            userAgent.includes("Safari") &&
            !userAgent.includes("Chrome")
        ) {

            return "Safari";

        }


        return "Unknown Browser";
    }


    /* ==========================================
       DEVICE DETECTION
    ========================================== */

    function getDeviceName() {

        const userAgent =
            navigator.userAgent;


        if (
            /Android/i.test(userAgent)
        ) {

            return "Android";

        }


        if (
            /iPhone/i.test(userAgent)
        ) {

            return "iPhone";

        }


        if (
            /iPad/i.test(userAgent)
        ) {

            return "iPad";

        }


        if (
            /Windows/i.test(userAgent)
        ) {

            return "Windows PC";

        }


        if (
            /Macintosh/i.test(userAgent)
        ) {

            return "Mac";

        }


        if (
            /Linux/i.test(userAgent)
        ) {

            return "Linux";

        }


        return "Unknown Device";
    }

})();