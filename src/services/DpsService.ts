// src/services/DpsService.ts
import { create, XMLElement } from 'xmlbuilder2';
import { 
  NfsInputDto, 
  Endereco, 
  DocumentoDeducao, 
  DocumentoFiscal, 
  Substituicao, 
  ComercioExterior, 
  LocacaoSublocacao, 
  Obra, 
  AtividadeEvento, 
  ExploracaoRodoviaria, 
  InformacoesComplementares, 
  DeducaoReducao, 
  BeneficioMunicipal, 
  ExigibilidadeSuspensa, 
  TributosFederais, 
  TotaisTributos 
} from '../dtos/NfsInputDto';
import { formatInTimeZone } from 'date-fns-tz';

export class DpsService {

  /**
   * Constrói o XML da DPS (Declaração de Prestação de Serviços) a partir do DTO de entrada.
   * @param data O objeto NfsInputDto com todos os dados da nota.
   * @param ambiente '1' para Produção, '2' para Homologação.
   * @returns Uma string contendo o XML da DPS formatado e pronto para ser assinado.
   */
  public buildUnsignedXml(data: NfsInputDto, ambiente: '1' | '2'): string {
    const { prestador, dps, servico, valores } = data;

    if (!prestador || !prestador.identificacao) {
      throw new Error("O objeto 'prestador.identificacao' é obrigatório no JSON de entrada.");
    }

    const cnpjPrestadorLimpo = 'cnpj' in prestador.identificacao ? prestador.identificacao.cnpj.replace(/\D/g, '') : '';
    const idDps = `DPS${prestador.codigoMunicipio}2${cnpjPrestadorLimpo.padStart(14, '0')}${dps.serie.padStart(5, '0')}${dps.numero.toString().padStart(15, '0')}`;
    const dhEmiFormatada = formatInTimeZone(new Date(), 'America/Sao_Paulo', "yyyy-MM-dd'T'HH:mm:ssXXX");

    const root = create({ version: '1.0', encoding: 'UTF-8' })
      .ele('DPS', {
        versao: '1.00',
        xmlns: 'http://www.sped.fazenda.gov.br/nfse',
      });

    const infDPS = root.ele('infDPS', { Id: idDps });

    infDPS.ele('tpAmb').txt(ambiente);
    infDPS.ele('dhEmi').txt(dhEmiFormatada);
    infDPS.ele('verAplic').txt('API_NFSe_Final_1.0');
    infDPS.ele('serie').txt(dps.serie);
    infDPS.ele('nDPS').txt(dps.numero.toString());
    infDPS.ele('dCompet').txt(dps.dataCompetencia);
    infDPS.ele('tpEmit').txt('1'); // Emissão normal
    infDPS.ele('cLocEmi').txt(prestador.codigoMunicipio);

    if (data.substituicao) {
      this.buildSubstituicao(infDPS, data.substituicao);
    }

    this.buildPrestador(infDPS, prestador);
    
    if (data.tomador) {
      this.buildPessoa(infDPS.ele('toma'), data.tomador);
    }
    
    if (data.intermediario) {
      const interm = infDPS.ele('interm');
      this.buildIdentificacao(interm, data.intermediario.identificacao);
      interm.ele('xNome').txt(data.intermediario.razaoSocial);
      if (data.intermediario.inscricaoMunicipal) {
        interm.ele('IM').txt(data.intermediario.inscricaoMunicipal);
      }
    }

    this.buildServico(infDPS, servico);
    this.buildValores(infDPS, valores);

    return root.end({ pretty: true });
  }

  private buildIdentificacao(builder: XMLElement, identificacao: DocumentoFiscal): void {
    if ('cnpj' in identificacao) builder.ele('CNPJ').txt(identificacao.cnpj.replace(/\D/g, ''));
    else if ('cpf' in identificacao) builder.ele('CPF').txt(identificacao.cpf.replace(/\D/g, ''));
    else if ('nif' in identificacao) builder.ele('NIF').txt(identificacao.nif);
    else if ('cNaoNif' in identificacao) builder.ele('cNaoNIF').txt(identificacao.cNaoNif);
  }

