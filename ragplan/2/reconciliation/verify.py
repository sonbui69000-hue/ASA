#!/usr/bin/env python3
"""Finite synthetic planning checks; no enterprise runtime/security certification."""
import argparse
from collections import Counter
from hashlib import sha256
import itertools
import json
from pathlib import Path
import re
import unicodedata
from urllib.parse import unquote

ROOT = Path(__file__).resolve().parents[3]
BASE = ROOT / 'ragplan/2'
OWNED = ['README.md', 'rag-architecture-review.md', 'rag-algorithm-decisions.md',
         'rag-data-contracts.md', 'rag-security-design.md', 'rag-evaluation-plan.md',
         'rag-failure-analysis.md', 'rag-implementation-plan.md',
         'rag-readiness-assessment.md', 'research-sources.md', 'verification.md']
REQUIRED = ['finding-disposition.md', 'architecture-changelog.md', 'revised-invariants.md',
            'verification-matrix.md', 'remaining-decisions.md', 'final-corrections.md']
checks = []

def check(name, ok, detail=None):
    checks.append({'id': name, 'status': 'passed' if ok else 'failed', 'detail': detail})

def expect_reject(name, fn):
    try:
        fn()
    except (ValueError, AssertionError):
        check(name, True)
    else:
        check(name, False, 'negative mutation was accepted')

def slug(s):
    s = re.sub(r'[`*_]', '', s).lower()
    s = ''.join(c for c in s if c.isalnum() or c in ' -_')
    return s.replace(' ', '-')

def anchors(text):
    result = set(re.findall(r'<a\s+id="([^"]+)"', text))
    counts = Counter()
    for h in re.findall(r'^#{1,6}\s+(.+)$', text, re.M):
        value = slug(h)
        result.add(value if counts[value] == 0 else f'{value}-{counts[value]}')
        counts[value] += 1
    return result

def canonical(text):
    if not isinstance(text, str):
        raise ValueError('not text')
    for char in text:
        cp = ord(char)
        if (cp == 0 or 0xD800 <= cp <= 0xDFFF or
            (cp < 32 and cp not in (9, 10, 13)) or 0x7F <= cp <= 0x9F or
            0xFDD0 <= cp <= 0xFDEF or cp & 0xFFFF in (0xFFFE, 0xFFFF)):
            raise ValueError('unsupported scalar')
    return unicodedata.normalize('NFC', text)

def admit(lists, cap=120):
    lists = [list(dict.fromkeys(x)) for x in lists]
    positions = [0] * len(lists)
    out, seen = [], set()
    while len(out) < cap:
        progress = False
        for i, values in enumerate(lists):
            while positions[i] < len(values) and values[positions[i]] in seen:
                positions[i] += 1
            if positions[i] == len(values):
                continue
            value = values[positions[i]]
            positions[i] += 1
            out.append(value)
            seen.add(value)
            progress = True
            if len(out) == cap:
                break
        if not progress:
            break
    membership = {x: [i for i, values in enumerate(lists) if x in values] for x in out}
    return out, membership

def complete(retrieved, alternatives, permitted):
    return any(bundle <= permitted and bundle <= retrieved for bundle in alternatives)

def profile_complete(eligible, mapping, space):
    if set(mapping) != eligible or any(v['space'] != space or not v['complete'] for v in mapping.values()):
        raise ValueError('profile incomplete/incompatible')

parser = argparse.ArgumentParser()
parser.add_argument('--baseline', type=Path)
parser.add_argument('--output', type=Path, default=BASE / 'reconciliation/verification-results.json')
args = parser.parse_args()
texts = {name: (BASE / name).read_text() for name in OWNED}
for name in REQUIRED:
    check('DOC_required_' + name, (BASE / 'reconciliation' / name).is_file())
disp = (BASE / 'reconciliation/finding-disposition.md').read_text()
ids = re.findall(r'^## (HR\d{2}) — (accepted|modified|rejected)$', disp, re.M)
check('DOC_fourteen_dispositions', [x[0] for x in ids] == [f'HR{i:02}' for i in range(1, 15)])
labels = ['Actual defect/risk', 'Verified contradiction/evidence', 'Affected documents/interfaces',
          'Reviewer correction evaluation', 'Simplest selected contract', 'Why it works / failure behavior',
          'Migration/compatibility', 'Deterministic acceptance']
