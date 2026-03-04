(()=>{"use strict";

const VERSION = 'eg-new4-d4-bossbox2';
const BASE_W = 960, BASE_H = 540;

const $ = (id)=>document.getElementById(id);

function clamp(v,a,b){ return Math.max(a, Math.min(b,v)); }


function dist2(ax,ay,bx,by){ const dx=ax-bx, dy=ay-by; return dx*dx+dy*dy; }
function now(){ return (performance && performance.now ? performance.now() : Date.now())/1000; }
const dom = {
  stage16: $('stage16'),
  root: $('game-root'),
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
  btnInv: $('btnInv'), btnShop: $('btnShop'), btnDebug: $('btnDebug'), btnBgm: $('btnBgm'),

  debug: $('debug'),
  shade: $('panelShade'),

  panelInv: $('panelInv'), equipText: $('equipText'), invMeta: $('invMeta'), invList: $('invList'),
  btnSellAllJunk: $('btnSellAllJunk'), btnCloseInv: $('btnCloseInv'),

  panelShop: $('panelShop'), btnCloseShop: $('btnCloseShop'),
  btnBuyHP: $('btnBuyHP'), btnBuyMP: $('btnBuyMP'), btnBuyProtect: $('btnBuyProtect'), btnUpgrade: $('btnUpgrade'),
  shopHint: $('shopHint'), enhanceHint: $('enhanceHint'),

  bgm: $('bgm'),
  bgmToggle: $('bgmToggle'),
  bgmVol: $('bgmVol'),
  bgmVolText: $('bgmVolText'),
  bgmHint: $('bgmHint'),
};

dom.verText.textContent = VERSION;

// ---------- BGM (assets/bgm/track1.mp3 ~ track10.mp3, 순차 순환) ----------
const BGM_FILES = Array.from({length: 10}, (_,i)=>`track${i+1}.mp3`);
// Pages 루트(/)와 /rpggame-c/ 둘 다에서 동작하게 폴백 경로를 둔다.
const IS_SUBDIR = (typeof location!=='undefined') && String(location.pathname||'').includes('/rpggame-c/');
const BGM_BASES = IS_SUBDIR ? ['../assets/bgm/', './assets/bgm/'] : ['./assets/bgm/', '../assets/bgm/'];

const bgmState = {
  on: false,
  vol: 0.40,
  triedAuto: false,
  idx: 0,          // 0..9
  failCycle: 0,    // 연속 실패(파일 없음 등) 카운터
  base: 0,         // 0..BGM_BASES.length-1
};

function bgmTrackLabel(){ return `track${bgmState.idx+1}`; }
function bgmUrlFor(){
  const base = BGM_BASES[Math.max(0, Math.min(BGM_BASES.length-1, bgmState.base))];
  return base + BGM_FILES[bgmState.idx];
}

function bgmLoadPrefs(){
  try{
    const on = localStorage.getItem('eg_bgm_on');
    const vol = localStorage.getItem('eg_bgm_vol');
    const idx = localStorage.getItem('eg_bgm_idx');
    const base = localStorage.getItem('eg_bgm_base');

    if(on === '1') bgmState.on = true;

    if(vol !== null){
      const v = clamp(parseInt(vol,10)/100, 0, 1);
      if(!Number.isNaN(v)) bgmState.vol = v;
    }
    if(idx !== null){
      const n = parseInt(idx, 10);
      if(Number.isFinite(n)) bgmState.idx = clamp(n, 0, BGM_FILES.length-1);
    }
    if(base !== null){
      const b = parseInt(base, 10);
      if(Number.isFinite(b)) bgmState.base = clamp(b, 0, BGM_BASES.length-1);
    }
  }catch(_){}
}
function bgmSavePrefs(){
  try{
    localStorage.setItem('eg_bgm_on', bgmState.on ? '1' : '0');
    localStorage.setItem('eg_bgm_vol', String(Math.round(bgmState.vol*100)));
    localStorage.setItem('eg_bgm_idx', String(bgmState.idx));
    localStorage.setItem('eg_bgm_base', String(bgmState.base));
  }catch(_){}
}

function bgmApplyVolume(){
  if(dom.bgm) dom.bgm.volume = clamp(bgmState.vol, 0, 1);
  if(dom.bgmVol) dom.bgmVol.value = String(Math.round(bgmState.vol*100));
  if(dom.bgmVolText) dom.bgmVolText.textContent = `${Math.round(bgmState.vol*100)}%`;
}

function bgmUpdateUI(){
  if(dom.bgmToggle){
    dom.bgmToggle.textContent = bgmState.on ? `ON ${bgmState.idx+1}/${BGM_FILES.length}` : 'OFF';
  }
  if(dom.btnBgm) dom.btnBgm.textContent = bgmState.on ? '🎵' : '🔇';
  if(dom.bgmHint){
    dom.bgmHint.textContent = bgmState.on
      ? `BGM: ON (${bgmTrackLabel()} / ${BGM_FILES.length})`
      : `BGM: OFF (track1~track${BGM_FILES.length})`;
  }
}

function bgmSetSrc(){
  if(!dom.bgm) return;
  dom.bgm.src = bgmUrlFor();
  try{ dom.bgm.load(); }catch(_){}
}

function bgmStop(){
  if(!dom.bgm) return;
  try{ dom.bgm.pause(); }catch(_){}
  try{ dom.bgm.currentTime = 0; }catch(_){}
}

function bgmTryPlay(userGesture){
  if(!dom.bgm) return;
  bgmApplyVolume();
  bgmSetSrc();
  const p = dom.bgm.play();
  if(p && p.catch){
    p.catch(()=>{
      // 모바일/인앱 autoplay 차단 가능
      bgmState.triedAuto = true;
      if(dom.bgmHint){
        dom.bgmHint.textContent = userGesture
          ? `재생이 차단됐습니다. 화면을 한 번 더 터치/클릭해 주세요. (${bgmTrackLabel()})`
          : `자동재생이 차단됐습니다. 화면을 터치하면 재생됩니다. (${bgmTrackLabel()})`;
      }
    });
  }
}

function bgmAdvance(reason){
  if(!bgmState.on) return;

  if(reason === 'error'){
    bgmState.failCycle += 1;
  }else{
    bgmState.failCycle = 0;
  }

  bgmState.idx = (bgmState.idx + 1) % BGM_FILES.length;

  // 10곡 모두 실패하면(폴더 위치가 다른 경우 포함) 폴백 경로로 전환
  if(bgmState.failCycle >= BGM_FILES.length){
    bgmState.failCycle = 0;
    if(bgmState.base < BGM_BASES.length - 1){
      bgmState.base += 1;
      bgmState.idx = 0;
    }else{
      // 전부 실패: OFF
      bgmState.on = false;
      bgmSavePrefs();
      bgmStop();
      bgmUpdateUI();
      return;
    }
  }

  bgmSavePrefs();
  bgmUpdateUI();
  bgmTryPlay(false);
}

function bgmSet(on, userGesture){
  bgmState.on = !!on;
  bgmSavePrefs();
  bgmUpdateUI();

  if(!bgmState.on){
    bgmStop();
    return;
  }
  bgmTryPlay(!!userGesture);
}

function bgmInit(){
  bgmLoadPrefs();
  bgmApplyVolume();
  bgmUpdateUI();

  if(dom.bgm){
    dom.bgm.addEventListener('ended', ()=>bgmAdvance('ended'));
    dom.bgm.addEventListener('error', ()=>bgmAdvance('error'));
  }

  // 최초 자동 재생은 브라우저 정책상 막힐 수 있음 → ON 상태였으면 시도만 해봄
  if(bgmState.on) bgmSet(true, false);

  // 볼륨 슬라이더
  if(dom.bgmVol){
    const onVol = ()=>{
      bgmState.vol = clamp(parseInt(dom.bgmVol.value,10)/100, 0, 1);
      bgmApplyVolume();
      bgmSavePrefs();
    };
    dom.bgmVol.addEventListener('input', onVol);
    dom.bgmVol.addEventListener('change', onVol);
  }

  // 패널 토글(OFF/ON)
  if(dom.bgmToggle){
    dom.bgmToggle.addEventListener('click', (e)=>{ e.preventDefault(); bgmSet(!bgmState.on, true); }, {passive:false});
    dom.bgmToggle.addEventListener('touchstart', (e)=>{ e.preventDefault(); bgmSet(!bgmState.on, true); }, {passive:false});
  }

  // 상단 아이콘 토글
  if(dom.btnBgm){
    dom.btnBgm.addEventListener('click', (e)=>{ e.preventDefault(); bgmSet(!bgmState.on, true); }, {passive:false});
    dom.btnBgm.addEventListener('touchstart', (e)=>{ e.preventDefault(); bgmSet(!bgmState.on, true); }, {passive:false});
  }

  // 페이지가 숨겨지면 일단 정지(모바일 배터리/인앱 대응)
  document.addEventListener('visibilitychange', ()=>{
    if(document.hidden) bgmStop();
    else if(!document.hidden && bgmState.on){
      // 복귀 시 재생은 사용자 제스처가 필요할 수 있음
      bgmSet(true, false);
    }
  });
}


// init
bgmInit();

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
  protect_scroll:{ id:'protect_scroll', name:'강화 보호권', type:'consumable', rarity:2, price:80, stack:true, protect:true, sub:'강화 실패 시 단계하락 1회 방지' },
  hero_box:    { id:'hero_box', name:'영웅 확률 +@ 상자', type:'consumable', rarity:4, price:0, stack:true, box:true, sub:'사용 시 장비 1개 획득 (영웅 확률 상승)' },
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

function genOptions(tpl){
  const r = tpl.rarity || 1;
  const maxLines = (r>=3)?2:1;
  const want = (r>=2)? (Math.random()<0.70 ? 1 : 2) : (Math.random()<0.55 ? 1 : 0);
  const cnt = Math.min(maxLines, want);

  const pool = [];
  if(tpl.type==='weapon'){
    pool.push(['atk','공격력',[1,2+r]]);
    pool.push(['crit','치명',[0.005,0.010+r*0.004]]);
    pool.push(['range','사거리',[2,4+r*2]]);
  }else if(tpl.type==='armor'){
    pool.push(['def','방어',[1,2+r]]);
    pool.push(['hp','체력',[6,10+r*8]]);
    pool.push(['mp','마나',[3,5+r*4]]);
  }else if(tpl.type==='ring'){
    pool.push(['crit','치명',[0.006,0.012+r*0.004]]);
    pool.push(['atk','공격력',[1,2+r]]);
    pool.push(['mp','마나',[4,6+r*5]]);
    pool.push(['range','사거리',[2,4+r*2]]);
  }else return [];

  for(let i=pool.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    const t=pool[i]; pool[i]=pool[j]; pool[j]=t;
  }

  const out=[];
  for(let i=0;i<cnt;i++){
    const [k,label,[a,b]] = pool[i];
    let v;
    if(k==='crit'){
      v = a + Math.random()*(b-a);
      v = Math.round(v*1000)/1000;
    }else{
      v = Math.floor(a + Math.random()*(b-a+1));
    }
    out.push({k,label,v});
  }
  return out;
}

function makeItem(tplId){
  const tpl = TPL[tplId];
  if(!tpl) return null;
  const it = {
    uid: (Math.random().toString(36).slice(2,10) + Date.now().toString(36)).slice(0,16),
    tplId: tpl.id,
    n: 1,
  };
  if(!tpl.stack && (tpl.type==='weapon'||tpl.type==='armor'||tpl.type==='ring')){
    it.opt = genOptions(tpl);
  }
  return it;
}

// ---------- maps / difficulty ----------
const MAPS = {
  town: { id:'town', name:'마을', w: 2200, h: 1400, theme: {bg:0x14223c, grid:0x1f2e50}, portals:[
    {to:'hunt', name:'일반 사냥터', x: 1850, y: 640},
    {to:'cave', name:'동굴 사냥터', x: 1850, y: 780},
    {to:'ruins', name:'유적 사냥터', x: 1850, y: 920},
    {to:'abyss', name:'심연 사냥터', x: 1850, y: 1060},
  ], npc:{name:'상점', x: 520, y: 680}},
  hunt: { id:'hunt', name:'일반 사냥터', w: 2600, h: 1700, theme:{bg:0x0f2b1f, grid:0x174434}, portals:[{to:'town', name:'마을', x: 360, y: 860}],
    mobs:{n:14, hp:40, atk:7, gold:[4,8], color:0x3bff7a, def:0} },
  cave: { id:'cave', name:'동굴 사냥터', w: 2600, h: 1700, theme:{bg:0x1a1a1a, grid:0x2a2a2a}, portals:[{to:'town', name:'마을', x: 360, y: 860}],
    mobs:{n:16, hp:55, atk:9, gold:[6,12], color:0x9bd0ff, def:1} },
  ruins:{ id:'ruins',name:'유적 사냥터',w: 2800, h: 1800, theme:{bg:0x241a10, grid:0x3a2a18}, portals:[{to:'town', name:'마을', x: 360, y: 900}],
    mobs:{n:18, hp:75, atk:11, gold:[9,18], color:0xffb44d, def:2} },
  abyss:{ id:'abyss',name:'심연 사냥터',w: 3000, h: 1900, theme:{bg:0x0a0f1f, grid:0x1b2b55}, portals:[{to:'town', name:'마을', x: 380, y: 940}],
    mobs:{n:20, hp:95, atk:14, gold:[14,26], color:0xc87aff, def:3} },
};

const MAP_DIFF = {
  town: { label:'안전', hpMul:1.0, atkMul:1.0, goldMul:1.0, tier:0, dropGear:0.00 },
  hunt: { label:'쉬움', hpMul:0.95, atkMul:0.95, goldMul:0.95, tier:1, dropGear:0.10 },
  cave: { label:'보통', hpMul:1.05, atkMul:1.05, goldMul:1.10, tier:2, dropGear:0.16 },
  ruins:{ label:'어려움',hpMul:1.20, atkMul:1.15, goldMul:1.25, tier:3, dropGear:0.22 },
  abyss:{ label:'매우 어려움', hpMul:1.35, atkMul:1.25, goldMul:1.45, tier:4, dropGear:0.30 },
};

const LOOT = {
  1: { gear: ['wood_blade','cloth_armor','bronze_ring'], rare: ['iron_blade','leather_armor','swift_ring'], epic: [] },
  2: { gear: ['iron_blade','leather_armor','swift_ring','wood_blade','cloth_armor','bronze_ring'],
       rare: ['rune_blade','scale_armor','power_ring'],
       epic: ['void_blade','guardian_armor','royal_ring'] },
  3: { gear: ['rune_blade','scale_armor','power_ring','iron_blade','leather_armor','swift_ring'],
       rare: ['void_blade','guardian_armor','royal_ring'],
       epic: ['void_blade','guardian_armor','royal_ring'] },
  4: { gear: ['void_blade','guardian_armor','royal_ring','rune_blade','scale_armor','power_ring'],
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

function rollBossBoxLoot(tier){
  const t = LOOT[tier] || LOOT[1];
  const hasEpic = t.epic && t.epic.length;
  const hasRare = t.rare && t.rare.length;
  const hasGear = t.gear && t.gear.length;
  const r = Math.random();
  const epicP = hasEpic ? 0.35 : 0.0;
  const rareP = hasRare ? (hasEpic ? 0.50 : 0.65) : 0.0; // 누적 확률용
  if(hasEpic && r < epicP) return t.epic[Math.floor(Math.random()*t.epic.length)];
  if(hasRare && r < epicP + rareP) return t.rare[Math.floor(Math.random()*t.rare.length)];
  if(hasGear) return t.gear[Math.floor(Math.random()*t.gear.length)];
  return (LOOT[1].gear[0] || 'wood_blade');
}

function grantItemToInv(item){
  const tpl = item && TPL[item.tplId];
  if(!tpl) return false;

  if(tpl.stack){
    const ex = state.inv.find(it=>it && it.tplId===tpl.id);
    if(ex) ex.n = (ex.n||1) + (item.n||1);
    else{
      if(state.inv.length >= state.invMax) return false;
      state.inv.push(item);
    }
    return true;
  }

  if(state.inv.length >= state.invMax) return false;
  state.inv.push(item);
  return true;
}

function openHeroBox(it){
  const tier = (it && (it.boxTier||it.tier||it.bossTier)) || 2;
  const tplId = rollBossBoxLoot(clamp(tier,1,4));
  const loot = makeItem(tplId);
  if(!loot) return false;

  const ok = grantItemToInv(loot);
  if(ok){
    const nm = (TPL[loot.tplId] && TPL[loot.tplId].name) ? TPL[loot.tplId].name : loot.tplId;
    floatText(`상자 개봉: ${nm}`, state.pos.x, state.pos.y-28);
    burstFx(state.pos.x, state.pos.y, 0xffd06b);
  }else{
    floatText('가방이 가득 찼습니다.', state.pos.x, state.pos.y-28);
  }
  return ok;
}

// ---------- state ----------
const state = {
  map:'town',
  pos:{x: 760, y: 680},
  hp: 120, hpMax: 120,
  mp: 60, mpMax: 60,
  gold: 0,

  equip: { weapon:'wood_blade', armor:'cloth_armor', ring:'bronze_ring' },
  eopt: { weapon:[], armor:[], ring:[] },

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

  bossSpawned: false,
  bossDefeated: false,

  hitCdUntil: 0,
  invulnUntil: 0,

  dead: false,
  deadUntil: 0,
};

function computeStats(){
  let atk=0, def=0, hp=0, mp=0, range=0, crit=0.0;
  const apply = (tpl, opt)=>{
    if(!tpl) return;
    atk += tpl.atk||0; def += tpl.def||0; hp += tpl.hp||0; mp += tpl.mp||0; range += tpl.range||0; crit += tpl.crit||0;
    if(Array.isArray(opt)){
      for(const o of opt){
        if(!o) continue;
        if(o.k==='atk') atk += o.v||0;
        else if(o.k==='def') def += o.v||0;
        else if(o.k==='hp') hp += o.v||0;
        else if(o.k==='mp') mp += o.v||0;
        else if(o.k==='range') range += o.v||0;
        else if(o.k==='crit') crit += o.v||0;
      }
    }
  };
  apply(TPL[state.equip.weapon], state.eopt.weapon);
  apply(TPL[state.equip.armor], state.eopt.armor);
  apply(TPL[state.equip.ring], state.eopt.ring);

  atk += Math.floor(state.weaponPlus * 1.2);
  range += state.weaponPlus * 1.2;
  crit += Math.min(0.15, state.weaponPlus * 0.004);

  return { atk, def, range, crit, hpMax:120+hp, mpMax:60+mp };
}

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

  const diff = MAP_DIFF[state.map] || MAP_DIFF.hunt;
  dom.mapText.textContent = `${MAPS[state.map].name} (${diff.label})`;
}

function rarityBadge(tpl){
  const r = RARITY[tpl.rarity] || RARITY[1];
  return `<span class="badge ${r.cls}">${r.name}</span>`;
}
function slotName(slot){
  return slot==='weapon'?'무기' : slot==='armor'?'방어구' : '링';
}
function fmtOpt(opt){
  if(!opt || !opt.length) return '옵션 없음';
  return opt.map(o=>{
    if(o.k==='crit') return `${o.label} +${(o.v*100).toFixed(1)}%`;
    return `${o.label} +${o.v}`;
  }).join(' · ');
}
function renderEquip(){
  const w = TPL[state.equip.weapon];
  const a = TPL[state.equip.armor];
  const r = TPL[state.equip.ring];
  const st = computeStats();

  const lines = [];
  lines.push(`무기: ${w? w.name:'—'} ${w?rarityBadge(w):''} (+${state.weaponPlus})`);
  lines.push(`<span class="small">${fmtOpt(state.eopt.weapon)}</span>`);
  lines.push(`방어구: ${a? a.name:'—'} ${a?rarityBadge(a):''}`);
  lines.push(`<span class="small">${fmtOpt(state.eopt.armor)}</span>`);
  lines.push(`링: ${r? r.name:'—'} ${r?rarityBadge(r):''}`);
  lines.push(`<span class="small">${fmtOpt(state.eopt.ring)}</span>`);
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

  for(const it of state.inv){
    const tpl = TPL[it.tplId];
    if(!tpl) continue;

    const row = document.createElement('div');
    row.className = 'invRow';

    const left = document.createElement('div');
    const nm = document.createElement('div');
    nm.className = 'invName';
    nm.innerHTML = `${tpl.name} ${rarityBadge(tpl)} ${it.n>1?`×${it.n}`:''}`;

    const sub = document.createElement('div');
    sub.className = 'invSub';
    const opt = Array.isArray(it.opt) && it.opt.length ? ' / ' + it.opt.map(o=> (o.k==='crit'?`${o.label}+${(o.v*100).toFixed(1)}%`:`${o.label}+${o.v}`)).join(', ') : '';
    sub.textContent = (tpl.sub || '') + opt;

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
        drawBlades();
        uiUpdate();
        renderEquip();
        renderInv();
      }, {passive:false});
      right.appendChild(b);
    }

    if(tpl.type==='consumable' && !tpl.protect){
      const b = document.createElement('button');
      b.className='btn';
      b.textContent='사용';
      b.addEventListener('click', (e)=>{
        e.preventDefault();
        useConsumable(it.uid);
        uiUpdate();
        renderEquip();
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
      renderEquip();
    }, {passive:false});
    right.appendChild(sell);

    row.appendChild(left);
    row.appendChild(right);
    dom.invList.appendChild(row);
  }
}

function openPanel(panel){
  dom.shade.classList.add('show');
  panel.classList.add('show');
}
function closePanels(){
  dom.shade.classList.remove('show');
  dom.panelInv.classList.remove('show');
  dom.panelShop.classList.remove('show');
}

// inventory operations
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

  const slot = tpl.slot;
  const prevId = state.equip[slot];
  const prevOpt = state.eopt[slot] || [];
  if(prevId){
    const back = makeItem(prevId);
    if(back){
      back.opt = Array.isArray(prevOpt) ? prevOpt.slice() : [];
      state.inv.push(back);
    }
  }

  state.equip[slot] = tpl.id;
  state.eopt[slot] = Array.isArray(it.opt) ? it.opt.slice() : [];
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
    const tpl = it && TPL[it.tplId];
    if(tpl && tpl.type==='junk'){
      gain += (tpl.price||0) * (it.n||1);
      return false;
    }
    return true;
  });
  state.gold += gain;
  dom.shopHint.textContent = gain>0 ? `잡템 판매 +${gain}G` : '판매할 잡템이 없습니다.';
}
function useConsumable(uid){
  const it = invFind(uid);
  if(!it) return;
  const tpl = TPL[it.tplId];
  if(!tpl || tpl.type!=='consumable') return;

  // hero box
  if(tpl.box || tpl.id==='hero_box'){
    const ok = openHeroBox(it);
    if(!ok) return; // 가방이 가득하면 소비하지 않음
    if((it.n||1) > 1) it.n -= 1;
    else invRemove(uid);
    return;
  }

  if(tpl.healHP) state.hp = Math.min(state.hpMax, state.hp + tpl.healHP);
  if(tpl.healMP) state.mp = Math.min(state.mpMax, state.mp + tpl.healMP);

  if((it.n||1) > 1) it.n -= 1;
  else invRemove(uid);
}
function consumeProtect(){
  const it = state.inv.find(x=>x && x.tplId==='protect_scroll' && (x.n||1)>0);
  if(!it) return false;
  if((it.n||1)>1) it.n -= 1;
  else invRemove(it.uid);
  return true;
}

