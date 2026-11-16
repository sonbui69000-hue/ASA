#!/usr/bin/env python3
"""Validate roadmap documentation only. No service/model/database is exercised."""
import hashlib
import json
import re
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import unquote

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
DATA = json.loads((HERE / 'plan-data.json').read_text())
checks = 0
errors = []


def check(condition, message):
    global checks
    checks += 1
    if not condition:
        errors.append(message)


def sha(text):
    return hashlib.sha256(text.encode()).hexdigest()


def slug(text):
    text = re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', text)
    text = re.sub(r'[`*]', '', text).lower()
    return re.sub(r'[^\w\- ]', '', text).replace(' ', '-')


def anchors(path):
    text = path.read_text()
    result = set(re.findall(r'<a\s+id=["\']([^"\']+)', text))
    duplicates = Counter()
    for heading in re.findall(r'^#{1,6}\s+(.+)$', text, re.M):
        base = slug(heading)
        count = duplicates[base]
        result.add(base if not count else base + '-' + str(count))
        duplicates[base] += 1
    return result


spec = ROOT / 'ragplan/FINAL_IMPLEMENTATION_SPEC.md'
check(sha(spec.read_text()) == DATA['source_sha256'], 'Authoritative specification changed; reconcile requirements first')
requirements = DATA['requirements']
tickets = DATA['tickets']
req_by_id = {r['id']: r for r in requirements}
ticket_by_id = {t['id']: t for t in tickets}
check(len(req_by_id) == len(requirements), 'Duplicate requirement ID')
check(len(ticket_by_id) == len(tickets), 'Duplicate ticket ID')
check(len(tickets) == 70, 'Expected 70 reviewed ticket scopes; update audit consciously for approved rescheduling')
check(len(requirements) == 812, 'Source inventory count changed; reconcile coverage and statistics')
check(Counter(r['mode'] for r in requirements) == Counter(DATA['counts']), 'Requirement mode statistics mismatch')

matrix = (HERE / 'requirements-matrix.md').read_text()
verification = (HERE / 'verification-strategy.md').read_text()
coverage = Counter()
for r in requirements:
    source = ROOT / r['source']
    lines = source.read_text().splitlines()
    actual = '\n'.join(lines[r['start'] - 1:r['end']])
    check(actual == r['text'] and sha(actual) == r['sha256'], r['id'] + ' source block/line/hash mismatch')
    check(r['mode'] in {'mandatory', 'conditional', 'optional', 'deferred'}, r['id'] + ' unknown requirement class')
    check(bool(r['owner']) and bool(r['tickets']) and bool(r['tests']), r['id'] + ' missing owner/implementation/verification')
    check(r['status'] in {'PLANNED', 'DISABLED'}, r['id'] + ' unsupported runtime completion claim in planning baseline')
    check(f'id="{r["id"].lower()}"' in matrix, r['id'] + ' absent from rendered matrix')
    check(r['mode'] not in {'mandatory', 'conditional'} or any(ticket_by_id[t]['scope'] == 'baseline' for t in r['tickets']), r['id'] + ' mandatory consumer mapped only to optional work')
    for t in r['tickets']:
        check(t in ticket_by_id and r['id'] in ticket_by_id[t]['requirements'], r['id'] + ' ticket mapping not bidirectional: ' + t)
    for v in r['tests']:
        check(f'id="{v.lower()}"' in verification, r['id'] + ' planned suite unregistered: ' + v)
        check(v.removeprefix('V-') in r['tickets'], r['id'] + ' test not owned by a mapped ticket')
    for dep in r['dependencies']:
        check(dep in ticket_by_id, r['id'] + ' unknown dependency ' + dep)
    if r['source'] == 'ragplan/FINAL_IMPLEMENTATION_SPEC.md':
        for n in range(r['start'], r['end'] + 1):
            coverage[n] += 1

