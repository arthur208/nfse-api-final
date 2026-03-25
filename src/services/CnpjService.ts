// src/services/CnpjService.ts
// Consulta dados de CNPJ via publica.cnpj.ws (sem autenticação, sem certificado)

import axios from 'axios';

// Regime tributário mapeado a partir dos dados da Receita Federal
export interface DadosCnpj {
  cnpj: string;
  razaoSocial: string;
  nomeFantasia: string | null;
  naturezaJuridica: string;
  porte: string;            // ME, EPP, MEDIO, GRANDE, NAO_INFORMADO
  opcaoSimples: boolean;
  opcaoMei: boolean;
  cnaeCode: string;          // Código CNAE principal
  cnaeDes: string;           // Descrição CNAE principal
  cep: string;
  cMun: number;              // Código IBGE do município
  uf: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  email: string | null;
  telefone: string | null;
  // Regime calculado
  opSimpNac: 1 | 2 | 3;  // 1=NãoOptante, 2=MEI, 3=ME/EPP
}

// ─── Cache in-memory com TTL de 24h ─────────────────────────────────────────
// O regime tributário de um CNPJ muda raramente (máx. 1x por ano).
// Isso evita bater no rate-limit da publica.cnpj.ws (3 req/min).
interface CacheEntry {
  data: DadosCnpj;
  expiresAt: number; // timestamp ms
}

const cnpjCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 horas

export class CnpjService {
  private static readonly BASE_URL = 'https://publica.cnpj.ws/cnpj';

  /**
   * Consulta dados de um CNPJ na API pública publica.cnpj.ws
   * Resultados são cacheados por 24h para evitar rate-limit (3 req/min).
   */
  public async getDadosCnpj(cnpj: string): Promise<DadosCnpj> {
    const cnpjLimpo = cnpj.replace(/\D/g, '');
    if (cnpjLimpo.length !== 14) {
      throw new Error(`CNPJ inválido: "${cnpj}". Deve ter 14 dígitos.`);
    }

    // ─── Verifica cache ─────────────────────────────────────────────────────
    const cached = cnpjCache.get(cnpjLimpo);
    if (cached && Date.now() < cached.expiresAt) {
      console.log(`[CNPJ_SERVICE] Cache HIT para ${cnpjLimpo} (expira em ${new Date(cached.expiresAt).toLocaleTimeString('pt-BR')})`);
      return cached.data;
    }

    console.log(`[CNPJ_SERVICE] Consultando CNPJ ${cnpjLimpo} na API pública...`);


    try {
      const response = await axios.get(`${CnpjService.BASE_URL}/${cnpjLimpo}`, {
        timeout: 10000,
        headers: { Accept: 'application/json' },
      });

      const d = response.data;

      // Determina opSimpNac
      let opSimpNac: 1 | 2 | 3 = 1;
      const ehMei = d.simples?.mei === 'Sim';
      const ehSimples = d.simples?.simples === 'Sim';

      if (ehMei) {
        opSimpNac = 2; // MEI
      } else if (ehSimples) {
        opSimpNac = 3; // ME/EPP Simples Nacional
      }

      // Extrai código IBGE do município
      const cMun = d.estabelecimento?.cidade?.ibge_id
        ? parseInt(d.estabelecimento.cidade.ibge_id)
        : 0;

      const estab = d.estabelecimento ?? {};

      const result: DadosCnpj = {
        cnpj: cnpjLimpo,
        razaoSocial: d.razao_social ?? '',
        nomeFantasia: estab.nome_fantasia ?? null,
        naturezaJuridica: d.natureza_juridica?.descricao ?? '',
        porte: d.porte?.descricao ?? 'NAO_INFORMADO',
        opcaoSimples: ehSimples,
        opcaoMei: ehMei,
        cnaeCode: estab.atividade_principal?.subclasse ?? '',
        cnaeDes: estab.atividade_principal?.descricao ?? '',
        cep: (estab.cep ?? '').replace(/\D/g, ''),
        cMun,
        uf: estab.estado?.sigla ?? '',
        logradouro: estab.logradouro ?? '',
        numero: estab.numero ?? 'S/N',
        complemento: estab.complemento ?? '',
        bairro: estab.bairro ?? '',
        email: estab.email ?? null,
        telefone: estab.ddd1 && estab.telefone1
          ? `${estab.ddd1}${estab.telefone1}`
          : null,
        opSimpNac,
      };

      // ─── Salva no cache por 24h ─────────────────────────────────────────────
      cnpjCache.set(cnpjLimpo, { data: result, expiresAt: Date.now() + CACHE_TTL_MS });
      console.log(`[CNPJ_SERVICE] CNPJ ${cnpjLimpo} cacheado por 24h. Regime: ${result.opcaoMei ? 'MEI' : result.opcaoSimples ? 'Simples' : 'Não optante'}`);

      return result;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        if (status === 404) throw new Error(`CNPJ ${cnpjLimpo} não encontrado na base da Receita Federal.`);
        if (status === 429) throw new Error('Rate limit da API de CNPJ atingido. Tente novamente em alguns instantes.');
        throw new Error(`Erro ao consultar CNPJ: ${error.message}`);
      }
      throw error;
    }
  }
}
