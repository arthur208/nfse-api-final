const fs = require('fs');
const xmlJs = require('xml-js');

const xml = fs.readFileSync('docs/1.01/tiposComplexos_v1.01.xsd', 'utf8');
const result = xmlJs.xml2js(xml, { compact: true });

const schema = result['xs:schema'];
const complexTypes = schema['xs:complexType'];

const typeMap = {};
if (Array.isArray(complexTypes)) {
  complexTypes.forEach(ct => {
    typeMap[ct._attributes.name] = ct;
  });
}

function traverseType(typeName, indent = '') {
  const typeDef = typeMap[typeName];
  if (!typeDef) return `${indent}- Type ${typeName} (Simples ou não encontrado)\n`;
  
  let output = '';
  // xs:sequence contains xs:element or xs:choice
  const sequence = typeDef['xs:sequence'];
  if (sequence) {
    const list = Array.isArray(sequence) ? sequence : [sequence];
    list.forEach(seq => {
      // process elements
      if (seq['xs:element']) {
        const els = Array.isArray(seq['xs:element']) ? seq['xs:element'] : [seq['xs:element']];
        els.forEach(el => {
          const name = el._attributes.name;
          const type = el._attributes.type;
          const minOccurs = el._attributes.minOccurs || '1';
          output += `${indent}- [${minOccurs === '0' ? 'OPTIONAL' : 'REQUIRED'}] ${name} (${type})\n`;
          output += traverseType(type, indent + '  ');
        });
      }
      // process choice
      if (seq['xs:choice']) {
        output += `${indent}- [CHOICE]\n`;
        const choices = Array.isArray(seq['xs:choice']) ? seq['xs:choice'] : [seq['xs:choice']];
        choices.forEach(choice => {
          if (choice['xs:element']) {
             const els = Array.isArray(choice['xs:element']) ? choice['xs:element'] : [choice['xs:element']];
             els.forEach(el => {
                const name = el._attributes.name;
                const type = el._attributes.type;
                output += `${indent}  - (OR) ${name} (${type})\n`;
                output += traverseType(type, indent + '    ');
             });
          }
        });
      }
    });
  }
  return output;
}

const structure = traverseType('TCInfDPS');
fs.writeFileSync('schema_tree.txt', structure);
console.log('Schema tree dumped to schema_tree.txt');
