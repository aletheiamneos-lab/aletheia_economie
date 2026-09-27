from shared.registry import get_engine
def test_engine():
    e=get_engine("job_market");s=e.start()
    r=e.apply_action(s,{"unemployment_rate":8.89})
    assert r.accepted and r.score_delta>95
