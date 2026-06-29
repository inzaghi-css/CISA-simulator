import { useState, useEffect } from "react";

const DOMAINS = [
  { id: 1, name: "IS Audit Process", short: "Audit" },
  { id: 2, name: "IT Governance & Management", short: "Governance" },
  { id: 3, name: "IS Acquisition, Development & Implementation", short: "Dev & Impl" },
  { id: 4, name: "IS Operations & Business Resilience", short: "Operations" },
  { id: 5, name: "Protection of Information Assets", short: "Security" },
];

const SYSTEM_PROMPT = `You are a CISA (Certified Information Systems Auditor) exam question generator. Create ONE extremely difficult exam question at the HARDEST level possible, matching real ISACA CISA exam difficulty.

Rules:
- Questions must be scenario-based, nuanced, and require deep expert knowledge
- Include plausible distractors — wrong answers must be tempting and partially correct
- Avoid simple factual recall; test judgment, analysis, and application
- Focus on the domain provided
- Use ISACA terminology precisely
- The correct answer should require understanding of nuance, not just memorization

Respond ONLY with valid JSON, no markdown, no backticks:
{
  "question": "...",
  "options": { "A": "...", "B": "...", "C": "...", "D": "..." },
  "correct": "A",
  "explanation": "Detailed explanation of why this answer is correct and why others are wrong.",
  "domain": "...",
  "difficulty": "Expert"
}`;

