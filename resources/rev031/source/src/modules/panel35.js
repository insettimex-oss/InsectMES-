/* Captura conjunta de jaulas y jerarquía visual del Control Panel. */
const initPanel35=initShell;
initShell=function(){initPanel35();const row=state.setupTables.Workcenter_Status_Control.find(x=>x.code==='IDLE');if(row&&row.color==='#e4e8e5')row.color='#a9b1ad';saveState();};
function cageTotals35(values){const quantities=values.map(x=>x===''?0:Number(x));if(quantities.some(x=>!Number.isFinite(x)||x<0))throw Error('Revisa las cantidades de las jaulas.');return {total:quantities.reduce((n,x)=>n+x,0),cages:quantities.map((x,i)=>x>0?(eggCages29[i]?.label||'Jaula '+(i+1)):'').filter(Boolean)};}
sumEggCages29=function(){try{const result=cageTotals35(eggCages29.map(c=>c.key).map(k=>document.getElementById('parameter_'+k)?.value||''));document.getElementById('cpOutputQty').value=result.total||'';document.getElementById('cpCage').value=result.cages.join(', ');document.getElementById('egg_total35').textContent=number34(result.total)+' g';refreshGate32();}catch(e){document.getElementById('cpCage').value='';document.getElementById('cpOutputQty').value='';refreshGate32();}};
const renderPanel35=renderControlPanel29;
renderControlPanel29=function(){renderPanel35();const status=document.querySelector('.wc-status32');if(status&&wcRule32().code==='IDLE')status.classList.add('wc-idle35');if(op29().code==='NUR'){document.querySelector('.cp-heading .cp-actions').insertAdjacentHTML('afterbegin',`<label>Workcenter<select class="select" aria-label="Workcenter" onchange="cpCode=this.value;renderApp()">${state.cpOperations.map(x=>`<option value="${x.code}" ${x.code==='NUR'?'selected':''}>${esc(x.wc+' · '+x.workcenter)}</option>`).join('')}</select></label>`);}if(op29().code!=='EGG')return;const sources=document.querySelector('.sources32');sources.innerHTML='<div class="section-title32"><h2>Cosecha por jaula</h2>'+icon29('fly')+'</div><div class="egg-cages35"><input id="cpCage" type="hidden"><div id="egg_cages35"></div><div class="egg-total35"><span>Total recolectado</span><strong id="egg_total35">0.00 g</strong></div></div>';for(const k of eggCages29.map(c=>c.key)){const el=document.getElementById('parameter_'+k);if(el){document.getElementById('egg_cages35').append(el.closest('label'));el.setAttribute('aria-label',eggCages29.find(c=>c.key===k).label+' (g)');el.oninput=sumEggCages29;}}sources.insertAdjacentHTML('beforeend','<div hidden><b id="traffic_missing32">0</b><b id="traffic_pending32">0</b><b id="traffic_ready32">0</b></div>');document.getElementById('cpOutputQty').readOnly=true;sumEggCages29();};
const recordPanel35=recordCP29;
recordCP29=function(s,o,args){if(o.code==='EGG'){const result=cageTotals35(eggCages29.map(c=>c.key).map(k=>args.fields?.[k]??''));if(!(result.total>0))throw Error('Registra la cosecha de al menos una jaula.');if(Math.abs(args.qty-result.total)>1e-9)throw Error('La cantidad de salida debe coincidir con el total de las jaulas.');args={...args,cage:result.cages.join(', ')};}return recordPanel35(s,o,args);};
const setStatusPanel35=setWCStatus32;
setWCStatus32=function(code) {
  const isEgg = op29().code === 'EGG';
  const ids = isEgg ? [...eggCages29.map(c=>'parameter_'+c.key),'parameter_notes','parameter_usage'] : [];
  const values = Object.fromEntries(ids.map(id => [id,document.getElementById(id)?.value]));
  const source = document.getElementById('cpInput')?.value;
  const qty = document.getElementById('cpConsume')?.value;
  setStatusPanel35(code);
  for (const [id,value] of Object.entries(values)) {
    if (value !== undefined && document.getElementById(id)) document.getElementById(id).value = value;
  }
  if (isEgg && document.getElementById('cpOutputQty')) sumEggCages29();
  const picker = document.getElementById('cpInput');
  if (source && picker && !picker.value && [...picker.options].some(option => option.value === source)) {
    picker.value = source;
    selectSource32('cpInput');
    document.getElementById('cpConsume').value = qty;
  }
};
const gatePanel35=refreshGate32;
refreshGate32=function(){gatePanel35();if(op29().code==='EGG'&&document.getElementById('production_lock32')&&wcRule32().allowProduction)document.getElementById('production_lock32').textContent=document.getElementById('cpCage')?.value?'Cosecha capturada · Listo para reportar':'Captura la cantidad recolectada por jaula';};
