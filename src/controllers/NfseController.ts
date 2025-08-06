// src/controllers/NfseController.ts
import { Request, Response } from 'express';
import { NfsInputDto } from '../dtos/NfsInputDto';
import { DpsService } from '../services/DpsService';
import { GovApiService } from '../services/GovApiService';
import { XmlSigningService } from '../services/XmlSigningService';
import fs from 'fs';

export class NfseController {
  constructor(
    private dpsService: DpsService,
    private signingService: XmlSigningService,
    private privateKeyPem: string,
    private certificatePem: string,
    private pfxPath: string,
    private pfxPassword: string
  ) {}
  
  public emitir = async (req: Request, res: Response): Promise<Response> => {
    try {
      const inputData: NfsInputDto = req.body;
      const ambiente = inputData.ambiente || '2';
      
      const unsignedXml = this.dpsService.buildUnsignedXml(inputData, ambiente);
      
      console.log('[CONTROLLER] >> Etapa 2: Assinando o XML...');
      const signedXml = this.signingService.signXml(unsignedXml, this.privateKeyPem, this.certificatePem);
      console.log('--- XML Final Assinado (Enviado) ---\n', signedXml);
      
      const pfxBuffer = fs.readFileSync(this.pfxPath);
      const govApiService = new GovApiService();
      govApiService.initialize(pfxBuffer, this.pfxPassword, ambiente);
      
      const govResponse = await govApiService.emitirNfse(signedXml);
      return res.status(201).json({ status: 'NFS-e emitida com sucesso!', ...govResponse });
    } catch (error: any) {
      console.error('\n--- [CONTROLLER] ERRO CAPTURADO ---', error);
      return res.status(error.status || 500).json({
        message: 'Ocorreu um erro ao processar a emissão.',
        details: error.details || error.message || error,
      });
    }
  };
}