// ---------- PIXI app ----------
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

// world layers
const world = new PIXI.Container();
app.stage.addChild(world);
const layerBg = new PIXI.Container();
const layerEnt = new PIXI.Container();
const layerFx = new PIXI.Container();
world.addChild(layerBg, layerEnt, layerFx);

let bgG = new PIXI.Graphics();
layerBg.addChild(bgG);

function drawBg(){
  const m = MAPS[state.map];
  bgG.clear();
  bgG.beginFill(m.theme.bg, 1);
  bgG.drawRect(0,0,m.w,m.h);
  bgG.endFill();

  bgG.lineStyle(1, m.theme.grid, 0.35);
  const step = 80;
  for(let x=0;x<=m.w;x+=step){ bgG.moveTo(x,0); bgG.lineTo(x,m.h); }
  for(let y=0;y<=m.h;y+=step){ bgG.moveTo(0,y); bgG.lineTo(m.w,y); }

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
function drawBlades(){
  const w = TPL[state.equip.weapon];
  const rarity = w?.rarity || 1;
  const color = (rarity===4)?0xff78c8 : (rarity===3)?0xffd06b : (rarity===2)?0x78ffd2 : 0x9bd0ff;
  const size = 8;
  for(const b of blades){
    b.clear();
    b.beginFill(color, 1);
    b.drawCircle(0,0,size);
    b.endFill();
  }
}
setBladeCount(1);
drawBlades();

function rebuildPortals(){
  runtime.portals = MAPS[state.map].portals.map(p=>({...p}));
}

let portalG = new PIXI.Graphics();
layerEnt.addChild(portalG);
let labelLayer = new PIXI.Container();
layerEnt.addChild(labelLayer);

function drawPortals(){
  portalG.clear();
  labelLayer.removeChildren().forEach(ch=>ch.destroy && ch.destroy());

  const makeLabel = (txt, x, y, color=0xffffff)=>{
    const t = new PIXI.Text(txt, {fontFamily:'Arial', fontSize:14, fill:color});
    t.anchor.set(0.5, 1.0);
    t.x = x; t.y = y;
    t.alpha = 0.92;
    labelLayer.addChild(t);
  };

  for(const p of runtime.portals){
    portalG.lineStyle(3, 0x8fd3ff, 0.9);
    portalG.beginFill(0x2a6f9a, 0.22);
    portalG.drawCircle(p.x, p.y, 22);
    portalG.endFill();
    makeLabel(p.name, p.x, p.y-26, 0x9bd0ff);
  }

  if(state.map === 'town'){
    const npc = MAPS.town.npc;
    portalG.lineStyle(3, 0xffd06b, 0.9);
    portalG.beginFill(0xffd06b, 0.18);
    portalG.drawRoundedRect(npc.x-18, npc.y-18, 36, 36, 10);
    portalG.endFill();
    makeLabel(npc.name || '상점', npc.x, npc.y-26, 0xffd06b);
  }
}

function floatText(text, x, y){
  const t = new PIXI.Text(text, {fontFamily:'Arial', fontSize:14, fill:0xffffff});
  t.anchor.set(0.5);
  t.x = x; t.y = y;
  layerFx.addChild(t);
  const start = performance.now();
  const dur = 700;
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

function respawnMonsters(){
  for(const mo of runtime.monsters){ layerEnt.removeChild(mo.spr); mo.spr.destroy(); }
  runtime.monsters = [];
  runtime.bossSpawned = false;
  runtime.bossDefeated = false;
  runtime.hitCdUntil = 0;
  if(state.map === 'town') return;

  const m = MAPS[state.map];
  const cfg = m.mobs;
  const diff = MAP_DIFF[state.map] || MAP_DIFF.hunt;

  for(let i=0;i<cfg.n;i++){
    const spr = new PIXI.Graphics();
    const rr = (cfg.r0||14) + (i%3)*2;
    const col = (cfg.color!=null) ? cfg.color : 0x3bff7a;
    spr.beginFill(col, 1).drawCircle(0,0,rr).endFill();
    spr.x = 900 + (i*73)% (m.w-1100);
    spr.y = 420 + (i*97)% (m.h-800);
    layerEnt.addChild(spr);

    runtime.monsters.push({
      spr,
      hp: Math.floor(cfg.hp * diff.hpMul),
      hpMax: Math.floor(cfg.hp * diff.hpMul),
      atk: Math.floor(cfg.atk * diff.atkMul),
      def: (cfg.def||0),
      gold: [Math.floor(cfg.gold[0]*diff.goldMul), Math.floor(cfg.gold[1]*diff.goldMul)],
      tier: diff.tier,
      dropGear: diff.dropGear,
    });
  }
}

function bossPreset(mapId){
  switch(mapId){
    case 'hunt':  return {name:'초록 군주', color:0xFF5B5B, r:30};
    case 'cave':  return {name:'동굴 거수', color:0xFF8FD3, r:32};
    case 'ruins': return {name:'유적 파수꾼', color:0xFFD06B, r:34};
    case 'abyss': return {name:'심연 군주', color:0xC87AFF, r:36};
    default:      return {name:'보스', color:0xFF5B5B, r:32};
  }
}

function spawnBoss(){
  if(state.map==='town') return;
  if(runtime.bossSpawned || runtime.bossDefeated) return;

  const m = MAPS[state.map];
  const cfg = m.mobs;
  const diff = MAP_DIFF[state.map] || MAP_DIFF.hunt;
  const p = bossPreset(state.map);

  const hp = Math.floor((cfg.hp * diff.hpMul) * 7 + 120 + diff.tier*60);
  const atk = Math.floor((cfg.atk * diff.atkMul) * 1.7 + 6 + diff.tier*2);
  const def = Math.floor((cfg.def||0) + diff.tier);

  const spr = new PIXI.Graphics();
  spr.beginFill(p.color, 1).drawCircle(0,0,p.r).endFill();
  spr.lineStyle(3, 0x000000, 0.55).drawCircle(0,0,p.r+1);

  // spawn away from portal
  spr.x = Math.floor(m.w*0.74);
  spr.y = Math.floor(m.h*0.52);
  layerEnt.addChild(spr);

  runtime.monsters.push({
    spr,
    hp, hpMax: hp,
    atk, def,
    gold: [Math.floor(40*diff.goldMul), Math.floor(80*diff.goldMul) + diff.tier*15],
    tier: diff.tier,
    dropGear: 0,
    isBoss: true,
    bossName: p.name,
    mv: 62 + diff.tier*6,
  });

  runtime.bossSpawned = true;
  floatText(`BOSS 출현: ${p.name}`, spr.x, spr.y - (p.r+18));
  burstFx(spr.x, spr.y, 0xffd06b);
}

function spawnDrop(x,y, item){
  const spr = new PIXI.Graphics();
  spr.beginFill(0xffd06b, 1).drawCircle(0,0,7).endFill();
  spr.x = x; spr.y = y;
  layerEnt.addChild(spr);
  runtime.drops.push({spr, x, y, item});
}

function moveToMap(id){
  if(!MAPS[id]) return;
  state.map = id;
  if(id==='town'){ state.pos.x = 760; state.pos.y = 680; }
  else { state.pos.x = 600; state.pos.y = 860; }
  drawBg();
  rebuildPortals();
  drawPortals();
  respawnMonsters();
  uiUpdate();
}

function cam(){
  const m = MAPS[state.map];
  const cx = clamp(state.pos.x, BASE_W*0.5, m.w-BASE_W*0.5);
  const cy = clamp(state.pos.y, BASE_H*0.5, m.h-BASE_H*0.5);
  world.x = -cx + BASE_W*0.5;
  world.y = -cy + BASE_H*0.5;
}

// -------- input --------
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

window.addEventListener('keydown', (e)=>{
  const k = String(e.key||'').toLowerCase();
  runtime.keys.add(k);

  if(e.repeat) return;

  if(k==='e'){ e.preventDefault(); interact(); return; }
  if(k==='f'){ e.preventDefault(); pickup(); return; }
  if(k==='r'){ e.preventDefault(); roll(); return; }
  if(k==='1'){ e.preventDefault(); skill1(); return; }
  if(k==='2'){ e.preventDefault(); skill2(); return; }
  if(k==='i'){ e.preventDefault(); renderEquip(); renderInv(); openPanel(dom.panelInv); return; }
  if(k==='escape'){ closePanels(); return; }
}, {passive:false});
window.addEventListener('keyup', (e)=>{ runtime.keys.delete(String(e.key||'').toLowerCase()); }, {passive:true});

// Joystick: window capture touch+pointer
function initJoystick(){
  if(!dom.joyBase || !dom.joyStick) return;
  const base = dom.joyBase;
  const stick = dom.joyStick;
  base.style.touchAction = 'none';

  let MAX = 42;
  let active = false;
  let pid = null;
  let tid = null;

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
    dom.joyHint.textContent = `MOVE`;
  }
  function reset(){
    stick.style.transform = 'translate(-50%,-50%)';
    runtime.joy.dx=0; runtime.joy.dy=0;
    dom.joyHint.textContent = 'MOVE';
  }
  function beginAt(x,y){
    active = true;
    runtime.joy.active = true;
    const c = rectCenter();
    runtime.joy.baseX = c.cx;
    runtime.joy.baseY = c.cy;
    setStick(x - runtime.joy.baseX, y - runtime.joy.baseY);
  }
  function moveAt(x,y){
    if(!active) return;
    setStick(x - runtime.joy.baseX, y - runtime.joy.baseY);
  }
  function end(){
    active=false;
    runtime.joy.active=false;
    pid=null; tid=null;
    reset();
  }
  function inBase(x,y){
    const r = base.getBoundingClientRect();
    return x>=r.left && x<=r.right && y>=r.top && y<=r.bottom;
  }

  function onPointerDown(e){
    if(pid!==null) return;
    if(!inBase(e.clientX, e.clientY)) return;
    pid = e.pointerId ?? 1;
    e.preventDefault();
    beginAt(e.clientX, e.clientY);
  }
  function onPointerMove(e){
    if(pid===null) return;
    if((e.pointerId ?? 1) !== pid) return;
    e.preventDefault();
    moveAt(e.clientX, e.clientY);
  }
  function onPointerUp(e){
    if(pid===null) return;
    if(e.pointerId!==undefined && e.pointerId!==pid) return;
    e.preventDefault();
    end();
  }
  window.addEventListener('pointerdown', onPointerDown, {capture:true, passive:false});
  window.addEventListener('pointermove', onPointerMove, {capture:true, passive:false});
  window.addEventListener('pointerup', onPointerUp, {capture:true, passive:false});
  window.addEventListener('pointercancel', onPointerUp, {capture:true, passive:false});

  function pickTouch(list, id){
    for(let i=0;i<list.length;i++) if(list[i].identifier===id) return list[i];
    return null;
  }
  function onTouchStart(e){
    if(tid!==null) return;
    const t = e.changedTouches && e.changedTouches[0];
    if(!t) return;
    if(!inBase(t.clientX, t.clientY)) return;
    tid = t.identifier;
    e.preventDefault();
    beginAt(t.clientX, t.clientY);
  }
  function onTouchMove(e){
    if(tid===null) return;
    const t = pickTouch(e.changedTouches||[], tid) || pickTouch(e.touches||[], tid);
    if(!t) return;
    e.preventDefault();
    moveAt(t.clientX, t.clientY);
  }
  function onTouchEnd(e){
    if(tid===null) return;
    const t = pickTouch(e.changedTouches||[], tid);
    if(!t) return;
    e.preventDefault();
    end();
  }
  window.addEventListener('touchstart', onTouchStart, {capture:true, passive:false});
  window.addEventListener('touchmove', onTouchMove, {capture:true, passive:false});
  window.addEventListener('touchend', onTouchEnd, {capture:true, passive:false});
  window.addEventListener('touchcancel', onTouchEnd, {capture:true, passive:false});
}

function btnTap(btn, fn){
  const handler = (e)=>{ e.preventDefault(); fn(); };
  btn.addEventListener('click', handler, {passive:false});
  btn.addEventListener('touchstart', handler, {passive:false});
}

// actions
function roll(){ runtime.rollingUntil = now() + 0.35; }
function skill1(){
  if(state.mp >= 10){
    state.mp -= 10;
    state.hp = Math.min(state.hpMax, state.hp + 22);
  }
}
function skill2(){
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

  if(state.map==='town'){
    const npc = MAPS.town.npc;
    if(dist2(px,py,npc.x,npc.y) <= 110*110){
      refreshShop();
      openPanel(dom.panelShop);
      return;
    }
  }

  for(const p of runtime.portals){
    if(dist2(px,py,p.x,p.y) <= 110*110){
      moveToMap(p.to);
      closePanels();
      return;
    }
  }

  const diff = MAP_DIFF[state.map] || MAP_DIFF.hunt;
  dom.shopHint.textContent = `(${MAPS[state.map].name} / ${diff.label}) 근처에 상호작용 대상이 없습니다.`;
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

// enhancement
function enhanceCost(){
  return Math.floor(60 + state.weaponPlus*55 + Math.max(0, state.weaponPlus-6)*25);
}
function enhanceRate(){
  const p = 0.90 - state.weaponPlus*0.07;
  return clamp(p, 0.20, 0.90);
}
function refreshShop(){
  const cost = enhanceCost();
  const rate = enhanceRate();
  const prot = state.inv.find(x=>x && x.tplId==='protect_scroll');
  const protN = prot ? (prot.n||1) : 0;
  dom.shopHint.textContent = `무기강화 비용: ${cost}G / 현재 +${state.weaponPlus} / 성공확률 ${(rate*100).toFixed(0)}% / 보호권 ${protN}개`;
  dom.enhanceHint.textContent = `성공: 블레이드+1 / ATK·RANGE·CRIT 소폭 증가 · 실패: 단계하락(보호권 1개로 방지 가능)`;
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
  } else {
    let downgraded = false;
    let protectedOk = false;

    // 실패 시: 현재 단계가 1 이상이면 단계 하락(보호권 1개로 1회 방지)
    if(state.weaponPlus > 0){
      protectedOk = consumeProtect();
      if(!protectedOk){
        state.weaponPlus = Math.max(0, state.weaponPlus - 1);
        setBladeCount(1 + state.weaponPlus);
        drawBlades();
        downgraded = true;
      }
    }

    burstFx(state.pos.x, state.pos.y, 0xff5b5b);
    if(protectedOk){
      floatText('강화 실패 (보호권 사용: 단계 유지)', state.pos.x, state.pos.y-28);
    }else if(downgraded){
      floatText(`강화 실패 (단계 하락: +${state.weaponPlus})`, state.pos.x, state.pos.y-28);
    }else{
      floatText('강화 실패', state.pos.x, state.pos.y-28);
    }
  }

  uiUpdate();
  renderEquip();
  renderInv();
  refreshShop();
}

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
  const px = (x)=>pad + x*sx;
  const py = (y)=>pad + y*sy;

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

// ---------- UI bindings ----------
dom.shade.addEventListener('click', closePanels);
dom.btnInv.addEventListener('click', ()=>{ renderEquip(); renderInv(); openPanel(dom.panelInv); }, {passive:true});
dom.btnShop.addEventListener('click', ()=>{ refreshShop(); openPanel(dom.panelShop); }, {passive:true});
dom.btnCloseInv.addEventListener('click', closePanels, {passive:true});
dom.btnCloseShop.addEventListener('click', closePanels, {passive:true});
dom.btnSellAllJunk.addEventListener('click', (e)=>{ e.preventDefault(); sellAllJunk(); uiUpdate(); renderInv(); }, {passive:false});

dom.btnDebug.addEventListener('click', ()=>{ dom.debug.classList.toggle('on'); }, {passive:true});

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
  uiUpdate(); renderInv(); renderEquip();
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
  uiUpdate(); renderInv(); renderEquip();
},{passive:false});

