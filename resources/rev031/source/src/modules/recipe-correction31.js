// Explicit correction requested by Alejandro. Run once, then preserve later user edits.
function correctFeedRecipes31(db){
 if(db.recipeCorrection31?.version===1)return false;
 const before=structuredClone({bom:db.setupTables.Bom,settings:db.settings,parts:db.parts});
 const recipes={'F-001':['MP-001','MP-002','MP-004'],'F-002':['PREMIUM-FEED','MP-004']};
 for(const [parent,components]of Object.entries(recipes)){
  if(!db.parts.some(p=>p.part===parent))throw Error('Falta el No Parte '+parent+'.');
  for(const code of components)if(!db.parts.some(p=>p.part===code))throw Error('Falta el componente '+code+'.');
 }
 db.setupTables.Bom=db.setupTables.Bom.filter(row=>!recipes[row.parentPart]||recipes[row.parentPart].includes(row.componentPart));
 for(const [parent,components]of Object.entries(recipes))for(const component of components){
  if(!db.setupTables.Bom.some(row=>row.parentPart===parent&&row.componentPart===component)){
   const part=db.parts.find(p=>p.part===component);db.setupTables.Bom.push({active:true,parentPart:parent,componentPart:component,qtyPerUnit:null,unit:part.unit,routingId:'',quantityPending31:true});
  }
 }
 const chicken=db.parts.find(p=>p.part==='PREMIUM-FEED');if(chicken)chicken.desc='Alimento de pollo';
 db.settings.bioconversionFeedPart31='F-001';db.settings.reproductionFeedPart31='F-002';
 db.recipeCorrection31={version:1,at:new Date().toISOString(),source:'Alejandro · ingredientes y asignación de las dos engordas',before};
 db.configHistory??=[];db.configHistory.unshift({at:db.recipeCorrection31.at,action:'Corregir ingredientes de F-001/F-002; F-001 Bioconversión, F-002 Reproducción; salvado separado.'});
 return true;
}
const initializeBeforeRecipeCorrection31=initShell;
initShell=function(){
 initializeBeforeRecipeCorrection31();if(state.recipeCorrection31?.version===1)return;
 const raw=localStorage.getItem(STORAGE_KEY);const next=structuredClone(state);
 if(correctFeedRecipes31(next)){
  localStorage.setItem('InsectMES_Rev031_before_feed_recipes_'+Date.now(),raw||JSON.stringify(state));
  const previous=state;state=next;try{saveState();}catch(error){state=previous;throw error;}
 }
};
