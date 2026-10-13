'use strict';
const stage=document.querySelector('#stage'),canvas=document.querySelector('#painting'),overlay=document.querySelector('#light'),ctx=overlay.getContext('2d');
const media=matchMedia('(prefers-reduced-motion: reduce)');
let paused=media.matches,mode=1,time=0,last=0,raf=0,ready=false,w=1,h=1,pointer={x:.5,y:.45,active:0},bursts=[];
const gl=canvas.getContext('webgl',{alpha:false,antialias:false});
let program,uniforms={};
if(gl){
 const vertex='attribute vec2 p; varying vec2 uv; void main(){ uv=p*.5+.5; gl_Position=vec4(p,0.,1.); }';
 const fragment=`precision mediump float; varying vec2 uv; uniform sampler2D image; uniform float t, strength, aspect; uniform vec3 mouse; uniform vec3 burst;
 void main(){vec2 q=vec2(uv.x,1.-uv.y); vec2 v=q; float sky=1.-smoothstep(.8,1.,q.y);
 float a=sin(q.x*11.+q.y*9.-t*.22);float b=cos(q.y*12.-q.x*5.+t*.18);
 v+=vec2(a,b)*.0055*strength*sky;
 vec2 d=q-vec2(.48,.44);float r=length(d);v+=vec2(-d.y,d.x)*sin(r*28.-t*.45)*.022*strength*sky;
 vec2 m=q-mouse.xy; m.x*=aspect;float near=exp(-dot(m,m)*18.);v+=vec2(-m.y,m.x/aspect)*near*.1*mouse.z*strength;
 vec2 bd=q-burst.xy;bd.x*=aspect;float br=length(bd);float wave=sin(br*45.-burst.z*5.)*exp(-br*3.)*exp(-burst.z*1.3)*step(.01,burst.z);v+=normalize(bd+vec2(.001))*wave*.009*strength;
 // Sample only the painting's upper sky, excluding the photo border and product inset.
 float sourceAspect=512./278.; vec2 crop=vec2(1.);if(aspect>sourceAspect)crop.y=sourceAspect/aspect;else crop.x=aspect/sourceAspect;
 vec2 s=(clamp(v,0.,1.)-.5)*crop+.5;s.y=.061+s.y*.543;
 vec3 color=texture2D(image,s).rgb; color=mix(color,color*vec3(.92,.99,1.07),.35);gl_FragColor=vec4(color,1.);}`;
 function shader(type,source){let s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;}
 program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,vertex));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error('그림 렌더러를 시작할 수 없습니다.');gl.useProgram(program);
 const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);let loc=gl.getAttribLocation(program,'p');gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
 for(const name of ['t','strength','aspect','mouse','burst'])uniforms[name]=gl.getUniformLocation(program,name);
}
const img=new Image();img.onload=()=>{if(gl){const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,gl.RGB,gl.UNSIGNED_BYTE,img);}else{document.querySelector('#hint').textContent='정적 감상 모드 · 이 브라우저에서는 WebGL을 사용할 수 없습니다.';}ready=true;document.querySelector('#loading').hidden=true;document.querySelector('#loading').style.display='none';resize();schedule();};img.onerror=()=>{document.querySelector('#loading').textContent='그림을 불러오지 못했습니다. 페이지를 새로고침해 주세요.';};img.src=window.PAINTING_SOURCE||'assets/starry-night.jpeg';
function resize(){const r=stage.getBoundingClientRect();w=r.width;h=r.height;const d=Math.min(devicePixelRatio||1,1.5);for(const c of [canvas,overlay]){c.width=Math.round(w*d);c.height=Math.round(h*d);}ctx.setTransform(d,0,0,d,0,0);if(gl)gl.viewport(0,0,canvas.width,canvas.height);bursts=[];draw();}
function draw(){if(!ready)return;const strength=paused?0:[.25,1,2.4][mode];if(gl){gl.uniform1f(uniforms.t,time);gl.uniform1f(uniforms.strength,strength);gl.uniform1f(uniforms.aspect,w/h);gl.uniform3f(uniforms.mouse,pointer.x,pointer.y,pointer.active);const b=bursts.at(-1);gl.uniform3f(uniforms.burst,b?.x||0,b?.y||0,b?time-b.born:0);gl.drawArrays(gl.TRIANGLES,0,6);}
 if(!gl){const fallback=canvas.getContext('2d');const a=w/h,sa=512/278;let sw=512,sh=278;if(a>sa)sh=sw/a;else sw=sh*a;fallback.drawImage(img,(512-sw)/2,31+(278-sh)/2,sw,sh,0,0,canvas.width,canvas.height);}
 ctx.clearRect(0,0,w,h);if(paused)return;
 for(let i=0;i<48;i++){const x=((i*.6180339+time*.0015*(i%3+1))%1)*w,y=(.08+((i*.381966)%1)*.83)*h;const alpha=(.15+.25*Math.sin(time*.8+i)**2)*strength;ctx.fillStyle=`rgba(255,225,145,${Math.min(alpha,.65)})`;ctx.beginPath();ctx.ellipse(x,y,1.1+(i%3)*.4,.65,Math.sin(i),0,Math.PI*2);ctx.fill();}
 for(const b of bursts){const age=time-b.born;for(let i=0;i<24;i++){const a=i/24*Math.PI*2+b.seed,r=age*(28+i%5*12);ctx.strokeStyle=`rgba(255,225,154,${Math.max(0,(1-age/3)*.85)})`;ctx.lineWidth=1.4;ctx.beginPath();ctx.moveTo(b.x*w+Math.cos(a)*r,b.y*h+Math.sin(a)*r);ctx.lineTo(b.x*w+Math.cos(a+.12)*(r+8),b.y*h+Math.sin(a+.12)*(r+8));ctx.stroke();}}}
