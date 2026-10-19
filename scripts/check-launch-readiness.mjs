// Living Launch Readiness v1.1.0. Reusable Project Master template.
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

// Stable links point to the EXISTING readiness document, not a second status ledger.
export function verifyReadinessLinks(manifest, content) {
  const marker = /<!--\s*launch-requirement:([A-Z][A-Z0-9-]+)\s*-->/g;
  const counts = new Map();
  for (const match of content.matchAll(marker)) counts.set(match[1], (counts.get(match[1]) || 0) + 1);
  const errors = [];
  for (const r of manifest.requirements) {
    const count = counts.get(r.id) || 0;
    if (count !== 1) errors.push(r.id + ' must have exactly one launch-requirement anchor (found ' + count + ')');
  }
  const known = new Set(manifest.requirements.map(r => r.id));
  for (const [id] of counts) if (!known.has(id)) errors.push('unknown launch-requirement anchor: ' + id);
  return errors;
}

// Issue/PR descriptions may explicitly name IDs; titles and prose are NOT interpreted as authoritative scope.
export function linkedEvent(manifest, payload) {
  const item = payload?.issue || payload?.pull_request;
  if (!item) return null;
  if (!Number.isSafeInteger(item.number) || item.number <= 0) throw Error('GitHub issue/PR number missing');
  const ref = '#' + item.number;
  const explicitly = [];
  const body = typeof item.body === 'string' ? item.body : '';
  for (const match of body.matchAll(/^\s*Launch requirement IDs\s*:\s*([A-Z0-9, \t-]+?)\s*$/gim)) {
    explicitly.push(...match[1].split(/[\s,]+/).filter(Boolean).map(x => x.toUpperCase()));
  }
  const ids = new Set(explicitly);
  for (const r of manifest.requirements) if (r.issue_refs.some(v => v === ref || v.toUpperCase() === ('PR ' + ref).toUpperCase())) ids.add(r.id);
  const labels = Array.isArray(item.labels) ? item.labels : [];
  const isDefect = labels.some(label => {
    const name = typeof label === 'string' ? label : label?.name;
    return typeof name === 'string' && /^(bug|defect|type:bug)$/i.test(name);
  });
  return {type:isDefect ? 'defect' : 'feature',ref,requirement_ids:[...ids].sort()};
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
    return {id, applicability:r.applicability,criticality:r.criticality,goal:r.goal,acceptance:r.acceptance,source:r.source,
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
  const lines = ['### Launch readiness impact: ' + report.project,'','This is change/defect classification, **not a launch PASS or GO decision**.'];
  if (!report.impacted_requirements.length) lines.push('','No mapped requirements affected by supplied changes/events.');
  for (const r of report.impacted_requirements) {
    lines.push('', '- **' + r.id + '** (' + r.applicability + ', ' + r.criticality + '): ' + r.goal,
      '  - Changed because: ' + r.reasons.join('; '),
      '  - Required acceptance: ' + r.acceptance,
      '  - Related issues/PRs: ' + (r.issue_refs.join(', ') || 'none linked'),
      '  - Tests to assess: ' + (r.test_refs.join(', ') || 'no test refs (review applicability)'),
      '  - Existing evidence location: ' + (r.evidence_refs.join(', ') || 'not required for excluded/deferred scope'));
  }
  if (report.unmapped_tracked_paths.length) lines.push('','**Unmapped changed paths: classify against existing goals or justify non-applicability**',...report.unmapped_tracked_paths.map(x=>'- ' + x));
  if (report.unmapped_events.length) lines.push('','**Unlinked issues: supply stable requirement IDs or explicitly document deferred/excluded scope**',...report.unmapped_events.map(x=>'- ' + x));
  lines.push('','Integration action: reconcile impacted entries in ' + report.readiness_source + ', existing issues and test coverage; preserve prior failing evidence.',
    'A checked-in PASS, PR merge, green CI job or this report cannot verify connected providers, privacy, deployments or release approval.');
  return lines.join('\n');
}

export function main(args) {
  const value = flag => {const i=args.indexOf(flag);if(i<0) return null;if(!args[i+1] || args[i+1].startsWith('--')) throw Error(flag + ' requires a value');return args[i+1];};
  const manifestPath=value('--manifest') || '.project-master/launch-readiness.json';
  const manifest=JSON.parse(readFileSync(manifestPath,'utf8'));
  const errors=validateManifest(manifest);
  if(errors.length) throw Error('invalid launch traceability: '+errors.join('; '));
  if (args.includes('--verify-links')) {
    const linkErrors=verifyReadinessLinks(manifest,readFileSync(manifest.readiness_source,'utf8'));
    if (linkErrors.length) throw Error('readiness anchors invalid: ' + linkErrors.join('; '));
  }
  const file=value('--changed-files');
  const changed=file?readFileSync(file,'utf8').split(/\r?\n/).map(s=>s.trim()).filter(Boolean):[];
  const eventsFile=value('--events');
  const githubEvent=value('--github-event');
  if(eventsFile && githubEvent) throw Error('--events and --github-event are mutually exclusive');
  const events=eventsFile?JSON.parse(readFileSync(eventsFile,'utf8')):[];
  if (githubEvent) {
    const linked=linkedEvent(manifest,JSON.parse(readFileSync(githubEvent,'utf8')));
    if(linked) events.push(linked);
  }
  if (!Array.isArray(events)) throw Error('events must be an array');
  const report=analyse(manifest,changed,events);
  return args.includes('--markdown')?markdown(report):JSON.stringify(report,null,2);
}

if (process.argv[1] && import.meta.url===pathToFileURL(resolve(process.argv[1])).href) {
  try { console.log(main(process.argv.slice(2))); } catch(e) { console.error('Launch readiness check: FAIL - '+e.message);process.exitCode=1; }
}
