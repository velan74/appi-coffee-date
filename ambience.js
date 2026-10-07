/* Presentation only: navigation, saved progress and EmailJS stay in script.js. */
(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    let locked = false, unlockTimer;
    const prepare = screen => {
        const children = [...screen.querySelector('.screen-inner')?.children || []].sort((a,b)=>Number(getComputedStyle(a).order)-Number(getComputedStyle(b).order));
        const ranked = [...children].sort((a,b) => Number(!!a.matches('button,.question-buttons,.note-actions,.another-coffee-section')) - Number(!!b.matches('button,.question-buttons,.note-actions,.another-coffee-section')));
        ranked.forEach((child,i) => child.style.setProperty('--arrive', Math.min(.52,i*.065)+'s'));
        children.forEach((child,i) => child.style.setProperty('--depart', Math.min(.18,(children.length-i-1)*.03)+'s'));
    };
    document.querySelectorAll('.screen').forEach(prepare);
    const mist = document.createElement('div'); mist.className='transition-mist'; mist.setAttribute('aria-hidden','true'); document.body.appendChild(mist);
    document.addEventListener('click', event => {
        if (locked && !event.target.closest('.ambience-toggle')) { event.preventDefault(); event.stopImmediatePropagation(); return; }
        if (!media.matches && event.target.closest('#openButton,#yesButton')) {
            mist.getAnimations().forEach(a=>a.cancel());
            mist.animate([{opacity:0,transform:'translateY(55%)'},{opacity:.26,transform:'translateY(0)',offset:.48},{opacity:0,transform:'translateY(-45%)'}],{duration:1400,easing:'cubic-bezier(.22,1,.36,1)'});
        }
    },true);
    document.addEventListener('keydown',event=>{ if(locked && ['Enter',' ','Backspace'].includes(event.key) && !event.target.closest('.ambience-toggle')){event.preventDefault();event.stopImmediatePropagation();} },true);
    document.addEventListener('screenchange', event => {
        const {id,from,back} = event.detail;
        const next = document.getElementById(id), previous = document.getElementById(from);
        if (!next) return;
        prepare(next);
        next.style.setProperty('--motion-sign',back?-1:1);
        if (!from || from===id) return;
        locked=true; document.body.classList.add('scene-transitioning');
        clearTimeout(unlockTimer);
        unlockTimer=setTimeout(()=>{locked=false;document.body.classList.remove('scene-transitioning');},media.matches?300:1250);
        if(previous){ prepare(previous);previous.style.setProperty('--motion-sign',back?-1:1);previous.classList.add('visual-leaving');setTimeout(()=>previous.classList.remove('visual-leaving'),610); }
        // Finish a short eased scroll before the first arriving element is revealed.
        const initialScroll=window.scrollY,scrollStart=performance.now();
        if(media.matches)window.scrollTo({top:0,behavior:'instant'});
        else requestAnimationFrame(function scrollUp(now){const t=Math.min(1,(now-scrollStart)/190);window.scrollTo({top:initialScroll*Math.pow(1-t,3),behavior:'instant'});if(t<1)requestAnimationFrame(scrollUp)});
        if(!media.matches)document.querySelector('.cafe-photo')?.animate([{scale:'1'},{scale:'1.025',offset:.6},{scale:'1'}],{duration:1400,easing:'cubic-bezier(.22,1,.36,1)'});
    });
    const sky=document.createElement('div');sky.className='cafe-ambient';sky.setAttribute('aria-hidden','true');
    const spots=[[9,16,55],[24,28,28],[39,13,46],[61,24,38],[80,18,66],[89,38,26],[18,47,24],[69,42,30],[48,32,26],[94,66,20]];
    sky.innerHTML=spots.map(([x,y,size],i)=>`<i class="bokeh-light" style="left:${x}%;top:${y}%;--size:${size}px;--life:${4+i%6}s;--delay:-${i*.7}s"></i>`).join('')+Array.from({length:20},(_,i)=>`<i class="cafe-dust" style="left:${7+i%7*5}%;top:${15+i*29%70}%;--size:${1+i%3}px;--life:${12+i%5*3}s;--delay:-${i*.9}s"></i>`).join('');
    document.querySelector('.background-system').appendChild(sky);
    let targetX=0,targetY=0,x=0,y=0,raf=0;
    const move=()=>{
        raf=0;if(media.matches||document.hidden||!document.body.classList.contains('is-loaded'))return;
        x+=(targetX-x)*.07;y+=(targetY-y)*.07;
        document.documentElement.style.setProperty('--cafe-x',x.toFixed(2)+'px');document.documentElement.style.setProperty('--cafe-y',y.toFixed(2)+'px');
        document.documentElement.style.setProperty('--cup-x',(-x*.5).toFixed(2)+'px');document.documentElement.style.setProperty('--cup-y',(-y*.5).toFixed(2)+'px');
        if(Math.abs(targetX-x)+Math.abs(targetY-y)>.05)raf=requestAnimationFrame(move);
    };
    const schedule=()=>{if(!raf)raf=requestAnimationFrame(move)};
    if(matchMedia('(hover:hover) and (pointer:fine)').matches){window.addEventListener('pointermove',e=>{targetX=(e.clientX/innerWidth-.5)*22;targetY=(e.clientY/innerHeight-.5)*22;schedule()},{passive:true})}
    else if(window.DeviceOrientationEvent && typeof DeviceOrientationEvent.requestPermission!=='function'){window.addEventListener('deviceorientation',e=>{if(e.gamma==null||e.beta==null)return;targetX=Math.max(-10,Math.min(10,e.gamma/3));targetY=Math.max(-10,Math.min(10,(e.beta-30)/4));schedule()},{passive:true})}
    let pausedAnimations=[];
    document.addEventListener('visibilitychange',()=>{document.body.classList.toggle('effects-paused',document.hidden);if(document.hidden){pausedAnimations=document.getAnimations().filter(a=>a.playState==='running');pausedAnimations.forEach(a=>a.pause());cancelAnimationFrame(raf);raf=0;}else{pausedAnimations.forEach(a=>{if(a.playState==='paused')a.play()});pausedAnimations=[];schedule()}});
    media.addEventListener?.('change',()=>{if(media.matches){cancelAnimationFrame(raf);raf=0;document.documentElement.style.setProperty('--cafe-x','0px');document.documentElement.style.setProperty('--cafe-y','0px');document.documentElement.style.setProperty('--cup-x','0px');document.documentElement.style.setProperty('--cup-y','0px')}});
})();
