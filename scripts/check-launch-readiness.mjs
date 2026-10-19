// Living Launch Readiness v1.0.0. Reusable Project Master template.
// Read-only: maps changes/events to scoped launch requirements; never certifies evidence.
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

export function validateManifest(manifest) {
  const errors = [];
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) return ['manifest must be an object'];
  if (manifest.schema_version !== 1) errors.push('schema_version must be 1');
  if (manifest.template?.id !== 'launch-readiness' || !/^\d+\.\d+\.\d+$/.test(manifest.template?.version || '')) errors.push('template id/version is invalid');
  for (const key of ['project','goal_source','readiness_source']) if (!nonempty(manifest[key])) errors.push(key + ' must be set');
  if (!Array.isArray(manifest.tracked_roots) || !manifest.tracked_roots.every(nonempty)) errors.push('tracked_roots must be a string array');
  if (!Array.isArray(manifest.requirements) || manifest.requirements.length === 0) return [...errors,'at least one requirement is needed'];
  const seen = new Set();
  for (const [i,r] of manifest.requirements.entries()) {
    const at = 'requirements[' + i + ']';
    if (!r || typeof r !== 'object') { errors.push(at + ' must be an object'); continue; }
    if (!/^[A-Z][A-Z0-9-]+$/.test(r.id || '')) errors.push(at + '.id must be a stable uppercase identifier');
    if (seen.has(r.id)) errors.push('duplicate requirement id: ' + r.id);
    seen.add(r.id);
    for (const k of ['goal','acceptance','source']) if (!nonempty(r[k])) errors.push(r.id + '.' + k + ' is required');
    if (!['required','deferred','excluded'].includes(r.applicability)) errors.push(r.id + '.applicability invalid');
    if (!['blocking','advisory'].includes(r.criticality)) errors.push(r.id + '.criticality invalid');
    for (const k of ['issue_refs','change_paths','test_refs','evidence_refs']) {
      if (!Array.isArray(r[k]) || !r[k].every(nonempty)) errors.push(r.id + '.' + k + ' must be a string array');
    }
    if (!Array.isArray(r.change_paths) || (r.applicability === 'required' && r.change_paths.length === 0)) errors.push(r.id + ' requires change_paths');
    if (r.applicability === 'required' && (!Array.isArray(r.evidence_refs) || r.evidence_refs.length === 0)) errors.push(r.id + ' requires evidence_refs');
    // This is a traceability index. A status/pass field would silently duplicate evidence authority.
    if ('status' in r || 'passed' in r || 'verified' in r) errors.push(r.id + ' must not store duplicated certification status');
  }
  return errors;
}
function nonempty(x) { return typeof x === 'string' && x.trim().length > 0; }
export function matches(pattern, file) {
  const escape = s => s.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  const bits = pattern.replace(/\\/g,'/').split('**');
  const regex = '^' + bits.map((bit,i) => bit.split('*').map(escape).join('[^/]*')).join('.*') + '$';
  return new RegExp(regex).test(file.replace(/\\/g,'/'));
}
export function analyse(manifest, changedPaths=[], events=[]) {
  const all = new Set([...changedPaths]);
  const byId = new Map(manifest.requirements.map(r=>[r.id,r]));
  const impacts = new Map();
  const unmappedEvents = [];
  function add(id, reason) {
    if (!byId.has(id)) throw Error('unknown requirement_id: ' + id);
    if (!impacts.has(id)) impacts.set(id, new Set());
    impacts.get(id).add(reason);
  }
  for (const file of changedPaths) for (const r of manifest.requirements) {
    if (r.change_paths.some(p=>matches(p,file))) add(r.id,'file: ' + file);
  }
  for (const e of events) {
    if (!['defect','feature','test','deployment','scope'].includes(e.type)) throw Error('unknown event type');
    if (!Array.isArray(e.requirement_ids) || !e.requirement_ids.every(nonempty)) throw Error('event requires requirement_ids array');
    const eventRef = nonempty(e.ref) ? ' (' + e.ref + ')' : '';
    if (e.requirement_ids.length === 0 && (!Array.isArray(e.paths) || e.paths.length === 0)) unmappedEvents.push((e.type || 'event') + eventRef);
    for (const id of e.requirement_ids) add(id,'event: ' + e.type + eventRef);
    for (const file of (e.paths || [])) {
      all.add(file);
      for (const r of manifest.requirements) if (r.change_paths.some(p=>matches(p,file))) add(r.id,'event path: ' + file);
    }
  }
  const requirements = [...impacts.keys()].sort().map(id=>{
    const r = byId.get(id);
    return {id, applicability:r.applicability,criticality:r.criticality,goal:r.goal,
      issue_refs:r.issue_refs, test_refs:r.test_refs,evidence_refs:r.evidence_refs,
      reasons:[...impacts.get(id)].sort(), action:'Reconcile existing ' + manifest.readiness_source + '; require scoped current evidence before claiming PASS'};
  });
  const unmapped = [...all].filter(p=>manifest.tracked_roots.some(root=>p===root || p.startsWith(root.endsWith('/')?root:root+'/')) && !manifest.requirements.some(r=>r.change_paths.some(g=>matches(g,p)))).sort();
  return {project:manifest.project,template:manifest.template,readiness_source:manifest.readiness_source,
    impacted_requirements:requirements,unmapped_tracked_paths:unmapped,unmapped_events:unmappedEvents,
    review_required:requirements.length>0 || unmapped.length>0 || unmappedEvents.length>0,
    release_authorised:false, note:'Impact classification only. No PASS, GO, deployment or provider verification is inferred.'};
}
export function markdown(report) {
  const lines = ['### Launch readiness impact: ' + report.project,'','This report identifies affected checks; it **does not certify launch readiness**.'];
  if (!report.impacted_requirements.length) lines.push('','No mapped requirements affected by supplied changes/events.');
  for (const r of report.impacted_requirements) lines.push('', '- **' + r.id + '** (' + r.applicability + ', ' + r.criticality + '): ' + r.goal, '  - ' + r.reasons.join('; '), '  - Acceptance and evidence: ' + r.evidence_refs.join(', '));
  if (report.unmapped_tracked_paths.length) lines.push('','**Classification required for unmapped project changes:** ' + report.unmapped_tracked_paths.join(', '));
  if (report.unmapped_events.length) lines.push('','**Link new issues/defects to launch requirement IDs or record justified exclusion:** ' + report.unmapped_events.join(', '));
  lines.push('','Source of launch decision: ' + report.readiness_source, 'A checked-in PASS or a green PR check is not a release approval.');
  return lines.join('\n');
}
export function main(args) {
  const value = flag => {const i=args.indexOf(flag);if(i<0) return null;if(!args[i+1] || args[i+1].startsWith('--')) throw Error(flag + ' requires a value');return args[i+1];};
  const manifestPath=value('--manifest') || '.project-master/launch-readiness.json';
  const manifest=JSON.parse(readFileSync(manifestPath,'utf8'));
  const errors=validateManifest(manifest);
  if(errors.length) throw Error('invalid launch traceability: '+errors.join('; '));
  const file=value('--changed-files');
  const changed=file?readFileSync(file,'utf8').split(/\r?\n/).map(s=>s.trim()).filter(Boolean):[];
  const eventsFile=value('--events');
  const events=eventsFile?JSON.parse(readFileSync(eventsFile,'utf8')):[];
  if (!Array.isArray(events)) throw Error('events must be an array');
  const report=analyse(manifest,changed,events);
  return args.includes('--markdown')?markdown(report):JSON.stringify(report,null,2);
}
if (process.argv[1] && import.meta.url===pathToFileURL(resolve(process.argv[1])).href) {
  try { console.log(main(process.argv.slice(2))); } catch(e) { console.error('Launch readiness check: FAIL - '+e.message);process.exitCode=1; }
}