  private buildEndereco(builder: XMLElement, endereco: Endereco, isSimples: boolean = false): void {
    if (endereco.codigoMunicipio) {
      const endNac = builder.ele(isSimples ? 'endSimples' : 'endNac');
      endNac.ele('cMun').txt(endereco.codigoMunicipio);
      if (endereco.cep) endNac.ele('CEP').txt(endereco.cep.replace(/\D/g, ''));
    } else if (endereco.codigoPais) {
      const endExt = builder.ele(isSimples ? 'endExtSimples' : 'endExt');
      endExt.ele('cPais').txt(endereco.codigoPais);
      if (endereco.codigoEndPostal) endExt.ele('cEndPost').txt(endereco.codigoEndPostal);
      if (endereco.cidade) endExt.ele('xCidade').txt(endereco.cidade);
      if (endereco.estadoProvinciaRegiao) endExt.ele('xEstProvReg').txt(endereco.estadoProvinciaRegiao);
    }

    builder.ele('xLgr').txt(endereco.logradouro);
    builder.ele('nro').txt(endereco.numero);
    if (endereco.complemento) builder.ele('xCpl').txt(endereco.complemento);
    builder.ele('xBairro').txt(endereco.bairro);
  }

  private buildPessoa(builder: XMLElement, pessoa: any): void {
    if (!pessoa.identificacao) {
      throw new Error(`O objeto 'identificacao' é obrigatório para a pessoa.`);
    }
    this.buildIdentificacao(builder, pessoa.identificacao);
    
    if (pessoa.razaoSocial) builder.ele('xNome').txt(pessoa.razaoSocial);
    if (pessoa.nomeFantasia) builder.ele('xFant').txt(pessoa.nomeFantasia);
    if (pessoa.inscricaoMunicipal) builder.ele('IM').txt(pessoa.inscricaoMunicipal);
    if (pessoa.caepf) builder.ele('CAEPF').txt(pessoa.caepf);

    if (pessoa.endereco) {
      this.buildEndereco(builder.ele('end'), pessoa.endereco);
    }

    if (pessoa.contato) {
      if (pessoa.contato.telefone) builder.ele('fone').txt(pessoa.contato.telefone.replace(/\D/g, ''));
      if (pessoa.contato.email) builder.ele('email').txt(pessoa.contato.email);
    }
  }

  private buildPrestador(builder: XMLElement, prestador: NfsInputDto['prestador']): void {
    const prest = builder.ele('prest');
    this.buildPessoa(prest, prestador);
    
    const regTrib = prest.ele('regTrib');
    regTrib.ele('opSimpNac').txt(prestador.regimeTributacao.opcaoSimplesNacional);
    if (prestador.regimeTributacao.regimeApuracaoSN) {
      regTrib.ele('regApTribSN').txt(prestador.regimeTributacao.regimeApuracaoSN);
    }
    regTrib.ele('regEspTrib').txt(prestador.regimeTributacao.regimeEspecial);
  }

  private buildSubstituicao(builder: XMLElement, substituicao: Substituicao): void {
    const subst = builder.ele('subst');
    subst.ele('chSubstda').txt(substituicao.chaveAcessoSubstituida);
    subst.ele('cMotivo').txt(substituicao.codigoMotivo);
    if (substituicao.motivo) {
      subst.ele('xMotivo').txt(substituicao.motivo);
    }
  }

  private buildServico(builder: XMLElement, servico: NfsInputDto['servico']): void {
    const serv = builder.ele('serv');
    
    const locPrest = serv.ele('locPrest');
    if (servico.codigoMunicipioPrestacao) locPrest.ele('cLocPrestacao').txt(servico.codigoMunicipioPrestacao);
    if (servico.codigoPaisPrestacao) locPrest.ele('cPaisPrestacao').txt(servico.codigoPaisPrestacao);
    if (servico.consumoServicoOcorrido) locPrest.ele('opConsumServ').txt(servico.consumoServicoOcorrido);

    const cServ = serv.ele('cServ');
    cServ.ele('cTribNac').txt(servico.itemListaServico);
    if (servico.codigoTributacaoMunicipio) cServ.ele('cTribMun').txt(servico.codigoTributacaoMunicipio);
    cServ.ele('xDescServ').txt(servico.discriminacao);
    if (servico.codigoNBS) cServ.ele('cNBS').txt(servico.codigoNBS);
    if (servico.codigoInternoContribuinte) cServ.ele('cIntContrib').txt(servico.codigoInternoContribuinte);

    if (servico.comercioExterior) this.buildComercioExterior(serv, servico.comercioExterior);
    if (servico.locacaoSublocacao) this.buildLocacaoSublocacao(serv, servico.locacaoSublocacao);
    if (servico.obra) this.buildObra(serv, servico.obra);
    if (servico.atividadeEvento) this.buildAtividadeEvento(serv, servico.atividadeEvento);
    if (servico.exploracaoRodoviaria) this.buildExploracaoRodoviaria(serv, servico.exploracaoRodoviaria);
    if (servico.informacoesComplementares) this.buildInformacoesComplementares(serv, servico.informacoesComplementares);
  }

