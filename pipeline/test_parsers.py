# -*- coding: utf-8 -*-
"""Testes das regras de parsing. Rodar: python3 -m pytest ou python3 test_parsers.py"""
import sys
from parsers import br_number, parse_area, parse_price, parse_phones, fmt_decimal_br

FAIL = []


def check(desc, got, want):
    ok = got == want
    if not ok:
        FAIL.append(f"{desc}: esperado {want!r}, obtido {got!r}")
    print(("ok  " if ok else "FALHA ") + desc)


# ---- o erro mais provável do projeto: milhar BR ----
check("40.800m2 e quarenta mil e oitocentos",
      parse_area("Terreno de 40.800m² plano")[0]["m2"], 40800.0)
check("6.044 metros quadrados",
      parse_area("totalizando 6.044 metros quadrados")[0]["m2"], 6044.0)
check("1.017,73 m2 decimal com virgula",
      parse_area("3 lotes, totalizando 1.017,73 m²")[0]["m2"], 1017.73)
check("5000 m2 sem separador",
      parse_area("area de 5000 m2")[0]["m2"], 5000.0)
check("40.80 e ambiguo -> None",
      br_number("40.80")[0], None)
check("40.8 e ambiguo -> None",
      br_number("40.8")[0], None)
check("numero solto sem unidade nao vira area",
      parse_area("lote 402 da quadra 12"), [])

# ---- conversões ----
a = parse_area("gleba de 2,5 hectares")[0]
check("2,5 ha -> 25000 m2", a["m2"], 25000.0)
check("ha anotado", a["conversao"], "hectare x 10.000")
a = parse_area("1 alqueire mineiro de terra")[0]
check("1 alqueire mineiro -> 48400", a["m2"], 48400.0)
a = parse_area("aproximadamente 24.000 m² urbanos")[0]
check("aprox detectado", a["aproximado"], True)

# ---- duas metragens: função retorna as duas, não escolhe ----
areas = parse_area("Terreno de 12.000 m² com galpão de 800 m²")
check("duas metragens retornadas", [x["m2"] for x in areas], [12000.0, 800.0])

# ---- valores ----
check("R$ 6.120.000,00 -> 6120000",
      parse_price("por R$ 6.120.000,00 a vista")[0]["valor"], 6120000.0)
check("R$ 550 mil -> 550000",
      parse_price("apenas R$ 550 mil")[0]["valor"], 550000.0)
check("R$ 1,2 milhao -> 1200000",
      parse_price("valor R$ 1,2 milhão")[0]["valor"], 1200000.0)
p = parse_price("Valor: sob consulta")
check("sob consulta -> valor None", p[0]["valor"], None)
check("sob consulta flag", p[0].get("sob_consulta"), True)
check("dois valores retornados (venda+locacao), funcao nao escolhe",
      [x["valor"] for x in parse_price("Venda R$ 900.000,00 Locação R$ 4.500,00")],
      [900000.0, 4500.0])

# ---- telefones ----
check("celular com 55 e pontuacao",
      parse_phones("+55 (34) 99123-4567"), ["(34) 99123-4567"])
check("fixo", parse_phones("fone 34 3231-1234"), ["(34) 3231-1234"])
check("varios e dedup",
      parse_phones("(34) 99123-4567 ou 34 991234567 e (11) 4002-8922"),
      ["(34) 99123-4567", "(11) 4002-8922"])
check("cep nao vira telefone", parse_phones("CEP 38400-902"), [])

# ---- formatação decimal BR ----
check("fmt 40800.0", fmt_decimal_br(40800.0), "40800")
check("fmt 1017.73", fmt_decimal_br(1017.73), "1017,73")
check("fmt None", fmt_decimal_br(None), "")

print()
if FAIL:
    print(f"{len(FAIL)} FALHAS:")
    for f in FAIL:
        print(" -", f)
    sys.exit(1)
print("todos os testes passaram")
