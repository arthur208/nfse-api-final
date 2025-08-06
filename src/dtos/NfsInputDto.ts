// src/dtos/NfsInputDto.ts
// Este DTO é uma representação completa da estrutura <infDPS> do arquivo tiposComplexos_v1.00.xsd.
// Todos os tipos e interfaces são exportados para uso em outros módulos.

// --- TIPOS E INTERFACES AUXILIARES ---

/**
 * Representa os tipos de documentos de identificação fiscal para qualquer pessoa (prestador, tomador, etc.).
 * Corresponde às tags <CNPJ>, <CPF>, <NIF> e <cNaoNIF>.
 */
export type DocumentoFiscal =
  | { cnpj: string }
  | { cpf: string }
  | { nif: string }
  | { cNaoNif: '0' | '1' | '2' };

/**
 * Representa um endereço, podendo ser nacional ou no exterior.
 * Corresponde ao complexType TCEndereco.
 */
export interface Endereco {
  logradouro: string;
  numero: string;
  bairro: string;
  complemento?: string;
  // Nacional
  codigoMunicipio?: string;
  uf?: string;
  cep?: string;
  // Exterior
  codigoPais?: string;
  codigoEndPostal?: string;
  cidade?: string;
  estadoProvinciaRegiao?: string;
}

/**
 * Representa informações de contato.
 * Corresponde às tags <fone> e <email>.
 */
export interface Contato {
  telefone?: string;
  email?: string;
}

/**
 * Dados da NFS-e a ser substituída.
 * Corresponde ao complexType TCSubstituicao.
 */
export interface Substituicao {
  chaveAcessoSubstituida: string;
  codigoMotivo: '01' | '02' | '03' | '04' | '05' | '99';
  motivo?: string;
}

/**
 * Informações de comércio exterior.
 * Corresponde ao complexType TCComExterior.
 */
export interface ComercioExterior {
  modoPrestacao: '0' | '1' | '2' | '3' | '4';
  vinculoPrestador: '0' | '1' | '2' | '3' | '4' | '5' | '6';
  tipoMoeda: string;
  valorServicoMoeda: number;
  mecanismoApoioComexPrestador?: string;
  mecanismoApoioComexTomador?: string;
  movimentacaoTemporariaBens?: '0' | '1' | '2' | '3';
  numeroDI?: string;
  numeroRE?: string;
  enviarParaMDIC: '0' | '1';
}

/**
 * Informações para atividades de locação, sublocação, arrendamento, etc.
 * Corresponde ao complexType TCLocacaoSublocacao.
 */
export interface LocacaoSublocacao {
    categoria: '1' | '2' | '3' | '4' | '5';
    objeto: '1' | '2' | '3' | '4' | '5' | '6';
    extensao: number;
    numeroPostes: number;
}

/**
 * Informações de serviço de obra.
 * Corresponde ao complexType TCInfoObra.
 */
export interface Obra {
  tipo: { codigoObra: string } | { inscricaoImobiliaria: string } | { endereco: Endereco };
}

/**
 * Informações de serviço relacionado a eventos.
 * Corresponde ao complexType TCAtvEvento.
 */
export interface AtividadeEvento {
    descricao: string;
    dataInicio: string; // AAAA-MM-DD
    dataFim: string; // AAAA-MM-DD
    identificacao: { id: string } | { endereco: Endereco };
}

/**
 * Informações de pedágio.
 * Corresponde ao complexType TCExploracaoRodoviaria.
 */
export interface ExploracaoRodoviaria {
    categoriaVeiculo: '00' | '01' | '02' | '03' | '04' | '05' | '06' | '07' | '08' | '09' | '10' | '11';
    numeroEixos: number;
    rodagem: '1' | '2';
    sentido: string;
    placa: string;
    codAcessoPedagio: string;
    codContrato: string;
}

/**
 * Informações complementares sobre o serviço.
 * Corresponde ao complexType TCInfoCompl.
 */
export interface InformacoesComplementares {
    idDocTecnico?: string;
    docReferenciado?: string;
    infoAdicional?: string;
}

/**
 * Detalhes de um documento usado para dedução.
 * Corresponde ao complexType TCDocDedRed.
 */