  private buildComercioExterior(builder: XMLElement, comExt: ComercioExterior): void {
    const comExtNode = builder.ele('comExt');
    comExtNode.ele('mdPrestacao').txt(comExt.modoPrestacao);
    comExtNode.ele('vincPrest').txt(comExt.vinculoPrestador);
    comExtNode.ele('tpMoeda').txt(comExt.tipoMoeda);
    comExtNode.ele('vServMoeda').txt(comExt.valorServicoMoeda.toFixed(2));
    if (comExt.mecanismoApoioComexPrestador) comExtNode.ele('mecAFComexP').txt(comExt.mecanismoApoioComexPrestador);
    if (comExt.mecanismoApoioComexTomador) comExtNode.ele('mecAFComexT').txt(comExt.mecanismoApoioComexTomador);
    if (comExt.movimentacaoTemporariaBens) comExtNode.ele('movTempBens').txt(comExt.movimentacaoTemporariaBens);
    if (comExt.numeroDI) comExtNode.ele('nDI').txt(comExt.numeroDI);
    if (comExt.numeroRE) comExtNode.ele('nRE').txt(comExt.numeroRE);
    comExtNode.ele('mdic').txt(comExt.enviarParaMDIC);
  }

  private buildLocacaoSublocacao(builder: XMLElement, locSub: LocacaoSublocacao): void {
    const lsadppu = builder.ele('lsadppu');
    lsadppu.ele('categ').txt(locSub.categoria);
    lsadppu.ele('objeto').txt(locSub.objeto);
    lsadppu.ele('extensao').txt(locSub.extensao.toString());
    lsadppu.ele('nPostes').txt(locSub.numeroPostes.toString());
  }

  private buildObra(builder: XMLElement, obra: Obra): void {
    const obraNode = builder.ele('obra');
    if ('codigoObra' in obra.tipo) obraNode.ele('cObra').txt(obra.tipo.codigoObra);
    if ('inscricaoImobiliaria' in obra.tipo) obraNode.ele('inscImobFisc').txt(obra.tipo.inscricaoImobiliaria);
    if ('endereco' in obra.tipo) this.buildEndereco(obraNode.ele('end'), obra.tipo.endereco, true);
  }

  private buildAtividadeEvento(builder: XMLElement, atvEvento: AtividadeEvento): void {
    const atvEventoNode = builder.ele('atvEvento');
    atvEventoNode.ele('desc').txt(atvEvento.descricao);
    atvEventoNode.ele('dtIni').txt(atvEvento.dataInicio);
    atvEventoNode.ele('dtFim').txt(atvEvento.dataFim);
    if ('id' in atvEvento.identificacao) {
      atvEventoNode.ele('id').txt(atvEvento.identificacao.id);
    } else if ('endereco' in atvEvento.identificacao) {
      this.buildEndereco(atvEventoNode.ele('end'), atvEvento.identificacao.endereco, true);
    }
  }

  private buildExploracaoRodoviaria(builder: XMLElement, explRod: ExploracaoRodoviaria): void {
    const explRodNode = builder.ele('explRod');
    explRodNode.ele('categVeic').txt(explRod.categoriaVeiculo);
    explRodNode.ele('nEixos').txt(explRod.numeroEixos.toString());
    explRodNode.ele('rodagem').txt(explRod.rodagem);
    explRodNode.ele('sentido').txt(explRod.sentido);
    explRodNode.ele('placa').txt(explRod.placa);
    explRodNode.ele('codAcessoPed').txt(explRod.codAcessoPedagio);
    explRodNode.ele('codContrato').txt(explRod.codContrato);
  }

  private buildInformacoesComplementares(builder: XMLElement, infoCompl: InformacoesComplementares): void {
    const infoComplNode = builder.ele('infoCompl');
    if (infoCompl.idDocTecnico) infoComplNode.ele('idDocTec').txt(infoCompl.idDocTecnico);
    if (infoCompl.docReferenciado) infoComplNode.ele('docRef').txt(infoCompl.docReferenciado);
    if (infoCompl.infoAdicional) infoComplNode.ele('xInfComp').txt(infoCompl.infoAdicional);
  }

