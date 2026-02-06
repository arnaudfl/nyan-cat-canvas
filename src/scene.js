function clamp(v,a,b){return Math.max(a,Math.min(b,v));}

async function loadImage(url){
  const img=new Image();
  img.decoding="async";
  img.src=url;
  await img.decode();
  return img;
}

function resizeCanvas(canvas,quality=1){
  const dpr=Math.max(1,window.devicePixelRatio||1);
  const w=Math.floor(window.innerWidth*dpr*quality);
  const h=Math.floor(window.innerHeight*dpr*quality);
  canvas.width=w; canvas.height=h;
  canvas.style.width=window.innerWidth+"px";
  canvas.style.height=window.innerHeight+"px";
  return {dpr,w,h};
}

function createStarLayers(width,height,total){
  const layer1=[],layer2=[];
  const l1=Math.floor(total*0.55), l2=total-l1;

  function star(layer){
    const size=layer===1?(1+(Math.random()<0.25?1:0)):(2+(Math.random()<0.35?1:0));
    const vx=layer===1?-(40+Math.random()*120):-(120+Math.random()*260);
    return {x:Math.random()*width,y:Math.random()*height,s:size,vx,tw:Math.random()*Math.PI*2};
  }

  for(let i=0;i<l1;i++) layer1.push(star(1));
  for(let i=0;i<l2;i++) layer2.push(star(2));
  return {layer1,layer2};
}

function drawStarPlus(ctx,x,y,s){
  ctx.fillRect(x-s,y,s*2+1,1);
  ctx.fillRect(x,y-s,1,s*2+1);
  if(s>=2) ctx.fillRect(x-1,y-1,3,3);
}

function drawSpriteFlipped(ctx,img,sx,sy,sw,sh,dx,dy,dw,dh){
  ctx.save();
  ctx.translate(dx+dw,dy);
  ctx.scale(-1,1);
  ctx.drawImage(img,sx,sy,sw,sh,0,0,dw,dh);
  ctx.restore();
}