export default function CISASimulator() {
  const [screen, setScreen] = useState("home");
  const [selectedDomain, setSelectedDomain] = useState(null);
  const [numQuestions, setNumQuestions] = useState(10);
  const [questions, setQuestions] = useState([]);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState({});
  const [selected, setSelected] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [score, setScore] = useState(null);
  const [timer, setTimer] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const [reviewIdx, setReviewIdx] = useState(0);

  useEffect(() => {
    let interval;
    if (timerActive) interval = setInterval(() => setTimer(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, [timerActive]);

  const formatTime = (s) => `${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;

  const generateQuestion = async (domainName) => {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1000,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: `Generate a HARD CISA exam question for domain: "${domainName}". Scenario-based, expert-level.` }]
      })
    });
    const data = await response.json();
    const text = data.content.map(b => b.text || "").join("");
    return JSON.parse(text.replace(/```json|```/g, "").trim());
  };

  const startExam = async () => {
    setLoading(true);
    setQuestions([]); setAnswers({}); setCurrent(0);
    setSelected(null); setRevealed(false); setTimer(0);
    const domain = selectedDomain ? DOMAINS.find(d => d.id === selectedDomain)?.name : null;
    const generated = [];
    for (let i = 0; i < numQuestions; i++) {
      const domainName = domain || DOMAINS[i % DOMAINS.length].name;
      setLoadingMsg(`Génération question ${i+1}/${numQuestions} — ${domainName}...`);
      try {
        const q = await generateQuestion(domainName);
        generated.push({ ...q, domainName });
      } catch (e) {
        generated.push({ question: `[Erreur] Question ${i+1}`, options: { A:"N/A",B:"N/A",C:"N/A",D:"N/A" }, correct:"A", explanation:"Erreur API.", domain: domainName, difficulty:"Expert" });
      }
    }
    setQuestions(generated); setLoading(false); setScreen("exam"); setTimerActive(true);
  };

  const confirmAnswer = () => {
    if (!selected || revealed) return;
    setAnswers(prev => ({ ...prev, [current]: selected }));
    setRevealed(true);
  };

  const nextQuestion = () => {
    if (current < questions.length - 1) { setCurrent(c => c+1); setSelected(null); setRevealed(false); }
    else { setTimerActive(false); let c=0; questions.forEach((q,i) => { if(answers[i]===q.correct) c++; }); setScore(c); setScreen("result"); }
  };

  const pct = score !== null ? Math.round((score/questions.length)*100) : 0;
  const passed = pct >= 75;

  const C = { bg:"#0B0F1A",surface:"#141926",card:"#1C2333",border:"#252D42",accent:"#4F8EF7",accentDark:"#1E3A6E",gold:"#F0C040",green:"#22C55E",red:"#EF4444",text:"#E8EAED",muted:"#8B92A5",white:"#FFFFFF" };

  const base = { app:{ minHeight:"100vh",background:C.bg,color:C.text,fontFamily:"'Inter','Segoe UI',sans-serif" }, header:{ background:C.surface,borderBottom:`1px solid ${C.border}`,padding:"14px 20px",display:"flex",alignItems:"center",justifyContent:"space-between" }, page:{ maxWidth:"640px",margin:"0 auto",padding:"24px 16px" }, card:{ background:C.card,border:`1px solid ${C.border}`,borderRadius:"14px",padding:"20px",marginBottom:"16px" }, primaryBtn:{ display:"block",width:"100%",padding:"15px",background:C.accent,color:C.white,border:"none",borderRadius:"12px",fontSize:"16px",fontWeight:"700",cursor:"pointer" }, secondaryBtn:{ display:"block",width:"100%",padding:"13px",background:"transparent",color:C.accent,border:`1.5px solid ${C.accent}`,borderRadius:"12px",fontSize:"14px",fontWeight:"600",cursor:"pointer",marginTop:"10px" }, progressBar:{ width:"100%",height:"4px",background:C.border,borderRadius:"2px",overflow:"hidden",margin:"12px 0" }, label:{ fontSize:"12px",fontWeight:"600",color:C.muted,textTransform:"uppercase",letterSpacing:"1px",marginBottom:"10px",display:"block" } };

  const optionStyle = (opt, correct, sel, rev) => {
    let bg=C.surface, border=C.border, color=C.text;
    if (rev) { if(opt===correct){bg="#14532D";border=C.green;color=C.green;} else if(opt===sel&&opt!==correct){bg="#450A0A";border=C.red;color=C.red;} }
    else if(opt===sel){bg=C.accentDark;border=C.accent;color=C.accent;}
    return { display:"block",width:"100%",padding:"14px 16px",marginBottom:"10px",background:bg,border:`1.5px solid ${border}`,borderRadius:"10px",color,fontSize:"14px",textAlign:"left",cursor:rev?"default":"pointer",lineHeight:"1.5" };
  };

  if (loading) return (
    <div style={base.app}>
      <div style={base.header}><span style={{fontSize:"16px",fontWeight:"700",color:C.accent,letterSpacing:"2px"}}>CISA</span><span style={{background:C.accentDark,color:C.accent,fontSize:"11px",padding:"3px 10px",borderRadius:"20px",fontWeight:"600"}}>EXPERT</span></div>
      <div style={{...base.page,textAlign:"center",paddingTop:"60px"}}>
        <div style={{fontSize:"40px",marginBottom:"20px"}}>⚙️</div>
        <p style={{color:C.accent,fontWeight:"700",fontSize:"16px"}}>Génération des questions IA...</p>
        <p style={{color:C.muted,fontSize:"13px",marginTop:"8px"}}>{loadingMsg}</p>
        <div style={{...base.progressBar,marginTop:"24px"}}><div style={{width:`${(questions.length/numQuestions)*100}%`,height:"100%",background:C.accent,borderRadius:"2px",transition:"width 0.3s"}} /></div>
        <p style={{color:C.muted,fontSize:"12px",marginTop:"8px"}}>{questions.length} / {numQuestions} prêtes</p>
      </div>
    </div>
  );

  if (screen === "home") return (
    <div style={base.app}>
      <div style={base.header}><span style={{fontSize:"16px",fontWeight:"700",color:C.accent,letterSpacing:"2px"}}>CISA</span><span style={{background:C.accentDark,color:C.accent,fontSize:"11px",padding:"3px 10px",borderRadius:"20px",fontWeight:"600"}}>EXPERT LEVEL</span></div>
      <div style={base.page}>
        <h1 style={{fontSize:"26px",fontWeight:"800",color:C.white,margin:"0 0 6px"}}>Simulateur CISA</h1>
        <p style={{color:C.muted,fontSize:"14px",margin:"0 0 24px"}}>Questions IA niveau examen officiel ISACA</p>
        <div style={base.card}>
          <span style={base.label}>Domaine</span>
          <button style={{display:"block",width:"100%",padding:"12px 16px",marginBottom:"8px",background:selectedDomain===null?C.accentDark:C.surface,border:`1.5px solid ${selectedDomain===null?C.accent:C.border}`,borderRadius:"10px",color:selectedDomain===null?C.accent:C.text,fontSize:"14px",textAlign:"left",cursor:"pointer"}} onClick={()=>setSelectedDomain(null)}>🌐 Tous les domaines</button>
          {DOMAINS.map(d=>(
            <button key={d.id} style={{display:"block",width:"100%",padding:"12px 16px",marginBottom:"8px",background:selectedDomain===d.id?C.accentDark:C.surface,border:`1.5px solid ${selectedDomain===d.id?C.accent:C.border}`,borderRadius:"10px",color:selectedDomain===d.id?C.accent:C.text,fontSize:"14px",textAlign:"left",cursor:"pointer"}} onClick={()=>setSelectedDomain(d.id)}>{d.id}. {d.name}</button>
          ))}
        </div>
        <div style={base.card}>
          <span style={base.label}>Nombre de questions</span>
          <div style={{display:"flex",gap:"8px",flexWrap:"wrap"}}>
            {[5,10,15,20,30].map(n=>(
              <button key={n} style={{padding:"8px 18px",background:numQuestions===n?C.accent:C.surface,color:numQuestions===n?C.white:C.text,border:`1.5px solid ${numQuestions===n?C.accent:C.border}`,borderRadius:"8px",fontSize:"14px",fontWeight:"600",cursor:"pointer"}} onClick={()=>setNumQuestions(n)}>{n}</button>
            ))}
          </div>
        </div>
        <button style={base.primaryBtn} onClick={startExam}>🚀 Démarrer l'examen</button>
      </div>
    </div>
  );

  if (screen === "exam") {
    const q = questions[current];
    return (
      <div style={base.app}>
        <div style={base.header}>
          <span style={{fontSize:"16px",fontWeight:"700",color:C.accent,letterSpacing:"2px"}}>CISA</span>
          <div style={{display:"flex",alignItems:"center",gap:"12px"}}>
            <span style={{fontFamily:"'Courier New',monospace",fontSize:"15px",color:C.gold,fontWeight:"700"}}>{formatTime(timer)}</span>
            <span style={{color:C.muted,fontSize:"13px"}}>{current+1}/{questions.length}</span>
          </div>
        </div>
        <div style={base.page}>
          <div style={base.progressBar}><div style={{width:`${((current+1)/questions.length)*100}%`,height:"100%",background:C.accent,borderRadius:"2px"}} /></div>
          <div style={{...base.card,marginBottom:"12px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"12px"}}>
              <span style={{fontSize:"11px",color:C.accent,fontWeight:"600",textTransform:"uppercase",letterSpacing:"1px"}}>{q.domain||q.domainName}</span>
              <span style={{background:"#1E1506",color:C.gold,fontSize:"11px",padding:"2px 8px",borderRadius:"4px",fontWeight:"700"}}>EXPERT</span>
            </div>
            <p style={{margin:0,fontSize:"15px",lineHeight:"1.7",color:C.white}}>{q.question}</p>
          </div>
          {["A","B","C","D"].map(opt=>(
            <button key={opt} style={optionStyle(opt,q.correct,selected,revealed)} onClick={()=>!revealed&&setSelected(opt)}>
              <strong>{opt}.</strong> {q.options[opt]}
            </button>
          ))}
          {revealed && <div style={{background:"#0F1E35",border:`1px solid ${C.accent}`,borderRadius:"10px",padding:"14px 16px",marginTop:"14px",fontSize:"13px",lineHeight:"1.6"}}><p style={{margin:"0 0 8px",fontWeight:"700",color:C.accent}}>✅ Réponse : {q.correct}</p><p style={{margin:0}}>{q.explanation}</p></div>}
          {!revealed ? <button style={{...base.primaryBtn,marginTop:"14px",opacity:selected?1:0.4}} onClick={confirmAnswer} disabled={!selected}>Valider</button>
          : <button style={{...base.primaryBtn,marginTop:"14px"}} onClick={nextQuestion}>{current===questions.length-1?"Voir les résultats →":"Question suivante →"}</button>}
        </div>
      </div>
    );
  }

  if (screen === "result") {
    const domainStats = {};
    questions.forEach((q,i)=>{ const d=q.domain||q.domainName||"Unknown"; if(!domainStats[d])domainStats[d]={correct:0,total:0}; domainStats[d].total++; if(answers[i]===q.correct)domainStats[d].correct++; });
    return (
      <div style={base.app}>
        <div style={base.header}><span style={{fontSize:"16px",fontWeight:"700",color:C.accent,letterSpacing:"2px"}}>CISA</span><span style={{background:C.accentDark,color:C.accent,fontSize:"11px",padding:"3px 10px",borderRadius:"20px",fontWeight:"600"}}>{passed?"RÉUSSI ✓":"ÉCHOUÉ"}</span></div>
        <div style={base.page}>
          <div style={base.card}>
            <div style={{width:"100px",height:"100px",borderRadius:"50%",background:`conic-gradient(${passed?C.green:C.red} ${pct*3.6}deg,${C.border} 0deg)`,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px",boxShadow:`0 0 20px ${passed?"#22C55E44":"#EF444444"}`}}>
              <div style={{width:"76px",height:"76px",borderRadius:"50%",background:C.card,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column"}}>
                <span style={{fontSize:"22px",fontWeight:"900",color:passed?C.green:C.red}}>{pct}%</span>
                <span style={{fontSize:"10px",color:C.muted}}>SCORE</span>
              </div>
            </div>
            <h2 style={{fontSize:"18px",fontWeight:"700",color:C.white,textAlign:"center",margin:"0 0 8px"}}>{passed?"🎉 Objectif atteint !":"📚 À retravailler"}</h2>
            <p style={{textAlign:"center",color:C.muted,fontSize:"13px",margin:"0 0 16px"}}>Seuil CISA : 75%</p>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"8px"}}>
              {[[score,C.green,"Correctes"],[questions.length-score,C.red,"Erreurs"],[formatTime(timer),C.gold,"Temps"]].map(([v,c,l])=>(
                <div key={l} style={{textAlign:"center",padding:"12px"}}><span style={{fontSize:"28px",fontWeight:"900",color:c,display:"block"}}>{v}</span><span style={{fontSize:"12px",color:C.muted,textTransform:"uppercase",letterSpacing:"1px"}}>{l}</span></div>
              ))}
            </div>
          </div>
          <div style={base.card}>
            <span style={base.label}>Par domaine</span>
            {Object.entries(domainStats).map(([dom,stat])=>{ const p=Math.round((stat.correct/stat.total)*100); return (
              <div key={dom} style={{marginBottom:"12px"}}>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:"12px",marginBottom:"4px"}}><span style={{color:C.text}}>{dom.split(",")[0]}</span><span style={{color:p>=75?C.green:C.red,fontWeight:"700"}}>{p}%</span></div>
                <div style={{...base.progressBar,margin:0}}><div style={{width:`${p}%`,height:"100%",background:p>=75?C.green:C.red,borderRadius:"2px"}} /></div>
              </div>
            );})}
          </div>
          <button style={base.primaryBtn} onClick={()=>{setReviewIdx(0);setScreen("review");}}>📋 Revoir les questions</button>
          <button style={base.secondaryBtn} onClick={()=>setScreen("home")}>← Nouvel examen</button>
        </div>
      </div>
    );
  }

  if (screen === "review") {
    const q = questions[reviewIdx];
    const ua = answers[reviewIdx];
    return (
      <div style={base.app}>
        <div style={base.header}>
          <button onClick={()=>setScreen("result")} style={{background:"none",border:"none",color:C.accent,cursor:"pointer",fontSize:"14px"}}>← Résultats</button>
          <span style={{color:C.muted,fontSize:"13px"}}>{reviewIdx+1}/{questions.length}</span>
        </div>
        <div style={base.page}>
          <div style={{...base.card,borderColor:ua===q.correct?C.green:C.red}}>
            <div style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:"12px"}}>
              <span style={{fontSize:"18px"}}>{ua===q.correct?"✅":"❌"}</span>
              <span style={{fontSize:"12px",color:C.muted,textTransform:"uppercase",letterSpacing:"1px"}}>{q.domain||q.domainName}</span>
            </div>
            <p style={{margin:0,fontSize:"14px",lineHeight:"1.7",color:C.white}}>{q.question}</p>
          </div>
          {["A","B","C","D"].map(opt=>(
            <button key={opt} style={optionStyle(opt,q.correct,ua,true)} disabled><strong>{opt}.</strong> {q.options[opt]}</button>
          ))}
          <div style={{background:"#0F1E35",border:`1px solid ${C.accent}`,borderRadius:"10px",padding:"14px 16px",marginTop:"14px",fontSize:"13px",lineHeight:"1.6"}}>
            <p style={{margin:"0 0 8px",fontWeight:"700",color:C.accent}}>Explication</p>
            <p style={{margin:0}}>{q.explanation}</p>
          </div>
          <div style={{display:"flex",gap:"10px",marginTop:"16px"}}>
            <button style={{flex:1,padding:"13px",background:"transparent",color:C.accent,border:`1.5px solid ${C.accent}`,borderRadius:"12px",fontSize:"14px",fontWeight:"600",cursor:"pointer",opacity:reviewIdx===0?0.3:1}} onClick={()=>setReviewIdx(r=>Math.max(0,r-1))} disabled={reviewIdx===0}>← Précédente</button>
            <button style={{flex:1,padding:"15px",background:C.accent,color:C.white,border:"none",borderRadius:"12px",fontSize:"14px",fontWeight:"700",cursor:"pointer",opacity:reviewIdx===questions.length-1?0.3:1}} onClick={()=>setReviewIdx(r=>Math.min(questions.length-1,r+1))} disabled={reviewIdx===questions.length-1}>Suivante →</button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
