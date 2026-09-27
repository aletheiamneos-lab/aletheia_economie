from shared.registry import get_engine
def test_engine():
    e=get_engine("factory_master");s=e.start()
    r=e.apply_action(s,{"workers":3})
    assert r.accepted and s.round_index==1 and "metrics" in r.animation_cues[1]
