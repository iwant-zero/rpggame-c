(()=>{"use strict";

const VERSION = 'eg-new2';
const BASE_W = 960, BASE_H = 540;

const $ = (id)=>document.getElementById(id);

const dom = {
  stage16: $('stage16'),
  root: $('game-root'),
  uiScale: $('uiScale'),
  verText: $('verText'),
  hpFill: $('hpFill'), hpText: $('hpText'),
  mpFill: $('mpFill'), mpText: $('mpText'),
  goldText: $('goldText'),
  mapText: $('mapText'),
  minimap: $('minimap'),
  joyBase: $('joyBase'),
  joyStick: $('joyStick'),
  joyHint: $('joyHint'),
  btnE: $('btnE'), btn1: $('btn1'), btn2: $('btn2'), btnR: $('btnR'), btnF: $('btnF'), btnAtk: $('btnAtk'),
  btnInv: $('btnInv'), btnShop: $('btnShop'), btnDebug: $('btnDebug'),
  debug: $('debug'),
  shade: $('panelShade'),
  panelInv: $('panelInv'), equipText: $('equipText'), invMeta: $('invMeta'), invList: $('invList'), btnSellAllJunk: $('btnSellAllJunk'), btnCloseInv: $('btnCloseInv'),
  panelShop: $('panelShop'), btnCloseShop: $('btnCloseShop'),
  btnBuyHP: $('btnBuyHP'), btnBuyMP: $('btnBuyMP'), btnUpgrade: $('btnUpgrade'),
  shopHint: $('shopHint'),
  enhanceHint: $('enhanceHint'),
};

dom.verText.textContent = VERSION;

function clamp(v,a,b){ return Math.max(a, Math.min(b,v)); }
function now(){ return performance.now()/1000; }
function dist2(ax,ay,bx,by){ const dx=ax-bx, dy=ay-by; return dx*dx+dy*dy; }

const app = new PIXI.Application({
  width: BASE_W, height: BASE_H, backgroundAlpha: 0,
  antialias: false,
  resolution: Math.min(2, window.devicePixelRatio || 1),
  autoStart: true,
  powerPreference: 'high-performance'
});
dom.root.appendChild(app.view);
app.view.style.position = 'absolute';
app.view.style.left = '0px';
app.view.style.top = '0px';

function resize(){
  const r = dom.stage16.getBoundingClientRect();
  const w = Math.max(1, Math.floor(r.width));
  const h = Math.max(1, Math.floor(r.height));
  app.view.style.width = w+'px';
  app.view.style.height = h+'px';
  const s = Math.min(w/BASE_W, h/BASE_H);
  document.documentElement.style.setProperty('--uiScale', s.toFixed(4));
}
window.addEventListener('resize', resize, {passive:true});
window.addEventListener('orientationchange', resize, {passive:true});
resize();

// world containers
const world = new PIXI.Container();
app.stage.addChild(world);

const layerBg = new PIXI.Container();
const layerEnt = new PIXI.Container();
const layerFx = new PIXI.Container();
world.addChild(layerBg, layerEnt, layerFx);

// simple map definitions (world size bigger than screen)
const MAPS = {
  town: { id:'town', name:'Town', w: 2200, h: 1400, theme: {bg:0x14223c, grid:0x1f2e50}, portals:[
    {to:'hunt', name:'사냥터(일반)', x: 1850, y: 680},
    {to:'cave', name:'사냥터(동굴)', x: 1850, y: 820},
    {to:'ruins', name:'사냥터(유적)', x: 1850, y: 960},
  ], npc:{name:'상인', x: 520, y: 680}},
  hunt: { id:'hunt', name:'Hunt', w: 2600, h: 1700, theme:{bg:0x0f2b1f, grid:0x174434}, portals:[{to:'town', name:'마을', x: 360, y: 860}], mobs:{n:14, hp:40, atk:7, gold:[4,8]} },
  cave: { id:'cave', name:'Cave', w: 2600, h: 1700, theme:{bg:0x1a1a1a, grid:0x2a2a2a}, portals:[{to:'town', name:'마을', x: 360, y: 860}], mobs:{n:16, hp:55, atk:9, gold:[6,12]} },
  ruins:{ id:'ruins',name:'Ruins',w: 2800, h: 1800, theme:{bg:0x241a10, grid:0x3a2a18}, portals:[{to:'town', name:'마을', x: 360, y: 900}], mobs:{n:18, hp:75, atk:11, gold:[9,18]} },
};


// ---------- item templates / equipment ----------
const RARITY = {
  1:{name:'일반', cls:'r1'},
  2:{name:'고급', cls:'r2'},
  3:{name:'희귀', cls:'r3'},
  4:{name:'에픽', cls:'r4'},
};

const TPL = {
  hp_potion: { id:'hp_potion', name:'HP 포션', type:'consumable', rarity:1, price:30, stack:true, healHP:60, sub:'HP +60' },
  mp_potion: { id:'mp_potion', name:'MP 포션', type:'consumable', rarity:1, price:30, stack:true, healMP:40, sub:'MP +40' },
  junk: { id:'junk', name:'잡템', type:'junk', rarity:1, price:8, stack:true, sub:'상점 판매용' },

  wood_blade: { id:'wood_blade', name:'목검', type:'weapon', slot:'weapon', rarity:1, price:60, atk:4, range:0, crit:0.00, sub:'ATK +4' },
  iron_blade: { id:'iron_blade', name:'철검', type:'weapon', slot:'weapon', rarity:2, price:120, atk:7, range:4, crit:0.02, sub:'ATK +7, RANGE +4' },
  rune_blade: { id:'rune_blade', name:'룬블레이드', type:'weapon', slot:'weapon', rarity:3, price:240, atk:11, range:8, crit:0.04, sub:'ATK +11, RANGE +8, CRIT +4%' },
  void_blade: { id:'void_blade', name:'공허의 칼', type:'weapon', slot:'weapon', rarity:4, price:520, atk:16, range:12, crit:0.06, sub:'ATK +16, RANGE +12, CRIT +6%' },

  cloth_armor: { id:'cloth_armor', name:'천 갑옷', type:'armor', slot:'armor', rarity:1, price:60, def:2, hp:10, sub:'DEF +2, HP +10' },
  leather_armor: { id:'leather_armor', name:'가죽 갑옷', type:'armor', slot:'armor', rarity:2, price:140, def:4, hp:18, sub:'DEF +4, HP +18' },
  scale_armor: { id:'scale_armor', name:'비늘 갑옷', type:'armor', slot:'armor', rarity:3, price:280, def:6, hp:28, sub:'DEF +6, HP +28' },
  guardian_armor:{ id:'guardian_armor', name:'수호자 갑주', type:'armor', slot:'armor', rarity:4, price:560, def:9, hp:40, sub:'DEF +9, HP +40' },

  bronze_ring: { id:'bronze_ring', name:'청동 반지', type:'ring', slot:'ring', rarity:1, price:80, crit:0.02, mp:6, sub:'CRIT +2%, MP +6' },
  swift_ring:  { id:'swift_ring', name:'질주의 반지', type:'ring', slot:'ring', rarity:2, price:170, crit:0.03, range:6, sub:'CRIT +3%, RANGE +6' },
  power_ring:  { id:'power_ring', name:'힘의 반지', type:'ring', slot:'ring', rarity:3, price:320, atk:5, crit:0.04, sub:'ATK +5, CRIT +4%' },
  royal_ring:  { id:'royal_ring', name:'왕가의 반지', type:'ring', slot:'ring', rarity:4, price:620, atk:7, def:3, crit:0.05, sub:'ATK +7, DEF +3, CRIT +5%' },
};

function makeItem(tplId){
  const tpl = TPL[tplId];
  if(!tpl) return null;
  return {
    uid: (Math.random().toString(36).slice(2,10) + Date.now().toString(36)).slice(0,16),
    tplId: tpl.id,
    n: 1,
  };
}

const MAP_DIFF = {
  town: { label:'안전', hpMul:1.0, atkMul:1.0, goldMul:1.0, tier:0, dropGear:0.00 },
  hunt: { label:'쉬움', hpMul:0.95, atkMul:0.95, goldMul:0.95, tier:1, dropGear:0.10 },
  cave: { label:'보통', hpMul:1.05, atkMul:1.05, goldMul:1.10, tier:2, dropGear:0.16 },
  ruins:{ label:'어려움',hpMul:1.20, atkMul:1.15, goldMul:1.25, tier:3, dropGear:0.22 },
};

const LOOT = {
  1: { gear: ['wood_blade','cloth_armor','bronze_ring'], rare: ['iron_blade','leather_armor','swift_ring'], epic: [] },
  2: { gear: ['iron_blade','leather_armor','swift_ring','wood_blade','cloth_armor','bronze_ring'],
       rare: ['rune_blade','scale_armor','power_ring'],
       epic: ['void_blade','guardian_armor','royal_ring'] },
  3: { gear: ['rune_blade','scale_armor','power_ring','iron_blade','leather_armor','swift_ring'],
       rare: ['void_blade','guardian_armor','royal_ring'],
       epic: ['void_blade','guardian_armor','royal_ring'] },
};

function rollLoot(tier){
  const t = LOOT[tier] || LOOT[1];
  const r = Math.random();
  if(t.epic.length && r < 0.10) return t.epic[Math.floor(Math.random()*t.epic.length)];
  if(t.rare.length && r < 0.35) return t.rare[Math.floor(Math.random()*t.rare.length)];
  return t.gear[Math.floor(Math.random()*t.gear.length)];
}


const state = {
  map:'town',
  pos:{x: 760, y: 680},

  hp: 120, hpMax: 120,
  mp: 60, mpMax: 60,

  gold: 0,

  equip: { weapon:'wood_blade', armor:'cloth_armor', ring:'bronze_ring' },
  weaponPlus: 0,

  inv: [],
  invMax: 24,
};


const runtime = {
  t: 0,
  keys: new Set(),
  joy: {active:false, dx:0, dy:0, baseX:0, baseY:0},
  rollingUntil: 0,
  portals: [],
  monsters: [],
  drops: [],
};


function uiUpdate(){
  const st = computeStats();
  state.hpMax = st.hpMax;
  state.mpMax = st.mpMax;
  state.hp = Math.min(state.hp, state.hpMax);
  state.mp = Math.min(state.mp, state.mpMax);

  dom.hpFill.style.width = (100*state.hp/state.hpMax).toFixed(1)+'%';
  dom.hpText.textContent = `${Math.floor(state.hp)}/${state.hpMax}`;
  dom.mpFill.style.width = (100*state.mp/state.mpMax).toFixed(1)+'%';
  dom.mpText.textContent = `${Math.floor(state.mp)}/${state.mpMax}`;
  dom.goldText.textContent = String(state.gold);
  dom.mapText.textContent = MAPS[state.map].name;
}
uiUpdate();

// starter items
state.inv.push(makeItem('hp_potion'));
state.inv.push(makeItem('mp_potion'));
state.inv.push(makeItem('junk'));



function computeStats(){
  let atk=0, def=0, hp=0, mp=0, range=0, crit=0.0;
  const w = TPL[state.equip.weapon];
  const a = TPL[state.equip.armor];
  const r = TPL[state.equip.ring];

  for(const it of [w,a,r]){
    if(!it) continue;
    atk += (it.atk||0);
    def += (it.def||0);
    hp  += (it.hp||0);
    mp  += (it.mp||0);
    range += (it.range||0);
    crit += (it.crit||0);
  }

  atk += Math.floor(state.weaponPlus * 1.2);
  range += state.weaponPlus * 1.2;
  crit += Math.min(0.15, state.weaponPlus * 0.004);

  return { atk, def, range, crit, hpMax:120+hp, mpMax:60+mp };
}

// background grid
let bgG = new PIXI.Graphics();
layerBg.addChild(bgG);

function drawBg(){
  const m = MAPS[state.map];
  bgG.clear();
  bgG.beginFill(m.theme.bg, 1);
  bgG.drawRect(0,0,m.w,m.h);
  bgG.endFill();
  // grid
  bgG.lineStyle(1, m.theme.grid, 0.35);
  const step = 80;
  for(let x=0;x<=m.w;x+=step){ bgG.moveTo(x,0); bgG.lineTo(x,m.h); }
  for(let y=0;y<=m.h;y+=step){ bgG.moveTo(0,y); bgG.lineTo(m.w,y); }
  // outer wall
  bgG.lineStyle(6, 0x000000, 0.55);
  bgG.drawRect(0,0,m.w,m.h);
}

const player = new PIXI.Graphics();
player.beginFill(0xffffff,1).drawCircle(0,0,16).endFill();
layerEnt.addChild(player);

const blades = [];
function setBladeCount(n){
  while(blades.length < n){
    const g = new PIXI.Graphics();
    layerEnt.addChild(g);
    blades.push(g);
  }
  while(blades.length > n){
    const g = blades.pop();
    layerEnt.removeChild(g);
    g.destroy();
  }
}
setBladeCount(1);


function drawBlades(){
  const w = TPL[state.equip.weapon];
  const rarity = (w && w.rarity) || 1;
  const color = (rarity===4)?0xff78c8 : (rarity===3)?0xffd06b : (rarity===2)?0x78ffd2 : 0x9bd0ff;
  const size = 8;
  for(const b of blades){
    b.clear();
    b.beginFill(color, 1);
    b.drawCircle(0,0,size);
    b.endFill();
  }
}
drawBlades();

function rebuildPortals(){
  runtime.portals = MAPS[state.map].portals.map(p=>({...p}));
}
rebuildPortals();

let portalG = new PIXI.Graphics();
layerEnt.addChild(portalG);

function drawPortals(){
  portalG.clear();
  for(const p of runtime.portals){
    portalG.lineStyle(3, 0x8fd3ff, 0.9);
    portalG.beginFill(0x2a6f9a, 0.22);
    portalG.drawCircle(p.x, p.y, 22);
    portalG.endFill();
  }
  if(state.map === 'town'){
    const npc = MAPS.town.npc;
    portalG.lineStyle(3, 0xffd06b, 0.9);
    portalG.beginFill(0xffd06b, 0.18);
    portalG.drawRoundedRect(npc.x-18, npc.y-18, 36, 36, 10);
    portalG.endFill();
  }
}
drawPortals();


function respawnMonsters(){
  for(const mo of runtime.monsters){ layerEnt.removeChild(mo.spr); mo.spr.destroy(); }
  runtime.monsters = [];
  if(state.map === 'town') return;

  const m = MAPS[state.map];
  const cfg = m.mobs;
  const diff = MAP_DIFF[state.map] || MAP_DIFF.hunt;

  for(let i=0;i<cfg.n;i++){
    const spr = new PIXI.Graphics();
    const rr = 14 + (i%3)*2;
    spr.beginFill(0x3bff7a, 1).drawCircle(0,0,rr).endFill();
    spr.x = 900 + (i*73)% (m.w-1100);
    spr.y = 420 + (i*97)% (m.h-800);
    layerEnt.addChild(spr);

    runtime.monsters.push({
      spr,
      hp: Math.floor(cfg.hp * diff.hpMul),
      hpMax: Math.floor(cfg.hp * diff.hpMul),
      atk: Math.floor(cfg.atk * diff.atkMul),
      def: (state.map==='ruins') ? 2 : 0,
      gold: [Math.floor(cfg.gold[0]*diff.goldMul), Math.floor(cfg.gold[1]*diff.goldMul)],
      tier: diff.tier,
      dropGear: diff.dropGear,
    });
  }
}
respawnMonsters();


function spawnDrop(x,y, item){
  const spr = new PIXI.Graphics();
  spr.beginFill(0xffd06b, 1).drawCircle(0,0,7).endFill();
  spr.x = x; spr.y = y;
  layerEnt.addChild(spr);
  runtime.drops.push({spr, x, y, item});
}


function floatText(text, x, y){
  const t = new PIXI.Text(text, {fontFamily:'Arial', fontSize:14, fill:0xffffff});
  t.anchor.set(0.5);
  t.x = x; t.y = y;
  layerFx.addChild(t);
  const start = performance.now();
  const dur = 650;
  const y0 = y;
  const tick = ()=>{
    const tt = performance.now()-start;
    if(tt>=dur){
      app.ticker.remove(tick);
      layerFx.removeChild(t);
      t.destroy();
      return;
    }
    t.y = y0 - (tt/1000)*28;
    t.alpha = 1 - (tt/dur);
  };
  app.ticker.add(tick);
}
function burstFx(x,y,color){
  const g = new PIXI.Graphics();
  layerFx.addChild(g);
  const start = performance.now();
  const dur = 360;
  const tick = ()=>{
    const tt = performance.now()-start;
    if(tt>=dur){
      app.ticker.remove(tick);
      layerFx.removeChild(g);
      g.destroy();
      return;
    }
    const p = tt/dur;
    g.clear();
    g.lineStyle(2, color, 0.9*(1-p));
    g.drawCircle(x,y, 8 + p*60);
  };
  app.ticker.add(tick);
}

function moveToMap(id){
  if(!MAPS[id]) return;
  state.map = id;
  // spawn point
  if(id==='town'){ state.pos.x = 760; state.pos.y = 680; }
  else { state.pos.x = 600; state.pos.y = 860; }
  drawBg();
  rebuildPortals();
  drawPortals();
  respawnMonsters();
}
drawBg();

// camera
function cam(){
  const m = MAPS[state.map];
  const cx = clamp(state.pos.x, BASE_W*0.5, m.w-BASE_W*0.5);
  const cy = clamp(state.pos.y, BASE_H*0.5, m.h-BASE_H*0.5);
  world.x = -cx + BASE_W*0.5;
  world.y = -cy + BASE_H*0.5;
}

// input
window.addEventListener('keydown', (e)=>{ runtime.keys.add(String(e.key||'').toLowerCase()); }, {passive:true});
window.addEventListener('keyup', (e)=>{ runtime.keys.delete(String(e.key||'').toLowerCase()); }, {passive:true});

function inputVector(){
  let dx=0, dy=0;
  if(runtime.keys.has('a')||runtime.keys.has('arrowleft')) dx-=1;
  if(runtime.keys.has('d')||runtime.keys.has('arrowright')) dx+=1;
  if(runtime.keys.has('w')||runtime.keys.has('arrowup')) dy-=1;
  if(runtime.keys.has('s')||runtime.keys.has('arrowdown')) dy+=1;

  dx += runtime.joy.dx;
  dy += runtime.joy.dy;

  const len = Math.sqrt(dx*dx+dy*dy);
  if(len>1e-6){
    const inv = 1/Math.max(1, len);
    dx*=inv; dy*=inv;
  }
  return {dx,dy,len};
}

// robust joystick (window capture)
function initJoystick(){
  if(!dom.joyBase || !dom.joyStick) return;
  const base = dom.joyBase;
  const stick = dom.joyStick;

  base.style.touchAction = 'none';

  let active = false;
  let activePointerId = null;
  let activeTouchId = null;
  let MAX = 42;

  function rectCenter(){
    const r = base.getBoundingClientRect();
    MAX = Math.max(28, Math.min(56, Math.floor(Math.min(r.width, r.height) * 0.28)));
    return { cx: r.left + r.width/2, cy: r.top + r.height/2, r };
  }

  function setStick(dx,dy){
    const len = Math.sqrt(dx*dx+dy*dy) || 1;
    const k = Math.min(1, MAX/len);
    const sx = dx*k, sy = dy*k;
    stick.style.transform = `translate(-50%,-50%) translate(${sx}px,${sy}px)`;
    runtime.joy.dx = sx/MAX;
    runtime.joy.dy = sy/MAX;
    dom.joyHint.textContent = `MOVE (${runtime.joy.dx.toFixed(2)},${runtime.joy.dy.toFixed(2)})`;
  }
  function reset(){
    stick.style.transform = 'translate(-50%,-50%)';
    runtime.joy.dx=0; runtime.joy.dy=0;
    dom.joyHint.textContent = 'MOVE';
  }
  function beginAt(clientX, clientY){
    active = true;
    runtime.joy.active = true;
    const c = rectCenter();
    runtime.joy.baseX = c.cx;
    runtime.joy.baseY = c.cy;
    setStick(clientX - runtime.joy.baseX, clientY - runtime.joy.baseY);
  }
  function moveAt(clientX, clientY){
    if(!active) return;
    setStick(clientX - runtime.joy.baseX, clientY - runtime.joy.baseY);
  }
  function end(){
    active=false;
    runtime.joy.active=false;
    activePointerId=null;
    activeTouchId=null;
    reset();
  }
  function inBase(clientX, clientY){
    const r = base.getBoundingClientRect();
    return clientX>=r.left && clientX<=r.right && clientY>=r.top && clientY<=r.bottom;
  }

  function onPointerDown(e){
    if(activePointerId !== null) return;
    if(!inBase(e.clientX, e.clientY)) return;
    activePointerId = e.pointerId ?? 1;
    e.preventDefault();
    beginAt(e.clientX, e.clientY);
  }
  function onPointerMove(e){
    if(activePointerId === null) return;
    if((e.pointerId ?? 1) !== activePointerId) return;
    e.preventDefault();
    moveAt(e.clientX, e.clientY);
  }
  function onPointerUp(e){
    if(activePointerId === null) return;
    if(e.pointerId !== undefined && e.pointerId !== activePointerId) return;
    e.preventDefault();
    end();
  }

  window.addEventListener('pointerdown', onPointerDown, {capture:true, passive:false});
  window.addEventListener('pointermove', onPointerMove, {capture:true, passive:false});
  window.addEventListener('pointerup', onPointerUp, {capture:true, passive:false});
  window.addEventListener('pointercancel', onPointerUp, {capture:true, passive:false});

  function pickTouch(list, id){
    for(let i=0;i<list.length;i++){ if(list[i].identifier===id) return list[i]; }
    return null;
  }
  function onTouchStart(e){
    if(activeTouchId !== null) return;
    const t = e.changedTouches && e.changedTouches[0];
    if(!t) return;
    if(!inBase(t.clientX, t.clientY)) return;
    activeTouchId = t.identifier;
    e.preventDefault();
    beginAt(t.clientX, t.clientY);
  }
  function onTouchMove(e){
    if(activeTouchId === null) return;
    const t = pickTouch(e.changedTouches||[], activeTouchId) || pickTouch(e.touches||[], activeTouchId);
    if(!t) return;
    e.preventDefault();
    moveAt(t.clientX, t.clientY);
  }
  function onTouchEnd(e){
    if(activeTouchId === null) return;
    const t = pickTouch(e.changedTouches||[], activeTouchId);
    if(!t) return;
    e.preventDefault();
    end();
  }
  window.addEventListener('touchstart', onTouchStart, {capture:true, passive:false});
  window.addEventListener('touchmove', onTouchMove, {capture:true, passive:false});
  window.addEventListener('touchend', onTouchEnd, {capture:true, passive:false});
  window.addEventListener('touchcancel', onTouchEnd, {capture:true, passive:false});
}
initJoystick();
renderEquip();
refreshShop();

// actions
function openPanel(panel){
  dom.shade.classList.add('show');
  panel.classList.add('show');
}
function closePanels(){
  dom.shade.classList.remove('show');
  dom.panelInv.classList.remove('show');
  dom.panelShop.classList.remove('show');
}


function invFind(uid){ return state.inv.find(x=>x && x.uid===uid); }
function invRemove(uid){
  const i = state.inv.findIndex(x=>x && x.uid===uid);
  if(i>=0) state.inv.splice(i,1);
}
function equipItem(uid){
  const it = invFind(uid);
  if(!it) return;
  const tpl = TPL[it.tplId];
  if(!tpl || !tpl.slot) return;
  const prevId = state.equip[tpl.slot];
  if(prevId) state.inv.push(makeItem(prevId));
  state.equip[tpl.slot] = tpl.id;
  invRemove(uid);
}
function sellItem(uid){
  const it = invFind(uid);
  if(!it) return;
  const tpl = TPL[it.tplId];
  if(!tpl) return;
  state.gold += (tpl.price||0) * (it.n||1);
  invRemove(uid);
}
function sellAllJunk(){
  let gain=0;
  state.inv = state.inv.filter(it=>{
    if(!it) return false;
    const tpl = TPL[it.tplId];
    if(tpl && tpl.type==='junk'){
      gain += (tpl.price||0) * (it.n||1);
      return false;
    }
    return true;
  });
  state.gold += gain;
  if(dom.shopHint) dom.shopHint.textContent = gain>0 ? `잡템 판매 +${gain}G` : '판매할 잡템이 없습니다.';
}
function useConsumable(uid){
  const it = invFind(uid);
  if(!it) return;
  const tpl = TPL[it.tplId];
  if(!tpl || tpl.type!=='consumable') return;
  if(tpl.healHP) state.hp = Math.min(state.hpMax, state.hp + tpl.healHP);
  if(tpl.healMP) state.mp = Math.min(state.mpMax, state.mp + tpl.healMP);
  if((it.n||1) > 1) it.n -= 1;
  else invRemove(uid);
}

dom.shade.addEventListener('click', closePanels);

dom.btnInv.addEventListener('click', ()=>{ renderEquip(); renderInv(); openPanel(dom.panelInv); }, {passive:true});
dom.btnShop.addEventListener('click', ()=>{ refreshShop(); openPanel(dom.panelShop); }, {passive:true});
dom.btnSellAllJunk.addEventListener('click', (e)=>{ e.preventDefault(); sellAllJunk(); uiUpdate(); renderInv(); }, {passive:false});
dom.btnCloseInv.addEventListener('click', closePanels, {passive:true});
dom.btnCloseShop.addEventListener('click', closePanels, {passive:true});
dom.btnDebug.addEventListener('click', ()=>{
  dom.debug.classList.toggle('on');
}, {passive:true});

// mobile action buttons
function btnTap(btn, fn){
  const handler = (e)=>{ e.preventDefault(); fn(); };
  btn.addEventListener('click', handler, {passive:false});
  btn.addEventListener('touchstart', handler, {passive:false});
}
btnTap(dom.btnE, ()=>interact());
btnTap(dom.btnR, ()=>roll());
btnTap(dom.btnF, ()=>pickup());
btnTap(dom.btn1, ()=>skill1());
btnTap(dom.btn2, ()=>skill2());
btnTap(dom.btnAtk, ()=>upgradeWeapon());

function roll(){
  runtime.rollingUntil = now() + 0.35;
}
function skill1(){
  // small heal
  if(state.mp >= 10){
    state.mp -= 10;
    state.hp = Math.min(state.hpMax, state.hp + 22);
  }
}
function skill2(){
  // burst: damage nearby
  if(state.mp >= 14){
    state.mp -= 14;
    for(const mo of runtime.monsters){
      if(mo.hp<=0) continue;
      if(dist2(state.pos.x,state.pos.y, mo.spr.x, mo.spr.y) <= 140*140){
        mo.hp -= 18;
      }
    }
  }
}
function interact(){
  const px=state.pos.x, py=state.pos.y;
  // shop npc
  if(state.map==='town'){
    const npc = MAPS.town.npc;
    if(dist2(px,py,npc.x,npc.y) <= 90*90){
      refreshShop();
      openPanel(dom.panelShop);
      return;
    }
  }
  // portal
  for(const p of runtime.portals){
    if(dist2(px,py,p.x,p.y) <= 90*90){
      moveToMap(p.to);
      uiUpdate();
      return;
    }
  }
  dom.shopHint.textContent = "근처에 상호작용 대상이 없습니다.";
}

function pickup(){
  const px=state.pos.x, py=state.pos.y;
  let best=null, bestD=1e18;
  for(const d of runtime.drops){
    const dd=dist2(px,py,d.x,d.y);
    if(dd<bestD){ bestD=dd; best=d; }
  }
  if(!best || bestD>120*120) return;

  const tpl = TPL[best.item.tplId];
  if(!tpl) return;

  if(tpl.stack){
    const ex = state.inv.find(it=>it && it.tplId===tpl.id);
    if(ex) ex.n = (ex.n||1) + 1;
    else{
      if(state.inv.length >= state.invMax) return;
      state.inv.push(best.item);
    }
  }else{
    if(state.inv.length >= state.invMax) return;
    state.inv.push(best.item);
  }

  layerEnt.removeChild(best.spr);
  best.spr.destroy();
  runtime.drops = runtime.drops.filter(x=>x!==best);

  renderInv();
}

function upgradeWeapon(){
  const cost = enhanceCost();
  const rate = enhanceRate();
  if(state.gold < cost){
    dom.shopHint.textContent = `골드 부족 (${state.gold}/${cost})`;
    return;
  }
  state.gold -= cost;

  const ok = Math.random() < rate;
  if(ok){
    state.weaponPlus += 1;
    setBladeCount(1 + state.weaponPlus);
    drawBlades();
    burstFx(state.pos.x, state.pos.y, 0x8fd3ff);
    floatText(`강화 성공! +${state.weaponPlus}`, state.pos.x, state.pos.y-28);
    dom.shopHint.textContent = `강화 성공! +${state.weaponPlus} (블레이드 ${1+state.weaponPlus}개)`;
  } else {
    burstFx(state.pos.x, state.pos.y, 0xff5b5b);
    floatText('강화 실패', state.pos.x, state.pos.y-28);
    dom.shopHint.textContent = `강화 실패… (소모: ${cost}G)`;
  }
  uiUpdate();
  renderEquip();
  renderInv();
}

function rarityBadge(tpl){
  const r = RARITY[tpl.rarity] || RARITY[1];
  return `<span class="badge ${r.cls}">${r.name}</span>`;
}
function slotName(slot){
  return slot==='weapon'?'무기' : slot==='armor'?'방어구' : '링';
}
function renderEquip(){
  const w = TPL[state.equip.weapon];
  const a = TPL[state.equip.armor];
  const r = TPL[state.equip.ring];
  const st = computeStats();
  const lines = [];
  lines.push(`무기: ${w? w.name:'—'} ${w?rarityBadge(w):''} (+${state.weaponPlus})`);
  lines.push(`방어구: ${a? a.name:'—'} ${a?rarityBadge(a):''}`);
  lines.push(`링: ${r? r.name:'—'} ${r?rarityBadge(r):''}`);
  lines.push(`스탯: ATK ${st.atk} / DEF ${st.def} / RANGE ${Math.floor(st.range)} / CRIT ${(st.crit*100).toFixed(1)}%`);
  dom.equipText.innerHTML = lines.join('<br/>');
}
function renderInv(){
  dom.invMeta.textContent = `가방: ${state.inv.length}/${state.invMax} · GOLD ${state.gold}`;
  dom.invList.innerHTML = '';
  if(state.inv.length === 0){
    const d = document.createElement('div');
    d.className = 'small';
    d.style.padding = '10px 6px';
    d.textContent = '비어있음';
    dom.invList.appendChild(d);
    return;
  }
  state.inv.forEach((it)=>{
    const tpl = TPL[it.tplId];
    if(!tpl) return;

    const row = document.createElement('div');
    row.className = 'invRow';

    const left = document.createElement('div');
    const nm = document.createElement('div');
    nm.className = 'invName';
    nm.innerHTML = `${tpl.name} ${rarityBadge(tpl)} ${it.n>1?`×${it.n}`:''}`;
    const sub = document.createElement('div');
    sub.className = 'invSub';
    sub.textContent = tpl.sub || '';
    left.appendChild(nm);
    left.appendChild(sub);

    const right = document.createElement('div');
    right.className = 'invBtns';

    if(tpl.type==='weapon' || tpl.type==='armor' || tpl.type==='ring'){
      const b = document.createElement('button');
      b.className = 'btn';
      b.textContent = `${slotName(tpl.slot)} 장착`;
      b.addEventListener('click', (e)=>{
        e.preventDefault();
        equipItem(it.uid);
        renderEquip();
        uiUpdate();
        drawBlades();
        renderInv();
      }, {passive:false});
      right.appendChild(b);
    }

    if(tpl.type==='consumable'){
      const b = document.createElement('button');
      b.className='btn';
      b.textContent='사용';
      b.addEventListener('click', (e)=>{
        e.preventDefault();
        useConsumable(it.uid);
        renderEquip();
        uiUpdate();
        renderInv();
      }, {passive:false});
      right.appendChild(b);
    }

    const sell = document.createElement('button');
    sell.className='btn';
    sell.textContent=`판매(+${tpl.price}G)`;
    sell.addEventListener('click', (e)=>{
      e.preventDefault();
      sellItem(it.uid);
      uiUpdate();
      renderInv();
    }, {passive:false});
    right.appendChild(sell);

    row.appendChild(left);
    row.appendChild(right);
    dom.invList.appendChild(row);
  });
}

function enhanceCost(){
  return Math.floor(60 + state.weaponPlus*55 + Math.max(0, state.weaponPlus-6)*25);
}
function enhanceRate(){
  const p = 1.00 - state.weaponPlus*0.05;
  return clamp(p, 0.35, 1.00);
}
function refreshShop(){
  const cost = enhanceCost();
  const rate = enhanceRate();
  dom.shopHint.textContent = `무기강화 비용: ${cost}G / 현재 +${state.weaponPlus} / 성공확률 ${(rate*100).toFixed(0)}%`;
  if(dom.enhanceHint){
    dom.enhanceHint.textContent = `성공: 블레이드+1 / ATK·RANGE·CRIT 소폭 증가 · 실패: 골드만 소모`;
  }
}
dom.btnBuyHP.addEventListener('click', (e)=>{
  e.preventDefault();
  if(state.gold<30) return;
  state.gold-=30;
  const it = makeItem('hp_potion');
  if(it){
    const ex = state.inv.find(x=>x && x.tplId===it.tplId);
    if(ex) ex.n = (ex.n||1)+1;
    else if(state.inv.length < state.invMax) state.inv.push(it);
  }
  uiUpdate(); refreshInv();
},{passive:false});
dom.btnBuyMP.addEventListener('click', (e)=>{
  e.preventDefault();
  if(state.gold<30) return;
  state.gold-=30;
  const it = makeItem('mp_potion');
  if(it){
    const ex = state.inv.find(x=>x && x.tplId===it.tplId);
    if(ex) ex.n = (ex.n||1)+1;
    else if(state.inv.length < state.invMax) state.inv.push(it);
  }
  uiUpdate(); refreshInv();
},{passive:false});
dom.btnUpgrade.addEventListener('click', (e)=>{ e.preventDefault(); upgradeWeapon(); }, {passive:false});

// minimap
const mm = dom.minimap.getContext('2d');
function drawMinimap(){
  const m = MAPS[state.map];
  mm.clearRect(0,0,dom.minimap.width, dom.minimap.height);
  mm.fillStyle = 'rgba(0,0,0,0.35)';
  mm.fillRect(0,0,dom.minimap.width, dom.minimap.height);

  const pad = 8;
  const w = dom.minimap.width - pad*2;
  const h = dom.minimap.height - pad*2;
  mm.strokeStyle = 'rgba(255,255,255,0.25)';
  mm.lineWidth = 2;
  mm.strokeRect(pad,pad,w,h);

  const sx = w / m.w;
  const sy = h / m.h;

  function px(x){ return pad + x*sx; }
  function py(y){ return pad + y*sy; }

  // portals
  mm.fillStyle = 'rgba(143,211,255,0.9)';
  for(const p of runtime.portals){
    mm.beginPath(); mm.arc(px(p.x),py(p.y),3.2,0,Math.PI*2); mm.fill();
  }
  // npc
  if(state.map==='town'){
    const npc = MAPS.town.npc;
    mm.fillStyle='rgba(255,208,107,0.95)';
    mm.fillRect(px(npc.x)-2.5, py(npc.y)-2.5, 5, 5);
  }

  // monsters
  mm.fillStyle = 'rgba(59,255,122,0.85)';
  for(const mo of runtime.monsters){
    if(mo.hp<=0) continue;
    mm.fillRect(px(mo.spr.x)-2, py(mo.spr.y)-2, 4, 4);
  }

  // player
  mm.fillStyle='rgba(255,255,255,0.95)';
  mm.beginPath(); mm.arc(px(state.pos.x),py(state.pos.y),4.2,0,Math.PI*2); mm.fill();
}

// update loop
let last = performance.now();
app.ticker.add(()=>{
  const t = performance.now();
  const dt = clamp((t-last)/1000, 0.001, 0.05);
  last = t;
  runtime.t = now();

  const iv = inputVector();
  let spd = (runtime.rollingUntil > runtime.t) ? 380 : 190;
  state.pos.x += iv.dx * spd * dt;
  state.pos.y += iv.dy * spd * dt;

  // bounds
  const m = MAPS[state.map];
  state.pos.x = clamp(state.pos.x, 24, m.w-24);
  state.pos.y = clamp(state.pos.y, 24, m.h-24);

  // blades orbit
  const n = blades.length;
  const statsRange = 64;
  const angBase = runtime.t * 4.2;
  for(let i=0;i<n;i++){
    const ang = angBase + i*(Math.PI*2/n);
    const r = statsRange;
    blades[i].x = state.pos.x + Math.cos(ang)*r;
    blades[i].y = state.pos.y + Math.sin(ang)*r;
  }

  // hit monsters
  for(let i=0;i<n;i++){
    const bx=blades[i].x, by=blades[i].y;
    for(const mo of runtime.monsters){
      if(mo.hp<=0) continue;
      if(dist2(bx,by,mo.spr.x,mo.spr.y) <= 22*22){
        mo.hp -= 10 + state.weaponPlus*1.2;
        if(mo.hp<=0){
          mo.hp=0;
          
// reward (gold)
const g = mo.gold[0] + ((mo.spr.x + mo.spr.y + i*7) % (mo.gold[1]-mo.gold[0]+1));
state.gold += Math.floor(g);

// loot
if(Math.random() < (mo.dropGear||0)){
  const tplId = rollLoot(mo.tier||1);
  const it = makeItem(tplId);
  if(it) spawnDrop(mo.spr.x, mo.spr.y, it);
}else{
  if(Math.random() < 0.45){
    const it = makeItem('junk');
    if(it) spawnDrop(mo.spr.x, mo.spr.y, it);
  }
}

// hide monster
mo.spr.visible=false;
        }
      }
    }
  }

  // update sprites
  player.x = state.pos.x;
  player.y = state.pos.y;

  // simple monster chase in hunt maps
  if(state.map!=='town'){
    for(const mo of runtime.monsters){
      if(mo.hp<=0) continue;
      const dx = state.pos.x - mo.spr.x;
      const dy = state.pos.y - mo.spr.y;
      const len = Math.sqrt(dx*dx+dy*dy) || 1;
      const mv = 42 * dt;
      mo.spr.x += (dx/len)*mv;
      mo.spr.y += (dy/len)*mv;
    }
  }

  cam();
  uiUpdate();
  drawMinimap();

  if(dom.debug.classList.contains('on')){
    dom.debug.textContent =
      `VER ${VERSION}\nMAP ${state.map}\nJOY dx=${runtime.joy.dx.toFixed(2)} dy=${runtime.joy.dy.toFixed(2)} act=${runtime.joy.active}\nPOS ${state.pos.x.toFixed(0)},${state.pos.y.toFixed(0)}\nPLUS +${state.weaponPlus} BLADES ${blades.length}\nDROPS ${runtime.drops.length}`;
  }
});

})();
