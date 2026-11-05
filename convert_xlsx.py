#!/usr/bin/env python3
"""Converte a planilha SEAESC para data/dados.json.
Aceita tanto a ordem antiga quanto a nova: Data, Turno, Cidade, Escola, Turma, Aplicador, Supervisor.
Uso: python3 convert_xlsx.py data/lista.xlsx
"""
from __future__ import annotations
import datetime as dt
import json
import re
import sys
import unicodedata
from pathlib import Path
from openpyxl import load_workbook

BASE = Path(__file__).resolve().parent
OUTPUT = BASE / 'data' / 'dados.json'


def text(value):
    if value is None:
        return ''
    if isinstance(value, (dt.datetime, dt.date)):
        return value.strftime('%d/%m/%Y')
    return str(value).strip()


def key(value):
    value = unicodedata.normalize('NFD', text(value)).encode('ascii', 'ignore').decode().lower()
    return re.sub(r'[^a-z0-9]+', '', value)

ALIASES = {
    'data': {'data', 'date'},
    'turno': {'turno', 'periodo'},
    'municipio': {'municipio', 'cidade', 'municipality'},
    'escola': {'escola', 'nomedaescola', 'localdeprova'},
    'turma': {'turma', 'turmas', 'turmasturno', 'turmaturno'},
    'aplicador': {'aplicador', 'aplicadora'},
    'supervisor': {'supervisor', 'supervisora'},
}


def detect_header(row):
    detected = {}
    for index, value in enumerate(row):
        normalized = key(value)
        for field, names in ALIASES.items():
            if normalized in names and field not in detected:
                detected[field] = index
    return detected if len(detected) >= 3 else None


def convert(source: Path):
    workbook = load_workbook(source, read_only=True, data_only=True)
    sheet = workbook.active
    rows = list(sheet.iter_rows(values_only=True))
    header_index = None
    columns = None
    for index, row in enumerate(rows[:10]):
        detected = detect_header(row)
        if detected:
            header_index, columns = index, detected
            break
    if columns is None:
        raise ValueError('Não foi encontrado um cabeçalho reconhecível na primeira aba da planilha.')

    records = []
    municipio = ''
    escola = ''
    for row in rows[header_index + 1:]:
        if not any(value is not None and text(value) for value in row):
            continue
        def get(field):
            index = columns.get(field)
            return text(row[index]) if index is not None and index < len(row) else ''
        current_municipio = get('municipio')
        current_escola = get('escola')
        if current_municipio:
            municipio = current_municipio
        if current_escola:
            escola = current_escola
        records.append({
            'data': get('data'),
            'turno': get('turno'),
            'municipio': municipio,
            'escola': escola,
            'turma': get('turma'),
            'aplicador': get('aplicador'),
            'supervisor': get('supervisor'),
        })

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(records, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'{len(records)} registros gravados em {OUTPUT}')
    if records:
        print('Exemplo:', json.dumps(records[0], ensure_ascii=False))


if __name__ == '__main__':
    source = Path(sys.argv[1] if len(sys.argv) > 1 else BASE / 'data' / 'lista.xlsx').expanduser().resolve()
    if not source.exists():
        raise SystemExit(f'Arquivo não encontrado: {source}')
    convert(source)
