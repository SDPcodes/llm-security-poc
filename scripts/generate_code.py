import openai
import os
import json
import time

client = openai.OpenAI(api_key=os.environ["OPENAI_API_KEY"])

# Load prompts
strategies = {}

for name in ['zero_shot', 'security_instructed', 'few_shot']:
    with open(f'prompts/{name}.txt') as f:
        strategies[name] = f.read()

# Generate for each strategy x 3 repetitions
for strategy_name, prompt in strategies.items():
    for rep in range(1, 4):
        print(f'Generating: {strategy_name} rep {rep}/3...')

        response = client.chat.completions.create(
            model='gpt-4o',
            messages=[
                {'role': 'user', 'content': prompt}
            ],
            temperature=0.7,
            max_tokens=4096
        )

        code = response.choices[0].message.content

        fname = f'generated-code/a07_gpt4o_{strategy_name}_rep{rep}.md'

        with open(fname, 'w') as f:
            f.write(code)

        print(f' Saved: {fname} ({len(code)} chars)')

        time.sleep(2)  # Rate limit courtesy

print('Done! 9 samples generated in generated-code/')