import openai, os, glob, json

client = openai.OpenAI(api_key=os.environ['OPENAI_API_KEY'])

code_dir = 'generated-code/a07_gpt4o_zero_shot_rep3_files/backend/'
all_code = ''
for f in glob.glob(code_dir + '**/*.js', recursive=True):
    if 'node_modules' in f or not os.path.isfile(f):   # <-- skip deps + directories
        continue
    with open(f) as fh:
        all_code += f'\n// === FILE: {f} ===\n' + fh.read()

assert all_code.strip(), f'No .js files found under {code_dir}'
print(f'Loaded {len(all_code)} chars from {code_dir}')

PROMPT = f'''You are a security auditor. Analyse this Node.js web app code.
For each vulnerability, provide: CWE ID, Severity, File, Line, Description,
How it could be exploited. Focus on: SQLi, XSS, CSRF, auth flaws, hardcoded
secrets, missing input validation, session management.
CODE:
{all_code}
Respond in JSON as a list of vulnerability objects.'''

resp = client.chat.completions.create(
    model='gpt-4o',
    messages=[{'role': 'user', 'content': PROMPT}],
    temperature=0.2, max_tokens=4096)

result = resp.choices[0].message.content
os.makedirs('static-analysis', exist_ok=True)
with open('static-analysis/llm_judge_a07_zs_rep3.json', 'w') as f:
    f.write(result)
print(result)
