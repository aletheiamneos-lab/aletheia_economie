from shared.registry import get_engine
def test_engine():
    e=get_engine("wall_street_lab");s=e.start()
    r=e.apply_action(s,{"value":10})
    assert r.accepted and r.score_delta==100