export interface DocumentoDeducao {
  tipoDoc:
    | { chaveNfse: string }
    | { chaveNfe: string }
    | { nfseMunicipal: { codMun: string; numero: string; codVerificacao: string } }
    | { nfnfs: { numero: string; modelo: string; serie: string } }
    | { numDocFiscal: string }
    | { numDocNaoFiscal: string };
  tipoDeducao: '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '99';
  descricaoOutraDeducao?: string;
  dataEmissao: string; // AAAA-MM-DD
  valorDedutivel: number;
  valorDeducao: number;
  fornecedor?: {
    identificacao: DocumentoFiscal;
    razaoSocial: string;
  };
}

/**
 * Informações para dedução/redução da base de cálculo.
 * Corresponde ao complexType TCInfoDedRed.
 */
export interface DeducaoReducao {
  tipo: { percentual: number } | { valor: number } | { documentos: DocumentoDeducao[] };
}

/**
 * Informações de benefício fiscal municipal.
 * Corresponde ao complexType TCBeneficioMunicipal.
 */
export interface BeneficioMunicipal {
    tipo: '1' | '2' | '3';
    numero: string;
    reducao?: { valor: number } | { percentual: number };
}

/**
 * Informações de suspensão da exigibilidade do ISSQN.
 * Corresponde ao complexType TCExigSuspensa.
 */
export interface ExigibilidadeSuspensa {
    tipo: '1' | '2';
    numeroProcesso: string;
}

/**
 * Informações sobre tributos federais (PIS, COFINS, etc.).
 * Corresponde ao complexType TCTribFederal.
 */
export interface TributosFederais {
  piscofins?: {
    cst: '00' | '01' | '02' | '03' | '04' | '05' | '06' | '07' | '08' | '09';
    valorBC?: number;
    aliquotaPis?: number;
    aliquotaCofins?: number;
    valorPis?: number;
    valorCofins?: number;
    retido?: '1' | '2';
  };
  valorRetidoCP?: number;
  valorRetidoIRRF?: number;
  valorRetidoCSLL?: number;
}

/**
 * Totais aproximados de tributos (Lei da Transparência).
 * Corresponde ao complexType TCTribTotal.
 */
export type TotaisTributos =
  | { valorTotal: { fed: number; est: number; mun: number } }
  | { percentualTotal: { fed: number; est: number; mun: number } }
  | { indicador: '0' }
  | { percentualSN: number };


// --- ESTRUTURA PRINCIPAL DE ENTRADA (TOTALMENTE COMPLETA) ---

/**
 * Representa o corpo da requisição para emissão de uma DPS.
 * Esta classe é um mapeamento direto e completo do complexType TCInfDPS do XSD oficial.
 */
export class NfsInputDto {
  /** Identificação do Ambiente: 1 - Produção; 2 - Homologação. */
  ambiente?: '1' | '2';

  /** Informações básicas e obrigatórias da DPS. */
  dps!: {
    /** Série do DPS ou número do equipamento emissor. */
    serie: string;
    /** Número do DPS. */
    numero: number;
    /** Data da competência do serviço (formato "AAAA-MM-DD"). */
    dataCompetencia: string;
  };

  /** (Opcional) Dados da NFS-e a ser substituída. */
  substituicao?: Substituicao;

  /** Informações do Prestador de Serviços. */
  prestador!: {
    /** Identificação fiscal do prestador (CNPJ, CPF, NIF ou cNaoNIF). */
    identificacao: DocumentoFiscal;
    /** Código IBGE do município do prestador. */
    codigoMunicipio: string;
    /** (Opcional) Inscrição Municipal. */
    inscricaoMunicipal?: string;
    /** (Opcional) Razão Social. */
    razaoSocial?: string;
    /** (Opcional) Nome Fantasia. */
    nomeFantasia?: string;
    /** (Opcional) Cadastro de Atividade Econômica da Pessoa Física. */
    caepf?: string;
    /** (Opcional) Endereço completo do prestador. */
    endereco?: Endereco;
    /** (Opcional) Informações de contato do prestador. */
    contato?: Contato;
    /** Regimes de tributação do prestador. */
    regimeTributacao: {
      /** Situação perante o Simples Nacional. */
      opcaoSimplesNacional: '1' | '2' | '3';
      /** (Opcional) Regime de apuração para optantes do Simples Nacional. */
      regimeApuracaoSN?: '1' | '2' | '3';
      /** Regime Especial de Tributação. */
      regimeEspecial: '0' | '1' | '2' | '3' | '4' | '5' | '6';
    };
  };