  private buildValores(builder: XMLElement, valores: NfsInputDto['valores']): void {
    const valoresNode = builder.ele('valores');
    
    const vServPrest = valoresNode.ele('vServPrest');
    if (valores.valorRecebidoIntermediario != null) {
      vServPrest.ele('vReceb').txt(valores.valorRecebidoIntermediario.toFixed(2));
    }
    vServPrest.ele('vServ').txt(valores.valorServico.toFixed(2));

    if (valores.descontoCondicionado != null || valores.descontoIncondicionado != null) {
      const vDesc = valoresNode.ele('vDescCondIncond');
      if (valores.descontoIncondicionado != null) vDesc.ele('vDescIncond').txt(valores.descontoIncondicionado.toFixed(2));
      if (valores.descontoCondicionado != null) vDesc.ele('vDescCond').txt(valores.descontoCondicionado.toFixed(2));
    }

    if (valores.deducaoReducao) {
      this.buildDeducaoReducao(valoresNode, valores.deducaoReducao);
    }

    const trib = valoresNode.ele('trib');
    this.buildTribMun(trib, valores.iss);
    if (valores.tributosFederais) {
      this.buildTribFed(trib, valores.tributosFederais);
    }
    if (valores.totaisTributos) {
      this.buildTotTrib(trib, valores.totaisTributos);
    }
  }

  private buildDeducaoReducao(builder: XMLElement, deducaoReducao: DeducaoReducao): void {
    const vDedRed = builder.ele('vDedRed');
    if ('percentual' in deducaoReducao.tipo) vDedRed.ele('pDR').txt(deducaoReducao.tipo.percentual.toFixed(2));
    if ('valor' in deducaoReducao.tipo) vDedRed.ele('vDR').txt(deducaoReducao.tipo.valor.toFixed(2));
    if ('documentos' in deducaoReducao.tipo) {
      const docs = vDedRed.ele('documentos');
      deducaoReducao.tipo.documentos.forEach(doc => this.buildDocDedRed(docs, doc));
    }
  }

  private buildDocDedRed(builder: XMLElement, doc: DocumentoDeducao): void {
    const docDedRed = builder.ele('docDedRed');
    if ('chaveNfse' in doc.tipoDoc) docDedRed.ele('chNFSe').txt(doc.tipoDoc.chaveNfse);
    else if ('chaveNfe' in doc.tipoDoc) docDedRed.ele('chNFe').txt(doc.tipoDoc.chaveNfe);
    else if ('nfseMunicipal' in doc.tipoDoc) {
      const nfseMun = docDedRed.ele('NFSeMun');
      nfseMun.ele('cMunNFSeMun').txt(doc.tipoDoc.nfseMunicipal.codMun);
      nfseMun.ele('nNFSeMun').txt(doc.tipoDoc.nfseMunicipal.numero);
      nfseMun.ele('cVerifNFSeMun').txt(doc.tipoDoc.nfseMunicipal.codVerificacao);
    } else if ('nfnfs' in doc.tipoDoc) {
      const nfnfs = docDedRed.ele('NFNFS');
      nfnfs.ele('nNFS').txt(doc.tipoDoc.nfnfs.numero);
      nfnfs.ele('modNFS').txt(doc.tipoDoc.nfnfs.modelo);
      nfnfs.ele('serieNFS').txt(doc.tipoDoc.nfnfs.serie);
    } else if ('numDocFiscal' in doc.tipoDoc) {
      docDedRed.ele('nDocFisc').txt(doc.tipoDoc.numDocFiscal);
    } else if ('numDocNaoFiscal' in doc.tipoDoc) {
      docDedRed.ele('nDoc').txt(doc.tipoDoc.numDocNaoFiscal);
    }

    docDedRed.ele('tpDedRed').txt(doc.tipoDeducao);
    if (doc.descricaoOutraDeducao) docDedRed.ele('xDescOutDed').txt(doc.descricaoOutraDeducao);
    docDedRed.ele('dtEmiDoc').txt(doc.dataEmissao);
    docDedRed.ele('vDedutivelRedutivel').txt(doc.valorDedutivel.toFixed(2));
    docDedRed.ele('vDeducaoReducao').txt(doc.valorDeducao.toFixed(2));

    if (doc.fornecedor) {
      const fornec = docDedRed.ele('fornec');
      this.buildIdentificacao(fornec, doc.fornecedor.identificacao);
      fornec.ele('xNome').txt(doc.fornecedor.razaoSocial);
    }
  }

