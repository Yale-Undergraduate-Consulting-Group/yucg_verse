import os
import csv
import re
from docx import Document
import sys
print("Using Python:", sys.executable)

# --------- CONFIG (optional) ----------
INPUT_DIR = "./raw_transcripts"      # folder containing your .docx and .txt files
OUTPUT_DIR = "./processed_csv_transcripts" # folder where CSVs will be written
# -------------------------------------


def ensure_output_dir(path):
    if not os.path.exists(path):
        os.makedirs(path)


# Heuristic regex: [Speaker] 12:34:56: text
# or Speaker: text
LINE_PATTERN = re.compile(
    r"""
    ^\s*
    (?:\[(?P<speaker_bracket>[^\]]+)\]\s*)?     # [Speaker]
    (?:(?P<speaker_plain>[A-Za-z .]+)\s*)?      # or Speaker
    (?P<timestamp>\d{1,2}:\d{2}:\d{2})?         # optional 00:00:00
    \s*[:\-]?\s*                                # optional : or - after speaker/time
    (?P<text>.*\S)?                             # the rest of the line as text
    \s*$
    """,
    re.VERBOSE,
)


def parse_line(line):
    """
    Try to extract speaker, timestamp, and text from a single line.
    If pattern doesn't really match (no text), fall back to raw line.
    """
    raw = line.rstrip("\n")
    m = LINE_PATTERN.match(raw)
    if not m:
        return "", "", raw

    speaker = m.group("speaker_bracket") or m.group("speaker_plain") or ""
    timestamp = m.group("timestamp") or ""
    text = m.group("text") or ""

    # If everything is empty, just treat as raw line
    if not speaker and not timestamp and not text:
        return "", "", raw

    return speaker.strip(), timestamp.strip(), text.strip()


def docx_to_rows(filepath):
    """Read a .docx and yield one row per paragraph-like line."""
    doc = Document(filepath)
    for para in doc.paragraphs:
        text = para.text.strip()
        if text:  # skip blank paragraphs
            yield text


def txt_to_rows(filepath):
    """Read a .txt and yield one row per line."""
    with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
        for line in f:
            # Keep empty lines if you want them; for now, skip pure whitespace
            if line.strip():
                yield line.rstrip("\n")


def convert_file_to_csv(input_path, output_path):
    """
    Convert a single .docx or .txt file to CSV with columns:
    line_number, speaker, timestamp, text
    """
    ext = os.path.splitext(input_path)[1].lower()
    if ext == ".docx":
        lines = docx_to_rows(input_path)
    elif ext == ".txt":
        lines = txt_to_rows(input_path)
    else:
        raise ValueError(f"Unsupported extension: {ext}")

    with open(output_path, "w", newline="", encoding="utf-8") as csvfile:
        writer = csv.writer(csvfile)
        writer.writerow(["line_number", "speaker", "timestamp", "text"])

        for i, line in enumerate(lines, start=1):
            speaker, timestamp, text = parse_line(line)
            writer.writerow([i, speaker, timestamp, text])


def main():
    ensure_output_dir(OUTPUT_DIR)

    for fname in os.listdir(INPUT_DIR):
        # Skip non-docx/txt
        if not fname.lower().endswith((".docx", ".txt")):
            continue

        # --- NEW: skip Word temp/lock files like "~$Erin.docx" ---
        if fname.startswith("~$"):
            print(f"Skipping temporary/lock file: {fname}")
            continue
        # ---------------------------------------------------------

        in_path = os.path.join(INPUT_DIR, fname)
        base, _ = os.path.splitext(fname)
        out_path = os.path.join(OUTPUT_DIR, base + ".csv")

        print(f"Converting {in_path} -> {out_path}")
        convert_file_to_csv(in_path, out_path)

    print("Done.")

if __name__ == "__main__":
    main()