allowed_dispositions = {'navigation-or-historical-inventory-and-executed-consolidation-evidence', 'blank', 'section-heading', 'anchor', 'table-header-or-separator', 'architecture-visual-covered-by-prose', 'provenance-link-covered-by-cited-contract'}
for d in DATA['dispositions']:
    check(d['reason'] in allowed_dispositions, 'Unreviewed source exclusion reason: ' + d['reason'])
    for n in range(d['start'], d['end'] + 1):
        coverage[n] += 1
        # Do not allow an inventory/navigation disposition to hide a normative block.
        if d['reason'] == 'navigation-or-historical-inventory-and-executed-consolidation-evidence':
            check(9 <= n <= 27 or 1864 <= n <= 2025, 'Normative source line excluded as historical: ' + str(n))
    if d['reason'] == 'provenance-link-covered-by-cited-contract':
        excerpt = '\n'.join(spec.read_text().splitlines()[d['start']-1:d['end']])
        check(not re.search(r'\b(must|never|do not|security guarantees)\b', excerpt, re.I), 'Normative instruction hidden in provenance-only exclusion')
for n in range(1, len(spec.read_text().splitlines()) + 1):
    check(coverage[n] == 1, 'Source line uncovered or multiply disposed: ' + str(n))

visiting, visited, order = set(), set(), []


def visit(tid):
    if tid in visited:
        return
    if tid in visiting:
        errors.append('Dependency cycle: ' + tid)
        return
    visiting.add(tid)
    for dep in ticket_by_id[tid]['deps']:
        if dep in ticket_by_id:
            visit(dep)
    visiting.remove(tid)
    visited.add(tid)
    order.append(tid)


required_sections = ['Objective and authoritative requirements', 'Dependencies and prerequisites', 'Files and interfaces', 'Implementation steps', 'Security and lifecycle invariants', 'Edge cases, failures and required tests', 'Acceptance and executable verification', 'Out of scope', 'Definition of Done and handoff']
for t in tickets:
    visit(t['id'])
    path = HERE / t['file']
    check(path.is_file(), t['id'] + ' missing ticket file')
    body = path.read_text() if path.exists() else ''
    for section in required_sections:
        check('## ' + section in body, t['id'] + ' incomplete ticket: ' + section)
    check(bool(t['requirements']), t['id'] + ' orphan ticket without legitimate requirement')
    for rid in t['requirements']:
        check(rid in req_by_id and t['id'] in req_by_id[rid]['tickets'] and rid in body, t['id'] + ' missing reverse requirement ' + rid)
    for dep in t['deps']:
        check(dep in ticket_by_id and dep != t['id'], t['id'] + ' invalid predecessor ' + dep)
        if t['scope'] == 'baseline' and dep in ticket_by_id:
            check(ticket_by_id[dep]['scope'] == 'baseline', t['id'] + ' baseline depends on optional scope')
    check('```bash' in body and t['commands'] in body, t['id'] + ' missing exact future commands')
    check(len(t['cases']) >= 3 and len(t['steps']) >= 4, t['id'] + ' insufficient scoped steps/failure cases')
    check(t.get('verification_scope', '') in body and bool(t.get('verification_scope')), t['id'] + ' missing component versus final-consumer scope')
    check('future commands' in body and 'not executed work' in body, t['id'] + ' future verification misrepresented as execution')
check(len(visited) == len(tickets), 'DAG traversal incomplete')
index = {tid: n for n, tid in enumerate(order)}
for t in tickets:
    check(all(index[d] < index[t['id']] for d in t['deps'] if d in index), t['id'] + ' invalid topological ordering')
check({t['id'] for t in tickets if not t['deps']} == {'RAG-001'}, 'First-ready ticket inventory changed')

# Boundary ordering must not rely on completed P07 to make the first slice safe.
def ancestors(tid):
    result = set()
    for dep in ticket_by_id[tid]['deps']:
        result.add(dep)
        result.update(ancestors(dep))
    return result


cp3 = ancestors('RAG-029')
check({f'RAG-{n:03}' for n in [10,11,16,17,18,19,20,21,22,25,26,27,28]} <= cp3, 'CP3 missing pulled-forward schema/security prerequisite')
check(not any(ticket_by_id[t]['phase'] == 'P07' for t in cp3), 'CP3 depends on completed P07')
check('RAG-007' in ancestors('RAG-043'), 'Gold freeze missing T13 evaluator self-tests')
check('RAG-002' in ancestors('RAG-023'), 'Canonical acceptance missing Unicode foundation')
check('RAG-028' in ancestors('RAG-029'), 'Lexical slice missing actual compiler gate')
check({'RAG-021','RAG-026'} <= ancestors('RAG-025'), 'Staged serving missing complete sealed schema/authority kernel')
check(all('enterprise_rag.benchmarks.run' not in t['commands'] for t in tickets if int(t['id'][-3:]) < 43), 'Early component acceptance depends on later complete benchmark runner')

