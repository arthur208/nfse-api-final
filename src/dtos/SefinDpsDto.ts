// src/dtos/SefinDpsDto.ts
export interface DPS {
  infDPS: InfDPS;
}
export interface InfDPS {
  '@Id': string;
  tpAmb: '2';
  dhEmi: string;
  verAplic: string;
  serie: string;
  nDPS: number;
  dCompet: string;
  tpEmit: '1';
  cLocEmi: string;
  prest: {
    CNPJ: string;
    regTrib: { opSimpNac: '2'; regEspTrib: '0' };
  };
  toma: {
    CNPJ?: string;
    CPF?: string;
    xNome: string;
    end: {
      endNac: { cMun: string; CEP: string };
      xLgr: string;
      nro: string;
      xBairro: string;
    };
  };
  serv: {
    locPrest: { cLocPrestacao: string };
    cServ: { cTribNac: string; xDescServ: string };
  };
  valores: {
    vServPrest: { vServ: string };
    trib: {
      tribMun: { tribISSQN: '1'; tpRetISSQN: '1' };
      totTrib: { pTotTrib: { pTotTribFed: string; pTotTribEst: string; pTotTribMun: string } };
    };
  };
}