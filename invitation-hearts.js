/* Hearts appear only in intro steam, on Yes, and briefly on success. */
(() => {
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    const outline = `<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 27C12 23 4 18 4 11C4 4 13 3 16 9C19 3 28 4 28 11C28 18 20 23 16 27Z"/></svg>`;
    const scene = document.querySelector('.hero-coffee-scene');
    if (scene) {
        const steam = document.createElement('div');
        steam.className = 'steam-hearts'; steam.setAttribute('aria-hidden', 'true');
        steam.innerHTML = `<span>${outline}</span><span>${outline}</span>`;
        scene.appendChild(steam);
    }
    const clear = () => document.querySelectorAll('.heart-bubble-layer').forEach(layer => layer.remove());
    const rise = (kind, rect) => {
        if (motion.matches) return;
        const layer = document.createElement('div');
        layer.className = `heart-bubble-layer heart-${kind}`;
        layer.setAttribute('aria-hidden', 'true');
        const count = kind === 'yes' ? 6 : 9;
        for (let i = 0; i < count; i++) {
            const heart = document.createElement('span');
            heart.className = 'heart-bubble'; heart.innerHTML = outline;
            const size = kind === 'yes' ? 12 + Math.random() * 7 : 13 + Math.random() * 10;
            heart.style.cssText = `--size:${size}px;--drift:${(Math.random()-.5)*42}px;--rise:${kind === 'yes' ? -85-Math.random()*45 : -160-Math.random()*100}px;--delay:${kind === 'yes' ? i*.055 : i*.15}s;--life:${kind === 'yes' ? 1.6 : 3.5}s;left:${kind === 'yes' ? rect.left+rect.width*(.18+i*.12)+'px' : 10+Math.random()*80+'%'};top:${kind === 'yes' ? rect.top+rect.height*.45+'px' : 'calc(100% - 15px)'};`;
            layer.appendChild(heart);
        }
        document.body.appendChild(layer);
        setTimeout(() => layer.remove(), kind === 'yes' ? 2100 : 4900);
    };
    document.getElementById('yesButton')?.addEventListener('click', event => {
        rise('yes', event.currentTarget.getBoundingClientRect());
    }, { capture: true });
    document.addEventListener('screenchange', event => {
        // Let the Yes burst finish during the transition to date.
        if (event.detail.id !== 'date') clear();
        if (event.detail.id === 'success') rise('success');
    });
    motion.addEventListener?.('change', () => { if (motion.matches) clear(); });
    if (document.querySelector('#success.active')) rise('success');
})();
