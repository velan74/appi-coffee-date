/* Original local loops only. The selected song stays in the official YouTube embed. */
(() => {
    const volume=[.30,.12], files=['assets/fur-elise-piano.mp3','assets/cafe-ambience.mp3'];
    let context, layers=[], loadPromise, wanted=false, videoActive=false, suspendTimer, operation=0;
    const control=document.createElement('div');control.className='music-control';
    const toggle=document.createElement('button');toggle.type='button';toggle.className='ambience-toggle music-toggle';toggle.setAttribute('aria-pressed','false');
    toggle.innerHTML='<svg class="music-speaker" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4Z"/><path class="music-slash" d="M17 8l4 8"/></svg><span class="music-bars" aria-hidden="true"><i></i><i></i><i></i></span>';
    const hint=document.createElement('span');hint.className='music-hint';hint.textContent='Tap for music ♪';
    control.append(toggle,hint);document.querySelector('.progress-wrapper').appendChild(control);
    let hintTimer;
    const hideHint=()=>{clearTimeout(hintTimer);hint.classList.add('is-hidden')};
    const loaded=new MutationObserver(()=>{if(document.body.classList.contains('is-loaded')){hintTimer=setTimeout(hideHint,5000);loaded.disconnect()}});loaded.observe(document.body,{attributes:true,attributeFilter:['class']});
    if(document.body.classList.contains('is-loaded')){hintTimer=setTimeout(hideHint,5000);loaded.disconnect()}
    const render=()=>{
        toggle.setAttribute('aria-pressed',String(wanted));
        toggle.setAttribute('aria-label',wanted?'Turn background music off':'Play background music');
        toggle.classList.toggle('music-audible',wanted&&!videoActive&&!document.hidden&&context?.state==='running');
    };
    render();
    const ramp=(on,seconds)=>{
        if(!context)return;clearTimeout(suspendTimer);const now=context.currentTime;
        layers.forEach((layer,i)=>{const gain=layer.gain.gain;if(gain.cancelAndHoldAtTime)gain.cancelAndHoldAtTime(now);else{const current=gain.value;gain.cancelScheduledValues(now);gain.setValueAtTime(current,now)}gain.linearRampToValueAtTime(on?volume[i]:0,now+seconds)});
        if(!on)suspendTimer=setTimeout(()=>{if(!wanted||videoActive||document.hidden)context.suspend().then(render).catch(()=>{})},seconds*1000+40);
    };
    const unlock=()=>{
        if(!context){const AudioContext=window.AudioContext||window.webkitAudioContext;if(!AudioContext)throw Error('Web Audio unavailable');context=new AudioContext();context.addEventListener('statechange',render);
            // Unlock Safari synchronously in the tap, before any fetch/decode awaits.
            const silent=context.createBufferSource(),gain=context.createGain();gain.gain.value=0;silent.buffer=context.createBuffer(1,1,context.sampleRate);silent.connect(gain).connect(context.destination);silent.start();silent.onended=()=>{silent.disconnect();gain.disconnect()};
        }
        clearTimeout(suspendTimer);return context.resume();
    };
    const load=()=>{
        if(loadPromise)return loadPromise;
        toggle.setAttribute('aria-busy','true');
        loadPromise=Promise.all(files.map(async file=>{const response=await fetch(file);if(!response.ok)throw Error('Audio unavailable');return context.decodeAudioData(await response.arrayBuffer())})).then(buffers=>{
            const when=context.currentTime+.03;
            layers=buffers.map(buffer=>{const source=context.createBufferSource(),gain=context.createGain();source.buffer=buffer;source.loop=true;source.loopStart=0;source.loopEnd=buffer.duration;gain.gain.value=0;source.connect(gain).connect(context.destination);source.start(when);return {source,gain}});
        }).catch(error=>{loadPromise=null;throw error}).finally(()=>toggle.removeAttribute('aria-busy'));
        return loadPromise;
    };
    toggle.addEventListener('click',async()=>{
        hideHint();wanted=!wanted;const token=++operation;render();
        if(!wanted){ramp(false,1);return;}
        try{const resumed=unlock();await Promise.all([resumed,load()]);if(token!==operation||!wanted)return;if(document.hidden||videoActive){ramp(false,0);return}ramp(true,2);render()}
        catch{if(token===operation){wanted=false;ramp(false,0);render();window.showToast?.('Music could not start. Tap again to retry.')}}
    });
    document.addEventListener('visibilitychange',()=>{
        if(document.hidden){clearTimeout(suspendTimer);if(context){ramp(false,0);context.suspend().then(render).catch(()=>{})}sendVideo('pauseVideo')}
        else if(wanted&&!videoActive&&context&&layers.length){context.resume().then(()=>{if(wanted&&!videoActive&&!document.hidden){ramp(true,2);render()}}).catch(()=>{wanted=false;render()})}
        render();
    });
    window.addEventListener('pagehide',()=>{clearTimeout(suspendTimer);if(context){ramp(false,0);context.suspend().catch(()=>{})}sendVideo('pauseVideo')});
    window.addEventListener('pageshow',event=>{if(event.persisted){wanted=false;++operation;ramp(false,0);closeVideo();render()}});

    const song=document.createElement('div');song.className='our-song';
    song.innerHTML='<p>Our song, for the way there ♪</p><button type="button" class="song-play">Play Radhimaa</button>';
    document.querySelector('#success .countdown').after(song);
    const play=song.querySelector('button');
    let panel,frame,failureTimer;
    const videoURL='https://www.youtube.com/watch?v=jR3rWCBeO6M';
    const sendVideo=func=>{frame?.contentWindow?.postMessage(JSON.stringify({event:'command',func,args:[]}),'https://www.youtube-nocookie.com')};
    const closeVideo=()=>{
        if(!panel)return;clearTimeout(failureTimer);sendVideo('stopVideo');frame?.remove();frame=null;panel.remove();panel=null;videoActive=false;document.body.classList.remove('song-open');
        if(wanted&&!document.hidden&&context&&layers.length)context.resume().then(()=>{if(wanted&&!videoActive&&!document.hidden){ramp(true,2);render()}}).catch(()=>{});
        render();play.focus({preventScroll:true});
    };
    const failed=()=>{if(panel){panel.querySelector('.song-status').textContent='You can listen directly on YouTube.';panel.classList.add('video-unavailable')}};
    play.addEventListener('click',()=>{
        if(panel)return;videoActive=true;ramp(false,1);render();
        panel=document.createElement('div');panel.className='song-modal';panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-label','Our song — Radhimaa');
        panel.innerHTML=`<div class="song-panel"><div class="song-panel-heading"><span>Our song ♪</span><button type="button" class="song-close" aria-label="Close video">×</button></div><div class="song-video"></div><p class="song-status" aria-live="polite">Radhimaa · Sai Abhyankkar</p><a class="song-fallback" href="${videoURL}" target="_blank" rel="noopener noreferrer">Listen on YouTube ↗</a></div>`;
        frame=document.createElement('iframe');frame.title='Radhimaa by Sai Abhyankkar — official YouTube video';frame.allow='autoplay; encrypted-media; picture-in-picture; fullscreen';frame.allowFullscreen=true;frame.referrerPolicy='strict-origin-when-cross-origin';
        frame.src='https://www.youtube-nocookie.com/embed/jR3rWCBeO6M?autoplay=1&enablejsapi=1&playsinline=1&rel=0&origin='+encodeURIComponent(location.origin);
        frame.addEventListener('error',failed);
        frame.addEventListener('load',()=>{frame?.contentWindow?.postMessage(JSON.stringify({event:'listening'}),'https://www.youtube-nocookie.com');frame?.contentWindow?.postMessage(JSON.stringify({event:'command',func:'addEventListener',args:['onError']}),'https://www.youtube-nocookie.com')});
        panel.querySelector('.song-video').appendChild(frame);document.body.appendChild(panel);document.body.classList.add('song-open');
        panel.querySelector('.song-close').addEventListener('click',closeVideo);
        panel.addEventListener('click',event=>{if(event.target===panel)closeVideo()});
        panel.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();closeVideo()}else if(event.key==='Tab'){const items=[...panel.querySelectorAll('button,iframe,a')],first=items[0],last=items.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}}});
        panel.querySelector('.song-close').focus({preventScroll:true});failureTimer=setTimeout(failed,12000);
    });
    window.addEventListener('message',event=>{
        if(!frame||event.source!==frame.contentWindow||!['https://www.youtube-nocookie.com','https://www.youtube.com'].includes(event.origin))return;
        let message;try{message=typeof event.data==='string'?JSON.parse(event.data):event.data}catch{return}
        if(message?.event==='onError')failed();
        if(message?.event==='onReady'||message?.event==='infoDelivery'&&message.info?.playerState===1)clearTimeout(failureTimer);
    });
    document.addEventListener('screenchange',event=>{if(event.detail.id!=='intro'){clearTimeout(hintTimer);hint.classList.add('is-hidden')}if(event.detail.id!=='success')closeVideo()});
})();