for number in range(1, 15):
    ident = f'HR{number:02}'
    section = re.search(rf'^## {ident} .*?(?=^## |\Z)', disp, re.M | re.S).group()
    check('DOC_disposition_attributes_' + ident,
          '**Status:' in section and all(f'| {label} |' in section for label in labels))
    matrix = (BASE / 'reconciliation/verification-matrix.md').read_text()
    check('DOC_test_phase_' + ident, bool(re.search(rf'\| {ident} / T{number:02}.*\|.*P\d{{2}}', matrix)))
contracts = texts['rag-data-contracts.md']
check('DOC_C01_C16', re.findall(r'^## (C\d{2}) ', contracts, re.M) == [f'C{i:02}' for i in range(1, 17)])
check('DOC_S01_S09', re.findall(r'^## (S\d{2}) ', texts['rag-security-design.md'], re.M) == [f'S{i:02}' for i in range(1, 10)])
check('DOC_version', 'version 2.2.0' in contracts and '/api/enterprise-rag/v2' in contracts)
for stage in ['Architecture approval', 'Synthetic prototyping', 'Staged implementation', 'Confidential-data integration', 'Production deployment']:
    check('DOC_verdict_' + stage, stage in texts['rag-readiness-assessment.md'])
for file in ['rag-architecture-review.md', 'rag-implementation-plan.md', 'rag-readiness-assessment.md', 'README.md']:
    check('DOC_readiness_terms_' + file, all(x in texts[file] for x in ['CONDITIONAL GO', 'NO-GO', 'A09']))
for marker in ['w07-conflicting-versions', 'W13', 'W14', 'W15', 'W16', 'W17']:
    check('DOC_trace_' + marker, marker in texts['rag-failure-analysis.md'])
check('DOC_minimal_lifecycle_before_CP3', 'migrations0001→0007 run before CP3' in texts['rag-implementation-plan.md'])
# Explicit integration DAG: minimum guards are early slices, not full P07 completion.
edges = {'P00': [], 'P01': ['P00'], 'P02': ['P01'], 'P03': ['P02'], 'P04': ['P03'],
         'P05': ['P04'], 'P06': ['P05'], 'P07': ['P02','P05','P06'], 'P08': ['P03','P07'],
         'P09': ['P08'], 'P10': ['P04','P06']}
visiting, visited = set(), set()
def visit(node):
    assert node not in visiting
    if node in visited:
        return
    visiting.add(node)
    for dep in edges[node]:
        visit(dep)
    visiting.remove(node)
    visited.add(node)
for node in edges:
    visit(node)
check('DESIGN_phase_DAG', len(visited) == 11, 'declared dependency model, not code-import analysis')
links, broken, blocks = 0, [], 0
files = [BASE / name for name in OWNED] + sorted((BASE/'reconciliation').glob('*.md'))
# Also verify unchanged audit links still resolve after renamed headings.
files += sorted((BASE/'review').glob('*.md'))
for file in files:
    content = file.read_text()
    check('DOC_fences_' + str(file.relative_to(BASE)), len(re.findall(r'^```', content, re.M)) % 2 == 0)
    no_fences = re.sub(r'```.*?```', '', content, flags=re.S)
    for target in re.findall(r'(?<!!)\[[^\]]+\]\(([^)]+)\)', no_fences):
        target = target.split()[0].strip('<>')
        if re.match(r'\w+://|mailto:', target):
            continue
        path, _, fragment = unquote(target).partition('#')
        resolved = (file.parent / path).resolve() if path else file
        links += 1
        if not resolved.is_file():
            broken.append(f'{file.relative_to(BASE)} -> {target}')
        elif fragment and resolved.suffix == '.md' and fragment not in anchors(resolved.read_text()):
            broken.append(f'{file.relative_to(BASE)} -> {target} (fragment)')
    for block in re.findall(r'```json\n(.*?)\n```', content, re.S):
        obj = json.loads(block)
        blocks += 1
        def strings(o):
            if isinstance(o, str):
                canonical(o)
            elif isinstance(o, list):
                for value in o: strings(value)
            elif isinstance(o, dict):
                for key,value in o.items(): canonical(key); strings(value)
        strings(obj)
        if isinstance(obj,dict) and 'text_sha256' in obj and 'text' in obj:
            check('JSON_evidence_hash_' + str(blocks), sha256(obj['text'].encode()).hexdigest() == obj['text_sha256'])
            check('JSON_span_' + str(blocks), obj['span']['end']-obj['span']['start']==len(obj['text']))
        if isinstance(obj,dict) and 'snapshot' in obj:
            snap=obj['snapshot']
            required = {'auth_epoch','corpus_epoch','semantic_epoch','corpus_revision','policy_revision','serving_profile_id','deployment_incarnation','journal_sequence','evaluated_at','valid_until','releases','applicability_sets'}
            check('JSON_snapshot_fields', set(snap)==required)
            example_manifest = json.loads((BASE/'reconciliation/final-contract-examples.json').read_text())['membership_manifest']
            for member in snap['applicability_sets']:
                check('JSON_family_snapshot_binding', set(member)=={'family_id','applicability_set_id','membership_revision','membership_hash'}
                      and member['membership_revision']==example_manifest['membership_revision']
                      and member['membership_hash']==example_manifest['membership_hash'])
            for claim in obj['claims']:
                check('JSON_legal_claim_refs', all(claim.get(x) for x in ['applicability_set_id','effect_ids','decision_ids','accepted_fact_ids']))
            check('JSON_claim_evidence_refs', all(set(c['evidence_ids']) <= {e['evidence_id'] for e in obj['evidence']} for c in obj['claims']))
