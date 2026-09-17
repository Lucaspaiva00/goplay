function timeToMinutes(v){
  const m=String(v||'').match(/^(\d{2}):(\d{2})$/); if(!m)return null;
  const h=Number(m[1]),min=Number(m[2]); if(h<0||h>23||min<0||min>59)return null;
  return h*60+min;
}
function endToMinutes(v){ const x=timeToMinutes(v); return x===0?1440:x; }
function configForDate(horarios,date){
  const d = date instanceof Date ? date : new Date(date);
  const day=d.getDay();
  const rows=Array.isArray(horarios)?horarios:[];
  if(!rows.length) return {diaSemana:day,ativo:true,horaInicio:'18:00',horaFim:'23:00',fallback:true};
  return rows.find(h=>Number(h.diaSemana)===day) || {diaSemana:day,ativo:false,horaInicio:null,horaFim:null};
}
function validateInterval(config,horaInicio,horaFim){
  if(!config?.ativo) return {ok:false,error:'A empresa não funciona neste dia.'};
  const open=timeToMinutes(config.horaInicio), close=endToMinutes(config.horaFim), ini=timeToMinutes(horaInicio), fim=endToMinutes(horaFim);
  if([open,close,ini,fim].some(v=>v===null)) return {ok:false,error:'Horário inválido.'};
  if(ini<open||fim>close||fim<=ini) return {ok:false,error:`Fora do horário de funcionamento (${config.horaInicio} às ${config.horaFim}).`};
  return {ok:true};
}
function buildSlots(config,duration=60){
  if(!config?.ativo)return [];
  const open=timeToMinutes(config.horaInicio),close=endToMinutes(config.horaFim); if(open===null||close===null)return [];
  const out=[]; for(let m=open;m+duration<=close;m+=duration){
    const fmt=x=>{ if(x===1440)return '00:00'; const h=Math.floor(x/60)%24,mm=x%60; return `${String(h).padStart(2,'0')}:${String(mm).padStart(2,'0')}`; };
    out.push({horaInicio:fmt(m),horaFim:fmt(m+duration)});
  } return out;
}
module.exports={timeToMinutes,endToMinutes,configForDate,validateInterval,buildSlots};
