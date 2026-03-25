import { Request, Response } from 'express';
import pem from 'pem';
import fs from 'fs';
import path from 'path';
import { TaxCalculationService, TaxCalcInput } from '../services/TaxCalculationService';
import { ParametrizacaoService } from '../services/ParametrizacaoService';
import { DpsService } from '../services/DpsService';
import { XmlSigningService } from '../services/XmlSigningService';
import { GovApiService } from '../services/GovApiService';
import { environments } from '../config/environments';

// Helper reutilizado do NfseController
async function processCertificateFromHeaders(req: Request) {
  const pfxBase64 = req.headers['x-pfx-base64'] as string;
  const pfxPassword = req.headers['x-pfx-password'] as string;
  if (!pfxBase64 || !pfxPassword) {
    throw { status: 401, message: "Os cabeçalhos 'x-pfx-base64' e 'x-pfx-password' são obrigatórios." };
  }
  const pfxBuffer = Buffer.from(pfxBase64, 'base64');
  return new Promise<{ key: string; cert: string; pfxBuffer: Buffer; pfxPassword: string }>((resolve, reject) => {
    pem.readPkcs12(pfxBuffer, { p12Password: pfxPassword }, (err, cert) => {
      if (err || !cert?.key) {
        return reject({ status: 401, message: 'Falha ao processar o certificado PFX.', details: err?.message });
      }
      resolve({ key: cert.key, cert: cert.cert, pfxBuffer, pfxPassword });
    });
  });
}

export class TributacaoController {

  constructor(
    private dpsService: DpsService,
    private signingService: XmlSigningService,
  ) {}

  /**
   * POST /tributacao/calcular
   * Recebe dados mínimos e retorna o bloco valores.trib completo.
   */
  public calcular = async (req: Request, res: Response): Promise<Response> => {
    try {
      const { pfxBuffer, pfxPassword } = await processCertificateFromHeaders(req);

      const input: TaxCalcInput = req.body;

      // Valida campos obrigatórios
      const missing = ['cnpjPrestador', 'cMunPrestacao', 'cTribNac', 'vServ', 'dCompet'].filter(f => !(req.body as any)[f]);
      if (missing.length > 0) {
        return res.status(400).json({ message: `Campos obrigatórios faltando: ${missing.join(', ')}` });
      }

      const parametrizacaoService = new ParametrizacaoService();
      parametrizacaoService.initialize(pfxBuffer, pfxPassword);
      const taxService = new TaxCalculationService(parametrizacaoService);

      const resultado = await taxService.calcular(input);
      return res.status(200).json(resultado);

    } catch (error: any) {
      console.error('[TRIBUTACAO_CONTROLLER] Erro:', error);
      return res.status(error.status || 500).json({
        message: 'Erro ao calcular tributos.',
        details: error.message || error.details || String(error),
      });
    }
  };

  /**
   * POST /nfse/emitir-simples
   * Tudo-em-um: calcula tributos automaticamente + monta DPS + assina + envia para a Sefin.
   */
  public emitirSimples = async (req: Request, res: Response): Promise<Response> => {
    try {
      const { key, cert, pfxBuffer, pfxPassword } = await processCertificateFromHeaders(req);

      const body = req.body;
      const missing = ['cnpjPrestador', 'cMunPrestacao', 'cTribNac', 'xDescServ', 'vServ', 'dCompet'].filter(f => !body[f]);
      if (missing.length > 0) {
        return res.status(400).json({ message: `Campos obrigatórios faltando: ${missing.join(', ')}` });
      }

      const ambiente: '1' | '2' = body.ambiente === '2' ? '2' : '1';
      const ambienteNome = ambiente === '1' ? 'producao' : 'homologacao';

      // ─── 1. Cálculo automático de tributos ──────────────────────────────────
      console.log('[EMITIR_SIMPLES] Iniciando cálculo automático de tributos...');
      const parametrizacaoService = new ParametrizacaoService();
      parametrizacaoService.initialize(pfxBuffer, pfxPassword);
      const taxService = new TaxCalculationService(parametrizacaoService);

      const taxInput: TaxCalcInput = {
        cnpjPrestador: body.cnpjPrestador,
        cMunPrestacao: body.cMunPrestacao,
        cTribNac: body.cTribNac,
        vServ: body.vServ,
        dCompet: body.dCompet,
        vDescIncond: body.vDescIncond,
        vDescCond: body.vDescCond,
        vDedRed: body.vDedRed,
        regEspTrib: body.regEspTrib ?? 0,
        tomadorPJ: body.tomador?.cnpj ? true : false,
        pAliqManual: body.pAliqManual,
      };

      const taxResult = await taxService.calcular(taxInput);
      console.log('[EMITIR_SIMPLES] Tributos calculados:', taxResult.calculado);

      // ─── 2. Monta NfsInputDto para o DpsService ──────────────────────────────
      const nfsInput = buildNfsInputFromSimples(body, taxResult, ambiente);

      // ─── 3. Gera e assina o XML da DPS ──────────────────────────────────────
      const unsignedXml = this.dpsService.buildUnsignedXml(nfsInput, ambiente);
      const signedXml = this.signingService.signXml(unsignedXml, key, cert);

      // ─── DEBUG: salva e loga o XML antes de enviar ───────────────────────────
      const debugDir = path.join(process.cwd(), 'debug');
      if (!fs.existsSync(debugDir)) fs.mkdirSync(debugDir);
      const debugFile = path.join(debugDir, `emitir-simples-${Date.now()}.xml`);
      fs.writeFileSync(debugFile, signedXml);
      console.log('[EMITIR_SIMPLES] ==== XML ASSINADO QUE SERA ENVIADO A SEFIN ====');
      console.log(signedXml);
      console.log(`[EMITIR_SIMPLES] ==== FIM | Salvo em: ${debugFile} ====`);

      // ─── 4. Envia para a Sefin ───────────────────────────────────────────────
      const govApiService = new GovApiService();
      govApiService.initialize(
        pfxBuffer,
        pfxPassword,
        environments[ambienteNome].baseUrl,
        environments[ambienteNome].danfseUrl,
      );

      const govResponse = await govApiService.emitirNfse(signedXml);

      return res.status(201).json({
        status: 'NFS-e emitida com sucesso!',
        tributacaoCalculada: taxResult.calculado,
        prestadorDetectado: {
          xNome: taxResult.prestador.xNome,
          regime: taxResult.calculado.regimeTributarioDetectado,
          opSimpNac: taxResult.prestador.opSimpNac,
        },
        ...govResponse,
      });

    } catch (error: any) {
      console.error('[EMITIR_SIMPLES] Erro:', error);
      return res.status(error.status || 500).json({
        message: 'Erro ao emitir NFS-e simplificada.',
        details: error.details || error.message || String(error),
      });
    }
  };
}

