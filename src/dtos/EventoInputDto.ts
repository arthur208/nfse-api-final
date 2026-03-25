// src/dtos/EventoInputDto.ts

export type TipoEvento =
  | 'cancelamento'
  | 'cancelamentoPorSubstituicao'
  | 'confirmacaoPrestador'
  | 'rejeicaoPrestador';

export interface EventoInputDto {
  /** '1' = Produção, '2' = Homologação */
  ambiente: '1' | '2';
  
  /** Chave de acesso da NFS-e alvo (50 caracteres) */
  chaveAcesso: string;

  /** CNPJ do autor do evento (prestador). Apenas dígitos. */
  cnpjAutor: string;

  /** Tipo do evento a ser registrado */
  tipoEvento: TipoEvento;

  /**
   * Código do motivo.
   * Para cancelamento: 1=Errado, 2=Duplicidade, 3=NãoRealizado, 9=Outros
   * Para cancelamento por substituição: 1=Substituição
   * Para rejeição: 1=Duplicidade, 2=EmitidoPeloTomador, 3=NãoOcorreu, 4=BeneficioTributario, 5=ErroValor, 9=Outros
   */
  codigoMotivo: string;

  /** Descrição textual do motivo (obrigatório para cancelamento, rejeição) */
  descricaoMotivo?: string;

  /** Chave de acesso da NFS-e substituta (obrigatório para cancelamentoPorSubstituicao) */
  chaveSubstituta?: string;
}