dom.btnBuyProtect.addEventListener('click', (e)=>{
  e.preventDefault();
  if(state.gold<80) return;
  state.gold-=80;
  const it = makeItem('protect_scroll');
  if(it){
    const ex = state.inv.find(x=>x && x.tplId===it.tplId);
    if(ex) ex.n = (ex.n||1)+1;
    else if(state.inv.length < state.invMax) state.inv.push(it);
  }
  uiUpdate(); renderInv(); renderEquip();
},{passive:false});

dom.btnUpgrade.addEventListener('click', (e)=>{ e.preventDefault(); upgradeWeapon(); }, {passive:false});

btnTap(dom.btnE, ()=>interact());
btnTap(dom.btnR, ()=>roll());
btnTap(dom.btnF, ()=>pickup());
btnTap(dom.btn1, ()=>skill1());
btnTap(dom.btn2, ()=>skill2());
btnTap(dom.btnAtk, ()=>upgradeWeapon());

// ---------- start ----------
state.inv.push(makeItem('hp_potion'));
state.inv.push(makeItem('mp_potion'));
state.inv.push(makeItem('junk'));
initJoystick();

moveToMap('town');
uiUpdate();
refreshShop();
renderEquip();
renderInv();

// update loop
let last = performance.now();
app.ticker.add(()=>{
  const t = performance.now();
  const dt = clamp((t-last)/1000, 0.001, 0.05);
  last = t;
  runtime.t = now();

  // town regen (safe zone)
  if(state.map==='town' && !runtime.dead){
    state.hp = Math.min(state.hpMax, state.hp + state.hpMax*0.015*dt);
    state.mp = Math.min(state.mpMax, state.mp + state.mpMax*0.020*dt);
  }

  // death state (freeze + auto respawn in town)
  if(runtime.dead){
    state.hp = 0;
    if(runtime.t >= runtime.deadUntil){
      runtime.dead = false;
      moveToMap('town');
      const st2 = computeStats();
      state.hp = Math.floor(st2.hpMax*0.75);
      state.mp = Math.floor(st2.mpMax*0.50);
      runtime.invulnUntil = runtime.t + 1.2;
      floatText('마을에서 부활', state.pos.x, state.pos.y-30);
      burstFx(state.pos.x, state.pos.y, 0x8fd3ff);
    }
    player.x = state.pos.x;
    player.y = state.pos.y;
    cam();
    uiUpdate();
    drawMinimap();
    if(dom.debug.classList.contains('on')){
      dom.debug.textContent =
        `VER ${VERSION}\nMAP ${state.map}\nJOY dx=${runtime.joy.dx.toFixed(2)} dy=${runtime.joy.dy.toFixed(2)} act=${runtime.joy.active}\nPOS ${state.pos.x.toFixed(0)},${state.pos.y.toFixed(0)}\nPLUS +${state.weaponPlus} BLADES ${blades.length}\nINV ${state.inv.length}/${state.invMax} DROPS ${runtime.drops.length}`;
    }
    return;
  }


  const iv = inputVector();
  const spd = (runtime.rollingUntil > runtime.t) ? 380 : 190;
  state.pos.x += iv.dx * spd * dt;
  state.pos.y += iv.dy * spd * dt;

  const m = MAPS[state.map];
  state.pos.x = clamp(state.pos.x, 24, m.w-24);
  state.pos.y = clamp(state.pos.y, 24, m.h-24);

  // blades orbit
  const n = blades.length;
  const angBase = runtime.t * 4.2;
  const st = computeStats();
  const rangeBase = 64 + st.range;
  for(let i=0;i<n;i++){
    const ang = angBase + i*(Math.PI*2/n);
    blades[i].x = state.pos.x + Math.cos(ang)*rangeBase;
    blades[i].y = state.pos.y + Math.sin(ang)*rangeBase;
  }

  // hit monsters (blade contact)
  for(let i=0;i<n;i++){
    const bx=blades[i].x, by=blades[i].y;
    for(const mo of runtime.monsters){
      if(mo.hp<=0) continue;
      if(dist2(bx,by,mo.spr.x,mo.spr.y) <= 22*22){
        const dmgBase = 10 + st.atk*0.55;
        const crit = (Math.random() < st.crit) ? 1.6 : 1.0;
        const dmg = Math.max(1, Math.floor((dmgBase - (mo.def||0)) * crit));
        mo.hp -= dmg;
        if(mo.hp<=0){
          mo.hp=0;
          const g = mo.gold[0] + ((mo.spr.x + mo.spr.y + i*7) % (mo.gold[1]-mo.gold[0]+1));
          state.gold += Math.floor(g);

          if(mo.isBoss){
            runtime.bossDefeated = true;
            // boss reward: heroic chance box
            const box = makeItem('hero_box');
            if(box){
              box.boxTier = mo.tier || 2;
              spawnDrop(mo.spr.x, mo.spr.y, box);
            }
            floatText('보스 격파! 영웅 확률 +@ 상자 획득', mo.spr.x, mo.spr.y-38);
            burstFx(mo.spr.x, mo.spr.y, 0xffd06b);
          }else{
            if(Math.random() < (mo.dropGear||0)){
              const tplId = rollLoot(mo.tier||1);
              const it = makeItem(tplId);
              if(it) spawnDrop(mo.spr.x, mo.spr.y, it);
            }else if(Math.random() < 0.45){
              const it = makeItem('junk');
              if(it) spawnDrop(mo.spr.x, mo.spr.y, it);
            }
          }

          mo.spr.visible=false;
        }
      }
    }
  }

  // spawn boss when all normal monsters are cleared
  if(state.map!=='town' && !runtime.bossSpawned && !runtime.bossDefeated){
    let anyAlive = false;
    for(const mo of runtime.monsters){
      if(!mo.isBoss && mo.hp>0){ anyAlive = true; break; }
    }
    if(!anyAlive){
      spawnBoss();
    }
  }

  player.x = state.pos.x;
  player.y = state.pos.y;

  // monster chase in hunt maps
  if(state.map!=='town'){
    for(const mo of runtime.monsters){
      if(mo.hp<=0) continue;
      const dx = state.pos.x - mo.spr.x;
      const dy = state.pos.y - mo.spr.y;
      const len = Math.sqrt(dx*dx+dy*dy) || 1;
      const mv = (mo.mv!=null ? mo.mv : 42) * dt;
      mo.spr.x += (dx/len)*mv;
      mo.spr.y += (dy/len)*mv;
    }
  }

  // monster contact damage (player hp)
  if(state.map!=='town'){
    const invuln = (runtime.rollingUntil > runtime.t) || (runtime.invulnUntil > runtime.t);
    if(!invuln && runtime.t >= runtime.hitCdUntil){
      for(const mo of runtime.monsters){
        if(mo.hp<=0) continue;
        const rr = mo.isBoss ? 46 : 34;
        if(dist2(state.pos.x, state.pos.y, mo.spr.x, mo.spr.y) <= rr*rr){
          const dmg = Math.max(1, Math.floor(mo.atk - st.def*0.35));
          state.hp -= dmg;
          runtime.hitCdUntil = runtime.t + 0.45;
          runtime.invulnUntil = runtime.t + 0.20;

          // knockback
          const dx = state.pos.x - mo.spr.x;
          const dy = state.pos.y - mo.spr.y;
          const len = Math.sqrt(dx*dx+dy*dy) || 1;
          state.pos.x = clamp(state.pos.x + (dx/len)*42, 24, m.w-24);
          state.pos.y = clamp(state.pos.y + (dy/len)*42, 24, m.h-24);

          burstFx(state.pos.x, state.pos.y, 0xff5b5b);
          floatText(`-${dmg}`, state.pos.x, state.pos.y-30);
          break;
        }
      }
    }

    if(state.hp <= 0 && !runtime.dead){
      state.hp = 0;
      runtime.dead = true;
      runtime.deadUntil = runtime.t + 0.85;
      floatText('사망...', state.pos.x, state.pos.y-30);
      burstFx(state.pos.x, state.pos.y, 0xffffff);
    }
  }

  cam();
  uiUpdate();
  drawMinimap();

  if(dom.debug.classList.contains('on')){
    dom.debug.textContent =
      `VER ${VERSION}\nMAP ${state.map}\nJOY dx=${runtime.joy.dx.toFixed(2)} dy=${runtime.joy.dy.toFixed(2)} act=${runtime.joy.active}\nPOS ${state.pos.x.toFixed(0)},${state.pos.y.toFixed(0)}\nPLUS +${state.weaponPlus} BLADES ${blades.length}\nINV ${state.inv.length}/${state.invMax} DROPS ${runtime.drops.length}`;
  }
});

})();