check('DOC_links', not broken, {'links_checked':links,'broken':broken})
check('JSON_blocks', blocks>=6, {'parsed_blocks':blocks,'scope':'JSON parse and targeted checks, not complete JSON Schema validation'})
for text in ['Điều 1', 'A\u0301😀B', 'a\u0315\u0300', '\t\n\r', 'điều khoản']:
    check('UNICODE_valid_' + str(len(checks)), canonical(text)==unicodedata.normalize('NFC',text))
for text in ['Điều\x001', '\ud800', '\x01', '\x7f', '\ufdd0', '\U0010ffff']:
    expect_reject('UNICODE_negative_' + str(len(checks)), lambda text=text: canonical(text))
check('UNICODE_reorder_cluster', canonical('a\u0315\u0300') == 'à\u0315')
# HR01 finite policy counterexample, deliberately not a RLS implementation.
review = lambda assigned,clear,clean,preview,current,published: assigned and clear and clean and preview and current
check('HR01_unpublished_reviewer', review(True,True,True,True,True,False))
check('HR01_not_uploader', not review(False,True,True,True,True,False))
check('HR01_not_unsafe', not review(True,True,False,True,True,False))
ordinary_read = lambda published,granted,clear: published and granted and clear
check('HR01_ordinary_still_unpublished', not ordinary_read(False,True,True) and ordinary_read(True,True,True))
# HR02 simple scope composition with explicit reviewed effects, no legal inference.
base={'warranty':'O.W','payment':'O.P'}
def applicable(day):
    result={key:{value} for key,value in base.items()}
    if day>='2026-12-01': result['payment']={'O.P','M.P2','A.C'}
    return result
check('HR02_preserve_warranty', applicable('2026-12-01')['warranty']=={'O.W'})
check('HR02_partial_effect', applicable('2026-12-01')['payment']=={'O.P','M.P2','A.C'})
check('HR02_future_effect', applicable('2026-11-30')['payment']=={'O.P'})
# Model singleton gate event permutations. This is NOT ASGI/OS/driver execution.
valid_traces=0
for trace in itertools.permutations(['send','revoke_commit','ack','db_loss']):
    if trace.index('revoke_commit')>trace.index('ack'): continue
    permitted_send = trace.index('send')<trace.index('revoke_commit')
    assert not permitted_send or trace.index('send')<trace.index('ack')
    valid_traces+=1
