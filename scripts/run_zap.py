import requests, time, json, os

ZAP = 'http://localhost:8080'
TARGET = 'http://localhost:5000'
TAG = 'a07_zs_rep3'

os.makedirs('red-teaming', exist_ok=True)

# Seed ZAP with the API endpoints (the app is a JSON API with no crawlable links)
for u in [f'{TARGET}/api/register', f'{TARGET}/api/login', f'{TARGET}/api/profile']:
    requests.get(f'{ZAP}/JSON/core/action/accessUrl/', params={'url': u})

# Spider
print('Spidering...')
r = requests.get(f'{ZAP}/JSON/spider/action/scan/', params={'url': TARGET})
resp = r.json()
if 'scan' not in resp:
    print('Spider not started:', resp)
else:
    sid = resp['scan']
    while True:
        s = requests.get(f'{ZAP}/JSON/spider/view/status/', params={'scanId': sid}).json()['status']
        print(f'  Spider: {s}%')
        if int(s) >= 100:
            break
        time.sleep(2)

# Active scan (5-15 min)
print('Active scanning...')
r = requests.get(f'{ZAP}/JSON/ascan/action/scan/', params={'url': TARGET, 'recurse': True})
resp = r.json()
if 'scan' not in resp:
    print('Active scan not started:', resp)        # e.g. {"code":"url_not_found",...}
else:
    sid = resp['scan']
    while True:
        s = requests.get(f'{ZAP}/JSON/ascan/view/status/', params={'scanId': sid}).json()['status']
        print(f'  Active: {s}%')
        if int(s) >= 100:
            break
        time.sleep(10)

# Get alerts
alerts = requests.get(f'{ZAP}/JSON/core/view/alerts/', params={'baseurl': TARGET}).json()['alerts']
print(f'\nZAP alerts: {len(alerts)}')
for a in alerts:
    print(f"  [{a['risk']}] {a['alert']} — CWE: {a.get('cweid','N/A')}")

with open(f'red-teaming/zap_{TAG}.json', 'w') as f:
    json.dump(alerts, f, indent=2)
print(f"\nSaved {len(alerts)} alerts -> red-teaming/zap_{TAG}.json")