function tick(now){raf=0;if(paused||document.hidden)return;time+=Math.min((now-(last||now))/1000,.05);last=now;bursts=bursts.filter(b=>time-b.born<3);draw();schedule();}
function schedule(){if(ready&&!paused&&!document.hidden&&!raf)raf=requestAnimationFrame(tick);}
function syncPause(){cancelAnimationFrame(raf);raf=0;last=0;bursts=[];const b=document.querySelector('#pause');b.setAttribute('aria-pressed',String(paused));b.innerHTML=paused?'▷ <span>움직이기</span>':'Ⅱ <span>멈추기</span>';draw();schedule();}
function position(e){const r=stage.getBoundingClientRect();pointer.x=Math.max(0,Math.min(1,(e.clientX-r.left)/r.width));pointer.y=Math.max(0,Math.min(1,(e.clientY-r.top)/r.height));pointer.active=1;}
stage.addEventListener('pointermove',position);stage.addEventListener('pointerleave',()=>pointer.active=0);stage.addEventListener('pointerdown',e=>{position(e);spark();});stage.addEventListener('pointerup',e=>{if(e.pointerType!=='mouse')pointer.active=0;});stage.addEventListener('pointercancel',()=>pointer.active=0);
function spark(){if(paused){document.querySelector('#hint').textContent='고요히 머무는 밤 · 움직이기를 누르면 별빛이 흐릅니다';return;}if(bursts.length>=12)bursts.shift();bursts.push({x:pointer.x,y:pointer.y,born:time,seed:Math.random()*6});chime();}
stage.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();pointer.x=.5;pointer.y=.45;spark();}});
document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{mode=Number(b.dataset.mode);document.querySelectorAll('[data-mode]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));draw();});
document.querySelector('#pause').onclick=()=>{paused=!paused;syncPause();};media.addEventListener('change',e=>{paused=e.matches;syncPause();});
const dialog=document.querySelector('#info');document.querySelector('#help').onclick=()=>dialog.showModal();document.querySelector('#close').onclick=()=>dialog.close();dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
document.querySelector('#full').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else if(stage.requestFullscreen)await stage.requestFullscreen();else document.querySelector('#hint').textContent='이 브라우저에서는 전체 화면을 지원하지 않습니다.';}catch{document.querySelector('#hint').textContent='전체 화면을 시작할 수 없습니다.';}};
let audio=null,master=null,sounding=false,audioEpoch=0,musicTimer=null;
function updateSound(){const b=document.querySelector('#sound');b.setAttribute('aria-pressed',String(sounding));b.innerHTML=sounding?'♫ <span>음악 끄기</span>':'♫ <span>음악 켜기</span>';}
function stopSound(){clearInterval(musicTimer);musicTimer=null;audioEpoch++;sounding=false;const old=audio;audio=null;master=null;if(old)old.close().catch(()=>{});updateSound();}
document.querySelector('#sound').onclick=async()=>{if(sounding){stopSound();return;}const epoch=++audioEpoch;try{const AC=window.AudioContext||window.webkitAudioContext;if(!AC)throw Error();audio=new AC();sounding=true;updateSound();const own=audio;await own.resume();if(epoch!==audioEpoch)return;master=own.createGain();master.gain.value=Number(document.querySelector('#volume').value)*.13;master.connect(own.destination);startMusic(own,epoch);}catch{stopSound();document.querySelector('#hint').textContent='소리를 시작하지 못했습니다. 다시 시도해 주세요.';}};
document.querySelector('#volume').oninput=e=>{if(master)master.gain.setTargetAtTime(Number(e.target.value)*.13,audio.currentTime,.1);};

