// src/controllers/NfseController.ts
import { Request, Response } from 'express';
import { NfsInputDto } from '../dtos/NfsInputDto';
import { DpsService } from '../services/DpsService';
import { GovApiService } from '../services/GovApiService';
import { XmlSigningService } from '../services/XmlSigningService';
import { environments } from '../config/environments';
import pem from 'pem';
import zlib from 'zlib';
import axios from 'axios';

// Função auxiliar para processar o certificado dinamicamente a partir dos headers
async function processCertificateFromHeaders(req: Request): Promise<{ key: string, cert: string, pfxBuffer: Buffer, pfxPassword: string }> {
  const pfxBase64 = req.headers['x-pfx-base64'] as string;
  const pfxPassword = req.headers['x-pfx-password'] as string;

  if (!pfxBase64 || !pfxPassword) {
    throw { status: 401, message: "Os cabeçalhos 'x-pfx-base64' e 'x-pfx-password' são obrigatórios." };
  }

  const pfxBuffer = Buffer.from(pfxBase64, 'base64');

  return new Promise((resolve, reject) => {
    pem.readPkcs12(pfxBuffer, { p12Password: pfxPassword }, (err, cert) => {
      if (err || !cert || !cert.key) {
        return reject({ status: 401, message: "Falha ao processar o certificado PFX. Verifique se os dados e a senha estão corretos.", details: err?.message });
      }
      resolve({ key: cert.key, cert: cert.cert, pfxBuffer, pfxPassword });
    });
  });
}

export class NfseController {
  constructor(
    private dpsService: DpsService,
    private signingService: XmlSigningService
  ) {}
  
  public emitir = async (req: Request, res: Response): Promise<Response> => {
    try {
      const { key, cert, pfxBuffer, pfxPassword } = await processCertificateFromHeaders(req);
      
      const inputData: NfsInputDto = req.body;
      const ambiente = inputData.ambiente === '1' ? 'producao' : 'homologacao';
      console.log(`[CONTROLLER] >> Emissão iniciada para o ambiente: ${ambiente.toUpperCase()}`);

      const unsignedXml = this.dpsService.buildUnsignedXml(inputData, inputData.ambiente || '2');
      const signedXml = this.signingService.signXml(unsignedXml, key, cert);
      
      const baseUrl = environments[ambiente].baseUrl;
      const govApiService = new GovApiService();
      govApiService.initialize(pfxBuffer, pfxPassword, baseUrl);
      
      const govResponse = await govApiService.emitirNfse(signedXml);
      return res.status(201).json({ status: 'NFS-e emitida com sucesso!', ...govResponse });

    } catch (error: any) {
      console.error('\n--- [CONTROLLER] ERRO NA EMISSÃO ---', error);
      return res.status(error.status || 500).json({
        message: 'Ocorreu um erro ao processar a emissão.',
        details: error.details || error.message,
      });
    }
  };

  public consultar = async (req: Request, res: Response): Promise<Response> => {
    const { chaveAcesso } = req.params;
    if (!chaveAcesso || chaveAcesso.length !== 50) {
      return res.status(400).json({ message: 'A chave de acesso é obrigatória e deve conter 50 caracteres.' });
    }

    try {
      const { pfxBuffer, pfxPassword } = await processCertificateFromHeaders(req);
      console.log(`[CONTROLLER] >> Iniciando consulta de NFS-e para a chave: ${chaveAcesso}`);
      console.log('--- Tentando no ambiente de PRODUÇÃO...');
      
      const govApiServiceProd = new GovApiService();
      govApiServiceProd.initialize(pfxBuffer, pfxPassword, environments.producao.baseUrl);
      
      const resultado = await govApiServiceProd.consultarNfse(chaveAcesso);
      console.log('[CONTROLLER] << Consulta em PRODUÇÃO realizada com sucesso.');
      return res.status(200).json(resultado);

    } catch (errorProd: any) {
      if (errorProd.status === 404) {
        console.log('--- NFS-e não encontrada em PRODUÇÃO. Tentando no ambiente de HOMOLOGAÇÃO...');
        try {
          const { pfxBuffer, pfxPassword } = await processCertificateFromHeaders(req);
          
          const govApiServiceHomol = new GovApiService();
          govApiServiceHomol.initialize(pfxBuffer, pfxPassword, environments.homologacao.baseUrl);
          
          const resultadoHomol = await govApiServiceHomol.consultarNfse(chaveAcesso);
          console.log('[CONTROLLER] << Consulta em HOMOLOGAÇÃO realizada com sucesso.');
          return res.status(200).json(resultadoHomol);
        } catch (errorHomol: any) {
          console.error('\n--- [CONTROLLER] ERRO NA CONSULTA (HOMOLOGAÇÃO) ---', errorHomol);
          return res.status(errorHomol.status || 500).json({ message: 'Erro ao consultar em homologação.', details: errorHomol.details });
        }
      }
      console.error('\n--- [CONTROLLER] ERRO NA CONSULTA (PRODUÇÃO) ---', errorProd);
      return res.status(errorProd.status || 500).json({ message: 'Erro ao consultar em produção.', details: errorProd.details });
    }
  };

  public consultarDanfse = async (req: Request, res: Response): Promise<void> => {
    const { chaveAcesso } = req.params;
    if (!chaveAcesso || chaveAcesso.length !== 50) {
      res.status(400).json({ message: 'A chave de acesso é obrigatória e deve conter 50 caracteres.' });
      return;
    }
    
    let resultado: { data: Buffer, headers: any } | null = null;
    try {
      const { pfxBuffer, pfxPassword } = await processCertificateFromHeaders(req);
      console.log(`[CONTROLLER] >> Iniciando consulta do DANFSe para a chave: ${chaveAcesso}`);
      console.log('--- Tentando DANFSe no ambiente de PRODUÇÃO...');

      const govApiServiceProd = new GovApiService();
      govApiServiceProd.initialize(pfxBuffer, pfxPassword, environments.producao.baseUrl);
      resultado = await govApiServiceProd.consultarDanfse(chaveAcesso);

    } catch (errorProd: any) {
      if (errorProd.status === 404) {
        console.log('--- DANFSe não encontrado em PRODUÇÃO. Tentando no ambiente de HOMOLOGAÇÃO...');
        try {
          const { pfxBuffer, pfxPassword } = await processCertificateFromHeaders(req);
          
          const govApiServiceHomol = new GovApiService();
          govApiServiceHomol.initialize(pfxBuffer, pfxPassword, environments.homologacao.baseUrl);
          resultado = await govApiServiceHomol.consultarDanfse(chaveAcesso);
        } catch (errorHomol: any) {
          res.status(errorHomol.status || 500).json({ message: 'Erro ao consultar DANFSe em homologação.', details: errorHomol.details });
          return;
        }
      } else {
        res.status(errorProd.status || 500).json({ message: 'Erro ao consultar DANFSe em produção.', details: errorProd.details });
        return;
      }
    }

    if (resultado) {
      console.log('[CONTROLLER] << DANFSe encontrado. Retransmitindo o PDF...');
      res.setHeader('Content-Type', resultado.headers['content-type'] || 'application/pdf');
      if(resultado.headers['content-disposition']) res.setHeader('Content-Disposition', resultado.headers['content-disposition']);
      if(resultado.headers['content-length']) res.setHeader('Content-Length', resultado.headers['content-length']);
      res.send(resultado.data);
    } else {
      res.status(404).json({ message: 'DANFSe não encontrado para a chave de acesso informada.' });
    }
  };
}