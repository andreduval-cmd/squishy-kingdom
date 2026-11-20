(() => {
  const page=document.getElementById('start'), story=document.getElementById('lp-story'), visual=document.getElementById('lp-visual');
  const menu=document.getElementById('lp-menu'), trigger=document.getElementById('lp-menu-open');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)'), mobile=matchMedia('(max-width:800px)');
  const copies=['lp-opening','lp-discover','lp-together'].map(id=>document.getElementById(id));
  const labels=['A softer place to land','Little things. Lovely discoveries.','Better with a little company'];
  let api=null,frame=0,progress=0,active=-1,last=0,dirty=true,destroyed=false,rendered=false;
  function closeMenu(){if(menu.open)menu.close();}
  trigger.addEventListener('click',()=>{menu.showModal();trigger.setAttribute('aria-expanded','true');});
  menu.querySelector('[aria-label="Close menu"]').onclick=closeMenu;
  menu.addEventListener('close',()=>{trigger.setAttribute('aria-expanded','false');trigger.focus({preventScroll:true});});
  menu.addEventListener('click',e=>{if(e.target===menu)closeMenu();});
  function jump(hash){closeMenu();const el=document.getElementById(hash.slice(1));if(!el)return;el.scrollIntoView({behavior:reduced.matches?'instant':'smooth',block:'start'});}
  page.querySelectorAll('a[href^="#"]').forEach(link=>link.addEventListener('click',e=>{e.preventDefault();jump(link.getAttribute('href'));}));
  page.querySelectorAll('[data-lp-launch]').forEach(button=>button.onclick=()=>{closeMenu();document.getElementById('go').click();});
  page.querySelectorAll('[data-lp-mode]').forEach(button=>button.onclick=()=>{closeMenu();goSrv(button.dataset.lpMode);});
  document.getElementById('lp-squish-demo').onclick=()=>api?.squeeze();
  function chapter(value){
    if(value===active)return;active=value;
    copies.forEach((el,i)=>{el.hidden=i!==value;});
    const number=value<0?Math.min(2,Math.floor(progress*3)):value;
    document.getElementById('lp-current').textContent=String(number+1).padStart(2,'0');
    document.getElementById('lp-chapter-label').textContent=value<0?'A little room to wander':labels[value];
    page.querySelectorAll('.lp-progress i').forEach((el,i)=>el.classList.toggle('active',i===number));
  }
  function measure(){const travel=Math.max(1,story.offsetHeight-visual.offsetHeight);progress=reduced.matches?0:Math.max(0,Math.min(1,page.scrollTop/travel));dirty=true;}
  page.addEventListener('scroll',measure,{passive:true});addEventListener('resize',measure,{passive:true});
  reduced.addEventListener('change',measure);mobile.addEventListener('change',measure);
  function render(ts){
    if(destroyed)return;
    const elapsed=last?Math.min(.04,(ts-last)/1000):1/60;last=ts;
    if(!document.hidden&&!page.hidden){
      const changed=dirty;
      if(dirty){
        const p=progress;
        chapter(reduced.matches?0:p<.22?0:p<.39?-1:p<.65?1:p<.79?-1:2);
        visual.dataset.chapter=String(active);dirty=false;
      }
      const bounds=visual.getBoundingClientRect();
      if(api&&bounds.bottom>0&&bounds.top<innerHeight&&(!reduced.matches||changed||!rendered)){api.render(progress,elapsed,mobile.matches,reduced.matches);rendered=true;}
    }
    frame=requestAnimationFrame(render);
  }
  function destroy(){if(destroyed)return;destroyed=true;cancelAnimationFrame(frame);closeMenu();api?.destroy();api=null;}
  new MutationObserver(()=>{if(page.hidden)destroy();}).observe(page,{attributes:true,attributeFilter:['hidden']});
  addEventListener('pagehide',destroy,{once:true});
  fetch('landing-content.json').then(r=>{if(!r.ok)throw Error();return r.json();}).then(content=>{
    page.querySelectorAll('[data-lp]').forEach(el=>{const value=el.dataset.lp.split('.').reduce((item,key)=>item?.[key],content);if(typeof value==='string')el.textContent=value;});
    content.features?.forEach((item,i)=>{const el=document.querySelectorAll('.lp-feature')[i];if(el){el.querySelector('h3').textContent=item.title;el.querySelector('p').textContent=item.body;}});
    content.faq?.forEach((item,i)=>{const el=document.querySelectorAll('#lp-faq-list details')[i];if(el){el.querySelector('summary').textContent=item.question;el.querySelector('p').textContent=item.answer;}});
  }).catch(()=>{}); // Semantic HTML remains complete if content delivery fails.
  if(!page.hidden&&window.Squishy3D?.createLanding){try{api=Squishy3D.createLanding(document.getElementById('landing-3d'));visual.classList.add('has-live-scene');}catch(error){console.warn('Landing artwork fallback:',error.message);}}
  measure();frame=requestAnimationFrame(render);
  window.KingdomLanding={get progress(){return progress;},get activeChapter(){return active;},get live3D(){return!!api;},get diagnostics(){return api?.diagnostics;}};
})();
