// src/services/TaxCalculationService.ts
// Motor central de cálculo tributário automático.
// Orquestra CnpjService + ParametrizacaoService e aplica as regras tributárias.

import { CnpjService, DadosCnpj } from './CnpjService';
import { ParametrizacaoService, AliquotaInfo, RetencaoInfo, ConvenioInfo } from './ParametrizacaoService';

export interface TaxCalcInput {
  cnpjPrestador: string;
  cMunPrestacao: number;         // Código IBGE do município de prestação
  cTribNac: string;              // Código tribut. nacional (6 dígitos: "990101")
  vServ: number;                 // Valor bruto do serviço
  dCompet: string;               // Competência "YYYY-MM-DD"
  vDescIncond?: number;          // Desconto incondicionado (opcional)
  vDescCond?: number;            // Desconto condicionado (opcional)
  vDedRed?: number;              // Deduções documentadas (opcional)
  regEspTrib?: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 9;  // Regime especial (padrão: 0)
  tomadorPJ?: boolean;           // Se tomador é PJ (afeta retenções federais, padrão: true)
  regimePrestador?: 'LP' | 'LR'; // Forçar regime federal (LP=Lucro Presumido, LR=Lucro Real)
  pAliqManual?: number;          // Alíquota manual, se município não parametrizado
}

export interface TaxCalcResult {
  // Dados do prestador (prest)
  prestador: {
    opSimpNac: 1 | 2 | 3;
    regEspTrib: number;
    regApTribSN?: 1 | 2 | 3;
    xNome: string;
    cMun: number;
    uf: string;
  };
  // Bloco valores completo para a DPS
  valores: {
    vServPrest: { vServ: number; vReceb?: number };
    vDescCondIncond?: { vDescIncond?: number; vDescCond?: number };
    trib: {
      tribMun: {
        tribISSQN: 1 | 2 | 3 | 4;
        tpRetISSQN: 1 | 2 | 3;
        pAliq?: number;
      };
      tribFed?: {
        piscofins?: {
          CST: string;
          vBCPisCofins: number;
          pAliqPis: number;
          pAliqCofins: number;
          vPis: number;
          vCofins: number;
        };
        vRetCP?: number;
        vRetIRRF?: number;
        vRetCSLL?: number;
      };
      totTrib: { indTotTrib: 0 | 1 | 2 };
    };
  };
  // Informações de debug/transparência
  calculado: {
    vBC: number;
    vISSQN: number;
    vLiq: number;
    fonteAliquota: 'ADN' | 'manual' | 'nao_informada';
    aliquotaISS: number | null;
    municipioAderente: boolean;
    issqnRetidoPeloTomador: boolean;
    retencoesFederaisAplicadas: boolean;
    regimeTributarioDetectado: string;
  };
}

export class TaxCalculationService {
  private cnpjService: CnpjService;
  private parametrizacaoService: ParametrizacaoService;

  constructor(parametrizacaoService: ParametrizacaoService) {
    this.cnpjService = new CnpjService();
    this.parametrizacaoService = parametrizacaoService;
  }

