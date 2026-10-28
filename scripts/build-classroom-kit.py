"""Build or verify the classroom source manifest and reproducible ZIP (Python 3, stdlib)."""
import argparse
import hashlib
import io
import json
from pathlib import Path
import zipfile

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "docs" / "classroom"


def artifacts():
    meta = json.loads((SOURCE / "manifest.json").read_text(encoding="utf-8"))
    app = json.loads((ROOT / "package.json").read_text(encoding="utf-8"))
    if meta["appVersion"] != app["version"]:
        raise ValueError("Review classroom appVersion before rebuilding for a new app release")
    if meta["status"] != "prepared_not_executed":
        raise ValueError("This distribution must remain an unexecuted template")
    files = sorted(p for p in SOURCE.rglob("*") if p.suffix in (".md", ".csv"))
    payload = {p.relative_to(SOURCE).as_posix(): p.read_bytes() for p in files}
    csvs = [name for name in payload if name.endswith(".csv")]
    if len(csvs) != 5:
        raise ValueError("Expected five empty classroom registers")
    for name in csvs:
        lines = payload[name].decode("utf-8").splitlines()
        if len(lines) != 1 or not lines[0].startswith("session_id,"):
            raise ValueError(f"Only header-only templates may be distributed: {name}")
    meta["files"] = [
        {"path": name, "sha256": hashlib.sha256(data).hexdigest()}
        for name, data in payload.items()
    ]
    manifest = (json.dumps(meta, ensure_ascii=False, indent=2) + "\n").encode("utf-8")
    payload["manifest.json"] = manifest
    output = io.BytesIO()
    # Fixed metadata makes repeated builds byte-identical on the same toolchain.
    with zipfile.ZipFile(output, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        for name, data in sorted(payload.items()):
            info = zipfile.ZipInfo(name, (2026, 10, 28, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            info.create_system = 3
            info.external_attr = 0o100644 << 16
            archive.writestr(info, data, compresslevel=9)
    target = ROOT / "docs" / "downloads" / f"neural-atlas-aula-v{meta['appVersion']}.zip"
    return manifest, payload, output.getvalue(), target


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="Verify without modifying files")
    args = parser.parse_args()
    manifest, payload, archive_bytes, target = artifacts()
    if args.check:
        if (SOURCE / "manifest.json").read_bytes() != manifest:
            raise ValueError("Classroom manifest is stale")
        with zipfile.ZipFile(target) as archive:
            if archive.testzip() is not None:
                raise ValueError("Classroom ZIP CRC mismatch")
            if sorted(archive.namelist()) != sorted(payload):
                raise ValueError("Classroom ZIP entries differ from sources")
            for name, data in payload.items():
                if archive.read(name) != data:
                    raise ValueError(f"Classroom ZIP contains a stale entry: {name}")
        print(f"Verified manifest, {len(payload)} ZIP entries and five header-only registers")
    else:
        (SOURCE / "manifest.json").write_bytes(manifest)
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(archive_bytes)
        print(f"Built {target.name}: {len(payload)} entries, {len(archive_bytes)} bytes")


if __name__ == "__main__":
    main()