all_source_text = '\n'.join(r['section']+' '+r['parent']+' '+r['text'] for r in requirements)
for prefix, count in [('C',16), ('S',9), ('I',27), ('T',14), ('ST',21), ('E',17), ('W',19), ('HR',14), ('RR',5)]:
    for n in range(1, count + 1):
        token = prefix + f'{n:02}'
        check(bool(re.search(r'\b' + token + r'\b', all_source_text)), 'Source requirement inventory missing ' + token)
        if prefix in {'T','ST','HR','RR'}:
            check(token in verification, 'Behavior regression register missing ' + token)
check('FR01' in verification and 'FR01' in all_source_text, 'FR01 header regression omitted')
check(any(r['start'] == 961 and r['mode'] == 'optional' for r in requirements), 'Optional reranker default incorrectly mandatory')
check(any(r['text'].startswith('| D07 ') and r['mode'] == 'mandatory' and 'RAG-023' in r['tickets'] for r in requirements), 'Mandatory source graph lost inside deferred global summaries')
check(all(f'id="v-{t["id"].lower()}"' in verification for t in tickets), 'Planned suite registry incomplete')

links_checked = 0
cached_anchors = {}
for path in sorted(HERE.rglob('*.md')) + [ROOT / 'AGENTS.md']:
    text = path.read_text()
    check(sum(1 for line in text.splitlines() if line.startswith('```')) % 2 == 0, str(path.relative_to(ROOT)) + ' unbalanced Markdown fences')
    for match in re.finditer(r'\[[^\]\n]+\]\(([^)\n]+)\)', text):
        url = match[1].strip().strip('<>')
        if re.match(r'^[a-z]+:', url):
            continue
        target, _, anchor = unquote(url).partition('#')
        resolved = (path.parent / target).resolve() if target else path
        links_checked += 1
        check(resolved.exists(), str(path.relative_to(ROOT)) + ' broken local link: ' + url)
        if anchor and resolved.is_file() and resolved.suffix == '.md':
            if resolved not in cached_anchors:
                cached_anchors[resolved] = anchors(resolved)
            check(anchor in cached_anchors[resolved], str(path.relative_to(ROOT)) + ' broken anchor: ' + url)

summary = {
    'kind': 'documentation-integrity-only',
    'executed_at_utc': datetime.now(timezone.utc).isoformat(),
    'command': 'python3 ragplan/implementation/verify-plan.py',
    'exit_code': 1 if errors else 0,
    'checks': checks,
    'passed': checks - len(errors),
    'failed': len(errors),
    'errors': errors,
    'source_requirement_units': len(requirements),
    'classes': DATA['counts'],
    'tickets': len(tickets),
    'baseline_tickets': sum(t['scope'] == 'baseline' for t in tickets),
    'optional_tickets': sum(t['scope'] == 'optional' for t in tickets),
    'unmapped_requirements': sum(not r['tickets'] or not r['tests'] for r in requirements),
    'orphan_tickets': sum(not t['requirements'] for t in tickets),
    'source_lines_dispositioned': len(coverage),
    'local_links_checked': links_checked,
    'topological_order': order,
    'first_ready_when_implementation_requested': ['RAG-001'],
    'specification_sha256': DATA['source_sha256'],
    'runtime_verification': 'not_executed',
    'owner_approvals': 'none_recorded',
    'limitations': ['No enterprise/runtime/schema materialization/SQL/RLS/fsync/transport/store/OCR/model/browser/quality/load/reviewer test is performed by this checker.', 'This is source/mapping/link/DAG structure validation, not an independent proof of semantic completeness or a code review.']
}
(HERE / 'audit-results.json').write_text(json.dumps(summary, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({k: summary[k] for k in ['kind', 'checks', 'failed', 'source_requirement_units', 'tickets', 'unmapped_requirements', 'orphan_tickets', 'local_links_checked']}, indent=2))
if errors:
    print('\n'.join(errors[:60]))
raise SystemExit(1 if errors else 0)
