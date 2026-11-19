loadState();
if(state.parts.length === 0) seedDemo();
initConcept();
initShell();
restoreInitialRoute29();
renderApp();
hideSidebar();
// An explicit browser import replaces the working data; refresh sibling tabs
// so their old in-memory state cannot overwrite the imported records.
window.addEventListener('storage',event=>{
  if(event.key==='InsectMES_Rev031_browser_import'&&event.newValue)location.reload();
});
