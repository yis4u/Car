const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const safeURL = value => { try { const url = new URL(value); return url.protocol === 'https:' ? esc(url.href) : '#'; } catch { return '#'; } };
const icon = name => `<svg class="icon" aria-hidden="true"><use href="#i-${name}"/></svg>`;
const normalized = text => String(text).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
let cars = [], brands = [], saved = new Set(), currentCar = null, studio = null, studioRequest = 0, changingDialog = false, returnCar = null;
let storageAvailable = true;
try { const stored = JSON.parse(localStorage.getItem('motora-garage') || '[]'); if (Array.isArray(stored)) saved = new Set(stored.filter(x => typeof x === 'string')); } catch { storageAvailable = false; }
const state = { query: '', brand: 'all', body: 'all', fuel: 'all', era: 'all', sort: 'curated', saved: false, limit: 9 };
let toastTimer;
function toast(message) { clearTimeout(toastTimer); $('#toast').textContent = message; $('#toast').classList.add('visible'); toastTimer = setTimeout(() => $('#toast').classList.remove('visible'), 3000); }
function changeHash(hash) { history.replaceState(null, '', location.pathname + location.search + hash); }
function imagePath(car, view = '') { return `./assets/${car.id}${view ? '-' + view : ''}.webp`; }
function metric(car, name) { const value = car[name]; if (value == null) return '—'; return esc(value); }
function statMarkup(car, className) { return `<div class="${className}"><div><strong>${metric(car,'power')} <small>${car.power ? esc(car.powerUnit) : ''}</small></strong><span>Power</span></div><div><strong>${metric(car,'acceleration')} <small>${car.acceleration ? 's' : ''}</small></strong><span>0–100 km/h</span></div><div><strong>${metric(car,'topSpeed')} <small>${car.topSpeed ? 'km/h' : ''}</small></strong><span>Top speed</span></div></div>`; }
function licence(car) { return /share/i.test(car.credit.license) ? {label:'CC BY-SA 4.0', url:'https://creativecommons.org/licenses/by-sa/4.0/'} : {label:'CC BY 4.0', url:'https://creativecommons.org/licenses/by/4.0/'}; }
function creditMarkup(car) { const l = licence(car); return `Artist model by <a href="${safeURL(car.credit.authorUrl)}" target="_blank" rel="noopener">${esc(car.credit.author)}</a> · <a href="${l.url}" target="_blank" rel="noopener">${l.label}</a> · <a href="${safeURL(car.credit.sourceUrl)}" target="_blank" rel="noopener">Original model ↗</a>`; }
function card(car, index) { return `<article class="car-card"><div class="card-visual"><button class="card-image-button" data-detail="${car.id}" aria-label="Discover ${esc(car.brand)} ${esc(car.name)}"><img src="${imagePath(car)}" alt="${esc(car.brand)} ${esc(car.name)} artist model" loading="lazy" width="800" height="480"></button><span class="view-badge">${icon('cube')} 3D AVAILABLE</span><button class="card-save" data-save="${car.id}" aria-pressed="${saved.has(car.id)}" aria-label="${saved.has(car.id) ? 'Remove' : 'Save'} ${esc(car.name)} ${saved.has(car.id) ? 'from' : 'to'} my garage">${icon('heart')}</button><span class="card-number">${String(index + 1).padStart(3,'0')} / THE COLLECTION</span><button class="card-studio-link" data-studio="${car.id}" aria-label="View ${esc(car.name)} in 3D">${icon('arrow')}</button></div><div class="card-content"><div class="card-kicker"><span>${esc(car.brand.toUpperCase())}</span><span>${car.year}</span></div><h3 class="card-name"><button data-detail="${car.id}">${esc(car.name)}</button></h3><div class="card-description"><span>${esc(car.body)}</span><i></i><span>${esc(car.fuel)}</span><i></i><span>${esc(car.drive)}</span></div>${statMarkup(car,'card-stats')}</div></article>`; }
function filteredCars() {
  const matches = cars.filter(c => (!state.saved || saved.has(c.id)) && (state.brand === 'all' || c.brand === state.brand) && (state.body === 'all' || c.body === state.body) && (state.fuel === 'all' || c.fuel === state.fuel) && (state.era === 'all' || (state.era === 'classic' ? c.year < 2000 : c.year >= 2000)) && (!state.query || state.query.split(/\s+/).every(q => normalized([c.brand,c.name,c.engine,c.fuel,c.body,c.year,c.drive].join(' ')).includes(q))));
  const curated = c => (cars.indexOf(c) % 10) * brands.length + brands.indexOf(c.brand);
  matches.sort((a,b) => state.sort === 'name' ? (a.brand+' '+a.name).localeCompare(b.brand+' '+b.name) : state.sort === 'newest' ? b.year-a.year : state.sort === 'oldest' ? a.year-b.year : state.sort === 'power' ? ((b.power || 0)*(b.powerUnit==='hp'?1.01387:1) - (a.power || 0)*(a.powerUnit==='hp'?1.01387:1)) : curated(a)-curated(b));
  return matches;
}
function renderCollection() {
  const filtered = filteredCars();
  const visible = filtered.slice(0,state.limit);
  $('#car-grid').innerHTML = visible.length ? visible.map((c,i)=>card(c,i)).join('') : `<div class="empty-state">${icon(state.saved ? 'heart' : 'search')}<h3>${state.saved ? 'Your next favourite is out there.' : 'A different direction?'}</h3><p>${state.saved ? 'Tap the heart on a car to make it part of your garage. Your collection stays in this browser.' : 'No cars match these filters. Try another name, brand, or body style.'}</p><button class="button outline" id="empty-reset">${state.saved ? 'Explore the collection' : 'Clear the filters'} ${icon('arrow')}</button></div>`;
  $('#results-count').textContent = `${filtered.length} ${filtered.length===1?'remarkable car':'remarkable cars'}`;
  $('#showing-count').textContent = filtered.length ? `Showing ${visible.length} of ${filtered.length} cars. Take your time.` : '';
  $('#load-more').hidden = visible.length >= filtered.length;
  $('#all-tab').classList.toggle('active',!state.saved);
  $('#saved-tab').classList.toggle('active',state.saved);
  $('#all-tab').setAttribute('aria-pressed',String(!state.saved));
  $('#saved-tab').setAttribute('aria-pressed',String(state.saved));
  $$('#brand-rail button').forEach(b => { const active=b.dataset.brand===state.brand; b.classList.toggle('active',active); b.setAttribute('aria-pressed',String(active)); });
  const count = ['body','fuel','era'].filter(key=>state[key]!=='all').length;
  $('#active-filter-count').textContent = count;
  $('#active-filter-count').hidden = !count;
  $('#empty-reset')?.addEventListener('click',()=>{resetFilters();state.saved=false;renderCollection();});
  $$('#car-grid img').forEach(img=>img.addEventListener('error',()=>{img.alt='Image unavailable — open car details to explore the 3D model';img.classList.add('image-unavailable');},{once:true}));
}
function updateSaved() {
  $('#saved-count').textContent = saved.size;
  $('#saved-tab-count').textContent = saved.size;
  $$('[data-save]').forEach(button=>{const car=cars.find(c=>c.id===button.dataset.save); if(!car)return; const yes=saved.has(car.id);button.setAttribute('aria-pressed',String(yes));button.setAttribute('aria-label',`${yes?'Remove':'Save'} ${car.name} ${yes?'from':'to'} my garage`);});
}
function saveCar(id) {
  const car=cars.find(c=>c.id===id);if(!car)return;
  const remove=saved.has(id); remove?saved.delete(id):saved.add(id);
  try { localStorage.setItem('motora-garage',JSON.stringify([...saved])); } catch { storageAvailable=false; }
  updateSaved(); if(state.saved)renderCollection();
  toast(`${car.name} ${remove?'removed from':'added to'} your garage.${storageAvailable?'':' Saved for this visit.'}`);
}
function resetFilters() {
  Object.assign(state,{query:'',brand:'all',body:'all',fuel:'all',era:'all',sort:'curated',limit:9});
  $('#search').value=''; $('#brand-filter').value='all'; $('#body-filter').value='all'; $('#fuel-filter').value='all'; $('#era-filter').value='all'; $('#sort').value='curated';
}
function showSaved() { resetFilters();state.saved=true;renderCollection();$('#collection').scrollIntoView({behavior:motion()}); }
const motion=()=>matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth';
function destroyStudio() { studioRequest++;if(studio){studio.dispose();studio=null;} $('#studio-stage canvas')?.remove(); }
function closeExisting() { changingDialog=true;for(const d of $$('dialog[open]'))d.close();changingDialog=false;returnCar=null;destroyStudio(); }
function filmPoster(car) {
  if(!car.video)return `<div class="film-poster"><img src="${imagePath(car)}" alt="${esc(car.name)}"><a class="film-play" href="https://www.youtube.com/results?search_query=${encodeURIComponent(car.brand+' '+car.name+' review')}" target="_blank" rel="noopener"><span class="play-ring">${icon('play')}</span>Find films on YouTube ↗</a></div>`;
  return `<div class="film-poster" id="film-frame"><img src="${imagePath(car)}" alt="${esc(car.name)} video preview"><button class="film-play" id="play-film"><span class="play-ring">${icon('play')}</span>Play film on YouTube</button></div><h3 class="film-title">${esc(car.video.title)}</h3><a class="film-link" href="https://www.youtube.com/watch?v=${encodeURIComponent(car.video.id)}" target="_blank" rel="noopener">Watch on YouTube ↗</a><p class="film-help">Playing connects to YouTube. If embedded playback is restricted, open the film on YouTube.</p>`;
}
function openDetail(id, tab='gallery') {
  const car=cars.find(c=>c.id===id);if(!car){toast('The collection is still loading. Please try again.');return;}
  closeExisting();currentCar=car;
  $('#detail-content').innerHTML=`<div class="detail-header"><div class="eyebrow">${esc(car.brand.toUpperCase())} / ${car.year} REFERENCE EDITION</div><h2 id="detail-title">${esc(car.name)}</h2><p>${esc(car.description)}</p></div><div class="detail-layout"><div class="detail-media"><div class="detail-tabs" role="group" aria-label="Car media"><button class="active" data-media="gallery">The gallery</button><button data-media="film">${icon('play')} The film</button></div><div id="gallery-pane"><img id="gallery-main" class="gallery-main" src="${imagePath(car)}" alt="${esc(car.brand+' '+car.name)} — perspective view"><div class="gallery-thumbs" role="group" aria-label="Gallery view">${[['','Perspective'],['side','Side'],['rear','Rear']].map(([view,label])=>`<button data-gallery="${view}" class="${!view?'active':''}" aria-label="${label} view" aria-pressed="${!view}"><img src="${imagePath(car,view)}" alt=""></button>`).join('')}</div></div><div id="film-pane" class="film-pane" hidden>${filmPoster(car)}</div><p class="gallery-credit">${creditMarkup(car)}<br>Gallery images are rendered from the artist model; custom parts and trim may differ.</p></div><div class="detail-specs">${statMarkup(car,'detail-stats')}<dl class="spec-table">${[['Reference year',car.year],['Body style',car.body],['Powertrain',car.fuel],['Engine / motors',car.engine],['Driven wheels',car.drive],['Transmission',car.transmission]].map(([label,value])=>`<div><dt>${label}</dt><dd>${esc(value)}</dd></div>`).join('')}</dl><p class="spec-footnote">Reference figures; market, trim, and options vary. A dash means no figure is listed. ${car.topSpeed===250?'Top speed is electronically limited. ':''}<a href="${safeURL(car.reference)}" target="_blank" rel="noopener">Read the reference ↗</a></p><div class="detail-action-row"><button class="button dark" data-studio="${car.id}" data-return="true">Explore in 3D ${icon('cube')}</button><button class="detail-save" data-save="${car.id}" aria-pressed="${saved.has(car.id)}" aria-label="Save ${esc(car.name)} to my garage">${icon('heart')}</button></div></div></div>`;
  $('#detail-dialog').showModal();$('#detail-dialog').scrollTop=0;changeHash('#car='+id);updateSaved();
  const changeMedia=media=>{
    const isFilm=media==='film';$('#gallery-pane').hidden=isFilm;$('#film-pane').hidden=!isFilm;
    $$('[data-media]').forEach(b=>{b.classList.toggle('active',b.dataset.media===media);b.setAttribute('aria-pressed',String(b.dataset.media===media));});
    if(!isFilm&&$('#film-frame iframe')){$('#film-pane').innerHTML=filmPoster(car);bindFilm();}
  };
  const bindFilm=()=>$('#play-film')?.addEventListener('click',()=>{ $('#film-frame').innerHTML=`<iframe title="${esc(car.video.title)}" src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(car.video.id)}?autoplay=1&rel=0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>`; });
  bindFilm();$$('[data-media]').forEach(b=>b.addEventListener('click',()=>changeMedia(b.dataset.media)));changeMedia(tab);
  $$('[data-gallery]').forEach(b=>b.addEventListener('click',()=>{const view=b.dataset.gallery;$('#gallery-main').src=imagePath(car,view);$('#gallery-main').alt=`${car.brand} ${car.name} — ${view||'perspective'} view`;$$('[data-gallery]').forEach(x=>{x.classList.toggle('active',x===b);x.setAttribute('aria-pressed',String(x===b));});}));
}
async function loadStudio(car) {
  destroyStudio();const request=++studioRequest;
  $('#studio-loading').hidden=false;$('#studio-error').hidden=true;$('#studio-source').href=car.credit.sourceUrl;
  try {
    const {CarStudio}=await import('./studio.js');if(request!==studioRequest)return;
    studio=new CarStudio($('#studio-stage'));
    studio.renderer.domElement.setAttribute('aria-label',`Interactive 3D model of ${car.brand} ${car.name}. Drag to rotate, or use the camera view buttons below.`);
    let timeout;try { const localBase=location.hostname==='127.0.0.1'&&new URLSearchParams(location.search).get('localModels')==='1'?'/work/models/':null; await Promise.race([studio.load(car,localBase),new Promise((_,reject)=>{timeout=setTimeout(()=>reject(new Error('Model load timed out')),45000);})]); } finally { clearTimeout(timeout); }
    if(request!==studioRequest)return;$('#studio-loading').hidden=true;
    $('#paint-controls').hidden=!car.paint?.materials?.length;
    if(!car.paint?.materials?.length)toast('This artist model keeps its original finish.');
    $('#auto-rotate').setAttribute('aria-pressed','false');$('#auto-rotate').classList.remove('active');
    $$('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view==='three'));
  } catch(error) {
    if(request!==studioRequest)return;
    if(studio){studio.dispose();studio=null;}$('#studio-loading').hidden=true;$('#studio-error').hidden=false;
    if(/webgl|context/i.test(String(error)))$('#studio-error p').textContent='Your browser could not start 3D graphics. Try another browser, or explore the original model.';
    console.warn('3D viewer:',error.message);
  }
}
function openStudio(id, fromDetail=false) {
  const car=cars.find(c=>c.id===id);if(!car){toast('The collection is still loading. Please try again.');return;}
  closeExisting();returnCar=fromDetail?car.id:null;currentCar=car;
  $('#studio-title').textContent=car.name;$('#studio-brand').textContent=car.brand.toUpperCase()+' / '+car.year;
  $('#studio-credit').innerHTML=creditMarkup(car);$('#studio-error p').textContent='Check your connection and try again, or explore the original model.';
  $('#paint-controls').hidden=true;
  const paints=[['#efefe7','Ivory'],['#38503d','Forest green'],['#8f2924','Racing red'],['#293b50','Midnight blue'],['#353737','Graphite']];
  $('#paint-swatches').innerHTML=paints.map(([color,label])=>`<button class="swatch" style="--paint:${color}" data-paint="${color}" aria-label="Preview ${label.toLowerCase()} finish" title="${label}" aria-pressed="false"></button>`).join('');
  $$('[data-paint]').forEach(b=>b.addEventListener('click',()=>{if(!studio)return;const changed=studio.setColor(b.dataset.paint);if(!changed){toast('This model keeps its original finish.');return;}$$('[data-paint]').forEach(x=>{x.classList.toggle('active',x===b);x.setAttribute('aria-pressed',String(x===b));});}));
  $('#studio-dialog').showModal();$('#studio-dialog').scrollTop=0;changeHash('#studio='+id);loadStudio(car);
}
function brandMark(brand) {
  const marks={
    'BMW':'<svg viewBox="0 0 64 34" aria-hidden="true"><circle cx="32" cy="17" r="15"/><circle cx="32" cy="17" r="10"/><path d="M32 7v20M22 17h20M22 17a10 10 0 0 1 10-10v10Zm10 10V17h10a10 10 0 0 1-10 10Z" fill="currentColor"/></svg>',
    'Mercedes-Benz':'<svg viewBox="0 0 64 34" aria-hidden="true"><circle cx="32" cy="17" r="15"/><path d="m32 2 2 13 11 10-13-6-13 6 11-10Z" fill="currentColor"/></svg>',
    'Audi':'<svg viewBox="0 0 70 34" aria-hidden="true"><circle cx="16" cy="17" r="10"/><circle cx="29" cy="17" r="10"/><circle cx="42" cy="17" r="10"/><circle cx="55" cy="17" r="10"/></svg>',
    'Chevrolet':'<svg viewBox="0 0 64 34" aria-hidden="true"><path d="M22 9h22l-3 6h16l-5 9H37l-2 5H14l3-5H4l4-9h14Z"/></svg>'
  };
  return marks[brand]||esc(brand==='Mercedes-Benz'?'Mercedes':brand);
}
function routeHash() { const m=location.hash.match(/^#(car|studio)=([a-z0-9-]+)$/);if(m&&cars.some(c=>c.id===m[2])){if(m[1]==='car')openDetail(m[2]);else openStudio(m[2]);} }
document.addEventListener('click',event=>{
  const save=event.target.closest('[data-save]');if(save){saveCar(save.dataset.save);return;}
  const detail=event.target.closest('[data-detail]');if(detail){openDetail(detail.dataset.detail,detail.dataset.tab);return;}
  const launch=event.target.closest('[data-studio]');if(launch){openStudio(launch.dataset.studio,launch.dataset.return==='true');return;}
  const close=event.target.closest('[data-close]');if(close){close.closest('dialog').close();return;}
});
for(const dialog of $$('dialog')) {
  dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}});
  dialog.addEventListener('close',()=>{if(changingDialog)return;
    if(dialog.id==='studio-dialog'){destroyStudio();if(returnCar){const id=returnCar;returnCar=null;openDetail(id);return;}}
    if(dialog.id==='detail-dialog'){$('#film-pane iframe')?.remove();}
    if(!$$('dialog[open]').length)changeHash('#collection');
  });
}
$('#saved-button').addEventListener('click',showSaved);$('#saved-tab').addEventListener('click',showSaved);
$('#all-tab').addEventListener('click',()=>{state.saved=false;state.limit=9;renderCollection();});
$('#load-more').addEventListener('click',()=>{state.limit+=9;renderCollection();});
$('#search').addEventListener('input',event=>{state.query=normalized(event.target.value.trim());state.limit=9;renderCollection();});
for(const key of ['brand','body','fuel','era'])$('#'+key+'-filter').addEventListener('change',event=>{state[key]=event.target.value;state.limit=9;renderCollection();});
$('#sort').addEventListener('change',event=>{state.sort=event.target.value;state.limit=9;renderCollection();});
$('#reset-filters').addEventListener('click',()=>{resetFilters();renderCollection();});
$('#filter-toggle').addEventListener('click',()=>{const open=$('#more-filters').hidden;$('#more-filters').hidden=!open;$('#filter-toggle').setAttribute('aria-expanded',String(open));});
$('#mobile-menu').addEventListener('click',()=>{const nav=$('.site-header nav');const open=!nav.classList.contains('open');nav.classList.toggle('open',open);$('#mobile-menu').setAttribute('aria-expanded',String(open));});
$$('.site-header nav a').forEach(a=>a.addEventListener('click',()=>{$('.site-header nav').classList.remove('open');$('#mobile-menu').setAttribute('aria-expanded','false');}));
$('#about-button').addEventListener('click',()=>{closeExisting();$('#about-dialog').showModal();});
$('#studio-home').addEventListener('click',event=>{event.preventDefault();$('#studio-dialog').close();});
$('#studio-retry').addEventListener('click',()=>{if(currentCar)loadStudio(currentCar);});
$$('[data-view]').forEach(button=>button.addEventListener('click',()=>{if(!studio)return;studio.setView(button.dataset.view);$$('[data-view]').forEach(b=>b.classList.toggle('active',b===button));$('#auto-rotate').setAttribute('aria-pressed','false');$('#auto-rotate').classList.remove('active');}));
$('#auto-rotate').addEventListener('click',()=>{if(!studio)return;const on=!studio.controls.autoRotate;studio.controls.autoRotate=on;$('#auto-rotate').setAttribute('aria-pressed',String(on));$('#auto-rotate').classList.toggle('active',on);});
$('#studio-reset').addEventListener('click',()=>{if(!studio)return;studio.setView('three');studio.controls.autoRotate=false;$('#auto-rotate').setAttribute('aria-pressed','false');$('#auto-rotate').classList.remove('active');$$('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view==='three'));});
$('#studio-fullscreen').hidden=!document.fullscreenEnabled;
$('#studio-fullscreen').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await $('#studio-dialog').requestFullscreen();}catch{toast('Full screen is not available in this browser.');}});
document.addEventListener('keydown',event=>{if(event.key==='/'&&!$$('dialog[open]').length&&!/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)){event.preventDefault();$('#search').focus();$('#collection').scrollIntoView({behavior:motion()});}});
window.addEventListener('hashchange',routeHash);
window.addEventListener('storage',event=>{if(event.key==='motora-garage'){try{const data=JSON.parse(event.newValue||'[]');saved=new Set(Array.isArray(data)?data.filter(id=>cars.some(c=>c.id===id)):[]);updateSaved();renderCollection();}catch{}}});
async function init() {
  try {
    const response=await fetch('./cars.json');if(!response.ok)throw new Error('Catalog unavailable');const data=await response.json();cars=data.cars;brands=data.brands;
    saved=new Set([...saved].filter(id=>cars.some(c=>c.id===id)));
    $('#brand-rail').innerHTML=brands.map(brand=>`<button data-brand="${esc(brand)}" aria-label="Explore 10 ${esc(brand)} cars" aria-pressed="false"><span class="brand-mark ${brand.toLowerCase().replace(/[^a-z]/g,'')}">${brandMark(brand)}</span><small>10 models</small></button>`).join('');
    $('#brand-filter').innerHTML+=[...brands].sort().map(b=>`<option>${esc(b)}</option>`).join('');
    for(const field of ['body','fuel'])$('#'+field+'-filter').innerHTML+=[...new Set(cars.map(c=>c[field]))].sort().map(v=>`<option>${esc(v)}</option>`).join('');
    $$('[data-brand]').forEach(button=>button.addEventListener('click',()=>{state.brand=state.brand===button.dataset.brand?'all':button.dataset.brand;state.saved=false;state.limit=9;$('#brand-filter').value=state.brand;renderCollection();$('#collection').scrollIntoView({behavior:motion()});}));
    updateSaved();renderCollection();routeHash();
  } catch(error) { $('#car-grid').innerHTML=`<div class="empty-state">${icon('reset')}<h3>The collection is taking a moment.</h3><p>Please check your connection and reload the page.</p><button class="button outline" id="reload-catalog">Try again</button></div>`;$('#reload-catalog').addEventListener('click',init);$('#load-more').hidden=true; }
}
init();