  private buildTribMun(builder: XMLElement, iss: NfsInputDto['valores']['iss']): void {
    const tribMun = builder.ele('tribMun');
    tribMun.ele('tribISSQN').txt(iss.tributacao);
    if (iss.codigoPaisResultado) tribMun.ele('cPaisResult').txt(iss.codigoPaisResultado);
    if (iss.beneficioMunicipal) this.buildBeneficioMunicipal(tribMun, iss.beneficioMunicipal);
    if (iss.exigibilidadeSuspensa) this.buildExigibilidadeSuspensa(tribMun, iss.exigibilidadeSuspensa);
    if (iss.tipoImunidade) tribMun.ele('tpImunidade').txt(iss.tipoImunidade);
    if (iss.aliquota != null) tribMun.ele('pAliq').txt(iss.aliquota.toFixed(2));
    tribMun.ele('tpRetISSQN').txt(iss.retencao);
  }

  private buildBeneficioMunicipal(builder: XMLElement, bm: BeneficioMunicipal): void {
    const bmNode = builder.ele('BM');
    bmNode.ele('tpBM').txt(bm.tipo);
    bmNode.ele('nBM').txt(bm.numero);
    if (bm.reducao) {
      if ('valor' in bm.reducao) bmNode.ele('vRedBCBM').txt(bm.reducao.valor.toFixed(2));
      if ('percentual' in bm.reducao) bmNode.ele('pRedBCBM').txt(bm.reducao.percentual.toFixed(2));
    }
  }

  private buildExigibilidadeSuspensa(builder: XMLElement, exigSusp: ExigibilidadeSuspensa): void {
    const exigSuspNode = builder.ele('exigSusp');
    exigSuspNode.ele('tpSusp').txt(exigSusp.tipo);
    exigSuspNode.ele('nProcesso').txt(exigSusp.numeroProcesso);
  }

  private buildTribFed(builder: XMLElement, tribFed: TributosFederais): void {
    const tribFedNode = builder.ele('tribFed');
    if (tribFed.piscofins) {
      const pisCofins = tribFedNode.ele('piscofins');
      pisCofins.ele('CST').txt(tribFed.piscofins.cst);
      if (tribFed.piscofins.valorBC != null) pisCofins.ele('vBCPisCofins').txt(tribFed.piscofins.valorBC.toFixed(2));
      if (tribFed.piscofins.aliquotaPis != null) pisCofins.ele('pAliqPis').txt(tribFed.piscofins.aliquotaPis.toFixed(2));
      if (tribFed.piscofins.aliquotaCofins != null) pisCofins.ele('pAliqCofins').txt(tribFed.piscofins.aliquotaCofins.toFixed(2));
      if (tribFed.piscofins.valorPis != null) pisCofins.ele('vPis').txt(tribFed.piscofins.valorPis.toFixed(2));
      if (tribFed.piscofins.valorCofins != null) pisCofins.ele('vCofins').txt(tribFed.piscofins.valorCofins.toFixed(2));
      if (tribFed.piscofins.retido) pisCofins.ele('tpRetPisCofins').txt(tribFed.piscofins.retido);
    }
    if (tribFed.valorRetidoCP != null) tribFedNode.ele('vRetCP').txt(tribFed.valorRetidoCP.toFixed(2));
    if (tribFed.valorRetidoIRRF != null) tribFedNode.ele('vRetIRRF').txt(tribFed.valorRetidoIRRF.toFixed(2));
    if (tribFed.valorRetidoCSLL != null) tribFedNode.ele('vRetCSLL').txt(tribFed.valorRetidoCSLL.toFixed(2));
  }

  private buildTotTrib(builder: XMLElement, totaisTributos: TotaisTributos): void {
    const totTrib = builder.ele('totTrib');
    if ('valorTotal' in totaisTributos) {
      const vTotTrib = totTrib.ele('vTotTrib');
      vTotTrib.ele('vTotTribFed').txt(totaisTributos.valorTotal.fed.toFixed(2));
      vTotTrib.ele('vTotTribEst').txt(totaisTributos.valorTotal.est.toFixed(2));
      vTotTrib.ele('vTotTribMun').txt(totaisTributos.valorTotal.mun.toFixed(2));
    } else if ('percentualTotal' in totaisTributos) {
      const pTotTrib = totTrib.ele('pTotTrib');
      pTotTrib.ele('pTotTribFed').txt(totaisTributos.percentualTotal.fed.toFixed(2));
      pTotTrib.ele('pTotTribEst').txt(totaisTributos.percentualTotal.est.toFixed(2));
      pTotTrib.ele('pTotTribMun').txt(totaisTributos.percentualTotal.mun.toFixed(2));
    } else if ('indicador' in totaisTributos) {
      totTrib.ele('indTotTrib').txt(totaisTributos.indicador);
    } else if ('percentualSN' in totaisTributos) {
      totTrib.ele('pTotTribSN').txt(totaisTributos.percentualSN.toFixed(2));
    }
  }
}