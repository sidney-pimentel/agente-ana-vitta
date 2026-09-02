# -*- coding: utf-8 -*-
"""Regras de parsing do projeto terrenos Uberlândia.

Contrato de veracidade:
- Ambiguidade retorna None + motivo. Nunca "melhor palpite".
- Formato brasileiro: ponto = milhar, vírgula = decimal.
  "40.800m²" == 40800.0 (quarenta mil e oitocentos), nunca 40.8.
- Grupo de milhar precisa ter exatamente 3 dígitos; "40.80" é ambíguo -> None.
"""
import re
import unicodedata


def _strip_accents(s: str) -> str:
    return "".join(c for c in unicodedata.normalize("NFD", s) if unicodedata.category(c) != "Mn")


# número BR: 1.234.567 | 1234 | 1.234,56 | 1234,5
_NUM_BR = r"\d{1,3}(?:\.\d{3})+(?:,\d+)?|\d+(?:,\d+)?"
# número com ponto que NÃO é milhar válido (ex.: 40.80, 40.8, 1.2345) -> ambíguo
_NUM_DOT_AMBIGUOUS = re.compile(r"^\d+\.\d{1,2}$|^\d+\.\d{4,}$")


def br_number(token: str):
    """Converte token numérico BR em float. Retorna (valor, motivo_erro)."""
    t = token.strip().replace(" ", "")
    if _NUM_DOT_AMBIGUOUS.match(t):
        return None, f"numero ambiguo (ponto sem grupo de 3 digitos): '{token}'"
    if not re.fullmatch(_NUM_BR, t):
        return None, f"formato numerico nao reconhecido: '{token}'"
    return float(t.replace(".", "").replace(",", ".")), None


_AREA_UNIT = (
    r"(m²|m2|m²|mts²|mts2|mts²|metros\s+quadrados|m²t|"
    r"ha|hect(?:are|ares)|alqueire(?:s)?(?:\s+mineiro[s]?)?)"
)
_AREA_RE = re.compile(
    rf"({_NUM_BR})\s*{_AREA_UNIT}", re.IGNORECASE
)
_APPROX_RE = re.compile(r"aproximad|cerca\s+de|em\s+torno\s+de|±|\+/-|mais\s+ou\s+menos", re.IGNORECASE)


def parse_area(text: str):
    """Extrai TODAS as áreas de um texto.

    Retorna lista de dicts: {m2, literal, unidade, conversao, aproximado}.
    Quem chama decide qual é a área do TERRENO (ou descarta se ambíguo) —
    esta função não escolhe.
    """
    out = []
    for m in _AREA_RE.finditer(text):
        raw_num, unit = m.group(1), m.group(2).lower()
        val, err = br_number(raw_num)
        if err:
            out.append({"m2": None, "literal": m.group(0), "erro": err})
            continue
        conv = None
        if unit.startswith(("ha", "hect")):
            val, conv = val * 10_000, "hectare x 10.000"
        elif unit.startswith("alqueire"):
            val, conv = val * 48_400, "alqueire mineiro x 48.400"
        ctx = text[max(0, m.start() - 60): m.end() + 20]
        out.append({
            "m2": val,
            "literal": m.group(0).strip(),
            "unidade": unit,
            "conversao": conv,
            "aproximado": bool(_APPROX_RE.search(ctx)),
        })
    return out


_PRICE_RE = re.compile(
    rf"R\$\s*({_NUM_BR})(\s*(milh(?:[aã]o|[oõ]es)|mil)\b)?", re.IGNORECASE
)
_CONSULTA_RE = re.compile(r"sob\s+consulta|a\s+negociar|a\s+combinar|consulte", re.IGNORECASE)


def parse_price(text: str):
    """Extrai valores monetários. Retorna lista de {valor, literal, sufixo}.

    'Sob consulta' etc. -> [{'valor': None, 'literal': <trecho>, 'sob_consulta': True}].
    Quem chama distingue venda vs locação (ou descarta) — esta função não escolhe.
    """
    out = []
    for m in _PRICE_RE.finditer(text):
        val, err = br_number(m.group(1))
        if err:
            out.append({"valor": None, "literal": m.group(0), "erro": err})
            continue
        suf = (m.group(3) or "").lower()
        suf = _strip_accents(suf)
        if suf == "mil":
            val *= 1_000
        elif suf.startswith("milh"):
            val *= 1_000_000
        out.append({"valor": val, "literal": m.group(0).strip(), "sufixo": suf or None})
    if not out:
        c = _CONSULTA_RE.search(text)
        if c:
            out.append({"valor": None, "literal": c.group(0), "sob_consulta": True})
    return out


_PHONE_RE = re.compile(
    r"(?:\+?55[\s.\-]?)?(?:\(?(\d{2})\)?[\s.\-]?)(9?\d{4})[\s.\-]?(\d{4})(?!\d)"
)


def parse_phones(text: str):
    """Extrai e normaliza telefones BR -> '(DD) XXXXX-XXXX'. Dedup, ordem de aparição."""
    seen, out = set(), []
    for m in _PHONE_RE.finditer(text):
        ddd, p1, p2 = m.groups()
        if ddd is None:
            continue
        # celular tem 9 dígitos (p1 com 5), fixo 8 (p1 com 4)
        norm = f"({ddd}) {p1}-{p2}"
        digits = ddd + p1 + p2
        if len(digits) not in (10, 11):
            continue
        if digits in seen:
            continue
        seen.add(digits)
        out.append(norm)
    return out


def fmt_decimal_br(v) -> str:
    """Float -> string decimal com vírgula, sem zeros à direita inúteis."""
    if v is None:
        return ""
    s = f"{v:.2f}".rstrip("0").rstrip(".")
    return s.replace(".", ",")
