import os
import sys
import tempfile
import requests
import zipfile

DEMO_URL = "https://github.com/arun477/beifong/releases/download/v0.1-demo/demo_content.zip"
TARGET_DIRS = ["databases", "podcasts"]

def ensure_empty(dir_path):
    """check if directory is empty (or create it). exit if not empty."""
    if os.path.exists(dir_path):
        if os.listdir(dir_path):
            print(f"✗ '{dir_path}' is not empty. aborting.")
            sys.exit(1)
    else:
        os.makedirs(dir_path, exist_ok=True)

def download_file(url, dest_path):
    """stream-download a file from url to dest_path."""
    print("↓ downloading demo content...")
    resp = requests.get(url, stream=True)
    resp.raise_for_status()
    with open(dest_path, "wb") as f:
        for chunk in resp.iter_content(chunk_size=8192):
            f.write(chunk)

def extract_zip(zip_path, extract_to):
    """extract zip file into extract_to (project root)."""
    print("✂ extracting demo content...")
    with zipfile.ZipFile(zip_path, "r") as z:
        z.extractall(extract_to)

def main():
    print("populating demo folders…")
    for d in TARGET_DIRS:
        ensure_empty(d)
    with tempfile.TemporaryDirectory() as tmp:
        tmp_zip = os.path.join(tmp, "demo_content.zip")
        download_file(DEMO_URL, tmp_zip)
        extract_zip(tmp_zip, os.getcwd())
    print("✓ demo folders populated successfully.")

if __name__ == "__main__":
    main()