// ─── Helper: converte o body simplificado em NfsInputDto completo ────────────
function buildNfsInputFromSimples(body: any, tax: any, ambiente: '1' | '2'): any {
  const cnpjLimpo = body.cnpjPrestador.replace(/\D/g, '');
  const trib = tax.valores.trib;

  return {
    ambiente,
    dps: {
      serie: body.serie ?? '1',
      numero: body.numero ?? 1,
      dataCompetencia: body.dCompet,
    },
    prestador: {
      codigoMunicipio: String(tax.prestador.cMun || body.cMunPrestacao),
      identificacao: { cnpj: cnpjLimpo },
      regimeTributacao: {
        opcaoSimplesNacional: String(tax.prestador.opSimpNac) as '1' | '2' | '3',
        regimeEspecial: String(tax.prestador.regEspTrib ?? 0),
        ...(tax.prestador.regApTribSN ? { regimeApuracaoSN: String(tax.prestador.regApTribSN) } : {}),
      },
    },
    tomador: body.tomador
      ? {
          identificacao: body.tomador.cnpj
            ? { cnpj: body.tomador.cnpj.replace(/\D/g, '') }
            : undefined,
          razaoSocial: body.tomador.xNome ?? body.tomador.razaoSocial ?? 'Tomador não identificado',
          endereco: body.tomador.endereco,
          contato: body.tomador.email || body.tomador.telefone
            ? { email: body.tomador.email, telefone: body.tomador.telefone }
            : undefined,
        }
      : undefined,
    servico: {
      itemListaServico: body.cTribNac,
      discriminacao: body.xDescServ,
      codigoMunicipioPrestacao: String(body.cMunPrestacao),
      ...(body.cNBS ? { codigoNBS: body.cNBS } : {}),
      ...(body.cTribMun ? { codigoTributacaoMunicipio: body.cTribMun } : {}),
    },
    valores: {
      valorServico: body.vServ,
      ...(body.vDescIncond != null ? { descontoIncondicionado: body.vDescIncond } : {}),
      ...(body.vDescCond != null ? { descontoCondicionado: body.vDescCond } : {}),
      // ISS — mapeando trib.tribMun -> iss
      iss: {
        tributacao: String(trib.tribMun.tribISSQN) as '1' | '2' | '3' | '4',
        retencao: String(trib.tribMun.tpRetISSQN) as '1' | '2' | '3',
        ...(trib.tribMun.pAliq != null ? { aliquota: trib.tribMun.pAliq } : {}),
      },
      // Tributos federais — mapeando trib.tribFed -> tributosFederais
      ...(trib.tribFed ? {
        tributosFederais: {
          ...(trib.tribFed.piscofins ? {
            piscofins: {
              cst: trib.tribFed.piscofins.CST,
              valorBC: trib.tribFed.piscofins.vBCPisCofins,
              aliquotaPis: trib.tribFed.piscofins.pAliqPis,
              aliquotaCofins: trib.tribFed.piscofins.pAliqCofins,
              valorPis: trib.tribFed.piscofins.vPis,
              valorCofins: trib.tribFed.piscofins.vCofins,
            }
          } : {}),
          ...(trib.tribFed.vRetIRRF != null ? { valorRetidoIRRF: trib.tribFed.vRetIRRF } : {}),
          ...(trib.tribFed.vRetCSLL != null ? { valorRetidoCSLL: trib.tribFed.vRetCSLL } : {}),
        }
      } : {}),
      // Totais — mapeando trib.totTrib.indTotTrib -> totaisTributos.indicador
      totaisTributos: { indicador: String(trib.totTrib.indTotTrib) as '0' },
    },
  };
}
