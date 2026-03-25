<div align="center">

# 🧾 nfse-api-final

### Proxy de Emissão de NFS-e — Padrão Nacional Sefin v1.01

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![Express](https://img.shields.io/badge/Express-5.x-000000?logo=express&logoColor=white)](https://expressjs.com)
[![OpenAPI](https://img.shields.io/badge/OpenAPI-3.0-6BA539?logo=swagger&logoColor=white)](http://localhost:3000/api-docs)
[![License](https://img.shields.io/badge/Licen%C3%A7a-MIT-green)](LICENSE)

**API REST que abstrai toda a complexidade de comunicação com a Sefin Nacional — emissão, cancelamento e download de NFS-e com assinatura de certificado A1 transparente.**

</div>

---

## 🌟 O que é

O **nfse-api-final** é um microserviço que você coloca entre seu sistema de faturamento e a **Sefin Nacional** (plataforma federal de NFS-e). Em vez de lidar com:

- 📦 Geração de XML da DPS (Declaração do Prestador de Serviço)
- 🔏 Assinatura digital com certificado A1 (PKCS#12 / PFX)
- 📡 Comunicação HTTPS mTLS com a Sefin
- 🧮 Cálculo de IBS, CBS, ISS, PIS/COFINS, IRRF, CSLL
- 🗜️ Compressão GZIP e codificação Base64

…você simplesmente chama um endpoint REST com os dados básicos do serviço e recebe a NFS-e emitida. 🎯

---

## ✨ Funcionalidades

| Feature | Descrição |
|---|---|
| 🚀 **Emissão Simplificada** | `POST /nfse/emitir-simples` — Passe só os dados básicos, o sistema calcula os tributos automaticamente |
| 🔧 **Emissão Completa** | `POST /emitir-nfse` — Controle total sobre todos os campos da DPS |
| 🧮 **Cálculo de Tributos** | `POST /tributacao/calcular` — Pré-visualize os impostos sem emitir |
| 🔍 **Consulta** | `GET /nfse/:chave` — Consulte dados de uma NFS-e pelo chave de acesso |
| 📄 **DANFSe (PDF)** | `GET /danfse/:chave` — Baixe o PDF oficial diretamente da Sefin |
| ❌ **Cancelamento** | `POST /nfse/:chave/eventos` — Cancele uma NFS-e com Pedido de Registro de Evento |
| 🔄 **Eventos** | Confirmação, rejeição e cancelamento por substituição |
| 🐛 **Debug** | `POST /debug/gerar-xml` — Gere o XML sem assinar para validação |

---

## 🧠 Detecção Automática de Tributação

No modo simplificado (`/nfse/emitir-simples`), o serviço:

```
1. Consulta a Receita Federal → detecta o regime (MEI, Simples Nacional, LP/LR)
2. Consulta o ADN da prefeitura → obtém a alíquota de ISSQN vigente
3. Calcula PIS/COFINS, IRRF e CSLL conforme o regime detectado
4. Monta e assina o XML da DPS com o certificado passado no header
5. Envia à Sefin Nacional e retorna a chave de acesso da NFS-e emitida
```

---

## 🚀 Quick Start

### Pré-requisitos

- Node.js 18+
- npm 9+
- OpenSSL instalado no PATH

### Instalação

```bash
git clone https://github.com/arthur-zacarias/nfse-api-final.git
cd nfse-api-final
npm install
npm start    # Inicia em http://localhost:3000
```

Acesse a documentação interativa: **http://localhost:3000/api-docs** 📖

---

## 🔐 Autenticação

O certificado digital A1 do prestador é passado em **dois headers HTTP** em cada requisição:

| Header | Tipo | Descrição |
|---|---|---|
| `x-pfx-base64` | `string` | Arquivo `.pfx` codificado em **Base64** |
| `x-pfx-password` | `string` | Senha do certificado |

> **Nenhuma credencial é armazenada no servidor.** O certificado é usado apenas durante a assinatura e descartado depois.

### Converter seu certificado para Base64

```bash
# Windows (PowerShell)
[Convert]::ToBase64String([IO.File]::ReadAllBytes("certificado.pfx")) | Set-Content cert_base64.txt

# Linux/macOS
base64 -i certificado.pfx -o cert_base64.txt
```

---

## 📡 Endpoints Principais

### POST `/nfse/emitir-simples` — Emissão Automática

```bash
curl -X POST http://localhost:3000/nfse/emitir-simples \
  -H "Content-Type: application/json" \
  -H "x-pfx-base64: SEU_CERT_BASE64" \
  -H "x-pfx-password: sua_senha" \
  -d '{
    "cnpjPrestador": "11222333000181",
    "cMunPrestacao": 3550308,
    "cTribNac": "010201",
    "xDescServ": "Desenvolvimento de Software - Contrato Mensal",
    "vServ": 5000.00,
    "dCompet": "2026-03-01",
    "serie": "1",
    "numero": 42,
    "ambiente": "2",
    "tomador": {
      "cnpj": "44555666000197",
      "xNome": "EMPRESA CLIENTE LTDA"
    }
  }'
```

**Resposta:**
```json
{
  "status": "NFS-e emitida com sucesso!",
  "chaveAcesso": "35260300000000000000000000001000000000000000000000",
  "numeroNfse": "42",
  "codigoVerificacao": "ABC12345",
  "dataEmissao": "2026-03-01T14:30:00-03:00",
  "tributacaoCalculada": {
    "vBC": 5000,
    "vISSQN": 150,
    "aliquotaISS": 3,
    "regimeTributarioDetectado": "LUCRO_PRESUMIDO",
    "fonteAliquota": "ADN"
  }
}
```

### DELETE / Cancelamento — `POST /nfse/:chave/eventos`

```bash
curl -X POST http://localhost:3000/nfse/35260300.../eventos \
  -H "x-pfx-base64: SEU_CERT_BASE64" \
  -H "x-pfx-password: sua_senha" \
  -d '{
    "cnpjAutor": "11222333000181",
    "tipoEvento": "cancelamento",
    "motivo": "Nota emitida com valor incorreto",
    "ambiente": "2"
  }'
```

---

## 🗺️ Ambientes

| Valor | Ambiente | URL Sefin |
|---|---|---|
| `"1"` | ✅ **Produção** | `https://sefin.nfse.gov.br/sefinnacional` |
| `"2"` | 🧪 **Homologação** | `https://sefin.producaorestrita.nfse.gov.br/SefinNacional` |

---

## 🏗️ Arquitetura

```
src/
├── index.ts                     # Entry point + Swagger UI
├── config/
│   └── environments.ts          # URLs Sefin (produção e homologação)
├── controllers/
│   ├── NfseController.ts        # Handlers HTTP de emissão e eventos
│   └── TributacaoController.ts  # Handler de cálculo tributário
├── services/
│   ├── DpsService.ts            # Geração do XML da DPS (Sefin v1.01)
│   ├── EventoService.ts         # Geração de eventos (cancelamento, etc.)
│   ├── XmlSigningService.ts     # Assinatura digital com cert A1
│   ├── GovApiService.ts         # Cliente HTTP para a API da Sefin
│   ├── TaxCalculationService.ts # Cálculo de IBS, CBS, ISS, PIS/COFINS
│   ├── CnpjService.ts           # Consulta Receita Federal (regime tributário)
│   └── ParametrizacaoService.ts # Consulta ADN (alíquotas ISSQN)
├── dtos/
│   ├── NfsInputDto.ts           # Tipos TypeScript do input de emissão
│   ├── EventoInputDto.ts        # Tipos do input de evento
│   └── SefinDpsDto.ts           # Schema completo da DPS Sefin v1.01
├── routes/
│   └── NfseRoutes.ts            # Roteamento Express
└── docs/
    └── swaggerDef.yaml          # Documentação OpenAPI 3.0
```

---

## 📊 Suporte Tributário

| Regime | Detectado via | ISS | PIS/COFINS | IRRF | CSLL |
|---|---|---|---|---|---|
| **MEI** | CNPJ.ws | ✅ via ADN | ❌ (isento) | ❌ | ❌ |
| **Simples Nacional** | CNPJ.ws | ✅ via ADN | ❌ (incluso no DAS) | ❌ | ❌ |
| **Lucro Presumido** | CNPJ.ws | ✅ via ADN | ✅ (0.65% + 3%) | ✅ (1.5%) | ✅ (1%) |
| **Lucro Real** | CNPJ.ws | ✅ via ADN | ✅ | ✅ | ✅ |

> Reformulação Tributária: suporte a **IBS e CBS** (Sefin v1.01) disponível no campo `ibsCbs` do endpoint completo.

---

## 📋 Requisitos da NFS-e Nacional

Para emitir, você precisa:

1. **Certificado Digital A1** (arquivo `.pfx` + senha)
2. **CNPJ ativo** com serviço cadastrado na CNAE
3. **Município aderente** à Sefin Nacional (verificar no portal)
4. **Código de Tributação Nacional** (`cTribNac`) — [tabela SEFIN](https://www.nfse.gov.br)
5. Ambiente de **homologação** para testes antes de ir para produção

---

## 🤝 Contribuindo

Contribuições são bem-vindas!

1. Faça um fork do repositório
2. Crie uma branch: `git checkout -b feat/minha-feature`
3. Commit: `git commit -m 'feat: minha feature'`
4. Push: `git push origin feat/minha-feature`
5. Abra um Pull Request

---

## 📄 Licença

Distribuído sob a licença **MIT**. Veja [`LICENSE`](LICENSE) para mais informações.

---

## 👨‍💻 Créditos

Desenvolvido por **Arthur Zacarias**

[![GitHub](https://img.shields.io/badge/GitHub-arthur--zacarias-181717?logo=github&logoColor=white)](https://github.com/arthur-zacarias)

> Este projeto foi criado para resolver a complexidade de integração com a **NFS-e Nacional** (Sefin), permitindo que sistemas de faturamento emitam notas fiscais de serviço eletrônicas com uma única chamada REST, sem precisar conhecer a fundo o padrão XML da DPS v1.01.

---

<div align="center">

Feito com ☕ e **TypeScript** · Padrão Sefin v1.01 · Brasil 🇧🇷

</div>
