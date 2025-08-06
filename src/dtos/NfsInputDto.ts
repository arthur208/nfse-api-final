// src/dtos/NfsInputDto.ts
export class NfsInputDto {
  dps!: {
    serie: string;
    numero: number;
    dataCompetencia: string; // Formato "AAAA-MM-DD"
  };
  prestador!: {
    cnpj: string;
    codigoMunicipio: string; // Código IBGE (7 dígitos)
  };
  tomador!: {
    documento: string; // CPF ou CNPJ
    razaoSocial: string;
    endereco: {
      logradouro: string;
      numero: string;
      bairro: string;
      codigoMunicipio: string; // Código IBGE (7 dígitos)
      cep: string;
    };
  };
  servico!: {
    itemListaServico: string; // Ex: "010201" (sem pontos)
    discriminacao: string;
    codigoMunicipioPrestacao: string; // Código IBGE (7 dígitos)
    valor: number;
  };
}