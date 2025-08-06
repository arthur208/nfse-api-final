// src/dtos/SefinDpsDto.ts

// Esta interface agora reflete a estrutura mais completa do XML
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
    IM?: string;
    xNome?: string;
  };

  toma: {
    CNPJ?: string;
    CPF?: string;
    IM?: string;
    xNome: string;
    nFant?: string;
    endNac?: { // Endereço Nacional
      xLgr: string;
      nro: string;
      xCpl?: string;
      xBairro: string;
      cMun: string;
      UF: string;
      CEP: string;
    };
    endExt?: { // Endereço no Exterior
      cPais: string;
      xPais: string;
      xEnd: string; // Endereço completo em texto
    }
    fone?: string;
    email?: string;
  };

  interm?: {
    CNPJ?: string;
    CPF?: string;
    IM?: string;
    xNome: string;
  };

  serv: {
    locPrest: { cLocPrestacao: string };
    cServ: {
      cTribNac: string;
      cTribMun?: string;
    };
    dscServ: string;
  };

  valores: {
    vServ: string;
    vDescIncond?: string;
    vDescCond?: string;
    vDed?: string;
    retTrib?: {
      vRetPIS?: string;
      vRetCOFINS?: string;
      vRetINSS?: string;
      vRetIR?: string;
      vRetCSLL?: string;
      vOutrasRet?: string;
    };
    tribISSQN?: {
      vBC: string;
      pAliq: string;
      vISSRet?: string;
      vISS: string;
      cSitTrib: string;
    }
  };
}