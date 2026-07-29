# -*- coding: utf-8 -*-
"""Fetcher educado — roda no GitHub Actions (runner tem rede aberta).

Lê pipeline/fetch_queue.txt (uma URL por linha, opcional "\tlabel"),
respeita robots.txt, espera 2-4s com jitter entre requisições ao MESMO
domínio, usa user-agent identificável, e salva HTML bruto + metadados em
raw/{dominio}/{slug}.html|.meta.json. Log em saida/fetch_log.csv.

Este script NÃO interpreta conteúdo. Toda extração acontece na sessão
Claude, a partir do cache bruto.
"""
import csv
import hashlib
import json
import os
import random
import re
import sys
import time
import urllib.robotparser
from datetime import datetime, timezone
from urllib.parse import urlparse

import requests

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
QUEUE = os.path.join(ROOT, "pipeline", "fetch_queue.txt")
RAW = os.path.join(ROOT, "raw")
LOG = os.path.join(ROOT, "saida", "fetch_log.csv")

UA = ("TerrenosUberlandiaResearch/1.0 "
      "(coleta educada de anuncios publicos p/ estudo de mercado; "
      "contato: sidney@propbank.ai)")
HEADERS = {"User-Agent": UA, "Accept-Language": "pt-BR,pt;q=0.9"}
DELAY_MIN, DELAY_MAX = 2.0, 4.0
TIMEOUT = 30
MAX_BYTES = 12_000_000  # PDFs oficiais podem passar de 3MB; anúncio não chega perto


def slugify(url: str, label: str | None) -> str:
    if label:
        base = re.sub(r"[^A-Za-z0-9._-]+", "_", label)[:80]
    else:
        p = urlparse(url)
        base = re.sub(r"[^A-Za-z0-9._-]+", "_", (p.path + "_" + p.query).strip("_"))[:70] or "index"
    h = hashlib.md5(url.encode()).hexdigest()[:8]
    return f"{base}_{h}"


def load_queue():
    global DELAY_MIN, DELAY_MAX
    items = []
    with open(QUEUE, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                m = re.match(r"#\s*delay=(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)", line or "")
                if m:
                    DELAY_MIN, DELAY_MAX = float(m.group(1)), float(m.group(2))
                    print(f"delay configurado: {DELAY_MIN}-{DELAY_MAX}s")
                continue
            parts = line.split("\t")
            url = parts[0].strip()
            label = parts[1].strip() if len(parts) > 1 else None
            items.append((url, label))
    return items


class Robots:
    def __init__(self, session):
        self.session = session
        self.cache: dict[str, tuple] = {}

    def check(self, url: str):
        """-> (allowed: bool|None, note). None = robots inacessível (tratado como permitido, anotado)."""
        p = urlparse(url)
        origin = f"{p.scheme}://{p.netloc}"
        if origin not in self.cache:
            robots_url = origin + "/robots.txt"
            rp = urllib.robotparser.RobotFileParser()
            note = ""
            try:
                r = self.session.get(robots_url, headers=HEADERS, timeout=TIMEOUT)
                if r.status_code == 200:
                    rp.parse(r.text.splitlines())
                    # guarda o robots bruto também
                    d = os.path.join(RAW, p.netloc)
                    os.makedirs(d, exist_ok=True)
                    with open(os.path.join(d, "robots.txt"), "w", encoding="utf-8", errors="replace") as f:
                        f.write(r.text)
                    self.cache[origin] = (rp, f"robots 200")
                else:
                    self.cache[origin] = (None, f"robots http {r.status_code}")
            except Exception as e:
                self.cache[origin] = (None, f"robots erro: {type(e).__name__}")
            time.sleep(random.uniform(DELAY_MIN, DELAY_MAX))
        rp, note = self.cache[origin]
        if rp is None:
            return None, note
        return rp.can_fetch(UA, url), note


def main():
    os.makedirs(RAW, exist_ok=True)
    os.makedirs(os.path.dirname(LOG), exist_ok=True)
    items = load_queue()
    session = requests.Session()
    robots = Robots(session)
    last_hit: dict[str, float] = {}

    new_log = not os.path.exists(LOG)
    logf = open(LOG, "a", newline="", encoding="utf-8")
    logw = csv.writer(logf, delimiter=";")
    if new_log:
        logw.writerow(["fetched_at", "url", "final_url", "http_status", "bytes",
                       "robots", "arquivo", "erro"])

    for url, label in items:
        host = urlparse(url).netloc
        allowed, rnote = robots.check(url)
        now = datetime.now(timezone.utc).isoformat(timespec="seconds")
        if allowed is False:
            print(f"ROBOTS-BLOQUEADO {url}")
            logw.writerow([now, url, "", "", "", f"disallow ({rnote})", "", "robots disallow"])
            continue

        # rate limit por domínio
        wait = last_hit.get(host, 0) + random.uniform(DELAY_MIN, DELAY_MAX) - time.time()
        if wait > 0:
            time.sleep(wait)

        status, final_url, err, path_rel = "", "", "", ""
        body = b""
        try:
            r = session.get(url, headers=HEADERS, timeout=TIMEOUT, stream=True)
            status = r.status_code
            final_url = r.url
            for chunk in r.iter_content(65536):
                body += chunk
                if len(body) > MAX_BYTES:
                    err = "truncado em MAX_BYTES"
                    break
        except Exception as e:
            err = f"{type(e).__name__}: {e}"[:200]
        last_hit[host] = time.time()

        if body:
            d = os.path.join(RAW, host)
            os.makedirs(d, exist_ok=True)
            slug = slugify(url, label)
            with open(os.path.join(d, slug + ".html"), "wb") as f:
                f.write(body)
            meta = {"url": url, "final_url": final_url, "http_status": status,
                    "fetched_at": now, "bytes": len(body), "label": label,
                    "content_type": r.headers.get("Content-Type", "") if not err else "",
                    "robots": rnote, "user_agent": UA, "erro": err or None}
            with open(os.path.join(d, slug + ".meta.json"), "w", encoding="utf-8") as f:
                json.dump(meta, f, ensure_ascii=False, indent=1)
            path_rel = f"raw/{host}/{slug}.html"

        print(f"{status or 'ERR'} {url} -> {path_rel or err}")
        logw.writerow([now, url, final_url, status, len(body),
                       f"ok ({rnote})" if allowed else f"sem robots ({rnote})",
                       path_rel, err])
        logf.flush()

    logf.close()
    print("fim da fila")


if __name__ == "__main__":
    sys.exit(main())
