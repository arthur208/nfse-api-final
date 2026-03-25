// src/services/EventoService.ts
import { create } from 'xmlbuilder2';
import { EventoInputDto } from '../dtos/EventoInputDto';
import { formatInTimeZone } from 'date-fns-tz';
import { subSeconds } from 'date-fns';
import fs from 'fs';
import path from 'path';

export class EventoService {

  /** Retorna o código numérico (6 dígitos) do tipo de evento */
  private getTipoEventoNumerico(tipoEvento: string): string {
    const map: Record<string, string> = {
      'cancelamento':                '101101',
      'cancelamentoPorSubstituicao': '105102',
      'confirmacaoPrestador':        '202201',
      'rejeicaoPrestador':           '202205',
    };
    return map[tipoEvento] || '101101';
  }

  /**
   * Constrói o XML do Pedido de Registro de Evento (não assinado).
   *
   * Estrutura confirmada pela Sefin:
   *
   *   <pedRegEvento versao="1.00">            ← elemento raiz exigido pela Sefin
   *     <infPedReg Id="PRE{chave50}{tipo6}{seq3}">
   *       <tpAmb/> <verAplic/> <dhEvento/>
   *       <CNPJAutor/>
   *       <chNFSe/>
   *       <nPedRegEvento/>
   *       <e101101/>  ← ou outro tipo de evento
   *     </infPedReg>
   *     <ds:Signature/>  ← inserida pelo XmlSigningService
   *   </pedRegEvento>
   *
   * TSIdPedRefEvt = "PRE" + 59 dígitos = 62 chars total
   *   → PRE + chaveAcesso(50) + tipoEvento(6) + nPedRegEvento(3)
   */
  public buildEventoXml(data: EventoInputDto): string {
    const agora = new Date();
    const dataComFolga = subSeconds(agora, 300);
    const dhEvento = formatInTimeZone(dataComFolga, 'America/Sao_Paulo', "yyyy-MM-dd'T'HH:mm:ssXXX");

    const tipoNum   = this.getTipoEventoNumerico(data.tipoEvento); // 6 dígitos
    const nPedSeq   = '001'; // 3 dígitos ← usado só no idEvento (infEvento), NÃO no infPedReg

    /**
     * Formatos confirmados pelo XML real retornado pela Sefin (evento cancelamento):
     *
     * infEvento Id  = "EVT" + chaveAcesso(50) + tipoEvento(6) + nSeqEvento(3) = 62 chars
     *                  Ex: EVT41152002...945101101001
     *
     * infPedReg Id  = "PRE" + chaveAcesso(50) + tipoEvento(6) = 59 chars (SEM seq!)
     *                  Ex: PRE41152002...945101101
     *
     * versão do pedRegEvento = "1.01" (não 1.00)
     */
    const idEvento  = 'EVT' + data.chaveAcesso + tipoNum + nPedSeq; // 3+50+6+3 = 62
    const idPedReg  = 'PRE' + data.chaveAcesso + tipoNum;            // 3+50+6   = 59

    console.log(`[EVENTO_SERVICE] idEvento (${idEvento.length}): ${idEvento}`);
    console.log(`[EVENTO_SERVICE] idPedReg (${idPedReg.length}): ${idPedReg}`);

    const root = create({ version: '1.0', encoding: 'UTF-8' }).ele('pedRegEvento', {
      versao: '1.01',
      xmlns: 'http://www.sped.fazenda.gov.br/nfse',
      'xmlns:ds': 'http://www.w3.org/2000/09/xmldsig#',
    });

    const infPedReg = root.ele('infPedReg', { Id: idPedReg });

    infPedReg.ele('tpAmb').txt(data.ambiente);
    infPedReg.ele('verAplic').txt('API_NFSe_Final_1.0');
    infPedReg.ele('dhEvento').txt(dhEvento);
    infPedReg.ele('CNPJAutor').txt(data.cnpjAutor.replace(/\D/g, '').padStart(14, '0'));
    infPedReg.ele('chNFSe').txt(data.chaveAcesso);
    // nPedRegEvento não aparece no XML real da Sefin para o pedRegEvento — removido

    // Sub-elemento específico do tipo de evento
    this.buildTipoEvento(infPedReg, data);

    const xmlGerado = root.end({ prettyPrint: true }) as unknown as string;

    // Salva XML de debug para inspeção
    try {
      const debugDir = path.join(process.cwd(), 'debug');
      if (!fs.existsSync(debugDir)) fs.mkdirSync(debugDir, { recursive: true });
      const fileName = `evento-debug-${Date.now()}.xml`;
      fs.writeFileSync(path.join(debugDir, fileName), xmlGerado, 'utf-8');
      console.log(`[EVENTO_SERVICE] XML não-assinado salvo em: debug/${fileName}`);
    } catch (e) {
      console.warn('[EVENTO_SERVICE] Não foi possível salvar o XML de debug:', e);
    }

    console.log(`[EVENTO_SERVICE] Evento '${data.tipoEvento}' gerado para chave: ${data.chaveAcesso}`);
    return xmlGerado;
  }

  private buildTipoEvento(infPedReg: any, data: EventoInputDto): void {
    switch (data.tipoEvento) {
      case 'cancelamento': {
        const e = infPedReg.ele('e101101');
        e.ele('xDesc').txt('Cancelamento de NFS-e');
        e.ele('cMotivo').txt(data.codigoMotivo);
        e.ele('xMotivo').txt(data.descricaoMotivo || 'Cancelamento solicitado pelo prestador.');
        break;
      }
      case 'cancelamentoPorSubstituicao': {
        if (!data.chaveSubstituta) {
          throw new Error("O campo 'chaveSubstituta' é obrigatório para o evento de Cancelamento por Substituição.");
        }
        const e = infPedReg.ele('e105102');
        e.ele('xDesc').txt('Cancelamento de NFS-e por Substituicao');
        e.ele('cMotivo').txt(data.codigoMotivo);
        if (data.descricaoMotivo) e.ele('xMotivo').txt(data.descricaoMotivo);
        e.ele('chSubstituta').txt(data.chaveSubstituta);
        break;
      }
      case 'confirmacaoPrestador': {
        const e = infPedReg.ele('e202201');
        e.ele('xDesc').txt('Confirmação do Prestador');
        break;
      }
      case 'rejeicaoPrestador': {
        const e = infPedReg.ele('e202205');
        e.ele('xDesc').txt('Rejeição do Prestador');
        const infRej = e.ele('infRej');
        infRej.ele('cMotivo').txt(data.codigoMotivo);
        if (data.descricaoMotivo) infRej.ele('xMotivo').txt(data.descricaoMotivo);
        break;
      }
      default:
        throw new Error(`Tipo de evento desconhecido: ${(data as any).tipoEvento}`);
    }
  }
}
