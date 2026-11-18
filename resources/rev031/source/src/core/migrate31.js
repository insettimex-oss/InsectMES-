// Copy Rev030 browser data once; Rev031 writes only its own keys.
(function(){
 try{
  if(localStorage.getItem('InsectMES_Rev031_migrated'))return;
  const records=Object.keys(localStorage).filter(key=>key.startsWith('InsectMES_Rev030'));
  for(const key of records){const next=key.replace('InsectMES_Rev030','InsectMES_Rev031');if(localStorage.getItem(next)===null)localStorage.setItem(next,localStorage.getItem(key));}
  localStorage.setItem('InsectMES_Rev031_migrated','1');
 }catch(error){console.error('No se pudieron copiar los datos de Rev030.',error);}
})();

// Existing Rev031 catalogs are authoritative. Catalog recovery is explicit only;
// never replace a configured Rev031 catalog with another browser revision at startup.
