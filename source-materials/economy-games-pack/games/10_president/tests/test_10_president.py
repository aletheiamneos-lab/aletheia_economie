from shared.registry import get_engine
def test_engine():
    e=get_engine("president");s=e.start()
    p=e.public_state(s)
    assert p["total_rounds"]==20
    first=p["decision"]["options"][0]["id"]
    r=e.apply_action(s,{"option_id":first})
    assert r.accepted and s.round_index==1
