# Publicação do calendário SEAESC no Caddy

## 1. Converter a planilha completa

O arquivo `convert_xlsx.py` lê a primeira aba da planilha, preserva todas as linhas não vazias, preenche município e escola quando a planilha usa células vazias/mescladas e grava `data/dados.json`.

```bash
cd /home/opc/prj/prv-seaesc
python3 -m pip install --user openpyxl
python3 convert_xlsx.py "/caminho/lista de trabalho conferência.xlsx"
```

O comando imprime a quantidade de registros gravados. A planilha fornecida deve resultar em **307 registros**.

Validação:

```bash
python3 - <<'PY'
import json
with open('data/dados.json', encoding='utf-8') as f:
    dados = json.load(f)
print('registros:', len(dados))
print('primeiro:', dados[0])
print('último:', dados[-1])
PY
```

## 2. Hospedagem recomendada

Para esta aplicação estática, use uma pasta no host. Não é necessário container nem processo Node/Python permanente. O Caddy entrega `index.html`, `app.js`, `styles.css` e `data/dados.json` diretamente.

Recomendação de pasta pública:

```bash
sudo mkdir -p /var/www/prova-etools
sudo cp -a /home/opc/prj/prv-seaesc/. /var/www/prova-etools/
sudo chown -R caddy:caddy /var/www/prova-etools
sudo find /var/www/prova-etools -type d -exec chmod 755 {} \;
sudo find /var/www/prova-etools -type f -exec chmod 644 {} \;
```

## 3. Bloco para o Caddyfile

Adicione este bloco ao Caddyfile existente:

```caddy
prova.etoolstec.com.br {
    root * /var/www/prova-etools
    encode gzip
    file_server

    header {
        Cache-Control "no-store"
    }
}
```

`no-store` é recomendado durante a conferência dos dados. Depois da validação, pode ser removido.

## 4. Aplicar e testar

```bash
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy
curl -I https://prova.etoolstec.com.br/
curl -s https://prova.etoolstec.com.br/data/dados.json | python3 -c "import sys,json; print('registros:', len(json.load(sys.stdin)))"
```

O segundo comando deve imprimir `registros: 307`.

O DNS de `prova.etoolstec.com.br` deve apontar para o IP desta máquina e as portas 80/443 precisam estar liberadas. O Caddy emitirá o certificado HTTPS automaticamente.
