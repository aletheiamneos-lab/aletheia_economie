from __future__ import annotations
import json, copy
from pathlib import Path
from shared.base import GameEngine
from shared.models import Session, ActionResult, Feedback

def load():
    return json.loads((Path(__file__).parent/"content"/"scenarios.json").read_text(encoding="utf-8"))

def metrics(x,workers):
    workers=max(0,min(int(workers),len(x["output_by_workers"])-1))
    q=x["output_by_workers"][workers]
    vc=workers*x["wage"]+q*x["material_unit"]
    tc=x["fixed_cost"]+vc
    revenue=q*x["price"]
    profit=revenue-tc
    cmt=tc/q if q else None
    cmf=x["fixed_cost"]/q if q else None
    cmv=vc/q if q else None
    return {"workers":workers,"q":q,"vc":round(vc,2),"tc":round(tc,2),"revenue":round(revenue,2),
            "profit":round(profit,2),"cmt":None if cmt is None else round(cmt,2),
            "cmf":None if cmf is None else round(cmf,2),"cmv":None if cmv is None else round(cmv,2)}

class Engine(GameEngine):
    game_id="factory_master"
    def __init__(self):self.scenarios=load()
    def start(self,seed=1):return Session(self.game_id,seed,{"scenario_index":0})

    def public_state(self,s):
        if s.finished:return {"finished":True,"score":s.score}
        x=self.scenarios[s.state["scenario_index"]]
        return {"finished":False,"round":s.round_index+1,"total":len(self.scenarios),
                "scenario":{k:v for k,v in x.items() if k!="output_by_workers"} |
                           {"max_workers":len(x["output_by_workers"])-1,"production_table":x["output_by_workers"]}}

    def _best(self,x):
        allm=[metrics(x,w) for w in range(len(x["output_by_workers"]))]
        if x["objective"]=="max_profit": return max(allm,key=lambda m:m["profit"])
        if x["objective"]=="min_cost_target":
            feas=[m for m in allm if m["q"]>=x["target_q"]]
            return min(feas,key=lambda m:m["tc"]) if feas else max(allm,key=lambda m:m["q"])
        if x["objective"]=="break_even":
            return min(allm,key=lambda m:abs(m["profit"]))
        # optimal_workers: use highest marginal product before marked decline proxy = max profit for practical choice
        return max(allm,key=lambda m:m["profit"])

    def apply_action(self,s,action):
        if s.finished:return ActionResult(False,Feedback("neutral","Joc terminat","Sesiunea s-a încheiat.",[]),self.public_state(s))
        x=self.scenarios[s.state["scenario_index"]]
        if "workers" not in action:
            return ActionResult(False,Feedback("incorrect","Lipsește decizia","Alege numărul de lucrători.",[]),self.public_state(s))
        m=metrics(x,action["workers"]); best=self._best(x)
        distance=abs(m["workers"]-best["workers"])
        score=max(0,100-distance*20)
        if x["objective"]=="max_profit" and best["profit"]!=0:
            score=max(score, max(0,min(100,100*(m["profit"]-min(0,best["profit"]))/(best["profit"]-min(0,best["profit"])+1e-9))))
        score=round(score,2)
        s.score=round((s.score*s.round_index+score)/(s.round_index+1),2)
        s.history.append({"scenario":x["id"],"chosen":m,"best":best,"score":score})
        s.round_index+=1;s.state["scenario_index"]+=1
        if s.state["scenario_index"]>=len(self.scenarios):s.finished=True
        msg=f"Cu {m['workers']} lucrători: Q={m['q']}, CT={m['tc']}, profit={m['profit']}. Soluția de referință pentru obiectiv folosește {best['workers']} lucrători."
        return ActionResult(True,Feedback("correct" if score>=95 else "partial","Fabrica a rulat",msg,
                            ["productivitate","cost total","profit"]),self.public_state(s),score_delta=score,
                            animation_cues=[{"type":"factory_speed","workers":m["workers"],"output":m["q"]},
                                            {"type":"cost_dashboard","metrics":m}])
    def report(self,s):return {"finished":s.finished,"score":s.score,"history":s.history}
