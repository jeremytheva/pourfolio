import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateManifest,analyse,markdown} from '../check-launch-readiness.mjs';
const manifest=JSON.parse(readFileSync(new URL('../../.project-master/launch-readiness.json',import.meta.url)));
test('adopted launch index is structurally complete',()=>assert.deepEqual(validateManifest(manifest),[]));
test('rating deletion maps to rating and does not claim pass',()=>{
 const impact=analyse(manifest,['api/ratings/delete.js']);
 assert.ok(impact.impacted_requirements.some(r=>r.id==='PF-LAUNCH-RATING'));
 assert.equal(impact.release_authorised,false);
});
test('unmapped changes stay visible and cannot silently disappear',()=>{const r=analyse(manifest,['scripts/new-launch-entry-point.js']);assert.ok(r.unmapped_tracked_paths.includes('scripts/new-launch-entry-point.js'));});
test('defects use requirement links even without code changes',()=>{const r=analyse(manifest,[],[{type:'defect',ref:'#503',requirement_ids:['PF-LAUNCH-RATING']}]);assert.match(markdown(r),/PF-LAUNCH-RATING/);});
test('future excluded features are visible but not blockers',()=>{const r=analyse(manifest,['api/brew-done-it.js']);const f=r.impacted_requirements.find(x=>x.id==='PF-LAUNCH-DEFERRED');assert.equal(f.applicability,'excluded');});
