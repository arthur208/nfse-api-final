// src/services/DpsService.ts
import { create } from 'xmlbuilder2';
import { NfsInputDto } from '../dtos/NfsInputDto';
import { formatInTimeZone } from 'date-fns-tz';

export class DpsService {
  // A função agora aceita o ambiente como um argumento
  public buildUnsignedXml(data: NfsInputDto, ambiente: '1' | '2'): string {
    const cnpjPrestadorLimpo = data.prestador.cnpj.replace(/\D/g, '');
    const idDps = `DPS${data.prestador.codigoMunicipio}2${cnpjPrestadorLimpo.padStart(14, '0')}${data.dps.serie.padStart(5, '0')}${data.dps.numero.toString().padStart(15, '0')}`;
    const dhEmiFormatada = formatInTimeZone(new Date(), 'America/Sao_Paulo', "yyyy-MM-dd'T'HH:mm:ssXXX");

    const root = create({ version: '1.0', encoding: 'utf-8' }).ele('DPS', {
      versao: '1.00',
      xmlns: 'http://www.sped.fazenda.gov.br/nfse',
    });
    
    const infDPS = root.ele('infDPS', { Id: idDps });
    // *** A MUDANÇA ESTÁ AQUI ***
    infDPS.ele('tpAmb').txt(ambiente); // Usa o ambiente recebido (1 ou 2)

    infDPS.ele('dhEmi').txt(dhEmiFormatada);
    infDPS.ele('verAplic').txt('OpenAC.NFSe.Nacional');
    infDPS.ele('serie').txt(data.dps.serie);
    infDPS.ele('nDPS').txt(data.dps.numero.toString());
    infDPS.ele('dCompet').txt(data.dps.dataCompetencia);
    infDPS.ele('tpEmit').txt('1');
    infDPS.ele('cLocEmi').txt(data.prestador.codigoMunicipio);
    
    const prest = infDPS.ele('prest');
    prest.ele('CNPJ').txt(cnpjPrestadorLimpo);
    const regTrib = prest.ele('regTrib');
    regTrib.ele('opSimpNac').txt('2');
    regTrib.ele('regEspTrib').txt('0');
    
    const toma = infDPS.ele('toma');
    const docTomadorLimpo = data.tomador.documento.replace(/\D/g, '');
    if (docTomadorLimpo.length === 11) toma.ele('CPF').txt(docTomadorLimpo);
    else toma.ele('CNPJ').txt(docTomadorLimpo);
    toma.ele('xNome').txt(data.tomador.razaoSocial);
    const end = toma.ele('end');
    const endNac = end.ele('endNac');
    endNac.ele('cMun').txt(data.tomador.endereco.codigoMunicipio);
    endNac.ele('CEP').txt(data.tomador.endereco.cep.replace(/\D/g, ''));
    end.ele('xLgr').txt(data.tomador.endereco.logradouro);
    end.ele('nro').txt(data.tomador.endereco.numero);
    end.ele('xBairro').txt(data.tomador.endereco.bairro);

    const serv = infDPS.ele('serv');
    serv.ele('locPrest').ele('cLocPrestacao').txt(data.servico.codigoMunicipioPrestacao);
    const cServ = serv.ele('cServ');
    cServ.ele('cTribNac').txt(data.servico.itemListaServico);
    cServ.ele('xDescServ').txt(data.servico.discriminacao);

    const valores = infDPS.ele('valores');
    valores.ele('vServPrest').ele('vServ').txt(data.servico.valor.toFixed(2));
    const trib = valores.ele('trib');
    const tribMun = trib.ele('tribMun');
    tribMun.ele('tribISSQN').txt('1');
    tribMun.ele('tpRetISSQN').txt('1');
    const totTrib = trib.ele('totTrib');
    const pTotTrib = totTrib.ele('pTotTrib');
    pTotTrib.ele('pTotTribFed').txt('0.00');
    pTotTrib.ele('pTotTribEst').txt('0.00');
    pTotTrib.ele('pTotTribMun').txt('0.00');

    return root.end({ prettyPrint: true });
  }
}