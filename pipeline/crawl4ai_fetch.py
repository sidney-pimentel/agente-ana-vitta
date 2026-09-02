# -*- coding: utf-8 -*-
"""Teste do Crawl4AI (github.com/unclecode/crawl4ai) contra fontes bloqueadas.

Lê pipeline/crawl4ai_queue.txt (URL\tlabel). Para cada URL tenta, em ordem,
os modos mais furtivos que a versão instalada suportar:
  1. browser_type="undetected" (adaptador undetected, versões >=0.7)
  2. enable_stealth=True (patches de stealth do Playwright)
  3. navegador padrão
Sempre com magic=True/simulate_user/override_navigator. Salva HTML em
raw/{host}/{label}.html + meta (modo, status, título, tamanho) e um resumo
em saida/crawl4ai_teste.csv. Cadência 6-12s. Só um passe por modo — sem
insistir em quem bloquear.
"""
import asyncio
import csv
import inspect
import json
import os
import random
import re
import sys
import time
from datetime import datetime, timezone
from urllib.parse import urlparse

from crawl4ai import AsyncWebCrawler, BrowserConfig, CrawlerRunConfig, CacheMode

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from redact import redigir_str

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = os.path.join(ROOT, "raw")
QUEUE = os.path.join(ROOT, "pipeline", "crawl4ai_queue.txt")
RESUMO = os.path.join(ROOT, "saida", "crawl4ai_teste.csv")

BLOQUEIO = re.compile(r"attention required|just a moment|access denied|verify you are human|"
                      r"cloudflare|captcha|request blocked|forbidden", re.I)


def browser_configs():
    """Configs em ordem de furtividade, conforme o que a versão aceita."""
    params = set(inspect.signature(BrowserConfig.__init__).parameters)
    base = dict(headless=True, verbose=False, viewport_width=1366, viewport_height=900)
    if "user_agent_mode" in params:
        base["user_agent_mode"] = "random"
    cfgs = []
    if "browser_type" in params:
        try:
            cfgs.append(("undetected", BrowserConfig(browser_type="undetected", **base)))
        except Exception as e:
            print("undetected indisponivel:", e)
    if "enable_stealth" in params:
        cfgs.append(("stealth", BrowserConfig(enable_stealth=True, **base)))
    cfgs.append(("padrao", BrowserConfig(**base)))
    return cfgs


def run_config():
    params = set(inspect.signature(CrawlerRunConfig.__init__).parameters)
    kw = dict(cache_mode=CacheMode.BYPASS, page_timeout=60000)
    for k, v in dict(magic=True, simulate_user=True, override_navigator=True,
                     wait_until="domcontentloaded", delay_before_return_html=6.0,
                     remove_overlay_elements=True).items():
        if k in params:
            kw[k] = v
    return CrawlerRunConfig(**kw)


async def tenta(url, label, modo, bcfg, rcfg):
    async with AsyncWebCrawler(config=bcfg) as crawler:
        r = await crawler.arun(url=url, config=rcfg)
    html = r.html or ""
    title = re.search(r"<title[^>]*>(.*?)</title>", html, re.S | re.I)
    title = re.sub(r"\s+", " ", title.group(1)).strip()[:120] if title else ""
    status = getattr(r, "status_code", None)
    bloqueado = bool(BLOQUEIO.search(title)) or (status in (403, 429, 503)) or len(html) < 3000
    return dict(modo=modo, ok=bool(r.success) and not bloqueado, status=status, bytes=len(html),
                title=title, erro=(getattr(r, "error_message", "") or "")[:160], html=html,
                markdown_len=len(getattr(r, "markdown", "") or ""))


async def main():
    items = []
    for line in open(QUEUE, encoding="utf-8"):
        line = line.strip()
        if line and not line.startswith("#"):
            p = line.split("\t")
            items.append((p[0], p[1] if len(p) > 1 else None))
    cfgs = browser_configs()
    print("modos disponiveis:", [m for m, _ in cfgs])
    rcfg = run_config()
    os.makedirs(os.path.dirname(RESUMO), exist_ok=True)
    novo = not os.path.exists(RESUMO)
    with open(RESUMO, "a", newline="", encoding="utf-8") as f:
        w = csv.writer(f, delimiter=";")
        if novo:
            w.writerow(["quando", "url", "label", "modo_que_passou", "status", "bytes", "titulo", "modos_tentados", "erro"])
        for url, label in items:
            host = urlparse(url).netloc
            tentados, final = [], None
            for modo, bcfg in cfgs:
                try:
                    res = await tenta(url, label, modo, bcfg, rcfg)
                except Exception as e:
                    res = dict(modo=modo, ok=False, status=None, bytes=0, title="", erro=f"{type(e).__name__}: {e}"[:160], html="", markdown_len=0)
                tentados.append(f"{modo}:{res['status']}:{res['bytes']}")
                final = res
                print(f"[{modo}] {res['status']} {res['bytes']}B {res['title'][:60]!r} {url[:80]} {res['erro'][:60]}")
                if res["ok"]:
                    break
                time.sleep(random.uniform(4, 8))
            d = os.path.join(RAW, host)
            os.makedirs(d, exist_ok=True)
            slug = re.sub(r"[^A-Za-z0-9._-]+", "_", label or url)[:80]
            with open(os.path.join(d, slug + ".html"), "w", encoding="utf-8") as fh:
                fh.write(redigir_str(final["html"]))
            meta = {"url": url, "label": label, "metodo": f"crawl4ai/{final['modo']}",
                    "http_status": final["status"], "bytes": final["bytes"], "titulo": final["title"],
                    "fetched_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
                    "modos_tentados": tentados, "ok": final["ok"], "erro": final["erro"]}
            with open(os.path.join(d, slug + ".meta.json"), "w", encoding="utf-8") as fm:
                json.dump(meta, fm, ensure_ascii=False, indent=1)
            w.writerow([meta["fetched_at"], url, label, final["modo"] if final["ok"] else "NENHUM",
                        final["status"], final["bytes"], final["title"], " | ".join(tentados), final["erro"]])
            f.flush()
            time.sleep(random.uniform(6, 12))
    print("fim")


if __name__ == "__main__":
    asyncio.run(main())