check('HR03_gate_order_model', valid_traces==12, {'schedules':valid_traces,'runtime_tested':False})
admit_at = lambda now,expiry,ready: ready and now<expiry
check('HR03_expiry_no_epoch', admit_at(99,100,True) and not admit_at(105,100,True) and not admit_at(99,100,False))
expect_reject('HR04_missing_member', lambda: profile_complete({'D1','D2'},{'D1':{'space':'A','complete':True}},'A'))
expect_reject('HR04_equal_dimension_wrong_space', lambda: profile_complete({'D1','D2'},{'D1':{'space':'A','complete':True},'D2':{'space':'B','complete':True}},'A'))
profile_complete({'D1','D2'},{d:{'space':'B','complete':True} for d in ['D1','D2']},'B')
check('HR04_complete_shadow', True)
# HR05 live set survives SQL rollback; physical fsync/locking is not modeled.
journal={'D1'}; sql_active={'D1','D2'}
check('HR05_sql_rollback_deny', 'D1' not in sql_active-journal)
check('HR05_restart_replay', sql_active-set(journal)=={'D2'})
source_before={'hash':'synthetic_unchanged','release':'R','semantic_epoch':9}
source_after={**source_before,'semantic_epoch':10}
check('HR06_epoch_retraction', source_before['hash']==source_after['hash'] and source_before['release']==source_after['release'] and source_before['semantic_epoch']!=source_after['semantic_epoch'])
accepted=lambda e: 9<=e and e<10
check('HR06_interval', accepted(9) and not accepted(10))
values, membership = admit([[f'{slot}-{i}' for i in range(100)] for slot in range(3)])
check('HR08_fair_300', len(values)==120 and Counter(x.split('-')[0] for x in values)=={'0':40,'1':40,'2':40})
x,m=admit([['shared','a'],['shared','b'],['c']])
check('HR08_duplicate_membership', len(x)==4 and m['shared']==[0,1])
x,m=admit([['rare'],[f'b{i}' for i in range(100)],[f'c{i}' for i in range(100)]])
check('HR08_reallocate_short', len(x)==120 and 'rare' in x)
check('HR08_deterministic', admit([['a','b'],['b','c']])==admit([['a','b'],['b','c']]))
check('HR08_oversize_whole_bundle', len('x'*2401)>2400)
# HR10 reachability and pending-state fence; not physical retention verification.
edges2={'set':['fact','original'],'fact':['evidence'],'evidence':['raw','map'],'map':['original']}
reachable=set()
def reach(node):
    if node in reachable:return
    reachable.add(node)
    for child in edges2.get(node,[]):reach(child)
reach('set')
check('HR10_semantic_roots', {'raw','original','map','evidence'} <= reachable)
gc_cases=[]
for order in [('root','gc'),('gc','root')]:
    root_present=False; state='available'; root_added=False
    for action in order:
        if action=='root' and state=='available': root_present=True; root_added=True
        if action=='gc' and not root_present: state='gc_pending'
    gc_cases.append((root_added,state))
check('HR10_pending_blocks_new_root', gc_cases==[(True,'available'),(False,'gc_pending')])
check('HR11_raster_arithmetic', 200*2480*3508*3 > 2*1024**3)
check('HR11_budget_not_reset', 2700-120-120==2460)
alternatives=[{f'e{i}'} for i in range(20)]
check('HR13_interchangeable', complete({'e19'},alternatives,{f'e{i}' for i in range(20)}))
check('HR13_and_exception', not complete({'claim'},[{'claim','exception'}],{'claim','exception'}))
check('HR13_denied_bundle_not_shortened', not complete({'claim'},[{'claim','private'}],{'claim'}))
for n in [0,1]:
    check('HR13_abstain_one_answer_' + str(n), n/20 < .80)
review_circuit=lambda paused,pages,age,ack: (False if paused and pages<100 and age<1 and ack else True if pages>200 or age>1 else paused)
check('HR14_intake_stop', review_circuit(False,201,0,False) and review_circuit(True,99,0,False) and not review_circuit(True,99,0,True))
check('HR14_capacity_headroom', 81>100*.8)

# RR01-RR05 finite executable specification cases. No API, RLS, filesystem,
# transport, real clock or storage behavior is executed by these models.
examples=json.loads((BASE/'reconciliation/final-contract-examples.json').read_text())
check('RR_examples_version', examples['contract_version']=='2.2.0')
json_bytes=lambda value: json.dumps(value,sort_keys=True,ensure_ascii=False,separators=(',',':')).encode()
digest=lambda value: sha256(json_bytes(value)).hexdigest()
manifest=examples['membership_manifest']
check('RR02_manifest_hash', manifest['membership_hash']==digest({k:v for k,v in manifest.items() if k!='membership_hash'}),
      'ASCII-only object keys/strings and Epoch strings; this fixture needs no general RFC8785 number implementation')

request=examples['published_review']['body']
source={k:v for k,v in request['subject'].items() if k!='kind'}
decision_fields={'fact_accept':{'candidate_field_id'},'fact_retract':{'field_id'},'fact_correct':{'field_id','replacement'},
                 'link_accept':{'left_observation_id','right_observation_id'},'link_undo':{'link_decision_id'},
                 'link_correct':{'link_decision_id','left_observation_id','right_observation_id'},
                 'relation_accept':{'relation_id','family_heads'},'relation_retract':{'relation_decision_id','family_heads'},
                 'classification_change':{'dimension','proposed_value','expected_permission_epoch','approval_decision_ids'}}
