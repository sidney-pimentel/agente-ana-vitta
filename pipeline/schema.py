# -*- coding: utf-8 -*-
"""Schema do CSV final — ordem exata da seção 6 do prompt (aba BASE_TERRENOS).

Colunas calculadas pela planilha NÃO são geradas aqui.
"""
import csv
import io

COLUNAS = [
    "id", "data_coleta", "origem", "url_fonte", "codigo_anuncio",
    "tipo_contato", "nome_contato", "empresa", "creci", "telefone", "email",
    "exclusividade", "endereco", "bairro", "cep", "latitude", "longitude",
    "perimetro_urbano", "area_total_m2", "testada_m", "topografia", "formato",
    "status_parcelamento", "infraestrutura", "esquina", "benfeitorias",
    "zona_variante", "usos_permitidos", "sujeito_ooaus", "exigencia_his_30",
    "vedacao_parcelamento", "cone_aeroporto", "valor_anunciado",
    "situacao_valor", "data_valor", "condicao_pagamento", "percentual_permuta",
    "onus_pendencias", "status_apuracao", "motivo_exclusao",
    "ultima_atualizacao", "observacoes",
]

PADROES = {
    "situacao_valor": "Pedido (anuncio)",
    "status_apuracao": "A validar",
    "perimetro_urbano": "A verificar",
    "sujeito_ooaus": "A verificar",
    "exigencia_his_30": "A verificar",
    "vedacao_parcelamento": "A verificar",
    "cone_aeroporto": "A verificar",
    # sempre vazios (atribuição manual posterior com mapa de zoneamento):
    "zona_variante": "",
    "usos_permitidos": "",
}


def nova_linha(**kwargs) -> dict:
    row = {c: "" for c in COLUNAS}
    row.update(PADROES)
    for k, v in kwargs.items():
        if k not in COLUNAS:
            raise KeyError(f"coluna desconhecida: {k}")
        row[k] = "" if v is None else v
    return row


def escrever_csv(path: str, rows: list[dict], colunas=None):
    """UTF-8 com BOM, separador ';'. Valores numéricos já devem vir
    formatados com vírgula decimal (parsers.fmt_decimal_br)."""
    cols = colunas or COLUNAS
    with io.open(path, "w", encoding="utf-8-sig", newline="") as f:
        w = csv.DictWriter(f, fieldnames=cols, delimiter=";",
                           quoting=csv.QUOTE_MINIMAL)
        w.writeheader()
        for r in rows:
            w.writerow({c: r.get(c, "") for c in cols})
