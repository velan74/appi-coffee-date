APPI x VELAN - Integrated cafe invitation

Local preview: http://127.0.0.1:5501/
To restart the preview, run: node .local-preview.cjs
You can also open index.html directly, keeping the assets folder beside it.

Styles load in this order: style.css, luxury.css, cafe-theme.css,
scene-theme.css, ambience.css, music.css. Keep all six beside index.html.

The responsive cafe photograph is softly blurred and tinted. Intro content
sits directly on it with cream/gold type and a bright main action. The real
cup photograph rests at the bottom with a soft table plane and contact
shadow. Other screens use smoked glass; the review ticket stays cream.
Custom cursor visuals are hidden. Reduced motion disables animations.
ambience.js adds visual transitions, gentle bokeh/dust and optional parallax.
The loader shares the cafe photograph and comes into focus before revealing
the intro. Screen changes block double taps and preserve the original flow.
Reduced motion uses a simple 0.3-second crossfade and skips ambient movement.

Music uses the supplied assets/fur-elise-piano.mp3 and assets/cafe-ambience.mp3.
Both are fetched and decoded only on the first sound-toggle tap, then loop
through Web Audio GainNodes. They fade in over 2 seconds to 30% piano and
12% ambience; fade out over 1 second. Hidden tabs pause the AudioContext and
resume with a fade if music was on. Reopening the page starts muted.
The intro-only music hint fades after five seconds or the first tap.

The success screen has an Our Song card for the supplied Radhimaa link.
Its privacy-enhanced YouTube iframe is created only after a tap. Background
music fades out while the panel is open; closing removes the iframe and
restores music only if it was previously on. A direct YouTube fallback is
always available. The supplied video reported unavailable in embed testing.
No copyrighted song audio was downloaded or hosted.

The AV monograms, loading sequence, three restrained heart moments,
modern calendar/time pickers and safe No-button movement are preserved.
EmailJS, tracking, saved progress and screen flow are unchanged.
Fonts, EmailJS and existing tracking services require internet access.

Production: https://just-coffee-1712.netlify.app/
The existing Netlify site auto-publishes changes pushed to GitHub main.
See VERIFICATION.txt and previews/scene-*.png for checks and screenshots.