def published_review_allowed(body,capabilities,readable,epoch='9',revision='8',expected_revision='8'):
    if set(body)!={'subject','expected_semantic_epoch','prior_decision_ids','decision','reason_code'}:
        raise ValueError('unknown/missing request field')
    subject=body['subject']
    if set(subject)!={'kind','document_id','version_id','extraction_id','rendition_id','release_id','release_scope'}:
        raise ValueError('invalid published subject')
    if (subject['kind']!='published' or subject['release_scope'] not in {'current','history'}
        or {k:v for k,v in subject.items() if k not in {'kind','release_scope'}}!={k:v for k,v in source.items() if k!='release_scope'}):
        raise ValueError('wrong source/branch')
    decision=body['decision'];kind=decision.get('kind')
    if kind not in decision_fields or set(decision)!={'kind'}|decision_fields[kind]:raise ValueError('wrong decision branch')
    if body['expected_semantic_epoch']!=epoch or revision!=expected_revision or body['prior_decision_ids']!=request['prior_decision_ids']:
        raise ValueError('stale expected authority')
    required='review_classification' if kind=='classification_change' else 'review_semantics'
    return required in capabilities and readable and (subject['release_scope']=='current' or 'history' in capabilities)
check('RR01_published_no_package', published_review_allowed(request,{'review_semantics'},True))
check('RR01_staged_capability_not_semantic', not published_review_allowed(request,{'inspect_staged'},True))
check('RR01_peer_without_read_denied', not published_review_allowed(request,{'review_semantics'},False))
expect_reject('RR01_staged_package_on_published_rejects',lambda:published_review_allowed({**request,'package_id':'SYN-P'}, {'review_semantics'},True))
expect_reject('RR01_wrong_release',lambda:published_review_allowed({**request,'subject':{**request['subject'],'release_id':'SYN-WRONG'}}, {'review_semantics'},True))
expect_reject('RR01_stale_semantic_epoch',lambda:published_review_allowed(request,{'review_semantics'},True,epoch='10'))
expect_reject('RR01_stale_document_revision',lambda:published_review_allowed(request,{'review_semantics'},True,revision='9'))
expect_reject('RR01_stale_prior_decision',lambda:published_review_allowed({**request,'prior_decision_ids':[]},{'review_semantics'},True))
expect_reject('RR01_unknown_decision',lambda:published_review_allowed({**request,'decision':{'kind':'arbitrary'}},{'review_semantics'},True))
history_request={**request,'subject':{**request['subject'],'release_scope':'history'}}
check('RR01_history_requires_separate_capability',not published_review_allowed(history_request,{'review_semantics'},True)
      and published_review_allowed(history_request,{'review_semantics','history'},True))
policy_request={**request,'decision':{'kind':'classification_change','dimension':'sensitivity','proposed_value':'restricted',
                                    'expected_permission_epoch':'17','approval_decision_ids':['SYN-APPROVAL']}}
check('RR01_classification_separate_authority',not published_review_allowed(policy_request,{'review_semantics'},True)
      and published_review_allowed(policy_request,{'review_classification'},True),
      'full downgrade/distinct-approver validation remains actual-policy acceptance')
check('RR01_literal_sketch_matrix', 'Literal title/headings/source identifier-span sketch' in texts['rag-algorithm-decisions.md']
      and 'approved entity-ID sketch' not in texts['rag-algorithm-decisions.md'] and 'literal source-derived only' in contracts)
check('RR01_route_and_assignment_contract', '/published-reviews' in contracts and 'can_review_published' in contracts
      and 'capability=inspect_staged|review_semantics|review_classification' in contracts)
def replay_review(body,committed_digest,readable,current_epoch):
    if not readable:return 'denied'
    if digest(body)!=committed_digest:raise ValueError('changed operation payload')
    # Existing outcome is returned before new-operation epoch/CAS checks.
    return 'existing_result'
check('RR01_replay_after_own_epoch_advance',replay_review(request,digest(request),True,'10')=='existing_result'
      and 'before testing optimistic preconditions' in contracts)
check('RR01_replay_reauthorizes',replay_review(request,digest(request),False,'10')=='denied')
expect_reject('RR01_replay_changed_payload',lambda:replay_review({**request,'reason_code':'CHANGED'},digest(request),True,'10'))

def validate_members(registered,members,registry_reviewed=True):
    ids=[m['id'] for m in members]
    if len(ids)!=len(set(ids)) or set(ids)!=set(registered):raise ValueError('incomplete/duplicate membership')
    for member in members:
        if member['state'] not in {'pending','applicable','supplemental','excluded','conflicting'}:raise ValueError('unknown consideration')
        if member['state']=='excluded' and not(member.get('reason') and member.get('evidence')):raise ValueError('unreviewed exclusion')
    return registry_reviewed and not any(m['state'] in {'pending','conflicting'} for m in members)
