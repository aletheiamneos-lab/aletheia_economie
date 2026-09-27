from __future__ import annotations
import json, copy
from pathlib import Path
from shared.base import GameEngine
from shared.models import Session, ActionResult, Feedback
from shared.utils import clamp

def load():
    return json.loads((Path(__file__).parent/"content"/"scenarios.json").read_text(encoding="utf-8"))

SHOCKS={
"currency_depreciation":{"exports":8,"imports":-4,"fx_index":10},
"currency_appreciation":{"exports":-7,"imports":6,"fx_index":-10},
"foreign_demand_up":{"exports":12},
"foreign_demand_down":{"exports":-12},
"logistics_upgrade":{"exports":8,"competitiveness":5},
"import_cost_up":{"imports":8,"competitiveness":-2},
"supplier_diversification":{"imports":-3,"competitiveness":3},
"foreign_barriers":{"exports":-10,"competitiveness":-2},
"productivity_up":{"exports":9,"competitiveness":6},
"mixed_shock":{"exports":-5,"imports":7,"fx_index":8,"competitiveness":-2}
}
POLICIES={
"invest_logistics":{"exports":6,"competitiveness":5},
"diversify":{"imports":-4,"competitiveness":3},
"export_support":{"exports":5,"competitiveness":2},
"restrict_imports":{"imports":-7,"competitiveness":-2},
"no_action":{}
}

class Engine(GameEngine):
    game_id="global_trader"
    def __init__(self):self.scenarios=load()
    def start(self,seed=1):
        x=self.scenarios[seed%len(self.scenarios)]
        state=copy.deepcopy(x["initial"]);state["scenario_id"]=x["id"];state["shock"]=x["shock"];state["round"]=1
        return Session(self.game_id,seed,state)
    def public_state(self,s):
        st=copy.deepcopy(s.state)
        st["trade_balance"]=round(st["exports"]-st["imports"],2)
        return {"finished":s.finished,"round":st.get("round",1),"total_rounds":6,"state":st,
                "policy_options":list(POLICIES.keys())}
    def _apply(self,st,effects):
        for k,v in effects.items():
            if k=="competitiveness":st[k]=round(clamp(st[k]+v,0,100),2)
            elif k=="fx_index":st[k]=round(clamp(st[k]+v,30,250),2)
            else:st[k]=round(max(0,st[k]+v),2)
    def apply_action(self,s,action):
        if s.finished:return ActionResult(False,Feedback("neutral","Campanie terminată","Nu mai sunt runde.",[]),self.public_state(s))
        pol=action.get("policy","no_action")
        if pol not in POLICIES:return ActionResult(False,Feedback("incorrect","Politică invalidă","Alege o politică disponibilă.",[]),self.public_state(s))
        before=copy.deepcopy(s.state)
        if s.round_index==0:self._apply(s.state,SHOCKS[s.state["shock"]])
        self._apply(s.state,POLICIES[pol])
        # simple persistence: competitiveness feeds exports
        s.state["exports"]=round(max(0,s.state["exports"]+(s.state["competitiveness"]-50)*0.04),2)
        balance=s.state["exports"]-s.state["imports"]
        score=round(clamp(65+balance*1.2+(s.state["competitiveness"]-50)*0.5,0,100),2)
        s.score=round((s.score*s.round_index+score)/(s.round_index+1),2)
        s.history.append({"round":s.round_index+1,"policy":pol,"before":before,"after":copy.deepcopy(s.state),"score":score})
        s.round_index+=1;s.state["round"]+=1
        if s.round_index>=6:s.finished=True
        msg=f"Exporturi={s.state['exports']}, importuri={s.state['imports']}, balanță={balance:.2f}, competitivitate={s.state['competitiveness']}."
        return ActionResult(True,Feedback("neutral","Rutele comerciale s-au actualizat",msg,
                            ["export","import","balanță comercială","curs valutar"]),self.public_state(s),score_delta=score,
                            animation_cues=[{"type":"trade_routes","exports":s.state["exports"],"imports":s.state["imports"]},
                                            {"type":"fx_gauge","value":s.state["fx_index"]}])
    def report(self,s):return {"finished":s.finished,"score":s.score,"history":s.history,"final_state":s.state}