export async function createScene(canvas,{spriteUrl,rainbowUrl}){
  const trailCanvas = document.createElement("canvas");
  const trailCtx = trailCanvas.getContext("2d");
  const ctx=canvas.getContext("2d",{alpha:false});
  const [spriteSheet,rainbowTile]=await Promise.all([loadImage(spriteUrl),loadImage(rainbowUrl)]);

  // Your sheet: 64x32 frames, single row
  const FRAME_W=64, FRAME_H=32, SY=0;
  const FRAMES=Math.floor(spriteSheet.width/FRAME_W);
  const FPS=12;

  let quality=1, running=true, speed=1, starsTotal=240, spriteScale=4;
  let rainbowMode="sprite"; // sprite | tile | off
  let direction="right"; // right | left

  let metrics=resizeCanvas(canvas,quality);
  let stars=createStarLayers(metrics.w,metrics.h,starsTotal);

  let rainbowPattern=ctx.createPattern(rainbowTile,"repeat");
  let rainbowScroll=0;

  const cat={x:-FRAME_W*spriteScale*2,y:metrics.h*0.45,bob:0,frame:0,frameAcc:0};

  function setStarCount(n){starsTotal=clamp(n,40,1200); stars=createStarLayers(metrics.w,metrics.h,starsTotal);}
  function setQuality(q){
    quality=clamp(q,0.5,1);
    metrics=resizeCanvas(canvas,quality);
    trailCanvas.width = metrics.w;
    trailCanvas.height = metrics.h;
    stars=createStarLayers(metrics.w,metrics.h,starsTotal);
    rainbowPattern=ctx.createPattern(rainbowTile,"repeat");
  }
  function setSpeed(v){speed=clamp(v,0.2,5);}
  function setSpriteScale(v){spriteScale=clamp(v,2,10);}
  function setRainbowMode(m){rainbowMode=m;}
  function setDirection(d){direction=d;}
  function toggle(){running=!running;}
  function isRunning(){return running;}
  function screenshot(){
    const a=document.createElement("a");
    a.download="nyan-v3-screenshot.png";
    a.href=canvas.toDataURL("image/png");
    a.click();
  }

  function drawBackground(){
    ctx.fillStyle="#1b2388";
    ctx.fillRect(0,0,metrics.w,metrics.h);
  }

  function drawStars(layer,dt,layerIdx){
    const baseA=layerIdx===1?0.75:1;
    ctx.fillStyle="#fff";
    for(const s of layer){
      if(running){
        s.x+=s.vx*dt*speed;
        s.tw+=dt*(layerIdx===1?4:6);
        if(s.x<-20){s.x=metrics.w+Math.random()*60; s.y=Math.random()*metrics.h;}
      }
      const tw=0.85+0.15*Math.sin(s.tw);
      ctx.globalAlpha=baseA*tw;
      drawStarPlus(ctx,Math.floor(s.x),Math.floor(s.y),s.s);
    }
    ctx.globalAlpha=1;
  }

  function drawRepeatX(ctx, img, x, y, w, scale, scrollPx) {
    const tw = img.width * scale;
    const th = img.height * scale;

    // IMPORTANT : forcer un scroll entier
    const scrollI = Math.floor(scrollPx);

    // IMPORTANT : départ aligné sur la grille
    let startX = Math.floor(x - (scrollI % tw));
    const yI = Math.floor(y);
    const wI = Math.floor(w);

    for (let px = startX; px < x + wI; px += tw) {
      ctx.drawImage(img, 0, 0, img.width, img.height, px, yI, tw, th);
    }
    return { th };
  }

  function drawRainbowTrail(){
    if (rainbowMode !== "tile" || !rainbowTile) return;

    const TRAIL_W = Math.max(metrics.w * 0.62, 560);

    const rx = direction==="right"
      ? cat.x - TRAIL_W + (FRAME_W * spriteScale * 0.25)
      : cat.x + (FRAME_W * spriteScale * 0.75);

    if (running) rainbowScroll += 300 * (1/60) * speed;

    const rxI = Math.floor(rx);
    const ryBase = Math.floor(cat.y); // ajuste si besoin

    // --- 1) Draw trail onto offscreen canvas
    trailCtx.clearRect(0, 0, trailCanvas.width, trailCanvas.height);
    trailCtx.imageSmoothingEnabled = false;

    const { th } = drawRepeatX(
      trailCtx,
      rainbowTile,
      rxI,
      ryBase,
      Math.floor(TRAIL_W),
      spriteScale,
      rainbowScroll
    );

    // --- 2) Apply fade mask ONLY on the offscreen trail
    const FADE_W = 200; // ajuste 120-260
    trailCtx.save();
    trailCtx.globalCompositeOperation = "destination-in";
    const grad = trailCtx.createLinearGradient(rxI, 0, rxI + FADE_W, 0);
    grad.addColorStop(0, "rgba(255,255,255,0)");
    grad.addColorStop(1, "rgba(255,255,255,1)");
    trailCtx.fillStyle = grad;
    trailCtx.fillRect(rxI, ryBase, Math.floor(TRAIL_W), th);
    trailCtx.restore();

    // --- 3) Composite trail back onto main canvas
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(trailCanvas, 0, 0);
    ctx.imageSmoothingEnabled = true;
  }

  function updateCat(dt){
    const dir = direction==="right" ? 1 : -1;
    if(running){
      cat.x += dir * 280 * dt * speed;

      const wrapPad = FRAME_W*spriteScale*2;
      if(direction==="right" && cat.x > metrics.w + wrapPad) cat.x = -wrapPad;
      if(direction==="left" && cat.x < -wrapPad) cat.x = metrics.w + wrapPad;

      cat.bob += dt*7*speed;
      cat.y = metrics.h*0.45 + Math.sin(cat.bob)*8*quality;

      cat.frameAcc += dt*FPS*speed;
      while(cat.frameAcc>=1){cat.frameAcc-=1; cat.frame=(cat.frame+1)%FRAMES;}
    }
  }

  function drawCat(){
    if(rainbowMode==="off") return;

    const sx=cat.frame*FRAME_W;
    const dw=FRAME_W*spriteScale;
    const dh=FRAME_H*spriteScale;

    ctx.imageSmoothingEnabled=false;

    // Your sprite includes the rainbow; when moving left, flip to keep cat facing forward.
    const shouldFlip = (direction==="left");
    if(shouldFlip){
      drawSpriteFlipped(ctx, spriteSheet, sx, SY, FRAME_W, FRAME_H, Math.floor(cat.x), Math.floor(cat.y), dw, dh);
    }else{
      ctx.drawImage(spriteSheet, sx, SY, FRAME_W, FRAME_H, Math.floor(cat.x), Math.floor(cat.y), dw, dh);
    }

    ctx.imageSmoothingEnabled=true;
  }

  let last=performance.now();
  function tick(now){
    const dt=Math.min(0.033,(now-last)/1000);
    last=now;

    updateCat(dt);
    drawBackground();
    drawStars(stars.layer1,dt,1);
    drawStars(stars.layer2,dt,2);

    // Tile rainbow behind cat (optional)
    drawRainbowTrail();

    // Sprite (includes rainbow if mode is sprite)
    if(rainbowMode!=="off") drawCat();

    requestAnimationFrame(tick);
  }

  function start(){requestAnimationFrame(tick);}
  addEventListener("resize",()=>setQuality(quality));

  return {start,toggle,isRunning,screenshot,setSpeed,setStarCount,setSpriteScale,setRainbowMode,setDirection,setQuality};
}
