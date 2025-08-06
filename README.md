# API de Emissão de NFS-e 🚀

![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Express.js](https://img.shields.io/badge/Express.js-404D59?style=for-the-badge&logo=express&logoColor=white)

## 📝 Descrição

Esta é uma API para emissão de Nota Fiscal de Serviço Eletrônica (NFS-e) no padrão nacional. A API foi desenvolvida para facilitar a integração com o sistema da SEFIN, abstraindo a complexidade da geração e assinatura de XMLs.

## ✨ Funcionalidades

-   **Emissão de NFS-e:** Envio de dados da nota para emissão.
-   **Consulta de NFS-e:** Consulta de notas emitidas pela chave de acesso.
-   **Consulta de DANFSe:** Obtenção do PDF da nota emitida.
-   **Geração de XML para Debug:** Facilita a verificação dos dados enviados.
-   **Documentação Swagger:** Documentação completa e interativa dos endpoints.

## ⚙️ Pré-requisitos

-   [Node.js](https://nodejs.org/en/) (versão 20 ou superior)
-   [npm](https://www.npmjs.com/) (geralmente vem com o Node.js)
-   Um certificado digital A1 (arquivo .pfx)

## 🚀 Instalação

1.  **Clone o repositório:**
    ```bash
    git clone <URL_DO_REPOSITORIO>
    cd nfse-api-final
    ```

2.  **Instale as dependências:**
    ```bash
    npm install
    ```

3.  **Configure o certificado:**
    -   Coloque o seu certificado `certificado.pfx` na pasta `certs/`.
    -   Crie um arquivo `.env` na raiz do projeto e adicione a senha do certificado:
        ```
        CERT_PASSWORD=sua_senha_aqui
        ```

## ▶️ Executando a API

Para iniciar o servidor em modo de desenvolvimento, execute:

```bash
npm start
```

A API estará disponível em `http://localhost:3000`.

## 📖 Documentação da API

A documentação completa dos endpoints está disponível no Swagger UI. Após iniciar a API, acesse:

**http://localhost:3000/api-docs**

### Endpoints

---

#### `POST /emitir-nfse`

Emite uma nova NFS-e.

**Exemplo de `curl`:**

```bash
curl -X POST http://localhost:3000/emitir-nfse \
-H 'Content-Type: application/json' \
-d '{
  "dps": {
    "serie": "900",
    "numero": 27,
    "dataCompetencia": "2025-08-06"
  },
  "prestador": {
    "cnpj": "51512249000117",
    "codigoMunicipio": "4115200"
  },
  "tomador": {
    "documento": "05389061000106",
    "razaoSocial": "EMPRESA TOMADORA LTDA",
    "endereco": {
      "logradouro": "RUA EXEMPLO",
      "numero": "123",
      "bairro": "CENTRO",
      "codigoMunicipio": "4113502",
      "cep": "87900000"
    }
  },
  "servico": {
    "itemListaServico": "010201",
    "discriminacao": "Referente ao servico prestado",
    "codigoMunicipioPrestacao": "4115200",
    "valor": 100.00
  }
}'
```

---

#### `GET /nfse/:chaveAcesso`

Consulta os dados de uma NFS-e emitida.

**Exemplo de `curl`:**

```bash
curl -X GET http://localhost:3000/nfse/SUA_CHAVE_DE_ACESSO
```

---

#### `GET /danfse/:chaveAcesso`

Consulta o DANFSe (PDF) de uma NFS-e emitida.

**Exemplo de `curl`:**

```bash
curl -X GET http://localhost:3000/danfse/SUA_CHAVE_DE_ACESSO
```

---

#### `POST /debug/gerar-xml`

Gera um arquivo XML para depuração com os dados enviados, sem assinar ou enviar para a SEFIN. O arquivo será salvo na pasta `debug/`.

**Exemplo de `curl`:**

```bash
curl -X POST http://localhost:3000/debug/gerar-xml \
-H 'Content-Type: application/json' \
-d '{
  "dps": {
    "serie": "900",
    "numero": 27,
    "dataCompetencia": "2025-08-06"
  },
  "prestador": {
    "cnpj": "51512249000117",
    "codigoMunicipio": "4115200"
  },
  "tomador": {
    "documento": "05389061000106",
    "razaoSocial": "EMPRESA TOMADORA LTDA",
    "endereco": {
      "logradouro": "RUA EXEMPLO",
      "numero": "123",
      "bairro": "CENTRO",
      "codigoMunicipio": "4113502",
      "cep": "87900000"
    }
  },
  "servico": {
    "itemListaServico": "010201",
    "discriminacao": "Referente ao servico prestado",
    "codigoMunicipioPrestacao": "4115200",
    "valor": 100.00
  }
}'
```

## 📁 Estrutura do Projeto

```
nfse-api-final/
├── certs/                # Certificados digitais
├── debug/                # XMLs de debug
├── node_modules/         # Dependências
├── src/
│   ├── config/           # Configurações de ambiente
│   ├── controllers/      # Controladores da API
│   ├── docs/             # Arquivos de documentação (Swagger)
│   ├── dtos/             # Data Transfer Objects
│   ├── routes/           # Definição das rotas
│   ├── services/         # Lógica de negócio
│   └── types/            # Definições de tipos
├── .env                  # Arquivo de variáveis de ambiente
├── package.json          # Dependências e scripts
└── tsconfig.json         # Configurações do TypeScript
```

## 🤝 Contribuições

Contribuições são bem-vindas! Sinta-se à vontade para abrir uma *issue* ou enviar um *pull request*.

## 📄 Licença

Este projeto é licenciado sob a licença MIT.
