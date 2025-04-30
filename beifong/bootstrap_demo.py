#!/usr/bin/env python3

import os
import sys
import tempfile
import requests
import zipfile

OWNER      = "arun477"
REPO       = "beifong"
TAG        = "v0.1-demo"
ASSET_NAME = "demo_content.zip"
TARGET_DIRS = ["databases", "podcasts"]

def ensure_empty(dir_path):
    """check if directory is empty (or create it). exit if not empty."""
    if os.path.exists(dir_path):
        if os.listdir(dir_path):
            print(f"✗ '{dir_path}' is not empty. aborting.")
            sys.exit(1)
    else:
        os.makedirs(dir_path, exist_ok=True)

def get_asset_url_by_tag(owner, repo, tag, asset_name):
    """query github api for the release asset download url by tag."""
    api_url = f"https://api.github.com/repos/{owner}/{repo}/releases/tags/{tag}"
    resp = requests.get(api_url)
    resp.raise_for_status()
    data = resp.json()
    for asset in data.get("assets", []):
        if asset.get("name") == asset_name:
            return asset.get("browser_download_url")
    print(f"✗ asset '{asset_name}' not found in release tag '{tag}'.")
    sys.exit(1)

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
    print("populating...")
    for d in TARGET_DIRS:
        ensure_empty(d)
    url = get_asset_url_by_tag(OWNER, REPO, TAG, ASSET_NAME)
    with tempfile.TemporaryDirectory() as tmp:
        tmp_zip = os.path.join(tmp, ASSET_NAME)
        download_file(url, tmp_zip)
        extract_zip(tmp_zip, os.getcwd())
    print("✓ demo folders populated successfully.")

if __name__ == "__main__":
    main()
