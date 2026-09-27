from shared.registry import get_engine
def test_engine():
    e=get_engine("central_bank");s=e.start(seed=0)
    before=e.public_state(s)["state"]["rate"]
    r=e.apply_action(s,{"rate_change":0.5})
    assert r.accepted and e.public_state(s)["state"]["rate"]==before+0.5