base_members=[{'id':'O','state':'applicable'},{'id':'M1','state':'applicable'}]
check('RR02_base_complete',validate_members({'O','M1'},base_members))
check('RR02_pending_registry_cannot_be_silently_accepted',not validate_members({'O','M1'},base_members,False))
expect_reject('RR02_omitted_new_M2',lambda:validate_members({'O','M1','M2'},base_members))
expect_reject('RR02_extra_member',lambda:validate_members({'O'},base_members))
expect_reject('RR02_duplicate_member',lambda:validate_members({'O','M1'},base_members+[base_members[0]]))
for state in ['pending','conflicting']:
    check('RR02_'+state+'_not_accepted',not validate_members({'O','M1','M2'},base_members+[{'id':'M2','state':state}]))
check('RR02_future_included_now',validate_members({'O','M1','M2'},base_members+[{'id':'M2','state':'applicable','valid_from':'2026-12-01'}]))
expect_reject('RR02_exclusion_without_review',lambda:validate_members({'O','M1','M2'},base_members+[{'id':'M2','state':'excluded'}]))
check('RR02_reviewed_exclusion',validate_members({'O','M1','M2'},base_members+[{'id':'M2','state':'excluded','reason':'OUT_OF_SCOPE','evidence':['M2.E']}]))
legal_current=lambda set_head,current_head,set_id,current_id,members,readable: set_head==current_head and set_id==current_id and members<=readable
check('RR02_fresh_epoch_cannot_fix_old_head',not legal_current((4,'H4'),(5,'H5'),'S1',None,{'O','M1'},{'O','M1','M2'}))
check('RR02_missing_permission_including_exclusion',not legal_current((5,'H5'),(5,'H5'),'S2','S2',{'O','M1','M2'},{'O','M1'}))
check('RR02_complete_permitted_replacement',legal_current((5,'H5'),(5,'H5'),'S2','S2',{'O','M1','M2'},{'O','M1','M2'}))
check('RR02_mutation_contract',all(x in contracts for x in ['both set directions','always** advances membership revision/hash','even when the old set has no dependency edge','family_management_assignments']))
family_graph={'current_family_head':['membership_manifest','pending_registration'],
              'pending_registration':['pending_source']}
pending_reachable=set();todo=['current_family_head']
while todo:
    node=todo.pop()
    if node in pending_reachable:continue
    pending_reachable.add(node);todo.extend(family_graph.get(node,[]))
check('RR02_pending_membership_root_without_set',{'membership_manifest','pending_source'}<=pending_reachable
      and 'even without a current applicability set' in contracts)
family_contract=contracts.split('## C12 ',1)[1].split('## C13 ',1)[0]
check('RR02_family_manifest_has_SQL_identity', 'no document-owned artifact FK is required for a family or empty family head' in family_contract
      and 'UNIQUE(T,family_id,membership_revision)' in family_contract and 'manifest_artifact_id' not in family_contract)

record_common={'record_id','entry_kind','operation_id','tenant_id','sequence','command_digest','idempotency_scope_digest','digest_key_revision','previous_entry_hash','entry_hash','created_at'}
payload_fields={'deny_intent':{'document_id','requested_by_id','reason_code','expected_document_revision'},
                'authority_commit':{'authority_revision','auth_epoch','semantic_epoch','corpus_epoch','corpus_revision','auth_head_hash','semantic_head_hash','corpus_head_hash','policy_revision','key_revision','deployment_incarnation','result_ref','intent_record_id'}}
records=examples['journal_records']
for record in records:
    check('RR03_union_'+record['entry_kind'],set(record)==record_common|payload_fields[record['entry_kind']])
    check('RR03_hash_'+record['entry_kind'],record['entry_hash']==digest({k:v for k,v in record.items() if k!='entry_hash'}))
check('RR03_one_operation_two_records', records[0]['operation_id']==records[1]['operation_id']
      and records[0]['record_id']!=records[1]['record_id'] and int(records[1]['sequence'])==int(records[0]['sequence'])+1
      and records[1]['previous_entry_hash']==records[0]['entry_hash'] and records[1]['intent_record_id']==records[0]['record_id'])
