#!/usr/bin/env python3
"""Convert USAGE.md to PDF with Chinese support using fpdf2."""
import re
from fpdf import FPDF

class ChinesePDF(FPDF):
    def __init__(self):
        super().__init__()
        self.add_font('Noto', '', '/home/ubuntu/.fonts/NotoSansSC-Regular.otf')

    def footer(self):
        self.set_y(-15)
        self.set_font('Noto', '', 9)
        self.set_text_color(128, 128, 128)
        self.cell(0, 10, f'第 {self.page_no()} 页', align='C')

def clean_markdown(text):
    """Remove markdown formatting from text."""
    text = re.sub(r'\*\*([^*]+)\*\*', r'\1', text)
    text = re.sub(r'\*([^*]+)\*', r'\1', text)
    text = re.sub(r'💡 ', '', text)
    return text

def write_paragraph(pdf, text, font_size=11):
    """Write a paragraph with proper handling."""
    pdf.set_font('Noto', '', font_size)
    pdf.set_x(15)  # Reset to left margin
    pdf.multi_cell(180, 7, text)

# Read markdown file
with open('/home/ubuntu/projects/yibiao-simple/docs/USAGE.md', 'r', encoding='utf-8') as f:
    md_content = f.read()

# Create PDF
pdf = ChinesePDF()
pdf.set_auto_page_break(auto=True, margin=20)
pdf.add_page()

lines = md_content.split('\n')
i = 0
in_table = False
table_data = []

while i < len(lines):
    line = lines[i]

    # Skip horizontal rules
    if line.strip() == '---':
        i += 1
        continue

    # Reset x position at the start of each line
    pdf.set_x(15)

    # Title (H1)
    if line.startswith('# '):
        text = line[2:].strip()
        pdf.ln(10)
        pdf.set_font('Noto', '', 24)
        pdf.set_text_color(26, 54, 93)
        pdf.multi_cell(180, 12, text)
        pdf.ln(5)

    # H2
    elif line.startswith('## '):
        text = line[3:].strip()
        pdf.ln(8)
        pdf.set_font('Noto', '', 16)
        pdf.set_text_color(44, 82, 130)
        pdf.multi_cell(180, 10, text)
        pdf.ln(3)

    # H3
    elif line.startswith('### '):
        text = line[4:].strip()
        pdf.ln(5)
        pdf.set_font('Noto', '', 14)
        pdf.set_text_color(43, 108, 176)
        pdf.multi_cell(180, 9, text)
        pdf.ln(2)

    # Table
    elif line.startswith('|'):
        if not in_table:
            in_table = True
            table_data = []

        if re.match(r'^\|[-:\s|]+\|$', line):
            i += 1
            continue

        cells = [c.strip() for c in line.split('|')[1:-1]]
        table_data.append(cells)

        if i + 1 >= len(lines) or not lines[i + 1].startswith('|'):
            if table_data:
                pdf.ln(5)
                pdf.set_font('Noto', '', 10)

                col_count = len(table_data[0]) if table_data else 2
                col_widths = [54, 126] if col_count == 2 else [180 / col_count] * col_count

                for row_idx, row in enumerate(table_data):
                    for col_idx, cell in enumerate(row):
                        if row_idx == 0:
                            pdf.set_fill_color(226, 232, 240)
                            pdf.set_text_color(26, 54, 93)
                        else:
                            pdf.set_fill_color(255, 255, 255)
                            pdf.set_text_color(0, 0, 0)
                        pdf.cell(col_widths[col_idx], 8, clean_markdown(cell)[:40], border=1, fill=True)
                    pdf.ln()

                pdf.ln(5)
            in_table = False
            table_data = []

    # Bullet list
    elif line.startswith('- '):
        text = clean_markdown(line[2:].strip())
        pdf.set_font('Noto', '', 11)
        pdf.set_text_color(0, 0, 0)
        pdf.multi_cell(180, 7, f'  • {text}')

    # Numbered list
    elif re.match(r'^\d+\. ', line):
        text = clean_markdown(re.sub(r'^\d+\. ', '', line))
        num = re.match(r'^(\d+)\.', line).group(1)
        pdf.set_font('Noto', '', 11)
        pdf.set_text_color(0, 0, 0)
        pdf.multi_cell(180, 7, f'  {num}. {text}')

    # Blockquote
    elif line.startswith('> '):
        text = clean_markdown(line[2:].strip())
        pdf.set_font('Noto', '', 11)
        pdf.set_text_color(74, 85, 104)
        pdf.multi_cell(180, 7, f'  「{text}」')
        pdf.set_text_color(0, 0, 0)

    # Tip
    elif line.startswith('**💡'):
        text = clean_markdown(line)
        pdf.ln(3)
        pdf.set_font('Noto', '', 11)
        pdf.set_text_color(0, 100, 150)
        pdf.set_fill_color(235, 248, 255)
        pdf.multi_cell(180, 7, text, fill=True)
        pdf.set_text_color(0, 0, 0)
        pdf.ln(2)

    # Q&A format
    elif line.startswith('**Q：'):
        q_text = clean_markdown(line)
        pdf.ln(5)
        pdf.set_font('Noto', '', 11)
        pdf.set_text_color(0, 100, 0)
        pdf.multi_cell(180, 7, q_text)

        if i + 1 < len(lines) and lines[i + 1].startswith('A：'):
            a_text = clean_markdown(lines[i + 1])
            pdf.set_text_color(50, 50, 50)
            pdf.multi_cell(180, 7, f'  {a_text}')
            pdf.set_text_color(0, 0, 0)
            i += 1

    # Regular paragraph
    elif line.strip():
        text = clean_markdown(line)
        pdf.set_font('Noto', '', 11)
        pdf.set_text_color(0, 0, 0)
        pdf.multi_cell(180, 7, text)

    i += 1

# Save PDF
output_path = '/home/ubuntu/projects/yibiao-simple/docs/USAGE.pdf'
pdf.output(output_path)
print(f'PDF created: {output_path}')