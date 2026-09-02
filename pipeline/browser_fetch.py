# -*- coding: utf-8 -*-
"""Fetch com navegador real (Playwright/Chromium) — usado apenas para a
tentativa única prevista no plano contra fontes com challenge (OLX).
Lê pipeline/browser_queue.txt (URL\tlabel), salva HTML renderizado em
raw/{dominio}/{label}.html + meta. Cadência lenta (8-15s)."""
import json
import os
import random
import re
import sys
import time
from datetime import datetime, timezone
from urllib.parse import urlparse

from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
QUEUE = os.path.join(ROOT, "pipeline", "browser_queue.txt")
RAW = os.path.join(ROOT, "raw")

items = []
for line in open(QUEUE, encoding="utf-8"):
    line = line.strip()
    if line and not line.startswith("#"):
        parts = line.split("\t")
        items.append((parts[0], parts[1] if len(parts) > 1 else None))

with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True)
    ctx = browser.new_context(
        locale="pt-BR",
        viewport={"width": 1366, "height": 900},
        user_agent=("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
                    "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"),
    )
    page = ctx.new_page()
    for url, label in items:
        host = urlparse(url).netloc
        d = os.path.join(RAW, host)
        os.makedirs(d, exist_ok=True)
        slug = re.sub(r"[^A-Za-z0-9._-]+", "_", label or url)[:80]
        status, err = None, None
        try:
            resp = page.goto(url, wait_until="domcontentloaded", timeout=45000)
            status = resp.status if resp else None
            # espera challenge do Cloudflare resolver (ou não)
            for _ in range(6):
                time.sleep(5)
                title = (page.title() or "").lower()
                if "attention required" not in title and "just a moment" not in title:
                    break
            html = page.content()
            with open(os.path.join(d, slug + ".html"), "w", encoding="utf-8") as f:
                f.write(html)
        except Exception as e:
            err = f"{type(e).__name__}: {e}"[:200]
            html = ""
        meta = {"url": url, "final_url": page.url, "http_status": status,
                "fetched_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
                "bytes": len(html), "label": label, "metodo": "playwright-chromium",
                "erro": err}
        with open(os.path.join(d, slug + ".meta.json"), "w", encoding="utf-8") as f:
            json.dump(meta, f, ensure_ascii=False, indent=1)
        print(status, url, err or f"{len(html)//1024}KB title={page.title()[:60]!r}")
        time.sleep(random.uniform(8, 15))
    browser.close()
print("fim")