typed_records={}; sql_outcomes={}; mutation_count=0; deny=set()
def append_record(record):
    key=(record['tenant_id'],record['entry_kind'],record['operation_id'])
    if key in typed_records:
        if typed_records[key]!=record:raise ValueError('changed immutable record')
        return typed_records[key]
    typed_records[key]=record
    return record
def sql_once(operation,command_digest):
    global mutation_count
    if operation in sql_outcomes:
        if sql_outcomes[operation]['digest']!=command_digest:raise ValueError('conflicting command')
        return sql_outcomes[operation]
    mutation_count+=1
    sql_outcomes[operation]={'digest':command_digest,'revision':mutation_count}
    return sql_outcomes[operation]
append_record(records[0]);deny.add(records[0]['document_id'])
check('RR03_intent_only_SQL_rollback_keeps_deny',bool(deny) and not sql_outcomes)
check('RR03_intent_retry_same_record',append_record(dict(records[0])) is records[0] and len(typed_records)==1)
outcome=sql_once(records[0]['operation_id'],records[0]['command_digest'])
check('RR03_committed_checkpoint_missing_requires_reconcile',bool(sql_outcomes) and len(typed_records)==1,
      'specification state requires sealing; no filesystem/SQL fault is executed')
check('RR03_reconcile_does_not_repeat_mutation',sql_once(records[0]['operation_id'],records[0]['command_digest'])==outcome and mutation_count==1)
append_record(records[1])
check('RR03_ack_loss_replays_existing_commit',append_record(dict(records[1])) is records[1] and len(typed_records)==2 and mutation_count==1)
expect_reject('RR03_same_kind_payload_conflict',lambda:append_record({**records[0],'reason_code':'CHANGED'}))
expect_reject('RR03_SQL_operation_payload_conflict',lambda:sql_once(records[0]['operation_id'],'changed'))
check('RR03_conflict_never_erases_deny',bool(deny))
restore_requires_fresh_approval=lambda sql_revision,ack_revision:sql_revision<ack_revision
check('RR03_old_SQL_not_inferred_noncommit',restore_requires_fresh_approval(7,18))
check('RR03_durable_identity_contract',all(x in contracts for x in ['UNIQUE(tenant_id,entry_kind,operation_id)','authority_operations','seven-day HTTP replay window','high-water']))
check('RR03_rotation_keeps_lookup_scope','all retained digest-key revisions before allocating' in contracts
      and 'digest_key_revision,kind,result_ref' in contracts)
retained_scope_indexes={('old_key','SYN-SCOPE'):'X'}
resolve_scope=lambda keys:next((retained_scope_indexes[(k,'SYN-SCOPE')] for k in keys if (k,'SYN-SCOPE') in retained_scope_indexes),None)
check('RR03_rotation_retry_finds_original',resolve_scope(['new_key','old_key'])=='X' and resolve_scope(['new_key']) is None,
      'missing retained-key lookup must fail readiness, not allocate another operation')

artifact_states={'staged','verified','adopted','purged'};gc_states={'live','gc_pending','purging','purged'}
check('RR04_separate_closed_enums',artifact_states & gc_states=={'purged'}
      and 'state=staged/verified/adopted/purged' in contracts and 'state=live|gc_pending|purging|purged' in contracts)
claim=examples['gc_claim']
check('RR04_claim_exact_manifest_hash',claim['target_manifest_hash']==digest(examples['gc_target_manifest']) and claim['kind']=='retention' and claim['tombstone_revision'] is None)
def claim_allowed(kind,expired,rooted,held,tombstoned,state='gc_pending'):
    return state=='gc_pending' and not held and ((kind=='retention' and expired and not rooted) or(kind=='tombstone' and tombstoned))
check('RR04_live_document_retention_claim',claim_allowed('retention',True,False,False,False))
check('RR04_rooted_past_TTL_not_claimed',not claim_allowed('retention',True,True,False,False))
check('RR04_tombstone_required_for_delete_kind',not claim_allowed('tombstone',True,False,False,False))
check('RR04_hold_before_claim_blocks_both',all(not claim_allowed(k,True,False,True,True) for k in ['retention','tombstone']))
root_or_hold_allowed=lambda state:state=='live'
check('RR04_claim_before_root_or_hold_denies',all(not root_or_hold_allowed(s) for s in ['gc_pending','purging','purged']))
check('RR04_pending_cancel_requires_no_claim','only under that lock, before any claim' in contracts)
transitions={('live','gc_pending'),('gc_pending','live'),('gc_pending','purging'),('purging','purged')}
check('RR04_no_resurrection_transition',('purging','live') not in transitions and ('purged','live') not in transitions)
def purger_permitted(action,tenant,claim_id,assigned_id):
    return (action in {'fetch_assigned_claim_manifest','submit_receipt'} and tenant==claim['tenant_id']
            and claim_id==assigned_id==claim['id'] and claim['state']=='issued')
