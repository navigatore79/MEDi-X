#!/usr/bin/env python3
"""Install the official Italian speech model with the reference archive checksum."""
import hashlib, json, subprocess, sys, tempfile, urllib.request
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
MANIFEST = json.loads((ROOT / 'MEDI_MODEL_MANIFEST.json').read_text())
TARGET = ROOT / 'app/src/main/assets/medi-model-it'
REQUIRED = ['am/final.mdl', 'conf/model.conf', 'graph/HCLr.fst', 'graph/Gr.fst', 'uuid']
if TARGET.exists():
    if not all((TARGET / name).is_file() for name in REQUIRED):
        raise SystemExit('Modello incompleto: controlla la cartella prima di reinstallarlo.')
    if (TARGET / 'uuid').read_text().strip() != MANIFEST['sha256']:
        raise SystemExit('Il modello locale non corrisponde al pacchetto di riferimento.')
    print('Modello italiano già presente.')
    raise SystemExit(0)
URL = 'https://alphacephei.com/vosk/models/vosk-model-small-it-0.22.zip'
with tempfile.TemporaryDirectory() as tmp:
    archive = Path(tmp) / 'vosk-model-small-it-0.22.zip'
    digest = hashlib.sha256()
    total = 0
    with urllib.request.urlopen(URL, timeout=90) as response, archive.open('wb') as output:
        while True:
            block = response.read(1024 * 1024)
            if not block:
                break
            total += len(block)
            if total > 100 * 1024 * 1024:
                raise SystemExit('Archivio superiore a 100 MiB.')
            digest.update(block)
            output.write(block)
    if digest.hexdigest() != MANIFEST['sha256']:
        raise SystemExit('Checksum diverso dal pacchetto Meditaly verificato: installazione interrotta.')
    subprocess.run([sys.executable, str(ROOT / 'tools/install_medi_model.py'), '--archive', str(archive), '--sha256', MANIFEST['sha256']], check=True)
