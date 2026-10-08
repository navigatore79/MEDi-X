#!/usr/bin/env python3
"""Install a locally downloaded official Vosk Italian archive, with bounded safe extraction."""
import argparse, hashlib, json, shutil, tempfile, zipfile
from pathlib import Path, PurePosixPath
p=argparse.ArgumentParser()
p.add_argument('--archive',required=True,help='vosk-model-small-it-0.22.zip from https://alphacephei.com/vosk/models')
p.add_argument('--sha256',help='Optional expected checksum from an independently verified copy')
a=p.parse_args()
archive=Path(a.archive).resolve()
if archive.stat().st_size>100*1024*1024:raise SystemExit('Archive exceeds 100 MiB')
digest=hashlib.sha256(archive.read_bytes()).hexdigest()
if a.sha256 and digest.lower()!=a.sha256.lower():raise SystemExit('Checksum mismatch')
root=Path(__file__).resolve().parents[1]
target=root/'app/src/main/assets/medi-model-it'
if target.exists():raise SystemExit('Target already exists; review/remove it before replacing the model')
with zipfile.ZipFile(archive) as z, tempfile.TemporaryDirectory() as tmp:
    entries=z.infolist()
    if sum(x.file_size for x in entries)>200*1024*1024:raise SystemExit('Uncompressed archive exceeds 200 MiB')
    for x in entries:
        path=PurePosixPath(x.filename)
        if path.is_absolute() or '..' in path.parts or '\\' in x.filename:raise SystemExit('Unsafe archive path')
        if (x.external_attr>>16)&0o170000==0o120000:raise SystemExit('Symlinks are not accepted')
    z.extractall(tmp)
    model=Path(tmp)/'vosk-model-small-it-0.22'
    for name in ['am/final.mdl','conf/model.conf','graph/HCLr.fst','graph/Gr.fst']:
        if not (model/name).is_file():raise SystemExit('Unexpected model layout: '+name)
    shutil.copytree(model,target)
(target/'uuid').write_text(digest+'\n')
(root/'MEDI_MODEL_MANIFEST.json').write_text(json.dumps({'archive':archive.name,'sha256':digest,'license':'Apache-2.0','source':'https://alphacephei.com/vosk/models','checksum_independently_verified':bool(a.sha256)},indent=2)+'\n')
print('Model installed. Archive SHA-256:',digest)
print('Keep third-party notices and license with the distributed application.')
