import glob
import os
import sys

weights_dir = os.path.join(os.path.dirname(__file__), "weights")
target_file = os.path.join(weights_dir, "model.safetensors")
parts = sorted(glob.glob(os.path.join(weights_dir, "model.safetensors.part*")))

if os.path.exists(target_file) and os.path.getsize(target_file) > 0:
    print(f"[OK] {target_file} already exists ({os.path.getsize(target_file):,} bytes). Skipping reassembly.")
    sys.exit(0)

if not parts:
    print("Error: No split parts found in weights directory!")
    sys.exit(1)

print(f"Found {len(parts)} split parts. Reassembling into {target_file}...")
with open(target_file, "wb") as out:
    for i, p in enumerate(parts, 1):
        print(f"  [{i}/{len(parts)}] Merging {os.path.basename(p)}...")
        with open(p, "rb") as src:
            out.write(src.read())

total_size = os.path.getsize(target_file)
print(f"\n[SUCCESS] Reassembled model.safetensors ({total_size:,} bytes).")
