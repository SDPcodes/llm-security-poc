import re
import os
import sys


def extract_code_files(markdown_file, output_dir):
    with open(markdown_file, 'r') as f:
        content = f.read()

    os.makedirs(output_dir, exist_ok=True)

    # Find code blocks with filenames
    blocks = re.findall(
        r'```(?:javascript|js|jsx|json|sql|typescript|ts|bash|sh|css)\n'
        r'(?://|#|/\*)?\s*(?:filename:|File:|file:)?\s*([\w./\-]+)\n'
        r'(.*?)```',
        content,
        re.DOTALL
    )

    if not blocks:
        print('No auto-extractable blocks found. Manual extraction needed.')
        return

    for filename, code in blocks:
        filepath = os.path.join(output_dir, filename)

        os.makedirs(
            os.path.dirname(filepath) or '.',
            exist_ok=True
        )

        with open(filepath, 'w') as f:
            f.write(code.strip())

        print(f'Extracted: {filepath}')


# Extract first sample
md_file = (
    sys.argv[1]
    if len(sys.argv) > 1
    else 'generated-code/a07_gpt4o_zero_shot_rep1.md'
)

out_dir = md_file.replace('.md', '_files/')

extract_code_files(md_file, out_dir)