  /** (Opcional) Informações do Tomador de Serviços. */
  tomador?: {
    /** Identificação fiscal do tomador. */
    identificacao: DocumentoFiscal;
    /** Nome ou Razão Social do tomador. */
    razaoSocial: string;
    /** (Opcional) Inscrição Municipal. */
    inscricaoMunicipal?: string;
    /** (Opcional) Endereço completo do tomador. */
    endereco?: Endereco;
    /** (Opcional) Informações de contato do tomador. */
    contato?: Contato;
  };
  
  /** (Opcional) Informações do Intermediário de Serviços. */
  intermediario?: {
    /** Identificação fiscal do intermediário. */
    identificacao: DocumentoFiscal;
    /** Nome ou Razão Social do intermediário. */
    razaoSocial: string;
    /** (Opcional) Inscrição Municipal. */
    inscricaoMunicipal?: string;
  };

  /** Informações do Serviço Prestado. */
  servico!: {
    /** Código de tributação nacional (padrão LC 116/2003). */
    itemListaServico: string;
    /** (Opcional) Código de tributação específico do município. */
    codigoTributacaoMunicipio?: string;
    /** Descrição completa do serviço prestado. */
    discriminacao: string;
    /** (Opcional) Código IBGE do município onde o serviço foi prestado. */
    codigoMunicipioPrestacao?: string;
    /** (Opcional) Código ISO do país onde o serviço foi prestado. */
    codigoPaisPrestacao?: string;
    /** (Opcional) Onde ocorreu o consumo do serviço (0 - No município; 1 - No exterior). */
    consumoServicoOcorrido?: '0' | '1';
    /** (Opcional) Código NBS. */
    codigoNBS?: string;
    /** (Opcional) Código interno do contribuinte para o serviço. */
    codigoInternoContribuinte?: string;
    /** (Opcional) Bloco para informações de comércio exterior. */
    comercioExterior?: ComercioExterior;
    /** (Opcional) Bloco para atividades de locação, sublocação, etc. */
    locacaoSublocacao?: LocacaoSublocacao;
    /** (Opcional) Bloco para informações de serviço de obra. */
    obra?: Obra;
    /** (Opcional) Bloco para informações de serviço relacionado a eventos. */
    atividadeEvento?: AtividadeEvento;
    /** (Opcional) Bloco para informações de pedágio. */
    exploracaoRodoviaria?: ExploracaoRodoviaria;
    /** (Opcional) Bloco com informações complementares sobre o serviço. */
    informacoesComplementares?: InformacoesComplementares;
  };
  
  /** Informações de valores e tributos do serviço. */
  valores!: {
    /** Valor total do serviço. */
    valorServico: number;
    /** (Opcional) Valor recebido pelo intermediário do serviço. */
    valorRecebidoIntermediario?: number;
    /** (Opcional) Valor do desconto condicionado. */
    descontoCondicionado?: number;
    /** (Opcional) Valor do desconto incondicionado. */
    descontoIncondicionado?: number;
    /** (Opcional) Bloco para detalhar deduções e reduções da base de cálculo. */
    deducaoReducao?: DeducaoReducao;
    /** Informações sobre o ISSQN. */
    iss: {
      /** Tributação do ISSQN sobre o serviço. */
      tributacao: '1' | '2' | '3' | '4';
      /** (Opcional) Código do país do resultado do serviço (para exportação). */
      codigoPaisResultado?: string;
      /** (Opcional) Bloco para detalhar Benefício Municipal. */
      beneficioMunicipal?: BeneficioMunicipal;
      /** (Opcional) Informações sobre suspensão da exigibilidade do ISSQN. */
      exigibilidadeSuspensa?: ExigibilidadeSuspensa;
      /** (Opcional) Tipo de imunidade do ISSQN. */
      tipoImunidade?: '0' | '1' | '2' | '3' | '4';
      /** (Opcional) Percentual da alíquota do ISSQN. */
      aliquota?: number;
      /** Tipo de retenção do ISSQN. */
      retencao: '1' | '2' | '3';
    };
    /** (Opcional) Bloco para tributos federais (PIS, COFINS e outras retenções). */
    tributosFederais?: TributosFederais;
    /** (Opcional) Totais aproximados de tributos (Lei da Transparência). */
    totaisTributos?: TotaisTributos;
  };
}
