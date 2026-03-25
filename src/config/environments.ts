// src/config/environments.ts

interface EnvironmentConfig {
  baseUrl: string;
  danfseUrl: string;
}

export const environments: Record<string, EnvironmentConfig> = {
  producao: {
    baseUrl: 'https://sefin.nfse.gov.br/sefinnacional',
    danfseUrl: 'https://adn.nfse.gov.br/danfse',
  },
  homologacao: {
    baseUrl: 'https://sefin.producaorestrita.nfse.gov.br/SefinNacional',
    danfseUrl: 'https://adn.producaorestrita.nfse.gov.br/danfse',
  },
};

export type Ambiente = keyof typeof environments;