// Utilitário de desenvolvimento: busca dados públicos de um CNPJ via API pública.
// Substitua SEU_CNPJ_AQUI pelo CNPJ desejado (somente números, sem formatação).
const axios = require('axios');
const fs = require('fs');
async function run() {
  const cnpj = process.env.CNPJ || 'SEU_CNPJ_AQUI';
  const { data } = await axios.get(`https://publica.cnpj.ws/cnpj/${cnpj}`);
  fs.writeFileSync('cnpj.json', JSON.stringify(data, null, 2));
  console.log('Dados salvos em cnpj.json');
}
run();

