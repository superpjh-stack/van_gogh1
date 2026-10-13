const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
function setup(reduced=false){
 const elements=new Map(), frames=new Map();let next=0;
 const noop=()=>{};
 function el(key){if(elements.has(key))return elements.get(key);const e={style:{},dataset:{},attributes:{},listeners:{},value:'.35',setAttribute(k,v){this.attributes[k]=v;},addEventListener(k,f){this.listeners[k]=f;},getBoundingClientRect(){return {left:0,top:0,width:1000,height:600};},getContext(type){return type==='webgl'?null:new Proxy({},{get:()=>noop});},showModal(){this.open=true;},close(){this.open=false;}};elements.set(key,e);return e;}
 const modes=[0,1,2].map(i=>{const e=el('mode'+i);e.dataset.mode=String(i);return e;});
 const doc={hidden:false,querySelector:el,querySelectorAll:()=>modes,addEventListener(k,f){this[k]=f;}};
 const context={document:doc,matchMedia:()=>({matches:reduced,addEventListener:noop}),Image:class{},ResizeObserver:class{observe(){}},requestAnimationFrame:f=>{frames.set(++next,f);return next;},cancelAnimationFrame:id=>frames.delete(id),devicePixelRatio:1,window:{addEventListener:noop},Math,console,setInterval,clearInterval};
 vm.createContext(context);vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'../script.js'),'utf8'),context);
 return {context,doc,el,modes,frames,run:s=>vm.runInContext(s,context)};
}
test('reduced motion starts paused without scheduling animation',()=>{const s=setup(true);assert.equal(s.run('paused'),true);assert.equal(s.frames.size,0);assert.equal(s.el('#pause').attributes['aria-pressed'],'true');});
test('bursts stay bounded and are removed when motion stops',()=>{const s=setup();s.run('for(let i=0;i<100;i++)spark()');assert.equal(s.run('bursts.length'),12);s.el('#pause').onclick();assert.equal(s.run('bursts.length'),0);assert.equal(s.run('paused'),true);});
test('single pointer input creates a single burst; no duplicate click handler',()=>{const s=setup();s.el('#stage').listeners.pointerdown({clientX:400,clientY:200});assert.equal(s.run('bursts.length'),1);assert.equal(s.el('#stage').listeners.click,undefined);assert.equal(s.run('pointer.x'),.4);});
test('Enter makes a centered keyboard burst',()=>{const s=setup();let prevented=false;s.el('#stage').listeners.keydown({key:'Enter',preventDefault(){prevented=true;}});assert.equal(s.run('bursts.length'),1);assert.equal(s.run('bursts[0].x'),.5);assert.ok(prevented);});
test('mode controls keep exactly one selection',()=>{const s=setup();s.modes[2].onclick();assert.equal(s.run('mode'),2);assert.equal(s.modes.filter(e=>e.attributes['aria-pressed']==='true').length,1);});
test('hidden tab cancels frames, clears transient effects and audio state',()=>{const s=setup();s.run('ready=true;schedule();spark()');assert.equal(s.frames.size,1);s.doc.hidden=true;s.doc.visibilitychange();assert.equal(s.frames.size,0);assert.equal(s.run('bursts.length'),0);assert.equal(s.run('sounding'),false);});
test('expired bursts are removed by the render clock',()=>{const s=setup();s.run('spark();time=4;tick(1000)');assert.equal(s.run('bursts.length'),0);});
test('music schedules notes only after activation and closes on hidden tab',async()=>{
 const s=setup();let started=0,closed=0;
 const param=()=>({value:0,setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){},setTargetAtTime(){}});
 const node=()=>({gain:param(),pan:param(),frequency:param(),connect(){return this;},disconnect(){},start(){started++;},stop(){}});
 s.context.window.AudioContext=class{constructor(){this.currentTime=0;this.destination={};}async resume(){}createGain(){return node();}createOscillator(){return node();}createStereoPanner(){return node();}async close(){closed++;}};
 assert.equal(started,0);
 try{await s.el('#sound').onclick();assert.ok(started>=7);assert.equal(s.run('sounding'),true);assert.notEqual(s.run('musicTimer'),null);s.doc.hidden=true;s.doc.visibilitychange();assert.equal(s.run('musicTimer'),null);assert.equal(closed,1);assert.equal(s.run('sounding'),false);}finally{s.run('stopSound()');}
});
