/* Painted canvas scenery. World geometry and interactions stay in the game. */
window.KingdomScenery = (() => {
  let grass;
  const round = (c,x,y,w,h,r,fill) => { c.fillStyle=fill; c.beginPath(); c.roundRect(x,y,w,h,r); c.fill(); };
  function ground(c) {
    c.save();
    if (!grass) {
      const tile=document.createElement('canvas'); tile.width=tile.height=96;
      const g=tile.getContext('2d');
      for(let i=0;i<22;i++) { const x=(i*37)%96,y=(i*53)%96; g.strokeStyle=i%2?'#76986a25':'#fff8d92b'; g.lineWidth=1; g.beginPath(); g.moveTo(x-2,y+2); g.lineTo(x,y-2); g.lineTo(x+2,y+1); g.stroke(); }
      grass=c.createPattern(tile,'repeat');
    }
    c.fillStyle=grass; c.fillRect(0,265,800,820);
    round(c,0,475,800,60,0,'#ebddc6'); round(c,375,0,50,1100,0,'#ebddc6');
    c.strokeStyle='#cab89e70'; c.lineWidth=.7;
    for(let x=0;x<800;x+=30) { c.beginPath(); c.moveTo(x,477); c.lineTo(x+3,505); c.lineTo(x-1,533); c.stroke(); }
    for(let y=0;y<1100;y+=28) { c.beginPath(); c.moveTo(377,y); c.lineTo(423,y+2); c.stroke(); }
    c.strokeStyle='#fff8e9a0'; c.beginPath(); c.moveTo(0,477); c.lineTo(375,477); c.moveTo(425,477);c.lineTo(800,477);c.stroke();
    for(let i=0;i<48;i++) {
      const x=20+(i*173)%750,y=278+(i*127)%770;
      if(x>350&&x<450||y>455&&y<550)continue;
      c.fillStyle=['#fff6dd','#eac7d8','#c2b2d2'][i%3]; c.beginPath();c.arc(x,y,2,0,7);c.arc(x+3,y-1,2,0,7);c.arc(x+1,y-3,2,0,7);c.fill();
      c.fillStyle='#b19a58';c.beginPath();c.arc(x+1,y-1,1,0,7);c.fill();
    }
    c.restore();
  }
  function tree(c,x,y,winter) {
    c.save(); c.fillStyle='#4d604221';c.beginPath();c.ellipse(x+5,y+12,18,6,-.15,0,7);c.fill();
    round(c,x-3,y-6,6,20,2,'#95795a');
    const g=c.createRadialGradient(x-8,y-20,1,x,y-8,25);g.addColorStop(0,winter?'#f8f4e6':'#c9dba1');g.addColorStop(.6,winter?'#dce4ce':'#94b17c');g.addColorStop(1,'#6a8b5e');
    c.fillStyle=g;c.beginPath();c.arc(x-10,y-10,13,0,7);c.arc(x+9,y-12,14,0,7);c.arc(x,y-23,15,0,7);c.fill();
    c.fillStyle='#fff9d450';c.beginPath();c.ellipse(x-6,y-29,7,4,-.4,0,7);c.fill();c.restore();
  }
  function crest(c,key,x,y) {
    c.save(); c.translate(x,y); c.strokeStyle='#78576f';c.fillStyle='#e7d3b1';c.lineWidth=1.7;c.lineJoin='round';c.lineCap='round';
    if(key==='Boxes'||key==='Pro') { round(c,-12,-9,24,21,4,'#e6c5c8');c.strokeRect(-11,-8,22,19);c.beginPath();c.moveTo(0,-9);c.lineTo(0,12);c.moveTo(-12,-2);c.lineTo(12,-2);c.stroke();c.beginPath();c.ellipse(-5,-13,5,3,.5,0,7);c.ellipse(5,-13,5,3,-.5,0,7);c.stroke(); }
    else if(key==='League'||key==='Vault') { c.beginPath();c.moveTo(-13,-8);c.lineTo(-7,-2);c.lineTo(0,-12);c.lineTo(7,-2);c.lineTo(13,-8);c.lineTo(10,10);c.lineTo(-10,10);c.closePath();c.fill();c.stroke(); }
    else if(key==='Climb') { c.beginPath();for(let k=-9;k<10;k+=6){c.moveTo(-8,k);c.lineTo(8,k)}c.moveTo(-8,-14);c.lineTo(-8,14);c.moveTo(8,-14);c.lineTo(8,14);c.stroke(); }
    else if(key==='Trade') { c.beginPath();c.moveTo(-14,-6);c.lineTo(12,-6);c.lineTo(6,-12);c.moveTo(14,6);c.lineTo(-12,6);c.lineTo(-6,12);c.stroke(); }
    else { c.beginPath();for(let k=0;k<10;k++){const a=-Math.PI/2+k*Math.PI/5,r=k%2?6:14;c.lineTo(Math.cos(a)*r,Math.sin(a)*r)}c.closePath();c.fill();c.stroke(); }
    c.restore();
  }
  function building(c,b,locked,done) {
    c.save();const {x,y,w,h}=b,mx=x+w/2;
    round(c,x+6,y+8,w,h,17,'#4e3d4b1b');
    if(b.soft) {
      round(c,x,y,w,h,18,'#adc4a0');round(c,x+6,y+6,w-12,h-12,13,'#dbe3c4');
      c.strokeStyle='#a2b38b';c.lineWidth=1;for(let j=0;j<3;j++){c.beginPath();c.moveTo(x+12,y+47+j*43);c.lineTo(x+w-12,y+47+j*43);c.stroke();}
      round(c,mx-54,y-8,108,29,8,'#fffaeb');c.fillStyle='#5b6950';c.font='600 11px Geist, sans-serif';c.fillText('Squishy Garden',mx,y+7);
      c.restore();return;
    }
    const color=c.createLinearGradient(x,y,x+w,y+h);color.addColorStop(0,'#fff2db');color.addColorStop(.7,b.c);color.addColorStop(1,'#d5bbc7');
    round(c,x,y,w,h,15,color);
    const roof=c.createLinearGradient(x,y-8,x,y+31);roof.addColorStop(0,'#b08a9c');roof.addColorStop(1,'#805c75');
    round(c,x-4,y-8,w+8,29,[14,14,5,5],roof);
    c.strokeStyle='#dec0c75c';c.lineWidth=1;for(let k=12;k<w;k+=20){c.beginPath();c.moveTo(x+k,y-6);c.lineTo(x+k-4,y+18);c.stroke();}
    round(c,x+6,y+24,w-12,2,1,'#fff9ef9c');
    const wy=y+h*.46;
    for(const wx of [x+24,x+w-39]) { round(c,wx,wy,15,22,[7,7,2,2],'#a38b9e');round(c,wx+2,wy+2,11,18,[5,5,1,1],'#fff1bd');c.strokeStyle='#b89d9d';c.beginPath();c.moveTo(wx+7.5,wy+2);c.lineTo(wx+7.5,wy+20);c.moveTo(wx+2,wy+11);c.lineTo(wx+13,wy+11);c.stroke(); }
    round(c,mx-18,y+h-30,36,30,[16,16,0,0],'#aa8392');round(c,mx-14,y+h-27,28,27,[13,13,0,0],'#70526c');
    c.strokeStyle='#bc9e9a';c.lineWidth=1;c.beginPath();c.moveTo(mx,y+h-22);c.lineTo(mx,y+h);c.stroke();
    c.fillStyle='#e0c28c';c.beginPath();c.arc(mx+7,y+h-10,1.5,0,7);c.fill();
    round(c,mx-42,y+27,84,Math.max(35,h-64),9,'#fffaf0e8');
    crest(c,b.k,mx,y+45);
    c.font='600 10px Geist, sans-serif';c.fillStyle='#5e465d';c.fillText(b.k,mx,y+64);
    round(c,mx-21,y+h,42,5,2,'#c4b69e');
    if(done) { c.fillStyle='#b79550';c.beginPath();c.arc(x+w-13,y+29,6,0,7);c.fill(); }
    if(locked) {round(c,x,y,w,h,15,'#fcf8ee70');c.fillStyle='#715c70';c.font='10px Geist';c.fillText('Locked',mx,y+h-9);}
    c.restore();
  }
  return { ground,tree,building };
})();
