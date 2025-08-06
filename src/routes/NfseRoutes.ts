// src/routes/NfseRoutes.ts
import { Router } from 'express';
import { NfseController } from '../controllers/NfseController';

export default (nfseController: NfseController) => {
  const router = Router();
  
  // Rota para emitir a NFS-e
  router.post('/emitir-nfse', nfseController.emitir);

  // Rota para consultar os dados (XML/JSON) da NFS-e
  router.get('/nfse/:chaveAcesso', nfseController.consultar);

  // Rota para consultar o DANFSe (PDF) da NFS-e
  router.get('/danfse/:chaveAcesso', nfseController.consultarDanfse);

  return router;
};