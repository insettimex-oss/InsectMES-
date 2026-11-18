function ensureSerialCounter31(db,prefix){
  const row=db.setupTables.Serial_Prefix.find(item=>item.code===prefix&&item.active!==false);
  if(!row)throw Error('Configura un Serial Prefix activo: '+prefix+'.');
  let next=Number(row.lastNumber||0);
  if(!Number.isSafeInteger(next)||next<0)throw Error('El consecutivo de '+prefix+' no es válido.');
  for(const record of db.serials){
    if(!record.serial.startsWith(prefix))continue;
    const suffix=record.serial.slice(prefix.length);if(!/^\d+$/.test(suffix))continue;
    const number=Number(suffix);if(Number.isSafeInteger(number))next=Math.max(next,number);
  }
  if(next>=Number.MAX_SAFE_INTEGER)throw Error('Se agotó el consecutivo de '+prefix+'.');
  row.lastNumber=next;return row;
}
getNextSerial=function(prefix){const row=ensureSerialCounter31(state,prefix);row.lastNumber++;return prefix+String(row.lastNumber).padStart(6,'0');};
const nextContainerBeforeSerial31=nextContainer30;
nextContainer30=function(db,fields){ensureSerialCounter31(db,'BSF');return nextContainerBeforeSerial31(db,fields);};
const recordBeforeSerial31=recordCP29;
recordCP29=function(db,station,args){
  const previous=new Set(db.serials.map(row=>row.serial));ensureSerialCounter31(db,'BSF');
  const output=recordBeforeSerial31(db,station,args);
  for(const row of db.serials.filter(row=>!previous.has(row.serial)))row.status=containerStatusCode30(row.status,db);
  return output;
};
