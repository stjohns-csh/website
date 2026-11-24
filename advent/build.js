const fs=require('fs'),path=require('path');
const c=require('./core.js');
const asOf=process.argv[2]||'2026-11-24';
const out='out';fs.rmSync(out,{recursive:true,force:true});fs.mkdirSync(out+'/ics',{recursive:true});
fs.writeFileSync(out+'/advent-block-for-mailchimp.html',c.buildBlock(c.EVENTS,asOf,c.SETTINGS));
let n=0;
c.flatEvents(c.EVENTS).forEach(e=>{if(e.ticketUrl)return;const d=c.remainingDates(e,asOf);if(!d.length)return;fs.writeFileSync(out+'/ics/'+e.slug+'.ics',c.icsText(e,d,c.SETTINGS));n++;});
const core=fs.readFileSync('core.js','utf8').replace(/if \(typeof module[\s\S]*$/,'');
fs.writeFileSync(out+'/calendar-generator.html',fs.readFileSync('template.html','utf8').replace('/*CORE*/',core));
// preview page (email block on grey, as a reader would see)
fs.writeFileSync(out+'/preview.html','<!DOCTYPE html><meta charset="utf-8"><link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500&family=PT+Sans:ital,wght@0,400;0,700;1,400&display=swap" rel="stylesheet"><body style="background:#FAF7EF;margin:0;padding:20px"><div style="max-width:600px;margin:0 auto;background:#fff;padding:0 0 24px">'+fs.readFileSync(out+'/advent-block-for-mailchimp.html','utf8')+'</div>');
console.log('ics files:',n);
