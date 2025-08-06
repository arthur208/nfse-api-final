// DENTRO DO ARQUIVO src/routes/NfseRoutes.ts

import { Router } from 'express';
import { NfseController } from '../controllers/NfseController';

export default (nfseController: NfseController) => {
  const router = Router();
  
  // Rota de emissão existente
  router.post('/emitir-nfse', nfseController.emitir);

  // NOVA ROTA PARA CONSULTA
  router.get('/nfse/:chaveAcesso', nfseController.consultarDanfse);

  return router;
};