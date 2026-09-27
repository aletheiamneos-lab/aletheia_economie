from shared.registry import get_engine
def test_engine():
    e=get_engine("economic_pulse");s=e.start()
    r=e.apply_action(s,{"phase":"crisis","policies":["monetary_ease","public_spending"]})
    assert r.accepted and r.score_delta==100
