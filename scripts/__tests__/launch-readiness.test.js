import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateManifest,analyse,markdown,linkedEvent,verifyReadinessLinks} from '../check-launch-readiness.mjs';
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
test('every adopted requirement is anchored once to the existing launch document',()=>{
 const doc=readFileSync(new URL('../../docs/LAUNCH_READINESS.md',import.meta.url),'utf8');
 assert.deepEqual(verifyReadinessLinks(manifest,doc),[]);
});
test('real PR #651 bonus create/readback and audit changes have explicit launch coverage',()=>{
 const files=['api/_lib/__tests__/bonusAttributeCreation.test.js','api/bonus-attribute-data-proxy.js','docs/nocodebackend/rating-workflow-certification.md','scripts/__tests__/liveBonusRatingMappingAudit.test.js','scripts/audit-live-bonus-rating-mapping.js'];
 const report=analyse(manifest,files);
 assert.deepEqual(report.unmapped_tracked_paths,[]);
 assert.ok(report.impacted_requirements.some(r=>r.id==='PF-LAUNCH-BONUS'));
 assert.equal(report.release_authorised,false);
});
test('real PR #652 rating/tombstone fix maps both rating integrity and catalogue',()=>{
 const files=['api/_lib/__tests__/catalogueTombstoneMetrics.test.js','api/catalog-data-proxy.js','scripts/__tests__/liveRatingIntegrityAudit.test.js','scripts/audit-live-rating-integrity.js'];
 const report=analyse(manifest,files);
 assert.deepEqual(report.unmapped_tracked_paths,[]);
 assert.ok(report.impacted_requirements.some(r=>r.id==='PF-LAUNCH-RATING'));
 assert.ok(report.impacted_requirements.some(r=>r.id==='PF-LAUNCH-CATALOGUE'));
});
test('the open bonus PR resolves manifest cross-reference without source text interpretation',()=>{
 const event=linkedEvent(manifest,{pull_request:{number:651,body:'',labels:[]}});
 assert.ok(event.requirement_ids.includes('PF-LAUNCH-BONUS'));
 const impact=analyse(manifest,[],[event]);
 assert.match(markdown(impact),/Required acceptance:/);
});
test('new defect receives explicit issue/body linkage, otherwise remains review-required',()=>{
 const linked=linkedEvent(manifest,{issue:{number:900,labels:[{name:'bug'}],body:'Launch requirement IDs: PF-LAUNCH-RATING'}});
 assert.equal(linked.type,'defect');
 assert.deepEqual(linked.requirement_ids,['PF-LAUNCH-RATING']);
 const missing=linkedEvent(manifest,{issue:{number:901,labels:[],body:'New feature'}});
 assert.deepEqual(analyse(manifest,[],[missing]).unmapped_events,['feature (#901)']);
});

