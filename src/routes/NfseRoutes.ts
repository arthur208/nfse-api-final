// src/routes/NfseRoutes.ts (VERSÃO 100% LIMPA)

import { Router } from 'express';
import { NfseController } from '../controllers/NfseController';

export default (nfseController: NfseController) => {
  const router = Router();
  
  // A rota está aqui, mas a documentação dela está agora no arquivo .yaml
  router.post('/emitir-nfse', nfseController.emitir);

  return router;
};