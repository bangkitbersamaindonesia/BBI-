// Dashboard analytics prototype. All figures are synthetic and MUST NOT be used for accounting.
const $ = (selector) => document.querySelector(selector);
const dateUTC = (y,m,d) => new Date(Date.UTC(y,m,d,12));
const iso = (d) => d.toISOString().slice(0,10);
const day = 86400000;
const addDays = (d,n) => new Date(d.getTime()+n*day);
const fmtDate = new Intl.DateTimeFormat("id-ID",{day:"numeric",month:"short",year:"numeric",timeZone:"UTC"});
const fmtMoney = new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0});
function localToday(){
  const parts = new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Jakarta",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date());
  const p=Object.fromEntries(parts.map(x=>[x.type,x.value]));
  return dateUTC(+p.year,+p.month-1,+p.day);
}
function period(type,today){
  const y=today.getUTCFullYear(),m=today.getUTCMonth(),d=today.getUTCDate();
  if(type==="week") return [addDays(today,-((today.getUTCDay()+6)%7)),today];
  if(type==="quarter") return [dateUTC(y,Math.floor(m/3)*3,1),today];
  if(type==="semester") return [dateUTC(y,Math.floor(m/6)*6,1),today];
  if(type==="fiscal") return [dateUTC(y,0,1),today]; // fiscal year Jan-Dec until configured
  if(type==="month") return [dateUTC(y,m,1),today];
  return [dateUTC(y,m,d),today];
}
function prevYear(d){return dateUTC(d.getUTCFullYear()-1,d.getUTCMonth(),Math.min(d.getUTCDate(),new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0)).getUTCDate()));}
function dailyValue(d){
  // Stable, invented demo values: source is date only, no backend or actual ledger data.
  const t=Math.floor(d.getTime()/day);
  const wave=800000*Math.sin(t*.17)+390000*Math.cos(t*.043);
  return Math.round(1350000+wave+(t%7===0?-210000:0));
}
function buckets(start,end){
  const n=Math.floor((end-start)/day)+1;
  const number=Math.min(n,12);
  const result=[];
  for(let i=0;i<number;i++){
    const a=Math.floor(i*n/number),b=Math.floor((i+1)*n/number);
    let value=0;
    for(let j=a;j<b;j++)value+=dailyValue(addDays(start,j));
    result.push({value,label:fmtDate.format(addDays(start,a))});
  }
  return result;
}
function renderChart(current,previous){
  const all=[...current,...(previous||[])].map(p=>p.value);
  const maximum=Math.max(1,...all)*1.2;
  const x=(i,n)=>40+(n===1?460:i*920/(n-1)), y=v=>222-v/maximum*195;
  const path=(points)=>points.map((p,i)=>(i?"L":"M")+x(i,points.length).toFixed(1)+" "+y(p.value).toFixed(1)).join(" ");
  const labels=current.map((p,i)=>'<text x="'+x(i,current.length)+'" y="267" text-anchor="middle" font-size="11" fill="#8d9bb0">'+p.label+'</text>').join("");
  const ticks=[0,.25,.5,.75,1].map(t=>'<line x1="40" x2="960" y1="'+y(maximum*t)+'" y2="'+y(maximum*t)+'" stroke="#e9edf4"/><text x="31" y="'+(y(maximum*t)+4)+'" font-size="10" text-anchor="end" fill="#8d9bb0">'+Math.round(maximum*t/1e6)+'m</text>').join("");
  $("#net-profit-chart").innerHTML='<svg viewBox="0 0 1000 284" role="img" aria-label="Grafik laba bersih demo dalam juta rupiah" preserveAspectRatio="none">'+ticks+(previous?'<path d="'+path(previous)+'" fill="none" stroke="#a8b4c7" stroke-width="3" stroke-dasharray="8 7" stroke-linejoin="round"/>':'')+'<path d="'+path(current)+'" fill="none" stroke="#3769de" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"/>'+current.map((p,i)=>'<circle cx="'+x(i,current.length)+'" cy="'+y(p.value)+'" r="4" fill="#3769de"/>').join("")+labels+'</svg>';
}
export function mountDashboardAnalytics(){
  const preset=$("#date-preset"),compare=$("#compare-previous"),custom=$("#custom-dates");
  const startInput=$("#start-date"),endInput=$("#end-date");
  const today=localToday();
  const [initialStart,initialEnd]=period("month",today);
  startInput.value=iso(initialStart);endInput.value=iso(initialEnd);
  function render(){
    custom.hidden=preset.value!=="custom";
    const range=preset.value==="custom"?[dateUTC(...startInput.value.split("-").map(Number).map((v,i)=>i===1?v-1:v)),dateUTC(...endInput.value.split("-").map(Number).map((v,i)=>i===1?v-1:v))]:period(preset.value,today);
    const [start,end]=range;
    if(!Number.isFinite(start.getTime())||!Number.isFinite(end.getTime())||start>end){
      $("#selected-range").textContent="Rentang tanggal tidak valid. Pastikan tanggal awal tidak melebihi tanggal akhir.";
      $("#net-profit-chart").replaceChildren();$("#net-profit-total").textContent="—";return;
    }
    const previous=compare.checked?[prevYear(start),prevYear(end)]:null;
    const currentBuckets=buckets(start,end);
    const lastBuckets=previous?buckets(...previous):null;
    const sum=(a)=>a.reduce((t,x)=>t+x.value,0);
    const currentTotal=sum(currentBuckets),previousTotal=lastBuckets?sum(lastBuckets):null;
    $("#selected-range").textContent="Periode: "+fmtDate.format(start)+" – "+fmtDate.format(end)+(previous?" | Tahun lalu: "+fmtDate.format(previous[0])+" – "+fmtDate.format(previous[1]):"")+" · Tahun fiskal diasumsikan Jan–Des";
    $("#net-profit-total").textContent=fmtMoney.format(currentTotal);
    $("#last-year-legend").hidden=!compare.checked;
    $("#net-profit-chart").setAttribute("aria-label","Laba bersih ilustrasi "+fmtMoney.format(currentTotal)+(previousTotal===null?"":" dibanding "+fmtMoney.format(previousTotal)+" tahun lalu"));
    renderChart(currentBuckets,lastBuckets);
  }
  preset.addEventListener("change",render);
  compare.addEventListener("change",render);
  startInput.addEventListener("change",render);
  endInput.addEventListener("change",render);
  render();
}
