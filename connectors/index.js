const {scanProject}=require('./project-scanner');
const registry=new Map();
function registerConnector(def){if(!def||!def.id||typeof def.scan!=='function')throw new Error('connector requires id and scan');registry.set(def.id,{version:'1.0.0',...def});}
registerConnector({id:'filesystem-project',version:'1.0.0',capabilities:['project-files','nextjs','supabase','ai-config','mcp'],scan:scanProject});
function listConnectors(){return [...registry.values()].map(({scan,...x})=>x)}
function runConnector(id,input,options){const c=registry.get(id);if(!c)throw new Error(`unknown connector: ${id}`);return c.scan(input,options)}
module.exports={registerConnector,listConnectors,runConnector};
