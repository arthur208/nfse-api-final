// src/config/environments.ts

interface EnvironmentConfig {
  baseUrl: string;
}

export const environments = {
  producao: {
    baseUrl: 'https://sefin.nfse.gov.br/sefinnacional',
  },
  homologacao: {
    baseUrl: 'https://sefin.producaorestrita.nfse.gov.br/SefinNacional',
  },
};

export type Ambiente = keyof typeof environments; // "producao" | "homologacao"