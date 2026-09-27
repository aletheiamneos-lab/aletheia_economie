from shared.registry import get_engine
def test_engine():
    e=get_engine("inflation_detective");s=e.start()
    r=e.apply_action(s,{"diagnoses":["demand"],"measures":["reduce_demand"]})
    assert r.accepted and r.score_delta==100