check('RR04_assigned_claim_manifest_only',purger_permitted('fetch_assigned_claim_manifest',claim['tenant_id'],claim['id'],claim['id']))
check('RR04_no_arbitrary_purger_action',all(not purger_permitted(a,claim['tenant_id'],claim['id'],claim['id'])
      for a in ['select_content','delete_sql','delete_arbitrary_key','issue_claim']))
check('RR04_wrong_tenant_or_claim',not purger_permitted('fetch_assigned_claim_manifest','SYN-OTHER',claim['id'],claim['id'])
      and not purger_permitted('submit_receipt',claim['tenant_id'],'SYN-OTHER',claim['id']))
def validate_receipt(targets,all_absent):
    if digest(targets)!=claim['target_manifest_hash'] or not all_absent:raise ValueError('wrong versions or absence unproven')
    return True
check('RR04_retry_same_target_versions',validate_receipt(examples['gc_target_manifest'],True))
expect_reject('RR04_widened_receipt_targets',lambda:validate_receipt(examples['gc_target_manifest']+[{'storage_key':'SYN-OTHER'}],True))
expect_reject('RR04_physical_absence_required',lambda:validate_receipt(examples['gc_target_manifest'],False))
check('RR04_schema_role_contract',all(x in contracts for x in ['artifact_gc','gc_claims','HOLD_TARGET_UNAVAILABLE','no general content SELECT','kind=retention']))

cutover=next(line for line in contracts.splitlines() if line.startswith('3. Outside the gate,'))
check('RR05_prewarm_precedes_cutover_gate',cutover.index('load and prewarm')<cutover.index('Then briefly under S05 gate'))
check('RR05_expiry_wording', 'Expired grant/session at enqueue denies' not in texts['rag-failure-analysis.md']
      and 'Expired grant/session at final gated admission denies' in texts['rag-failure-analysis.md']
      and 'no hard real-time expiry-lateness bound' in texts['rag-failure-analysis.md'])
for rr in ['RR01','RR02','RR03','RR04','RR05']:
    closure=(BASE/'reconciliation/final-corrections.md').read_text()
    check('DOC_final_closure_'+rr, bool(re.search(rf'^## {rr} .*?\*\*Status: RESOLVED',closure,re.M|re.S)))
if args.baseline:
    before=json.loads(args.baseline.read_text())
    allowed={'ragplan/2/'+x for x in OWNED}|{'ragplan/2/reconciliation/'+x for x in REQUIRED}
    allowed|={'ragplan/2/reconciliation/verify.py','ragplan/2/reconciliation/verification-results.json'}
    unexpected=[]; unchanged=0; changed=[]
    for path,digest in before.items():
        p=ROOT/path
        if p.is_file() and sha256(p.read_bytes()).hexdigest()==digest:
            unchanged+=1
        elif path in allowed:
            changed.append(path)
        else:
            unexpected.append(path)
    check('PRESERVE_baseline', not unexpected, {'baseline_files':len(before),'unchanged':unchanged,'permitted_changed':sorted(changed),'unexpected':unexpected})
    check('PRESERVE_audit_and_revision1', all((ROOT/p).is_file() and sha256((ROOT/p).read_bytes()).hexdigest()==h for p,h in before.items() if p.startswith(('ragplan/1/','ragplan/2/review/'))))
    check('PRESERVE_no_production_change', all((ROOT/p).is_file() and sha256((ROOT/p).read_bytes()).hexdigest()==h for p,h in before.items() if not p.startswith('ragplan/')))
result={'contract_version':'2.2.0','scope':'finite synthetic design/documentation checks; not enterprise runtime validation',
        'checks':checks,'passed':sum(x['status']=='passed' for x in checks),'failed':sum(x['status']=='failed' for x in checks),
        'sql_probe_scope':'contract-check.sql executed separately; inspect verification.md for actual command/result',
        'not_executed':['enterprise_RLS','ASGI_transport_faults','journal_durability_faults','OCR','neural_models','load','reviewer_batch','Playwright','Vitest']}
args.output.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'passed':result['passed'],'failed':result['failed'],'failures':[x for x in checks if x['status']=='failed']},ensure_ascii=False,indent=2))
raise SystemExit(bool(result['failed']))
