import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const root=new URL('../dist/',import.meta.url);
const {cars,brands}=JSON.parse(fs.readFileSync(new URL('cars.json',root),'utf8'));
test('the collection has exactly ten distinct cars per brand',()=>{
  assert.equal(brands.length,10);assert.equal(cars.length,100);assert.equal(new Set(cars.map(c=>c.id)).size,100);
  for(const brand of brands){assert.equal(cars.filter(c=>c.brand===brand).length,10,brand);}
});
test('every car has complete reference details, a film, and three images',()=>{
  for(const c of cars){
    for(const key of ['id','name','brand','year','body','fuel','engine','drive','transmission','description','reference'])assert.ok(c[key],`${c.id}: ${key}`);
    assert.match(c.id,/^[a-z0-9-]+$/);assert.ok(c.year>=1900&&c.year<=2026,c.id);
    assert.match(c.reference,/^https:\/\/en\.wikipedia\.org\/wiki\//);
    assert.match(c.video.id,/^[\w-]{11}$/);assert.ok(c.video.title.length>5,c.id);
    for(const view of ['','-side','-rear'])assert.ok(fs.statSync(new URL(`assets/${c.id}${view}.webp`,root)).size>500,c.id+view);
    for(const metric of ['power','acceleration','topSpeed'])assert.ok(c[metric]===null||typeof c[metric]==='number'&&c[metric]>0,`${c.id}: ${metric}`);
  }
});
test('every 3D asset is pinned and has visible licence attribution',()=>{
  const credits=fs.readFileSync(new URL('credits.html',root),'utf8');
  for(const c of cars){assert.match(c.assetCommit,/^[0-9a-f]{40}$/);assert.match(c.file,/\.glb$/);for(const k of ['author','authorUrl','sourceName','sourceUrl','license'])assert.ok(c.credit[k],`${c.id}: ${k}`);assert.ok(credits.includes(c.credit.author.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#x27;')),c.id);}
  for(const f of ['vendor/THREE-LICENSE.txt','vendor/CARROS-LICENSE.txt','vendor/MANROPE-OFL.txt','vendor/INSTRUMENT-SERIF-OFL.txt'])assert.ok(fs.statSync(new URL(f,root)).size>500,f);
});