  public async calcular(input: TaxCalcInput): Promise<TaxCalcResult> {
    const {
      cnpjPrestador,
      cMunPrestacao,
      cTribNac,
      vServ,
      dCompet,
      vDescIncond = 0,
      vDescCond = 0,
      vDedRed = 0,
      regEspTrib = 0,
      tomadorPJ = true,
      regimePrestador,
      pAliqManual,
    } = input;

    // ─── 1. Busca dados do CNPJ ─────────────────────────────────────────────
    console.log('[TAX_CALC] Buscando dados do CNPJ...');
    const dadosCnpj = await this.cnpjService.getDadosCnpj(cnpjPrestador);

    // ─── 2. Consulta ADN em paralelo ─────────────────────────────────────────
    console.log('[TAX_CALC] Consultando ADN parametrizacao...');
    const [convenio, aliquotaInfo, retencoes] = await Promise.all([
      this.parametrizacaoService.getConvenio(cMunPrestacao),
      this.parametrizacaoService.getAliquota(cMunPrestacao, cTribNac, dCompet),
      this.parametrizacaoService.getRetencoes(cMunPrestacao, dCompet),
    ]);

    // ─── 3. Determina alíquota ISSQN ─────────────────────────────────────────
    let fonteAliquota: TaxCalcResult['calculado']['fonteAliquota'] = 'nao_informada';
    let aliquotaISS: number | null = null;

    if (aliquotaInfo?.aliquota != null) {
      aliquotaISS = aliquotaInfo.aliquota;
      fonteAliquota = 'ADN';
    } else if (pAliqManual != null) {
      aliquotaISS = pAliqManual;
      fonteAliquota = 'manual';
    }

    // ─── 4. Cálculo da Base de Cálculo ISSQN ────────────────────────────────
    const vBC = Math.max(0, vServ - vDescIncond - vDedRed);
    const vISSQN = aliquotaISS != null ? round2(vBC * aliquotaISS / 100) : 0;

    // ─── 5. tpRetISSQN — quem retém ─────────────────────────────────────────
    // MEI/SN pagam ISS fixo via DAS — nunca retido pelo tomador (tpRetISSQN=1)
    // Empresas fora do SN: município pode exigir retenção pelo tomador PJ
    const isMei = dadosCnpj.opSimpNac === 2;
    const issqnRetidoPeloTomador = !isMei && !!(
      retencoes?.artigoSextoHabilitado ||
      (retencoes?.retencoesMunicipais && retencoes.retencoesMunicipais.length > 0)
    ) && tomadorPJ;
    const tpRetISSQN: 1 | 2 | 3 = issqnRetidoPeloTomador ? 2 : 1;

    // ─── 6. Regime federal e PIS/COFINS ─────────────────────────────────────
    // SN: sem PIS/COFINS separados (embutido no DAS)
    // MEI: sem PIS/COFINS
    // LP (Lucro Presumido): PIS 0,65% + COFINS 3%
    // LR (Lucro Real): PIS 1,65% + COFINS 7,6%
    const isSimples = dadosCnpj.opSimpNac === 3 || dadosCnpj.opSimpNac === 2;
    let tribFed: TaxCalcResult['valores']['trib']['tribFed'];
    let retencoesFederaisAplicadas = false;

    if (!isSimples || regimePrestador) {
      // Fora do SN: aplica PIS/COFINS e possíveis retenções
      const regime = regimePrestador ?? 'LP'; // default = Lucro Presumido
      const pAliqPis = regime === 'LR' ? 1.65 : 0.65;
      const pAliqCofins = regime === 'LR' ? 7.60 : 3.00;
      const vBCPisCofins = vServ - vDescIncond; // BC PIS/COFINS = valor bruto - desconto incond.
      const vPis = round2(vBCPisCofins * pAliqPis / 100);
      const vCofins = round2(vBCPisCofins * pAliqCofins / 100);

      tribFed = {
        piscofins: {
          CST: '01', // Operação tributável com alíquota básica
          vBCPisCofins,
          pAliqPis,
          pAliqCofins,
          vPis,
          vCofins,
        },
      };

      // Retenções federais (obrigatórias quando tomador é PJ e presta serviços específicos)
      if (tomadorPJ && vServ > 215.05) {
        // IRRF: 1,5% (serviços técnicos e de administração em geral)
        tribFed.vRetIRRF = round2(vBC * 0.015);
        // CSLL: 1%
        tribFed.vRetCSLL = round2(vBC * 0.01);
        retencoesFederaisAplicadas = true;
      }
    }

    // ─── 7. Determina regApTribSN ────────────────────────────────────────────
    let regApTribSN: 1 | 2 | 3 | undefined;
    if (dadosCnpj.opSimpNac === 3) {
      regApTribSN = 1; // padrão: tudo pelo SN
    }

    // ─── 8. Valor Líquido ────────────────────────────────────────────────────
    const retencaoISS = tpRetISSQN === 2 ? vISSQN : 0;
    const retencaoIRRF = tribFed?.vRetIRRF ?? 0;
    const retencaoCSLL = tribFed?.vRetCSLL ?? 0;
    const vLiq = round2(vServ - vDescIncond - vDescCond - retencaoISS - retencaoIRRF - retencaoCSLL);

    // ─── 9. Monta resultado ──────────────────────────────────────────────────
    const result: TaxCalcResult = {
      prestador: {
        opSimpNac: dadosCnpj.opSimpNac,
        regEspTrib,
        regApTribSN,
        xNome: dadosCnpj.razaoSocial,
        cMun: dadosCnpj.cMun,
        uf: dadosCnpj.uf,
      },
      valores: {
        vServPrest: { vServ },
        ...(vDescIncond > 0 || vDescCond > 0
          ? { vDescCondIncond: { vDescIncond: vDescIncond || undefined, vDescCond: vDescCond || undefined } }
          : {}),
        trib: {
          tribMun: {
            tribISSQN: 1, // Operação tributável (padrão)
            tpRetISSQN,
            // Informa pAliq apenas se município não for conveniado OU se não tiver parametrização
            ...(convenio?.aderenteAmbienteNacional === false && aliquotaISS != null
              ? { pAliq: aliquotaISS }
              : {}),
          },
          ...(tribFed ? { tribFed } : {}),
          totTrib: { indTotTrib: 0 },
        },
      },
      calculado: {
        vBC,
        vISSQN,
        vLiq,
        fonteAliquota,
        aliquotaISS,
        municipioAderente: !!convenio?.aderenteAmbienteNacional,
        issqnRetidoPeloTomador,
        retencoesFederaisAplicadas,
        regimeTributarioDetectado: describeRegime(dadosCnpj),
      },
    };

    console.log('[TAX_CALC] Cálculo concluído:', JSON.stringify(result.calculado));
    return result;
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function describeRegime(d: DadosCnpj): string {
  if (d.opcaoMei) return 'MEI';
  if (d.opcaoSimples) return `Simples Nacional (${d.porte})`;
  return `Lucro Presumido / Real (${d.naturezaJuridica})`;
}
