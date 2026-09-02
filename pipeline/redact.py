# -*- coding: utf-8 -*-
"""Redige tokens embutidos em HTML de terceiros antes de salvar no repo.
O Push Protection do GitHub recusa commits com segredos de terceiros
(pixel do Facebook, Mapbox, chaves Google). Conteúdo de anúncio não muda."""
import re

PADROES = [
    (rb"EAA[A-Za-z0-9]{40,}", b"[REDACTED_FB_TOKEN]"),
    (rb"\b[sp]k\.eyJ[A-Za-z0-9._\-]{40,}", b"[REDACTED_MAPBOX_TOKEN]"),
    (rb"\bAIza[0-9A-Za-z_\-]{35}\b", b"[REDACTED_GOOGLE_KEY]"),
    (rb"\bgh[pousr]_[A-Za-z0-9]{36,}\b", b"[REDACTED_GH_TOKEN]"),
    (rb"\bsk-[A-Za-z0-9]{32,}\b", b"[REDACTED_SK_TOKEN]"),
    (rb"(?i)(access_token|api[_-]?key|secret[_-]?key|client_secret)([\"' =:]{1,4})[A-Za-z0-9_\-\.]{24,}",
     rb"\1\2[REDACTED]"),
]


def redigir(body: bytes) -> bytes:
    for pat, rep in PADROES:
        body = re.sub(pat, rep, body)
    return body


def redigir_str(s: str) -> str:
    return redigir(s.encode("utf-8", "replace")).decode("utf-8", "replace")
