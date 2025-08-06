// src/dtos/NfsInputDto.ts

// --- TIPOS AUXILIARES PARA REUTILIZAÇÃO ---
interface Endereco {
  logradouro: string;
  numero: string;
  bairro: string;
  codigoMunicipio: string; // Código IBGE (7 dígitos)
  uf: string;
  cep: string;
  complemento?: string;
  codigoPais?: string;
  descricaoPais?: string;
}

interface Contato {
  telefone?: string;
  email?: string;
}

// --- ESTRUTURA PRINCIPAL DE ENTRADA (MAIS COMPLETA) ---
export class NfsInputDto {
  ambiente?: '1' | '2'; // 1=Produção, 2=Homologação. Opcional, padrão será 2.
  // --- DADOS DA DPS (OBRIGATÓRIO) ---
  dps!: {
    serie: string;
    numero: number;
    dataCompetencia: string; // Formato "AAAA-MM-DD"
  };

  // --- DADOS DO PRESTADOR (OBRIGATÓRIO) ---
  prestador!: {
    cnpj: string;
    codigoMunicipio: string; // Código IBGE do município do PRESTADOR (7 dígitos)
    inscricaoMunicipal?: string;
    razaoSocial?: string;
  };

  // --- DADOS DO TOMADOR (OBRIGATÓRIO) ---
  tomador!: {
    documento: string; // CPF ou CNPJ
    razaoSocial: string;
    endereco: Endereco;
    nomeFantasia?: string;
    contato?: Contato;
  };
  
  // --- DADOS DO INTERMEDIÁRIO (OPCIONAL) ---
  intermediario?: {
    documento: string; // CPF ou CNPJ
    razaoSocial: string;
    inscricaoMunicipal?: string;
  };

  // --- DADOS DO SERVIÇO (OBRIGATÓRIO) ---
  servico!: {
    itemListaServico: string; // Ex: "01.07"
    codigoTributacaoMunicipio?: string; // Código de tributação específico do município
    discriminacao: string;
    codigoMunicipioPrestacao: string; // Município onde o serviço foi prestado (7 dígitos)
    valor: number;
  };
  
  // --- VALORES E IMPOSTOS (OPCIONAL) ---
  valores?: {
    valorDeducoes?: number;
    valorPis?: number;
    valorCofins?: number;
    valorInss?: number;
    valorIr?: number;
    valorCsll?: number;
    descontoCondicionado?: number;
    descontoIncondicionado?: number;
    outrasRetencoes?: number;
    iss?: {
      aliquota: number;
      valor: number;
      retido: boolean; // true para ISS retido, false para não
    }
  };
}