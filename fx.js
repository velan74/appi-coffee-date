/* =========================================================
   ☕ APPI × VELAN — FX LAYER
   ---------------------------------------------------------
   1. Liquid coffee background (WebGL stable-fluids sim)
   2. Word-by-word title reveals + staggered screen entrances
   3. Liquid cursor, spotlight, magnetic buttons, 3D tilt glass
   4. Preloader pour, brew-cup fill, screen-change choreography

   Public API: window.FX.{ burst, celebrate, sparkle, splat }
   Everything degrades gracefully: no WebGL → CSS aurora only,
   reduced-motion → static, calm page.
========================================================= */

(() => {
    "use strict";

    const FX = (window.FX = window.FX || {});

    const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const finePointer = matchMedia("(hover: hover) and (pointer: fine)").matches;
    const coarse = !finePointer;

    const rand = (a, b) => a + Math.random() * (b - a);
    const pick = arr => arr[Math.floor(Math.random() * arr.length)];
    const lerp = (a, b, t) => a + (b - a) * t;

    /* Coffee palette — milk, crema, caramel, rose-copper, amber */
    const PALETTE = [
        [0.97, 0.89, 0.78],
        [0.91, 0.68, 0.43],
        [0.80, 0.47, 0.24],
        [0.86, 0.52, 0.41],
        [0.72, 0.37, 0.15]
    ];


    /* =====================================================
       1. FLUID SIMULATION
    ====================================================== */

    function createFluid(canvas) {

        const config = {
            SIM_RESOLUTION: coarse ? 96 : 128,
            DYE_RESOLUTION: coarse ? 512 : 1024,
            DENSITY_DISSIPATION: 0.55,
            VELOCITY_DISSIPATION: 0.28,
            PRESSURE: 0.8,
            PRESSURE_ITERATIONS: coarse ? 14 : 20,
            CURL: 22,
            SPLAT_RADIUS: 0.24,
            SPLAT_FORCE: 5200
        };

        const ctxParams = {
            alpha: true,
            depth: false,
            stencil: false,
            antialias: false,
            premultipliedAlpha: false,
            preserveDrawingBuffer: false,
            powerPreference: "high-performance"
        };

        let gl = canvas.getContext("webgl2", ctxParams);
        const isWebGL2 = !!gl;

        if (!gl) {
            gl = canvas.getContext("webgl", ctxParams) ||
                 canvas.getContext("experimental-webgl", ctxParams);
        }

        if (!gl) return null;

        let halfFloat;
        let supportLinearFiltering;

        if (isWebGL2) {
            gl.getExtension("EXT_color_buffer_float");
            gl.getExtension("EXT_color_buffer_half_float");
            supportLinearFiltering = true; // 16F textures are filterable in WebGL2
        } else {
            halfFloat = gl.getExtension("OES_texture_half_float");
            supportLinearFiltering = !!gl.getExtension("OES_texture_half_float_linear");
        }

        const halfFloatTexType = isWebGL2
            ? gl.HALF_FLOAT
            : halfFloat && halfFloat.HALF_FLOAT_OES;

        if (!halfFloatTexType) return null;

        gl.clearColor(0, 0, 0, 0);

        function supportRenderTextureFormat(internalFormat, format, type) {
            const texture = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, 4, 4, 0, format, type, null);

            const fbo = gl.createFramebuffer();
            gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);

            const ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
            gl.deleteFramebuffer(fbo);
            gl.deleteTexture(texture);
            return ok;
        }

        function getSupportedFormat(internalFormat, format, type) {
            if (!supportRenderTextureFormat(internalFormat, format, type)) {
                if (isWebGL2 && internalFormat === gl.R16F) return getSupportedFormat(gl.RG16F, gl.RG, type);
                if (isWebGL2 && internalFormat === gl.RG16F) return getSupportedFormat(gl.RGBA16F, gl.RGBA, type);
                return null;
            }
            return { internalFormat, format };
        }

        let formatRGBA, formatRG, formatR;

        if (isWebGL2) {
            formatRGBA = getSupportedFormat(gl.RGBA16F, gl.RGBA, halfFloatTexType);
            formatRG = getSupportedFormat(gl.RG16F, gl.RG, halfFloatTexType);
            formatR = getSupportedFormat(gl.R16F, gl.RED, halfFloatTexType);
        } else {
            formatRGBA = formatRG = formatR = getSupportedFormat(gl.RGBA, gl.RGBA, halfFloatTexType);
        }

        if (!formatRGBA || !formatRG || !formatR) return null;


        /* ---------- shaders ---------- */

        const baseVertex = `
            precision highp float;
            attribute vec2 aPosition;
            varying vec2 vUv;
            varying vec2 vL;
            varying vec2 vR;
            varying vec2 vT;
            varying vec2 vB;
            uniform vec2 texelSize;
            void main () {
                vUv = aPosition * 0.5 + 0.5;
                vL = vUv - vec2(texelSize.x, 0.0);
                vR = vUv + vec2(texelSize.x, 0.0);
                vT = vUv + vec2(0.0, texelSize.y);
                vB = vUv - vec2(0.0, texelSize.y);
                gl_Position = vec4(aPosition, 0.0, 1.0);
            }`;

        const clearShader = `
            precision mediump float;
            varying highp vec2 vUv;
            uniform sampler2D uTexture;
            uniform float value;
            void main () { gl_FragColor = value * texture2D(uTexture, vUv); }`;

        const splatShader = `
            precision highp float;
            varying vec2 vUv;
            uniform sampler2D uTarget;
            uniform float aspectRatio;
            uniform vec3 color;
            uniform vec2 point;
            uniform float radius;
            void main () {
                vec2 p = vUv - point.xy;
                p.x *= aspectRatio;
                vec3 splat = exp(-dot(p, p) / radius) * color;
                vec3 base = texture2D(uTarget, vUv).xyz;
                gl_FragColor = vec4(base + splat, 1.0);
            }`;

        const advectionShader = `
            precision highp float;
            varying vec2 vUv;
            uniform sampler2D uVelocity;
            uniform sampler2D uSource;
            uniform vec2 texelSize;
            uniform vec2 dyeTexelSize;
            uniform float dt;
            uniform float dissipation;

            vec4 bilerp (sampler2D sam, vec2 uv, vec2 tsize) {
                vec2 st = uv / tsize - 0.5;
                vec2 iuv = floor(st);
                vec2 fuv = fract(st);
                vec4 a = texture2D(sam, (iuv + vec2(0.5, 0.5)) * tsize);
                vec4 b = texture2D(sam, (iuv + vec2(1.5, 0.5)) * tsize);
                vec4 c = texture2D(sam, (iuv + vec2(0.5, 1.5)) * tsize);
                vec4 d = texture2D(sam, (iuv + vec2(1.5, 1.5)) * tsize);
                return mix(mix(a, b, fuv.x), mix(c, d, fuv.x), fuv.y);
            }

            void main () {
            #ifdef MANUAL_FILTERING
                vec2 coord = vUv - dt * bilerp(uVelocity, vUv, texelSize).xy * texelSize;
                vec4 result = bilerp(uSource, coord, dyeTexelSize);
            #else
                vec2 coord = vUv - dt * texture2D(uVelocity, vUv).xy * texelSize;
                vec4 result = texture2D(uSource, coord);
            #endif
                float decay = 1.0 + dissipation * dt;
                gl_FragColor = result / decay;
            }`;

        const divergenceShader = `
            precision mediump float;
            varying highp vec2 vUv;
            varying highp vec2 vL;
            varying highp vec2 vR;
            varying highp vec2 vT;
            varying highp vec2 vB;
            uniform sampler2D uVelocity;
            void main () {
                float L = texture2D(uVelocity, vL).x;
                float R = texture2D(uVelocity, vR).x;
                float T = texture2D(uVelocity, vT).y;
                float B = texture2D(uVelocity, vB).y;
                vec2 C = texture2D(uVelocity, vUv).xy;
                if (vL.x < 0.0) { L = -C.x; }
                if (vR.x > 1.0) { R = -C.x; }
                if (vT.y > 1.0) { T = -C.y; }
                if (vB.y < 0.0) { B = -C.y; }
                float div = 0.5 * (R - L + T - B);
                gl_FragColor = vec4(div, 0.0, 0.0, 1.0);
            }`;

        const curlShader = `
            precision mediump float;
            varying highp vec2 vUv;
            varying highp vec2 vL;
            varying highp vec2 vR;
            varying highp vec2 vT;
            varying highp vec2 vB;
            uniform sampler2D uVelocity;
            void main () {
                float L = texture2D(uVelocity, vL).y;
                float R = texture2D(uVelocity, vR).y;
                float T = texture2D(uVelocity, vT).x;
                float B = texture2D(uVelocity, vB).x;
                float vorticity = R - L - T + B;
                gl_FragColor = vec4(0.5 * vorticity, 0.0, 0.0, 1.0);
            }`;

        const vorticityShader = `
            precision highp float;
            varying vec2 vUv;
            varying vec2 vL;
            varying vec2 vR;
            varying vec2 vT;
            varying vec2 vB;
            uniform sampler2D uVelocity;
            uniform sampler2D uCurl;
            uniform float curl;
            uniform float dt;
            void main () {
                float L = texture2D(uCurl, vL).x;
                float R = texture2D(uCurl, vR).x;
                float T = texture2D(uCurl, vT).x;
                float B = texture2D(uCurl, vB).x;
                float C = texture2D(uCurl, vUv).x;
                vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
                force /= length(force) + 0.0001;
                force *= curl * C;
                force.y *= -1.0;
                vec2 velocity = texture2D(uVelocity, vUv).xy;
                velocity += force * dt;
                velocity = min(max(velocity, -1000.0), 1000.0);
                gl_FragColor = vec4(velocity, 0.0, 1.0);
            }`;

        const pressureShader = `
            precision mediump float;
            varying highp vec2 vUv;
            varying highp vec2 vL;
            varying highp vec2 vR;
            varying highp vec2 vT;
            varying highp vec2 vB;
            uniform sampler2D uPressure;
            uniform sampler2D uDivergence;
            void main () {
                float L = texture2D(uPressure, vL).x;
                float R = texture2D(uPressure, vR).x;
                float T = texture2D(uPressure, vT).x;
                float B = texture2D(uPressure, vB).x;
                float divergence = texture2D(uDivergence, vUv).x;
                float pressure = (L + R + B + T - divergence) * 0.25;
                gl_FragColor = vec4(pressure, 0.0, 0.0, 1.0);
            }`;

        const gradientSubtractShader = `
            precision mediump float;
            varying highp vec2 vUv;
            varying highp vec2 vL;
            varying highp vec2 vR;
            varying highp vec2 vT;
            varying highp vec2 vB;
            uniform sampler2D uPressure;
            uniform sampler2D uVelocity;
            void main () {
                float L = texture2D(uPressure, vL).x;
                float R = texture2D(uPressure, vR).x;
                float T = texture2D(uPressure, vT).x;
                float B = texture2D(uPressure, vB).x;
                vec2 velocity = texture2D(uVelocity, vUv).xy;
                velocity.xy -= vec2(R - L, T - B);
                gl_FragColor = vec4(velocity, 0.0, 1.0);
            }`;

        /* Display: soft tone-mapping + gentle "milk surface" shading */
        const displayShader = `
            precision highp float;
            varying vec2 vUv;
            varying vec2 vL;
            varying vec2 vR;
            varying vec2 vT;
            varying vec2 vB;
            uniform sampler2D uTexture;
            uniform vec2 texelSize;
            uniform float uIntensity;
            void main () {
                vec3 c = texture2D(uTexture, vUv).rgb;

                vec3 lc = texture2D(uTexture, vL).rgb;
                vec3 rc = texture2D(uTexture, vR).rgb;
                vec3 tc = texture2D(uTexture, vT).rgb;
                vec3 bc = texture2D(uTexture, vB).rgb;
                float dx = length(rc) - length(lc);
                float dy = length(tc) - length(bc);
                vec3 n = normalize(vec3(dx, dy, length(texelSize) * 2.2));
                vec3 l = normalize(vec3(-0.35, 0.55, 1.0));
                float diffuse = clamp(dot(n, l) + 0.82, 0.82, 1.06);

                c = 1.0 - exp(-c * 1.35 * uIntensity);
                c *= diffuse;

                float a = smoothstep(0.0, 0.55, max(c.r, max(c.g, c.b)));
                gl_FragColor = vec4(c, a);
            }`;

        function compile(type, source, keywords) {
            if (keywords) {
                source = keywords.map(k => `#define ${k}\n`).join("") + source;
            }
            const shader = gl.createShader(type);
            gl.shaderSource(shader, source);
            gl.compileShader(shader);
            if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
                throw new Error(gl.getShaderInfoLog(shader));
            }
            return shader;
        }

        function makeProgram(vs, fsSource, keywords) {
            const fs = compile(gl.FRAGMENT_SHADER, fsSource, keywords);
            const program = gl.createProgram();
            gl.attachShader(program, vs);
            gl.attachShader(program, fs);
            gl.bindAttribLocation(program, 0, "aPosition");
            gl.linkProgram(program);
            if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
                throw new Error(gl.getProgramInfoLog(program));
            }
            const uniforms = {};
            const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
            for (let i = 0; i < count; i++) {
                const name = gl.getActiveUniform(program, i).name;
                uniforms[name] = gl.getUniformLocation(program, name);
            }
            return {
                uniforms,
                bind() { gl.useProgram(program); }
            };
        }

        let programs;

        try {
            const vs = compile(gl.VERTEX_SHADER, baseVertex);
            programs = {
                clear: makeProgram(vs, clearShader),
                splat: makeProgram(vs, splatShader),
                advection: makeProgram(vs, advectionShader, supportLinearFiltering ? null : ["MANUAL_FILTERING"]),
                divergence: makeProgram(vs, divergenceShader),
                curl: makeProgram(vs, curlShader),
                vorticity: makeProgram(vs, vorticityShader),
                pressure: makeProgram(vs, pressureShader),
                gradient: makeProgram(vs, gradientSubtractShader),
                display: makeProgram(vs, displayShader)
            };
        } catch (error) {
            console.warn("Fluid: shader setup failed, using CSS fallback.", error);
            return null;
        }


        /* ---------- geometry ---------- */

        gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]), gl.STATIC_DRAW);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 1, 2, 0, 2, 3]), gl.STATIC_DRAW);
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(0);

        function blit(target) {
            if (target == null) {
                gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
                gl.bindFramebuffer(gl.FRAMEBUFFER, null);
            } else {
                gl.viewport(0, 0, target.width, target.height);
                gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo);
            }
            gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
        }


        /* ---------- framebuffers ---------- */

        function createFBO(w, h, internalFormat, format, type, param) {
            gl.activeTexture(gl.TEXTURE0);
            const texture = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, param);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, param);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, w, h, 0, format, type, null);

            const fbo = gl.createFramebuffer();
            gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
            gl.viewport(0, 0, w, h);
            gl.clear(gl.COLOR_BUFFER_BIT);

            return {
                texture, fbo,
                width: w, height: h,
                texelSizeX: 1 / w, texelSizeY: 1 / h,
                attach(id) {
                    gl.activeTexture(gl.TEXTURE0 + id);
                    gl.bindTexture(gl.TEXTURE_2D, texture);
                    return id;
                }
            };
        }

        function createDoubleFBO(w, h, internalFormat, format, type, param) {
            let fbo1 = createFBO(w, h, internalFormat, format, type, param);
            let fbo2 = createFBO(w, h, internalFormat, format, type, param);
            return {
                width: w, height: h,
                texelSizeX: fbo1.texelSizeX, texelSizeY: fbo1.texelSizeY,
                get read() { return fbo1; },
                get write() { return fbo2; },
                swap() { const t = fbo1; fbo1 = fbo2; fbo2 = t; }
            };
        }

        function getResolution(resolution) {
            let aspect = gl.drawingBufferWidth / gl.drawingBufferHeight;
            if (aspect < 1) aspect = 1 / aspect;
            const min = Math.round(resolution);
            const max = Math.round(resolution * aspect);
            return gl.drawingBufferWidth > gl.drawingBufferHeight
                ? { width: max, height: min }
                : { width: min, height: max };
        }

        let dye, velocity, divergence, curl, pressure;

        function initFramebuffers() {
            const simRes = getResolution(config.SIM_RESOLUTION);
            const dyeRes = getResolution(config.DYE_RESOLUTION);
            const texType = halfFloatTexType;
            const filtering = supportLinearFiltering ? gl.LINEAR : gl.NEAREST;

            gl.disable(gl.BLEND);

            dye = createDoubleFBO(dyeRes.width, dyeRes.height, formatRGBA.internalFormat, formatRGBA.format, texType, filtering);
            velocity = createDoubleFBO(simRes.width, simRes.height, formatRG.internalFormat, formatRG.format, texType, filtering);
            divergence = createFBO(simRes.width, simRes.height, formatR.internalFormat, formatR.format, texType, gl.NEAREST);
            curl = createFBO(simRes.width, simRes.height, formatR.internalFormat, formatR.format, texType, gl.NEAREST);
            pressure = createDoubleFBO(simRes.width, simRes.height, formatR.internalFormat, formatR.format, texType, gl.NEAREST);
        }


        /* ---------- sizing ---------- */

        const dpr = Math.min(window.devicePixelRatio || 1, coarse ? 1.25 : 1.5);
        let lastWidth = 0;

        function resizeCanvas() {
            const w = Math.floor(window.innerWidth * dpr);
            const h = Math.floor(window.innerHeight * dpr);
            if (canvas.width !== w || canvas.height !== h) {
                canvas.width = w;
                canvas.height = h;
                return true;
            }
            return false;
        }

        resizeCanvas();
        initFramebuffers();
        lastWidth = window.innerWidth;

        let resizeTimer;
        window.addEventListener("resize", () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                resizeCanvas();
                /* Re-create buffers only on real width changes
                   (mobile URL-bar show/hide shouldn't wipe the coffee). */
                if (Math.abs(window.innerWidth - lastWidth) > 40) {
                    lastWidth = window.innerWidth;
                    initFramebuffers();
                }
            }, 180);
        });


        /* ---------- simulation step ---------- */

        let intensity = 1;

        function step(dt) {
            gl.disable(gl.BLEND);

            const p = programs;

            p.curl.bind();
            gl.uniform2f(p.curl.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
            gl.uniform1i(p.curl.uniforms.uVelocity, velocity.read.attach(0));
            blit(curl);

            p.vorticity.bind();
            gl.uniform2f(p.vorticity.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
            gl.uniform1i(p.vorticity.uniforms.uVelocity, velocity.read.attach(0));
            gl.uniform1i(p.vorticity.uniforms.uCurl, curl.attach(1));
            gl.uniform1f(p.vorticity.uniforms.curl, config.CURL);
            gl.uniform1f(p.vorticity.uniforms.dt, dt);
            blit(velocity.write);
            velocity.swap();

            p.divergence.bind();
            gl.uniform2f(p.divergence.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
            gl.uniform1i(p.divergence.uniforms.uVelocity, velocity.read.attach(0));
            blit(divergence);

            p.clear.bind();
            gl.uniform1i(p.clear.uniforms.uTexture, pressure.read.attach(0));
            gl.uniform1f(p.clear.uniforms.value, config.PRESSURE);
            blit(pressure.write);
            pressure.swap();

            p.pressure.bind();
            gl.uniform2f(p.pressure.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
            gl.uniform1i(p.pressure.uniforms.uDivergence, divergence.attach(0));
            for (let i = 0; i < config.PRESSURE_ITERATIONS; i++) {
                gl.uniform1i(p.pressure.uniforms.uPressure, pressure.read.attach(1));
                blit(pressure.write);
                pressure.swap();
            }

            p.gradient.bind();
            gl.uniform2f(p.gradient.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
            gl.uniform1i(p.gradient.uniforms.uPressure, pressure.read.attach(0));
            gl.uniform1i(p.gradient.uniforms.uVelocity, velocity.read.attach(1));
            blit(velocity.write);
            velocity.swap();

            p.advection.bind();
            gl.uniform2f(p.advection.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
            if (!supportLinearFiltering) {
                gl.uniform2f(p.advection.uniforms.dyeTexelSize, velocity.texelSizeX, velocity.texelSizeY);
            }
            const velocityId = velocity.read.attach(0);
            gl.uniform1i(p.advection.uniforms.uVelocity, velocityId);
            gl.uniform1i(p.advection.uniforms.uSource, velocityId);
            gl.uniform1f(p.advection.uniforms.dt, dt);
            gl.uniform1f(p.advection.uniforms.dissipation, config.VELOCITY_DISSIPATION);
            blit(velocity.write);
            velocity.swap();

            if (!supportLinearFiltering) {
                gl.uniform2f(p.advection.uniforms.dyeTexelSize, dye.texelSizeX, dye.texelSizeY);
            }
            gl.uniform1i(p.advection.uniforms.uVelocity, velocity.read.attach(0));
            gl.uniform1i(p.advection.uniforms.uSource, dye.read.attach(1));
            gl.uniform1f(p.advection.uniforms.dissipation, config.DENSITY_DISSIPATION);
            blit(dye.write);
            dye.swap();
        }

        function render() {
            gl.disable(gl.BLEND);
            const p = programs.display;
            p.bind();
            gl.uniform2f(p.uniforms.texelSize, 1 / dye.width, 1 / dye.height);
            gl.uniform1i(p.uniforms.uTexture, dye.read.attach(0));
            gl.uniform1f(p.uniforms.uIntensity, intensity);
            blit(null);
        }


        /* ---------- splats ---------- */

        function correctRadius(radius) {
            const aspect = canvas.width / canvas.height;
            if (aspect > 1) radius *= aspect;
            return radius;
        }

        /* x, y in 0..1 (y = 0 at the top, like the DOM) */
        function splat(x, y, dx, dy, color, radiusScale = 1) {
            const p = programs.splat;
            p.bind();
            gl.uniform1i(p.uniforms.uTarget, velocity.read.attach(0));
            gl.uniform1f(p.uniforms.aspectRatio, canvas.width / canvas.height);
            gl.uniform2f(p.uniforms.point, x, 1 - y);
            gl.uniform3f(p.uniforms.color, dx, -dy, 0);
            gl.uniform1f(p.uniforms.radius, correctRadius((config.SPLAT_RADIUS * radiusScale) / 100));
            blit(velocity.write);
            velocity.swap();

            gl.uniform1i(p.uniforms.uTarget, dye.read.attach(0));
            gl.uniform3f(p.uniforms.color, color[0], color[1], color[2]);
            blit(dye.write);
            dye.swap();
        }

        function tint(color, k) {
            return [color[0] * k, color[1] * k, color[2] * k];
        }


        /* ---------- pointer stirring ---------- */

        const pointer = { x: 0.5, y: 0.5, px: 0.5, py: 0.5, moved: false, color: pick(PALETTE) };

        setInterval(() => { pointer.color = pick(PALETTE); }, 1400);

        function onMove(clientX, clientY) {
            pointer.px = pointer.x;
            pointer.py = pointer.y;
            pointer.x = clientX / window.innerWidth;
            pointer.y = clientY / window.innerHeight;
            pointer.moved = true;
        }

        window.addEventListener("pointermove", e => onMove(e.clientX, e.clientY), { passive: true });

        window.addEventListener("pointerdown", e => {
            pointer.x = pointer.px = e.clientX / window.innerWidth;
            pointer.y = pointer.py = e.clientY / window.innerHeight;
            if (e.pointerType !== "mouse") {
                const a = rand(0, Math.PI * 2);
                splat(pointer.x, pointer.y, Math.cos(a) * 420, Math.sin(a) * 420, tint(pick(PALETTE), 0.32), 1.4);
            }
        }, { passive: true });


        /* ---------- ambient life (keeps stirring when idle) ---------- */

        let lastInteraction = performance.now();
        let nextAmbient = performance.now() + 600;

        window.addEventListener("pointermove", () => { lastInteraction = performance.now(); }, { passive: true });

        function ambient(now) {
            if (now < nextAmbient) return;
            const idle = now - lastInteraction > 2500;
            nextAmbient = now + (idle ? rand(900, 1700) : rand(2200, 3600));

            /* Spawn from the edges, drift inward — like milk poured at the rim */
            const side = Math.floor(rand(0, 4));
            let x, y;
            if (side === 0) { x = rand(0, 1); y = rand(0.88, 1.02); }
            else if (side === 1) { x = rand(-0.02, 0.12); y = rand(0.2, 1); }
            else if (side === 2) { x = rand(0.88, 1.02); y = rand(0.2, 1); }
            else { x = rand(0, 1); y = rand(-0.02, 0.1); }

            const angle = Math.atan2(0.5 - y, 0.5 - x) + rand(-0.9, 0.9);
            const force = rand(260, 620);

            splat(x, y, Math.cos(angle) * force, Math.sin(angle) * force, tint(pick(PALETTE), rand(0.16, 0.28)), rand(1.2, 2.2));
        }


        /* ---------- loop ---------- */

        let lastTime = performance.now();
        let running = true;

        function frame(now) {
            if (!running) return;

            const dt = Math.min((now - lastTime) / 1000, 0.016666);
            lastTime = now;

            if (pointer.moved) {
                pointer.moved = false;
                let dx = pointer.x - pointer.px;
                let dy = pointer.y - pointer.py;
                const aspect = canvas.width / canvas.height;
                if (aspect < 1) dx *= aspect;
                if (aspect > 1) dy /= aspect;
                if (Math.abs(dx) + Math.abs(dy) > 0.0001) {
                    splat(pointer.x, pointer.y, dx * config.SPLAT_FORCE, dy * config.SPLAT_FORCE, tint(pointer.color, 0.13));
                }
            }

            ambient(now);
            step(dt);
            render();
            requestAnimationFrame(frame);
        }

        document.addEventListener("visibilitychange", () => {
            if (document.hidden) {
                running = false;
            } else if (!running) {
                running = true;
                lastTime = performance.now();
                requestAnimationFrame(frame);
            }
        });

        requestAnimationFrame(frame);


        /* ---------- choreography helpers ---------- */

        return {
            splat,
            tint,

            /* Radial bloom from a point (default: centre) */
            bloom(x = 0.5, y = 0.45, count = 8, strength = 0.32, force = 900) {
                for (let i = 0; i < count; i++) {
                    const a = (i / count) * Math.PI * 2 + rand(-0.2, 0.2);
                    splat(x, y, Math.cos(a) * force, Math.sin(a) * force, tint(pick(PALETTE), strength), 1.1);
                }
            },

            /* A soft pour that sweeps across the screen on navigation */
            sweep(back = false) {
                const n = 5;
                for (let i = 0; i < n; i++) {
                    setTimeout(() => {
                        const t = (i + 0.5) / n;
                        const x = back ? 1 - t : t;
                        splat(x, rand(0.78, 0.95), (back ? -1 : 1) * rand(380, 620), -rand(260, 520), tint(pick(PALETTE), 0.2), 1.6);
                    }, i * 70);
                }
            },

            setIntensity(v) { intensity = v; }
        };
    }


    /* =====================================================
       2. TEXT SPLITTING + STAGGER
    ====================================================== */

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

    let fluid = null;

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

        if (!initial && fluid && !reduceMotion) {
            fluid.sweep(back);
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
            if (fluid && !reduceMotion) {
                setTimeout(() => fluid.bloom(0.5, 0.42, 10, 0.26, 700), 120);
            }
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

    let lastPoint = { x: 0.5, y: 0.5 };

    window.addEventListener("pointerdown", e => {
        lastPoint = { x: e.clientX / innerWidth, y: e.clientY / innerHeight };
    }, { passive: true });

    FX.burst = () => {
        if (!fluid || reduceMotion) return;
        fluid.bloom(lastPoint.x, lastPoint.y, 9, 0.3, 1000);
    };

    FX.sparkle = () => {
        if (!fluid || reduceMotion) return;
        fluid.bloom(lastPoint.x, lastPoint.y, 5, 0.18, 520);
    };

    FX.celebrate = () => {
        if (!fluid || reduceMotion) return;
        fluid.bloom(0.5, 0.4, 14, 0.42, 1500);
        setTimeout(() => fluid.bloom(0.22, 0.62, 9, 0.32, 1100), 260);
        setTimeout(() => fluid.bloom(0.78, 0.58, 9, 0.32, 1100), 480);
        setTimeout(() => fluid.bloom(0.5, 0.82, 10, 0.28, 1200), 760);
    };

    FX.splat = (...args) => fluid?.splat(...args);


    /* =====================================================
       INIT
    ====================================================== */

    function init() {
        document
            .querySelectorAll(".hero-title, .section-title, .success-title")
            .forEach(splitWords);

        document.querySelectorAll(".screen").forEach(indexChildren);

        const canvas = document.getElementById("fluid");

        if (canvas && !reduceMotion) {
            try {
                fluid = createFluid(canvas);
            } catch (error) {
                console.warn("Fluid unavailable:", error);
                fluid = null;
            }
        }

        document.body.classList.add(fluid ? "has-fluid" : "no-fluid");

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
