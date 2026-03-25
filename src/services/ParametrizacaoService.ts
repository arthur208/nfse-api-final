// src/services/ParametrizacaoService.ts
// Consulta a API pública ADN de Parâmetros Municipais (adn.nfse.gov.br/parametrizacao)
// Requer certificado cliente (mutual TLS) — mesmo certificado da Sefin principal.

import axios, { AxiosInstance } from 'axios';
import https from 'https';

export interface AliquotaInfo {
  incidencia: string | null;
  aliquota: number | null;
  codigoServico: string;
  dataInicio: string;
  dataFim: string | null;
}

export interface RetencaoInfo {
  artigoSextoHabilitado: boolean;
  retencoesMunicipais: {
    descricao: string;
    tiposRetencao: number[];
    dataInicio: string;
  }[];
}

export interface ConvenioInfo {
  aderenteAmbienteNacional: boolean;
  aderenteEmissorNacional: boolean;
  aderenteMAN: boolean;
  situacaoEmissaoPadraoContribuintesRFB: number;
  permiteAproveitamentoDeCreditos: boolean;
}

export class ParametrizacaoService {
  private static readonly BASE_URL = 'https://adn.nfse.gov.br/parametrizacao';
  private client!: AxiosInstance;

  /**
   * Inicializa o serviço com o certificado PFX para mutual TLS.
   */
  public initialize(pfx: Buffer, passphrase: string): void {
    const httpsAgent = new https.Agent({
      pfx,
      passphrase,
      rejectUnauthorized: false, // ADN usa chain própria da ICP-Brasil
    });
    this.client = axios.create({
      baseURL: ParametrizacaoService.BASE_URL,
      httpsAgent,
      headers: { Accept: 'application/json' },
      validateStatus: null, // não lança exceção em nenhum status
      timeout: 15000,
    });
    console.log('[PARAMETRIZACAO_SERVICE] Inicializado com certificado mTLS.');
  }

  /**
   * Converte cTribNac (6 dígitos "AABBCC") para o formato ADN ("AA.BB.CC.000")
   * Ex: "990101" → "99.01.01.000"
   *     "010200" → "01.02.00.000"
   */
  public static cTribNacToAdnFormat(cTribNac: string): string {
    const c = cTribNac.padStart(6, '0');
    return `${c.slice(0, 2)}.${c.slice(2, 4)}.${c.slice(4, 6)}.000`;
  }

  /** Consulta dados de convênio do município */
  public async getConvenio(cMun: number): Promise<ConvenioInfo | null> {
    try {
      const res = await this.client.get(`/${cMun}/convenio`);
      if (res.status !== 200 || !res.data?.parametrosConvenio) return null;
      const p = res.data.parametrosConvenio;
      return {
        aderenteAmbienteNacional: p.aderenteAmbienteNacional === 1,
        aderenteEmissorNacional: p.aderenteEmissorNacional === 1,
        aderenteMAN: p.aderenteMAN === 1,
        situacaoEmissaoPadraoContribuintesRFB: p.situacaoEmissaoPadraoContribuintesRFB,
        permiteAproveitamentoDeCreditos: !!p.permiteAproveitametoDeCreditos,
      };
    } catch (e) {
      console.error('[PARAMETRIZACAO_SERVICE] Erro ao consultar convênio:', e);
      return null;
    }
  }

  /**
   * Consulta alíquota ISSQN para um serviço/competência.
   * @param cMun Código IBGE do município
   * @param cTribNac Código nacional (6 dígitos, ex: "990101")
   * @param dCompet Data de competência "YYYY-MM-DD"
   * @returns AliquotaInfo ou null se não parametrizado
   */
  public async getAliquota(
    cMun: number,
    cTribNac: string,
    dCompet: string,
  ): Promise<AliquotaInfo | null> {
    const codAdn = ParametrizacaoService.cTribNacToAdnFormat(cTribNac);
    const url = `/${cMun}/${codAdn}/${dCompet}/aliquota`;
    console.log(`[PARAMETRIZACAO_SERVICE] GET ${url}`);
    try {
      const res = await this.client.get(url);
      if (res.status !== 200 || !res.data?.aliquotas) return null;
      const entries = Object.entries(res.data.aliquotas);
      if (entries.length === 0) return null;
      const [cod, list] = entries[0] as [string, any[]];
      const a = list[0];
      return {
        codigoServico: cod,
        incidencia: a.Incidencia,
        aliquota: a.Aliq,
        dataInicio: a.DtIni,
        dataFim: a.DtFim,
      };
    } catch (e) {
      console.error('[PARAMETRIZACAO_SERVICE] Erro ao consultar alíquota:', e);
      return null;
    }
  }

  /**
   * Consulta regras de retenção ISSQN do município para uma competência.
   */
  public async getRetencoes(cMun: number, dCompet: string): Promise<RetencaoInfo | null> {
    const url = `/${cMun}/${dCompet}/retencoes`;
    console.log(`[PARAMETRIZACAO_SERVICE] GET ${url}`);
    try {
      const res = await this.client.get(url);
      if (res.status !== 200 || !res.data?.retencoes) return null;
      const r = res.data.retencoes;
      return {
        artigoSextoHabilitado: !!r.artigoSexto?.habilitado,
        retencoesMunicipais: (r.retencoesMunicipais ?? []).map((rm: any) => ({
          descricao: rm.descricao,
          tiposRetencao: rm.tiposRetencao ?? [],
          dataInicio: rm.dataInicioVigencia,
        })),
      };
    } catch (e) {
      console.error('[PARAMETRIZACAO_SERVICE] Erro ao consultar retenções:', e);
      return null;
    }
  }
}
