# -*- coding: utf-8 -*-
"""Reconhecimento FASE 1B — roda LOCALMENTE sobre raw/ (cache bruto).

Para cada página baixada resume: status, tamanho, se o HTML é server-side
(conteúdo de anúncios presente sem JS), quantos links de detalhe aparecem,
e se área/preço/telefone aparecem no HTML. Não grava nada na base — é
insumo para eu (Claude) decidir viabilidade fonte a fonte.
"""
import json
import os
import re
import sys
from html.parser import HTMLParser
from urllib.parse import urljoin

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = os.path.join(ROOT, "raw")

RE_AREA = re.compile(r"\d[\d.,]*\s*(m²|m2|mts²|metros\s+quadrados|ha\b|hectare)", re.I)
RE_PRECO = re.compile(r"R\$\s*\d[\d.,]*", re.I)
RE_FONE = re.compile(r"\(?\d{2}\)?[\s.\-]?9?\d{4}[\s.\-]?\d{4}")


class LinkExtractor(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links = []

    def handle_starttag(self, tag, attrs):
        if tag == "a":
            href = dict(attrs).get("href")
            if href:
                self.links.append(href)


def analisa(path_html):
    meta_path = path_html[:-5] + ".meta.json"
    meta = {}
    if os.path.exists(meta_path):
        with open(meta_path, encoding="utf-8") as f:
            meta = json.load(f)
    with open(path_html, "rb") as f:
        body = f.read()
    try:
        text = body.decode("utf-8")
    except UnicodeDecodeError:
        text = body.decode("latin-1", errors="replace")

    lx = LinkExtractor()
    try:
        lx.feed(text)
    except Exception:
        pass
    base = meta.get("final_url") or meta.get("url") or ""
    links = [urljoin(base, h) for h in lx.links]
    det = [l for l in links if re.search(r"/(imovel|imoveis/|detalhe|propriedade|property|ref)", l, re.I)]

    return {
        "arquivo": os.path.relpath(path_html, ROOT),
        "url": meta.get("url"),
        "final_url": meta.get("final_url"),
        "status": meta.get("http_status"),
        "kb": round(len(body) / 1024),
        "n_links": len(links),
        "n_links_detalhe": len(set(det)),
        "ocorr_area": len(RE_AREA.findall(text)),
        "ocorr_preco": len(RE_PRECO.findall(text)),
        "ocorr_fone": len(set(RE_FONE.findall(text))),
        "parece_spa": ("__NEXT_DATA__" in text or "window.__NUXT__" in text
                       or 'id="root"' in text or 'id="app"' in text),
        "exemplos_detalhe": sorted(set(det))[:5],
    }


def main():
    alvo = sys.argv[1] if len(sys.argv) > 1 else None
    for dom in sorted(os.listdir(RAW)):
        if alvo and alvo not in dom:
            continue
        d = os.path.join(RAW, dom)
        if not os.path.isdir(d):
            continue
        for f in sorted(os.listdir(d)):
            if f.endswith(".html"):
                r = analisa(os.path.join(d, f))
                print(json.dumps(r, ensure_ascii=False))


if __name__ == "__main__":
    main()
