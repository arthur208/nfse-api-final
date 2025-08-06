// src/controllers/NfseController.ts
import { Request, Response } from 'express';
import { NfsInputDto } from '../dtos/NfsInputDto';
import { DpsService } from '../services/DpsService';
import { GovApiService } from '../services/GovApiService';
import { XmlSigningService } from '../services/XmlSigningService';
import zlib from 'zlib';
import fs from 'fs';
// Importe as configurações no início do arquivo
import { environments } from '../config/environments';

export class NfseController {
  constructor(
    private dpsService: DpsService,
    private signingService: XmlSigningService,
    private privateKeyPem: string,
    private certificatePem: string,
    private pfxPath: string,
    private pfxPassword: string
  ) {}
  
  // MÉTODO EMITIR (VERSÃO CORRIGIDA)
  public emitir = async (req: Request, res: Response): Promise<Response> => {
    try {
      const inputData: NfsInputDto = req.body;
      
      // 1. Define o ambiente: usa o do input ou 'homologacao' como padrão.
      const ambiente = inputData.ambiente === '1' ? 'producao' : 'homologacao';
      console.log(`[CONTROLLER] >> Etapa 1: Emissão iniciada para o ambiente: ${ambiente.toUpperCase()}`);

      const unsignedXml = this.dpsService.buildUnsignedXml(inputData, inputData.ambiente || '2');
      
      console.log('[CONTROLLER] >> Etapa 2: Assinando o XML...');
      const signedXml = this.signingService.signXml(unsignedXml, this.privateKeyPem, this.certificatePem);
      
      // 2. Seleciona a URL correta do nosso arquivo de configuração
      const baseUrl = environments[ambiente].baseUrl;

      const pfxBuffer = fs.readFileSync(this.pfxPath);
      const govApiService = new GovApiService();
      
      // 3. Inicializa o serviço com a URL correta
      govApiService.initialize(pfxBuffer, this.pfxPassword, baseUrl);
      
      const govResponse = await govApiService.emitirNfse(signedXml);
      return res.status(201).json({ status: 'NFS-e emitida com sucesso!', ...govResponse });
    } catch (error: any) {
      console.error('\n--- [CONTROLLER] ERRO CAPTURADO NA EMISSÃO ---', error);
      return res.status(error.status || 500).json({
        message: 'Ocorreu um erro ao processar a emissão.',
        details: error.details || error.message || error,
      });
    }
  };

  // O MÉTODO CONSULTAR (permanece igual, com a lógica de fallback)
    public consultarDanfse = async (req: Request, res: Response): Promise<void> => {
    const { chaveAcesso } = req.params;

    if (!chaveAcesso || chaveAcesso.length !== 50) {
      res.status(400).json({ message: 'A chave de acesso é obrigatória e deve conter 50 caracteres.' });
      return;
    }

    console.log(`[CONTROLLER] >> Iniciando consulta do DANFSe para a chave: ${chaveAcesso}`);
    
    let resultado: { data: Buffer, headers: any } | null = null;

    // Tenta em Produção
    try {
      console.log('--- Tentando DANFSe no ambiente de PRODUÇÃO...');
      const pfxBuffer = fs.readFileSync(this.pfxPath);
      const govApiServiceProd = new GovApiService();
      govApiServiceProd.initialize(pfxBuffer, this.pfxPassword, environments.producao.baseUrl);
      
      resultado = await govApiServiceProd.consultarDanfse(chaveAcesso);
      console.log(resultado)
    } catch (errorProd: any) {
      if (errorProd.status !== 404) {
        res.status(errorProd.status || 500).json({
          message: 'Ocorreu um erro ao consultar o DANFSe em produção.',
          details: errorProd.details || errorProd.message,
        });
        return;
      }
      console.log('--- DANFSe não encontrado em PRODUÇÃO.');
    }

    // Se não encontrou em produção, tenta em Homologação
    if (!resultado) {
      try {
        console.log('--- Tentando DANFSe no ambiente de HOMOLOGAÇÃO...');
        const pfxBuffer = fs.readFileSync(this.pfxPath);
        const govApiServiceHomol = new GovApiService();
        govApiServiceHomol.initialize(pfxBuffer, this.pfxPassword, environments.homologacao.baseUrl);
        
        resultado = await govApiServiceHomol.consultarDanfse(chaveAcesso);

      } catch (errorHomol: any) {
        res.status(errorHomol.status || 500).json({
          message: 'Ocorreu um erro ao consultar o DANFSe em homologação.',
          details: errorHomol.details || errorHomol.message,
        });
        return;
      }
    }

    // Se, após as duas tentativas, o resultado foi obtido
    if (resultado) {
      console.log('[CONTROLLER] << DANFSe encontrado. Retransmitindo o PDF...');

      // Repassa os cabeçalhos importantes da resposta original para a nova resposta
      res.setHeader('Content-Type', resultado.headers['content-type'] || 'application/pdf');
      if (resultado.headers['content-disposition']) {
        res.setHeader('Content-Disposition', resultado.headers['content-disposition']);
      }
      if (resultado.headers['content-length']) {
        res.setHeader('Content-Length', resultado.headers['content-length']);
      }
      
      // Envia o buffer do PDF como corpo da resposta
      res.send(resultado.data);
    } else {
      // Se não encontrou em nenhum ambiente
      console.log('[CONTROLLER] << DANFSe não encontrado em nenhum ambiente.');
      res.status(404).json({ message: 'DANFSe não encontrado para a chave de acesso informada.' });
    }
  };
}