// Original slow ambient score: four changing harmonies and a bell-like melody.
function startMusic(own,epoch){
 const chords=[[48,55,60,64],[45,52,57,60],[41,48,53,57],[43,50,55,59]];
 const melody=[72,76,79,76,74,72,67,71,69,72,76,72,67,64,62,67];
 const beat=60/64;let step=0,next=own.currentTime+.08;
 function note(midi,at,duration,level,panValue){
  const oscillator=own.createOscillator(),gain=own.createGain(),pan=own.createStereoPanner();
  oscillator.type='sine';oscillator.frequency.value=440*Math.pow(2,(midi-69)/12);pan.pan.value=panValue;
  gain.gain.setValueAtTime(0,at);gain.gain.linearRampToValueAtTime(level,at+.08);gain.gain.exponentialRampToValueAtTime(.0001,at+duration);
  oscillator.connect(gain).connect(pan).connect(master);oscillator.start(at);oscillator.stop(at+duration+.05);
  oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();pan.disconnect();};
 }
 function scheduleMusic(){
  if(epoch!==audioEpoch||!sounding||own!==audio)return;
  while(next<own.currentTime+.3){
   const chord=chords[Math.floor(step/8)%chords.length];
   if(step%8===0)chord.forEach((pitch,i)=>note(pitch,next,beat*8.5,.18,-.45+i*.3));
   if(step%2===0){const pitch=melody[Math.floor(step/2)%melody.length];note(pitch,next,beat*3,.48,Math.sin(step*.4)*.55);note(pitch+12,next,beat*1.8,.055,-.2);}
   note(chord[step%4]+12,next,beat*1.7,.13,step%2?.35:-.35);
   step++;next+=beat;
  }
 }
 scheduleMusic();musicTimer=setInterval(scheduleMusic,120);
}

function chime(){if(!sounding||!master||!audio)return;const o=audio.createOscillator(),g=audio.createGain(),pan=audio.createStereoPanner();o.frequency.value=[523.25,587.33,659.25,783.99,880][Math.floor(pointer.x*4.99)];pan.pan.value=pointer.x*2-1;g.gain.setValueAtTime(.3,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+1.8);o.connect(g).connect(pan).connect(master);o.start();o.stop(audio.currentTime+1.9);o.onended=()=>{o.disconnect();g.disconnect();pan.disconnect();};}
document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(raf);raf=0;last=0;bursts=[];stopSound();}else{draw();schedule();}});window.addEventListener('pagehide',stopSound);new ResizeObserver(resize).observe(stage);syncPause();
