from shared.registry import get_engine
def test_engine():
    e=get_engine("global_trader");s=e.start(seed=0)
    r=e.apply_action(s,{"policy":"invest_logistics"})
    assert r.accepted and s.round_index==1
